import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// モジュール評価時ではなく初回呼び出し時にクライアントを生成する
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return _client;
}

export const authService = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await getClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  getUser: async () => {
    const { data } = await getClient().auth.getUser();
    return data.user;
  },

  signOut: async () => {
    await getClient().auth.signOut();
  },
};