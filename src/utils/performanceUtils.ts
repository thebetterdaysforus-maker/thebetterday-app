// src/utils/performanceUtils.ts
// 성능 최적화 및 메모리 관리 유틸리티

import AsyncStorage from '@react-native-async-storage/async-storage';

interface MemoryStatus {
  level: 'low' | 'medium' | 'high' | 'critical';
  shouldOptimize: boolean;
  recommendations: string[];
}

// 대량 데이터 처리를 위한 페이지네이션 설정
export const PAGINATION_CONFIG = {
  GOALS_PER_PAGE: 50,
  MAX_GOALS_IN_MEMORY: 200,
  CACHE_EXPIRE_TIME: 5 * 60 * 1000, // 5분
};

// 메모리 상태 시뮬레이션 (실제 앱에서는 실제 메모리 API 사용)
export const checkMemoryStatus = (): MemoryStatus => {
  // React Native에서는 정확한 메모리 측정이 제한적이므로 
  // 앱 상태와 데이터 크기를 기반으로 추정
  const recommendations: string[] = [];
  
  // 일반적인 메모리 최적화 권장사항
  recommendations.push('오래된 캐시 데이터 정리');
  recommendations.push('미사용 이미지 리소스 해제');
  
  return {
    level: 'low',
    shouldOptimize: false,
    recommendations
  };
};

// 데이터 검증 및 정제
export const validateAndCleanData = <T>(
  data: T[], 
  validator: (item: T) => boolean,
  maxItems?: number
): T[] => {
  if (__DEV__) console.log(`🔍 데이터 검증 시작: ${data.length}개 항목`);
  
  // 유효성 검증
  const validData = data.filter(validator);
  
  if (validData.length !== data.length) {
    if (__DEV__) console.warn(`⚠️ 무효한 데이터 ${data.length - validData.length}개 제거됨`);
  }
  
  // 메모리 제한 적용
  if (maxItems && validData.length > maxItems) {
    if (__DEV__) console.warn(`⚠️ 메모리 제한으로 ${validData.length - maxItems}개 항목 제한`);
    return validData.slice(0, maxItems);
  }
  
  if (__DEV__) console.log(`✅ 데이터 검증 완료: ${validData.length}개 유효 항목`);
  return validData;
};

// 중복 데이터 제거
export const removeDuplicates = <T>(
  data: T[],
  keyExtractor: (item: T) => string
): T[] => {
  const seen = new Set<string>();
  const unique: T[] = [];
  
  for (const item of data) {
    const key = keyExtractor(item);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  
  if (unique.length !== data.length) {
    console.log(`🔄 중복 제거: ${data.length - unique.length}개 중복 항목 제거됨`);
  }
  
  return unique;
};

// 안전한 날짜 파싱
export const safeDateParse = (dateString: string): Date | null => {
  try {
    const date = new Date(dateString);
    
    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ 무효한 날짜 형식: ${dateString}`);
      return null;
    }
    
    // 합리적인 날짜 범위 확인 (1900-2100년)
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) {
      console.warn(`⚠️ 날짜 범위 초과: ${dateString} (${year}년)`);
      return null;
    }
    
    return date;
  } catch (error) {
    console.error(`❌ 날짜 파싱 오류: ${dateString}`, error);
    return null;
  }
};

// 네트워크 오류 분류
export const classifyNetworkError = (error: any): {
  type: 'network' | 'timeout' | 'auth' | 'server' | 'unknown';
  message: string;
  isRetryable: boolean;
} => {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  if (errorMessage.includes('network request failed') || 
      errorMessage.includes('fetch')) {
    return {
      type: 'network',
      message: '인터넷 연결을 확인해주세요',
      isRetryable: true
    };
  }
  
  if (errorMessage.includes('timeout')) {
    return {
      type: 'timeout', 
      message: '요청 시간이 초과되었습니다',
      isRetryable: true
    };
  }
  
  if (errorMessage.includes('unauthorized') || 
      errorMessage.includes('forbidden')) {
    return {
      type: 'auth',
      message: '인증이 필요합니다',
      isRetryable: false
    };
  }
  
  if (errorMessage.includes('500') || 
      errorMessage.includes('server error')) {
    return {
      type: 'server',
      message: '서버에 일시적인 문제가 발생했습니다',
      isRetryable: true
    };
  }
  
  return {
    type: 'unknown',
    message: '알 수 없는 오류가 발생했습니다',
    isRetryable: true
  };
};

// 재시도 로직
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const errorInfo = classifyNetworkError(error);
      if (!errorInfo.isRetryable) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`🔄 재시도 ${attempt + 1}/${maxRetries} (${delay}ms 후)`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// 캐시 관리
export class DataCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private readonly expireTime: number;
  
  constructor(expireTimeMs: number = PAGINATION_CONFIG.CACHE_EXPIRE_TIME) {
    this.expireTime = expireTimeMs;
  }
  
  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.expireTime) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.expireTime) {
        this.cache.delete(key);
      }
    }
  }
}

// 전역 캐시 인스턴스
export const globalCache = new DataCache(PAGINATION_CONFIG.CACHE_EXPIRE_TIME);

// 디바운스 함수
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait) as any;
  }) as T;
};

// 성능 모니터링
export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  console.log(`⏱️ ${name} 시작`);
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    console.log(`✅ ${name} 완료 (${duration}ms)`);
    
    if (duration > 3000) {
      console.warn(`⚠️ ${name} 성능 주의: ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${name} 실패 (${duration}ms):`, error);
    throw error;
  }
};