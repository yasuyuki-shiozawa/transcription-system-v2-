# ポート使用状況確認スクリプト

Write-Host "`nポート使用状況を確認中..." -ForegroundColor Yellow

# ポート3000の確認
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "`nポート3000は使用中:" -ForegroundColor Red
    $process = Get-Process -Id $port3000.OwningProcess
    Write-Host "  プロセス: $($process.Name) (PID: $($process.Id))" -ForegroundColor Gray
    
    $answer = Read-Host "`nこのプロセスを終了しますか？ (y/n)"
    if ($answer -eq 'y') {
        Stop-Process -Id $process.Id -Force
        Write-Host "プロセスを終了しました" -ForegroundColor Green
    }
} else {
    Write-Host "✅ ポート3000は利用可能" -ForegroundColor Green
}

# ポート3001の確認
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "`nポート3001は使用中:" -ForegroundColor Yellow
    $process = Get-Process -Id $port3001.OwningProcess
    Write-Host "  プロセス: $($process.Name)" -ForegroundColor Gray
} else {
    Write-Host "✅ ポート3001は利用可能" -ForegroundColor Green
}

# ポート3002の確認
$port3002 = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($port3002) {
    Write-Host "`nポート3002は使用中（開発サーバー）:" -ForegroundColor Cyan
    Write-Host "  これは正常です" -ForegroundColor Gray
}