@echo off
echo ポート8080で共有サーバーを起動します...
echo （ポート3000が使用中の場合の代替）
echo.

REM WSLでDockerコンテナを起動
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/shioz/Downloads/transcription-system; docker-compose -f docker-compose.port8080.yml up -d"

echo.
echo 起動処理が完了しました。
echo.
echo アクセスURL（ポート8080版）:
echo   自分のPC: http://localhost:8080
echo   社内の他のPC: http://192.168.11.8:8080
echo.
pause