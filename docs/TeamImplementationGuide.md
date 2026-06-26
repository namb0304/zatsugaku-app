# チーム別実装ガイド

> 4チーム x 2人で進めるための実装手順書。
> この資料は、各チームが「何を作ればいいか」「誰と接続すればいいか」「どこまでできたら完了か」を揃えるために使う。

---

## 0. 全体の完成形

MVPでは、以下の流れが最後まで動く状態を目指す。

```text
ユーザーがアプリを開く
↓
雑学カードが表示される
↓
横スワイプで次の雑学を見る
↓
情報源・タグ・ジャンルが見える
↓
ログインする
↓
雑学をブックマークする
↓
マイページでブックマーク一覧を見る
↓
ジャンル選択やブックマーク情報をもとに、次に出る雑学が少し寄る
```

優先順位は以下。

```text
1. 横スワイプで雑学が見られる
2. Gemini APIで雑学を生成できる
3. 情報源とタグが表示される
4. ログインできる
5. ブックマークできる
6. マイページで確認できる
7. 最小パーソナライズできる
```

デプロイは優先度低め。まずローカルでMVPが通ることを優先する。

---

## 1. チーム分担

| チーム | 担当範囲 | 含まれる機能 |
|---|---|---|
| 雑学チーム | 雑学が出てくる体験まわり | 横スワイプUI、雑学カード、AI生成、タグ生成 |
| アカウントチーム | ログイン・ユーザーまわり | Supabase Auth、ログイン画面、ログイン状態管理 |
| ブックマークチーム | 保存・一覧まわり | ブックマーク、マイページ、タグ別表示、ジャンル選択 |
| 基盤チーム | 全員が乗る土台 | DB設計、API共通部分、環境変数、ローカル起動、デプロイ補助 |

---

## 2. 共通ルール

### 技術

```text
フロントエンド: Next.js + TypeScript
バックエンド: FastAPI
DB: Supabase PostgreSQL
認証: Supabase Auth
AI: Gemini API
```

### 必ず守ること

- APIキーはGitHubに置かない
- `.env` 系ファイルはコミットしない
- まず仮データで画面を作る
- 画面とAPIを同時に待たない
- 完璧な実装より、最初に一連のデモが通ることを優先する

### 共有データ形式

雑学データは、全チームで以下の形を前提にする。

```ts
type Trivia = {
  id: string;
  title: string;
  summary: string;
  genre: string;
  tags: string[];
  source_title: string;
  source_url: string;
};
```

10ジャンルは以下で固定する。

```text
自然・科学・宇宙
生き物
人体・医学
歴史・偉人
言葉・語源
食べ物・料理
地理・世界の文化
生活・日常の疑問
エンタメ・芸術・スポーツ
サブカル・マニアック
```

---

## 3. 雑学チーム

### 担当するもの

- 横スワイプで雑学を見る画面
- 雑学カードUI
- タグ・ジャンル・情報源表示
- Gemini生成プロンプトの調整
- 10件単位の雑学表示
- AI失敗時の事前データ表示

### 作る画面・部品

```text
/                         雑学スワイプ画面
components/TriviaCard     雑学カード
components/SwipeFeed      横スワイプ表示
components/TagList        タグ表示
```

### 実装手順

1. 仮データを10件用意する
2. `TriviaCard` を作り、タイトル・概要・ジャンル・タグ・情報源を表示する
3. `SwipeFeed` を作り、横スワイプでカードを切り替える
4. localStorageに未ログイン時の視聴済みIDを保存する
5. `GET /trivia/feed` から雑学を取得する形に切り替える
6. 残りカードが少なくなったら、次の10件を取得する
7. APIが失敗したら事前データを表示する
8. ブックマークボタンを置き、ブックマークチームの処理につなぐ

### Gemini生成

Geminiの出力形式は [GeminiPromptDraft.md](./GeminiPromptDraft.md) に合わせる。

雑学チームは、以下を基盤チームと相談して決める。

- Geminiに渡す `preferred_genres`
- Geminiに渡す `excluded_topics`
- 生成失敗時にどの事前データを返すか

### 基盤チームに依頼するAPI

```text
GET /trivia/feed
```

