@echo off
echo ====================================
echo 議会議事録作成システム セットアップ
echo ====================================
echo.

REM Node.jsの確認
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo エラー: Node.jsがインストールされていません
    echo https://nodejs.org/ からダウンロードしてください
    pause
    exit /b 1
)

echo Node.jsが検出されました
echo.

REM 依存関係のインストール
echo 1. バックエンドの依存関係をインストール中...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo バックエンドのインストールに失敗しました
    pause
    exit /b 1
)

REM データベースの初期化
echo 2. データベースを初期化中...
call npx prisma db push
if %errorlevel% neq 0 (
    echo データベースの初期化に失敗しました
    pause
    exit /b 1
)

cd ..

echo 3. フロントエンドの依存関係をインストール中...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo フロントエンドのインストールに失敗しました
    pause
    exit /b 1
)

cd ..

echo.
echo ====================================
echo インストールが完了しました！
echo ====================================
echo.
echo システムを起動するには start.bat を実行してください
echo.
pause