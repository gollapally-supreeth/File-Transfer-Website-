# 📁 File Transfer Website with Google Cloud Storage

**Effortless file sharing with unlimited file sizes, powered by Google Cloud Storage.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-repo)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## ✨ Features

- 🚀 **Large File Support**: Upload files up to 5TB (Google Cloud free tier: 5GB)
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
- **File-type / size** validation with Google Cloud limits
- **Dark / Light** theme toggle

---

## 🛠️ Built with

| Front-end | Back-end | Storage & Tooling |
| --------- | -------- | ------------ |
| ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black) <br> ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite) <br> ![GSAP](https://img.shields.io/badge/-GSAP-88CE02?logo=greensock&logoColor=black) | ![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white) <br> ![Express](https://img.shields.io/badge/-Express-000000?logo=express) | ![Google Cloud](https://img.shields.io/badge/-Google%20Cloud-4285F4?logo=google-cloud) <br> ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript) <br> ![Tailwind CSS](https://img.shields.io/badge/-Tailwind%20CSS-38B2AC?logo=tailwind-css) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Cloud account with billing enabled
- Google Cloud CLI installed

### 1. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Google Cloud Setup
```bash
# Create a storage bucket (must be globally unique)
gsutil mb gs://your-unique-bucket-name

# Create service account and download key
# Go to Google Cloud Console → IAM & Admin → Service Accounts
# Create new service account with Storage Admin role
# Download JSON key file as backend/service-account-key.json
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Google Cloud settings
VITE_GOOGLE_CLOUD_PROJECT_ID=your-project-id
VITE_GOOGLE_CLOUD_BUCKET_NAME=your-unique-bucket-name
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
