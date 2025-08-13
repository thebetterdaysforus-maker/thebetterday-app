# TheBetterDay
## 완벽보다 시작 - 실패 친화적 목표 관리 앱

[![Expo](https://img.shields.io/badge/Expo-SDK%2053-000020.svg?style=flat-square&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.79-61DAFB.svg?style=flat-square&logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)

## 앱 소개

**"완벽보다 시작"** 철학을 바탕으로 한 혁신적인 모바일 목표 관리 앱입니다. 

1초라도 행동했다면 성공으로 인정하는 독특한 접근 방식으로, 완벽주의의 부담 없이 목표를 시작하고 꾸준히 지속할 수 있도록 설계되었습니다.

## 주요 특징

### 🎯 혁신적인 목표 관리 시스템
- **D+1 로직**: 내일을 위한 목표 설정으로 충분한 준비 시간 확보
- **30분 단위 스케줄링**: 정확한 시간 기반 목표 관리
- **실패 친화적 접근**: 1초라도 실행하면 성공으로 인정
- **충돌 방지**: 동시간대 목표 자동 감지 및 스마트 알림

### 🏆 성취 시스템
- **9개 배지 카테고리**: 건축, 나비, 도자기, 유리세공, 산맥, 씨앗, 출판, 눈, 별
- **12단계 레벨 시스템**: 점진적 성장을 통한 지속적 동기 부여
- **스트릭 추적**: 연속 성공 기록으로 습관 형성 지원

### 🔔 스마트 알림 시스템
- **3단계 알림**: 준비 → 실행 → 마지막 기회
- **플랫폼 최적화**: iOS/Android 각각에 맞춘 네이티브 알림
- **개인화**: 사용자 이름과 목표에 맞춤화된 메시지

### 📱 사용자 경험
- **오프라인 우선**: 인터넷 없이도 완전 작동
- **게스트 모드**: 가입 없이 바로 시작 가능
- **자동 동기화**: 연결 복원 시 seamless 백업
- **한국어 최적화**: 완전 한국어 인터페이스

## 기술 스택

### 📱 Frontend
- **React Native 0.79.5** + TypeScript
- **Expo SDK 53.0.20** (크로스플랫폼)
- **Zustand** (상태 관리)
- **React Navigation 7** (내비게이션)
- **React Native Calendars** (달력 UI)
- **Lottie** (애니메이션)

### 🗄️ Backend
- **Supabase PostgreSQL** (메인 데이터베이스)
- **Supabase Auth** + Google OAuth
- **Row Level Security** (데이터 보호)
- **Real-time Subscriptions** (실시간 업데이트)
- **Edge Functions** (서버리스 로직)

### 🛠️ 개발 환경
- **Metro Bundler** (JavaScript 번들링)
- **EAS Build** (클라우드 빌드)
- **TypeScript Strict Mode** (타입 안전성)
- **ESLint + Prettier** (코드 품질)

## 빠른 시작

### 1. 저장소 클론 및 설치
```bash
git clone https://github.com/yourusername/TheBetterDay.git
cd TheBetterDay
npm install
```

### 2. Supabase 프로젝트 설정
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. `database-functions.sql` 파일의 SQL 실행
3. URL과 anon key 복사

### 3. 환경 변수 설정
`.env` 파일 생성:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 앱 실행
```bash
# 모바일에서 테스트 (권장)
npx expo start --tunnel --go

# 웹 브라우저에서 테스트
npx expo start --web

# 개발 빌드 (고급)
npx expo start --dev-client
```

### 5. QR 코드 스캔
- **Android**: Expo Go 앱에서 QR 코드 스캔
- **iOS**: 카메라 앱에서 QR 코드 스캔

## 프로젝트 구조

```
TheBetterDay/
├── src/
│   ├── screens/          # 화면 컴포넌트
│   │   ├── GoalListScreen.tsx     # 메인 목표 목록
│   │   ├── ProfileSetupScreen.tsx  # 프로필 설정
│   │   ├── HistoryScreen.tsx      # 목표 히스토리
│   │   └── SettingsScreen.tsx     # 설정
│   ├── components/       # 재사용 UI 컴포넌트
│   │   ├── TimePicker/           # 시간 선택기
│   │   ├── BadgeSystem/          # 배지 시스템
│   │   └── NotificationManager/  # 알림 관리
│   ├── store/           # 상태 관리 (Zustand)
│   │   ├── goalStore.ts          # 목표 관리
│   │   ├── userStore.ts          # 사용자 정보
│   │   └── profileStore.ts       # 프로필 관리
│   ├── utils/           # 유틸리티 함수
│   │   ├── dateUtils.ts          # 날짜 처리
│   │   ├── timeUtils.ts          # 시간 처리
│   │   └── notificationUtils.ts  # 알림 처리
│   ├── types/           # TypeScript 타입
│   └── constants/       # 상수 정의
├── database-functions.sql # Supabase 함수
├── app.config.js         # Expo 설정
├── eas.json             # 빌드 설정
└── README.md            # 프로젝트 문서
```

## 핵심 기능 상세

### 🎯 목표 관리 시스템
**D+1 로직 (내일 우선)**
- 오늘 설정하여 내일 실행하는 시스템
- 충분한 준비 시간과 심리적 여유 제공
- 한국 시간 기준 자동 날짜 계산

**시간 기반 스케줄링**
- 30분 단위 정확한 시간 관리
- 동시간대 목표 충돌 자동 감지
- 유연한 시간 조정 및 수정

**성공 기준의 혁신**
- 1초라도 실행 = 성공 인정
- 실패에 대한 부담감 완전 제거
- 시작하는 것 자체에 가치 부여

### 🔔 스마트 알림 시스템
**3단계 알림 체계**
- **15분 전**: "곧 시작할 시간이에요" (준비 단계)
- **정시**: "지금 시작하세요!" (실행 단계)  
- **15분 후**: "아직 늦지 않았어요" (마지막 기회)

**개인화된 메시지**
- 사용자 닉네임 포함
- 목표별 맞춤 메시지
- 동기부여 문구 자동 생성

### 🏆 배지 및 성취 시스템
**9개 카테고리별 배지**
- 건축 (체계적 성장), 나비 (변화와 발전)
- 도자기 (정교함), 유리세공 (섬세함)
- 산맥 (웅장함), 씨앗 (성장 가능성)
- 출판 (지식), 눈 (순수함), 별 (꿈과 목표)

**12단계 레벨 시스템**
- 단계별 점진적 성장
- 시각적 진행도 표시
- 다음 레벨까지의 명확한 목표

### 🔐 인증 및 보안
**다중 인증 지원**
- Google OAuth 소셜 로그인
- 게스트 모드 즉시 시작
- 자동 세션 관리 및 복원

**데이터 보안**
- Supabase Row Level Security (RLS)
- 사용자별 데이터 완전 격리
- 닉네임 전역 고유성 보장

### 📲 오프라인 우선 설계
**완전한 오프라인 작동**
- 모든 핵심 기능 오프라인 지원
- 로컬 AsyncStorage 우선 저장
- 네트워크 상태 실시간 감지

**자동 동기화**
- 연결 복원 시 즉시 백업
- 충돌 상황 지능적 해결
- 데이터 무결성 보장

## 사용법

### 기본 사용 흐름
1. **시작하기**
   - Google 계정 로그인 또는 게스트 모드 선택
   - 닉네임과 꿈 설정 (프로필 완성)

2. **목표 설정**
   - "내일 할 일" 버튼으로 목표 생성
   - 구체적인 목표 제목 입력
   - 30분 단위로 실행 시간 선택

3. **실행 및 완료**
   - 설정된 시간에 3단계 알림 수신
   - 1초라도 실행하면 "성공" 처리
   - 배지 획득 및 스트릭 누적

4. **성과 관리**
   - History 탭에서 완료한 목표들 확인
   - 배지 컬렉션 및 레벨 진행도 체크
   - 회고 기능으로 하루 마무리

### 핵심 사용 팁
- **내일 설정**: 오늘 계획하고 내일 실행하여 준비 시간 확보
- **작은 목표**: 큰 목표를 30분 단위로 세분화
- **관대한 기준**: 완벽하지 않아도 시작했으면 성공
- **꾸준함**: 매일 작은 성공 경험으로 습관 형성

## 배포 및 빌드

### EAS Build 명령어
```bash
# 개발용 빌드
eas build --profile development --platform all

# 미리보기 빌드 (내부 테스트용)
eas build --profile preview --platform all

# 프로덕션 빌드 (앱스토어 배포용)
eas build --profile production --platform all
```

### 앱스토어 배포
```bash
# iOS App Store
eas submit --platform ios

# Google Play Store  
eas submit --platform android
```

### 주요 설정 파일
| 파일 | 용도 |
|------|------|
| `app.config.js` | Expo 앱 기본 설정 |
| `eas.json` | 빌드 프로파일 설정 |
| `metro.config.js` | 번들러 최적화 설정 |
| `database-functions.sql` | Supabase 함수 |

## 문제 해결

### 자주 발생하는 문제
**QR 코드 스캔이 안 될 때**
- Expo Go 모드로 실행: `npx expo start --go`
- 터널 모드 사용: `npx expo start --tunnel`

**알림이 오지 않을 때**
- 디바이스 알림 권한 확인
- Expo Go 환경에서는 제한적 알림 기능

**데이터가 동기화되지 않을 때**
- 네트워크 연결 상태 확인
- Supabase 환경 변수 설정 점검

## 기여 및 개발

이 프로젝트는 현재 개인 개발로 진행 중입니다. 

### 개발 환경 설정
1. Node.js 18+ 및 npm 설치
2. Expo CLI 전역 설치: `npm install -g @expo/cli`
3. 프로젝트 클론 및 의존성 설치
4. Supabase 프로젝트 설정 및 환경 변수 구성

## 라이선스

MIT License - 자세한 내용은 LICENSE 파일을 참조하세요.

---

**TheBetterDay**와 함께 완벽보다는 시작에 집중하여, 매일 조금씩 더 나은 내일을 만들어가세요.