/**
 * Input sanitizer: plain-text sanitization, emails, URLs, file names, JSON,
 * search queries and phone numbers. isomorphic-dompurify is stubbed globally
 * in jest.setup.js, so the allowHTML branch is not exercised here.
 */

import {
  sanitizeString,
  sanitizeEmail,
  sanitizeURL,
  sanitizeFileName,
  sanitizeJSON,
  sanitizeSearchQuery,
  sanitizePhoneNumber,
} from '../input-sanitizer';

describe('sanitizeString', () => {
  it('drops script blocks entirely', () => {
    expect(sanitizeString('<script>alert("xss")</script>Hello World')).toBe('Hello World');
    expect(sanitizeString('a<SCRIPT type="x">steal()</SCRIPT>b')).toBe('ab');
  });

  it('strips inline event handlers and encodes the remaining markup', () => {
    expect(sanitizeString('<div onclick="alert(1)">Click me</div>')).toBe('&lt;div&gt;Click me&lt;&#x2F;div&gt;');
    expect(sanitizeString('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x&gt;');
  });

  it('removes javascript: and non-image data: schemes', () => {
    expect(sanitizeString('javascript:alert("xss")')).toBe('alert(&quot;xss&quot;)');
    expect(sanitizeString('JaVaScRiPt:go()')).toBe('go()');
    expect(sanitizeString('data:text/html,hi')).toBe('text&#x2F;html,hi');
    expect(sanitizeString('data:image/png')).toBe('data:image&#x2F;png');
  });

  it('HTML-encodes special characters', () => {
    expect(sanitizeString(`Tom & "Jerry" <b>'hi'</b>`)).toBe(
      'Tom &amp; &quot;Jerry&quot; &lt;b&gt;&#x27;hi&#x27;&lt;&#x2F;b&gt;'
    );
  });

  it('removes null bytes and control characters', () => {
    expect(sanitizeString('Hello\x00World\x01Test\x7F')).toBe('HelloWorldTest');
  });

  it('trims and normalizes whitespace by default', () => {
    expect(sanitizeString('  Hello    World\n\nTest  ')).toBe('Hello World Test');
  });

  it('can keep whitespace untouched', () => {
    expect(sanitizeString('  a  b  ', { trimWhitespace: false, normalizeWhitespace: false })).toBe('  a  b  ');
  });

  it('truncates to maxLength (default 1000)', () => {
    expect(sanitizeString('A'.repeat(200), { maxLength: 100 })).toHaveLength(100);
    expect(sanitizeString('A'.repeat(2000))).toHaveLength(1000);
  });

  it.each([[''], [null], [undefined], [42]])('returns an empty string for %p', (input) => {
    expect(sanitizeString(input as any)).toBe('');
  });
});

describe('sanitizeEmail', () => {
  it('lowercases and trims a valid address', () => {
    expect(sanitizeEmail('  Test.User@Example.COM ')).toBe('test.user@example.com');
  });

  it('strips HTML tags and control characters', () => {
    expect(sanitizeEmail('<b>test</b>@example.com')).toBe('test@example.com');
    expect(sanitizeEmail('test\x00@example.com')).toBe('test@example.com');
  });

  it.each(['not-an-email', 'a@b', 'a b@example.com', '@example.com', ''])('rejects %p', (email) => {
    expect(sanitizeEmail(email)).toBe('');
  });

  it('rejects non-string input', () => {
    expect(sanitizeEmail(null as any)).toBe('');
    expect(sanitizeEmail(undefined as any)).toBe('');
  });
});

describe('sanitizeURL', () => {
  it('accepts http and https URLs', () => {
    expect(sanitizeURL('http://example.com')).toBe('http://example.com/');
    expect(sanitizeURL(' https://example.com/path?q=1 ')).toBe('https://example.com/path?q=1');
  });

  it('strips HTML tags before parsing', () => {
    expect(sanitizeURL('https://example.com/<b>page</b>')).toBe('https://example.com/page');
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'ftp://example.com', 'file:///etc/passwd'])(
    'rejects non-http(s) scheme %p',
    (url) => {
      expect(sanitizeURL(url)).toBe('');
    }
  );

  it('rejects unparsable and empty input', () => {
    expect(sanitizeURL('not a url')).toBe('');
    expect(sanitizeURL('')).toBe('');
    expect(sanitizeURL(null as any)).toBe('');
  });
});

describe('sanitizeFileName', () => {
  it('keeps safe names', () => {
    expect(sanitizeFileName('report-2024.pdf')).toBe('report-2024.pdf');
  });

  it('neutralises path traversal and separators', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('__etc_passwd');
    expect(sanitizeFileName('..\\..\\windows\\system32')).toBe('__windows_system32');
    expect(sanitizeFileName('../../x')).not.toMatch(/\.\.|\//);
  });

  it('replaces reserved characters', () => {
    expect(sanitizeFileName('a<b>c:d"e|f?g*h.txt')).toBe('a_b_c_d_e_f_g_h.txt');
  });

  it('removes control characters', () => {
    expect(sanitizeFileName('file\x00name.txt')).toBe('filename.txt');
  });

  it('caps length at 255 while keeping the extension', () => {
    const result = sanitizeFileName('a'.repeat(300) + '.pdf');
    expect(result).toHaveLength(255);
    expect(result.endsWith('.pdf')).toBe(true);
  });

  it('falls back to a generated name when nothing usable is left', () => {
    expect(sanitizeFileName('')).toBe('file');
    expect(sanitizeFileName(null as any)).toBe('file');
    expect(sanitizeFileName('....')).toMatch(/^file_\d+$/);
    expect(sanitizeFileName('/')).toMatch(/^file_\d+$/);
  });
});

describe('sanitizeJSON', () => {
  it('sanitizes string values and keys recursively', () => {
    expect(
      sanitizeJSON({
        name: '<script>x()</script>Bob',
        '<k>': 'v',
        nested: { tags: ['a&b', 1, true, null] },
      })
    ).toEqual({
      name: 'Bob',
      '&lt;k&gt;': 'v',
      nested: { tags: ['a&amp;b', 1, true, null] },
    });
  });

  it('parses and sanitizes JSON strings', () => {
    expect(sanitizeJSON('{"a":"<i>x</i>"}')).toEqual({ a: '&lt;i&gt;x&lt;&#x2F;i&gt;' });
  });

  it('returns null for invalid JSON strings and passes through null/undefined', () => {
    expect(sanitizeJSON('{not json')).toBeNull();
    expect(sanitizeJSON(null)).toBeNull();
    expect(sanitizeJSON(undefined)).toBeUndefined();
  });
});

describe('sanitizeSearchQuery', () => {
  it('keeps ordinary queries', () => {
    expect(sanitizeSearchQuery('  order 12345  ')).toBe('order 12345');
  });

  it('removes SQL keywords, comments and statement separators', () => {
    expect(sanitizeSearchQuery("x'; DROP TABLE users; --")).toBe("x' TABLE users");
    expect(sanitizeSearchQuery('1 UNION SELECT password FROM users')).toBe('1 password FROM users');
    expect(sanitizeSearchQuery('a /* c */ b | c & d')).toBe('a c b c d');
  });

  it('removes HTML tags and script keywords', () => {
    expect(sanitizeSearchQuery('<b>shoes</b>')).toBe('shoes');
    expect(sanitizeSearchQuery('<img src=x onerror=alert(1)>shoes')).toBe('shoes');
    expect(sanitizeSearchQuery('javascript alert')).toBe('alert');
  });

  it('caps length at 500', () => {
    expect(sanitizeSearchQuery('a'.repeat(600))).toHaveLength(500);
  });

  it('returns an empty string for empty or non-string input', () => {
    expect(sanitizeSearchQuery('')).toBe('');
    expect(sanitizeSearchQuery(null as any)).toBe('');
  });
});

describe('sanitizePhoneNumber', () => {
  it('keeps digits and a leading plus', () => {
    expect(sanitizePhoneNumber('+919876543210')).toBe('+919876543210');
    expect(sanitizePhoneNumber('+91 98765-43210')).toBe('+919876543210');
    expect(sanitizePhoneNumber('(987) 654-3210')).toBe('9876543210');
  });

  it('moves a misplaced plus to the front', () => {
    expect(sanitizePhoneNumber('91+9876543210')).toBe('+919876543210');
  });

  it('requires 10 to 15 digits', () => {
    expect(sanitizePhoneNumber('123456789')).toBe('');
    expect(sanitizePhoneNumber('1234567890123456')).toBe('');
    expect(sanitizePhoneNumber('abcdefghij')).toBe('');
  });

  it('returns an empty string for empty or non-string input', () => {
    expect(sanitizePhoneNumber('')).toBe('');
    expect(sanitizePhoneNumber(null as any)).toBe('');
  });
});
