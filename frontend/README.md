# フロントエンド（Next.js）

雑学スワイプアプリのフロントエンド。

---

## セットアップ（初回・クローン後）

```bash
# 依存パッケージをインストール（node_modules はgitに入っていないので必須）
cd frontend
npm install

# 環境変数ファイルを作成（現時点は不要。APIを繋ぐときに必要）
cp .env.example .env.local
# → .env.local を開いて実際のキーを設定する

# 開発サーバー起動
npm run dev
```

→ http://localhost:3000

---

## ページ構成

| ルート | ファイル | 概要 |
|---|---|---|
| `/` | `app/page.tsx` | `/login` へリダイレクト |
| `/login` | `app/login/page.tsx` | メール・パスワードでログイン |
| `/genre` | `app/genre/page.tsx` | ジャンル選択（複数選択可） |
| `/swipe` | `app/swipe/page.tsx` | メインのスワイプ画面 |
| `/bookmarks` | `app/bookmarks/page.tsx` | ブックマーク一覧 |
| `/mypage` | `app/mypage/page.tsx` | ジャンル設定・ログアウト |

---

## スワイプ操作

| 操作 | 動作 |
|---|---|
| 右スワイプ / → キー | 次のカードへ進む |
| 左スワイプ / ← キー | 前のカードへ戻る |
| 上スワイプ / ↑ キー | ブックマーク保存（カードが上に飛ぶ） |
| カードタップ | そのカードを選択 |

---

## バックエンド未接続箇所

各ページのコード内に `// 接続:` と `// TODO:` でコメントを記載している。

主な接続先:

| 機能 | エンドポイント |
|---|---|
| ログイン | Supabase Auth `signInWithPassword()` |
| ジャンル取得・保存 | `GET /me/preferences` / `PUT /me/preferences` |
| カード取得 | `GET /trivia/feed` |
| カード生成（10枚使い切り後） | `POST /trivia/generate` |
| ブックマーク | `POST /bookmarks` / `GET /bookmarks` / `DELETE /bookmarks/:id` |
| 視聴履歴 | Supabase `viewed_history` テーブル（未ログイン時は localStorage） |
| ログアウト | Supabase Auth `signOut()` |

---

## 状態管理（現状）

- ジャンル選択: `localStorage` に保存（本番は `/me/preferences` に差し替え）
- ブックマーク: コンポーネント内 `useState`（本番は API に差し替え）
- 認証状態: 未実装（`middleware.ts` でガード予定）
- スワイプ画面のカード: モックデータ（`MOCK_TRIVIA`）を使用中
