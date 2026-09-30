# TaskApp

- When anything about the project is unclear, ask the user before executing. The user always has the final word. Record the answer in `PROJETO.md` decisions.

- `PROJETO.md` is the central project document (scope, database state, decisions, checklist, change history). Read it before starting work.
- After every change (code, database, decision, or scope), update `PROJETO.md`: checklist, relevant sections, and a new row in "Histórico de alterações". Always keep it current.
- `design.md` is the central design document. UI must match `design_modelo.png` exactly; reuse its tokens and components. Record design changes in `design.md` and in the `PROJETO.md` history.
- Stack: Nuxt.js + Tailwind CSS (`@nuxtjs/tailwindcss`) + Supabase (project `hezxupksbntcwaxkmlmg`). Multi-tenant, shared database, isolation by `id_empresa` + RLS.
- Write project documentation in Portuguese.
