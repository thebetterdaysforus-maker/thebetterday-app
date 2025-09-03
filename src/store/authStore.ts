// src/store/authStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { supabase } from "../supabaseClient";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  isAutoLoginEnabled: boolean;
  enableAutoLogin: () => Promise<void>;
  disableAutoLogin: () => Promise<void>;
  checkAutoLogin: () => Promise<boolean>;
  performAutoLogin: () => Promise<boolean>;
  signInWithGoogle: () => Promise<{
    success: boolean;
    error?: string;
    isNewUser?: boolean;
  }>; // ✅ 추가
  signInAsGuest: () => Promise<{ success: boolean; error?: string }>;
  backupGuestSession: () => Promise<void>;
  restoreGuestSession: () => Promise<boolean>;
  clearGuestBackup: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAutoLoginEnabled: true,

  enableAutoLogin: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await AsyncStorage.setItem("auto_login", "true");
        await AsyncStorage.setItem("user_session", JSON.stringify(session));
        set({ isAutoLoginEnabled: true });
      }
    } catch (error) {
      if (__DEV__) console.error("자동 로그인 활성화 실패:", error);
    }
  },

  disableAutoLogin: async () => {
    try {
      await AsyncStorage.removeItem("auto_login");
      await AsyncStorage.removeItem("user_session");
      set({ isAutoLoginEnabled: false });
    } catch (error) {
      if (__DEV__) console.error("자동 로그인 비활성화 실패:", error);
    }
  },

  checkAutoLogin: async () => {
    try {
      const autoLogin = await AsyncStorage.getItem("auto_login");
      const enabled = autoLogin !== "false";
      set({ isAutoLoginEnabled: enabled });
      return enabled;
    } catch (error) {
      console.error("자동 로그인 확인 실패:", error);
      return true;
    }
  },

  performAutoLogin: async () => {
    try {
      const autoLogin = await AsyncStorage.getItem("auto_login");
      if (autoLogin === "false") return false;

      const savedSession = await AsyncStorage.getItem("user_session");
      if (!savedSession) return false;

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (currentSession) return true;

      try {
        const parsedSession = JSON.parse(savedSession);
        const { data, error } = await supabase.auth.setSession({
          access_token: parsedSession.access_token,
          refresh_token: parsedSession.refresh_token,
        });

        if (error || !data?.session) {
          await AsyncStorage.removeItem("user_session");
          return false;
        }
        return true;
      } catch (err) {
        await AsyncStorage.removeItem("user_session");
        await AsyncStorage.removeItem("auto_login");
        return false;
      }
    } catch (error) {
      console.error("❌ 자동 로그인 실패:", error);
      return false;
    }
  },

  // ✅ Google OAuth 로그인 (추가)
  signInWithGoogle: async () => {
    try {
      // Expo Go → https://auth.expo.io/..., APK → com.thebetterday.app://oauth
      const redirectTo = makeRedirectUri({
        scheme: "com.thebetterday.app",
        path: "oauth",
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error || !data?.url) {
        return {
          success: false,
          error: error?.message || "OAuth URL 생성 실패",
        };
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      if (result.type !== "success") {
        return { success: false, error: "Google 로그인 취소 또는 실패" };
      }

      // Supabase 세션 확인 (최대 20초 재시도)
      for (let i = 0; i < 40; i++) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const session = sessionData.session;

          // 프로필 유무 확인
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          const isNewUser = !profile;

          await AsyncStorage.setItem("auto_login", "true");
          await AsyncStorage.setItem("user_session", JSON.stringify(session));

          return { success: true, isNewUser };
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      return { success: false, error: "세션을 확인하지 못했습니다" };
    } catch (e: any) {
      console.error("❌ Google 로그인 오류:", e);
      return { success: false, error: e.message || "Google 로그인 중 오류" };
    }
  },

  signInAsGuest: async () => {
    try {
      console.log("🚀 게스트 로그인 시작...");
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error || !data.session) {
        return {
          success: false,
          error: error?.message || "게스트 세션 생성 실패",
        };
      }

      await AsyncStorage.setItem("guest_session", JSON.stringify(data.session));
      await AsyncStorage.setItem("auto_login", "true");
      await AsyncStorage.setItem("user_session", JSON.stringify(data.session));

      return { success: true };
    } catch (error) {
      console.error("❌ 게스트 로그인 오류:", error);
      return { success: false, error: "게스트 로그인 중 오류가 발생했습니다." };
    }
  },

  backupGuestSession: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.is_anonymous) {
        await AsyncStorage.setItem(
          "guest_session_backup",
          JSON.stringify(session),
        );
      }
    } catch (error) {
      console.error("❌ 게스트 세션 백업 실패:", error);
    }
  },

  restoreGuestSession: async () => {
    try {
      const backupSession = await AsyncStorage.getItem("guest_session_backup");
      if (!backupSession) return false;

      const session = JSON.parse(backupSession);
      const { data, error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (!error && data?.session) {
        await AsyncStorage.setItem(
          "guest_session",
          JSON.stringify(data.session),
        );
        await AsyncStorage.removeItem("guest_session_backup");
        return true;
      }
      await AsyncStorage.removeItem("guest_session_backup");
      return false;
    } catch (error) {
      console.error("❌ 게스트 세션 복원 오류:", error);
      return false;
    }
  },

  clearGuestBackup: async () => {
    try {
      await AsyncStorage.removeItem("guest_session_backup");
    } catch (error) {
      console.error("❌ 게스트 백업 삭제 실패:", error);
    }
  },
}));

export default useAuthStore;
