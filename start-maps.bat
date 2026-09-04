@echo off
setlocal
cd /d "%~dp0"

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

:installfail
echo.
echo [ERROR] Package installation failed. Please screenshot the red text above and ask for help.
pause
exit /b 1
