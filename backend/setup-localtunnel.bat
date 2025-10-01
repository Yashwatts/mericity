@echo off
echo.
echo ==========================================
echo   LOCALTUNNEL SETUP (ngrok Alternative)
echo ==========================================
echo.

echo Installing localtunnel (simpler than ngrok)...
npm install -g localtunnel

echo.
echo Starting tunnel on port 5000...
echo This will give you a public HTTPS URL
echo.

echo ==========================================
echo   COPY THE HTTPS URL THAT APPEARS BELOW
echo ==========================================
echo.

lt --port 5000 --subdomain sih-phone-verify-2025