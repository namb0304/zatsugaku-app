# 雑学スワイプアプリ

暇つぶし感覚で雑学をスワイプして読むWebアプリ。

---

## 技術スタック

| 領域 | 採用技術 |
|---|---|
| フロントエンド | Next.js 16 + TypeScript + Tailwind CSS v4 |
| バックエンド | FastAPI（基盤・ヘルスチェック実装済み） |
| DB | Supabase PostgreSQL（環境構築済み・API連携前） |
| 認証 | Supabase Auth（環境構築済み・画面連携前） |
| AI | Gemini API（連携前） |

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
        ├── page.tsx        # / → /login へリダイレクト
        ├── login/          # ログイン画面
        ├── genre/          # ジャンル選択画面
        ├── swipe/          # メインのスワイプ画面
        ├── bookmarks/      # ブックマーク一覧
        └── mypage/         # マイページ（ジャンル設定・ログアウト）
```

---

## 画面遷移

```
/login
  ├── ログイン → /genre
  └── ログインせずに続ける → /genre

/genre（ジャンル選択）
  └── はじめる → /swipe

/swipe（メイン画面）
  ├── マイページリンク → /mypage
  └── ブックマーク一覧リンク → /bookmarks

/mypage
  └── ブックマーク一覧リンク → /bookmarks
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

## スワイプ操作（/swipe）

| 操作 | 動作 |
|---|---|
| 右スワイプ / → キー | 次のカードへ進む |
| 左スワイプ / ← キー | 前のカードへ戻る |
| 上スワイプ / ↑ キー | ブックマーク保存（カードが上に飛ぶ） |
| カードタップ | そのカードを選択 |

- 1セッション10枚。10枚使い切るとドロー演出で次の10枚が補充される
- カードはトランプの手札のように半円状に並ぶ

---

## 実装状況

### 完了（フロントのみ・モックデータ）

- [x] ログイン画面（入力フォーム、遷移のみ）
- [x] ジャンル選択（トグル選択・`localStorage`保存）
- [x] スワイプ画面（ファン表示・各種スワイプ・ブックマーク・ドロー演出）
- [x] ブックマーク一覧（モック表示）
- [x] マイページ（ジャンルトグル・`localStorage`連動・ログアウト遷移）

### 未実装（バックエンド連携待ち）

- [ ] Supabase Auth による認証（現在は画面遷移のみ）
- [ ] `GET /trivia/feed` へのフロント接続（APIは実装済み、画面はモックデータ）
- [ ] `POST /trivia/generate` による雑学生成
- [ ] `POST /bookmarks` / `GET /bookmarks` / `DELETE /bookmarks/:id`
- [ ] `GET /me/preferences` / `PUT /me/preferences`
- [ ] 視聴履歴の記録
- [ ] ミドルウェアによる未ログイン時リダイレクト（`middleware.ts`）
- [x] APIでのフォールバック用事前データ返却

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
