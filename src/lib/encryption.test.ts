import { describe, it, expect, vi, beforeEach } from 'vitest'
import { encrypt, decrypt } from './encryption'

describe('Encryption Utility', () => {
  const originalKey = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', 'test-secret-key-32-chars-long-!!!')
  })

  it('should encrypt and decrypt a string correctly', () => {
    const originalText = 'my-secret-api-key-123'
    const encrypted = encrypt(originalText)
    
    expect(encrypted).not.toBe(originalText)
    expect(encrypted).toContain(':') // Should have IV separator
    
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(originalText)
  })

  it('should throw an error if decryption fails (wrong key)', () => {
    const originalText = 'secret'
    const encrypted = encrypt(originalText)
    
    // Change key and try to decrypt
    vi.stubEnv('ENCRYPTION_KEY', 'different-key-that-is-also-32-long')
    
    expect(() => decrypt(encrypted)).toThrow('Failed to decrypt API key')
  })

  it('should throw an error for invalid encrypted format', () => {
    expect(() => decrypt('invalid-format')).toThrow('Failed to decrypt API key')
  })
})
