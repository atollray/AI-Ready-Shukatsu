# AI-Ready Shukatsu（就活管理アプリケーション v2）

新卒就活をローカル環境で一元管理するためのデスクトップ/Web アプリケーションです。  
クラウドの就活 SaaS に個人情報を預けず、**自分自身と AI エージェント（Antigravity, Claude Code, Codex 等）だけがアクセスできる「プライベートな就活データベース」**として機能します。

---

## ✨ 主な特徴 (v2)

- 🔒 **完全ローカル & セキュア**: 全データはローカルに保存。API サーバーは `127.0.0.1` のみでリッスンし、大学やカフェの Wi-Fi（LAN）経由での盗聴・改ざんを完全遮断。
- 🤖 **CLI ファースト（アプリ起動不要）**: AI エージェントはシェルから `pnpm sk`（または `shukatsu`）コマンドで安全にデータを読み書き。**Web アプリを起動していなくても、情報の追加・更新・整合性チェック・Markdown/ICSの再生成まで 100% 動作**します。
- ⚡ **堅牢なデータ保護**:
  - 排他ファイルロック（`.lock`）による競合・破損防止
  - 一時ファイル書き出し → `rename` による原子的（アトミック）保存
  - エンティティ単位の楽観ロック（`rev`）による衝突検知
  - 1エンティティ1ファイル保存（Git 差分がクリーン）
- 🎨 **エンジニア向け GitHub ライク UI**:
  - Light / Dark テーマ切替対応（GitHub Primer 風トークン設計 + Lucide Icons）
  - `⌘K` / `Ctrl+K` コマンドパレットによる企業・画面の高速ナビゲーション
  - Markdown エディタの Write / Preview 切替、ES 文字数カウンター・進捗バー、担当者連絡先・関連リンク管理
- 🔄 **手動保存・再読込の廃止（自動同期）**:
  - Web UI は入力 800ms 後に自動保存
  - AI がファイルを更新すると、Server-Sent Events (SSE) 経由でブラウザ画面に 1 秒以内で即座に反映
- 📅 **予定と面接の一体管理**: 面接日程と面接記録（質問・所感・結果）を 1 つのエンティティに統合。時刻付きの予定は `calendar.ics` 経由でカレンダーアプリにも正確に反映。
- 🧪 **サンプルデータ管理**: 初回はリアルなサンプルデータ付きで起動。不要になったらいつでもワンクリック（または `pnpm sk sample clear`）で一括削除可能。

---

## 🛠️ 技術スタック

| レイヤー | 技術 |
|---|---|
| コア・スキーマ | TypeScript, **Zod v3.24** |
| CLI | **citty**, **tsup** |
| サーバー | **Hono** (`@hono/node-server`, `@hono/zod-validator`), **chokidar** (SSE) |
| フロントエンド | **Vite**, **React 19**, **TanStack Query v5**, **React Router v7**, **Lucide React** |
| テスト | **Vitest** (Unit / CLI / API), **Playwright** (E2E) |
| 整形 / Linter | **Biome** |

---

## 🚀 クイックスタート

### 1. 動作環境
- **Node.js** v20 以上
- **pnpm** v9 以上

### 2. インストール
```bash
# 依存パッケージのインストール（自動で Node/CLI バンドルもビルドされます）
pnpm install
```

### 3. 初期化（初回のみ）
```bash
# サンプルデータ入りで初期化
pnpm sk init

# ※ 空のデータから開始したい場合:
# pnpm sk init --empty
```

### 4. アプリの起動
用途に合わせて以下のいずれかで起動できます：

```bash
# 開発モード（Vite と Hono サーバを同時起動、HMR有効）
pnpm dev

# または 本番ビルド後に UI をブラウザで直接開く
pnpm build
pnpm sk ui
```

ブラウザで `http://127.0.0.1:5173`（開発時）または `http://127.0.0.1:4319` が開きます。

> **💡 グローバル CLI として使う場合**:
> ```bash
> pnpm build
> pnpm link --global
> # これ以降はどのディレクトリからでも `shukatsu` コマンドが使用可能になります
> shukatsu ui
> ```

---

## 🤖 AI エージェントとの連携

本リポジトリは **Antigravity**, **Claude Code**, **Codex** の 3 大エージェントに最適化されています。

### ルールとスキルの自動適用
- **Antigravity / Codex**: `AGENTS.md` および `.agents/skills/` を自動認識します。
- **Claude Code**: 以下のコマンドで `.agents/skills/` の内容を `.claude/skills/` に同期できます：
  ```bash
  pnpm agents:sync
  ```

