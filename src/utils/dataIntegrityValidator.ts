/**
 * 배포 환경 데이터 일관성 검증 시스템
 * - 예외 상황에서도 앱 안정성 유지
 * - 손상된 데이터 자동 복구
 * - 중요한 데이터 유실 방지
 */

import { safeLogger } from './safeLogger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fixedIssues: string[];
}

export class DataIntegrityValidator {
  
  /**
   * 목표 데이터 검증
   */
  validateGoalData(goal: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      fixedIssues: []
    };

    // 필수 필드 검증
    if (!goal.id) {
      result.errors.push('목표 ID 누락');
      result.isValid = false;
    }

    if (!goal.title?.trim()) {
      result.errors.push('목표 제목 누락');
      result.isValid = false;
    }

    if (!goal.target_time) {
      result.errors.push('목표 시간 누락');
      result.isValid = false;
    } else {
      // 시간 형식 검증
      const targetTime = new Date(goal.target_time);
      if (isNaN(targetTime.getTime())) {
        result.errors.push('목표 시간 형식 오류');
        result.isValid = false;
      }
    }

    // 상태 검증
    const validStatuses = ['pending', 'success', 'failure', 'expired'];
    if (!validStatuses.includes(goal.status)) {
      result.errors.push(`잘못된 목표 상태: ${goal.status}`);
      // 자동 수정
      goal.status = 'pending';
      result.fixedIssues.push('목표 상태를 pending으로 수정');
    }

    return result;
  }

  /**
   * 회고 데이터 검증
   */
  validateRetrospectData(retrospect: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      fixedIssues: []
    };

    if (!retrospect.user_id) {
      result.errors.push('사용자 ID 누락');
      result.isValid = false;
    }

    if (!retrospect.date) {
      result.errors.push('회고 날짜 누락');
      result.isValid = false;
    } else {
      // 날짜 형식 검증 (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(retrospect.date)) {
        result.errors.push('회고 날짜 형식 오류');
        result.isValid = false;
      }
    }

    if (!retrospect.text?.trim()) {
      result.errors.push('회고 내용 누락');
      result.isValid = false;
    }

    return result;
  }

  /**
   * 세션 데이터 검증
   */
  validateSessionData(sessionData: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      fixedIssues: []
    };

    if (!sessionData) {
      result.errors.push('세션 데이터 없음');
      result.isValid = false;
      return result;
    }

    if (!sessionData.access_token) {
      result.errors.push('액세스 토큰 누락');
      result.isValid = false;
    }

    if (!sessionData.refresh_token) {
      result.errors.push('리프레시 토큰 누락');
      result.isValid = false;
    }

    // 만료 시간 검증
    if (sessionData.expires_at) {
      const expiresAt = new Date(sessionData.expires_at * 1000);
      const now = new Date();
      
      if (expiresAt <= now) {
        result.errors.push('세션 만료됨');
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * 네트워크 응답 데이터 검증
   */
  validateNetworkResponse(response: any, expectedFields: string[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      fixedIssues: []
    };

    if (!response) {
      result.errors.push('응답 데이터 없음');
      result.isValid = false;
      return result;
    }

    // 필수 필드 검증
    for (const field of expectedFields) {
      if (response[field] === undefined || response[field] === null) {
        result.errors.push(`필수 필드 누락: ${field}`);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * 로컬 스토리지 데이터 검증
   */
  validateLocalStorageData(data: any, type: 'goal' | 'retrospect' | 'session'): ValidationResult {
    try {
      switch (type) {
        case 'goal':
          return this.validateGoalData(data);
        case 'retrospect':
          return this.validateRetrospectData(data);
        case 'session':
          return this.validateSessionData(data);
        default:
          return {
            isValid: false,
            errors: ['알 수 없는 데이터 타입'],
            fixedIssues: []
          };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`검증 중 오류 발생: ${error}`],
        fixedIssues: []
      };
    }
  }

  /**
   * 배열 데이터 일괄 검증
   */
  validateArrayData<T>(
    items: T[], 
    validator: (item: T) => ValidationResult
  ): { validItems: T[]; invalidItems: T[]; totalErrors: number } {
    const validItems: T[] = [];
    const invalidItems: T[] = [];
    let totalErrors = 0;

    for (const item of items) {
      const validation = validator(item);
      
      if (validation.isValid) {
        validItems.push(item);
      } else {
        invalidItems.push(item);
        totalErrors += validation.errors.length;
      }

      // 수정된 이슈 로깅
      if (validation.fixedIssues.length > 0) {
        safeLogger.info('데이터 자동 수정됨', { fixes: validation.fixedIssues });
      }
    }

    return { validItems, invalidItems, totalErrors };
  }

  /**
   * 중요 데이터 백업 검증
   */
  async validateCriticalDataBackup(): Promise<boolean> {
    try {
      // AsyncStorage에서 중요 데이터 확인
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      const criticalKeys = ['user_session', 'auto_login'];
      let hasValidBackup = false;

      for (const key of criticalKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          hasValidBackup = true;
          break;
        }
      }

      if (!hasValidBackup) {
        safeLogger.warn('중요 데이터 백업 없음 - 재로그인 필요할 수 있음');
      }

      return hasValidBackup;
    } catch (error) {
      safeLogger.error('백업 검증 실패', error);
      return false;
    }
  }
}

// 전역 인스턴스
export const dataValidator = new DataIntegrityValidator();

// 편의 함수들
export const validateGoal = (goal: any) => dataValidator.validateGoalData(goal);
export const validateRetrospect = (retrospect: any) => dataValidator.validateRetrospectData(retrospect);
export const validateSession = (session: any) => dataValidator.validateSessionData(session);
export const validateResponse = (response: any, fields: string[]) => 
  dataValidator.validateNetworkResponse(response, fields);