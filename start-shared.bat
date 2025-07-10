@echo off
echo 共有用サーバーを起動します...
echo.

REM WSLでDockerコンテナを起動
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/shioz/Downloads/transcription-system; docker-compose -f docker-compose.shared.yml up -d"

echo.
echo 起動処理が完了しました。
echo.
echo アクセスURL:
echo   社内の他のPC: http://192.168.11.8:3000
echo   ステータス確認: http://192.168.11.8:3000/status.html
echo.
pause