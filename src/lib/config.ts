// Appwrite configuration
export const APPWRITE_CONFIG = {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID || '',
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || '',
  sessionsCollectionId: import.meta.env.VITE_APPWRITE_SESSIONS_COLLECTION_ID || 'sessions',
  filesCollectionId: import.meta.env.VITE_APPWRITE_FILES_COLLECTION_ID || 'files',
  bucketId: import.meta.env.VITE_APPWRITE_BUCKET_ID || 'file-storage',
  // For client-side operations, we'll use the backend API
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3002/api',
};

// Debug: Log configuration
console.log('🔧 Appwrite Config:', APPWRITE_CONFIG);

// File storage configuration
export const STORAGE_CONFIG = {
  maxFileSize: 500 * 1024 * 1024, // 100MB limit to match backend
  allowedFileTypes: [
    'image/*',
    'video/*',
    'audio/*',
    'text/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed',
    'application/json',
  ],
  shareCodeLength: 8,
  defaultExpirationHours: 24,
};
