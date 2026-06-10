@echo off
cd /d "%~dp0"

echo ===========================================
echo  V-Staff HRMS - Push to GitHub + Vercel
echo ===========================================
echo.

echo [1/6] Setting remote origin...
git remote add origin https://github.com/jerome224f/komhusv.git 2>nul
if %errorlevel% neq 0 (
    echo [Info] Remote origin already exists. Updating URL...
    git remote set-url origin https://github.com/jerome224f/komhusv.git
)
echo.

echo [2/6] Setting branch to main...
git branch -M main
echo.

echo [3/6] Staging all changed files...
git add .
echo.

echo [4/6] Committing changes...
git commit -m "fix: fallback mock db, database seeder, migration preserve IDs, attendance All Orgs fix"
echo.

echo [5/6] Pulling remote changes to sync...
git pull origin main --rebase
echo.

echo [6/6] Pushing to GitHub (Vercel will auto-deploy)...
git push -u origin main
echo.

echo ===========================================
echo  Done! Check https://vyesshrms-iota.vercel.app/
echo  for the live deployment (takes ~1-2 min).
echo ===========================================
pause
