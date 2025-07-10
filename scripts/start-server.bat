@echo off
echo 議会議事録作成システム - サーバー起動
echo.

REM 管理者権限チェック
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo エラー: このスクリプトは管理者権限で実行してください
    echo 右クリック → 「管理者として実行」を選択してください
    pause
    exit /b 1
)

REM PowerShellスクリプトを実行
powershell -ExecutionPolicy Bypass -File "%~dp0start-server-windows.ps1"

pause