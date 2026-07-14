# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

---

## Project History

Generator-Werkbon-GAS was originally developed as an internal automation tool for managing maintenance work orders.

Version **1.6.0** is the first public release prepared for the open-source community.

---

## [1.7.0] - 2026-07-14

### Added

- Modular Google Apps Script architecture with focused project modules.
- Centralized project configuration in `00_Config.gs`.
- Validation for required Script Properties.
- Custom spreadsheet menu in `01_Menu.gs`.
- Dedicated workflow orchestration in `02_Workflow.gs`.
- Separate receipt processing module in `03_ReceiptProcessing.gs`.
- Dedicated OpenAI client integration in `04_OpenAIClient.gs`.
- Separate Werkbon PDF generation module in `05_WerkbonGenerator.gs`.
- Reusable Google Docs table helpers in `06_DocumentTables.gs`.
- Shared data processing utilities in `07_DataHelpers.gs`.
- Apps Script manifest (`appsscript.json`).
- Example clasp configuration (`.clasp.example.json`).

### Changed

- Replaced the monolithic `Code.gs` implementation with a modular architecture.
- Separated configuration, workflow, AI integration, document generation, and data processing responsibilities.
- Updated project documentation to reflect the v1.7.0 architecture.
- Updated installation instructions for Google Apps Script-bound projects.
- Documented the behavior of copied Google Sheets and copied bound Apps Script projects.
- Improved maintainability and separation of concerns across the codebase.

### Security

- Removed remaining hardcoded Google Drive, Spreadsheet, and document resource IDs.
- Moved environment-specific configuration to Google Apps Script Script Properties.
- Added explicit validation for missing required configuration values.
- Added optional controlled logging for raw OpenAI responses.
- Added `.clasp.json` to Git ignore rules to prevent accidental publication of project-specific Apps Script configuration.

### Removed

- Removed the legacy monolithic `Code.gs` file.
- Removed incompatible APIsec and CodeQL workflows that were not suitable for the current Google Apps Script project structure.

### Validation

### Validation

- Tested the modular version in an isolated copy of the Google Sheets workflow.
- Reprocessed an existing receipt by removing the `[Recognized]` marker in the test environment.
- Confirmed OpenAI receipt recognition and material extraction.
- Confirmed extracted materials were added to the corresponding Werkbon data.
- Confirmed Google Docs template population.
- Confirmed successful PDF generation to a dedicated test output folder.
- Verified that the recognized receipt materials were present in the final generated PDF.
- Confirmed the complete `runFullWorkflow()` workflow.


## [1.6.0] - 2026-07-06

### 🎉 First Public Release

This is the first stable public release of **Generator-Werkbon-GAS**.

### Added

- AI-powered receipt recognition using OpenAI GPT-4o Vision
- Automatic extraction of construction materials from receipt images
- Google Sheets integration
- Google Docs template engine
- Automatic PDF work order generation
- Google Drive integration
- Batch processing workflow
- Automatic receipt renaming after successful recognition
- Dynamic table generation
- Optimized PDF export
- Custom Google Apps Script menu
- Secure configuration using Script Properties

### Improved

- English comments throughout the source code
- English log messages
- Improved error handling
- Better code readability
- Improved project documentation

### Security

- Removed hardcoded OpenAI API keys
- Added support for Script Properties
- Prepared project for public GitHub release

### Performance

- Optimized Google Docs table generation
- Faster PDF export using direct document download
- Reduced unnecessary Google Sheets operations

### Fixed

- Fixed duplicate template rows
- Improved ID validation
- Fixed JSON parsing for OpenAI responses
- Improved receipt processing stability

---

## Upcoming

### Planned for v1.7.0

- Modular project structure
- Multiple Google Docs templates
- Batch receipt processing improvements
- Multi-language support
- OCR fallback mode
- Better logging system
- Configuration validation

---

---

## Versioning Policy

This project follows Semantic Versioning (SemVer):

- **MAJOR** version for incompatible changes
- **MINOR** version for new features
- **PATCH** version for bug fixes and improvements

Example:

- 1.6.0 → First public stable release
- 1.6.1 → Bug fixes and documentation updates
- 1.7.0 → New features
- 2.0.0 → Major architectural changes