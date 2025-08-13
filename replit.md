# TheBetterDay - 실패 친화적 목표 관리 앱

## Overview
TheBetterDay는 "완벽보다 시작"이라는 철학을 바탕으로 한 모바일 중심의 목표 관리 앱입니다. React Native와 Expo를 기반으로 구축되었으며, 실패를 성장의 일부로 받아들이면서도 1초라도 행동했다면 성공으로 인정하는 혁신적인 접근 방식을 제공합니다. 사용자들이 내일을 위한 목표를 설정하고(D+1 로직), 시간 기반으로 목표를 달성하며, 성취감을 통해 지속 가능한 습관을 형성할 수 있도록 돕습니다.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (Latest)
- ✅ **2025-08-13**: APK 실행 버그 완전 해결 v1.0.1
  - 갤럭시폰 APK 설치 후 크래시 방지를 위한 종합적 안정화 작업 완료
  - React Error Boundary 및 전역 오류 핸들러로 JavaScript 크래시 방지
  - 네트워크 타임아웃 개선: 수동 AbortController 구현으로 APK 호환성 향상
  - APK 디버깅 시스템 추가: 환경 정보 자동 로깅, 연결 상태 모니터링, 오류 수집기
  - Android 권한 추가: WiFi 상태 접근, cleartext 트래픽 허용으로 네트워크 안정성 향상
  - 강화된 Polyfill: localStorage, window 객체, process.env 다중 fallback 처리
  - 버전 업데이트: 1.0.1 (versionCode: 2) - APK 빌드 준비 완료
- ✅ **2025-08-12**: 완전한 문서화 완료
  - README.md (한국어) 및 README_EN.md (영문) 전문적 문서 작성
  - DEVELOPMENT_HISTORY.md: 7일간 전체 개발 과정 상세 기록
  - DEPLOYMENT.md, .env.example 등 배포 관련 문서 완비
- ✅ **2025-08-12**: 닉네임 중복체크 시스템 완전 수정
  - RLS 정책으로 인한 중복체크 실패 문제 해결
  - `check_display_name_exists()` 데이터베이스 함수로 전역 중복 방지
  - 회원/게스트 모든 사용자 간 닉네임 고유성 보장

## System Architecture

### Frontend Architecture
- **Framework**: React Native 0.79.5 with TypeScript, Expo SDK 53.0.20
- **Navigation**: React Navigation v7 with bottom tab navigation (Home, History, Network, Settings)
- **State Management**: Zustand for client-side state with multiple specialized stores for different domains
- **UI Components**: Custom component library with consistent design system, centralized styling constants
- **Cross-platform**: Supports iOS, Android, and Web with Metro bundler configuration

### Backend Architecture
- **Database**: Supabase PostgreSQL with comprehensive Row Level Security (RLS) policies
- **Authentication**: Supabase Auth supporting Google OAuth integration and guest mode functionality
- **Real-time Features**: Supabase real-time subscriptions for community interactions and live updates
- **Storage Strategy**: AsyncStorage for local persistence with automatic sync capabilities for offline support

### Goal Management System
The core business logic implements a tomorrow-focused approach:
- **D+1 Logic**: Goals are created for the next day using Korean timezone (Asia/Seoul)
- **Time-based Scheduling**: 30-minute interval system with automatic conflict detection
- **Status Workflow**: pending → success/failure/expired with automatic processing 5 minutes after target time
- **Badge System**: 9 categories (건축, 나비, 도자기, 유리세공, 산맥, 씨앗, 출판, 눈, 별) × 12 achievement levels
- **Streak Tracking**: Continuous success tracking with visual streak badges

### State Management Architecture
Multiple Zustand stores handle different domains:
- **userStore**: Authentication sessions and user data
- **profileStore**: User profile information and preferences
- **goalStore**: Core goal CRUD operations, status tracking, and badge management
- **communityStore**: Social features and daily resolution sharing
- **flexibleGoalStore**: Essential daily goals separate from timed goals
- **retrospectStore**: Daily reflection and retrospective content management
- **motivationStore**: Dynamic motivation message system with personalized content

### Notification System
- **Unified Management**: Single notification manager handling both basic and enhanced alerts
- **Smart Scheduling**: 3-stage notification system (prepare → execute → last chance)
- **Environment Detection**: Automatic platform detection with graceful fallbacks between enhanced and basic modes
- **Personalization**: Goal-based notifications with user display name and custom messaging

### Offline Architecture
- **Local-first Design**: All operations work offline with automatic sync when connection is restored
- **Queue Management**: Failed operations are queued for retry with intelligent conflict resolution
- **Network Detection**: Real-time network status monitoring with user feedback
- **Data Consistency**: Optimistic updates with rollback capabilities for failed sync operations

## External Dependencies

### Core Services
- **Supabase**: Primary backend service providing PostgreSQL database, authentication, real-time subscriptions, and edge functions
- **Google OAuth**: Authentication provider for enhanced user accounts (guest mode available as fallback)
- **Expo Notifications**: Push notification system with permission management and scheduling

### Development and Build Tools
- **EAS Build**: Expo Application Services for cloud-based mobile app building and deployment
- **Metro Bundler**: JavaScript bundler optimized for React Native with custom configuration for performance
- **TypeScript**: Static type checking with strict mode enabled for better code quality

### Third-party Libraries
- **React Navigation**: Navigation system with native stack and bottom tab navigators
- **Zustand**: Lightweight state management library for client-side data
- **AsyncStorage**: Local storage solution for offline data persistence and user preferences
- **Date-fns**: Date manipulation and formatting utilities
- **React Native Calendars**: Calendar component for history and analytics views
- **Lottie React Native**: Animation system for enhanced user experience

### Analytics and Monitoring
- **Custom Analytics**: Built-in analytics system tracking user behavior patterns, goal completion rates, and engagement metrics
- **Performance Monitoring**: Metro bundler optimization with tree shaking and code splitting for improved load times
- **Error Tracking**: Comprehensive error handling with graceful degradation for network issues

The application follows a microservice-like architecture on the frontend with domain-specific stores, ensuring scalability and maintainability while providing a seamless offline-first experience for users.