// Google Cloud Storage configuration
export const GOOGLE_CLOUD_CONFIG = {
  projectId: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID || 'your-project-id',
  bucketName: import.meta.env.VITE_GOOGLE_CLOUD_BUCKET_NAME || 'file-transfer-bucket',
  // For client-side uploads, we'll use signed URLs from backend
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3001/api',
};

// Debug: Log configuration
console.log('🔧 Google Cloud Config:', GOOGLE_CLOUD_CONFIG);

// File storage configuration
export const STORAGE_CONFIG = {
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB for free tier
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
