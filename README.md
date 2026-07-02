# 雑学スワイプアプリ

暇つぶし感覚で雑学をスワイプして読むWebアプリ。

---

## 技術スタック

| 領域 | 採用技術 |
|---|---|
| フロントエンド | Next.js 16 + TypeScript + Tailwind CSS v4 |
| バックエンド | FastAPI |
| DB | Supabase PostgreSQL |
| 認証 | Supabase Auth |
| AI | Gemini API |

---

## ディレクトリ構成

```
zatsugaku-app/
├── backend/            # FastAPI バックエンド
├── docs/               # 要件定義・設計ドキュメント
│   ├── Requirements.md
│   ├── Architecture.md
│   ├── Mvp.md
│   ├── Tasks.md
│   └── GeminiPromptDraft.md
└── frontend/           # Next.js フロントエンド
    └── app/
        ├── page.tsx        # / → /swipe へリダイレクト
        ├── login/          # ログイン画面
        ├── genre/          # ジャンル選択画面
        ├── swipe/          # メインのスワイプ画面
        ├── bookmarks/      # /mypage への互換リダイレクト
        └── mypage/         # ジャンル設定・ブックマーク・ログアウト
```

---

## 画面遷移

```
/  → /swipe（即リダイレクト）

/swipe（メイン・ゲストも閲覧可能）
  └── マイページリンク → /mypage

/login
  ├── ログイン成功 → /swipe
  ├── 新規登録成功 → /genre（ジャンル選択）
  └── ゲストとして続ける → /swipe

/genre（ジャンル選択）
  └── はじめる → /swipe

/mypage
  ├── ジャンルタブ（選択・リモート保存）
  └── ブックマークタブ（一覧・削除）

/bookmarks → /mypage（リダイレクト）
```

---

## ローカル起動

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

→ http://localhost:3000 で起動

### バックエンド

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

→ http://localhost:8000/health で`{"status":"ok"}`を確認

テスト:

```bash
cd backend
.venv/bin/pytest
```

---

## Vercelへデプロイ

ルートの`vercel.json`で、Next.jsとFastAPIを1つのVercel Services
プロジェクトとして構成している。

```text
/                 -> frontend（Next.js）
/health           -> backend（FastAPI）
/trivia/*         -> backend（FastAPI）
/bookmarks*       -> backend（FastAPI）
/me/*             -> backend（FastAPI）
```

Vercelのプロジェクト作成画面では以下を指定する。

```text
Application Preset: Services
Root Directory: ./
```

Vercelに登録する環境変数:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SECRET_KEY
GEMINI_API_KEY
GEMINI_MODEL
FRONTEND_ORIGIN
```

`NEXT_PUBLIC_API_BASE_URL`は本番では登録しない。同一ドメインのFastAPIへ
相対URLで接続する。ローカル開発では`frontend/.env.local`の
`NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`を使用する。

デプロイ後:

1. `FRONTEND_ORIGIN`を本番URL（例:
   `https://zatsugaku-app.vercel.app`）へ設定して再デプロイする
2. Supabase AuthのSite URLを本番URLへ変更する
3. Supabase AuthのRedirect URLsへ`https://本番URL/**`を追加する
4. `https://本番URL/health`が`{"status":"ok"}`を返すことを確認する

`SUPABASE_SECRET_KEY`と`GEMINI_API_KEY`はブラウザ用コードから参照しない。

---

## スワイプ操作（/swipe）

| 操作 | 動作 |
|---|---|
| 左スワイプ / → キー | 次のカードへ進む |
| 右スワイプ / ← キー | 前のカードへ戻る |
| 上スワイプ / ↑ キー | ブックマーク保存 |
| カードタップ | そのカードを選択 |

- 1セッション10枚。表示中に次の10枚を先読みし、最後まで進むと自動で切り替わる
- カードはトランプの手札のように半円状に並ぶ

---

## 実装状況

### フロントエンド

- [x] ログイン・新規登録画面（Supabase Auth 連携済み）
- [x] ジャンル選択（トグル選択・`localStorage` + リモートAPI保存）
- [x] スワイプ画面（ファン表示・各種スワイプ・Gemini先読み・バッチ切替アニメーション）
- [x] ブックマーク（スワイプアップ/↑キーで保存・ログイン必須）
- [x] マイページ（ジャンルタブ・ブックマークタブ・ログアウト）
- [x] ゲストの視聴履歴（`localStorage`）
- [x] ゲスト→ログイン後のパーソナライズフィード切替

### バックエンド API

- [x] `GET /health`
- [x] `GET /trivia/feed`（未ログイン：ゲストフィード、ログイン：パーソナライズ）
- [x] `POST /trivia/generate`（Gemini生成 + 失敗時フォールバック）
- [x] `GET /bookmarks` / `POST /bookmarks` / `DELETE /bookmarks/:id`
- [x] `GET /me/preferences` / `PUT /me/preferences`
- [x] `POST /me/view-history`
- [x] Supabase Auth によるトークン検証・ユーザーID取得

### パーソナライズ

- [x] 選択ジャンル +3 / ブックマークジャンル +2 / ブックマークタグ +1 の重みスコアリング
- [x] 視聴済み雑学を候補から除外
- [x] Gemini プロンプトへ選択ジャンル・タグを反映

### Gemini / フォールバック

- [x] Gemini 失敗時（403含む）→ DB または fallback.json を返す
- [x] Gemini実生成とSupabase保存をローカル環境で確認済み

---

## ジャンル一覧

1. 自然・科学・宇宙
2. 生き物
3. 人体・医学
4. 歴史・偉人
5. 言葉・語源
6. 食べ物・料理
7. 地理・世界の文化
8. 生活・日常の疑問
9. エンタメ・芸術・スポーツ
10. サブカル・マニアック
