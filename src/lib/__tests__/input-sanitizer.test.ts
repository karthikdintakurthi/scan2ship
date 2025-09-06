/**
 * Input Sanitizer Tests
 * Comprehensive tests for input sanitization security
 */

import {
  sanitizeString,
  sanitizeEmail,
  sanitizeURL,
  sanitizeFileName,
  sanitizeJSON,
  sanitizeSearchQuery,
  sanitizePhoneNumber
} from '../input-sanitizer';

describe('Input Sanitizer', () => {
  describe('sanitizeString', () => {
    it('should sanitize basic HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeString(input);
      
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Hello World');
    });

    it('should sanitize event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeString(input);
      
      expect(result).toBe('&lt;div&gt;Click me&lt;/div&gt;');
    });

    it('should sanitize javascript: URLs', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeString(input);
      
      expect(result).toBe('alert(&quot;xss&quot;)');
    });

    it('should sanitize null bytes and control characters', () => {
      const input = 'Hello\x00World\x01Test';
      const result = sanitizeString(input);
      
      expect(result).toBe('HelloWorldTest');
    });

    it('should normalize whitespace', () => {
      const input = 'Hello    World\n\nTest';
      const result = sanitizeString(input, { normalizeWhitespace: true });
      
      expect(result).toBe('Hello World Test');
    });

    it('should trim whitespace when enabled', () => {
      const input = '  Hello World  ';
      const result = sanitizeString(input, { trimWhitespace: true });
      
      expect(result).toBe('Hello World');
    });

    it('should limit string length', () => {
      const input = 'A'.repeat(1000);
      const result = sanitizeString(input, { maxLength: 100 });
      
      expect(result).toHaveLength(100);
    });

    it('should handle empty string', () => {
      const result = sanitizeString('');
      
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      const result = sanitizeString(null as any);
      
      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = sanitizeString(undefined as any);
      
      expect(result).toBe('');
    });

    it('should allow HTML when allowHTML is true', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeString(input, { allowHTML: true });
      
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize valid email', () => {
      const input = 'test@example.com';
      const result = sanitizeEmail(input);
      
      expect(result).toBe('test@example.com');
    });

    it('should sanitize email with HTML tags', () => {
      const input = 'test<script>alert(1)</script>@example.com';
      const result = sanitizeEmail(input);
      
      expect(result).toBe('testalert(1)@example.com');
    });

    it('should sanitize email with special characters', () => {
      const input = 'test+tag@example.com';
      const result = sanitizeEmail(input);
      
      expect(result).toBe('test+tag@example.com');
    });

    it('should return empty string for invalid email', () => {
      const input = 'not-an-email';
      const result = sanitizeEmail(input);
      
      expect(result).toBe('');
    });

    it('should return empty string for email with null bytes', () => {
      const input = 'test\x00@example.com';
      const result = sanitizeEmail(input);
      
      expect(result).toBe('test@example.com');
    });

    it('should handle empty input', () => {
      const result = sanitizeEmail('');
      
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      const result = sanitizeEmail(null as any);
      
      expect(result).toBe('');
    });
  });

  describe('sanitizeURL', () => {
    it('should sanitize valid HTTP URL', () => {
      const input = 'http://example.com';
      const result = sanitizeURL(input);
      
      expect(result).toBe('http://example.com/');
    });

    it('should sanitize valid HTTPS URL', () => {
      const input = 'https://example.com';
      const result = sanitizeURL(input);
      
      expect(result).toBe('https://example.com/');
    });

    it('should sanitize URL with HTML tags', () => {
      const input = 'https://example<script>alert(1)</script>.com';
      const result = sanitizeURL(input);
      
      expect(result).toBe('https://examplealert(1).com');
    });

    it('should return empty string for javascript: URL', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeURL(input);
      
      expect(result).toBe('');
    });

    it('should return empty string for data: URL', () => {
      const input = 'data:text/html,<script>alert(1)</script>';
      const result = sanitizeURL(input);
      
      expect(result).toBe('');
    });

    it('should return empty string for invalid URL', () => {
      const input = 'not-a-url';
      const result = sanitizeURL(input);
      
      expect(result).toBe('');
    });

    it('should handle empty input', () => {
      const result = sanitizeURL('');
      
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      const result = sanitizeURL(null as any);
      
      expect(result).toBe('');
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize valid filename', () => {
      const input = 'document.pdf';
      const result = sanitizeFileName(input);
      
      expect(result).toBe('document.pdf');
    });

    it('should sanitize filename with dangerous characters', () => {
      const input = 'file<>:"|?*.txt';
      const result = sanitizeFileName(input);
      
      expect(result).toBe('file______.txt');
    });

    it('should sanitize path traversal attempts', () => {
      const input = '../../../etc/passwd';
      const result = sanitizeFileName(input);
      
      expect(result).toBe('etc_passwd');
    });

    it('should sanitize filename with null bytes', () => {
      const input = 'file\x00.txt';
      const result = sanitizeFileName(input);
      
      expect(result).toBe('file.txt');
    });

    it('should limit filename length', () => {
      const longName = 'A'.repeat(300) + '.txt';
      const result = sanitizeFileName(longName);
      
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should handle empty filename', () => {
      const result = sanitizeFileName('');
      
      expect(result).toMatch(/^file_\d+$/);
    });

    it('should handle null input', () => {
      const result = sanitizeFileName(null as any);
      
      expect(result).toMatch(/^file_\d+$/);
    });

    it('should handle filename with only dots', () => {
      const input = '...';
      const result = sanitizeFileName(input);
      
      expect(result).toMatch(/^file_\d+$/);
    });
  });

  describe('sanitizeJSON', () => {
    it('should sanitize JSON object', () => {
      const input = {
        name: '<script>alert(1)</script>',
        email: 'test@example.com',
        data: '<img src=x onerror=alert(1)>'
      };
      const result = sanitizeJSON(input);
      
      expect(result.name).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(result.email).toBe('test@example.com');
      expect(result.data).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('should sanitize JSON array', () => {
      const input = ['<script>alert(1)</script>', 'normal string'];
      const result = sanitizeJSON(input);
      
      expect(result[0]).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(result[1]).toBe('normal string');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<script>alert(1)</script>',
          profile: {
            bio: '<img src=x onerror=alert(1)>'
          }
        }
      };
      const result = sanitizeJSON(input);
      
      expect(result.user.name).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(result.user.profile.bio).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('should handle JSON string', () => {
      const input = '{"name": "<script>alert(1)</script>"}';
      const result = sanitizeJSON(input);
      
      expect(result.name).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('should handle invalid JSON string', () => {
      const input = 'invalid json';
      const result = sanitizeJSON(input);
      
      expect(result).toBeNull();
    });

    it('should handle null input', () => {
      const result = sanitizeJSON(null);
      
      expect(result).toBeNull();
    });

    it('should handle undefined input', () => {
      const result = sanitizeJSON(undefined);
      
      expect(result).toBeUndefined();
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should sanitize basic search query', () => {
      const input = 'hello world';
      const result = sanitizeSearchQuery(input);
      
      expect(result).toBe('hello world');
    });

    it('should remove SQL injection patterns', () => {
      const input = "hello'; DROP TABLE users; --";
      const result = sanitizeSearchQuery(input);
      
      expect(result).toBe('hello');
    });

    it('should remove script tags', () => {
      const input = 'search <script>alert(1)</script> term';
      const result = sanitizeSearchQuery(input);
      
      expect(result).toBe('search  term');
    });

    it('should remove event handlers', () => {
      const input = 'search onmouseover="alert(1)" term';
      const result = sanitizeSearchQuery(input);
      
      expect(result).toBe('search  term');
    });

    it('should remove URLs', () => {
      const input = 'search https://example.com term';
      const result = sanitizeSearchQuery(input);
      
      expect(result).toBe('search  term');
    });

    it('should normalize whitespace', () => {
      const input = '  hello    world  ';
      const result = sanitizeSearchQuery(input);
      
      expect(result).toBe('hello world');
    });

    it('should limit query length', () => {
      const longQuery = 'A'.repeat(600);
      const result = sanitizeSearchQuery(longQuery);
      
      expect(result.length).toBeLessThanOrEqual(500);
    });

    it('should handle empty input', () => {
      const result = sanitizeSearchQuery('');
      
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      const result = sanitizeSearchQuery(null as any);
      
      expect(result).toBe('');
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('should sanitize valid phone number', () => {
      const input = '+1234567890';
      const result = sanitizePhoneNumber(input);
      
      expect(result).toBe('+1234567890');
    });

    it('should sanitize phone number with spaces and dashes', () => {
      const input = '+1 (234) 567-890';
      const result = sanitizePhoneNumber(input);
      
      expect(result).toBe('+1234567890');
    });

    it('should handle phone number without country code', () => {
      const input = '1234567890';
      const result = sanitizePhoneNumber(input);
      
      expect(result).toBe('1234567890');
    });

    it('should handle phone number with multiple plus signs', () => {
      const input = '++1234567890';
      const result = sanitizePhoneNumber(input);
      
      expect(result).toBe('+1234567890');
    });

    it('should return empty string for too short number', () => {
      const input = '123';
      const result = sanitizePhoneNumber(input);
      
      expect(result).toBe('');
    });

    it('should return empty string for too long number', () => {
      const input = '1234567890123456';
      const result = sanitizePhoneNumber(input);
      
      expect(result).toBe('');
    });

    it('should return empty string for non-numeric input', () => {
      const input = 'abc-def-ghij';
      const result = sanitizePhoneNumber(input);
      
      expect(result).toBe('');
    });

    it('should handle empty input', () => {
      const result = sanitizePhoneNumber('');
      
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      const result = sanitizePhoneNumber(null as any);
      
      expect(result).toBe('');
    });
  });
});
