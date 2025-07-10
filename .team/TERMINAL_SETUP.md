# ターミナル識別方法

## VSCodeでのターミナル名設定

### 方法1: 手動で名前を変更（推奨）
1. ターミナルタブを右クリック
2. 「名前の変更」を選択
3. 役割に応じた名前を入力（例：Atlas, Iris, Hermes）

### 方法2: コマンドパレット
1. `Ctrl+Shift+P`（Windows）または `Cmd+Shift+P`（Mac）
2. 「Terminal: Rename」と入力
3. 新しい名前を入力

### 方法3: プロンプトで識別
ターミナル内で以下を実行：
```bash
# 一時的な設定
export PS1="[名前] \w $ "

# 例：Atlas の場合
export PS1="[Atlas] \w $ "
```

## チームメンバーの推奨名

| 役割 | 推奨名 | プロンプト設定 |
|------|--------|---------------|
| Coordinator | Atlas | `export PS1="[Atlas] \w $ "` |
| Frontend | Iris | `export PS1="[Iris] \w $ "` |
| Backend | Hephaestus | `export PS1="[Hephaestus] \w $ "` |
| DevOps | Hermes | `export PS1="[Hermes] \w $ "` |
| QA | Athena | `export PS1="[Athena] \w $ "` |

## 永続化する場合
~/.bashrc に以下を追加：
```bash
# チーム開発用設定
if [ -f /mnt/c/Users/shioz/Downloads/transcription-system/.team/terminals/terminal-*.json ]; then
    export PS1="[YourName] \w $ "
fi
```