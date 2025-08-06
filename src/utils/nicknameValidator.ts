// 오픈소스 기반 닉네임 검증 유틸리티
import Filter from 'badwords-ko';

export interface ValidationResult {
  valid: boolean;
  message: string;
}

// 한국어 욕설 필터 초기화
const koreanFilter = new Filter();

// 닉네임 종합 검증
export const validateNickname = (nickname: string): ValidationResult => {
  // 1. 공백 확인
  if (!nickname || nickname.trim().length === 0) {
    return { valid: false, message: "닉네임을 입력해주세요" };
  }

  const trimmedNickname = nickname.trim();

  // 2. 길이 검증 (2-10자)
  if (trimmedNickname.length < 2) {
    return { valid: false, message: "닉네임은 최소 2자 이상이어야 합니다" };
  }
  if (trimmedNickname.length > 10) {
    return { valid: false, message: "닉네임은 최대 10자까지 가능합니다" };
  }

  // 3. 문자 종류 검증 (한글, 영문, 숫자, 공백만)
  if (!/^[가-힣a-zA-Z0-9\s]+$/.test(trimmedNickname)) {
    return { valid: false, message: "한글, 영문, 숫자만 사용 가능합니다" };
  }

  // 4. 오픈소스 한국어 욕설 검사
  const cleanedText = koreanFilter.clean(trimmedNickname);
  if (cleanedText !== trimmedNickname) {
    return { valid: false, message: "적절하지 않은 닉네임입니다" };
  }

  // 5. 연속된 공백 체크
  if (/\s{2,}/.test(trimmedNickname)) {
    return { valid: false, message: "연속된 공백은 사용할 수 없습니다" };
  }

  return { valid: true, message: "사용 가능한 닉네임입니다" };
};

// 실시간 입력 검증 (타이핑 중에는 욕설 검사 제외)
export const validateNicknameRealtime = (nickname: string): ValidationResult => {
  // 타이핑 중에는 길이와 문자 종류만 검사
  if (nickname.length > 10) {
    return { valid: false, message: "최대 10자까지 입력 가능합니다" };
  }

  if (nickname.length > 0 && !/^[가-힣a-zA-Z0-9\s]*$/.test(nickname)) {
    return { valid: false, message: "한글, 영문, 숫자만 사용 가능합니다" };
  }

  return { valid: true, message: "" };
};

// 욕설만 체크하는 함수 (선택적 사용)
export const containsProfanity = (text: string): boolean => {
  return koreanFilter.clean(text) !== text;
};