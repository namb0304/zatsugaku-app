@AGENTS.md

# フロントエンド向け指示

ルートの`CLAUDE.md`とプロジェクト資料を正式な仕様として扱う。

## 既存UI

- タスクで明示的に変更を求められない限り、現在のレイアウト、スワイプ操作、
  キーボード操作、カードアニメーションを維持する。
- API接続中に、動作している画面を再設計しない。モックデータを段階的に置き換える。
- フィード項目の`id`はUUID文字列として扱う。

## データと認証

- 以下の環境変数を使用する。
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_API_BASE_URL`
- フロントコードで利用できるのはSupabaseのPublishable keyだけ。
- Supabase Authはフロントエンドから直接利用する。
- 保護されたFastAPIエンドポイントには、ログインユーザーのアクセストークンを
  `Authorization: Bearer <token>`として送信する。
- `SUPABASE_SECRET_KEY`と`GEMINI_API_KEY`を送信・保存しない。
- ゲストの視聴済み雑学IDは`localStorage`へ保存する。

## Next.js

- このプロジェクトはNext.js 16を使用する。記憶だけで実装せず、
  `node_modules/next/dist/docs/`にある対応バージョンの資料を確認する。
- Client Componentは、ブラウザ状態やイベント処理が必要な画面・部品に限定する。
- 各ページでクライアントを個別生成せず、Supabaseブラウザクライアントと
  FastAPIリクエスト処理を共通化する。
- タスクで必要になるまでmiddleware/proxy方式の認証制御を追加しない。
  追加する場合はNext.js 16での現在の動作を確認する。

## UIの状態

API接続する各画面で以下を処理する。

- 初回読み込み
- 空データ
- 回復可能なAPIエラー
- 保護された操作を未ログインで行った場合
- 更新処理中の無効状態

作業完了前に以下を実行する。

```bash
npm run lint
npm run build
```
