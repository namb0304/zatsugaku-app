# 技術・設計

> チーム会議後の技術構成。

---

## 1. 技術スタック

| 領域 | 採用 |
|---|---|
| フロントエンド | Next.js + TypeScript |
| バックエンド | FastAPI |
| DB | Supabase PostgreSQL |
| 認証 | Supabase Auth |
| AI | Gemini API |
| デプロイ | Vercel Services（Next.js + FastAPI） |

ルートの`vercel.json`でフロントエンドとバックエンドを1つのVercel
プロジェクトとしてデプロイする。

---

## 2. システム構成

```text
ユーザー
  ↓
Vercel Services
  ├─ Next.js
  └─ FastAPI
       ├─ Gemini API
       └─ Supabase PostgreSQL
            └─ Supabase Auth
```

---

## 3. 雑学生成の流れ

```text
1. ユーザーが雑学を見る
2. 1セッション10件を表示する
3. 表示中に次の10件を用意する
4. Gemini APIで雑学・タグ・情報源を生成する
5. 生成結果をDBに保存する
6. 失敗した場合は事前データを表示する
```

---

## 4. 保存する主なデータ

### 雑学

- id
- title
- summary
- source_url
- source_title
- genre
- tags
- created_at

### ユーザー

Supabase Authで管理する。

### ブックマーク

- id
- user_id
- trivia_id
- created_at

### 視聴履歴

- id
- user_id
- trivia_id
- viewed_at

未ログイン時の視聴履歴は、ブラウザ側で一時的に管理する想定。

### ユーザー選択ジャンル

- id
- user_id
- genre
- created_at

---

## 5. パーソナライズ方針

MVPでは機械学習ではなく、ルールベースで実装する。

```text
マイページで選択したジャンル: 強く反映
ブックマークした雑学のジャンル: 強く反映
ブックマークした雑学のタグ: やや反映
視聴済みの雑学: 再表示しない
```

スコア:

```text
選択ジャンル: +3
ブックマークした雑学のgenre: +2
ブックマークした雑学のtag: +1
```

実装イメージ:

```text
1. ユーザーの選択ジャンルを取得
2. ブックマーク済み雑学のgenre/tagsを集計
3. スコアが高いジャンルを優先して次の10件を生成または取得
4. 足りない分はランダムなジャンルで補う
```

---

## 6. API候補

```text
GET /health
GET /trivia/feed
POST /trivia/generate
POST /bookmarks
GET /bookmarks
DELETE /bookmarks/{trivia_id}
GET /me/preferences
PUT /me/preferences
```

---

## 7. 注意点

- Gemini APIキーは代表者1人が管理し、GitHubに置かない
- Wikipedia情報源をAI任せにするとURLの誤りが出る可能性がある
- MVPではGoogle Search groundingを使わず、通常プロンプトで `source_url` を出させる
- まずはデモ用の事前データを用意する
- デプロイはMVP優先度を低くする
