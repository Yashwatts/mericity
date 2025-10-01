@echo off
echo.
echo ==========================================
echo   NGROK SETUP AND TROUBLESHOOTING
echo ==========================================
echo.

echo Step 1: Check if ngrok is installed...
where ngrok >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ ngrok not found. Installing ngrok...
    winget install ngrok.ngrok
    echo ✅ ngrok installed. Please restart this script.
    pause
    exit
) else (
    echo ✅ ngrok is installed
)

echo.
echo Step 2: Check ngrok version...
ngrok version

echo.
echo Step 3: Set up ngrok authentication...
echo.
echo Please follow these steps:
echo 1. Go to: https://dashboard.ngrok.com/get-started/setup
echo 2. Sign up for a free account (if you don't have one)
echo 3. Copy your authtoken from the dashboard
echo 4. Paste it below when prompted
echo.

set /p "authtoken=Enter your ngrok authtoken: "

if not "%authtoken%"=="" (
    echo Setting up authentication...
    ngrok config add-authtoken %authtoken%
    echo ✅ Authentication configured
) else (
    echo ⚠️  No authtoken provided. Using without auth (may have limitations)
)

echo.
echo Step 4: Starting ngrok tunnel...
echo This will create a public HTTPS URL for your local server
echo.

echo Starting ngrok http 5000...
echo.
echo ==========================================
echo   COPY THE HTTPS URL THAT APPEARS BELOW
echo ==========================================
echo.

ngrok http 5000