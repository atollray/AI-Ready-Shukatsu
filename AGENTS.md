# AI Agent Guidelines for AI-Ready Shukatsu

このリポジトリは、就職活動における企業情報・選考状況・タスク・ノートをセキュアに一元管理するアプリケーションです。
AI エージェント（Antigravity, Claude Code, Codex等）は以下のルールに厳密に従ってください。

---

## 1. データ操作の鉄則: 必ず CLI を使用すること

- **`data/store/` 配下の JSON ファイルを直接編集・新規作成・削除してはいけません。**
- **すべてのデータ読み書きは `pnpm sk <command>` CLI を経由して実行してください。**
- `data/views/` 配下の Markdown や ICS ファイルは CLI が自動生成する読み取り専用ビューです。直接編集しないでください。

### なぜ CLI を使うのか？
- 排他ファイルロック（`.lock`）による破損防止
- 楽観的ロック（`rev`）によるUI編集との競合防止
- 一時ファイル書き出し＋`rename` によるアトミック（原子的）保存
- ID採番（`co_...`, `tk_...`, `nt_...`）とスキーマ自動バリデーション
- `data/views/`（コンテキスト・カレンダー・Markdown等）の自動再生成

---

## 2. CLI の基本コマンド一覧

| コマンド | 説明 |
|---|---|
| `pnpm sk context` | プロフィール、ステージ別件数、トップ企業、直近タスク・期日をJSONで取得（作業開始時に必ず呼ぶ） |
| `pnpm sk company list` | 登録企業一覧を取得 |
| `pnpm sk company find <keyword>` | 企業名・タグで検索（重複チェック用） |
| `pnpm sk company get <id>` | 企業の詳細情報・ES・イベント・面接記録を取得 |
| `pnpm sk company add --input <file.json>` | 企業を新規登録 |
| `pnpm sk company update <id> --input <file.json>` | 企業情報を更新 |
| `pnpm sk company stage <id> <stage> [--track <track>]` | 選考ステージを進める（履歴を自動追記） |
| `pnpm sk task add --title <title> [--company <id>] [--due <YYYY-MM-DD>]` | タスクを追加 |
| `pnpm sk task done <id>` | タスクを完了にする |
| `pnpm sk es add --company <id> --title <title> --input <file.json>` | ES設問・下書きを追加 |
| `pnpm sk event add --company <id> --title <title> --kind <kind> --start <date>` | 面接・締切等の予定を追加 |
| `pnpm sk note add --title <title> --content <text> [--company <id>]` | 振り返りメモ・ログを記録 |
| `pnpm sk schema [entity]` | エンティティのフィールド定義を出力 |
| `pnpm sk doctor` | データ整合性チェック |

---

## 3. Windows / PowerShell における入力のベストプラクティス

Windows（特に PowerShell）では、コマンドライン引数に日本語を含む複雑な JSON 文字列を直接渡したり、パイプで stdin に渡すと文字化けやクォート破壊が発生することがあります。

**長文テキストや複数フィールドを含む登録・更新を行う場合は、必ず一時 JSON ファイルを作成して `--input` で渡してください。**

例：
```bash
# 1. 一時ファイル tmp_company.json を UTF-8 で作成
# 2. コマンド実行
pnpm sk company add --input tmp_company.json
# 3. 一時ファイルを削除
```

---

## 4. 就活支援タスクの標準手順

1. **コンテキスト取得**: タスク開始前に `pnpm sk context` を実行し、志望職種・業界・強み・現在の選考状況を把握する。
2. **重複防止**: 企業追加前に必ず `pnpm sk company find <企業名>` で同一企業が登録済みでないか確認する。
3. **タスクの自動作成**: 企業を追加した際は、次のアクション（情報収集・説明会予約・ES作成など）のタスクを最低1件、最大3件まで自動登録する。
4. **誠実な情報提供**: 企業の採用URLや条件面で確証が持てない情報は、その旨を明記してユーザーに確認を促す。
