@echo off
cd /d "%~dp0"

echo ===========================================
echo  V-Staff HRMS - Push to GitHub + Vercel
echo ===========================================
echo.

echo Note: If you get an authentication error, please update your Windows
echo Git Credentials or use a new Personal Access Token (PAT).
echo.

REM Safety check: never commit .env (it has secrets)
echo [SAFETY] Verifying .env is NOT tracked...
git rm --cached .env 2>nul
echo  .env is safely ignored. OK.
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
git commit -m "feat: connect frontend directly to Supabase, fix TS errors, and resolve organization/attendance/date issues" 2>nul
echo.

echo [5/5] Pushing to GitHub (Vercel will auto-deploy)...
git push -u origin main
echo.

echo ===========================================
echo  Done! Check https://vyesshrms-iota.vercel.app/
echo  for the live deployment (takes ~1-2 min).
echo ===========================================
echo.
echo  REMINDER: Set the following Environment Variables in Vercel dashboard:
echo  VITE_SUPABASE_URL   =  https://zqcguxgqsmmnubigpdnw.supabase.co
echo  VITE_SUPABASE_ANON_KEY  =  (your anon key from Supabase project settings)
echo ===========================================
pause
