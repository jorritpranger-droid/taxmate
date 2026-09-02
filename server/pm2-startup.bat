@echo off
rem Runs at Windows logon (via the "TaxMate PM2 Startup" scheduled task) to bring back
rem any PM2-managed processes (e.g. taxmate-server) that were running when `pm2 save`
rem was last called. Uses the project-local pm2 (node_modules\.bin) rather than the
rem global one in AppData\Roaming\npm, which scheduled tasks on this machine can't reach
rem (endpoint security blocks scheduled-task access to AppData\Roaming here).
set "LOG=C:\Users\jpran\OneDrive\Desktop\taxmate\server\pm2-startup.log"
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "C:\Users\jpran\OneDrive\Desktop\taxmate\server"
echo [%DATE% %TIME%] Task fired >> "%LOG%"
call ".\node_modules\.bin\pm2.cmd" resurrect >> "%LOG%" 2>&1
echo [%DATE% %TIME%] resurrect exit code %ERRORLEVEL% >> "%LOG%"
