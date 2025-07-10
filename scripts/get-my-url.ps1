# あなたのPCのアクセスURLを表示するスクリプト

Write-Host "`n===== あなたのPCのアクセス情報 =====" -ForegroundColor Cyan

# IPアドレスを取得（複数ある場合は全て表示）
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"} |
    Select-Object -ExpandProperty IPAddress

Write-Host "`n見つかったIPアドレス:" -ForegroundColor Yellow

$urls = @()
foreach ($ip in $ipAddresses) {
    Write-Host "  $ip" -ForegroundColor White
    $urls += @{
        IP = $ip
        AppURL = "http://${ip}:3000"
        StatusURL = "http://${ip}:3000/status.html"
    }
}

Write-Host "`n📋 アクセスURL一覧:" -ForegroundColor Green
Write-Host "（これらのURLを同僚に共有してください）" -ForegroundColor Gray

foreach ($url in $urls) {
    Write-Host "`nIPアドレス: $($url.IP)" -ForegroundColor Cyan
    Write-Host "  メインアプリ: " -NoNewline
    Write-Host $url.AppURL -ForegroundColor Yellow
    Write-Host "  ステータス確認: " -NoNewline
    Write-Host $url.StatusURL -ForegroundColor Yellow
}

# 最も可能性の高いIPを推測
$primaryIP = $ipAddresses | Where-Object {$_ -like "192.168.*" -or $_ -like "10.*"} | Select-Object -First 1
if ($primaryIP) {
    Write-Host "`n✨ おそらくこれが社内ネットワークのURL:" -ForegroundColor Magenta
    Write-Host "   http://${primaryIP}:3000" -ForegroundColor White -BackgroundColor DarkGreen
    
    # クリップボードにコピー
    "http://${primaryIP}:3000" | Set-Clipboard
    Write-Host "`n（↑このURLをクリップボードにコピーしました）" -ForegroundColor Gray
}

Write-Host "`n💡 ヒント:" -ForegroundColor Yellow
Write-Host "  - 有線LAN接続の場合: 通常は192.168.で始まるIP" -ForegroundColor Gray
Write-Host "  - VPN接続の場合: 10.で始まるIPの可能性" -ForegroundColor Gray
Write-Host "  - Wi-Fi接続の場合: 192.168.で始まるIP" -ForegroundColor Gray

Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host "Enterキーを押して終了..."
Read-Host