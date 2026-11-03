---
name: add-company
description: ユーザーが「○○を追加して」「○○を企業に登録して」などと依頼したときに使用。企業をWeb検索で調査し、pnpm sk CLI経由で追加する。
---

# 企業自動追加スキル (add-company)

## トリガー条件
ユーザーが「○○を追加して」「○○を企業に登録して」「○○の情報を調べて登録して」などと依頼したとき。

## 手順

### 1. コンテキスト取得
まず最新のプロフィール情報を取得する：
```bash
pnpm sk context
```
ユーザーの `desiredRoles`, `desiredIndustries`, `strengths` などを把握する。

### 2. 重複チェック
既に対象企業が登録されていないか確認する：
```bash
pnpm sk company find "<企業名の一部または正式名>"
```
既に登録済みの企業が見つかった場合は、重複して新規追加せず、既存の情報を更新するかユーザーに確認する。

### 3. Web検索で情報収集
Web検索で以下の情報を収集する（複数クエリ並行実行可）：
- `"企業名" 採用 新卒` → 採用ページURL・マイページ応募URL
- `"企業名" 業界 本社 事業内容` → 業界・本社所在地・主な事業
- `"企業名" 強み 特徴 文化 働き方` → 企業の強み・魅力・カルチャー
- `"企業名" 新卒 初任給 福利厚生 勤務地` → 給与、家賃補助、リモート有無など

### 4. 下書きとスコアリングの作成
ユーザーのプロフィールと収集した情報を照らし合わせ、以下を生成する：
- `motivation`: 志望動機の下書き（3〜5文、ユーザーの強みや興味と企業の事業を結びつける）
- `sellingPoints`: 企業の強み・特徴（2〜4文）
- `concerns`: 業界・規模・働き方から推測される留意点や懸念（1〜3文）
- `conditions`: 初任給・勤務地・リモート等の待遇条件まとめ（箇条書き3〜5点）
- `interestScore`: 初期値 3〜4
- `fitScore`: カルチャーや事業とのマッチ度（1:合わない 〜 5:強く応募推奨）
- `tags`: 特徴を表すタグ（3〜6個、例: `["SIer", "自社開発", "社会インフラ"]`）

### 5. 一時 JSON ファイル作成と CLI 追加
PowerShellの文字化けを防ぐため、一時ファイル `_tmp_company.json` を作成して登録する：

```json
{
  "name": "正式企業名",
  "industry": "業界",
  "headquarters": "本社所在地",
  "urls": {
    "careers": "https://...",
    "application": "https://..."
  },
  "tags": ["タグ1", "タグ2"],
  "stage": "researching",
  "currentTrack": "本選考",
  "interestScore": 3,
  "fitScore": 4,
  "motivation": "志望理由...",
  "sellingPoints": "強み...",
  "concerns": "懸念点...",
  "conditions": "条件...",
  "memo": "AIによる調査メモ"
}
```

CLI で登録を実行：
```bash
pnpm sk company add --input _tmp_company.json
```
返却された JSON の `data.id`（例: `co_1234abcd`）を記録する。
登録後、`_tmp_company.json` は削除する。

### 6. タスクの自動生成
企業の選考段階や調査状況に応じ、次にとるべきタスクを1〜3件登録する：
```bash
pnpm sk task add --title "<企業名>：採用マイページの登録と選考日程確認" --company "<companyId>"
pnpm sk task add --title "<企業名>：説明会またはOB/OG訪問の予約" --company "<companyId>"
```

### 7. ユーザーへの完了報告
以下を簡潔にまとめて日本語で報告する：
1. 登録した企業名、業界、所在地
2. 判定したマッチ度（fitScore）とおすすめポイント
3. 自動作成したタスク一覧
4. 不明なURLや要確認事項があれば提示
