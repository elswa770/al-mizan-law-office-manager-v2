name: Pull Request
description: Template for pull requests
title: "[PR]: "
body:
  - type: markdown
    attributes:
      value: |
        ## Pull Request Guidelines

        Thank you for contributing to Al-Mizan Law Office Manager!
        Please read the following guidelines before submitting your PR:

        - [ ] Code follows the project's coding standards
        - [ ] Self-review of the code has been done
        - [ ] Code has been tested locally
        - [ ] Documentation has been updated if necessary

  - type: textarea
    id: description
    attributes:
      label: Description
      description: Brief description of the changes made
      placeholder: Describe your changes in detail...

  - type: textarea
    id: changes
    attributes:
      label: Type of Changes
      description: What type of changes does this PR include?
      placeholder: |
        - [ ] Bug fix (non-breaking change that fixes an issue)
        - [ ] New feature (non-breaking change that adds functionality)
        - [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
        - [ ] Documentation update

  - type: textarea
    id: testing
    attributes:
      label: Testing
      description: How have you tested these changes?
      placeholder: Describe how you tested your changes...

  - type: textarea
    id: checklist
    attributes:
      label: Checklist
      description: Make sure you've completed the following
      placeholder: |
        - [ ] My code follows the style guidelines of this project
        - [ ] I have performed a self-review of my own code
        - [ ] I have commented my code, particularly in hard-to-understand areas
        - [ ] I have made corresponding changes to the documentation
        - [ ] My changes generate no new warnings
        - [ ] I have added tests that prove my fix is effective or that my feature works
        - [ ] New and existing unit tests pass locally with my changes
        - [ ] Any dependent changes have been merged and published in downstream modules

  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots (if applicable)
      description: Add screenshots to help explain your changes
      placeholder: Add screenshots here...

  - type: textarea
    id: additional
    attributes:
      label: Additional Notes
      description: Any additional information about the PR
      placeholder: Any additional context or notes...
