# Flynas Documentation Index

Complete documentation for the Flynas personal cloud platform. Find guides, API references, and setup instructions for all platforms.

## 📖 Documentation Structure

### Getting Started
- **[README.md](README.md)** - Project overview, features, and architecture
- **[QUICKSTART.md](QUICKSTART.md)** - Fast-track guide to get running in minutes
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines and development workflow

### Platform-Specific Guides
- **[Desktop README](desktop/README.md)** - Linux and Windows desktop applications
- **[Android README](android/README.md)** - Android mobile application
- **[Browser Extension README](browser-extension/README.md)** - Chrome and Firefox extensions

---

## 🚀 Quick Links

### For Users
- [Quick Start Guide](QUICKSTART.md) - Get started in 5 minutes
- [Installation Instructions](README.md#development-setup) - Detailed setup for each platform
- [Feature Overview](README.md#platform-features) - What each platform can do

### For Developers
- [Contributing Guide](CONTRIBUTING.md) - How to contribute code
- [Project Structure](README.md#project-structure) - Codebase organization
- [Technical Stack](README.md#technical-stack) - Technologies used
- [Build Instructions](#build-instructions) - Building from source

### Platform-Specific
- [Desktop Development](desktop/README.md#development) - Electron app development
- [Android Development](android/README.md#development) - Android app development
- [Browser Extension Development](browser-extension/README.md#development) - Extension development

---

## 📱 Platform Documentation

### Desktop Applications (Linux/Windows)
**File**: [desktop/README.md](desktop/README.md)

**Contents**:
- System requirements and dependencies
- Installation and building
- Feature overview
- IPC API documentation
- Configuration options
- Troubleshooting

**Key Sections**:
- [Running in Development](desktop/README.md#running-in-development-mode)
- [Building Distributables](desktop/README.md#building-for-distribution)
- [System Tray Integration](desktop/README.md#system-tray-integration)

### Android Application
**File**: [android/README.md](android/README.md)

**Contents**:
- Build requirements (Java 17, Android SDK 34)
- Installation from source
- Project structure
- Technical stack
- Gradle configuration
- Troubleshooting

**Key Sections**:
- [Building from Source](android/README.md#building-from-source)
- [Configuration](android/README.md#configuration)
- [Permissions](android/README.md#permissions)
- [Architecture](android/README.md#architecture)

### Browser Extensions (Chrome/Firefox)
**File**: [browser-extension/README.md](browser-extension/README.md)

**Contents**:
- Feature overview
- Installation for Chrome and Firefox
- Usage instructions
- Development setup
- API integration
- Security considerations

**Key Sections**:
- [Installation](browser-extension/README.md#installation)
- [Usage](browser-extension/README.md#usage)
- [Development](browser-extension/README.md#development)
- [API Integration](browser-extension/README.md#api-integration)

---

## 🔧 Build Instructions

### Prerequisites by Platform

| Platform | Requirements |
|----------|-------------|
| **Desktop** | Node.js 16+, npm 7+ |
| **Android** | Java 17, Android SDK 34, Gradle 8.3+ |
| **Browser** | No build required (load unpacked) |

### Quick Build Commands

```bash
# Desktop (Linux)
cd desktop/linux && npm install && npm start

# Desktop (Windows)
cd desktop/windows && npm install && npm start

# Android
cd android && export JAVA_HOME=/path/to/java-17 && ./gradlew assembleDebug

# Browser Extensions
# Chrome: Load chrome/folder in chrome://extensions
# Firefox: Load firefox/manifest.json in about:debugging
```

---

## 📚 Documentation by Topic

### Installation & Setup
- [Main README - Development Setup](README.md#development-setup)
- [Quick Start Guide](QUICKSTART.md)
- [Desktop Installation](desktop/README.md#installation)
- [Android Installation](android/README.md#installation)
- [Browser Extension Installation](browser-extension/README.md#installation)

### Features & Usage
- [Platform Features](README.md#platform-features)
- [Desktop Features](desktop/README.md#features)
- [Android Features](android/README.md#features)
- [Browser Extension Features](browser-extension/README.md#features)

### Development
- [Contributing Guidelines](CONTRIBUTING.md)
- [Coding Standards](CONTRIBUTING.md#coding-standards)
- [Testing](CONTRIBUTING.md#testing)
- [Desktop Development](desktop/README.md#development)
- [Android Development](android/README.md#development)
- [Browser Extension Development](browser-extension/README.md#development)

### Architecture & Technical
- [Architecture Overview](README.md#architecture)
- [Project Structure](README.md#project-structure)
- [Technical Stack](README.md#technical-stack)
- [Shared Core Modules](README.md#shared-core-shared)
- [Desktop IPC API](desktop/README.md#ipc-api)
- [Browser Extension API](browser-extension/README.md#api-integration)

### Security
- [Security Overview](README.md#security)
- [Desktop Security](desktop/README.md#security)
- [Android Permissions](android/README.md#permissions)
- [Browser Extension Security](browser-extension/README.md#security)

### Troubleshooting
- [Quick Start Troubleshooting](QUICKSTART.md#troubleshooting)
- [Desktop Troubleshooting](desktop/README.md#troubleshooting)
- [Android Troubleshooting](android/README.md#troubleshooting)
- [Browser Extension Troubleshooting](browser-extension/README.md#troubleshooting)

---

## 🎯 Documentation by Audience

### For End Users
1. Start with [QUICKSTART.md](QUICKSTART.md)
2. Choose your platform section
3. Follow installation instructions
4. Learn basic usage

### For Developers
1. Read [README.md](README.md) for overview
2. Review [CONTRIBUTING.md](CONTRIBUTING.md)
3. Check platform-specific README for your area
4. Set up development environment
5. Start contributing!

### For System Administrators
1. Review [README.md](README.md) architecture
2. Check security documentation
3. Review platform-specific deployment guides
4. Configure authentication and API endpoints

---

## 🔍 Finding Information

### Search Tips
- Use Ctrl+F to search within files
- Check the relevant platform README first
- Look at code comments for implementation details
- Review CONTRIBUTING.md for development practices

### Common Queries

**"How do I install?"**
→ [QUICKSTART.md](QUICKSTART.md) for quick setup
→ Platform README for detailed instructions

**"How do I build from source?"**
→ [Build Instructions](#build-instructions) above
→ Platform-specific README

**"How do I contribute?"**
→ [CONTRIBUTING.md](CONTRIBUTING.md)

**"What features are available?"**
→ [README.md - Platform Features](README.md#platform-features)

**"Where are config files stored?"**
→ [Desktop README - Configuration](desktop/README.md#configuration)
→ [Android README - Permissions](android/README.md#permissions)

**"How do I troubleshoot issues?"**
→ Each platform README has a Troubleshooting section

---

## 📝 Documentation Updates

This documentation is actively maintained. Last updated: November 11, 2025

### Version Information
- **Project Version**: 1.0.0
- **Desktop**: Electron 26.x
- **Android**: SDK 34, minSdk 24
- **Browser**: Chrome 88+, Firefox 78+

### Contributing to Docs
Found an issue or want to improve documentation?
1. Check [CONTRIBUTING.md](CONTRIBUTING.md)
2. Submit a pull request with updates
3. Use clear, concise language
4. Include examples where helpful

---

## 🆘 Getting Help

### Resources
- **Documentation**: Start with this index
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community Q&A
- **Email**: support@flynas.com

### Support Channels by Topic
- **Installation Issues**: Check platform-specific README troubleshooting
- **Development Questions**: See CONTRIBUTING.md and platform READMEs
- **Bug Reports**: Open GitHub issue with details
- **Feature Requests**: Open GitHub issue or discussion

---

## 📋 Documentation Checklist

For each platform, we provide:
- ✅ Installation instructions
- ✅ Feature overview
- ✅ Development setup
- ✅ Build instructions
- ✅ Configuration guide
- ✅ API documentation (where applicable)
- ✅ Troubleshooting section
- ✅ Security considerations

---

## 🗺️ Documentation Roadmap

Planned additions:
- [ ] API specification document
- [ ] Deployment guide for self-hosting
- [ ] Advanced configuration guide
- [ ] Performance optimization guide
- [ ] Video tutorials
- [ ] Internationalization guide

---

**Last Updated**: November 11, 2025  
**Maintained By**: Flynas Development Team

For questions about documentation, open an issue or contact the team.
