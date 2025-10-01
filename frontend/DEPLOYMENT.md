# Frontend Deployment Guide

## 🎯 Your Backend is Live!
✅ Backend URL: https://sih-project-backend-2a8n.onrender.com/

## 🚀 Deploy Frontend Options

### Option 1: Vercel (Recommended - Easy)

#### Step 1: Prepare for Vercel
1. Go to: https://vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Import: `Civic-Sense-Crowdsourced-Issue-Reporting`

#### Step 2: Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

#### Step 3: Add Environment Variables
In Vercel dashboard, add these:
```
VITE_API_BASE_URL=https://sih-project-backend-2a8n.onrender.com
VITE_GOOGLE_CLIENT_ID=926724006763-js4pigiem33hd8ri5fk6v55t6lflba3f.apps.googleusercontent.com
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDZpGOycMv_K5CUCrsrEgTaTnnmQislvRY
```

#### Step 4: Deploy!
- Click "Deploy"
- Wait for build to complete
- Get your URL: `https://your-app.vercel.app`

---

### Option 2: Netlify

#### Step 1: Deploy to Netlify
1. Go to: https://netlify.com
2. Drag & drop your `frontend` folder
3. Or connect GitHub repository

#### Step 2: Build Settings
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Base directory**: `frontend`

#### Step 3: Environment Variables
Add in Netlify dashboard:
```
VITE_API_BASE_URL=https://sih-project-backend-2a8n.onrender.com
VITE_GOOGLE_CLIENT_ID=926724006763-js4pigiem33hd8ri5fk6v55t6lflba3f.apps.googleusercontent.com
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDZpGOycMv_K5CUCrsrEgTaTnnmQislvRY
```

---

### Option 3: Render (Same as Backend)

#### Step 1: Create Static Site
1. Go to Render Dashboard
2. Click "New" → "Static Site"
3. Connect repository

#### Step 2: Configure
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

#### Step 3: Environment Variables
Add the same variables as above

---

## 🔧 Important Updates Made

✅ **API Configuration**: Updated to use environment variables
✅ **Environment Files**: Created for different deployment environments  
✅ **Build Optimization**: Ready for production builds
✅ **Security**: Protected sensitive keys in .gitignore

## 🧪 Testing After Deployment

### Test These Features:
1. **User Registration/Login** (Google OAuth)
2. **Submit Complaint** (Should connect to your backend)
3. **Phone Verification** (Real calls will be made!)
4. **View Complaints** (Open complaints list)
5. **Admin Dashboard** (If you have admin access)

### Expected URLs:
- **Frontend**: `https://your-frontend.vercel.app`
- **Backend**: `https://sih-project-backend-2a8n.onrender.com` ✅
- **API Test**: Visit backend URL to see server status

## 🎉 Full System Architecture

```
Frontend (Vercel/Netlify) → Backend (Render) → MongoDB Atlas
                                    ↓
                                Twilio Phone Calls
```

## 📱 Phone Verification Flow

1. User submits complaint on frontend
2. Frontend sends to backend
3. Backend triggers Twilio call
4. User receives real phone call
5. Press 1 to confirm → Complaint goes to department
6. Press 2 to reject → Complaint cancelled

## 🚨 Don't Forget!

### After Frontend Deployment:
1. **Update Render Backend Environment**:
   ```
   TWILIO_WEBHOOK_BASE_URL=https://sih-project-backend-2a8n.onrender.com
   ```

2. **Update Twilio Console**:
   - Webhook URL: `https://sih-project-backend-2a8n.onrender.com/api/complaints/verify-call`

3. **Test Complete System**:
   - Submit complaint through frontend
   - Check phone for verification call
   - Verify complaint shows in dashboard

Your hackathon project will be fully live and impressive! 🏆