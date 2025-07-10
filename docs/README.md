# 議会議事録作成支援システム ドキュメント

このディレクトリには、議会議事録作成支援システムの包括的なドキュメントが含まれています。

## 📚 ドキュメントカテゴリー

### 📘 [ユーザーガイド](./user-guide/)
エンドユーザー向けのドキュメントです。システムの使い方、よくある質問、トラブルシューティングなどが含まれます。

- [はじめに](./user-guide/getting-started.md) - 5分で始めるクイックスタート
- [インストール](./user-guide/installation.md) - 詳細なインストール手順
- [使い方ガイド](./user-guide/usage.md) - 各機能の詳しい使い方
- [機能説明](./user-guide/features.md) - システムの全機能解説
- [FAQ](./user-guide/faq.md) - よくある質問と回答
- [トラブルシューティング](./user-guide/troubleshooting.md) - 問題解決ガイド

### 📗 [開発者ガイド](./developer-guide/)
開発者向けの技術ドキュメントです。システムアーキテクチャ、開発環境のセットアップ、コーディング規約などが含まれます。

- [アーキテクチャ概要](./developer-guide/architecture.md) - システム設計と構成
- [開発環境セットアップ](./developer-guide/setup.md) - 開発環境の構築手順
- [APIリファレンス](./developer-guide/api-reference.md) - API全体の概要
- [データベース設計](./developer-guide/database-schema.md) - データモデルとスキーマ
- [コントリビューションガイド](./developer-guide/contributing.md) - 貢献方法
- [コーディング規約](./developer-guide/coding-standards.md) - コードスタイルガイド
- [テストガイド](./developer-guide/testing.md) - テストの書き方と実行方法

### 📙 [API仕様書](./api/)
RESTful APIの詳細な仕様書です。各エンドポイントのリクエスト/レスポンス形式が記載されています。

- [OpenAPI仕様](./api/openapi.yaml) - OpenAPI 3.0形式の仕様書
- [セッション管理API](./api/sessions.md) - セッションのCRUD操作
- [アップロードAPI](./api/uploads.md) - ファイルアップロード機能
- [セクション管理API](./api/sections.md) - セクションの操作
- [ダウンロードAPI](./api/downloads.md) - Wordファイルエクスポート
- [音声アップロードAPI仕様](./api-spec-audio-upload.md) - 音声ファイル処理の詳細

### 📕 [デプロイメントガイド](./deployment/)
本番環境へのデプロイ方法、インフラ設定、モニタリングなどの運用ドキュメントです。

- [Dockerデプロイ](./deployment/docker.md) - Docker環境での展開
- [Windows Serverガイド](./windows-server-guide.md) - Windows Server設定
- [本番環境設定](./deployment/production.md) - プロダクション環境構築
- [モニタリング](./deployment/monitoring.md) - 監視とログ管理

### 📓 [チームドキュメント](./team/)
開発チーム向けの内部ドキュメントです。

- [開発ワークフロー](./team/workflow.md) - チーム開発プロセス
- [設計決定記録](./team/decisions.md) - アーキテクチャ決定記録（ADR）
- [用語集](./team/glossary.md) - プロジェクト固有の用語定義

## 🔍 ドキュメントを探す

### 目的別ガイド

**「システムを使い始めたい」**
→ [はじめに](./user-guide/getting-started.md)を参照

**「開発に参加したい」**
→ [開発環境セットアップ](./developer-guide/setup.md)と[コントリビューションガイド](./developer-guide/contributing.md)を参照

**「APIを使いたい」**
→ [APIリファレンス](./developer-guide/api-reference.md)と[API仕様書](./api/)を参照

**「本番環境に展開したい」**
→ [デプロイメントガイド](./deployment/)を参照

**「トラブルを解決したい」**
→ [トラブルシューティング](./user-guide/troubleshooting.md)と[FAQ](./user-guide/faq.md)を参照

## 📝 ドキュメントの改善

ドキュメントの誤りや改善提案がある場合は、以下の方法でお知らせください：

1. GitHubで[Issue](https://github.com/yasuyuki-shiozawa/transcription-system/issues)を作成
2. 直接Pull Requestを送信
3. [コントリビューションガイド](./developer-guide/contributing.md)に従って貢献

## 🏷️ バージョン情報

- ドキュメントバージョン: 1.0.0
- システムバージョン: 3.0.0
- 最終更新日: 2025-06-26

---

[DOCS] ドキュメント体系を整備しました。- Thoth