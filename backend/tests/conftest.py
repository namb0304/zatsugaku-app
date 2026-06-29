import os

# テスト用ダミー環境変数。app のインポートより前に設定されるよう
# fixture ではなくモジュールレベルで書く。
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SECRET_KEY"] = "test-secret-key"
os.environ["GEMINI_API_KEY"] = "test-gemini-key"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"
