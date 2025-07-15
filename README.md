# 📁 File Transfer Website with Appwrite

**Effortless file sharing with unlimited file sizes, powered by Appwrite backend-as-a-service.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-repo)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## ✨ Features

- 🚀 **Large File Support**: Upload files up to 500MB with Appwrite Storage
- 🔒 **Secure Sharing**: Auto-generated share codes for secure file access  
- ⏱️ **Temporary Links**: Files expire automatically after 24 hours
- 📱 **Responsive Design**: Beautiful UI built with Tailwind CSS and shadcn/ui
- 🎨 **Modern Interface**: Drag-and-drop file uploads with progress tracking
- 🌐 **Real-time Updates**: Live upload progress and download status
- **Send / Receive** workflows with one-click GSAP-animated buttons  
- **Drag-and-drop** or traditional file picker
- **Progress bars** with real-time status & toast notifications  

## 🚀 Deployment

### Deploy to Vercel

1. **Connect your GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard:
   ```
   VITE_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=686813c9002897ec2332
   VITE_APPWRITE_DATABASE_ID=transfile-db
   VITE_APPWRITE_SESSIONS_COLLECTION_ID=sessions
   VITE_APPWRITE_FILES_COLLECTION_ID=files
   VITE_APPWRITE_BUCKET_ID=file-storage
   VITE_API_ENDPOINT=https://nyc.cloud.appwrite.io/v1
   ```
3. **Deploy**: Vercel will automatically build and deploy your app

### Deploy to Netlify

1. **Connect your repository** to Netlify
2. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment variables**: Same as Vercel (above)
4. **Deploy**: Netlify will build and deploy automatically

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server (frontend only)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── components/ui/          # Reusable UI components
├── services/              # Appwrite service layer
├── pages/                 # Main application pages
├── lib/                   # Utility functions and config
└── hooks/                 # Custom React hooks
```
- **Unique 8-digit share codes** for each upload session  
- **24-hour auto-expiry** (files are deleted automatically)  
- **Copy-to-clipboard** for share codes  
- Fully **responsive** UI & accessible components  
- **File-type / size** validation with configurable limits
- **Cloud storage** with Appwrite's secure backend
- **Database-driven** session and file management
- **Dark / Light** theme toggle

---

## 🛠️ Built with

| Front-end | Back-end | Storage & Tooling |
| --------- | -------- | ------------ |
| ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black) <br> ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite) <br> ![GSAP](https://img.shields.io/badge/-GSAP-88CE02?logo=greensock&logoColor=black) | ![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white) <br> ![Express](https://img.shields.io/badge/-Express-000000?logo=express) | ![Appwrite](https://img.shields.io/badge/-Appwrite-FD366E?logo=appwrite&logoColor=white) <br> ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript) <br> ![Tailwind CSS](https://img.shields.io/badge/-Tailwind%20CSS-38B2AC?logo=tailwind-css) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Appwrite account (https://appwrite.io)

### 1. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Appwrite Setup
Follow the detailed setup guide: [APPWRITE_SETUP.md](./APPWRITE_SETUP.md)

1. Create an Appwrite project
2. Set up database and collections
3. Create storage bucket
4. Generate API key

### 3. Environment Configuration
```bash
# Backend .env (in backend folder)
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_SESSIONS_COLLECTION_ID=sessions
APPWRITE_FILES_COLLECTION_ID=files
APPWRITE_BUCKET_ID=file-storage

# Frontend .env (in root folder)
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_DATABASE_ID=your-database-id
VITE_API_ENDPOINT=http://localhost:3001/api
```

### 4. Run the Application
```bash
# Terminal 1: Start backend server
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev
```

## ⚙️ Appwrite Configuration

### Platform Settings

In your Appwrite console, add these platforms:

1. **Web Platform**:
   - Name: `Trans-File Web`
   - Hostname: `localhost` (for development)
   - Hostname: `your-domain.vercel.app` (for production)

2. **Platform Permissions**:
   - Make sure your domain is added to the platform list
   - Enable CORS for your domain

### Database Setup

Your Appwrite database should have these collections:

1. **Sessions Collection** (`sessions`):
   - `shareCode` (string, required)
   - `expiresAt` (datetime, required)
   - `createdAt` (datetime, required)
   - `downloadCount` (integer, default: 0)
   - `maxDownloads` (integer, default: 10)

2. **Files Collection** (`files`):
   - `sessionId` (string, required)
   - `filename` (string, required)
   - `originalFilename` (string, required)
   - `fileSize` (integer, required)
   - `mimeType` (string, required)
   - `storageFileId` (string, required)
   - `createdAt` (datetime, required)

3. **Storage Bucket** (`file-storage`):
   - Max file size: 500MB
   - Allowed file extensions: `*` (or specify as needed)

### API Endpoints
- `POST /api/sessions` - Create new file session
- `GET /api/sessions/:shareCode` - Get session by share code
- `POST /api/upload` - Upload file to session
- `GET /api/download/:fileId` - Get download URL
- `GET /api/download/:fileId/file` - Direct file download
- `POST /api/cleanup` - Clean expired sessions
