import express from 'express';
import cors from 'cors';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB limit
  },
});

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Path to service account key
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'file-transfer-bucket';
const bucket = storage.bucket(bucketName);

app.use(cors());
app.use(express.json());

// Add logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Request body:', req.body);
  next();
});

// Generate signed URL for file upload
app.post('/api/upload-url', async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const file = bucket.file(fileName);
    
    const options = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType || 'application/octet-stream',
    };

    const [uploadUrl] = await file.getSignedUrl(options);

    res.json({ 
      uploadUrl,
      fileName,
      bucketName 
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Alternative: Direct upload through backend (backup solution)
app.post('/api/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, buffer, mimetype } = req.file;
    const { sessionId } = req.body;
    
    // Generate unique filename
    const fileId = crypto.randomUUID();
    const fileName = `${sessionId || 'uploads'}/${fileId}-${originalname}`;
    
    const file = bucket.file(fileName);
    
    // Upload file to Google Cloud Storage
    await file.save(buffer, {
      metadata: {
        contentType: mimetype,
      },
    });

    // Generate download URL
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({ 
      message: 'File uploaded successfully',
      fileId,
      fileName,
      originalName: originalname,
      size: buffer.length,
      downloadUrl,
      bucketName 
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Generate signed URL for file download
app.post('/api/download-url', async (req, res) => {
  try {
    const { storagePath } = req.body;

    if (!storagePath) {
      return res.status(400).json({ error: 'storagePath is required' });
    }

    console.log(`Generating download URL for: ${storagePath}`);

    const file = bucket.file(storagePath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`File not found: ${storagePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    console.log(`File exists, generating signed URL...`);
    
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const [downloadUrl] = await file.getSignedUrl(options);
    console.log(`Generated download URL successfully`);

    res.json({ 
      downloadUrl,
      storagePath 
    });
  } catch (error) {
    console.error('Error generating download URL:', error);    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Alternative: Download file through backend (no CORS issues)
app.post('/api/download-file', async (req, res) => {
  try {
    const { storagePath, filename } = req.body;

    if (!storagePath) {
      return res.status(400).json({ error: 'storagePath is required' });
    }

    console.log(`Downloading file: ${storagePath}`);

    const file = bucket.file(storagePath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`File not found: ${storagePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    const [metadata] = await file.getMetadata();
    
    // Set response headers
    res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || metadata.name.split('/').pop()}"`);
    res.setHeader('Content-Length', metadata.size);

    // Stream the file
    const stream = file.createReadStream();
    stream.pipe(res);

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    });

    console.log(`File download started: ${storagePath}`);

  } catch (error) {
    console.error('Error downloading file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📁 Using Google Cloud Storage bucket: ${bucketName}`);
});

export default app;
