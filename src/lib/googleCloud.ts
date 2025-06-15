import { GOOGLE_CLOUD_CONFIG, STORAGE_CONFIG } from './config';

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
  storagePath: string;
  createdAt: string;
}

export interface UploadResponse {
  sessionId: string;
  shareCode: string;
  files: FileMetadata[];
}

class GoogleCloudClient {
  private apiEndpoint: string;

  constructor() {
    this.apiEndpoint = GOOGLE_CLOUD_CONFIG.apiEndpoint;
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
    const code = shareCode || this.generateShareCode();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + STORAGE_CONFIG.defaultExpirationHours);

    const session: FileSession = {
      id: sessionId,
      shareCode: code,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      downloadCount: 0,
      maxDownloads: 100,
      files: [],
    };

    // Store session in localStorage for now (in production, use a backend)
    const sessions = this.getSessions();
    sessions[sessionId] = session;
    localStorage.setItem('fileSessions', JSON.stringify(sessions));

    return { sessionId, shareCode: code };
  }

  // Get all sessions from localStorage
  private getSessions(): Record<string, FileSession> {
    const stored = localStorage.getItem('fileSessions');
    return stored ? JSON.parse(stored) : {};
  }

  // Get session by share code
  async getSessionByShareCode(shareCode: string): Promise<FileSession | null> {
    const sessions = this.getSessions();
    const session = Object.values(sessions).find(s => s.shareCode === shareCode);
    
    if (!session) return null;
    
    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      return null;
    }
    
    return session;
  }

  // Get signed URL for file upload
  async getUploadUrl(fileName: string, contentType: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiEndpoint}/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          contentType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl } = await response.json();
      return uploadUrl;
    } catch (error) {
      console.error('Error getting upload URL:', error);
      // Fallback: create a mock URL for development
      return `https://storage.googleapis.com/${GOOGLE_CLOUD_CONFIG.bucketName}/${fileName}?uploadType=media`;
    }
  }
  // Upload file to Google Cloud Storage via backend
  async uploadFile(file: File, sessionId: string): Promise<FileMetadata> {
    const fileId = crypto.randomUUID();
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      
      // Upload file through backend
      const uploadResponse = await fetch(`${this.apiEndpoint}/upload-file`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const uploadResult = await uploadResponse.json();

      // Create file metadata
      const fileMetadata: FileMetadata = {
        id: uploadResult.fileId,
        sessionId,
        filename: uploadResult.fileName,
        originalFilename: uploadResult.originalName,
        fileSize: uploadResult.size,
        mimeType: file.type,
        storagePath: uploadResult.fileName,
        createdAt: new Date().toISOString(),
      };

      // Update session with file metadata
      const sessions = this.getSessions();
      if (sessions[sessionId]) {
        sessions[sessionId].files.push(fileMetadata);
        localStorage.setItem('fileSessions', JSON.stringify(sessions));
      }

      return fileMetadata;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  // Get download URL for file
  async getDownloadUrl(storagePath: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiEndpoint}/download-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storagePath,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const { downloadUrl } = await response.json();
      return downloadUrl;
    } catch (error) {
      console.error('Error getting download URL:', error);
      // Fallback: create a mock URL for development
      return `https://storage.googleapis.com/${GOOGLE_CLOUD_CONFIG.bucketName}/${storagePath}`;
    }
  }  // Download file
  async downloadFile(fileMetadata: FileMetadata): Promise<void> {
    try {
      console.log('Downloading file:', fileMetadata);
      
      // Use the backend download endpoint
      const response = await fetch(`${this.apiEndpoint}/download-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storagePath: fileMetadata.storagePath,
          filename: fileMetadata.originalFilename
        }),
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
      const sessions = this.getSessions();
      const session = Object.values(sessions).find(s => 
        s.files.some(f => f.id === fileMetadata.id)
      );
      
      if (session) {
        session.downloadCount++;
        sessions[session.id] = session;
        localStorage.setItem('fileSessions', JSON.stringify(sessions));
      }
    } catch (error) {
      console.error('Download error:', error);
      throw new Error('Failed to download file');
    }
  }

  // Clean up expired sessions
  cleanupExpiredSessions(): void {
    const sessions = this.getSessions();
    const now = new Date();
    
    Object.keys(sessions).forEach(sessionId => {
      if (new Date(sessions[sessionId].expiresAt) < now) {
        delete sessions[sessionId];
      }
    });
    
    localStorage.setItem('fileSessions', JSON.stringify(sessions));
  }
}

export const googleCloudClient = new GoogleCloudClient();
