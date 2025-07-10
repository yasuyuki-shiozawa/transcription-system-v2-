# サーバーステータス確認スクリプト

Write-Host "`n===== 議会議事録作成システム - ステータス確認 =====" -ForegroundColor Cyan

# WSL2の状態確認
Write-Host "`n[WSL2 状態]" -ForegroundColor Yellow
wsl --list --running

# Dockerコンテナの状態確認
Write-Host "`n[Docker コンテナ状態]" -ForegroundColor Yellow
wsl -d Ubuntu -e bash -c "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# ヘルスチェック
Write-Host "`n[ヘルスチェック]" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
    Write-Host "バックエンド: " -NoNewline
    Write-Host "正常" -ForegroundColor Green
    Write-Host "  - データベース: $($response.checks.database)"
    Write-Host "  - メモリ: $($response.checks.memory)"
    Write-Host "  - ディスク: $($response.checks.disk)"
} catch {
    Write-Host "バックエンド: " -NoNewline
    Write-Host "停止中" -ForegroundColor Red
}

# ネットワーク情報
Write-Host "`n[ネットワーク情報]" -ForegroundColor Yellow
$hostIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"}).IPAddress | Select-Object -First 1
Write-Host "ホストIP: $hostIP"
Write-Host "アクセスURL: http://${hostIP}:3000"

# リソース使用状況
Write-Host "`n[リソース使用状況]" -ForegroundColor Yellow
wsl -d Ubuntu -e bash -c "docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}'"

Write-Host "`n====================================" -ForegroundColor Cyan