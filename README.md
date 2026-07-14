# 🚀 Generator-Werkbon-GAS

> AI-powered Google Apps Script automation for receipt recognition and PDF work order generation.

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-JavaScript-yellow)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green)
![Architecture](https://img.shields.io/badge/Architecture-Modular-blueviolet)
![License](https://img.shields.io/badge/License-MIT-blue)
![Status](https://img.shields.io/badge/Status-Stable-success)
![Release](https://img.shields.io/badge/Release-v1.7.0-blue)

---

## 📖 Overview

Generator-Werkbon-GAS is a modular Google Apps Script project designed to automate the creation of maintenance work orders (`Werkbon`).

The system uses OpenAI GPT-4o Vision to recognize construction receipts, extract purchased materials, store them in Google Sheets, and generate a ready-to-print PDF work order using a Google Docs template.

The project was developed to reduce repetitive administrative work and demonstrate practical AI integration into everyday business workflows.

---

## 🎯 Project Goals

- Reduce manual data entry from receipts
- Minimize human errors
- Speed up work order preparation
- Automate repetitive administrative tasks
- Provide a maintainable modular codebase
- Demonstrate practical AI integration with Google Apps Script

---

## ✨ Features

- AI receipt recognition using OpenAI GPT-4o Vision
- Automatic processing of receipt images
- Material extraction: name, quantity and price
- Google Sheets integration
- Google Docs template processing
- Automatic PDF generation
- Google Drive integration
- Optimized PDF export with fallback mode
- Secure configuration using Script Properties
- Modular application architecture
- Google Sheets custom menu
- User notifications through toast messages and dialogs
- Optional debug logging for OpenAI responses

---

## 🔄 Workflow

```text
Receipt Image
      │
      ▼
OpenAI GPT-4o Vision
      │
      ▼
Material Recognition
      │
      ▼
Google Sheets
      │
      ▼
Google Docs Template
      │
      ▼
PDF Work Order
```

---

## 🛠 Technologies

- Google Apps Script
- JavaScript (ES6)
- Google Sheets
- Google Docs
- Google Drive
- OpenAI API — GPT-4o Vision
- Script Properties
- Advanced Google Drive Service

---

## 📁 Project Structure

```text
Generator-Werkbon-GAS/
│
├── 00_Config.gs
├── 01_Menu.gs
├── 02_Workflow.gs
├── 03_ReceiptProcessing.gs
├── 04_OpenAIClient.gs
├── 05_WerkbonGenerator.gs
├── 06_DocumentTables.gs
├── 07_DataHelpers.gs
├── appsscript.json
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

### Module responsibilities

| Module | Responsibility |
|---|---|
| `00_Config.gs` | Script Properties, constants and configuration validation |
| `01_Menu.gs` | Custom Google Sheets menu |
| `02_Workflow.gs` | Full workflow orchestration |
| `03_ReceiptProcessing.gs` | Receipt discovery and spreadsheet updates |
| `04_OpenAIClient.gs` | OpenAI request and response parsing |
| `05_WerkbonGenerator.gs` | Work-order preparation and PDF generation |
| `06_DocumentTables.gs` | Google Docs tables and dynamic content |
| `07_DataHelpers.gs` | Data filtering, normalization and formatting |

---

## ⚙️ Configuration

Store sensitive and environment-specific information using:

**Google Apps Script → Project Settings → Script Properties**

Required properties:

| Property | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_RECEIPTS_FOLDER_ID` | Google Drive folder containing new receipts |
| `SPREADSHEET_ID` | Google Spreadsheet ID |
| `TEMPLATE_DOC_ID` | Google Docs template ID |
| `PDF_OUTPUT_FOLDER_ID` | Output folder for generated PDF files |
| `DEBUG_OPENAI_RESPONSE_LOGGING` | Optional: set to `true` to log raw AI output |

Missing required configuration values are validated at runtime and produce a descriptive error message.

---

## 🚀 Installation

1. Clone or download this repository.
2. Create a new Google Apps Script project or open the script bound to your test Google Sheet.
3. Copy all `.gs` files and `appsscript.json` into the Apps Script project.
4. Configure the required Script Properties.
5. Enable the required Google services:
   - Google Drive API
   - Google Docs API
   - Advanced Google Drive Service
6. Reload the Google Sheet.
7. Open the **Generator Werkbon** custom menu.
8. Run one of the available actions:
   - `runFullWorkflow()`
   - `processNewReceipts()`
   - `generateWerkbon()`

---

## ⚠️ Google Sheet Copying

When copying a Google Sheet, its bound Apps Script project may also be copied automatically.

Before connecting or testing this version:

1. Open the copied Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Verify which bound project belongs to the copied sheet.
4. Remove obsolete copied script code or old bound project copies from the test environment.
5. Ensure that only the intended v1.7 implementation is used.
6. Reconfigure Script Properties in the copied project because they may not be transferred automatically.

> Do not delete the production Apps Script project connected to the original working spreadsheet.

This prevents duplicate menus, outdated functions, trigger conflicts and accidental execution of the previous version.

---

## 🔐 Security

This repository does not contain:

- OpenAI API keys
- Google Drive IDs
- Spreadsheet IDs
- Google Docs template IDs
- User credentials

All secrets and environment-specific resource identifiers are stored using Google Apps Script Script Properties.

If any identifier was previously committed to a public repository, access permissions should be reviewed and the affected resource should be replaced where necessary.

Raw OpenAI responses are not logged by default. Debug logging must be enabled explicitly through:

```text
DEBUG_OPENAI_RESPONSE_LOGGING=true
```

---

## 🧪 Validation

Version 1.7 was tested against a completed historical Werkbon.

The validation included:

- Existing Werkbon ID detection
- Location information
- Worked hours
- Materials and totals
- Description and completed work
- Google Docs template generation
- PDF export
- Output comparison with the previous working version

Testing on completed historical records is recommended before deploying updates to a production spreadsheet.

---

## Testing

The project includes a QUnitGS2 test suite for pure and business-logic helpers.

Current test coverage includes:

- configuration validation
- Werkbon ID normalization
- currency and date formatting
- in-memory row filtering
- location lookup and fallback behavior
- working-hours calculation
- Werkbon row lookup
- multiline description aggregation
- OpenAI receipt response parsing

Current test suite:

- 22 tests
- 45 assertions
- 45 passed
- 0 failed

The complete receipt-to-PDF workflow was also validated separately in an isolated Google Workspace environment using:

- a copied Google Sheet
- a copied Google Docs template
- a dedicated PDF output folder
- an existing receipt reprocessed through OpenAI Vision

The validation confirmed material extraction, Werkbon data updates, document population, and final PDF generation.

---

## 📸 Screenshots

### Automated Test Results

![screenshots/qunit-v1.7-tests](screenshots/Screenshot%202026-07-14%20205954.png)

**22 tests · 45 assertions · 45 passed · 0 failed**


### Google Sheets

![Google Sheets Interface 1](screenshots/screenshot%20%202026-07-07%20011638.png)

![Google Sheets Interface 2](screenshots/screenshot%202026-07-07%20011708.png)

![Google Sheets Interface 3](screenshots/screenshot%202026-07-07%20011727.png)

### Generated PDF

Below is an example of the generated maintenance work order.

![Generated PDF Preview](pdf/screenshot%202026-06-28%20210307.png)

Sample PDF:

[Werkbon_ENG-20260518-004.pdf](pdf/Werkbon_ENG-20260518-004.pdf)

---

## 🆕 Version 1.7.0

### Architecture

- Refactored the original monolithic `Code.gs` file into focused modules
- Centralized configuration and constants
- Separated receipt processing from OpenAI communication
- Separated document generation and table processing
- Isolated reusable data helper functions
- Improved code readability and maintainability

### Security

- Removed remaining hardcoded Google resource IDs
- Moved all environment-specific configuration to Script Properties
- Added validation for missing required properties
- Added optional OpenAI debug logging

### Reliability

- Improved user-facing error notifications
- Added optimized PDF export with a standard fallback mode
- Preserved temporary Google Docs files when PDF generation fails
- Improved compatibility with copied test spreadsheets

---

## 🗺 Future Roadmap

- [x] Modular project structure
- [x] Secure configuration validation
- [x] Automated tests for core helper and parsing functions
- [ ] Batch receipt processing
- [ ] Multiple document templates
- [ ] Multi-language support
- [ ] OCR fallback mode
- [ ] AI response validation layer
- [ ] Structured error reporting
- [ ] REST API integration

---

## 💡 Why This Project?

This project was created to automate the preparation of maintenance work orders for municipal housing facilities in the Netherlands.

Instead of manually reviewing receipts, copying material names, calculating totals and generating PDF reports, the workflow automates the process using AI and Google Workspace.

The goal is to reduce administrative work, improve accuracy and demonstrate practical AI integration in business automation.

---

## 📜 License

This project is licensed under the MIT License.

---

## 👤 Author

**Denys Ostroushko**

GitHub:  
https://github.com/DorianGray-web

---

⭐ If you find this project useful, consider giving it a star!