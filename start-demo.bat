@echo off
title BlockVote v3 - Starting Demo...
echo ===================================================
echo   BlockVote v3 - Blockchain E-Voting System
echo   React + Node.js + SQLite + JWT
echo ===================================================
echo.

echo [1/2] Starting Backend Server (Port 5000)...
start "BlockVote Backend (Port 5000)" cmd /k "cd /d %~dp0backend && if not exist node_modules npm install && npm start"

timeout /t 3 /nobreak >nul

echo [2/2] Starting React Frontend (Port 5173)...
start "BlockVote Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && if not exist node_modules npm install && npm run dev"

echo.
echo Both servers are launching in separate windows!
echo Open http://localhost:5173 in your browser once ready.
pause
