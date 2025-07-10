@echo off
echo Dockerを修復します...
echo.

REM Dockerサービスを再起動
wsl -d Ubuntu -e bash -c "sudo service docker restart"

echo.
echo Dockerを再起動しました。
echo 10秒後に状態を確認します...
timeout /t 10

echo.
echo Dockerの状態:
wsl -d Ubuntu -e bash -c "docker ps"

echo.
pause