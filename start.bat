@echo off
echo ====================================
echo 議会議事録作成システムを起動中...
echo ====================================
echo.

REM バックエンドを起動
echo バックエンドサーバーを起動中...
start cmd /k "cd backend && npm run dev"

REM 少し待機
timeout /t 5 /nobreak >nul

REM フロントエンドを起動
echo フロントエンドサーバーを起動中...
start cmd /k "cd frontend && npm run dev"

echo.
echo ====================================
echo システムが起動しました！
echo ====================================
echo.
echo ブラウザで以下のURLを開いてください：
echo http://localhost:3000
echo.
echo 終了するには、開いているコマンドプロンプトを閉じてください
echo.
pause