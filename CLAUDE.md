# Claude Code Instructions

## Role

Implement the agreed MVP in small, reviewable steps.
The project owner makes final product decisions. Do not silently add features or
change requirements.

## Source Of Truth

Read these files before implementation:

1. `CLAUDE.md`
2. `docs/Requirements.md`
3. `docs/Mvp.md`
4. `docs/Architecture.md`
5. `docs/GeminiPromptDraft.md`
6. The nearest directory-specific `CLAUDE.md`

If the documents conflict, follow this file first. Ask before changing product
behavior that is not covered by the documents.

## Fixed MVP Decisions

- The first experience is a trivia card, not a marketing page.
- Trivia is navigated by horizontal swipe.
- One feed batch contains about 10 items.
- A card contains `id`, `title`, `summary`, `genre`, `tags`,
  `source_title`, and `source_url`.
- Guests can view trivia without signing in.
- Signed-in users can bookmark, select genres, and receive personalization.
- Bookmark means "I want to revisit this / I did not know this".
- Favorites are not part of the MVP.
- Guest view history is stored in `localStorage`.
- Personalization is rule based:
  - selected genre: +3
  - bookmarked trivia genre: +2
  - bookmarked trivia tag: +1
- Gemini output follows `docs/GeminiPromptDraft.md`.
- Generated trivia is stored in Supabase.
- When Gemini fails, return stored or bundled fallback trivia.
- Deployment is lower priority than a working local MVP.

## Technology

- Frontend: Next.js 16, TypeScript, React 19, Tailwind CSS 4
- Backend: FastAPI, Python
- Database and authentication: Supabase
- AI: Gemini API through the backend only

The intended request path is:

```text
Browser -> Next.js -> FastAPI -> Supabase / Gemini
```

The frontend may call Supabase directly for Supabase Auth. Application data
should go through FastAPI so API contracts and authorization stay centralized.

## Current State

As of 2026-06-27:

- The frontend screens and swipe interactions exist with mock data.
- FastAPI has not been implemented.
- Supabase tables, RLS, grants, and one seed trivia row exist remotely.
- Frontend and backend environment files exist locally and are ignored by Git.
- Gemini credentials exist, but the current Google project returns
  `403 PERMISSION_DENIED`. Gemini integration must therefore fail safely and
  use fallback trivia until Google restores access.

Do not treat the Gemini 403 as an application crash or block all other work.

## Security Boundaries

- Never print, commit, log, or expose values from `.env` or `.env.local`.
- Never put `SUPABASE_SECRET_KEY` or `GEMINI_API_KEY` in frontend code.
- Do not accept `user_id` from the client for authenticated operations.
- Validate the Supabase access token and derive the user ID from it.
- The Supabase secret key bypasses RLS. Every backend user-data query must
  explicitly scope by the authenticated user ID.
- Do not modify the remote database schema without explicit approval.

## Implementation Workflow

For each task:

1. Read the relevant docs and existing code.
2. Inspect `git status` and preserve unrelated user changes.
3. State the files and behavior you plan to change.
4. Implement only one vertical step at a time.
5. Add focused tests for backend logic and risky frontend behavior.
6. Run the relevant lint, build, and tests.
7. Report changed files, commands run, remaining risks, and the next step.

Do not commit, push, deploy, or alter remote Supabase configuration unless the
user explicitly asks.

## API Conventions

- Use JSON responses with typed Pydantic models.
- Keep API field names in `snake_case`.
- Return useful HTTP status codes without leaking internal errors or secrets.
- `GET /health` must not depend on Gemini.
- External service calls must have timeouts and controlled error handling.
- Tests must mock Supabase and Gemini; normal test runs must not call live APIs.
- Trivia IDs are UUID strings, not integers.

Candidate endpoints:

```text
GET    /health
GET    /trivia/feed
POST   /trivia/generate
GET    /bookmarks
POST   /bookmarks
DELETE /bookmarks/{trivia_id}
GET    /me/preferences
PUT    /me/preferences
POST   /me/view-history
```

## Scope Control

Do not add these unless explicitly requested:

- favorites
- social login
- chat or deep-dive AI chat
- notifications
- search
- admin UI
- deployment infrastructure
- a new database schema
- a new design system or major UI redesign

Preserve the existing swipe UI and animations while replacing mock behavior.

## Definition Of Done

A change is not complete until:

- it satisfies the relevant MVP acceptance criteria;
- loading, empty, and failure states are handled;
- secrets stay server-side;
- tests and lint/build checks pass, or failures are clearly reported;
- no unrelated files are reformatted or rewritten.
