# Windows サービスとして登録するスクリプト
# 管理者権限で実行必要

# NSSMのダウンロード（サービス管理ツール）
$nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
$nssmPath = "$env:TEMP\nssm.zip"

Write-Host "NSSMをダウンロード中..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmPath

# 解凍
Expand-Archive -Path $nssmPath -DestinationPath "$env:TEMP\nssm" -Force
$nssm = "$env:TEMP\nssm\nssm-2.24\win64\nssm.exe"

# サービスとして登録
$serviceName = "TranscriptionSystem"
$scriptPath = "C:\Users\shioz\Downloads\transcription-system\scripts\start-server.bat"

Write-Host "サービスを登録中..." -ForegroundColor Yellow
& $nssm install $serviceName $scriptPath

# サービスの設定
& $nssm set $serviceName DisplayName "議会議事録作成システム"
& $nssm set $serviceName Description "議会議事録作成システムのWebサーバー"
& $nssm set $serviceName Start SERVICE_AUTO_START
& $nssm set $serviceName AppStdout "C:\Users\shioz\Downloads\transcription-system\logs\service.log"
& $nssm set $serviceName AppStderr "C:\Users\shioz\Downloads\transcription-system\logs\service-error.log"

Write-Host "サービスを開始中..." -ForegroundColor Yellow
Start-Service $serviceName

Write-Host "`n✅ サービスとして登録完了！" -ForegroundColor Green
Write-Host "`nサービスの管理:" -ForegroundColor Cyan
Write-Host "  停止: Stop-Service $serviceName" -ForegroundColor White
Write-Host "  開始: Start-Service $serviceName" -ForegroundColor White
Write-Host "  状態確認: Get-Service $serviceName" -ForegroundColor White
Write-Host "`nWindowsサービス管理画面（services.msc）でも管理できます" -ForegroundColor Gray