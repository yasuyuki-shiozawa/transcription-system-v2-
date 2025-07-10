# Windows PCをサーバーとして使用する方法

## セットアップ手順

### 1. 前提条件の確認

- Windows 10/11 Pro以上（WSL2が必要）
- Docker Desktop for Windows または WSL2内のDocker
- メモリ 8GB以上推奨
- 管理者権限

### 2. ネットワーク設定

#### IPアドレスの固定化（推奨）

1. **ネットワーク設定を開く**
   - 設定 → ネットワークとインターネット → イーサネット（またはWi-Fi）
   - 「IP割り当て」の編集

2. **静的IPを設定**
   ```
   IPアドレス: 192.168.1.100（例）
   サブネットマスク: 255.255.255.0
   ゲートウェイ: 192.168.1.1（ルーターのIP）
   DNS: 192.168.1.1
   ```

### 3. サーバーの起動方法

#### 方法A: バッチファイルを使用（簡単）

1. エクスプローラーで `transcription-system/scripts/` を開く
2. `start-server.bat` を右クリック
3. 「管理者として実行」を選択

#### 方法B: 手動で起動

```powershell
# PowerShellを管理者として起動
cd C:\Users\shioz\Downloads\transcription-system

# WSL2で起動
wsl -d Ubuntu -e bash -c "docker-compose up -d"
```

### 4. アクセス方法

#### 同一PC上から
- http://localhost:3000

#### 社内の他のPCから
- http://[あなたのPCのIPアドレス]:3000
- 例: http://192.168.1.100:3000

### 5. 自動起動設定

#### Windowsタスクスケジューラを使用

1. タスクスケジューラを開く（`taskschd.msc`）
2. 「タスクの作成」をクリック
3. 以下を設定：
   - 名前: TranscriptionSystemServer
   - 「最上位の特権で実行する」にチェック
   - トリガー: システム起動時
   - 操作: プログラムの開始
     - プログラム: `C:\Users\shioz\Downloads\transcription-system\scripts\start-server.bat`

### 6. 運用上の注意点

#### パフォーマンス設定

WSL2のリソース制限を調整（`.wslconfig`）:

```ini
# C:\Users\shioz\.wslconfig
[wsl2]
memory=4GB
processors=2
swap=8GB
```

#### セキュリティ設定

1. **Windows Defenderの除外設定**
   - 設定 → Windowsセキュリティ → ウイルスと脅威の防止
   - 除外の追加: `C:\Users\shioz\Downloads\transcription-system`

2. **アクセス制限**
   - 社内ネットワークからのみアクセス可能にする
   - VPN経由のアクセスのみ許可

### 7. トラブルシューティング

#### WSL2が起動しない
```powershell
# WSL2をリセット
wsl --shutdown
wsl -d Ubuntu
```

#### Dockerが起動しない
```bash
# WSL2内で
sudo service docker restart
```

#### ポートが使用中
```powershell
# 使用中のポートを確認
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# プロセスを終了
taskkill /PID [プロセスID] /F
```

### 8. 監視とメンテナンス

#### リソース使用状況の確認
```powershell
# WSL2のリソース使用状況
wsl -d Ubuntu -e bash -c "docker stats"
```

#### ログの確認
```powershell
# アプリケーションログ
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/shioz/Downloads/transcription-system && docker-compose logs -f"
```

#### 定期メンテナンス

週次で実施:
- [ ] Dockerイメージの更新
- [ ] ログファイルの確認
- [ ] ディスク容量の確認
- [ ] Windows Update後の動作確認

### 9. バックアップ

#### 自動バックアップスクリプト

`scripts/backup-windows.ps1`:
```powershell
$backupDir = "D:\Backups\transcription-system"
$date = Get-Date -Format "yyyyMMdd_HHmmss"

# データベースバックアップ
wsl -d Ubuntu -e bash -c "docker-compose exec -T postgres pg_dump -U postgres transcription_db" > "$backupDir\db_$date.sql"

# アップロードファイルのバックアップ
Copy-Item -Path ".\backend\uploads" -Destination "$backupDir\uploads_$date" -Recurse
```

### 10. 本番環境への移行

テスト運用が成功したら：

1. 社内Linuxサーバーへの移行計画を立てる
2. データのエクスポート/インポート手順を確認
3. ユーザートレーニングを実施
4. 段階的な移行を実施