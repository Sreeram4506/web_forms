# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Admins** — solo practitioners and small teams in legal and professional services (lawyers, accountants, consultants) who need clients to complete and return structured documents: intake forms, engagement letters, disclosures, questionnaires.

**Clients** — the admin's own clients. They receive a link and one-time credentials out of band (the admin copies and sends them manually) and use them to fill exactly one assigned form. They never see a dashboard, a list of other clients, or any data beyond their own submission.

## Product Purpose

Removes manual form-building from document collection. An admin uploads an existing PDF or Word document; the app detects the fields a client needs to fill (PDF AcroForm fields automatically, Word fields from `{{Field Name}}` placeholders the admin marks), turns them into a web form, and issues a unique link with client-specific credentials. The client logs in, fills the form once, and submits. The admin gets back a correctly filled, finished PDF — the actual deliverable of the product.

## Positioning

Unlike e-signature/document platforms that require the admin to manually drag fields onto a canvas to build a fillable form, this tool detects the fields directly from a document the admin already has. Upload and it's ready to send — no form-building step.

## Operating Context

**Admin workflow:** register/login → upload a PDF or Word template → review auto-detected fields → generate a link + client credentials for one client → share the link and credentials manually (outside the app) → watch status move from pending to submitted → download the completed PDF.

**Client workflow:** receive a link and credentials from the admin → log in at that link → fill the one assigned form → submit (the form locks immediately after) → done. No account self-registration, no client-side dashboard.

## Capabilities and Constraints

- Existing stack: React (Create React App) frontend, Node/Express + MongoDB backend, JWT auth with two roles (`admin`, `client`).
- PDF field detection reads real AcroForm fields (pdf-lib). Word field detection looks for `{{Field Name}}` placeholders the admin writes into the document (mammoth + docxtemplater).
- Word-sourced submissions render to PDF via a headless-browser print step; if that's unavailable in a given runtime, the system falls back to delivering the filled `.docx` rather than failing.
- Each link is single-client and single-use: one template → one generated link → one client account → one submission, then permanently locked.
- No email-sending integration exists or is planned for this pass — the admin shares link/credentials themselves.
- Currently unstyled: default Create React App structure with one generic `index.css`, no established visual identity, no design system, no brand assets.

## Brand Commitments

None. No existing name/logo/color constraints — full creative freedom confirmed. Product name stays "PDF Forms" for now.

## Evidence on Hand

No logo, no real marketing copy, no customer testimonials or case studies. `sample-form.pdf` in the repo root is a synthetic AcroForm PDF used only for dev/testing, not real content to reference or preserve.

## Product Principles

1. Auto-detection over manual form-building, always — the moment an admin has to hand-place a field, the product has failed its core premise.
2. The client-facing page must read as unmistakably legitimate on first glance — these are legal/professional-services clients entering real information into a page they didn't choose to visit.
3. The admin path from upload to shareable link stays short — no configuration step that isn't strictly necessary.
4. The generated PDF is the real deliverable; its fidelity matters more than any other surface in the product.
5. Access is scoped tight — a client's world is exactly one form, never a directory of anyone else's.

## Accessibility & Inclusion

No specific requirement was established by the user. Given the legal/professional-services context — clients reviewing and filling real documents, sometimes on mobile, sometimes under time pressure — treat WCAG 2.1 AA as the working baseline.
