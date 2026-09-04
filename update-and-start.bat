@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  MAPS server - checking for updates...
echo ============================================

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 goto :notgit

git pull origin main
if errorlevel 1 goto :pullfail

echo.
echo ============================================
echo  MAPS server - starting setup...
echo ============================================

call npm config set strict-ssl false >nul 2>&1

echo Checking/installing packages (this can take a few minutes)...
call npm install
if errorlevel 1 goto :installfail

if exist .env goto :run

echo ADMIN_PASSWORD=maps1234> .env
echo PORT=8081>> .env
echo.
echo ================================================================
echo  First run: admin password was set to the default "maps1234".
echo  Please log in and change it, or close this window and edit the
echo  .env file in this folder with your own password, then run this
echo  file again.
echo ================================================================
echo.
pause

:run
echo.
echo Starting MAPS server. Closing this window stops the server.
echo.
call npm start
pause
goto :eof

:notgit
echo.
echo [ERROR] This folder is not a git repository, so it can't auto-update.
echo Download the ZIP from GitHub again, or re-clone with "git clone", then
echo run this file from inside that folder.
echo.
pause
exit /b 1

:pullfail
echo.
echo [ERROR] "git pull" failed - see the message above. This usually means
echo there are local changes in this folder that conflict with the update,
echo or there is no internet connection. Screenshot the red text above and
echo ask for help if you're not sure what to do.
echo.
pause
exit /b 1

:installfail
echo.
echo [ERROR] Package installation failed. Please screenshot the red text above and ask for help.
pause
exit /b 1
