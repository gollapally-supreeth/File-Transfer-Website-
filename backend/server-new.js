import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configure storage paths
const STORAGE_PATH = process.env.STORAGE_PATH || './uploads';
const SESSIONS_PATH = path.join(STORAGE_PATH, 'sessions.json');

// Ensure storage directory exists
await fs.ensureDir(STORAGE_PATH);

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 * 1024, // 5GB limit
  },
});

app.use(cors());
app.use(express.json());

// Add logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Helper functions for session management
async function loadSessions() {
  try {
    if (await fs.pathExists(SESSIONS_PATH)) {
      const data = await fs.readJson(SESSIONS_PATH);
      return data;
    }
    return {};
  } catch (error) {
    console.error('Error loading sessions:', error);
    return {};
  }
}

async function saveSessions(sessions) {
  try {
    await fs.writeJson(SESSIONS_PATH, sessions, { spaces: 2 });
  } catch (error) {
    console.error('Error saving sessions:', error);
  }
}

function generateShareCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new file session
app.post('/api/sessions', async (req, res) => {
  try {
    const { shareCode } = req.body;
    const sessions = await loadSessions();
    
    const sessionId = crypto.randomUUID();
    const code = shareCode || generateShareCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    const session = {
      id: sessionId,
      shareCode: code,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      downloadCount: 0,
      maxDownloads: 100,
      files: [],
    };

    sessions[sessionId] = session;
    await saveSessions(sessions);

    console.log(`Created session: ${sessionId} with share code: ${code}`);

    res.json({ sessionId, shareCode: code });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session by share code
app.get('/api/sessions/:shareCode', async (req, res) => {
  try {
    const { shareCode } = req.params;
    const sessions = await loadSessions();
    
    const session = Object.values(sessions).find(s => s.shareCode === shareCode);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      return res.status(404).json({ error: 'Session expired' });
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

    const sessions = await loadSessions();
    const session = sessions[sessionId];
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Generate unique file ID and path
    const fileId = crypto.randomUUID();
    const sessionDir = path.join(STORAGE_PATH, sessionId);
    const fileName = `${fileId}-${originalname}`;
    const filePath = path.join(sessionDir, fileName);
    
    // Ensure session directory exists
    await fs.ensureDir(sessionDir);
    
    // Save file to disk
    await fs.writeFile(filePath, buffer);

    // Create file metadata
    const fileMetadata = {
      id: fileId,
      sessionId,
      filename: fileName,
      originalFilename: originalname,
      fileSize: buffer.length,
      mimeType: mimetype,
      storagePath: filePath,
      createdAt: new Date().toISOString(),
    };

    // Update session with file metadata
    session.files.push(fileMetadata);
    sessions[sessionId] = session;
    await saveSessions(sessions);

    console.log(`File uploaded: ${originalname} (${buffer.length} bytes)`);

    res.json(fileMetadata);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get download URL for file
app.get('/api/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const sessions = await loadSessions();
    
    // Find file in all sessions
    let fileMetadata = null;
    for (const session of Object.values(sessions)) {
      fileMetadata = session.files.find(f => f.id === fileId);
      if (fileMetadata) break;
    }
    
    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if file exists on disk
    if (!(await fs.pathExists(fileMetadata.storagePath))) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
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
    const sessions = await loadSessions();
    
    // Find file in all sessions
    let fileMetadata = null;
    for (const session of Object.values(sessions)) {
      fileMetadata = session.files.find(f => f.id === fileId);
      if (fileMetadata) break;
    }
    
    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if file exists on disk
    if (!(await fs.pathExists(fileMetadata.storagePath))) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.originalFilename}"`);
    res.setHeader('Content-Type', fileMetadata.mimeType);
    res.setHeader('Content-Length', fileMetadata.fileSize);
    
    // Stream file to response
    const fileStream = fs.createReadStream(fileMetadata.storagePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Increment download count
app.post('/api/files/:fileId/download', async (req, res) => {
  try {
    const { fileId } = req.params;
    const sessions = await loadSessions();
    
    // Find session containing the file
    for (const [sessionId, session] of Object.entries(sessions)) {
      const fileIndex = session.files.findIndex(f => f.id === fileId);
      if (fileIndex !== -1) {
        session.downloadCount++;
        sessions[sessionId] = session;
        await saveSessions(sessions);
        return res.json({ success: true });
      }
    }
    
    res.status(404).json({ error: 'File not found' });
  } catch (error) {
    console.error('Error updating download count:', error);
    res.status(500).json({ error: 'Failed to update download count' });
  }
});

// Cleanup expired sessions
app.post('/api/cleanup', async (req, res) => {
  try {
    const sessions = await loadSessions();
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of Object.entries(sessions)) {
      if (new Date(session.expiresAt) < now) {
        // Delete session files
        const sessionDir = path.join(STORAGE_PATH, sessionId);
        if (await fs.pathExists(sessionDir)) {
          await fs.remove(sessionDir);
        }
        
        // Remove from sessions
        delete sessions[sessionId];
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      await saveSessions(sessions);
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
    }
    
    res.json({ cleaned: cleanedCount });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({ error: 'Failed to cleanup sessions' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    storage: 'local',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 App Writer File Transfer Server running on port ${port}`);
  console.log(`📁 Storage path: ${path.resolve(STORAGE_PATH)}`);
  console.log(`🔗 API endpoint: http://localhost:${port}/api`);
});

// Cleanup expired sessions on startup and every hour
async function runCleanup() {
  try {
    const response = await fetch(`http://localhost:${port}/api/cleanup`, {
      method: 'POST',
    });
    const result = await response.json();
    if (result.cleaned > 0) {
      console.log(`🧹 Cleaned up ${result.cleaned} expired sessions`);
    }
  } catch (error) {
    console.error('Error running cleanup:', error);
  }
}

// Run cleanup every hour
setInterval(runCleanup, 60 * 60 * 1000);

// Run cleanup on startup (after 10 seconds)
setTimeout(runCleanup, 10000);
