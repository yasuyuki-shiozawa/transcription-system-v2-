@echo off
echo ポート3000を確認中...
netstat -ano | findstr :3000
if errorlevel 1 (
    echo ポート3000は使用されていません
) else (
    echo ポート3000は使用中です
)
echo.
echo Enterキーを押して終了...
pause >nul