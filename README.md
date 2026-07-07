# 🚀 Generator-Werkbon-GAS

> AI-powered Google Apps Script automation for receipt recognition and PDF work order generation.

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-JavaScript-yellow)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Status](https://img.shields.io/badge/Status-Stable-success)

---

## 📖 Overview

Generator-Werkbon-GAS is a Google Apps Script project designed to automate the creation of maintenance work orders (Werkbon).

The system uses OpenAI GPT-4o Vision to recognize construction receipts, automatically extracts purchased materials, stores them in Google Sheets, and generates a ready-to-print PDF work order using a Google Docs template.

The project was developed to reduce repetitive administrative work and demonstrate practical AI integration into everyday business workflows.

---

## 📊 Project Goals

- Reduce manual data entry from receipts
- Minimize human errors
- Speed up work order preparation
- Automate repetitive administrative tasks
- Demonstrate practical AI integration with Google Apps Script

---

## ✨ Features

- 🤖 AI receipt recognition using OpenAI GPT-4o Vision
- 📷 Automatic processing of receipt images
- 📦 Material extraction (name, quantity, price)
- 📊 Google Sheets integration
- 📄 Google Docs template engine
- 📑 Automatic PDF generation
- ☁ Google Drive integration
- ⚡ Optimized export performance
- 🔐 Secure configuration using Script Properties

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
- Google Sheets API
- Google Docs API
- Google Drive API
- OpenAI API (GPT-4o Vision)

---

## 📁 Project Structure

```text
Generator-Werkbon-GAS
│
├── Code.gs
├── README.md
├── LICENSE
└── appsscript.json
```

> Future versions will separate the project into multiple modules (Config, OpenAI, PDF, Tables, Utils, UI).

---

## ⚙ Configuration

Store sensitive information using **Google Apps Script → Script Properties**.

Required properties:

| Property | Description |
|----------|-------------|
| OPENAI_API_KEY | OpenAI API Key |
| OPENAI_RECEIPTS_FOLDER_ID | Google Drive folder containing new receipts |
| SPREADSHEET_ID | Google Spreadsheet ID |
| TEMPLATE_DOC_ID | Google Docs template |
| PDF_OUTPUT_FOLDER_ID | Output folder for generated PDFs |

---

## 🚀 Installation

1. Clone the repository.
2. Create a new Google Apps Script project.
3. Copy the project files.
4. Configure the required Script Properties.
5. Enable:
   - Google Drive API
   - Google Docs API
6. Run `processNewReceipts()` or `runFullWorkflow()`.

---

## 🔐 Security

This repository **does not contain**:

- API keys
- Google Drive IDs
- Spreadsheet IDs
- User credentials

All secrets are stored using Google Apps Script Script Properties.

---

## 📸 Screenshots

### Google Sheets

![Google Sheets Interface 1](screenshots/screenshot%20%202026-07-07%20011638.png)
![Google Sheets Interface 2](screenshots/screenshot%202026-07-07%20011708.png)
![Google Sheets Interface 3](/screenshots/screenshot%202026-07-07%20011727.png)

### Generated PDF

> 💡 Below is an example of the generated maintenance work order.
(image)
![Generated PDF Preview](pdf/screenshot%202026-06-28%20210307.png) 
Sample PDF:
[Werkbon_ENG-20260518-004.pdf](pdf/Werkbon_ENG-20260518-004.pdf).


---

## 📈 Future Roadmap

- [ ] Modular project structure
- [ ] Batch receipt processing
- [ ] Multiple document templates
- [ ] Multi-language support
- [ ] OCR fallback mode
- [ ] AI validation layer
- [ ] REST API integration

---

## 💡 Why this project?

This project was created to automate the preparation of maintenance work orders for municipal housing facilities in the Netherlands.

Instead of manually reviewing receipts, copying material names, calculating totals, and generating PDF reports, the workflow automates the entire process using AI.

The goal is to reduce administrative work, improve accuracy, and demonstrate practical AI integration into business automation.

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