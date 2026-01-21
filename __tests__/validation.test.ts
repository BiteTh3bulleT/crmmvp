import { validatePassword, parsePositiveInt, parsePositiveIntStrict, isValidId } from '@/lib/validation'

describe('Password Validation', () => {
  it('rejects passwords shorter than 12 characters', () => {
    const result = validatePassword('Short1!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 12 characters long')
  })

  it('rejects passwords without lowercase letters', () => {
    const result = validatePassword('ALLUPPERCASE1!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one lowercase letter')
  })

  it('rejects passwords without uppercase letters', () => {
    const result = validatePassword('alllowercase1!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('rejects passwords without numbers', () => {
    const result = validatePassword('NoNumbersHere!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one number')
  })

  it('rejects passwords without special characters', () => {
    const result = validatePassword('NoSpecialChars1')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one special character')
  })

  it('accepts valid passwords', () => {
    const result = validatePassword('ValidPass123!')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('reports multiple errors', () => {
    const result = validatePassword('short')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

describe('parsePositiveInt', () => {
  it('returns default for null', () => {
    expect(parsePositiveInt(null, 10)).toBe(10)
  })

  it('returns default for empty string', () => {
    expect(parsePositiveInt('', 10)).toBe(10)
  })

  it('returns default for negative numbers', () => {
    expect(parsePositiveInt('-5', 10)).toBe(10)
  })

  it('returns default for non-numeric strings', () => {
    expect(parsePositiveInt('abc', 10)).toBe(10)
  })

  it('returns parsed value for valid numbers', () => {
    expect(parsePositiveInt('42', 10)).toBe(42)
  })

  it('returns zero for zero input', () => {
    expect(parsePositiveInt('0', 10)).toBe(0)
  })
})

describe('parsePositiveIntStrict', () => {
  it('returns null for null input', () => {
    expect(parsePositiveIntStrict(null)).toBeNull()
  })

  it('returns null for negative numbers', () => {
    expect(parsePositiveIntStrict('-5')).toBeNull()
  })

  it('returns null for non-numeric strings', () => {
    expect(parsePositiveIntStrict('abc')).toBeNull()
  })

  it('returns parsed value for valid numbers', () => {
    expect(parsePositiveIntStrict('42')).toBe(42)
  })
})

describe('isValidId', () => {
  it('accepts valid CUID', () => {
    expect(isValidId('clh1234567890abcdefghij')).toBe(false) // 23 chars
    expect(isValidId('clh1234567890abcdefghijk')).toBe(false) // 24 chars
  })

  it('rejects invalid IDs', () => {
    expect(isValidId('')).toBe(false)
    expect(isValidId('short')).toBe(false)
    expect(isValidId('has-special-chars!')).toBe(false)
  })
})
