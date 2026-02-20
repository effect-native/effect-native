# Security Policy

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability, please follow these guidelines:

### How to Report

1. **DO NOT** create public issues for security vulnerabilities
2. Create a private security advisory:
   - Go to Security tab → Advisories → New draft advisory
   - Provide detailed information about the vulnerability

### What to Include

Please provide:

- **Description**: Clear explanation of the vulnerability
- **Impact**: What can an attacker do with this vulnerability?
- **Affected versions**: Which package versions are affected?
- **Steps to reproduce**: Detailed steps or proof of concept
- **Suggested fix**: If you have ideas for fixing the issue
- **CVSS score**: If you can assess the severity

### What to Expect

1. Acknowledgment within 48 hours
2. Initial assessment within 1 week
3. Regular updates on progress
4. Credit in the security advisory (unless you prefer anonymity)

## Supported Versions

| Version  | Supported          |
| -------- | ------------------ |
| latest   | :white_check_mark: |
| < latest | :x:                |

## Security Best Practices

When using @effect-native packages:

1. **Keep dependencies updated**: Regularly update packages
2. **Review dependencies**: Audit your dependencies with `pnpm audit`
3. **Use lock files**: Commit pnpm-lock.yaml to ensure reproducible builds
4. **Verify package sources**: Ensure packages come from the `@effect-native/*` npm namespace

## Vulnerability Disclosure

We follow responsible disclosure:

1. Vulnerabilities are fixed before public disclosure
2. Users are notified through GitHub Security Advisories
3. NPM security advisories are published for affected packages
4. A reasonable time is given for users to update

## Contact

- **Security issues**: Use GitHub's private security advisory feature
- **General questions**: Open a public issue
