import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';
import { APPWRITE_CONFIG } from '../lib/config';

export interface FileSession {
  id: string;
  shareCode: string;
  expiresAt: string;
  createdAt: string;
  downloadCount: number;
  maxDownloads: number;
  files: FileMetadata[];
}

export interface FileMetadata {
  id: string;
  sessionId: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  storageFileId: string;
  createdAt: string;
}

export interface UploadResponse {
  sessionId: string;
  shareCode: string;
  files: FileMetadata[];
}

class AppwriteService {
  private client: Client;
  private account: Account;
  private databases: Databases;
  private storage: Storage;

  constructor() {
    this.client = new Client();
    this.client
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId);

    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
  }

  // Generate a random share code
  private generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create a new file session
  async createSession(maxDownloads: number = 10): Promise<{ sessionId: string; shareCode: string }> {
    try {
      const shareCode = this.generateShareCode();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      const sessionData = {
        shareCode,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        downloadCount: 0,
        maxDownloads,
      };

      const session = await this.databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.sessionsCollectionId,
        ID.unique(),
        sessionData
      );

      return { sessionId: session.$id, shareCode };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  // Upload a file to Appwrite storage
  async uploadFile(file: File, sessionId: string): Promise<FileMetadata> {
    try {
      // Upload file to storage
      const uploadedFile = await this.storage.createFile(
        APPWRITE_CONFIG.bucketId,
        ID.unique(),
        file
      );

      // Create file metadata record
      const fileMetadata = {
        sessionId,
        filename: uploadedFile.name,
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageFileId: uploadedFile.$id,
        createdAt: new Date().toISOString(),
      };

      const fileRecord = await this.databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.filesCollectionId,
        ID.unique(),
        fileMetadata
      );

      return {
        id: fileRecord.$id,
        sessionId,
        filename: uploadedFile.name,
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageFileId: uploadedFile.$id,
        createdAt: fileMetadata.createdAt,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${file.name}`);
    }
  }

  // Get session by share code
  async getSessionByShareCode(shareCode: string): Promise<FileSession | null> {
    try {
      const sessions = await this.databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.sessionsCollectionId,
        [Query.equal('shareCode', shareCode)]
      );

      if (sessions.documents.length === 0) {
        return null;
      }

      const session = sessions.documents[0];

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        throw new Error('Session has expired');
      }

      // Get files for this session
      const files = await this.databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.filesCollectionId,
        [Query.equal('sessionId', session.$id)]
      );

      return {
        id: session.$id,
        shareCode: session.shareCode,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        downloadCount: session.downloadCount,
        maxDownloads: session.maxDownloads,
        files: files.documents.map(file => ({
          id: file.$id,
          sessionId: file.sessionId,
          filename: file.filename,
          originalFilename: file.originalFilename,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          storageFileId: file.storageFileId,
          createdAt: file.createdAt,
        })),
      };
    } catch (error) {
      console.error('Error getting session:', error);
      throw new Error('Failed to get session');
    }
  }

  // Download a file
  async downloadFile(fileId: string): Promise<string> {
    try {
      const downloadUrl = this.storage.getFileDownload(APPWRITE_CONFIG.bucketId, fileId);
      return downloadUrl.toString();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file');
    }
  }

  // Increment download count
  async incrementDownloadCount(sessionId: string): Promise<void> {
    try {
      const session = await this.databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.sessionsCollectionId,
        sessionId
      );

      await this.databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.sessionsCollectionId,
        sessionId,
        {
          downloadCount: session.downloadCount + 1,
        }
      );
    } catch (error) {
      console.error('Error incrementing download count:', error);
      throw new Error('Failed to update download count');
    }
  }

  // Check if session has reached max downloads
  async checkDownloadLimit(sessionId: string): Promise<boolean> {
    try {
      const session = await this.databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.sessionsCollectionId,
        sessionId
      );

      return session.downloadCount >= session.maxDownloads;
    } catch (error) {
      console.error('Error checking download limit:', error);
      return false;
    }
  }
}

export const appwriteService = new AppwriteService();
