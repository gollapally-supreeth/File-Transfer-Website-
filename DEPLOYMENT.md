# 🚀 Deployment Checklist

## Before Deployment

### ✅ Appwrite Setup
- [ ] Appwrite project created
- [ ] Database collections created (`sessions`, `files`)
- [ ] Storage bucket created (`file-storage`)
- [ ] Platform domains added (localhost + production domain)
- [ ] API keys generated

### ✅ Environment Variables
- [ ] `VITE_APPWRITE_ENDPOINT` set
- [ ] `VITE_APPWRITE_PROJECT_ID` set
- [ ] `VITE_APPWRITE_DATABASE_ID` set
- [ ] `VITE_APPWRITE_SESSIONS_COLLECTION_ID` set
- [ ] `VITE_APPWRITE_FILES_COLLECTION_ID` set
- [ ] `VITE_APPWRITE_BUCKET_ID` set
- [ ] `VITE_API_ENDPOINT` set to Appwrite endpoint

### ✅ Code Changes
- [ ] Updated to use `appwriteService` instead of backend API
- [ ] Removed localhost API calls
- [ ] Build passes without errors
- [ ] All components updated to new service

## Deployment Options

### Option 1: Vercel
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically

### Option 2: Netlify
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables
5. Deploy

## Post-Deployment

### ✅ Testing
- [ ] Upload files works
- [ ] Download with share code works
- [ ] File expiry works
- [ ] Error handling works
- [ ] Mobile responsiveness
- [ ] CORS configured correctly

### ✅ Domain Setup
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active
- [ ] Appwrite platform updated with production domain

## Troubleshooting

### Common Issues
1. **CORS errors**: Add your domain to Appwrite platforms
2. **Environment variables**: Double-check all variables are set
3. **Build errors**: Run `npm run build` locally first
4. **Upload failures**: Check Appwrite storage permissions
5. **Download failures**: Verify bucket configuration

### Debug Steps
1. Check browser console for errors
2. Verify Appwrite project settings
3. Test API endpoints in Appwrite console
4. Check environment variables in deployment platform
