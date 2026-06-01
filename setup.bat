@echo off
title TaxMate Setup
color 0B
echo.
echo  ========================================
echo   ⚖️  TaxMate Setup
echo  ========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo  ❌ Node.js is not installed.
  echo.
  echo  Please install it from https://nodejs.org
  echo  Choose the LTS version, install it, then
  echo  close and reopen this window and run setup again.
  echo.
  pause
  start https://nodejs.org
  exit /b 1
)

echo  ✅ Node.js found
echo.

:: Install server dependencies
echo  Installing server dependencies...
cd /d "%~dp0server"
call npm install --silent
echo  ✅ Server dependencies installed
echo.

:: Install client dependencies
echo  Installing client dependencies...
cd /d "%~dp0client"
set PATH=C:\Program Files\nodejs;%PATH%
call npm install --silent
echo  ✅ Client dependencies installed
echo.

:: Configure .env
cd /d "%~dp0server"
if not exist .env (
  echo  ----------------------------------------
  echo   Let's configure your API keys
  echo  ----------------------------------------
  echo.
  echo  You will need:
  echo  1. Google OAuth credentials (from https://console.cloud.google.com)
  echo  2. An Anthropic API key (from https://console.anthropic.com)
  echo.
  set /p GOOGLE_ID=  Enter your Google Client ID:
  set /p GOOGLE_SECRET=  Enter your Google Client Secret:
  set /p ANTHROPIC_KEY=  Enter your Anthropic API Key:
  echo.

  (
    echo GOOGLE_CLIENT_ID=!GOOGLE_ID!
    echo GOOGLE_CLIENT_SECRET=!GOOGLE_SECRET!
    echo GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback
    echo ANTHROPIC_API_KEY=!ANTHROPIC_KEY!
    echo SESSION_SECRET=taxmate-secret-%RANDOM%%RANDOM%
    echo PORT=3001
    echo CLIENT_URL=http://localhost:3000
  ) > .env

  echo  ✅ Configuration saved
  echo.
) else (
  echo  ✅ Configuration already exists
  echo.
)

:: Create desktop shortcut
echo  Creating desktop shortcut...
set SHORTCUT=%USERPROFILE%\Desktop\Start TaxMate.bat
(
  echo @echo off
  echo set PATH=C:\Program Files\nodejs;%%PATH%%
  echo echo Starting TaxMate server...
  echo "%%~dp0server\node_modules\.bin\pm2" resurrect 2^>nul ^|^| node "%~dp0server\index.js" ^&
  echo echo Starting TaxMate app...
  echo start "" /D "%~dp0client" cmd /c "set PATH=C:\Program Files\nodejs;%%PATH%% ^&^& npm start"
) > "%SHORTCUT%"
echo  ✅ Shortcut created on Desktop
echo.

echo  ========================================
echo   ✅ Setup complete!
echo  ========================================
echo.
echo  To start TaxMate, double-click
echo  "Start TaxMate" on your Desktop.
echo.
echo  Starting TaxMate now...
echo.
pause

:: Start the app
set PATH=C:\Program Files\nodejs;%PATH%
start "" /D "%~dp0client" cmd /c "set PATH=C:\Program Files\nodejs;%PATH% && npm start"
start "" /D "%~dp0server" cmd /c "set PATH=C:\Program Files\nodejs;%PATH% && node index.js"
