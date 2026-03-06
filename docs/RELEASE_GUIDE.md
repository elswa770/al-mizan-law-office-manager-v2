# 🏷️ Tags and Releases Guide

## 📋 Creating Tags

Tags help mark specific points in your project's history as important release points.

### **Create a Tag**
```bash
# Create an annotated tag
git tag -a v1.0.0 -m "First stable release of Al-Mizan Law Office Manager"

# Create a lightweight tag
git tag v1.0.0
```

### **Push Tags to GitHub**
```bash
# Push a specific tag
git push origin v1.0.0

# Push all tags
git push origin --tags
```

### **List Tags**
```bash
# List all tags
git tag

# List tags with messages
git tag -n9
```

### **Delete Tags**
```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin --delete v1.0.0
```

## 🚀 Creating Releases

Releases are GitHub's way of packaging your work for distribution.

### **Creating a Release via GitHub UI**

1. Go to your repository on GitHub
2. Click on "Releases" in the right sidebar
3. Click "Create a new release"
4. Fill in the release information:
   - **Tag version**: Choose or create a new tag
   - **Target branch**: Usually `main`
   - **Release title**: e.g., "Version 1.0.0"
   - **Release notes**: Describe what's new
5. Click "Publish release"

### **Creating a Release via CLI**
```bash
# Using GitHub CLI
gh release create v1.0.0 --title "Version 1.0.0" --notes "First stable release"
```

## 📝 Semantic Versioning

Use semantic versioning for your tags: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (2.0.0)
- **MINOR**: New features (1.1.0)
- **PATCH**: Bug fixes (1.0.1)

### **Examples**
- `v1.0.0` - First release
- `v1.0.1` - Bug fix release
- `v1.1.0` - Feature release
- `v2.0.0` - Breaking changes release

## 🎯 Recommended Tags for This Project

### **Current Status**
- `v0.1.0` - Current development version
- `v1.0.0-beta.1` - Beta release
- `v1.0.0` - First stable release

### **Future Releases**
- `v1.1.0` - Add new features
- `v1.2.0` - Improvements and bug fixes
- `v2.0.0` - Major redesign or breaking changes

## 🔄 Release Workflow

### **Pre-Release Checklist**
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] Version number is updated in package.json
- [ ] Build process works correctly

### **Release Steps**
1. Update version in package.json
2. Update CHANGELOG.md
3. Commit changes
4. Create and push tag
5. Create GitHub release
6. Deploy if necessary

## 📊 Release Notes Template

```markdown
# Version 1.0.0

## 🎉 What's New
- Feature 1 description
- Feature 2 description

## 🐛 Bug Fixes
- Fixed issue with case archiving
- Resolved login problems

## 🔧 Improvements
- Better performance
- Improved UI/UX

## ⚠️ Breaking Changes
- None

## 📦 Installation
```bash
npm install al-mizan-law-office-manager@1.0.0
```
```

## 🏷️ Create Your First Tag

```bash
# Create v1.0.0 tag
git tag -a v1.0.0 -m "First stable release of Al-Mizan Law Office Manager"

# Push to GitHub
git push origin v1.0.0
```

Then go to GitHub and create a release from this tag!
