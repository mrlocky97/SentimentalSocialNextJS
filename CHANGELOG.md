# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-12

### Added

- Organized project structure with proper directories
- Added backup directory for legacy files
- Added scripts/evaluation directory for development scripts
- Enhanced .gitignore with comprehensive rules

### Changed

- Upgraded version from 0.1.0 to 1.0.0 for production release
- Moved all temporary evaluation scripts to `scripts/evaluation/`
- Moved backup files to dedicated `backup/` directory
- Consolidated Jest configuration to use only `config/jest.config.js`

### Removed

- Eliminated duplicate `jest.config.js` from root
- Removed redundant `package.json.new`
- Removed temporary build files (`tsconfig.server.tsbuildinfo`)
- Removed duplicate `performance-monitoring.service.ts`
- Removed backup service files from source directory
- Cleaned up root directory from temporary test files:
  - `evaluate-enhanced-model.js`
  - `evaluate-final.js`
  - `evaluate-fixed-model.js`
  - `evaluate-model.js`
  - `evaluate-naive-bayes.js`
  - `test-fixed-sentiment.js`
  - `test_orchestrator_enhancements.js`
  - `backup-sentiment-original.ts`

### Fixed

- Project structure now follows best practices
- No duplicate configurations or services
- Clean root directory ready for production
- All tests passing after cleanup

### Technical

- Maintained modular route structure (sentiment, auth, campaigns)
- Preserved backward compatibility
- No breaking changes to API endpoints
- Build process verified and working
