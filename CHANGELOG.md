# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

---

## Project History

Generator-Werkbon-GAS was originally developed as an internal automation tool for managing maintenance work orders.

Version **1.6.0** is the first public release prepared for the open-source community.

---

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