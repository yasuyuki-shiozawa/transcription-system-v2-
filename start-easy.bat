@echo off
echo 簡単起動モード（エラーを無視して起動）
echo.
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/shioz/Downloads/transcription-system && sudo docker-compose -f docker-compose.dev.yml up -d"
echo.
echo 起動中... 1-2分お待ちください
timeout /t 60
echo.
echo アクセスURL:
echo   http://localhost:3000
echo   http://192.168.11.8:3000
echo.
pause