期待するレスポンス:

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "タイトル",
      "summary": "概要",
      "genre": "自然・科学・宇宙",
      "tags": ["宇宙", "惑星"],
      "source_title": "Wikipedia",
      "source_url": "https://example.com"
    }
  ]
}
```

### 完了条件

- 横スワイプで雑学カードを見られる
- タイトル、概要、タグ、情報源が表示される
- 10件単位で表示できる
- API失敗時も事前データで画面が壊れない
- ブックマークボタンを押す導線がある

---

## 4. アカウントチーム

### 担当するもの

- Supabase Auth
- メールアドレス + パスワードログイン
- 新規登録
- ログアウト
- ログイン状態の管理
- 未ログイン時の制御

### 作る画面・部品

```text
/login                  ログイン画面
components/AuthButton   ログイン/ログアウト表示
lib/supabaseClient      Supabaseクライアント
```

### 実装手順

1. SupabaseプロジェクトのURLとpublishable keyを受け取る
2. フロント側にSupabaseクライアントを作る
3. `/login` 画面を作る
4. メールアドレス + パスワードで新規登録できるようにする
5. メールアドレス + パスワードでログインできるようにする
6. ログアウトできるようにする
7. 現在のログインユーザーを取得できるようにする
8. 未ログインでブックマークを押したら `/login` に誘導する
9. ログイン後、元の画面に戻れる導線を作る

### 他チームに渡すもの

```ts
type AuthUser = {
  id: string;
  email: string;
};
```

フロント側で使いやすいように、以下を用意する。

```text
getCurrentUser()
signIn(email, password)
signUp(email, password)
signOut()
```

### ブックマークチームとの接続

ブックマーク保存時に、ログインユーザーIDが必要。

```text
ログイン済み: bookmark APIを呼ぶ
未ログイン: /login に誘導
```

### 完了条件

- 新規登録できる
- ログインできる
- ログアウトできる
- ログイン状態で画面表示を切り替えられる
- 未ログイン時にブックマーク操作を止められる

---

## 5. ブックマークチーム

### 担当するもの

- ブックマーク保存
- ブックマーク解除
- ブックマーク一覧
- マイページ
- タグ別/ジャンル別表示
- 10ジャンル選択
- パーソナライズに使うユーザー設定

### 作る画面・部品

```text
/mypage                       マイページ
components/BookmarkButton      ブックマークボタン
components/BookmarkList        ブックマーク一覧
components/GenreSelector       10ジャンル選択
components/BookmarkFilterTabs  タグ/ジャンル絞り込み
```

### 実装手順

1. `BookmarkButton` を作る
2. ログイン済みなら `POST /bookmarks` を呼ぶ
3. 未ログインならアカウントチームのログイン導線に渡す
4. `/mypage` を作る
5. `GET /bookmarks` で保存済み雑学を表示する
6. ジャンル/タグで絞り込めるようにする
7. `GenreSelector` を作り、10ジャンルから選択できるようにする
8. 選択ジャンルを `PUT /me/preferences` で保存する
9. ブックマーク済みジャンル・タグを集計して表示する
10. パーソナライズ用の情報を基盤チームに渡す

### 基盤チームに依頼するAPI

```text
POST /bookmarks
GET /bookmarks
DELETE /bookmarks/{trivia_id}
GET /me/preferences
PUT /me/preferences
```

### パーソナライズルール

MVPでは以下のスコアでよい。

```text
選択ジャンル: +3
ブックマークした雑学のgenre: +2
ブックマークした雑学のtag: +1
```

間に合わなければ、選択ジャンルだけ反映する。

### 完了条件

- ログイン済みユーザーがブックマークできる
- ブックマーク済み雑学を一覧で見られる
- ブックマーク解除ができる
- 10ジャンルから選択できる
- 選択ジャンルを保存できる
- ジャンル/タグで簡単に絞り込める

---

## 6. 基盤チーム

### 担当するもの

- リポジトリ構成
- DB設計
- FastAPI共通部分
- Supabase接続
- Gemini API接続
- APIレスポンス形式の統一
- 環境変数
- ローカル起動手順
- デプロイ補助

### 推奨ディレクトリ

```text
2026-g5/
├── frontend/
├── backend/
└── docs/
```

### DBテーブル案

```text
trivia
- id
- title
- summary
- source_url
- source_title
- genre
- tags
- created_at

bookmarks
- id
- user_id
- trivia_id
- created_at

