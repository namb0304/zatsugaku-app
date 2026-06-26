# Backend Instructions

The root `CLAUDE.md` and project docs are authoritative.

## Suggested Structure

Keep responsibilities separated without introducing unnecessary abstraction:

```text
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── dependencies.py
│   ├── models/
│   ├── repositories/
│   ├── routers/
│   └── services/
├── data/
├── tests/
├── .env.example
└── requirements.txt
```

Adjust this only when the implemented code clearly benefits from a smaller
structure.

## Configuration

- Load configuration through a typed settings object.
- Required environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_SECRET_KEY`
  - `GEMINI_API_KEY`
  - `FRONTEND_ORIGIN`
- Add `GEMINI_MODEL` only when Gemini integration is implemented, with a safe
  documented default.
- Do not read environment variables throughout business logic.

## Boundaries

- Routers handle HTTP validation and response mapping.
- Services implement feed, personalization, and generation behavior.
- Repositories contain Supabase queries.
- Pydantic models define external and internal data contracts.
- Centralize the list of 10 allowed genres.

## Authentication

- Public feed endpoints may work without a user token.
- Bookmark and preference endpoints require a valid Supabase access token.
- Validate the token with Supabase Auth and derive the user ID from it.
- Never trust a client-provided `user_id`.
- Even when using the secret key, filter all user-owned rows by that user ID.

## Gemini

- Use the maintained Google Gen AI SDK, not a deprecated Gemini package.
- Keep Gemini behind a service interface so tests can replace it.
- Validate generated JSON with Pydantic before writing to Supabase.
- Require exactly 10 valid items for a successful generation batch.
- Persist only columns that exist in the `trivia` table.
- `confidence_note` may be accepted from Gemini but is not currently persisted.
- Treat timeout, malformed JSON, invalid URL, wrong genre, wrong item count,
  rate limit, and permission errors as controlled generation failures.
- On generation failure, return existing DB trivia or bundled fallback data.

## Tests

- Use `pytest`.
- Mock Supabase and Gemini in unit/API tests.
- Include success, unauthorized, empty-data, and external-failure cases.
- Never require live credentials for normal tests.

Run before handoff:

```bash
pytest
```
