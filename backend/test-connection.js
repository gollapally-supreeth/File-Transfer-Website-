import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
dotenv.config();

console.log('🔧 Testing Google Cloud Storage connection...\n');

async function testGoogleCloudConnection() {
  try {
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
    console.log(`Bucket Name: ${process.env.GOOGLE_CLOUD_BUCKET_NAME}`);
    console.log(`Credentials Path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}\n`);

    // Initialize Storage client
    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    console.log('✅ Storage client initialized');

    // Test project access
    console.log('🔍 Testing project access...');
    const [buckets] = await storage.getBuckets();
    console.log(`✅ Found ${buckets.length} buckets in project`);

    // Test specific bucket access
    console.log(`🔍 Testing bucket access: ${process.env.GOOGLE_CLOUD_BUCKET_NAME}`);
    const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);
    const [exists] = await bucket.exists();

    if (exists) {
      console.log('✅ Bucket exists and is accessible');
      
      // Test bucket permissions
      console.log('🔍 Testing bucket permissions...');
      const [files] = await bucket.getFiles({ maxResults: 1 });
      console.log('✅ Can list files in bucket');

      // Test signed URL generation
      console.log('🔍 Testing signed URL generation...');
      const testFile = bucket.file('test-connection.txt');
      const [uploadUrl] = await testFile.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: 'text/plain',
      });
      console.log('✅ Can generate signed URLs');

      console.log('\n🎉 All tests passed! Google Cloud Storage is properly configured.\n');
      
    } else {
      console.log('❌ Bucket does not exist or is not accessible');
      console.log('Please check:');
      console.log('1. Bucket name is correct');
      console.log('2. Service account has Storage Admin role');
      console.log('3. Bucket exists in the specified project');
    }

  } catch (error) {
    console.error('❌ Connection test failed:');
    console.error('Error:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check if service-account-key.json exists in backend folder');
    console.log('2. Verify environment variables in .env file');
    console.log('3. Ensure service account has Storage Admin role');
    console.log('4. Verify project ID and bucket name are correct');
  }
}

testGoogleCloudConnection();
