import { Client, Databases, Storage, ID, Permission, Role, Query } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

// Appwrite configuration
export const APPWRITE_CONFIG = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '',
  apiKey: process.env.APPWRITE_API_KEY || '',
  databaseId: process.env.APPWRITE_DATABASE_ID || '',
  sessionsCollectionId: process.env.APPWRITE_SESSIONS_COLLECTION_ID || '',
  filesCollectionId: process.env.APPWRITE_FILES_COLLECTION_ID || '',
  bucketId: process.env.APPWRITE_BUCKET_ID || '',
};

// Initialize Appwrite client
const client = new Client();
client
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId)
  .setKey(APPWRITE_CONFIG.apiKey);

export const databases = new Databases(client);
export const storage = new Storage(client);

// Export ID, Query, Permission, and Role for use in other modules
export { ID, Query, Permission, Role };

// Helper function to generate share codes
export function generateShareCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Session management functions
export class AppwriteSessionManager {
  
  // Create a new file session
  async createSession(shareCode) {
    const code = shareCode || generateShareCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    const sessionData = {
      shareCode: code,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      downloadCount: 0,
      maxDownloads: 100,
    };

    try {
      const session = await Promise.race([
        databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.sessionsCollectionId,
          ID.unique(),
          sessionData,
          [
            Permission.read(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any()),
          ]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session creation timeout')), 15000)
        )
      ]);

      console.log(`Created session: ${session.$id} with share code: ${code}`);
      return { sessionId: session.$id, shareCode: code };
    } catch (error) {
      console.error('Error creating session:', error);
      if (error.message.includes('timeout') || error.message.includes('fetch failed')) {
        throw new Error('Connection to Appwrite failed. Please check your internet connection.');
      }
      throw new Error('Failed to create session');
    }
  }

  // Get session by share code
  async getSessionByShareCode(shareCode) {
    try {
      const sessions = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.sessionsCollectionId,
        [
          Query.equal('shareCode', shareCode),
        ]
      );

      if (sessions.documents.length === 0) {
        return null;
      }

      const session = sessions.documents[0];
      
      // Check if expired
      if (new Date(session.expiresAt) < new Date()) {
        return null;
      }

      // Get files for this session
      const files = await this.getSessionFiles(session.$id);
      
      return {
        id: session.$id,
        shareCode: session.shareCode,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        downloadCount: session.downloadCount,
        maxDownloads: session.maxDownloads,
        files: files,
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Get files for a session
  async getSessionFiles(sessionId) {
    try {
      const files = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.filesCollectionId,
        [
          Query.equal('sessionId', sessionId),
        ]
      );

      return files.documents.map(file => ({
        id: file.$id,
        sessionId: file.sessionId,
        filename: file.filename,
        originalFilename: file.originalFilename,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        storageFileId: file.storageFileId,
        createdAt: file.createdAt,
      }));
    } catch (error) {
      console.error('Error getting session files:', error);
      return [];
    }
  }

  // Create file metadata
  async createFileMetadata(sessionId, fileData) {
    try {
      const fileMetadata = {
        sessionId,
        filename: fileData.filename,
        originalFilename: fileData.originalFilename,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        storageFileId: fileData.storageFileId,
        createdAt: new Date().toISOString(),
      };

      const file = await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.filesCollectionId,
        ID.unique(),
        fileMetadata,
        [
          Permission.read(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any()),
        ]
      );

      return {
        id: file.$id,
        sessionId: file.sessionId,
        filename: file.filename,
        originalFilename: file.originalFilename,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        storageFileId: file.storageFileId,
        createdAt: file.createdAt,
      };
    } catch (error) {
      console.error('Error creating file metadata:', error);
      throw new Error('Failed to create file metadata');
    }
  }

  // Increment download count
  async incrementDownloadCount(sessionId) {
    try {
      const session = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.sessionsCollectionId,
        sessionId
      );

      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.sessionsCollectionId,
        sessionId,
        {
          downloadCount: session.downloadCount + 1,
        }
      );
    } catch (error) {
      console.error('Error updating download count:', error);
      // Non-critical error, don't throw
    }
  }

  // Get file metadata by ID
  async getFileMetadata(fileId) {
    try {
      const file = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.filesCollectionId,
        fileId
      );

      return {
        id: file.$id,
        sessionId: file.sessionId,
        filename: file.filename,
        originalFilename: file.originalFilename,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        storageFileId: file.storageFileId,
        createdAt: file.createdAt,
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  // Cleanup expired sessions
  async cleanupExpiredSessions() {
    try {
      const now = new Date().toISOString();
      
      // Get expired sessions with timeout handling
      const expiredSessions = await Promise.race([
        databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.sessionsCollectionId,
          [
            Query.lessThan('expiresAt', now),
          ]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cleanup timeout')), 10000)
        )
      ]);

      let cleanedCount = 0;

      for (const session of expiredSessions.documents) {
        // Get files for this session
        const files = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.filesCollectionId,
          [
            Query.equal('sessionId', session.$id),
          ]
        );

        // Delete files from storage and database
        for (const file of files.documents) {
          try {
            await storage.deleteFile(APPWRITE_CONFIG.bucketId, file.storageFileId);
            await databases.deleteDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.filesCollectionId,
              file.$id
            );
          } catch (error) {
            console.error(`Error deleting file ${file.$id}:`, error);
          }
        }

        // Delete session
        try {
          await databases.deleteDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.sessionsCollectionId,
            session.$id
          );
          cleanedCount++;
        } catch (error) {
          console.error(`Error deleting session ${session.$id}:`, error);
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired sessions`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      return 0;
    }
  }
}

export const sessionManager = new AppwriteSessionManager();
