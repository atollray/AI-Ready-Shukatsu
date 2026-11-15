---
name: interview-prep
description: ユーザーが「面接対策をして」「想定質問を作って」「模擬面接をして」と依頼したときに使用。過去の面接結果や企業情報に基づき対策を行う。
---

# 面接対策・想定問答スキル (interview-prep)

## トリガー条件
ユーザーが「○○社の面接対策をして」「2次面接の想定質問を考えて」「面接の逆質問を考えて」などと依頼したとき。

## 手順

### 1. 企業詳細と選考履歴・ノートの確認
```bash
pnpm sk company get <companyId>
pnpm sk note list --company <companyId>
```
企業の選考トラック（本選考/早期等）、過去のイベント・面接の質問や所感（`interview.questions` / `interview.reflections`）を確認する。

### 2. 想定質問の作成
- 前回の面接で深掘りされた点・回答が甘かった点のフォローアップ
- 面接官の職位に応じた質問（現場エンジニアなら技術力・チーム開発、部長なら事業理解・志望度、役員ならキャリアビジョン・社風マッチ）
- 逆質問の候補（企業の強みや最新ニュース、カルチャーに関する質の高い質問3点）

### 3. 予定・面接記録・ステージの更新
面接日程や構造化された面接記録（質問・所感・結果）を残す場合は一時 JSON `_tmp_event.json` を作成して `event add` を実行し、終了後に削除する：
```json
{
  "interview": {
    "round": "2次面接",
    "format": "オンライン",
    "questions": "深掘りされた質問メモ...",
    "reflections": "手応えと反省点...",
    "outcome": "pending"
  }
}
```
```bash
pnpm sk event add --company <companyId> --title "2次面接" --kind "interview" --start "YYYY-MM-DDTHH:mm" --input _tmp_event.json
rm -f _tmp_event.json
```
必要に応じて選考ステージを更新し、長文の振り返りは `_tmp_note.json` 経由でノートに記録する：
```bash
pnpm sk company stage <companyId> interview
pnpm sk note add --title "○○社 2次面接振り返り" --company <companyId> --content "..."
```
