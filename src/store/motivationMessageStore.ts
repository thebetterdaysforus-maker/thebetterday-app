import { create } from "zustand";
import { supabase } from "../supabaseClient";
// date-fns 제거하고 네이티브 Date 사용

export interface MotivationMessage {
  id: string;
  performance_level: "base" | "bad" | "soso" | "good" | "transcend";
  title: string;
  message: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type PerformanceLevel = "base" | "bad" | "soso" | "good" | "transcend";

interface MotivationMessageState {
  messages: MotivationMessage[];
  currentMessage: MotivationMessage | null;
  loading: boolean;

  // 데이터 가져오기
  fetchMessages: () => Promise<void>;

  // 전날 수행률 계산 및 메시지 선택
  calculateYesterdayPerformance: () => Promise<PerformanceLevel>;
  getTodaysMotivationMessage: () => Promise<void>;

  // 수행률 레벨 결정
  getPerformanceLevel: (successRate: number) => PerformanceLevel;

  // 메시지 랜덤 선택
  getRandomMessageForLevel: (
    level: PerformanceLevel,
  ) => MotivationMessage | null;
}

export const useMotivationMessageStore = create<MotivationMessageState>(
  (set, get) => ({
    messages: [],
    currentMessage: null,
    loading: false,

    fetchMessages: async () => {
      try {
        set({ loading: true });

        const { data, error } = await supabase
          .from("motivation_messages")
          .select("*")
          .eq("is_active", true)
          .order("performance_level", { ascending: true })
          .order("display_order", { ascending: true });

        if (error) throw error;

        set({ messages: data || [], loading: false });
      } catch (error) {
        console.error("응원 메시지 가져오기 실패:", error);
        set({ loading: false });
      }
    },

    calculateYesterdayPerformance: async (): Promise<PerformanceLevel> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return "base";

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

        // 전날 목표들 가져오기
        const { data: goals, error } = await supabase
          .from("goals")
          .select("status")
          .eq("user_id", session.user.id)
          .gte("target_time", `${yesterdayStr}T00:00:00Z`)
          .lt("target_time", `${yesterdayStr}T23:59:59Z`);

        if (error) throw error;

        if (!goals || goals.length === 0) return "base";

        const totalGoals = goals.length;
        const successGoals = goals.filter((g) => g.status === "success").length;
        const successRate = (successGoals / totalGoals) * 100;

        return get().getPerformanceLevel(successRate);
      } catch (error) {
        console.error("전날 수행률 계산 실패:", error);
        return "base";
      }
    },

    getTodaysMotivationMessage: async () => {
      try {
        const performanceLevel = await get().calculateYesterdayPerformance();
        const message = get().getRandomMessageForLevel(performanceLevel);

        set({ currentMessage: message });
      } catch (error) {
        console.error("오늘의 응원 메시지 가져오기 실패:", error);
      }
    },

    getPerformanceLevel: (successRate: number): PerformanceLevel => {
      if (successRate === 100) return "transcend";
      if (successRate >= 70) return "good";
      if (successRate >= 31) return "soso";
      return "bad";
    },

    getRandomMessageForLevel: (
      level: PerformanceLevel,
    ): MotivationMessage | null => {
      const { messages } = get();
      const levelMessages = messages.filter(
        (m) => m.performance_level === level,
      );

      if (levelMessages.length === 0) {
        // 각 레벨별 fallback 메시지 반환
        const fallbackMessages = {
          base: {
            id: "base-fallback",
            performance_level: "base" as const,
            title: "새로운 시작",
            message:
              "미래를 위해 걷는 나그네이며, 더 나은 미래를 고민하는 나의 벗이며, 알 수 없는 미래를 위해 현재를 건네는 철학자이며, 위대한 모험가인 여러분을 응원합니다.",
            is_active: true,
            display_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          bad: {
            id: "bad-fallback",
            performance_level: "bad" as const,
            title: "다시 시작하는 용기",
            message:
              "어제는 힘들었지만 오늘은 새로운 시작입니다. 작은 목표부터 차근차근 시작해보세요.",
            is_active: true,
            display_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          soso: {
            id: "soso-fallback",
            performance_level: "soso" as const,
            title: "조금씩 나아지고 있어요",
            message:
              "어제보다 조금 더 나은 하루를 만들어가고 있습니다. 꾸준함이 힘이에요.",
            is_active: true,
            display_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          good: {
            id: "good-fallback",
            performance_level: "good" as const,
            title: "훌륭한 성과예요!",
            message:
              "어제 정말 잘 해냈습니다! 이런 노력이 계속되면 분명 큰 변화를 만들 수 있을 거예요.",
            is_active: true,
            display_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          transcend: {
            id: "transcend-fallback",
            performance_level: "transcend" as const,
            title: "완벽한 하루였어요!",
            message:
              "어제는 정말 완벽했습니다! 이런 날들이 쌓여 큰 성취를 만들어갑니다.",
            is_active: true,
            display_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };

        return fallbackMessages[level] || fallbackMessages.base;
      }

      const randomIndex = Math.floor(Math.random() * levelMessages.length);
      return levelMessages[randomIndex];
    },
  }),
);
