import { Client, Databases, Storage } from 'appwrite';
import { APPWRITE_CONFIG, STORAGE_CONFIG } from './config';

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

class AppwriteClient {
  private client: Client;
  private databases: Databases;
  private storage: Storage;
  private apiEndpoint: string;

  constructor() {
    this.apiEndpoint = APPWRITE_CONFIG.apiEndpoint;
    
    // Initialize Appwrite client for frontend operations
    this.client = new Client();
    this.client
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId);

    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
  }

  // Generate a random share code
  generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < STORAGE_CONFIG.shareCodeLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create a new file session
  async createSession(shareCode?: string): Promise<{ sessionId: string; shareCode: string }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shareCode: shareCode || this.generateShareCode(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { sessionId, shareCode: returnedCode } = await response.json();
      return { sessionId, shareCode: returnedCode };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  // Get session by share code
  async getSessionByShareCode(shareCode: string): Promise<FileSession | null> {
    try {
      const response = await fetch(`${this.apiEndpoint}/sessions/${shareCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to get session');
      }

      const session = await response.json();
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Upload file using Appwrite backend
  async uploadFile(file: File, sessionId: string): Promise<FileMetadata> {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      
      // Upload file through backend
      const uploadResponse = await fetch(`${this.apiEndpoint}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const fileMetadata = await uploadResponse.json();
      return fileMetadata;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload file: ' + error.message);
    }
  }

  // Get download URL for file
  async getDownloadUrl(fileId: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiEndpoint}/download/${fileId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const { downloadUrl } = await response.json();
      return downloadUrl;
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw new Error('Failed to get download URL');
    }
  }

  // Download file
  async downloadFile(fileMetadata: FileMetadata): Promise<void> {
    try {
      console.log('Downloading file:', fileMetadata);
      
      // Use the backend download endpoint
      const response = await fetch(`${this.apiEndpoint}/download/${fileMetadata.id}/file`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Get the file blob
      const blob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMetadata.originalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update download count
      await this.incrementDownloadCount(fileMetadata.id);
    } catch (error) {
      console.error('Download error:', error);
      throw new Error('Failed to download file');
    }
  }

  // Increment download count
  private async incrementDownloadCount(fileId: string): Promise<void> {
    try {
      await fetch(`${this.apiEndpoint}/files/${fileId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error updating download count:', error);
      // Non-critical error, don't throw
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await fetch(`${this.apiEndpoint}/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      // Non-critical error, don't throw
    }
  }

  // Get direct file view URL (for previews)
  getFileViewUrl(storageFileId: string): string {
    return `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files/${storageFileId}/view?project=${APPWRITE_CONFIG.projectId}`;
  }

  // Get file preview URL (for images)
  getFilePreviewUrl(storageFileId: string, width: number = 400, height: number = 400): string {
    return `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files/${storageFileId}/preview?project=${APPWRITE_CONFIG.projectId}&width=${width}&height=${height}`;
  }
}

export const appwriteClient = new AppwriteClient();
