@echo off
echo ========================================
echo  SBOM Analyzer Backend Startup
echo ========================================
echo.

cd backend\SbomAnalyzer.Api

echo Checking .NET SDK...
dotnet --version
if %errorlevel% neq 0 (
    echo ERROR: .NET SDK not found!
    echo Please download and install .NET 8.0 SDK from:
    echo https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo.
echo Restoring dependencies...
dotnet restore

echo.
echo Starting backend server...
echo Backend will be available at: http://localhost:5000
echo Swagger UI: http://localhost:5000/swagger
echo.

dotnet run

pause

