# Security Policy

## Supported Versions

This project is currently maintained as an open-source portfolio and automation project.

| Version | Supported |
|---------|-----------|
| 1.10.0   | ✅ Yes |
| < 1.10.0 | ❌ No |

---

## Reporting a Vulnerability

If you discover a security issue, please do **not** open a public GitHub issue.

Instead, contact the maintainer privately:

**GitHub:** [DorianGray-web](https://github.com/DorianGray-web)

Please include:

- A clear description of the issue
- Steps to reproduce it
- Possible impact
- Suggested fix, if available

---

## Sensitive Data

This project must never contain:

- OpenAI API keys
- Google Drive folder IDs
- Google Spreadsheet IDs
- Google Docs template IDs
- OAuth tokens
- User credentials
- Personal data from receipts, invoices, or work orders

All sensitive values should be stored using **Google Apps Script Script Properties**.

The normal production configuration contains exactly these Script Properties:

```text
SPREADSHEET_ID
TEMPLATE_DOC_ID
PDF_OUTPUT_FOLDER_ID
OPENAI_RECEIPTS_FOLDER_ID
OPENAI_API_KEY
STAGED_IMAGE_EXTRACTION_ENABLED
```

`OPENAI_API_KEY` is a secret. Never copy it into source, documentation, logs, screenshots, or exported configuration. Revoke and rotate it immediately if exposed.

Diagnostic and test-only properties such as `EDITOR_TEST_WERKBON_ID`, `DEBUG_OPENAI_RESPONSE_LOGGING`, image-adapter fixture IDs, and staged-image diagnostic file IDs are not part of normal production configuration. Raw-response logging may contain sensitive receipt or invoice content and must be limited to an explicitly bounded diagnostic.

---

## API Key Safety

Before committing code, always check that no secrets are included in:

- `.gs` files
- `README.md`
- screenshots
- exported logs
- sample files
- commit history

If an API key or private ID was accidentally committed:

1. Revoke or rotate the exposed key immediately.
2. Remove the secret from the repository.
3. Review commit history.
4. Update Script Properties with the new value.

---

## Google Drive and Workspace Safety

This project may interact with Google Drive, Google Sheets, and Google Docs.

Use a dedicated test folder and test spreadsheet when developing or demonstrating the project.

Avoid using real personal, medical, financial, or confidential data in public examples.

---

## OpenAI Usage

Receipt and invoice images or PDF documents may contain personal or business-sensitive information.

Before sending receipt or invoice images or PDF documents to the OpenAI API, make sure that:

- You have permission to process the data
- The data is relevant to the workflow
- No unnecessary personal information is included
- Test examples are anonymized before publication

---

## Public Repository Checklist

Before pushing changes to GitHub:

- [ ] No API keys are present
- [ ] No Google Drive IDs are hardcoded
- [ ] No private spreadsheet or document IDs are committed
- [ ] No real receipt images or invoice PDFs are included
- [ ] No personal data is visible in screenshots
- [ ] All configuration values are loaded from Script Properties
- [ ] Example files are anonymized

---

## Disclaimer

This project is provided as-is under the MIT License.

The maintainer is not responsible for data leaks caused by incorrect configuration, exposed API keys, or the use of real sensitive data in public repositories.
