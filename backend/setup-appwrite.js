#!/usr/bin/env node

import { Client, Databases, Storage, Users, ID, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const PROJECT_NAME = 'TransFile';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`${colors.bold}${colors.blue}Step ${step}:${colors.reset} ${message}`);
}

function logSuccess(message) {
  log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  log(`${colors.red}✗${colors.reset} ${message}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

async function setupAppwrite() {
  log(`${colors.bold}${colors.magenta}🚀 TransFile Appwrite Setup Script${colors.reset}`);
  log('This script will set up your Appwrite project with all necessary configurations.\n');

  // Get project configuration
  const projectId = process.env.APPWRITE_PROJECT_ID || await promptInput('Enter your Appwrite Project ID: ');
  const apiKey = process.env.APPWRITE_API_KEY || await promptInput('Enter your Appwrite API Key (with full permissions): ');

  if (!projectId || !apiKey) {
    logError('Project ID and API Key are required!');
    process.exit(1);
  }

  // Initialize Appwrite client
  const client = new Client();
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);
  const storage = new Storage(client);

  try {
    // Step 1: Create Database
    logStep(1, 'Creating database');
    let database;
    try {
      database = await databases.create(
        ID.unique(),
        'TransFile Database',
        true // enabled
      );
      logSuccess(`Database created: ${database.name} (ID: ${database.$id})`);
    } catch (error) {
      if (error.code === 409) {
        // Database might already exist, list and use the first one
        const databasesList = await databases.list();
        if (databasesList.databases.length > 0) {
          database = databasesList.databases[0];
          logWarning(`Using existing database: ${database.name} (ID: ${database.$id})`);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // Step 2: Create Sessions Collection
    logStep(2, 'Creating Sessions collection');
    let sessionsCollection;
    try {
      sessionsCollection = await databases.createCollection(
        database.$id,
        ID.unique(),
        'sessions',
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ],
        false, // documentSecurity
        true   // enabled
      );
      logSuccess(`Sessions collection created (ID: ${sessionsCollection.$id})`);

      // Add attributes to sessions collection
      const sessionAttributes = [
        { key: 'shareCode', type: 'string', size: 8, required: true },
        { key: 'expiresAt', type: 'datetime', required: true },
        { key: 'createdAt', type: 'datetime', required: true },
        { key: 'downloadCount', type: 'integer', required: true, default: 0 },
        { key: 'maxDownloads', type: 'integer', required: true, default: 100 }
      ];

      for (const attr of sessionAttributes) {
        try {
          if (attr.type === 'string') {
            await databases.createStringAttribute(
              database.$id,
              sessionsCollection.$id,
              attr.key,
              attr.size,
              attr.required,
              attr.default
            );
          } else if (attr.type === 'datetime') {
            await databases.createDatetimeAttribute(
              database.$id,
              sessionsCollection.$id,
              attr.key,
              attr.required,
              attr.default
            );
          } else if (attr.type === 'integer') {
            await databases.createIntegerAttribute(
              database.$id,
              sessionsCollection.$id,
              attr.key,
              attr.required,
              null, // min
              null, // max
              attr.default
            );
          }
          logSuccess(`Added attribute: ${attr.key}`);
          
          // Wait a bit between attribute creations
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          if (error.code === 409) {
            logWarning(`Attribute ${attr.key} already exists`);
          } else {
            logError(`Failed to create attribute ${attr.key}: ${error.message}`);
          }
        }
      }

      // Create index on shareCode
      try {
        await databases.createIndex(
          database.$id,
          sessionsCollection.$id,
          'shareCode_index',
          'key',
          ['shareCode'],
          ['ASC']
        );
        logSuccess('Created index on shareCode');
      } catch (error) {
        if (error.code === 409) {
          logWarning('Index on shareCode already exists');
        } else {
          logError(`Failed to create shareCode index: ${error.message}`);
        }
      }

    } catch (error) {
      if (error.code === 409) {
        // Collection might already exist
        const collections = await databases.listCollections(database.$id);
        sessionsCollection = collections.collections.find(c => c.name === 'sessions');
        if (sessionsCollection) {
          logWarning(`Using existing sessions collection (ID: ${sessionsCollection.$id})`);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // Step 3: Create Files Collection
    logStep(3, 'Creating Files collection');
    let filesCollection;
    try {
      filesCollection = await databases.createCollection(
        database.$id,
        ID.unique(),
        'files',
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ],
        false, // documentSecurity
        true   // enabled
      );
      logSuccess(`Files collection created (ID: ${filesCollection.$id})`);

      // Add attributes to files collection
      const fileAttributes = [
        { key: 'sessionId', type: 'string', size: 255, required: true },
        { key: 'filename', type: 'string', size: 255, required: true },
        { key: 'originalFilename', type: 'string', size: 255, required: true },
        { key: 'fileSize', type: 'integer', required: true },
        { key: 'mimeType', type: 'string', size: 100, required: true },
        { key: 'storageFileId', type: 'string', size: 255, required: true },
        { key: 'createdAt', type: 'datetime', required: true }
      ];

      for (const attr of fileAttributes) {
        try {
          if (attr.type === 'string') {
            await databases.createStringAttribute(
              database.$id,
              filesCollection.$id,
              attr.key,
              attr.size,
              attr.required,
              attr.default
            );
          } else if (attr.type === 'datetime') {
            await databases.createDatetimeAttribute(
              database.$id,
              filesCollection.$id,
              attr.key,
              attr.required,
              attr.default
            );
          } else if (attr.type === 'integer') {
            await databases.createIntegerAttribute(
              database.$id,
              filesCollection.$id,
              attr.key,
              attr.required,
              null, // min
              null, // max
              attr.default
            );
          }
          logSuccess(`Added attribute: ${attr.key}`);
          
          // Wait a bit between attribute creations
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          if (error.code === 409) {
            logWarning(`Attribute ${attr.key} already exists`);
          } else {
            logError(`Failed to create attribute ${attr.key}: ${error.message}`);
          }
        }
      }

      // Create index on sessionId
      try {
        await databases.createIndex(
          database.$id,
          filesCollection.$id,
          'sessionId_index',
          'key',
          ['sessionId'],
          ['ASC']
        );
        logSuccess('Created index on sessionId');
      } catch (error) {
        if (error.code === 409) {
          logWarning('Index on sessionId already exists');
        } else {
          logError(`Failed to create sessionId index: ${error.message}`);
        }
      }

    } catch (error) {
      if (error.code === 409) {
        // Collection might already exist
        const collections = await databases.listCollections(database.$id);
        filesCollection = collections.collections.find(c => c.name === 'files');
        if (filesCollection) {
          logWarning(`Using existing files collection (ID: ${filesCollection.$id})`);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // Step 4: Create Storage Bucket
    logStep(4, 'Creating storage bucket');
    let bucket;
    try {
      bucket = await storage.createBucket(
        ID.unique(),
        'file-storage',
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ],
        false, // fileSecurity
        true,  // enabled
        50 * 1024 * 1024, // maxFileSize (50MB)
        [], // allowedFileExtensions (empty = all)
        'none', // compression
        true, // encryption
        true  // antivirus
      );
      logSuccess(`Storage bucket created: ${bucket.name} (ID: ${bucket.$id})`);
    } catch (error) {
      if (error.code === 409) {
        // Bucket might already exist
        const buckets = await storage.listBuckets();
        bucket = buckets.buckets.find(b => b.name === 'file-storage');
        if (bucket) {
          logWarning(`Using existing storage bucket (ID: ${bucket.$id})`);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // Step 5: Generate Environment Configuration
    logStep(5, 'Generating environment configuration');
    
    const backendEnv = `# Appwrite Configuration
APPWRITE_ENDPOINT=${APPWRITE_ENDPOINT}
APPWRITE_PROJECT_ID=${projectId}
APPWRITE_API_KEY=${apiKey}
APPWRITE_DATABASE_ID=${database.$id}
APPWRITE_SESSIONS_COLLECTION_ID=${sessionsCollection.$id}
APPWRITE_FILES_COLLECTION_ID=${filesCollection.$id}
APPWRITE_BUCKET_ID=${bucket.$id}

# Application Configuration
PORT=3001
FRONTEND_URL=http://localhost:8080
`;

    const frontendEnv = `# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=${APPWRITE_ENDPOINT}
VITE_APPWRITE_PROJECT_ID=${projectId}
VITE_APPWRITE_DATABASE_ID=${database.$id}
VITE_APPWRITE_SESSIONS_COLLECTION_ID=${sessionsCollection.$id}
VITE_APPWRITE_FILES_COLLECTION_ID=${filesCollection.$id}
VITE_APPWRITE_BUCKET_ID=${bucket.$id}

# Application Configuration
PORT=3001
FRONTEND_URL=http://localhost:8080
VITE_API_ENDPOINT=http://localhost:3001/api
`;

    // Write backend .env
    fs.writeFileSync(path.join(__dirname, '.env'), backendEnv);
    logSuccess('Created backend/.env file');

    // Write frontend .env
    fs.writeFileSync(path.join(__dirname, '..', '.env'), frontendEnv);
    logSuccess('Created frontend/.env file');

    // Step 6: Display Summary
    log(`\n${colors.bold}${colors.green}🎉 Setup Complete!${colors.reset}\n`);
    
    log(`${colors.bold}Configuration Summary:${colors.reset}`);
    log(`${colors.cyan}Project ID:${colors.reset} ${projectId}`);
    log(`${colors.cyan}Database ID:${colors.reset} ${database.$id}`);
    log(`${colors.cyan}Sessions Collection:${colors.reset} ${sessionsCollection.$id}`);
    log(`${colors.cyan}Files Collection:${colors.reset} ${filesCollection.$id}`);
    log(`${colors.cyan}Storage Bucket:${colors.reset} ${bucket.$id}`);
    
    log(`\n${colors.bold}Next Steps:${colors.reset}`);
    log(`1. ${colors.green}cd backend && npm run dev${colors.reset} - Start backend server`);
    log(`2. ${colors.green}cd .. && npm run dev${colors.reset} - Start frontend (in new terminal)`);
    log(`3. Open ${colors.blue}http://localhost:8080${colors.reset} to test the application`);
    
    log(`\n${colors.bold}Test API Health:${colors.reset}`);
    log(`${colors.green}curl http://localhost:3001/api/health${colors.reset}`);

  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Simple input prompt for Node.js
function promptInput(question) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

// Run the setup
setupAppwrite().catch(console.error);
