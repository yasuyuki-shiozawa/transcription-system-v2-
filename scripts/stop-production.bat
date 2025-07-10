@echo off
chcp 65001 > nul
echo ============================================
echo 議会議事録作成システム - 本番環境停止
echo ============================================
echo.

REM WSL2でスクリプトを実行
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/shioz/Downloads/transcription-system && ./scripts/stop-production.sh"

pause