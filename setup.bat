@echo off
echo 🚀 Setting up File Transfer Website with Google Cloud Storage...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if Google Cloud CLI is installed
gcloud --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ Google Cloud CLI is not installed.
    echo Please install it from: https://cloud.google.com/sdk/docs/install
    echo This is required for Google Cloud Storage setup.
)

echo 📦 Installing frontend dependencies...
npm install

echo 📦 Installing backend dependencies...
cd backend
npm install
cd ..

echo 📋 Creating environment file...
if not exist .env (
    copy .env.example .env
    echo ✅ Created .env file from template
    echo ⚠️ Please edit .env file with your Google Cloud settings:
    echo    - VITE_GOOGLE_CLOUD_PROJECT_ID
    echo    - VITE_GOOGLE_CLOUD_BUCKET_NAME
) else (
    echo ✅ .env file already exists
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Set up Google Cloud Storage:
echo    - Create a project in Google Cloud Console
echo    - Enable Cloud Storage API
echo    - Create a storage bucket: gsutil mb gs://your-bucket-name
echo    - Create service account with Storage Admin role
echo    - Download service account key to backend/service-account-key.json
echo.
echo 2. Configure CORS for your bucket:
echo    gsutil cors set cors.json gs://your-bucket-name
echo.
echo 3. Update .env file with your Google Cloud settings
echo.
echo 4. Run the application:
echo    npm run dev:full
echo.
echo 📚 For detailed setup instructions, see README.md
pause
