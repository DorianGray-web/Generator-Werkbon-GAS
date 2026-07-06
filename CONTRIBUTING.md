# Contributing to Generator-Werkbon-GAS

First of all, thank you for your interest in contributing to this project!

Generator-Werkbon-GAS is an open-source automation project that demonstrates how Google Apps Script and OpenAI can be combined to automate maintenance work order generation.

Whether you are fixing a bug, improving documentation, or proposing a new feature, your contribution is appreciated.

---

# How to Contribute

There are several ways to contribute:

- 🐞 Report bugs
- 💡 Suggest new features
- 📖 Improve documentation
- 🔧 Submit code improvements
- 🚀 Optimize performance
- 🌍 Improve language translations

---

# Before You Start

Please make sure that you:

- Read the README.md
- Read the SECURITY.md
- Use the latest supported version
- Search existing Issues before creating a new one

---

# Coding Guidelines

Please follow these guidelines when submitting code:

## Code Style

- Write clean and readable JavaScript.
- Prefer descriptive variable names.
- Keep functions focused on a single responsibility.
- Avoid duplicated code.
- Add comments only where they improve understanding.

---

## Comments

All comments must be written in English.

Example:

```javascript
// Good
// Generate PDF from Google Docs template

// Avoid
// Генерация PDF
```

---

## Logging

Use clear English log messages.

Examples:

```javascript
console.log("Receipt successfully processed.");

console.error("Unable to connect to OpenAI API.");
```

Avoid vague messages such as:

```javascript
console.log("Done");

console.log("Error");
```

---

## Security

Never commit:

- API keys
- OAuth tokens
- Google Drive IDs
- Spreadsheet IDs
- User data
- Receipt images containing personal information

Use Google Apps Script Script Properties for all configuration values.

---

# AI Contributions

AI-assisted development is welcome.

If you use tools such as:

- ChatGPT
- GitHub Copilot
- Gemini
- Claude

please review all generated code before submitting a Pull Request.

Every contribution should be understandable, tested, and maintainable by humans.

---

# Pull Requests

Before submitting a Pull Request:

- Test your changes.
- Make sure the project still works correctly.
- Keep commits focused on one logical change.
- Update documentation if necessary.

---

# Commit Messages

This project follows Conventional Commits whenever possible.

Examples:

```text
feat: add batch receipt processing

fix: improve JSON validation

docs: update README

docs: add installation guide

refactor: split project into modules

perf: optimize PDF generation

security: move secrets to Script Properties
```

---

# Feature Requests

New ideas are always welcome.

Examples:

- Additional document templates
- OCR improvements
- AI validation
- Better logging
- New export formats
- Localization
- Performance improvements

---

# Code of Conduct

Please be respectful and constructive.

This project welcomes contributors from all backgrounds and experience levels.

Be kind, patient, and professional.

---

# Questions

If you have questions, feel free to open an Issue or start a Discussion.

---

Thank you for helping improve Generator-Werkbon-GAS!