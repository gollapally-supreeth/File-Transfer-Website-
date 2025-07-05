# 📁 File Transfer Website with Appwrite

**Effortless file sharing with unlimited file sizes, powered by Appwrite backend-as-a-service.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-repo)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## ✨ Features

- 🚀 **Large File Support**: Upload files up to 50MB with Appwrite Storage
- 🔒 **Secure Sharing**: Auto-generated share codes for secure file access  
- ⏱️ **Temporary Links**: Files expire automatically after 24 hours
- 📱 **Responsive Design**: Beautiful UI built with Tailwind CSS and shadcn/ui
- 🎨 **Modern Interface**: Drag-and-drop file uploads with progress tracking
- 🌐 **Real-time Updates**: Live upload progress and download status
- **Send / Receive** workflows with one-click GSAP-animated buttons  
- **Drag-and-drop** or traditional file picker
- **Progress bars** with real-time status & toast notifications  
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

## � Appwrite Features

### Database Collections
- **Sessions**: Store file sharing sessions with expiration
- **Files**: Store file metadata and references
- **Automatic cleanup**: Expired sessions are cleaned automatically

### Storage
- **Secure file storage** with Appwrite's built-in security
- **File previews** and direct download URLs
- **Configurable file size limits** and type restrictions
- **Antivirus scanning** and encryption (when enabled)

### API Endpoints
- `POST /api/sessions` - Create new file session
- `GET /api/sessions/:shareCode` - Get session by share code
- `POST /api/upload` - Upload file to session
- `GET /api/download/:fileId` - Get download URL
- `GET /api/download/:fileId/file` - Direct file download
- `POST /api/cleanup` - Clean expired sessions
