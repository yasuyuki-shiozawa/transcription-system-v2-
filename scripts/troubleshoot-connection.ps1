# 接続問題のトラブルシューティングスクリプト

Write-Host "`n===== 接続問題の診断 =====" -ForegroundColor Cyan

# 1. WSL2とDockerの状態確認
Write-Host "`n1. WSL2の状態確認..." -ForegroundColor Yellow
$wslRunning = wsl --list --running
if ($wslRunning -notcontains "Ubuntu") {
    Write-Host "  ❌ WSL2 (Ubuntu) が起動していません" -ForegroundColor Red
    Write-Host "  → 解決方法: wsl -d Ubuntu を実行" -ForegroundColor Gray
} else {
    Write-Host "  ✅ WSL2は起動中" -ForegroundColor Green
}

# 2. Dockerコンテナの状態確認
Write-Host "`n2. Dockerコンテナの状態確認..." -ForegroundColor Yellow
$containers = wsl -d Ubuntu -e bash -c "docker ps --format '{{.Names}}:{{.Status}}' 2>/dev/null"
if ($containers) {
    Write-Host "  起動中のコンテナ:" -ForegroundColor Green
    $containers -split "`n" | ForEach-Object { Write-Host "    $_" }
} else {
    Write-Host "  ❌ Dockerコンテナが起動していません" -ForegroundColor Red
    Write-Host "  → 解決方法: サーバー起動スクリプトを実行" -ForegroundColor Gray
}

# 3. ポートの確認
Write-Host "`n3. ポートの使用状況確認..." -ForegroundColor Yellow
$port3000 = netstat -an | Select-String ":3000"
$port3001 = netstat -an | Select-String ":3001"

if ($port3000) {
    Write-Host "  ✅ ポート3000は使用中（正常）" -ForegroundColor Green
} else {
    Write-Host "  ❌ ポート3000が使用されていません" -ForegroundColor Red
}

if ($port3001) {
    Write-Host "  ✅ ポート3001は使用中（正常）" -ForegroundColor Green
} else {
    Write-Host "  ❌ ポート3001が使用されていません" -ForegroundColor Red
}

# 4. Windowsファイアウォールの確認
Write-Host "`n4. Windowsファイアウォールの確認..." -ForegroundColor Yellow
$fwRule = Get-NetFirewallRule -DisplayName "TranscriptionSystem" -ErrorAction SilentlyContinue
if ($fwRule) {
    Write-Host "  ✅ ファイアウォールルールは設定済み" -ForegroundColor Green
} else {
    Write-Host "  ❌ ファイアウォールルールが未設定" -ForegroundColor Red
    Write-Host "  → 解決方法: 管理者権限でファイアウォール設定を追加" -ForegroundColor Gray
}

# 5. 解決策の提示
Write-Host "`n===== 推奨される解決手順 =====" -ForegroundColor Magenta

Write-Host "`n手順1: サーバーを起動する" -ForegroundColor Yellow
Write-Host @"
  cd C:\Users\shioz\Downloads\transcription-system
  .\scripts\start-server.bat (管理者として実行)
"@ -ForegroundColor White

Write-Host "`n手順2: ファイアウォールルールを追加（管理者権限で実行）" -ForegroundColor Yellow
Write-Host @"
  New-NetFirewallRule -DisplayName "TranscriptionSystem" `
    -Direction Inbound -Protocol TCP -LocalPort 3000,3001 -Action Allow
"@ -ForegroundColor White

Write-Host "`n手順3: Windows Defenderの設定" -ForegroundColor Yellow
Write-Host @"
  1. Windows セキュリティを開く
  2. ファイアウォールとネットワーク保護
  3. 詳細設定
  4. 受信規則で3000番と3001番ポートを許可
"@ -ForegroundColor White

Write-Host "`n====================================" -ForegroundColor Cyan