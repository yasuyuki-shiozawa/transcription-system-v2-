@echo off
chcp 65001 > nul
echo ============================================
echo 議会議事録作成システム - 本番環境起動
echo ============================================
echo.

REM 管理者権限の確認
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo エラー: このスクリプトは管理者権限で実行する必要があります
    echo 右クリックして「管理者として実行」を選択してください
    pause
    exit /b 1
)

REM WSL2でスクリプトを実行
echo WSL2で本番環境を起動中...
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/shioz/Downloads/transcription-system && ./scripts/start-production.sh"

pause