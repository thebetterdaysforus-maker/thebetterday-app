// src/utils/timeUtils.ts
/**
 * 시간대 관련 유틸리티 함수들
 * 프로젝트 전체에서 일관된 시간 처리를 위한 공통 함수
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// 지원하는 시간대 목록
export const SUPPORTED_TIMEZONES = {
  'Asia/Seoul': { name: '한국 (KST)', offset: '+09:00' },
  'Asia/Tokyo': { name: '일본 (JST)', offset: '+09:00' },
  'Asia/Shanghai': { name: '중국 (CST)', offset: '+08:00' },
  'America/New_York': { name: '미국 동부 (EST/EDT)', offset: '-05:00/-04:00' },
  'America/Los_Angeles': { name: '미국 서부 (PST/PDT)', offset: '-08:00/-07:00' },
  'Europe/London': { name: '영국 (GMT/BST)', offset: '+00:00/+01:00' },
};

let currentTimeZone = 'Asia/Seoul'; // 기본값

/**
 * 현재 설정된 시간대 가져오기
 */
export async function getCurrentTimeZone(): Promise<string> {
  try {
    const savedTimeZone = await AsyncStorage.getItem('userTimeZone');
    if (savedTimeZone && SUPPORTED_TIMEZONES[savedTimeZone as keyof typeof SUPPORTED_TIMEZONES]) {
      currentTimeZone = savedTimeZone;
    }
  } catch (error) {
    console.log('시간대 설정 로드 실패, 기본값 사용:', error);
  }
  return currentTimeZone;
}

/**
 * 시간대 설정 저장
 */
export async function setCurrentTimeZone(timeZone: string): Promise<void> {
  try {
    if (SUPPORTED_TIMEZONES[timeZone as keyof typeof SUPPORTED_TIMEZONES]) {
      currentTimeZone = timeZone;
      await AsyncStorage.setItem('userTimeZone', timeZone);
    }
  } catch (error) {
    console.error('시간대 설정 저장 실패:', error);
  }
}

/**
 * 현재 설정된 시간대의 시간을 반환
 */
export function getCurrentTime(): Date {
  try {
    // 시간대 유효성 검증
    if (!SUPPORTED_TIMEZONES[currentTimeZone as keyof typeof SUPPORTED_TIMEZONES]) {
      console.warn(`⚠️ 무효한 시간대 감지: ${currentTimeZone}, 기본값(Asia/Seoul) 사용`);
      currentTimeZone = 'Asia/Seoul';
    }
    
    // 설정된 시간대 기준으로 현재 시간 반환
    const now = new Date();
    const timeInSelectedZone = new Date(now.toLocaleString("en-US", { timeZone: currentTimeZone }));
    
    if (__DEV__) {
      console.log('🕐 현재 시간 계산:', {
        설정된시간대: currentTimeZone,
        UTC시간: now.toISOString(),
        해당시간대시간: timeInSelectedZone.toLocaleString(),
      });
    }
    
    return timeInSelectedZone;
  } catch (error) {
    console.error('❌ 시간대 처리 오류:', error);
    console.warn('🔄 기본 시간대(Asia/Seoul)로 폴백');
    
    // 폴백: 한국 시간 반환
    return getKoreaTime();
  }
}

/**
 * 현재 한국 시간을 반환 (하위 호환성)
 */
export function getKoreaTime(): Date {
  const now = new Date();
  
  // 한국 시간대로 변환
  const koreaOffset = 9 * 60; // KST는 UTC+9
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const koreaTime = new Date(utcTime + (koreaOffset * 60000));
  
  return koreaTime;
}

/**
 * 현재 시간대 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getToday(): string {
  const currentTime = getCurrentTime();
  return currentTime.toISOString().slice(0, 10);
}

/**
 * 현재 시간대 기준 내일 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTomorrow(): string {
  const currentTime = getCurrentTime();
  const tomorrow = new Date(currentTime.getTime() + 86400000);
  return tomorrow.toISOString().slice(0, 10);
}

/**
 * 한국 시간 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환 (하위 호환성)
 */
export function getTodayKorea(): string {
  // 강제로 현재 한국 시간 계산
  const now = new Date();
  const koreaOffset = 9 * 60; // KST는 UTC+9
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const koreaTime = new Date(utcTime + (koreaOffset * 60000));
  
  if (__DEV__) {
    console.log('🕐 getTodayKorea 호출:', {
      UTC시간: now.toISOString(),
      한국시간: koreaTime.toISOString(),
      반환값: koreaTime.toISOString().slice(0, 10)
    });
  }
  
  return koreaTime.toISOString().slice(0, 10);
}

/**
 * 한국 시간 기준 내일 날짜를 YYYY-MM-DD 형식으로 반환 (하위 호환성)
 */
export function getTomorrowKorea(): string {
  // 강제로 현재 한국 시간 계산
  const now = new Date();
  const koreaOffset = 9 * 60; // KST는 UTC+9
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const koreaTime = new Date(utcTime + (koreaOffset * 60000));
  const tomorrow = new Date(koreaTime.getTime() + 86400000);
  
  if (__DEV__) {
    console.log('🕐 getTomorrowKorea 호출:', {
      UTC시간: now.toISOString(),
      한국시간: koreaTime.toISOString(),
      내일: tomorrow.toISOString(),
      반환값: tomorrow.toISOString().slice(0, 10)
    });
  }
  
  return tomorrow.toISOString().slice(0, 10);
}

/**
 * 주어진 날짜가 현재 시간대 기준 오늘인지 확인
 */
export function isToday(dateString: string): boolean {
  return dateString.startsWith(getToday());
}

/**
 * 주어진 날짜가 현재 시간대 기준 내일인지 확인
 */
export function isTomorrow(dateString: string): boolean {
  return dateString.startsWith(getTomorrow());
}

/**
 * 주어진 날짜가 한국 시간 기준 오늘인지 확인 (하위 호환성)
 */
export function isTodayKorea(dateString: string): boolean {
  return dateString.startsWith(getTodayKorea());
}

/**
 * 주어진 날짜가 한국 시간 기준 내일인지 확인 (하위 호환성)
 */
export function isTomorrowKorea(dateString: string): boolean {
  return dateString.startsWith(getTomorrowKorea());
}

/**
 * Date 객체를 현재 시간대로 변환
 */
export function toCurrentTime(date: Date): Date {
  const timeString = date.toLocaleString("en-CA", {
    timeZone: currentTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  return new Date(timeString.replace(", ", "T"));
}

/**
 * 현재 시간대 기준으로 날짜 문자열 생성 (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  const currentDate = toCurrentTime(date);
  return currentDate.toISOString().slice(0, 10);
}

/**
 * Date 객체를 한국 시간으로 변환 (하위 호환성)
 */
export function toKoreaTime(date: Date): Date {
  const koreaTimeString = date.toLocaleString("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  return new Date(koreaTimeString.replace(", ", "T"));
}

/**
 * 한국 시간 기준으로 날짜 문자열 생성 (YYYY-MM-DD) (하위 호환성)
 */
export function formatDateKorea(date: Date): string {
  const koreaDate = toKoreaTime(date);
  return koreaDate.toISOString().slice(0, 10);
}
