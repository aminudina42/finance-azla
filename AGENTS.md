<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Notion Bug & Feature Follow-up Rules
- When the user asks to follow up or fix bugs/feature suggestions from Notion:
  - Do NOT read or analyze `lib/notion-service.ts` or `app/api/feedback/*` unless the bug specifically targets Notion integration.
  - Retrieve sanitized ticket details using `node scripts/notion-ticket.mjs get <query>`.
  - Directly investigate and implement fixes in the relevant CatatKeluarga modules (`components/`, `app/`, `lib/`).
  - Optionally update ticket status using `node scripts/notion-ticket.mjs start <id>` and `node scripts/notion-ticket.mjs done <id>`.

## Brainstorming to Implementation Transition Rules
- Whenever brainstorming/planning a new feature ends and user instructs to start implementation (e.g. "gas", "buat kodenya", "lanjut implementasi"):
  - **Auto-Skill Resolution**: Proactively read and adopt relevant installed skills without asking the user to list them:
    - **Frontend / UI**: Load aesthetic skills (`high-end-visual-design`, `gpt-taste`, `minimalist-ui`) to guarantee non-slop, clean typography, mobile-first responsiveness, and semantic Tailwind.
    - **Database / Schema**: Load `database-design-quality-review` to ensure clean migrations (`lib/migration-vXX.sql`), indexes, and RLS.
    - **API / Server Actions**: Load `api-design-quality-review` / `api-security` for validation, error handling, and security.
    - **QA / Edge Cases**: Load `test-case-writing` / `functional-testing` for business rule boundaries.
  - **Contract-First & Rekap Dokumentasi**:
    - Always solidify TypeScript types/interfaces before writing code.
    - Save brainstorming deliverables into `rekap-file-md/<NamaFitur>/`:
      - `PRD-[NamaFitur].md` (Requirements & business rules)
      - `Implementation-Plan-[NamaFitur].md` (Technical architecture, schema, UI plan)
      - `Task-List-[NamaFitur].md` (Modular execution checklist: DB, UI, API, Integration, QA)
      *(For minor sub-feature adjustments, update existing task list in the related feature folder).*
  - **Execution Strategy**:
    - For large features/modules: Use modular/parallel execution (DB migration, UI with mock contract data, and QA test plan can proceed in parallel, followed by integration & verification).
    - For small features/fixes: Execute sequentially in one go while adhering to the skill standards.
  - **Status Indicator**: Briefly announce activated skills at the start of implementation:
    `🎯 Standar Skill Diterapkan: [skill-names]`.


