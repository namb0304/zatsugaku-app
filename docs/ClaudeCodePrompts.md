# Claude Code実装プロンプト

> 上から1つずつClaude Codeへ渡す。一度に複数フェーズを依頼しない。
> 各フェーズの完了後に差分とテスト結果をCodexへ共有してレビューする。

---

## 共通ルール

各プロンプトの冒頭で、Claude Codeに次を守らせる。

```text
リポジトリのCLAUDE.md、作業ディレクトリにあるCLAUDE.md、
docs/Requirements.md、docs/Mvp.md、docs/Architecture.mdを先に読んでください。
git statusを確認し、既存の未コミット変更を消さないでください。
今回は指定したフェーズだけ実装してください。
実装前に変更予定ファイルと方針を短く示し、実装後にテストを実行してください。
コミット、push、デプロイ、Supabaseのリモート設定変更はしないでください。
最後に変更ファイル、実行コマンド、テスト結果、残課題を報告してください。
```

---

## Phase 1: FastAPIの土台

```text
FastAPIバックエンドの最小構成を実装してください。

要件:
- backend/app/main.pyを起点にする
- GET /health が {"status": "ok"} を返す
- FRONTEND_ORIGINを使ってCORSを設定する
- pydantic-settings等で環境変数を一か所に集約する
- requirements.txtとバックエンドの起動手順を用意する
- pytestで/healthのテストを追加する
- この段階ではSupabaseとGeminiを呼ばない

完了条件:
- ローカルでFastAPIが起動できる
- /healthのテストが通る
- 実際の秘密情報をコードやログへ出していない
```

---

## Phase 2: Supabase雑学フィード

```text
Supabaseに保存された雑学を返すフィードAPIを実装してください。

要件:
- TriviaのPydanticモデルを定義する
- IDはUUID文字列として扱う
- Supabaseアクセスをrepositoryへ分離する
- GET /trivia/feed が最大10件を {"items": [...]} で返す
- source_title、source_url、genre、tagsを必ず含める
- DBが空、タイムアウト、接続失敗の場合はbundled fallbackデータを返す
- fallbackデータは10件用意し、10ジャンルとカード形式に一致させる
- DBの取得結果が10件未満の場合は、IDを重複させずfallbackデータで10件まで補う
- 外部通信はタイムアウトを持つ
- SupabaseをモックしたAPIテストを追加する

この段階では:
- Gemini生成を実装しない
- 認証、ブックマーク、パーソナライズを実装しない

完了条件:
- Supabase成功時と失敗時の両方をテストできる
- API障害でもフィードが空白にならない
```

---

## Phase 3: フロントをフィードAPIへ接続

```text
既存のスワイプUIをGET /trivia/feedへ接続してください。

要件:
- 現在のカード配置、横スワイプ、キーボード操作、ドロー演出を維持する
- MOCK_TRIVIA依存をAPIレスポンスへ置き換える
- APIベースURLはNEXT_PUBLIC_API_BASE_URLを使う
- Trivia型とAPIクライアントをページ外へ分離する
- UUID文字列を扱う
- loading、error、empty状態を実装する
- API失敗時もユーザーが再試行できる
- source_urlを安全な外部リンクとして表示する
- guestの視聴済みIDをlocalStorageへ保存し、同一セッションで極力再表示しない

この段階では:
- 認証と実ブックマークはまだ接続しない
- UI全体を作り直さない

完了条件:
- FastAPIから取得したカードを横スワイプできる
- npm run lintとnpm run buildが通る
```

---

## Phase 4: Gemini生成と保存

```text
Geminiによる雑学10件生成をバックエンドへ追加してください。

要件:
- docs/GeminiPromptDraft.mdの形式を使う
- 維持されているGoogle Gen AI SDKを使用する
- Geminiサービスを独立させ、テストでモック可能にする
- 出力をPydanticで検証する
- 10件、タイトル30字以内、概要300字以内、タグ2〜4個、
  10ジャンル内、HTTP(S)情報源URLを検証する
- 検証成功した10件をtriviaへ保存する
- POST /trivia/generateを追加する
- GEMINI_MODELを.env.exampleへ追加する
- Geminiの403、429、タイムアウト、壊れたJSONでは例外を外へ漏らさず、
  DBまたはbundled fallbackを返す
- 現在の実キーが403になる可能性を前提にし、通常テストはモックで行う

注意:
- confidence_noteは受け取ってもDBには保存しない
- Google Search groundingは追加しない
- APIキーやレスポンス全体をログに出さない

完了条件:
- 生成成功、形式不正、403のテストが通る
- Geminiが利用不能でもアプリが動く
```

