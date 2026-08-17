const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const LABEL_SIZE = 10.5;
const ANSWER_SIZE = 10.5;
const TITLE_SIZE = 18;
const META_SIZE = 9;
const LINE_GAP = 3;
const BLOCK_GAP = 12;

const INK = rgb(0.11, 0.1, 0.09);
const SOFT = rgb(0.29, 0.27, 0.24);
const FAINT = rgb(0.48, 0.45, 0.4);
const RULE = rgb(0.85, 0.83, 0.79);
const STAMP = rgb(0.76, 0.25, 0.12);

// The standard PDF fonts only encode WinAnsi, so characters common in these
// documents (en dashes, curly quotes, ballot boxes, rupee signs) would throw
// on draw. Map the ones that carry meaning and drop anything else unmappable,
// rather than letting a single stray glyph fail the whole download.
const CHAR_MAP = {
  '–': '-',
  '—': '-',
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '•': '*',
  '…': '...',
  ' ': ' ',
  '☐': '[ ]',
  '☑': '[x]',
  '☒': '[x]',
  '₹': 'INR ',
  '·': '-',
};

function toWinAnsi(text) {
  if (text === undefined || text === null) return '';
  let out = String(text);
  for (const [from, to] of Object.entries(CHAR_MAP)) {
    out = out.split(from).join(to);
  }
  // Keep printable WinAnsi range; replace the rest so nothing throws.
  return out.replace(/[^\x20-\x7E\xA1-\xFF]/g, '?');
}

function wrap(text, font, size, maxWidth) {
  const clean = toWinAnsi(text);
  const paragraphs = clean.split(/\r?\n/);
  const lines = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // A single word longer than the measure has to be broken by character.
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

/**
 * Renders a submission as a readable PDF record: every question with the
 * answer that was given, selections listed, signatures embedded.
 *
 * This is generated rather than converted from the source .docx on purpose —
 * a faithful Word-to-PDF conversion needs Word or LibreOffice on the host,
 * which is not available here, and a browser-based conversion could not be
 * made to run reliably. The .docx download remains the copy that preserves
 * the original layout; this is the portable record of what was submitted.
 *
 * @param {Object} template needs name, fields, sourceType
 * @param {Object} data answers keyed by field name
 * @returns {Promise<Buffer>} PDF bytes
 */
async function generateReportPdf(template, data = {}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const ensure = (needed) => {
    if (y - needed < MARGIN) newPage();
  };

  const drawLines = (lines, f, size, color, indent = 0) => {
    for (const line of lines) {
      ensure(size + LINE_GAP);
      if (line) {
        page.drawText(line, {
          x: MARGIN + indent,
          y: y - size,
          size,
          font: f,
          color,
        });
      }
      y -= size + LINE_GAP;
    }
  };

  // Header
  drawLines(wrap(template.name || 'Submission', bold, TITLE_SIZE, CONTENT_W), bold, TITLE_SIZE, INK);
  y -= 2;
  drawLines(
    wrap(
      `Completed record - generated ${new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}`,
      font,
      META_SIZE,
      CONTENT_W
    ),
    font,
    META_SIZE,
    FAINT
  );
  y -= 6;
  ensure(10);
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1,
    color: RULE,
  });
  y -= BLOCK_GAP + 4;

  const fields = template.fields || [];

  for (const field of fields) {
    const label = field.label || field.name;
    const raw = data[field.name];
    const answered = raw !== undefined && raw !== null && String(raw) !== '';

    // Keep a question and at least its first answer line on the same page.
    ensure(LABEL_SIZE + ANSWER_SIZE + LINE_GAP * 2 + BLOCK_GAP);

    drawLines(wrap(label, bold, LABEL_SIZE, CONTENT_W), bold, LABEL_SIZE, INK);

    if (field.type === 'signature') {
      if (answered && /^data:image\/(png|jpe?g);base64,/i.test(String(raw))) {
        const [, fmt, b64] = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(String(raw));
        try {
          const bytes = Buffer.from(b64, 'base64');
          const img = /png/i.test(fmt) ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
          const scaled = img.scaleToFit(200, 60);
          ensure(scaled.height + LINE_GAP);
          page.drawImage(img, {
            x: MARGIN + 12,
            y: y - scaled.height,
            width: scaled.width,
            height: scaled.height,
          });
          y -= scaled.height + LINE_GAP;
        } catch (err) {
          drawLines(['[signature could not be rendered]'], font, ANSWER_SIZE, FAINT, 12);
        }
      } else {
        drawLines(['Not signed'], font, ANSWER_SIZE, FAINT, 12);
      }
      y -= BLOCK_GAP;
      continue;
    }

    if (!answered) {
      drawLines(['Not answered'], font, ANSWER_SIZE, FAINT, 12);
      y -= BLOCK_GAP;
      continue;
    }

    if (field.type === 'choice-multi' || field.type === 'choice-single') {
      const known = new Set(field.options || []);
      const parts = String(raw).split(', ').filter(Boolean);
      for (const part of parts) {
        const isOther = !known.has(part);
        const text = isOther ? `[x] Other: ${part}` : `[x] ${part}`;
        drawLines(wrap(text, font, ANSWER_SIZE, CONTENT_W - 12), font, ANSWER_SIZE, SOFT, 12);
      }
    } else if (field.type === 'boolean') {
      const yes = String(raw) === 'true' || raw === true;
      drawLines([yes ? '[x] Yes' : '[ ] No'], font, ANSWER_SIZE, SOFT, 12);
    } else {
      drawLines(wrap(raw, font, ANSWER_SIZE, CONTENT_W - 12), font, ANSWER_SIZE, SOFT, 12);
    }

    y -= BLOCK_GAP;
  }

  // Footer stamp on the last page
  ensure(30);
  y -= 6;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1,
    color: RULE,
  });
  y -= 16;
  page.drawText('FILED', {
    x: MARGIN,
    y,
    size: 11,
    font: bold,
    color: STAMP,
  });

  // Page numbers
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const text = `${i + 1} / ${pages.length}`;
    const w = font.widthOfTextAtSize(text, META_SIZE);
    p.drawText(text, {
      x: PAGE_W - MARGIN - w,
      y: MARGIN - 22,
      size: META_SIZE,
      font,
      color: FAINT,
    });
  });

  return Buffer.from(await pdf.save());
}

module.exports = { generateReportPdf, toWinAnsi };
