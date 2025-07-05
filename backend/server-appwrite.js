import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';
import { sessionManager, storage, APPWRITE_CONFIG, ID } from './appwrite.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for Appwrite
  },
});

app.use(cors());
app.use(express.json());

// Add logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Validate Appwrite configuration
if (!APPWRITE_CONFIG.projectId || !APPWRITE_CONFIG.apiKey || !APPWRITE_CONFIG.databaseId) {
  console.error('❌ Missing required Appwrite configuration. Please check your environment variables.');
  process.exit(1);
}

// Create a new file session
app.post('/api/sessions', async (req, res) => {
  try {
    const { shareCode } = req.body;
    const result = await sessionManager.createSession(shareCode);
    res.json(result);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session by share code
app.get('/api/sessions/:shareCode', async (req, res) => {
  try {
    const { shareCode } = req.params;
    const session = await sessionManager.getSessionByShareCode(shareCode);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, buffer, mimetype } = req.file;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Verify session exists
    const session = await sessionManager.getSessionByShareCode('temp'); // This will be improved
    // For now, we'll trust the sessionId from the frontend

    // Upload file to Appwrite Storage
    const fileId = ID.unique();
    const fileName = `${fileId}-${originalname}`;
    
    // Convert buffer to File for Appwrite
    const file = new File([buffer], fileName, { type: mimetype });
    
    const uploadedFile = await storage.createFile(
      APPWRITE_CONFIG.bucketId,
      fileId,
      file
    );

    // Create file metadata in database
    const fileMetadata = await sessionManager.createFileMetadata(sessionId, {
      filename: fileName,
      originalFilename: originalname,
      fileSize: buffer.length,
      mimeType: mimetype,
      storageFileId: uploadedFile.$id,
    });

    console.log(`File uploaded: ${originalname} (${buffer.length} bytes)`);
    res.json(fileMetadata);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file: ' + error.message });
  }
});

// Get download URL for file
app.get('/api/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileMetadata = await sessionManager.getFileMetadata(fileId);
    
    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Generate download URL from Appwrite
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/download/${fileId}/file`;
    res.json({ downloadUrl });
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

// Download file directly
app.get('/api/download/:fileId/file', async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileMetadata = await sessionManager.getFileMetadata(fileId);
    
    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file from Appwrite Storage
    const fileBuffer = await storage.getFileDownload(
      APPWRITE_CONFIG.bucketId,
      fileMetadata.storageFileId
    );
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.originalFilename}"`);
    res.setHeader('Content-Type', fileMetadata.mimeType);
    res.setHeader('Content-Length', fileMetadata.fileSize);
    
    // Send file buffer
    res.send(Buffer.from(fileBuffer));
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Increment download count
app.post('/api/files/:fileId/download', async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileMetadata = await sessionManager.getFileMetadata(fileId);
    
    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    await sessionManager.incrementDownloadCount(fileMetadata.sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating download count:', error);
    res.status(500).json({ error: 'Failed to update download count' });
  }
});

// Cleanup expired sessions
app.post('/api/cleanup', async (req, res) => {
  try {
    const cleaned = await sessionManager.cleanupExpiredSessions();
    res.json({ cleaned });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({ error: 'Failed to cleanup sessions' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    storage: 'appwrite',
    timestamp: new Date().toISOString(),
    appwrite: {
      endpoint: APPWRITE_CONFIG.endpoint,
      projectId: APPWRITE_CONFIG.projectId,
      databaseId: APPWRITE_CONFIG.databaseId,
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Appwrite File Transfer Server running on port ${port}`);
  console.log(`🗄️ Database: ${APPWRITE_CONFIG.databaseId}`);
  console.log(`📁 Storage Bucket: ${APPWRITE_CONFIG.bucketId}`);
  console.log(`🔗 API endpoint: http://localhost:${port}/api`);
});

// Cleanup expired sessions on startup and every hour
async function runCleanup() {
  try {
    const cleaned = await sessionManager.cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
    }
  } catch (error) {
    console.error('Error running cleanup:', error);
  }
}

// Run cleanup every hour
setInterval(runCleanup, 60 * 60 * 1000);

// Run cleanup on startup (after 10 seconds)
setTimeout(runCleanup, 10000);