view_history
- id
- user_id
- trivia_id
- viewed_at

user_preferences
- id
- user_id
- genre
- created_at
```

未ログイン時の視聴済みはDBではなくlocalStorageでよい。

### API案

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

### 実装手順

1. `frontend/` と `backend/` を作る
2. Next.js + TypeScript を起動できる状態にする
3. FastAPIを起動できる状態にする
4. `GET /health` を作る
5. Supabaseのテーブルを作る
6. FastAPIからSupabaseに接続する
7. Gemini APIを呼ぶ処理を作る
8. `POST /trivia/generate` で10件生成し、DB保存する
9. `GET /trivia/feed` で10件返す
10. ブックマーク系APIを作る
11. ユーザー設定APIを作る
12. `.env.example` を用意する
13. READMEにローカル起動手順を書く

### 環境変数

フロント:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_API_BASE_URL
```

バックエンド:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
GEMINI_API_KEY
FRONTEND_ORIGIN
```

### 完了条件

- フロントとバックがローカルで起動する
- `GET /health` が返る
- DBテーブルがある
- Geminiで雑学を生成できる
- 生成結果をDBに保存できる
- `GET /trivia/feed` で雑学10件を返せる
- ブックマーク系APIが動く
- ローカル起動手順がREADMEにある

---

## 7. チーム間の接続順

以下の順番でつなぐ。

```text
1. 基盤チームが仮APIまたは仮JSONを用意
2. 雑学チームが仮データでスワイプ画面を完成
3. アカウントチームがログイン状態を取得できるようにする
4. ブックマークチームがブックマーク画面を仮データで完成
5. 雑学チームが /trivia/feed に接続
6. ブックマークチームが /bookmarks に接続
7. マイページのジャンル選択を /me/preferences に接続
8. Gemini生成をDB保存に接続
9. 全体デモを通す
```

---

## 8. 1週間の進め方

### Day 1: 土台作り

- 基盤: frontend/backendの初期化、Supabase作成、環境変数整理
- 雑学: 仮データ10件、カードUI、横スワイプ調査
- アカウント: Supabase Auth調査、ログイン画面設計
- ブックマーク: マイページ構成、ブックマーク一覧UI案

### Day 2: 仮データで画面を作る

- 基盤: `GET /health`、DBテーブル案、APIレスポンス案
- 雑学: 横スワイプUI完成、カード表示
- アカウント: 新規登録・ログイン・ログアウト
- ブックマーク: ブックマークボタン、一覧画面

### Day 3: APIとDBをつなぎ始める

- 基盤: Gemini生成API、DB保存
- 雑学: `GET /trivia/feed` 接続
- アカウント: ログイン状態を全画面で使えるようにする
- ブックマーク: `POST /bookmarks`、`GET /bookmarks` 接続

### Day 4: マイページとパーソナライズ

- 基盤: preferences API、簡易スコア計算
- 雑学: 優先ジャンルつきfeed取得
- アカウント: 未ログイン時のブックマーク制御
- ブックマーク: ジャンル選択、タグ/ジャンル絞り込み

### Day 5: デモ通し

- 全員: デモシナリオを最初から最後まで確認
- 基盤: AI失敗時の事前データ
- 雑学: 表示崩れ修正
- アカウント: ログインまわりの詰まり修正
- ブックマーク: 保存・一覧・解除の確認

---

## 9. 削る順番

間に合わない場合は、以下の順に削る。

```text
1. デプロイ
2. パーソナライズの細かい調整
3. タグ別表示の細かいUI
4. マイページの見た目
5. 「知ってた」「知らなかった」
```

絶対に残すもの。

```text
横スワイプで雑学を見る
Geminiで雑学を生成する
情報源を表示する
ログイン後にブックマークできる
```

---

## 10. リーダーの確認リスト

毎日、以下だけ確認する。

```text
雑学チーム:
横スワイプでカードが見られるか

アカウントチーム:
ログイン・ログアウトできるか

ブックマークチーム:
保存・一覧表示できるか

基盤チーム:
APIとDBが動いているか

全体:
デモの流れが途中で止まらないか
```

各チームから毎日もらう報告はこれでよい。

```text
昨日やったこと:
今日やること:
詰まっていること:
他チームに確認したいこと:
```
