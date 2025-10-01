#!/bin/bash

echo "🚀 RENDER DEPLOYMENT CHECKLIST"
echo "================================"
echo ""

echo "✅ Pre-deployment checklist:"
echo "   📦 package.json has start script"
echo "   🔧 server.js has health check endpoint"  
echo "   📱 Phone verification routes configured"
echo "   🔐 Environment variables template ready"
echo ""

echo "📋 Deployment Steps:"
echo "1. Go to https://render.com"
echo "2. Sign in with GitHub"
echo "3. Click 'New' → 'Web Service'"
echo "4. Connect repository: Civic-Sense-Crowdsourced-Issue-Reporting"
echo "5. Configure:"
echo "   - Environment: Node"
echo "   - Root Directory: backend"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo ""

echo "🔐 Environment Variables to add in Render:"
echo "   (Copy from .env.render file)"
echo ""

echo "📞 After deployment:"
echo "1. Get your Render URL (https://your-app.onrender.com)"
echo "2. Update TWILIO_WEBHOOK_BASE_URL in Render env vars"
echo "3. Update Twilio console webhook URL"
echo "4. Test phone verification!"
echo ""

echo "🎉 Your backend will be live and ready for phone calls!"

# Check if all files are ready
if [ -f "package.json" ] && [ -f "server.js" ] && [ -f ".env.render" ]; then
    echo ""
    echo "✅ All deployment files are ready!"
    echo "You can proceed with Render deployment."
else
    echo ""
    echo "❌ Some files are missing. Please ensure all files are present."
fi