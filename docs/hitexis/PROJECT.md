# Yoyo — project record

- **Project:** Yoyo, P2P rental marketplace, https://yoyo.rent. Owner and decision maker: Zogal (private person until real payments).
- **Outcome:** first real deals in Riga within 3 months of launch (target 100 listings, 20 completed deals without dispute).
- **Market / languages:** Latvia (Riga first); EN default, LV, RU; EUR.
- **Brief:** [P00-brief.md](P00-brief.md). **State and next stage:** [state.json](state.json).
- **Specification:** `docs/superpowers/specs/2026-11-03-yoyo-design.md` (§0 overrides the rest; payments test-mode badge decided 2026-11-06).
- **Plans and roadmap:** `docs/superpowers/plans/`. **Design:** `DESIGN.md`.
- **Environments:** web on Vercel (team cry22, project yoyo-rent), API on Render (yoyo-api, Frankfurt), DB on Neon. Production = `main` via CI (GitHub Actions) and auto-deploy.
- **Commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, e2e via Playwright (see `.github/workflows/ci.yml`).
- **Secrets:** never in documents. Local `.env.deploy` (git-ignored) and the Render / Vercel / GitHub settings of the owner's accounts.
- **Audits:** `YOYO_P00-W01-W11_Audit/REPORT.md`, `YOYO_C01-C11_Audit/REPORT.md` (2026-11-05, local).
