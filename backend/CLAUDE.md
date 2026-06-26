# バックエンド向け指示

ルートの`CLAUDE.md`とプロジェクト資料を正式な仕様として扱う。

## 推奨構成

不要な抽象化を増やさず、責務を以下のように分ける。

```text
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── dependencies.py
│   ├── models/
│   ├── repositories/
│   ├── routers/
│   └── services/
├── data/
├── tests/
├── .env.example
└── requirements.txt
```

実装規模が小さく、明らかに簡潔になる場合のみ、より小さい構成へ調整してよい。

## 設定

- 型付きの設定オブジェクトから環境変数を読み込む。
- 必須の環境変数:
  - `SUPABASE_URL`
  - `SUPABASE_SECRET_KEY`
  - `GEMINI_API_KEY`
  - `FRONTEND_ORIGIN`
- `GEMINI_MODEL`はGemini接続を実装する段階で追加し、安全な初期値を文書化する。
- ビジネスロジックの各所で直接環境変数を読まない。

## 責務の分離

- RouterはHTTP入力の検証とレスポンス変換を担当する。
- Serviceはフィード、パーソナライズ、生成処理を担当する。
- RepositoryはSupabaseへのクエリを担当する。
- Pydanticモデルで外部・内部のデータ仕様を定義する。
- 許可する10ジャンルの一覧を一か所に集約する。

## 認証

- 公開フィードはユーザートークンなしでも利用できる。
- ブックマークとジャンル設定には有効なSupabaseアクセストークンが必要。
- Supabase Authでトークンを検証し、ユーザーIDを取得する。
- クライアントから渡された`user_id`を信用しない。
- Secret keyを使用する場合でも、ユーザー所有データを必ずユーザーIDで絞り込む。

## Gemini

- 非推奨のGeminiパッケージではなく、現在保守されているGoogle Gen AI SDKを使用する。
- Gemini処理を独立したServiceにし、テストで差し替えられるようにする。
- 生成されたJSONをPydanticで検証してからSupabaseへ書き込む。
- 正常な生成結果は必ず10件とする。
- `trivia`テーブルに存在する列だけを保存する。
- `confidence_note`は受け取ってもよいが、現在のDBには保存しない。
- タイムアウト、不正JSON、不正URL、対象外ジャンル、件数違い、
  レート制限、権限エラーを制御された生成失敗として扱う。
- 生成失敗時は、DB内の既存雑学または同梱した事前データを返す。

## テスト

- `pytest`を使用する。
- 単体テストとAPIテストではSupabaseとGeminiをモックする。
- 正常系、未認証、空データ、外部サービス失敗を確認する。
- 通常のテストに実際の認証情報を要求しない。

作業完了前に以下を実行する。

```bash
pytest
```
