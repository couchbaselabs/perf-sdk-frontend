Contributing Notes

Branching
- Small PRs by feature area. Keep API and UI changes separate where possible.

Testing
- Add unit tests for query factory and data transformers when updating.

Logging
- Use `logger` in `src/lib/utils/logger.ts`. Avoid raw `console` in routes/services.

Imports
- Use `@/*` alias. Prefer absolute imports.


