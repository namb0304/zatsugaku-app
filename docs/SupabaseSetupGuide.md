# Supabaseセットアップ手順

> Supabase担当者向け。
> 目的は、認証・DB・ブックマーク・ジャンル選択を実装できる土台を作ること。

---

## 0. 先に理解すること

Supabaseで今回使うものは3つ。

```text
Auth: ログイン、新規登録、ユーザーID管理
PostgreSQL: 雑学、ブックマーク、視聴履歴、ジャンル選択の保存
API Keys: フロント/バックからSupabaseへ接続するためのキー
```

APIキーは2種類に分ける。

```text
フロントに置いてよい:
Publishable key
または古い表記なら anon key

絶対にフロントに置かない:
Secret key
または古い表記なら service_role key
```

---

## 1. プロジェクト作成

1. SupabaseにGitHubアカウントでログイン
2. `New project` を押す
3. Organizationを選ぶ
4. Project nameを決める
   - 例: `zatsugaku-app`
5. Database Passwordを設定する
   - 必ずどこかに安全に控える
   - GitHubやLINEに貼らない
6. Regionを選ぶ
   - 日本から使うなら、近いリージョンを選ぶ
7. `Create new project`

プロジェクト作成後、数分待つ。

---

## 2. APIキーを確認する

Dashboardで以下を確認する。

```text
Project URL
Publishable key
Secret key
```

場所の目安:

```text
Project Settings
→ API Keys
```

または、プロジェクト画面の `Connect` から確認できる。

### フロントに渡すもの

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### バックエンドだけが使うもの

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
```

古いSupabase画面で `anon` / `service_role` と表示される場合は、以下の対応でよい。

```text
Publishable key = anon key
Secret key = service_role key
```

---

## 3. Auth設定

Dashboardで以下を見る。

```text
Authentication
→ Providers
→ Email
```

やること。

1. Email providerを有効にする
2. メールアドレス + パスワードログインを使えるようにする
3. MVP/demoでは、メール確認をOFFにするか、確認メールを使うか決める

おすすめ:

```text
開発中・デモ用:
メール確認OFF

本番運用を意識する場合:
メール確認ON
```

メール確認ONのままだと、登録後に確認メールを踏まないとログインできず、デモで詰まりやすい。

---

## 4. Redirect URL設定

Dashboardで以下を見る。

```text
Authentication
→ URL Configuration
```

開発中は以下を入れる。

```text
Site URL:
http://localhost:3000

Redirect URLs:
http://localhost:3000/**
```

もしVercelにデプロイする場合は、あとでVercelのURLも追加する。

---

## 5. DBテーブル作成

Dashboardで以下を開く。

```text
SQL Editor
→ New query
```

以下を実行する。

```sql
create extension if not exists "pgcrypto";

create table if not exists public.trivia (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  genre text not null check (
    genre in (
      '自然・科学・宇宙',
      '生き物',
      '人体・医学',
      '歴史・偉人',
      '言葉・語源',
      '食べ物・料理',
      '地理・世界の文化',
      '生活・日常の疑問',
      'エンタメ・芸術・スポーツ',
      'サブカル・マニアック'
    )
  ),
  tags text[] not null default '{}',
  source_title text not null,
  source_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trivia_id uuid not null references public.trivia(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, trivia_id)
);

create table if not exists public.view_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trivia_id uuid not null references public.trivia(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, trivia_id)
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  genre text not null check (
    genre in (
      '自然・科学・宇宙',
      '生き物',
      '人体・医学',
      '歴史・偉人',
      '言葉・語源',
      '食べ物・料理',
      '地理・世界の文化',
      '生活・日常の疑問',
      'エンタメ・芸術・スポーツ',
      'サブカル・マニアック'
    )
  ),
  created_at timestamptz not null default now(),
  unique (user_id, genre)
);

create index if not exists trivia_genre_idx on public.trivia (genre);
create index if not exists bookmarks_user_id_idx on public.bookmarks (user_id);
create index if not exists view_history_user_id_idx on public.view_history (user_id);
create index if not exists user_preferences_user_id_idx on public.user_preferences (user_id);
```

---

## 6. RLS設定

同じくSQL Editorで以下を実行する。

```sql
alter table public.trivia enable row level security;
alter table public.bookmarks enable row level security;
alter table public.view_history enable row level security;
alter table public.user_preferences enable row level security;

create policy "Anyone can read trivia"
on public.trivia
for select
using (true);

create policy "Users can read own bookmarks"
on public.bookmarks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own bookmarks"
on public.bookmarks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete own bookmarks"
on public.bookmarks
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own view history"
on public.view_history
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own view history"
on public.view_history
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own view history"
on public.view_history
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read own preferences"
on public.user_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own preferences"
on public.user_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own preferences"
on public.user_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own preferences"
on public.user_preferences
for delete
to authenticated
using ((select auth.uid()) = user_id);
```

### 重要

`trivia` のinsert/update/deleteポリシーは作らない。

理由:

```text
一般ユーザーが雑学を勝手にDBへ追加できないようにするため。
雑学生成と保存はバックエンド側で行う。
```

---

## 7. 事前データを入れる

AIが失敗した時のために、最低10〜20件の雑学を先に入れる。

SQL例:

```sql
insert into public.trivia (
  title,
  summary,
  genre,
  tags,
  source_title,
  source_url
) values
(
  'マンホールが丸い理由',
  'マンホールの蓋が丸いのは、向きを変えても穴に落ちにくい形だからだと言われています。四角形だと斜めにすると落ちる可能性がありますが、円形はどの向きでも幅が変わりません。',
  '生活・日常の疑問',
  array['生活', '構造', '街'],
  'Wikipedia',
  'https://ja.wikipedia.org/wiki/%E3%83%9E%E3%83%B3%E3%83%9B%E3%83%BC%E3%83%AB'
);
```

最初は1件でテストし、うまく入ったら10〜20件入れる。

---

## 8. フロント担当に渡す.env

フロント担当には以下だけ渡す。

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

絶対に `SUPABASE_SECRET_KEY` は渡さない。

---

## 9. バックエンド担当に渡す.env

バックエンド担当には以下を渡す。

```text
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
GEMINI_API_KEY=...
FRONTEND_ORIGIN=http://localhost:3000
```

`SUPABASE_SECRET_KEY` と `GEMINI_API_KEY` はGitHubに置かない。

---

## 10. 動作確認

最低限、以下を確認する。

### Supabase画面で確認

- `trivia` テーブルがある
- `bookmarks` テーブルがある
- `view_history` テーブルがある
- `user_preferences` テーブルがある
- `trivia` に事前データが1件以上ある
- AuthenticationのUsersにテストユーザーを作れる

### アプリ側で確認

- 未ログインでも雑学一覧を読める
- ログインできる
- ログインユーザーだけブックマークできる
- 他人のブックマークは見えない
- ジャンル選択が保存できる

---

## 11. チームへの共有文

Supabase作成後、チームには以下を共有する。

```text
Supabaseプロジェクトを作成しました。

フロント担当:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
を渡します。

バックエンド担当:
SUPABASE_URL
SUPABASE_SECRET_KEY
を渡します。

注意:
SUPABASE_SECRET_KEYは絶対にGitHubへ置かないでください。

DB:
trivia / bookmarks / view_history / user_preferences
を作成済みです。
```

---

## 12. 参考

- Supabase APIキー: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Password Auth: https://supabase.com/docs/guides/auth/passwords
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Next.js SSR client: https://supabase.com/docs/guides/auth/server-side/creating-a-client
