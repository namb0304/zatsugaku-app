import os

# テスト用ダミー環境変数。app のインポートより前に設定されるよう
# fixture ではなくモジュールレベルで書く。
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SECRET_KEY", "test-secret-key")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("FRONTEND_ORIGIN", "http://localhost:3000")
