import { getTodayKorea } from './timeUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 승리 연속 뱃지 시스템
export interface StreakBadge {
  level: number; // 1-12
  category: string; // 건축, 나비, 눈, 도자기, 별, 산맥, 씨앗, 유리세공, 출판
  iconPath: string;
}

// 뱃지 카테고리 (랜덤 선택용)
export const BADGE_CATEGORIES = [
  '건축', '나비', '눈', '도자기', '별', '산맥', '씨앗', '유리세공', '출판'
];

// 일별 승리 연속 기록 관리
export class DailyStreakManager {
  private static instance: DailyStreakManager;
  private dailyStreaks: Map<string, number> = new Map(); // 날짜별 연속 승리 수
  private dailyBadgeCategory: Map<string, string> = new Map(); // 날짜별 선택된 카테고리

  static getInstance(): DailyStreakManager {
    if (!DailyStreakManager.instance) {
      DailyStreakManager.instance = new DailyStreakManager();
    }
    return DailyStreakManager.instance;
  }

  // 당일 연속 승리 수 가져오기
  getTodayStreak(): number {
    const today = getTodayKorea();
    return this.dailyStreaks.get(today) || 0;
  }

  // 당일 뱃지 카테고리 가져오기 (없으면 랜덤 선택 후 저장)
  async getTodayBadgeCategory(): Promise<string> {
    const today = getTodayKorea();
    const storageKey = `badge_category_${today}`;
    
    console.log(`🔍 뱃지 카테고리 요청: ${today}, 메모리 캐시: ${this.dailyBadgeCategory.has(today) ? this.dailyBadgeCategory.get(today) : '없음'}`);
    
    // 메모리에서 먼저 확인
    if (this.dailyBadgeCategory.has(today)) {
      const cached = this.dailyBadgeCategory.get(today)!;
      console.log(`💾 메모리에서 뱃지 카테고리 반환: ${cached}`);
      return cached;
    }
    
    try {
      // AsyncStorage에서 확인
      const storedCategory = await AsyncStorage.getItem(storageKey);
      console.log(`💾 AsyncStorage에서 읽은 카테고리: ${storedCategory}`);
      
      if (storedCategory && BADGE_CATEGORIES.includes(storedCategory)) {
        this.dailyBadgeCategory.set(today, storedCategory);
        console.log(`📱 오늘의 뱃지 카테고리 복원: ${storedCategory}`);
        return storedCategory;
      }
    } catch (error) {
      console.warn('뱃지 카테고리 읽기 실패:', error);
    }
    
    // 새로운 랜덤 카테고리 생성 및 저장
    const randomCategory = BADGE_CATEGORIES[Math.floor(Math.random() * BADGE_CATEGORIES.length)];
    this.dailyBadgeCategory.set(today, randomCategory);
    
    try {
      await AsyncStorage.setItem(storageKey, randomCategory);
      console.log(`🎲 오늘의 새 뱃지 카테고리 설정: ${randomCategory} (AsyncStorage 저장)`);
    } catch (error) {
      console.warn('뱃지 카테고리 저장 실패:', error);
    }
    
    return randomCategory;
  }

  // 승리 시 연속 승리 수 증가
  async incrementStreak(): Promise<StreakBadge | null> {
    const today = getTodayKorea();
    const currentStreak = this.getTodayStreak();
    const newStreak = Math.min(currentStreak + 1, 12); // 최대 12연승
    
    this.dailyStreaks.set(today, newStreak);
    
    // 뱃지 정보 반환
    const category = await this.getTodayBadgeCategory();
    return {
      level: newStreak,
      category: category,
      iconPath: this.getBadgeIconPath(newStreak, category)
    };
  }

  // 패배 시 연속 승리 수 감소 (최소 0)
  decrementStreak(): number {
    const today = getTodayKorea();
    const currentStreak = this.getTodayStreak();
    const newStreak = Math.max(currentStreak - 1, 0);
    
    this.dailyStreaks.set(today, newStreak);
    return newStreak;
  }

  // 패배 시 호출 - 뱃지 정보 반환 (onDefeat 별칭)
  async onDefeat(): Promise<StreakBadge | null> {
    const newStreak = this.decrementStreak();
    
    if (newStreak === 0) {
      return null; // 연승이 0이면 뱃지 없음
    }
    
    const category = await this.getTodayBadgeCategory();
    return {
      level: newStreak,
      category: category,
      iconPath: this.getBadgeIconPath(newStreak, category)
    };
  }

  // 다음 승리 시 받을 뱃지 정보
  async getNextBadge(): Promise<StreakBadge | null> {
    const currentStreak = this.getTodayStreak();
    
    if (currentStreak >= 12) {
      return null; // 최대 달성
    }
    
    const nextLevel = currentStreak + 1;
    const category = await this.getTodayBadgeCategory();
    return {
      level: nextLevel,
      category: category,
      iconPath: this.getBadgeIconPath(nextLevel, category)
    };
  }

  // 뱃지 아이콘 경로 생성
  getBadgeIconPath(level: number, category: string): string {
    // 12 이상은 12와 동일한 아이콘 사용
    const iconLevel = Math.min(level, 12);
    return `assets/badges/${category}_${iconLevel}.png`;
  }

  // 날짜 변경 시 초기화 (자정에 호출)
  resetForNewDay(): void {
    const today = getTodayKorea();
    
    // 어제 데이터는 유지하고 오늘 데이터만 초기화
    this.dailyStreaks.set(today, 0);
    
    // 새로운 날을 위한 랜덤 카테고리 선택
    const randomCategory = BADGE_CATEGORIES[Math.floor(Math.random() * BADGE_CATEGORIES.length)];
    this.dailyBadgeCategory.set(today, randomCategory);
  }

  // 현재 상태 디버깅용
  getDebugInfo() {
    const today = getTodayKorea();
    return {
      today,
      streak: this.getTodayStreak(),
      category: this.getTodayBadgeCategory(),
      nextBadge: this.getNextBadge()
    };
  }
}

// 전역 인스턴스
export const streakManager = DailyStreakManager.getInstance();