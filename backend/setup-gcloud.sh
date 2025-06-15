# Google Cloud Storage Setup Guide

## After installing Google Cloud CLI, run these commands:

# 1. Login to Google Cloud
gcloud auth login

# 2. Create a new project (replace 'your-project-name' with your desired name)
gcloud projects create file-transfer-app-2024 --name="File Transfer App"

# 3. Set the project as default
gcloud config set project file-transfer-app-2024

# 4. Enable Cloud Storage API
gcloud services enable storage-component.googleapis.com
gcloud services enable storage.googleapis.com

# 5. Create a storage bucket (name must be globally unique)
gsutil mb -p file-transfer-app-2024 -c STANDARD -l us-central1 gs://file-transfer-bucket-$(date +%s)

# 6. Create service account
gcloud iam service-accounts create file-storage-service --description="Service account for file transfer app" --display-name="File Storage Service"

# 7. Grant Storage Admin role to service account
gcloud projects add-iam-policy-binding file-transfer-app-2024 --member="serviceAccount:file-storage-service@file-transfer-app-2024.iam.gserviceaccount.com" --role="roles/storage.admin"

# 8. Create and download service account key
gcloud iam service-accounts keys create ./service-account-key.json --iam-account=file-storage-service@file-transfer-app-2024.iam.gserviceaccount.com

# 9. Set CORS policy for the bucket
gsutil cors set ../cors.json gs://your-bucket-name

echo "Setup complete! Update your .env file with the project details."
