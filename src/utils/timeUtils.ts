// src/utils/timeUtils.ts
/**
 * 시간대 관련 유틸리티 함수들
 * 프로젝트 전체에서 일관된 시간 처리를 위한 공통 함수
 */

// 한국 시간 전용 시스템 - 시간대 설정 기능 제거

/**
 * 현재 설정된 시간대의 시간을 반환
 */
export function getCurrentTime(): Date {
  // 한국 시간으로 고정 (시간대 설정 기능 제거)
  return getKoreaTime();
}

/**
 * 현재 한국 시간을 반환 (UTC+9 고정)
 */
export function getKoreaTime(): Date {
  const now = new Date();
  
  // UTC 오프셋 방식으로 안정적인 한국 시간 계산
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const koreaTime = new Date(utcTime + (9 * 60 * 60 * 1000));
  
  return koreaTime;
}

/**
 * 현재 시간대 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * @deprecated getTodayKorea() 사용 권장
 */
export function getToday(): string {
  return getTodayKorea();
}

/**
 * 현재 시간대 기준 내일 날짜를 YYYY-MM-DD 형식으로 반환
 * @deprecated getTomorrowKorea() 사용 권장
 */
export function getTomorrow(): string {
  return getTomorrowKorea();
}

/**
 * 한국 시간 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayKorea(): string {
  // UTC 오프셋 방식으로 안정적인 한국 시간 계산
  const koreaTime = getKoreaTime();
  
  if (__DEV__) {
    console.log('🕐 getTodayKorea 호출:', {
      한국시간: koreaTime.toISOString(),
      반환값: koreaTime.toISOString().slice(0, 10)
    });
  }
  
  return koreaTime.toISOString().slice(0, 10);
}

/**
 * 🔥 APK 정확한 D+1 한국 시간 내일 날짜 계산
 */
export function getTomorrowKorea(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const koreaTime = new Date(utc + (9 * 60 * 60 * 1000));
  
  // 정확한 내일 계산
  const tomorrow = new Date(koreaTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const result = tomorrow.toISOString().slice(0, 10);
  
  if (__DEV__) {
    console.log('🇰🇷 APK D+1 계산:', {
      현재한국: koreaTime.toLocaleString('ko-KR'),
      내일한국: tomorrow.toLocaleString('ko-KR'),
      결과: result
    });
  }
  
  return result;
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
  // 한국 시간으로 고정 변환
  return toKoreaTime(date);
}

/**
 * 한국 시간 기준으로 날짜 문자열 생성 (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  const koreaDate = toKoreaTime(date);
  return koreaDate.toISOString().slice(0, 10);
}

/**
 * Date 객체를 한국 시간으로 변환 (하위 호환성)
 */
export function toKoreaTime(date: Date): Date {
  // UTC 오프셋 방식으로 안정적인 한국 시간 변환
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const koreaTime = new Date(utcTime + (9 * 60 * 60 * 1000));
  return koreaTime;
}

/**
 * 한국 시간 기준으로 날짜 문자열 생성 (YYYY-MM-DD) (하위 호환성)
 */
export function formatDateKorea(date: Date): string {
  const koreaDate = toKoreaTime(date);
  return koreaDate.toISOString().slice(0, 10);
}