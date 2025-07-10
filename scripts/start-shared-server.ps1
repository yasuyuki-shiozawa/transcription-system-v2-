# 共有用サーバー起動スクリプト

Write-Host "`n===== 共有用サーバー起動 =====" -ForegroundColor Cyan
Write-Host "ポート3000で他の職員がアクセスできるサーバーを起動します" -ForegroundColor Gray

# 現在のコンテナ状態を確認
Write-Host "`n現在起動中のコンテナ:" -ForegroundColor Yellow
wsl -d Ubuntu -e bash -c "docker ps --format 'table {{.Names}}\t{{.Ports}}'"

# 共有用サーバーを起動
Write-Host "`n共有用サーバーを起動中..." -ForegroundColor Yellow
$projectPath = "/mnt/c/Users/shioz/Downloads/transcription-system"
wsl -d Ubuntu -e bash -c "cd $projectPath; docker-compose -f docker-compose.shared.yml up -d"

# 起動待機
Write-Host "`n起動確認中（15秒待機）..." -ForegroundColor Gray
Start-Sleep -Seconds 15

# ヘルスチェック
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    Write-Host "`n✅ 共有用サーバーが起動しました！" -ForegroundColor Green
    
    Write-Host "`n【アクセス情報】" -ForegroundColor Cyan
    Write-Host "社内の他のPCから: " -NoNewline
    Write-Host "http://192.168.11.8:3000" -ForegroundColor Yellow -BackgroundColor DarkGreen
    Write-Host "ステータス確認: http://192.168.11.8:3000/status.html" -ForegroundColor White
    
    Write-Host "`n【現在の環境】" -ForegroundColor Cyan
    Write-Host "開発用（あなた専用）: http://localhost:3002" -ForegroundColor Gray
    Write-Host "共有用（他の職員用）: http://192.168.11.8:3000" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ 起動に失敗しました" -ForegroundColor Red
    Write-Host "ログを確認:" -ForegroundColor Yellow
    wsl -d Ubuntu -e bash -c "cd $projectPath; docker-compose -f docker-compose.shared.yml logs --tail=30"
}

Write-Host "`nEnterキーを押して終了..."
Read-Host