@echo off
echo ========================================
echo  SBOM Analyzer Frontend Startup
echo ========================================
echo.

echo Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please download and install Node.js 18+ from:
    echo https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
call npm install

echo.
echo Starting frontend dev server...
echo Frontend will be available at: http://localhost:5173
echo.

call npm run dev

pause