---

## Phase 5: Supabase Auth

```text
メールアドレスとパスワードによるSupabase Authをフロントへ接続してください。

要件:
- @supabase/supabase-jsを使用する
- Supabaseブラウザクライアントを共通化する
- NEXT_PUBLIC_SUPABASE_URLと
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEYだけを使う
- 最小限の新規登録、ログイン、ログアウトを実装する
- 認証エラーと送信中状態を表示する
- 未ログインでもスワイプ画面へ進める
- ブックマークとマイページの保護に使えるセッション取得処理を用意する
- Next.js 16のローカルドキュメントを確認してから認証制御を選ぶ

この段階では:
- Googleログイン等を追加しない
- Secret keyをフロントへ置かない

完了条件:
- 登録、ログイン、ログアウトが動く
- ゲスト閲覧が壊れていない
- npm run lintとnpm run buildが通る
```

---

## Phase 6: ブックマーク・ジャンル・視聴履歴

```text
ログインユーザー向けの保存機能を実装してください。

バックエンド要件:
- Supabaseアクセストークンを検証してuser_idを取得する
- GET /bookmarks
- POST /bookmarks に {"trivia_id": "..."}
- DELETE /bookmarks/{trivia_id}
- GET /me/preferences
- PUT /me/preferences
- POST /me/view-history に {"trivia_id": "..."}
- user_idをリクエスト本文から受け取らない
- 全クエリを認証ユーザーIDで絞り込む
- 重複ブックマークを安全に扱う

フロント要件:
- 上スワイプとボタンを実ブックマークへ接続する
- 未ログイン時はログイン案内を表示する
- ブックマーク一覧を実データへ置き換える
- マイページのジャンル選択をAPIへ保存する
- ログインユーザーの視聴履歴を保存する
- ゲストの視聴履歴はlocalStorageのままにする

完了条件:
- ユーザー間でデータが混ざらない
- 保存、一覧、解除、ジャンル再表示が動く
- 未認証テストと正常系テストが通る
```

---

## Phase 7: 最小パーソナライズ

```text
合意済みルールによるフィードのパーソナライズを実装してください。

スコア:
- 選択ジャンル: +3
- ブックマークした雑学のgenre: +2
- ブックマークした雑学のtag: +1

実装ルール:
- 選択ジャンルとブックマークジャンルでジャンル優先度を作る
- ブックマークタグは同ジャンル内の候補選択とGeminiの優先タグに使う
- 視聴済みIDは除外する
- 10件に足りない場合はランダムなジャンルで補う
- 未ログインユーザーには通常フィードを返す
- 認証済みでも履歴がなければ通常フィードへ戻す
- スコア計算を純粋関数として分離し、単体テストする

間に合わない場合:
- 選択ジャンル+3だけ反映する実装へ縮小し、その事実を報告する

完了条件:
- 同じ入力から同じスコアが計算される
- データ不足でも必ずフィードが返る
```

---

## Phase 8: MVP通し確認

```text
新機能は追加せず、MVPの通し確認と修正をしてください。

確認シナリオ:
1. 未ログインでアプリを開く
2. 雑学を横スワイプする
3. 情報源を開く
4. 登録またはログインする
5. 雑学をブックマークする
6. ブックマーク一覧で確認して解除する
7. マイページでジャンルを選ぶ
8. フィードへ戻り、選択が反映される
9. Gemini失敗時にもfallback雑学が表示される

実施内容:
- frontendのlintとbuild
- backendのpytest
- APIエラー、空データ、未認証状態の確認
- READMEの起動手順と実際のコマンドを一致させる
- 秘密情報がGit差分に含まれていないことを確認する

最後に:
- MVP完了条件ごとの成否
- 未完了項目
- デモ前に手動確認が必要な項目
を一覧で報告してください。
```

---

## Codexへレビューを依頼するとき

Claude Codeの作業後、次をCodexへ渡す。

```text
Claude CodeがPhase Nを実装しました。
現在のgit diffをレビューしてください。
要件違反、セキュリティ問題、バグ、テスト不足を優先して確認し、
必要なら修正まで行ってください。
```
