---
description: ユーザーが「○○を追加して」「○○を企業に登録して」などと依頼したときに使用。企業をAI-Ready-Shukatsuのdataに追加する。Web検索で情報を自動収集し、jsonを編集して保存する。
---

# /add-company ワークフロー

## トリガー条件

ユーザーが「○○を追加して」「○○を企業に登録して」などと依頼したとき。

## ステップ

### 1. 企業情報をWeb検索で収集

以下の情報をWeb検索で収集する。複数クエリを同時に実行して良い。

- `"企業名" 採用 新卒 "ユーザーの卒業年"` → 採用ページURL・応募ページURL
- `"企業名" 業界 本社 事業内容` → 業界・所在地・主な事業
- `"企業名" 強み 特徴 文化` → 企業の強み・特徴・カルチャー
- `"企業名" 新卒 待遇 福利厚生 勤務地` → 給与、福利厚生、勤務地などの条件
- `data/workspace/profile.json` を読んで追加で必要だと判断できる情報

収集した情報を元に以下のフィールドにマッピングする：

| `data/workspace/companies/{slug}.json` フィールド | 収集内容 |
|---|---|
| `name` | 正式企業名（法人格含む） |
| `slug` | 英数字＋ハイフンに変換（例: `it-systems`） |
| `industry` | 業界（例: `ITサービス`, `製造業`） |
| `headquarters` | 本社所在地（都道府県・市区町村） |
| `careersUrl` | 採用トップページURL |
| `applicationUrl` | エントリー・応募フォームURL（あれば） |
| `tags` | 特徴を表すタグ（3〜6個、例: `["SIer", "系列", "社会インフラ"]`） |
| `sellingPoints` | 企業の強み・魅力（2〜4文） |

### 2. AIによる下書き生成

`data/workspace/profile.json` を読み、以下をAIが生成する：

- `motivation`: プロフィールの `desiredRoles`・`desiredIndustries`・`strengths` と企業の事業内容を組み合わせて志望理由の下書き（3〜5文）
- `concerns`: 業界・規模・文化から推定される一般的な懸念点（1〜3文）
- `conditions`: 初任給、家賃補助、リモート・フレックス有無、選考時の勤務地条件などを箇条書きでまとめる（3〜5点程度）
- `nextAction`: `"採用ページを確認してES設問を入手する"` など、企業の選考特徴に応じて調整
- `fitScore`: プロフィールと企業のカルチャーや事業内容を比較して、以下の5段階でマッチ度を判定する
  （1: 調べる必要すらない, 2: 合わない, 3: 検討, 4: 調べるべき, 5: 応募するべき）
- `notes`: 企業の重要な情報、ユーザー（自分）との相性、その他の補足事項を記述する
- `tasks`: 選考状況や企業情報に基づき、次にやるべきタスクを**最低1件、最大3件**まで内容と数を自動で決定して生成する

### 3. `data/workspace/companies/{slug}.json` と `data/workspace/tasks.json` を編集

`data/workspace/companies/{slug}.json`（スラグをファイル名とした新規ファイル）を以下の構造で作成する。

```json
{
  "id": "company-{ランダムな8桁の16進数}",
  "slug": "{英数字ハイフン}",
  "name": "{正式企業名}",
  "industry": "{業界}",
  "stage": "researching",
  "priority": "high",
  "interestScore": 3,
  "fitScore": {1から5の判定スコア},
  "applicationUrl": "{URL または空文字}",
  "careersUrl": "{URL または空文字}",
  "headquarters": "{所在地}",
  "tags": [],
  "motivation": "{志望理由の下書き}",
  "sellingPoints": "{企業の強み}",
  "concerns": "{懸念点}",
  "conditions": "{待遇・働き方の条件箇条書き}",
  "nextAction": "{次アクション}",
  "notes": "{企業の重要な情報・相性・補足}",
  "updatedAt": "{現在のISO8601時刻}",
  "esEntries": [],
  "events": [],
  "contacts": [],
  "interviews": [],
  "documents": []
}
```

また、`data/workspace/tasks.json` の配列に生成したタスクを追記する。`relatedCompanyId` は上記の企業IDと同一にする。自動生成されたタスク数（1〜3件）に応じて以下のように追加する。

```json
[
  {
    "id": "task-{8桁16進数}",
    "title": "{企業名} — {自動決定されたタスク名}",
    "state": "todo",
    "dueDate": "",
    "relatedCompanyId": "{企業ID}",
    "notes": "{タスクの詳細・必要に応じてURLなど}"
  }
]
```

> **⚠️ 注意**: アプリ側のUIから「再読込」を押すまで、画面と、Markdownファイル（`data/companies/*.md`）や `data/ai/*.md` などのAIエクスポートファイルは更新されません。ファイルを直接編集した後は、ユーザーにブラウザでアプリを開いて「再読込」ボタンを押すよう案内してください。

### 4. 完了報告

以下を日本語でユーザーに報告する：

- 追加した企業名と取得した情報のサマリー
- 自動作成したタスク一覧
- 不確かな情報（URL・業界など）があれば明記して確認を促す
- 「再読込」が必要だと案内

## 注意事項

- **登録済みの確認**: `data/workspace/companies/` ディレクトリ内に同一企業のJSON（`name` や `slug` の一致）が既に存在しないか確認してから追加する
- **IDの衝突防止**: 既存の各企業JSONファイルと `tasks.json` のIDと重複しないようにする
- `slug` は英数字＋ハイフンのみ（日本語不可）。企業名を slugify して生成する
- 採用ページが見つからない場合は `careersUrl`・`applicationUrl` を空文字にして報告する
- `stage` は必ず `"researching"` から開始する（`"wishlist"` は手動のみ）
- `interestScore` の初期値は `3`（ユーザーが後から調整する）
- `tags` フィールドはステップ1で収集した特徴タグを入れる（空配列ではなく必ず埋める）
