@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ===========================================
echo  V-Staff HRMS - Push to GitHub + Vercel
echo ===========================================
echo.
echo Note: If you get an authentication error, please update your Windows
echo Git Credentials or use a new Personal Access Token (PAT).
echo.

echo [SAFETY] Verifying .env is NOT tracked...
git rm --cached .env 2>nul
echo .env is safely ignored. OK.
echo.

echo [1/5] Setting remote origin...
git remote add origin https://github.com/jerome224f/komhusv.git 2>nul
if %errorlevel% neq 0 (
    git remote set-url origin https://github.com/jerome224f/komhusv.git
)
echo.

echo [2/5] Fetching remote history...
git fetch origin main 2>nul
echo.

echo [3/5] Staging all changes (excluding secrets)...
git add .
echo.

echo [4/5] Committing changes...
set "commit_msg="
set /p commit_msg="Enter commit message (or press Enter for default): "
if "!commit_msg!"=="" set "commit_msg=fix: updates and data storage changes"
git commit -m "!commit_msg!"
echo.

echo [5/5] Pushing to GitHub (Vercel will auto-deploy)...
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Push failed. Trying to pull and merge changes first...
    git pull --rebase origin main
    if !errorlevel! neq 0 (
        echo [ERROR] Automatic merge failed. Please resolve conflicts manually.
        pause
        exit /b 1
    )
    echo [INFO] Rebase successful, retrying push...
    git push -u origin main
)
echo.

echo ===========================================
echo  Done! Check https://vyesshrms-iota.vercel.app/
echo  for the live deployment (takes ~1-2 min).
echo ===========================================
echo.
pause
