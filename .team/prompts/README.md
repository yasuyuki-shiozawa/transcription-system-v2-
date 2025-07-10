# チームプロンプトの使い方

## 新しいターミナルを立ち上げる手順

### 1. 新しいClaude Codeセッションを開始

### 2. 以下のプロンプトをコピー＆ペースト

#### 例：フロントエンド開発者の場合

```
私は議会議事録作成システムの開発チームに、フロントエンド開発者として参加します。

作業ディレクトリ: /mnt/c/Users/shioz/Downloads/transcription-system

最初に以下を実行してください：
1. cd /mnt/c/Users/shioz/Downloads/transcription-system
2. cat .team/prompts/MASTER_PROMPT.md を読んでチームシステムを理解
3. cat .team/prompts/frontend-developer.md を読んで自分の役割を理解
4. .team/scripts/register-terminal.sh terminal-2 frontend_developer を実行してチームに登録
5. cat CLAUDE.md を読んでシステムの現状を把握
6. cat .team/messages.json で最新のメッセージを確認

その後、タスクの確認と作業を開始してください。
```

### 3. 役割別の初期プロンプト

#### バックエンド開発者（terminal-3）
```
私は議会議事録作成システムの開発チームに、バックエンド開発者として参加します。
作業ディレクトリ: /mnt/c/Users/shioz/Downloads/transcription-system
terminal-3としてbackend_developerの役割で登録してください。
.team/prompts/backend-developer.md の指示に従って作業を開始してください。
```

#### DevOpsエンジニア（terminal-4）
```
私は議会議事録作成システムの開発チームに、DevOpsエンジニアとして参加します。
作業ディレクトリ: /mnt/c/Users/shioz/Downloads/transcription-system
terminal-4としてdevops_engineerの役割で登録してください。
.team/prompts/devops-engineer.md の指示に従って作業を開始してください。
```

#### QAテスター（terminal-5）
```
私は議会議事録作成システムの開発チームに、QAテスターとして参加します。
作業ディレクトリ: /mnt/c/Users/shioz/Downloads/transcription-system
terminal-5としてqa_testerの役割で登録してください。
.team/prompts/qa-tester.md の指示に従って作業を開始してください。
```

## 注意事項

1. **ターミナルIDは重複しないように**
   - 既に使用中のIDは`.team/terminals/`で確認

2. **作業開始前に必ず最新状態を確認**
   - メッセージ、タスク、他のターミナルの状態

3. **定期的なハートビート更新を忘れずに**
   - 自動化スクリプトの使用を推奨

4. **コミュニケーションを大切に**
   - 不明点は遠慮なくメッセージで質問