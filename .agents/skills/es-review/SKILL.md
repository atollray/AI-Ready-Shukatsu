---
name: es-review
description: ユーザーが「ESを添削して」「志望動機を壁打ちしたい」「この設問の回答案を作って」と依頼したときに使用。企業の文脈とプロフィールを踏まえてESを作成・推敲する。
---

# ES 壁打ち・添削スキル (es-review)

## トリガー条件
ユーザーが「ESを添削して」「志望動機をブラッシュアップして」「○○社のESを考えて」などと依頼したとき。

## 手順

### 1. コンテキストと企業情報の取得
```bash
pnpm sk context
pnpm sk company get <companyId>
```
企業の事業内容、強み、志望動機下書き、およびユーザーの強み・就活軸を取得する。

### 2. ESの設問確認
企業に登録済みのES一覧を確認する：
```bash
pnpm sk es list --company <companyId>
```

### 3. 壁打ち・添削の観点
- **結論ファースト**: 冒頭で結論（強み・志望動機・経験）を端的に伝えているか
- **STAR法**: 状況 (Situation) → 課題 (Task) → 行動 (Action) → 結果 (Result) が具体的か
- **数字と独自性**: 曖昧な表現ではなく、具体的な工夫や数字が含まれているか
- **企業理解との接続**: 「なぜ他社ではなくこの企業なのか」が結びついているか
- **文字数**: 文字数制限（charLimit）の 85%〜95% に収まっているか

### 4. 改善案の提示と更新
チャットで添削理由と修正案を提示し、ユーザーの合意が得られたら CLI で反映する：
```json
// _tmp_es.json
{
  "draft": "ブラッシュアップ後の回答文...",
  "status": "review"
}
```
```bash
pnpm sk es update --company <companyId> --id <esId> --input _tmp_es.json
```
反映後、`_tmp_es.json` を削除する。
