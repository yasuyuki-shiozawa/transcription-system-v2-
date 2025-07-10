@echo off
echo Dockerの状態を確認します...
echo.

REM Dockerが起動しているか確認
wsl -d Ubuntu -e bash -c "docker ps"

echo.
echo 上記にコンテナ一覧が表示されていればDockerは正常です。
echo エラーが表示された場合は、以下を実行してください：
echo.
echo   wsl -d Ubuntu
echo   sudo service docker start
echo.
pause