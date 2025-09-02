/**
 * 배포 환경 안전한 로깅 시스템
 * - 민감정보 자동 마스킹
 * - 프로덕션 환경에서 성능 최적화
 * - 중요한 에러만 출력
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class SafeLogger {
  private isDev = __DEV__;
  
  /**
   * 민감정보 마스킹 (사용자ID, 토큰 등)
   */
  private maskSensitiveData(data: any): any {
    if (typeof data === 'string') {
      // 사용자 ID 마스킹 (UUID 형태)
      if (data.length > 20 && data.includes('-')) {
        return data.slice(0, 8) + '****';
      }
      // 토큰 마스킹
      if (data.length > 50) {
        return data.slice(0, 10) + '****' + data.slice(-4);
      }
      return data;
    }
    
    if (typeof data === 'object' && data !== null) {
      const masked = { ...data };
      
      // 위험한 필드들 마스킹
      const sensitiveFields = [
        'access_token', 'refresh_token', 'user_id', 'userId', 
        'email', 'session', 'password', 'token', 'id'
      ];
      
      for (const field of sensitiveFields) {
        if (masked[field]) {
          if (typeof masked[field] === 'string') {
            masked[field] = this.maskSensitiveData(masked[field]);
          } else {
            masked[field] = '[MASKED]';
          }
        }
      }
      
      return masked;
    }
    
    return data;
  }

  /**
   * 개발 전용 디버그 로그
   */
  debug(message: string, data?: any) {
    if (!this.isDev) return;
    
    const maskedData = data ? this.maskSensitiveData(data) : undefined;
    console.log(`🔍 [DEBUG] ${message}`, maskedData || '');
  }

  /**
   * 일반 정보 로그 (프로덕션에서는 제한적)
   */
  info(message: string, data?: any) {
    if (!this.isDev) return; // 프로덕션에서는 info 로그 비활성화
    
    const maskedData = data ? this.maskSensitiveData(data) : undefined;
    console.log(`ℹ️ ${message}`, maskedData || '');
  }

  /**
   * 경고 로그 (프로덕션에서도 출력)
   */
  warn(message: string, data?: any) {
    const maskedData = data ? this.maskSensitiveData(data) : undefined;
    console.warn(`⚠️ ${message}`, maskedData || '');
  }

  /**
   * 에러 로그 (프로덕션에서도 출력)
   */
  error(message: string, error?: any) {
    // 에러 정보는 스택 트레이스만 남기고 민감정보 제거
    const safeError = error instanceof Error 
      ? { name: error.name, message: error.message }
      : this.maskSensitiveData(error);
      
    console.error(`❌ ${message}`, safeError || '');
  }

  /**
   * 성공 로그 (간결하게)
   */
  success(message: string, data?: any) {
    if (!this.isDev && !message.includes('중요')) return;
    
    const maskedData = data ? this.maskSensitiveData(data) : undefined;
    console.log(`✅ ${message}`, maskedData || '');
  }

  /**
   * 사용자 관련 안전 로그 (ID 마스킹)
   */
  userAction(action: string, userId?: string) {
    const maskedId = userId ? this.maskSensitiveData(userId) : '익명';
    this.info(`👤 사용자 작업: ${action}`, { user: maskedId });
  }

  /**
   * 네트워크 요청 로그
   */
  network(operation: string, success: boolean, details?: any) {
    if (success) {
      this.debug(`🌐 ${operation} 성공`, details);
    } else {
      this.error(`🌐 ${operation} 실패`, details);
    }
  }
}

// 전역 인스턴스 생성
export const safeLogger = new SafeLogger();

// 편의 함수들
export const logDebug = safeLogger.debug.bind(safeLogger);
export const logInfo = safeLogger.info.bind(safeLogger);
export const logWarn = safeLogger.warn.bind(safeLogger);
export const logError = safeLogger.error.bind(safeLogger);
export const logSuccess = safeLogger.success.bind(safeLogger);
export const logUserAction = safeLogger.userAction.bind(safeLogger);
export const logNetwork = safeLogger.network.bind(safeLogger);