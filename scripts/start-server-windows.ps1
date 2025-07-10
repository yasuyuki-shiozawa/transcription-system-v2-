# PowerShell スクリプト - Windows PCをサーバーとして起動

Write-Host "議会議事録作成システム - サーバー起動スクリプト" -ForegroundColor Green

# WSL2が起動しているか確認
$wslStatus = wsl --list --running
if ($wslStatus -notcontains "Ubuntu") {
    Write-Host "WSL2 (Ubuntu) を起動中..." -ForegroundColor Yellow
    wsl -d Ubuntu -e echo "WSL2 started"
}

# IPアドレスの取得
$hostIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"}).IPAddress | Select-Object -First 1
Write-Host "ホストPCのIPアドレス: $hostIP" -ForegroundColor Cyan

# ファイアウォール設定（初回のみ）
$ruleName = "TranscriptionSystem"
$ruleExists = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if (-not $ruleExists) {
    Write-Host "Windowsファイアウォールルールを作成中..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort 3000,3001 -Action Allow
    Write-Host "ファイアウォールルールを作成しました" -ForegroundColor Green
}

# WSL2でDockerコンテナを起動
Write-Host "`nDockerコンテナを起動中..." -ForegroundColor Yellow
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/shioz/Downloads/transcription-system && docker-compose -f docker-compose.production.yml up -d"

# 起動確認
Start-Sleep -Seconds 10
$response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 200) {
    Write-Host "`n✅ サーバーが正常に起動しました！" -ForegroundColor Green
    Write-Host "`n社内ネットワークからのアクセス方法：" -ForegroundColor Cyan
    Write-Host "  URL: http://${hostIP}:3000" -ForegroundColor White
    Write-Host "  ※VPN接続している場合は、VPN経由でもアクセス可能です" -ForegroundColor Gray
} else {
    Write-Host "`n❌ サーバーの起動に失敗しました" -ForegroundColor Red
    Write-Host "ログを確認してください: docker-compose logs" -ForegroundColor Yellow
}

Write-Host "`nサーバーを停止するには、別のPowerShellで以下を実行:" -ForegroundColor Gray
Write-Host "  wsl -d Ubuntu -e bash -c 'cd /mnt/c/Users/shioz/Downloads/transcription-system && docker-compose down'" -ForegroundColor White