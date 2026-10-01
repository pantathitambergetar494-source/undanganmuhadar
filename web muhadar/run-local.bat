@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8080/?to=Nama%%20Tamu
  py -m http.server 8080
) else (
  start "" http://localhost:8080/?to=Nama%%20Tamu
  python -m http.server 8080
)
