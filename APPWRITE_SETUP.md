# Appwrite Setup Guide

This guide will help you set up Appwrite for the File Transfer Website.

## Prerequisites

- Appwrite account (create one at https://appwrite.io)
- Node.js 18+ and npm

## Step 1: Create Appwrite Project

1. Go to https://cloud.appwrite.io or your self-hosted Appwrite instance
2. Create a new project
3. Note down your Project ID

## Step 2: Create Database and Collections

### Create Database
1. Go to "Databases" in your Appwrite console
2. Create a new database
3. Note down the Database ID

### Create Sessions Collection
1. Create a new collection called "sessions"
2. Add the following attributes:
   - `shareCode` (String, 8 characters, required)
   - `expiresAt` (DateTime, required)
   - `createdAt` (DateTime, required)
   - `downloadCount` (Integer, default: 0)
   - `maxDownloads` (Integer, default: 100)

3. Create an index on `shareCode` for faster queries
4. Set permissions: Read, Update, Delete for "Any" role

### Create Files Collection
1. Create a new collection called "files"
2. Add the following attributes:
   - `sessionId` (String, required)
   - `filename` (String, required)
   - `originalFilename` (String, required)
   - `fileSize` (Integer, required)
   - `mimeType` (String, required)
   - `storageFileId` (String, required)
   - `createdAt` (DateTime, required)

3. Create an index on `sessionId` for faster queries
4. Set permissions: Read, Update, Delete for "Any" role

## Step 3: Create Storage Bucket

1. Go to "Storage" in your Appwrite console
2. Create a new bucket called "file-storage"
3. Set the following settings:
   - Maximum file size: 50MB (or your preferred limit)
   - Allowed file extensions: Leave empty for all types
   - Encryption: Enabled (recommended)
   - Antivirus: Enabled (recommended)
4. Set permissions: Create, Read, Update, Delete for "Any" role
5. Note down the Bucket ID

## Step 4: Create API Key

1. Go to "Settings" → "API Keys"
2. Create a new API key with the following scopes:
   - `databases.read`
   - `databases.write`
   - `storage.read`
   - `storage.write`
3. Note down the API Key (keep it secure!)

## Step 5: Configure Environment Variables

Update your `.env` files with the Appwrite configuration:

### Backend (.env in backend folder):
```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_SESSIONS_COLLECTION_ID=sessions
APPWRITE_FILES_COLLECTION_ID=files
APPWRITE_BUCKET_ID=file-storage

PORT=3001
FRONTEND_URL=http://localhost:8080
```

### Frontend (.env in root folder):
```bash
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_DATABASE_ID=your-database-id
VITE_APPWRITE_SESSIONS_COLLECTION_ID=sessions
VITE_APPWRITE_FILES_COLLECTION_ID=files
VITE_APPWRITE_BUCKET_ID=file-storage

PORT=3001
FRONTEND_URL=http://localhost:8080
VITE_API_ENDPOINT=http://localhost:3001/api
```

## Step 6: Test the Setup

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Check the health endpoint:
   ```bash
   curl http://localhost:3001/api/health
   ```

4. You should see a response indicating Appwrite is configured properly.

## Security Considerations

- Keep your API key secure and never expose it in frontend code
- Use appropriate permissions for your collections and storage
- Consider implementing rate limiting for production use
- Enable Appwrite's built-in security features like antivirus scanning

## Troubleshooting

### Common Issues:

1. **"Project not found" error**: Check your Project ID in environment variables
2. **"Collection not found" error**: Verify collection IDs and database ID
3. **"Bucket not found" error**: Check storage bucket ID and permissions
4. **File upload fails**: Check file size limits and bucket permissions
5. **API key errors**: Verify API key has proper scopes

### Debug Steps:

1. Check Appwrite console logs
2. Verify environment variables are loaded correctly
3. Test API endpoints individually
4. Check network connectivity to Appwrite endpoint

## Production Deployment

For production:

1. Use a custom domain for your Appwrite instance (recommended)
2. Set up proper SSL certificates
3. Configure CORS settings appropriately
4. Implement proper error logging and monitoring
5. Set up automated backups for your database
6. Consider using Appwrite Teams for better access control