### エージェントへの指示の例
- **企業の追加**:
  > 「株式会社サイバーエージェントを企業に登録して」
  > → 自動で Web 検索し、業界・強み・待遇・採用URLを調査した上で志望動機下書きやタスクを自動登録してくれます。
- **ES の壁打ち**:
  > 「○○社のガクチカ（400字）の推敲をして」
  > → 登録企業の強みとあなたのプロフィールを踏まえてブラッシュアップ案を提示します。
- **面接対策**:
  > 「○○社の2次面接の想定質問と逆質問の候補を出して」
  > → 過去の面接の所感や面接官の職位に応じた質問を提案します。

---

## 💻 CLI コマンドリファレンス

すべてのコマンドはリポジトリ内で `pnpm sk <command>` で実行できます。出力はすべてパースしやすい JSON 形式です（`--pretty` で整形表示可能）。

```bash
# 1. 総合コンテキスト取得（AIが最初に実行するコマンド）
pnpm sk context [--sample] [--company <id>] [--pretty]

# 2. 企業管理
pnpm sk company list
pnpm sk company find "キーワード"                     # 重複チェック用検索
pnpm sk company get <companyId>
pnpm sk company add --input file.json
pnpm sk company update <companyId> --input file.json [--expectRev <rev>]
pnpm sk company stage <companyId> <stage>            # 選考ステージを進める（履歴自動記録）
pnpm sk company delete <companyId> [--hard]

# 3. タスク管理
pnpm sk task list [--company <id>] [--openOnly]
pnpm sk task add --title "タスク名" [--company <id>] [--due YYYY-MM-DD]
pnpm sk task update <taskId> [--title ...] [--state todo|doing|done] [--due YYYY-MM-DD]
pnpm sk task done <taskId>                           # 完了にする

# 4. イベント・面接
pnpm sk event list --company <id>
pnpm sk event add --company <id> --title "1次面接" --kind interview --start "2026-11-20T14:00" [--input event.json]

# 5. エントリーシート (ES)
pnpm sk es list --company <id>
pnpm sk es add --company <id> --title "ガクチカ" --question "..." [--input es.json]
pnpm sk es update --company <id> --id <esId> --input es.json

# 6. ノート
pnpm sk note list [--company <id>]
pnpm sk note add --title "面接メモ" [--content "..." | --input note.json] [--company <id>]
pnpm sk note search "キーワード"

# 7. プロフィール
pnpm sk profile get
pnpm sk profile update --input profile.json

# 8. サンプルデータ一括削除
pnpm sk sample clear

# 9. スキーマ定義確認・整合性チェック・派生ビュー再生成
pnpm sk schema [company|task|note|profile|event|es]
pnpm sk doctor
pnpm sk sync

# 10. Web UI 起動
pnpm sk ui [--port 4319] [--no-open]
```

---

## 🧪 テスト・開発チェック

```bash
pnpm exec tsc --noEmit   # 型チェック
pnpm lint                # Biome lint & format チェック
pnpm test                # Core / CLI / API テスト (Vitest)
pnpm build               # Node + Web 本番ビルド

# E2E テスト（サーバー起動状態で別ターミナルまたはバックグラウンド実行）
pnpm test:e2e
```

---

## 📂 データ構造

データはすべて `data/` ディレクトリ配下に保存されます。

```
data/
├── store/                          # 【正本データ】JSONファイル群
│   ├── meta.json                   # スキーマバージョン等
│   ├── profile.json                # プロフィール情報
│   ├── companies/
│   │   └── {companyId}.json        # 企業データ（1社1ファイル）
│   ├── tasks/
│   │   └── {taskId}.json           # タスク（1件1ファイル）
│   └── notes/
│       └── {noteId}.json           # 日次ノート・面接記録
├── views/                          # 【派生ビュー】自動再生成される読み取り専用ファイル
│   ├── context.md                  # AI用総合コンテキスト
│   ├── upcoming.md                 # 直近の締切・面接予定一覧
│   ├── notes-index.md              # ノート検索インデックス
│   ├── calendar.ics                # カレンダーアプリ（Google/Apple）連携用ICS
│   └── companies/
│       └── {companyId}.md          # 企業別Markdown
└── .lock                           # 排他制御用ロックファイル
```

---

## 📄 ライセンス

[MIT License](./LICENSE) © 2026 atollray
