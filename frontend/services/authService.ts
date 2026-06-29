import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// モジュール評価時ではなく初回呼び出し時にクライアントを生成する
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) {
      throw new Error("認証サービスが設定されていません");
    }
    _client = createClient(url, publishableKey);
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

  signUp: async (email: string, password: string) => {
    const { data, error } = await getClient().auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  getUser: async () => {
    const { data, error } = await getClient().auth.getUser();
    if (error) return null;
    return data.user;
  },

  getAccessToken: async (): Promise<string | null> => {
    const { data, error } = await getClient().auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  },

  signOut: async () => {
    const { error } = await getClient().auth.signOut();
    if (error) throw error;
  },
};
