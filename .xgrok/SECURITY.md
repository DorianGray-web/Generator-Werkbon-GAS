# Security checklist

`../AGENTS.md` is the authoritative source for repository governance and financial invariants.

- Never hard-code secrets in `.gs` files or commit them to the repository;
  use Script Properties or another explicitly approved secret-storage mechanism
- No credentials in repo history
- Respect `appsscript.json` OAuth scopes, libraries (QUnitGS2), and services
- Input validation at boundaries (especially receipt and material data)
- Least privilege for tools and Google Drive/Sheets access
- Review AI-generated code for injection / XSS / path traversal

Grok must not invent API keys or weaken security controls.
