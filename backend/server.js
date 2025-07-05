import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';
import { File } from 'node-fetch-native-with-agent';
import { sessionManager, storage, APPWRITE_CONFIG, ID, Query, Permission, Role } from './appwrite.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3003;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 100MB limit for Appwrite
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

    console.log(`Upload request: ${originalname}, size: ${buffer.length}, sessionId: ${sessionId}`);

    // Verify session exists (for now we'll trust the sessionId from frontend)
    // TODO: Implement proper session verification when needed

    // Upload file to Appwrite Storage using SDK with temporary file
    const fileId = ID.unique();
    
    console.log(`Uploading file: ${originalname}, size: ${buffer.length} bytes`);
    
    let uploadedFile;
    
    try {
      // Create a File object using the proper File constructor from node-fetch-native-with-agent
      // This matches what the Appwrite SDK expects
      const fileObj = new File([buffer], originalname, { type: mimetype });
      
      console.log(`Created File object: ${fileObj.name}, size: ${fileObj.size}, type: ${fileObj.type}`);
      
      uploadedFile = await storage.createFile(
        APPWRITE_CONFIG.bucketId,
        fileId,
        fileObj,
        [Permission.read(Role.any())]
      );
      
      console.log(`File uploaded successfully: ${uploadedFile.$id}`);
      
    } catch (error) {
      console.error('Appwrite upload error:', error);
      throw error;
    }

    // Create file metadata in database
    const fileMetadata = await sessionManager.createFileMetadata(sessionId, {
      filename: `${fileId}-${originalname}`,
      originalFilename: originalname,
      fileSize: buffer.length,
      mimeType: mimetype,
      storageFileId: uploadedFile.$id,
    });

    console.log(`File metadata created: ${fileMetadata.$id}`);
    console.log(`File uploaded successfully: ${originalname} (${buffer.length} bytes)`);
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
  console.log('⚠️  Note: If you see connection errors, check your internet connection and Appwrite configuration');
});

// Cleanup expired sessions on startup and every hour
async function runCleanup() {
  try {
    const cleaned = await sessionManager.cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
    }
  } catch (error) {
    // Log cleanup errors but don't crash the server
    if (error.message.includes('timeout') || error.message.includes('fetch failed')) {
      console.log('⚠️  Cleanup skipped due to network connectivity issues');
    } else {
      console.error('Error running cleanup:', error.message);
    }
  }
}

// Run cleanup every hour
setInterval(runCleanup, 60 * 60 * 1000);

// Run cleanup on startup (after 30 seconds to let server fully start)
setTimeout(runCleanup, 30000);
