const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const BATCH_SIZE = 25;
const TIMEOUT_MS = 20000;
// Batches run concurrently, but capped: a 226-field document is 10 batches,
// and firing all of them at once risks rate limiting while running them one
// after another would take minutes and time the upload out. These are small
// independent requests, so 8 in flight keeps a large document to two waves
// without approaching a rate limit.
const MAX_CONCURRENCY = 8;
// Hard ceiling on the whole refinement step. Whatever has come back by then
// is kept and the rest degrade to their structural values, so refinement can
// never be the reason an upload fails.
const TOTAL_BUDGET_MS = 60000;

const VALID_TYPES = ['text', 'boolean', 'choice-single', 'choice-multi', 'signature'];

const SYSTEM_PROMPT = `You clean up form fields auto-extracted from a business document so they read clearly to the client filling them in.

For each field you receive an id, its current label, current type, and its current options.

Return improvements as JSON: {"fields":[{"id":<number>,"label":"...","hint":"...","type":"...","options":["..."]}]}

Rules:
- label: the question as a person would read it. Fix truncation, stray casing, and missing punctuation. Keep the original wording and meaning — never invent a different question.
- hint: short clarifying context, or "" if the label is already self-explanatory. Never restate the label.
- type: one of text, boolean, choice-single, choice-multi, signature.
  - Use signature only when the field is clearly asking for a signature.
  - Use boolean for a single yes/no confirmation.
  - Use choice-single when options are mutually exclusive (e.g. one age bracket, one price range, yes/no/not-sure).
  - Use choice-multi when several options can legitimately apply at once.
  - Use text for open-ended answers like names, URLs, dates, or descriptions.
- options: ONLY for fields whose "optionsEditable" is true. Suggest sensible options when the question clearly implies a fixed set of answers, otherwise return []. If optionsEditable is false, omit the options key entirely.
- Never change a field's id.
- Return every field you were given, once each.`;

function coerceRefinement(raw, original) {
  const out = {};

  if (typeof raw.label === 'string' && raw.label.trim()) {
    out.label = raw.label.trim().slice(0, 300);
  }
  if (typeof raw.hint === 'string') {
    out.hint = raw.hint.trim().slice(0, 300);
  }
  if (typeof raw.type === 'string' && VALID_TYPES.includes(raw.type)) {
    out.type = raw.type;
  }

  // Option text for a checkbox table, or a checkbox-group's option labels,
  // must stay byte-identical to what the fill pass keys off (the document's
  // literal checkbox labels, or checkboxMap's label->field-name keys),
  // otherwise a selection can no longer be matched back to its checkbox and
  // silently stops ticking boxes. Only fields with no such document binding
  // may have options rewritten.
  const optionsEditable = original.source !== 'checkbox-table' && original.source !== 'checkbox-group';
  if (optionsEditable && Array.isArray(raw.options)) {
    const cleaned = raw.options
      .filter((o) => typeof o === 'string' && o.trim())
      .map((o) => o.trim().slice(0, 200))
      .slice(0, 30);
    if (cleaned.length) out.options = cleaned;
  }

  return out;
}

async function callOpenAI(apiKey, batch) {
  const payload = batch.map((f, i) => ({
    id: i,
    label: f.label || f.name,
    type: f.type,
    options: f.options || [],
    optionsEditable: f.source !== 'checkbox-table' && f.source !== 'checkbox-group',
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify({ fields: payload }) },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`OpenAI responded ${res.status}`);
    }

    const body = await res.json();
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned no content');

    const parsed = JSON.parse(content);
    return Array.isArray(parsed.fields) ? parsed.fields : [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Improves auto-detected field labels, hints, and answer types using an LLM.
 *
 * Structural identity is never delegated: name, source, tableIndex and
 * responseIndex are the binding between a field and its exact location in
 * the source document, and checkbox-table option text must match the
 * document's literal checkbox labels for the fill pass to work — so the
 * model may only touch presentation (label, hint, type, and options for
 * fields with no checkbox binding).
 *
 * Degrades to the structural results unchanged when no API key is
 * configured or the call fails: a template that imports with slightly
 * rougher labels is strictly better than an upload that errors out.
 *
 * @param {Array} fields structurally detected field descriptors
 * @returns {Promise<Array>} fields with refined presentation
 */
async function refineFields(fields) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !fields.length) return fields;

  const refined = fields.map((f) => ({ ...f }));

  const batches = [];
  for (let start = 0; start < refined.length; start += BATCH_SIZE) {
    batches.push(refined.slice(start, start + BATCH_SIZE));
  }

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let cursor = 0;

  const worker = async () => {
    while (cursor < batches.length) {
      const myIndex = cursor;
      cursor += 1;
      if (Date.now() >= deadline) return;

      const batch = batches[myIndex];
      try {
        const results = await callOpenAI(apiKey, batch);
        for (const result of results) {
          const idx = Number(result.id);
          if (!Number.isInteger(idx) || idx < 0 || idx >= batch.length) continue;
          const target = batch[idx];
          Object.assign(target, coerceRefinement(result, target));
        }
      } catch (err) {
        console.warn(`AI field refinement skipped for batch ${myIndex}: ${err.message}`);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENCY, batches.length) }, worker)
  );

  return refined;
}

module.exports = { refineFields };
