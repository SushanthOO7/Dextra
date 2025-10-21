import { DatabaseService, Credential } from './DatabaseService'
import { logger } from '../utils/logger'
import * as keytar from 'keytar'
import * as sodium from 'sodium-native'
import * as argon2 from 'argon2'
import { v4 as uuidv4 } from 'uuid'

export interface CredentialData {
  token?: string
  key?: string
  secret?: string
  refreshToken?: string
  expiresAt?: string
  [key: string]: any
}

export class CredentialService {
  private database: DatabaseService
  private serviceName = 'dextra'
  private masterKey: Buffer | null = null

  constructor() {
    this.database = new DatabaseService()
  }

  public async initialize(): Promise<void> {
    await this.database.initialize()
    await this.initializeMasterKey()
  }

  private async initializeMasterKey(): Promise<void> {
    try {
      // Try to get master key from OS keychain
      let masterKeyString = await keytar.getPassword(this.serviceName, 'master-key')
      
      if (!masterKeyString) {
        // Generate new master key
        masterKeyString = this.generateMasterKey()
        await keytar.setPassword(this.serviceName, 'master-key', masterKeyString)
        logger.info('Generated new master key')
      }

      this.masterKey = Buffer.from(masterKeyString, 'hex')
    } catch (error) {
      logger.error('Failed to initialize master key:', error)
      // Fallback to file-based storage
      this.masterKey = await this.getFallbackMasterKey()
    }
  }

  private generateMasterKey(): string {
    const key = Buffer.alloc(32)
    sodium.randombytes_buf(key)
    return key.toString('hex')
  }

  private async getFallbackMasterKey(): Promise<Buffer> {
    // Fallback to file-based master key storage
    const fs = require('fs')
    const path = require('path')
    const os = require('os')
    
    const keyPath = path.join(os.homedir(), '.dextra', 'master.key')
    const keyDir = path.dirname(keyPath)
    
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true })
    }

    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath)
    } else {
      const key = this.generateMasterKey()
      fs.writeFileSync(keyPath, key)
      return Buffer.from(key, 'hex')
    }
  }

  public async storeCredential(
    platform: string,
    name: string,
    type: 'oauth' | 'pat' | 'key',
    data: CredentialData
  ): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    try {
      const credentialId = uuidv4()
      const encryptedData = await this.encryptData(data)
      
      // Store in database
      const credential: Omit<Credential, 'id' | 'createdAt'> = {
        id: credentialId,
        platform,
        name,
        type,
        encrypted: true,
        createdAt: new Date().toISOString()
      }

      // Store encrypted data in OS keychain
      await keytar.setPassword(
        this.serviceName,
        `credential-${credentialId}`,
        encryptedData
      )

      // Store metadata in database
      this.database.setSetting(`credential-${credentialId}`, JSON.stringify(credential))

      logger.info(`Credential stored: ${name} for ${platform}`)
      return { success: true, credentialId }
    } catch (error) {
      logger.error('Failed to store credential:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  public async getCredential(credentialId: string): Promise<{ success: boolean; data?: CredentialData; error?: string }> {
    try {
      // Get credential metadata
      const credentialData = this.database.getSetting(`credential-${credentialId}`)
      if (!credentialData) {
        return { success: false, error: 'Credential not found' }
      }

      const credential = JSON.parse(credentialData) as Credential

      // Get encrypted data from OS keychain
      const encryptedData = await keytar.getPassword(
        this.serviceName,
        `credential-${credentialId}`
      )

      if (!encryptedData) {
        return { success: false, error: 'Credential data not found' }
      }

      // Decrypt data
      const data = await this.decryptData(encryptedData)

      // Update last used timestamp
      this.database.setSetting(
        `credential-${credentialId}`,
        JSON.stringify({ ...credential, lastUsed: new Date().toISOString() })
      )

      return { success: true, data }
    } catch (error) {
      logger.error('Failed to get credential:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  public async deleteCredential(credentialId: string): Promise<boolean> {
    try {
      // Delete from OS keychain
      await keytar.deletePassword(this.serviceName, `credential-${credentialId}`)
      
      // Delete from database
      this.database.setSetting(`credential-${credentialId}`, '')
      
      logger.info(`Credential deleted: ${credentialId}`)
      return true
    } catch (error) {
      logger.error('Failed to delete credential:', error)
      return false
    }
  }

  public async listCredentials(platform?: string): Promise<Credential[]> {
    try {
      // This is a simplified implementation
      // In a real implementation, you'd query the database for credential metadata
      const credentials: Credential[] = []
      
      // Get all credential settings
      const settings = this.database.getSetting('credentials') || '[]'
      const credentialList = JSON.parse(settings)
      
      for (const credentialId of credentialList) {
        const credentialData = this.database.getSetting(`credential-${credentialId}`)
        if (credentialData) {
          const credential = JSON.parse(credentialData) as Credential
          if (!platform || credential.platform === platform) {
            credentials.push(credential)
          }
        }
      }
      
      return credentials
    } catch (error) {
      logger.error('Failed to list credentials:', error)
      return []
    }
  }

  public async refreshCredential(credentialId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.getCredential(credentialId)
      if (!result.success) {
        return { success: false, error: result.error }
      }

      const data = result.data!
      
      // Check if credential needs refresh
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        // Implement OAuth refresh logic here
        // This would depend on the specific platform's OAuth implementation
        logger.info(`Credential ${credentialId} needs refresh`)
        return { success: false, error: 'Credential expired and refresh not implemented' }
      }

      return { success: true }
    } catch (error) {
      logger.error('Failed to refresh credential:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private async encryptData(data: CredentialData): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }

    const dataString = JSON.stringify(data)
    const dataBuffer = Buffer.from(dataString, 'utf8')
    
    // Generate random nonce
    const nonce = Buffer.alloc(24)
    sodium.randombytes_buf(nonce)
    
    // Encrypt data
    const ciphertext = Buffer.alloc(dataBuffer.length + 16) // +16 for auth tag
    sodium.crypto_secretbox_easy(ciphertext, dataBuffer, nonce, this.masterKey)
    
    // Combine nonce and ciphertext
    const encrypted = Buffer.concat([nonce, ciphertext])
    return encrypted.toString('base64')
  }

  private async decryptData(encryptedData: string): Promise<CredentialData> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }

    const encrypted = Buffer.from(encryptedData, 'base64')
    
    // Extract nonce and ciphertext
    const nonce = encrypted.subarray(0, 24)
    const ciphertext = encrypted.subarray(24)
    
    // Decrypt data
    const plaintext = Buffer.alloc(ciphertext.length - 16) // -16 for auth tag
    const success = sodium.crypto_secretbox_open_easy(plaintext, ciphertext, nonce, this.masterKey)
    
    if (!success) {
      throw new Error('Failed to decrypt data')
    }
    
    return JSON.parse(plaintext.toString('utf8'))
  }

  public async validateCredential(credentialId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const result = await this.getCredential(credentialId)
      if (!result.success) {
        return { valid: false, error: result.error }
      }

      // Validate credential by making a test API call
      // This would be platform-specific
      const data = result.data!
      
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        return { valid: false, error: 'Credential expired' }
      }

      return { valid: true }
    } catch (error) {
      logger.error('Failed to validate credential:', error)
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}
