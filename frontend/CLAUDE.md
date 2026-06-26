@AGENTS.md

# Frontend Instructions

The root `CLAUDE.md` and project docs are authoritative.

## Existing UI

- Preserve the current layouts, swipe gestures, keyboard controls, and card
  animation unless a task specifically changes them.
- Replace mock data incrementally. Do not redesign working screens while
  connecting APIs.
- The feed item `id` must be treated as a UUID string.

## Data And Auth

- Use these environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_API_BASE_URL`
- Only the publishable Supabase key may be used in frontend code.
- Use Supabase directly for Auth.
- Send the signed-in user's access token as `Authorization: Bearer <token>` to
  protected FastAPI endpoints.
- Never send or store `SUPABASE_SECRET_KEY` or `GEMINI_API_KEY`.
- Store guest viewed trivia IDs in `localStorage`.

## Next.js

- This project uses Next.js 16. Read the matching documentation in
  `node_modules/next/dist/docs/` before relying on remembered conventions.
- Keep client components limited to screens and components that need browser
  state or event handlers.
- Centralize the Supabase browser client and FastAPI request helpers instead of
  constructing clients in every page.
- Do not introduce middleware/proxy-based auth until the current Next.js 16
  behavior has been checked and the task requires it.

## UI States

Every connected screen must handle:

- initial loading;
- empty data;
- recoverable API failure;
- unauthenticated access to protected actions;
- disabled state while a mutation is in progress.

Run before handoff:

```bash
npm run lint
npm run build
```
