# HTML Sanitization Guide

This document explains how to safely render HTML content in the application to prevent XSS (Cross-Site Scripting) attacks.

## Overview

When rendering HTML from external sources (like APIs), you must sanitize it to prevent malicious code injection. This app uses **DOMPurify** for HTML sanitization.

## Usage

### Basic Sanitization

```typescript
import { sanitizeHtml } from '@/lib/sanitize';

// In a component
const cleanHtml = sanitizeHtml(dirtyHtml);
```

### Sanitization Levels

Choose a level based on what HTML tags you need to allow:

#### 1. **Strict** (Most Secure)
Only basic text formatting, no links:
```typescript
const clean = sanitizeHtml(html, 'strict');
// Allows: <p>, <br>, <strong>, <em>, <b>, <i>
```

#### 2. **Standard** (Recommended)
Common formatting and links:
```typescript
const clean = sanitizeHtml(html, 'standard');
// Allows: <p>, <br>, <strong>, <em>, <u>, <a>, <ul>, <ol>, <li>, <b>, <i>, <blockquote>
// Allowed attributes: href, target, rel
```

#### 3. **Relaxed** (Less Restrictive)
Most common HTML tags including images and tables:
```typescript
const clean = sanitizeHtml(html, 'relaxed');
// Allows: All standard tags plus <h1-h6>, <code>, <pre>, <table>, <img>
// Allowed attributes: href, target, rel, src, alt, title, class
```

### Strip All HTML

To remove all HTML tags and get plain text:
```typescript
import { stripHtml } from '@/lib/sanitize';

const plainText = stripHtml('<p>Hello <strong>world</strong></p>');
// Result: "Hello world"
```

### Check for Dangerous Content

To detect if content contains potentially dangerous HTML:
```typescript
import { containsDangerousHtml } from '@/lib/sanitize';

if (containsDangerousHtml(userInput)) {
  console.warn('Potentially dangerous HTML detected');
}
```

## React Integration

### With useMemo (Recommended)

```typescript
import React from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

const MyComponent = ({ htmlContent }) => {
  const clean = React.useMemo(
    () => sanitizeHtml(htmlContent, 'standard'),
    [htmlContent]
  );

  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
};
```

### Custom Hook (Optional)

```typescript
// hooks/useSanitizedHtml.ts
import { useMemo } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

export function useSanitizedHtml(html: string, level = 'standard') {
  return useMemo(() => sanitizeHtml(html, level), [html, level]);
}

// Usage:
const MyComponent = ({ htmlContent }) => {
  const clean = useSanitizedHtml(htmlContent);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
};
```

## Alternative Approaches

### 1. No HTML Rendering (Safest)
If you don't need HTML formatting, just render as plain text:
```typescript
// Instead of dangerouslySetInnerHTML
<div>{plainText}</div>
```

### 2. Markdown (Better UX)
Convert markdown to HTML, then sanitize:
```bash
npm install marked dompurify
```

```typescript
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/sanitize';

const html = marked(markdownText);
const clean = sanitizeHtml(html, 'standard');
```

### 3. Component-Based Rendering
Parse HTML to React components (safest, but most complex):
```bash
npm install html-react-parser
```

```typescript
import parse from 'html-react-parser';
import { sanitizeHtml } from '@/lib/sanitize';

const MyComponent = ({ html }) => {
  const clean = sanitizeHtml(html);
  return <div>{parse(clean)}</div>;
};
```

## Security Best Practices

### ✅ DO:
- Always sanitize HTML from external sources
- Use the strictest sanitization level that meets your needs
- Use `useMemo` to avoid re-sanitizing on every render
- Test with malicious payloads during development
- Keep DOMPurify updated regularly

### ❌ DON'T:
- Never use `dangerouslySetInnerHTML` with unsanitized content
- Don't trust API responses to be safe
- Don't allow `<script>` tags or inline JavaScript
- Don't allow `data:` URLs in attributes
- Don't disable sanitization for "trusted" content

## Testing

Test your sanitization with common XSS payloads:

```typescript
const maliciousInputs = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror="alert(1)">',
  '<a href="javascript:alert(1)">Click</a>',
  '<iframe src="evil.com"></iframe>',
  '<svg/onload=alert(1)>',
];

maliciousInputs.forEach(input => {
  const clean = sanitizeHtml(input);
  console.log('Input:', input);
  console.log('Output:', clean);
  console.log('Safe:', !clean.includes('script') && !clean.includes('onerror'));
});
```

## Resources

- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [React Security Best Practices](https://react.dev/learn/passing-data-deeply-with-context#security)
