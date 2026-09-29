/**
 * Password validator. The first block runs against the live policy in
 * security-config (currently relaxed: 8+ chars, a lowercase letter, 4 unique
 * characters, entropy >= 20). The second block enables every check through a
 * mocked config so the individual rules stay covered while they are switched off.
 */

import { validatePassword, generateSecurePassword, shouldChangePassword } from '../password-validator';
import { securityConfig } from '../security-config';

type Validator = typeof import('../password-validator');

describe('validatePassword with the current policy', () => {
  it('accepts a password meeting the policy', () => {
    const result = validatePassword('correct horse battery');
    expect(result).toMatchObject({ isValid: true, errors: [] });
    expect(result.entropy).toBeGreaterThan(20);
  });

  it.each([[''], [null], [undefined]])('requires a password (%p)', (password) => {
    expect(validatePassword(password as any)).toEqual({
      isValid: false,
      errors: ['Password is required'],
      strength: 'weak',
      entropy: 0,
      score: 0,
    });
  });

  it('enforces the minimum length', () => {
    const result = validatePassword('abc12');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(`Password must be at least ${securityConfig.password.minLength} characters long`);
  });

  it('enforces the maximum length', () => {
    const result = validatePassword('ab'.repeat(65));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(`Password must be no more than ${securityConfig.password.maxLength} characters long`);
  });

  it('requires a lowercase letter', () => {
    const result = validatePassword('ABCDEFGH1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('requires a minimum number of unique characters', () => {
    const result = validatePassword('aaaaaaaa');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(`Password must contain at least ${securityConfig.password.minUniqueChars} unique characters`);
  });

  it('reports strength from entropy and marks any failure as weak', () => {
    expect(validatePassword('abcdefgh').strength).toBe('weak'); // ~37.6 bits
    expect(validatePassword('abcdefghijkl').strength).toBe('medium'); // ~56.4 bits
    expect(validatePassword('Abcdefghijk1!').strength).toBe('strong'); // ~85 bits
    expect(validatePassword('Abcdefghijk1!xyz').strength).toBe('very-strong');
    expect(validatePassword('AAAAAAAAAAAAAAAAAAAA').strength).toBe('weak');
  });
});

describe('validatePassword with every rule enabled', () => {
  let strict: Validator;

  beforeAll(() => {
    jest.isolateModules(() => {
      jest.doMock('../security-config', () => ({
        securityConfig: {
          password: {
            minLength: 12,
            maxLength: 128,
            maxAge: 60 * 24 * 60 * 60 * 1000,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            preventCommonPasswords: true,
            preventUserInfo: true,
            preventSequentialChars: true,
            preventRepeatedChars: true,
            maxConsecutiveChars: 2,
            preventKeyboardPatterns: true,
            preventLeakedPasswords: true,
            preventSimilarPasswords: true,
            minEntropy: 60,
            minUniqueChars: 8,
          },
        },
      }));
      strict = require('../password-validator');
    });
  });

  afterAll(() => jest.dontMock('../security-config'));

  const errorsFor = (...args: Parameters<Validator['validatePassword']>) => strict.validatePassword(...args).errors;

  it('accepts a password that satisfies every rule', () => {
    const result = strict.validatePassword('Tr0ub4dor&Zebra!', { email: 'jane.doe@example.com', name: 'Jane Doe' });
    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  it('requires each character class', () => {
    expect(errorsFor('tr0ub4dor&zebra!')).toContain('Password must contain at least one uppercase letter');
    expect(errorsFor('TR0UB4DOR&ZEBRA!')).toContain('Password must contain at least one lowercase letter');
    expect(errorsFor('Troubador&Zebra!')).toContain('Password must contain at least one number');
    expect(errorsFor('Tr0ub4dorXZebra9')).toContain('Password must contain at least one special character');
  });

  it('rejects common and leaked passwords', () => {
    const errors = errorsFor('Password123');
    expect(errors).toContain('Password is too common and easily guessable');
    expect(errors).toContain('Password has been found in data breaches');
  });

  it('rejects passwords containing the user email, name or username', () => {
    expect(errorsFor('Jane!Tr0ub4dor&Z', { email: 'jane.doe@example.com' })).toContain(
      'Password cannot contain personal information'
    );
    expect(errorsFor('Tr0ub4dor&Smith!', { name: 'Sam Smith' })).toContain('Password cannot contain personal information');
    expect(errorsFor('Tr0ub4dor&Kd99x!', { username: 'kd99' })).toContain('Password cannot contain personal information');
  });

  it('rejects sequential, repeated and keyboard-pattern characters', () => {
    expect(errorsFor('Tr0ub4dor&Xyz!9')).toContain('Password cannot contain sequential characters');
    expect(errorsFor('Tr0ub4dor&Zeeeb!')).toContain('Password cannot have more than 2 consecutive identical characters');
    expect(errorsFor('Tr0ub4&Qwerty!9')).toContain('Password cannot contain keyboard patterns');
  });

  it('rejects a password found in history', () => {
    const history = [{ password: 'Tr0ub4dor&Zebra!', createdAt: new Date() }];
    expect(errorsFor('Tr0ub4dor&Zebra!', undefined, history)).toContain('Password cannot be similar to previous passwords');
    expect(errorsFor('Tr0ub4dor&Zebr4!', undefined, history)).not.toContain('Password cannot be similar to previous passwords');
  });

  it('enforces minimum entropy and unique characters', () => {
    const errors = errorsFor('abab');
    expect(errors.some((e) => e.startsWith('Password entropy is too low'))).toBe(true);
    expect(errors).toContain('Password must contain at least 8 unique characters');
  });
});

describe('generateSecurePassword', () => {
  afterEach(() => jest.restoreAllMocks());

  it('builds a password of the requested length with every character class', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.3);
    const password = generateSecurePassword(24);
    expect(password).toHaveLength(24);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
  });

  it('defaults to 20 characters', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(generateSecurePassword()).toHaveLength(20);
  });
});

describe('shouldChangePassword', () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  it('flags passwords older than the configured maximum age (60 days)', () => {
    expect(shouldChangePassword(daysAgo(61))).toBe(true);
  });

  it('does not flag recent passwords', () => {
    expect(shouldChangePassword(daysAgo(0))).toBe(false);
    expect(shouldChangePassword(daysAgo(59))).toBe(false);
  });
});
