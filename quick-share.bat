@echo off
echo ====================================
echo システムを外部公開する設定
echo ====================================
echo.

echo 1. ngrokをダウンロード中...
echo https://ngrok.com/download を開きます
start https://ngrok.com/download
echo.
echo ダウンロードが完了したら、Enterキーを押してください
pause

echo.
echo 2. ngrokを起動します
echo 以下のコマンドをngrokのウィンドウで実行してください：
echo.
echo ngrok http 3003
echo.
echo 表示されたURL（https://xxxxx.ngrok.io）を共有してください
echo.
pause