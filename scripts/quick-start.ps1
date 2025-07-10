# クイックスタートスクリプト
Write-Host "議会議事録システムを起動します..." -ForegroundColor Green

# WSL2でDockerを起動
Write-Host "`n1. Dockerサービスを開始中..." -ForegroundColor Yellow
wsl -d Ubuntu -e bash -c "sudo service docker start"
Start-Sleep -Seconds 3

# プロジェクトディレクトリに移動してコンテナ起動
Write-Host "`n2. コンテナを起動中..." -ForegroundColor Yellow
$projectPath = "/mnt/c/Users/shioz/Downloads/transcription-system"
wsl -d Ubuntu -e bash -c "cd $projectPath && docker-compose up -d"

# 起動確認
Write-Host "`n3. 起動確認中..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    Write-Host "`n✅ サーバーが正常に起動しました！" -ForegroundColor Green
    Write-Host "`nアクセスURL:" -ForegroundColor Cyan
    Write-Host "  自分のPC: http://localhost:3000" -ForegroundColor White
    Write-Host "  他のPC: http://192.168.11.8:3000" -ForegroundColor White
} catch {
    Write-Host "`n❌ サーバーの起動に失敗しました" -ForegroundColor Red
    Write-Host "`nログを確認:" -ForegroundColor Yellow
    wsl -d Ubuntu -e bash -c "cd $projectPath && docker-compose logs --tail=20"
}

Write-Host "`nEnterキーを押して終了..."
Read-Host