# シンプルなステータス確認ページを作成

$statusHtml = @"
<!DOCTYPE html>
<html>
<head>
    <title>システムステータス</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; margin: 20px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .ok { background: #4CAF50; color: white; }
        .error { background: #f44336; color: white; }
    </style>
</head>
<body>
    <h1>議会議事録システム</h1>
    <div id="status" class="status">確認中...</div>
    <script>
        fetch('/health')
            .then(r => r.json())
            .then(data => {
                document.getElementById('status').className = 'status ok';
                document.getElementById('status').innerHTML = 
                    '<h2>✅ システム稼働中</h2>' +
                    '<p>データベース: ' + data.checks.database + '</p>' +
                    '<p>最終確認: ' + new Date().toLocaleString() + '</p>';
            })
            .catch(e => {
                document.getElementById('status').className = 'status error';
                document.getElementById('status').innerHTML = '❌ システム停止中';
            });
        setInterval(() => location.reload(), 60000); // 1分ごとに更新
    </script>
</body>
</html>
"@

# ステータスページを保存
$statusHtml | Out-File -FilePath "C:\Users\shioz\Downloads\transcription-system\frontend\public\status.html" -Encoding UTF8

Write-Host "ステータスページを作成しました" -ForegroundColor Green
Write-Host "アクセスURL: http://[PCのIP]:3000/status.html" -ForegroundColor Cyan