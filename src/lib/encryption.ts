import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // For AES, this is always 16

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY?.trim().replace(/^["']|["']$/g, '')
  if (!key) {
    // Fallback for development if key is missing, but warn loudly
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production')
    }
    return 'development-secret-key-32-chars-long!!'
  }
  
  // Ensure the key is 32 bytes for aes-256-cbc
  return crypto.createHash('sha256').update(key).digest()
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  try {
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift()!, 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (error) {
    console.error('Decryption failed:', error)
    return '' // Return empty string if decryption fails (e.g. wrong key)
  }
}
