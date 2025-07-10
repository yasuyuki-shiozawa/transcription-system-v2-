@echo off
echo ===== ポート使用状況の確認 =====
echo.

echo [ポート3000の確認]
netstat -ano | findstr :3000
echo.

echo [ポート3001の確認]
netstat -ano | findstr :3001
echo.

echo [ポート3002の確認（開発サーバー）]
netstat -ano | findstr :3002
echo.

echo ===== Dockerコンテナの状態 =====
wsl -d Ubuntu -e bash -c "docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'"
echo.

echo ===== 解決方法 =====
echo もしポート3000が使用中の場合：
echo 1. 上記のPIDを確認
echo 2. タスクマネージャーでPIDを検索
echo 3. 不要なプロセスを終了
echo.
echo または、別のポートを使用することもできます。
echo.
pause