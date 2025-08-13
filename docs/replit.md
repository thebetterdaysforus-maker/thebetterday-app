# The Better Day

## Overview
The Better Day is an innovative mobile-first habit management application that embraces and overcomes failure. Built with React Native Expo and optimized for Android deployment, it helps users set daily goals, track their completion, and grow through reflection. The project aims to provide a supportive environment for personal growth by acknowledging setbacks as part of the journey.

## Recent Changes (August 2025)
- ✅ **August 12, 2025**: 파일 구조 대폭 정리 - docs/, private_docs/ 폴더로 분류, Metro 번들러 최적화
- ✅ **August 12, 2025**: 스크롤 기반 하루 흐름 랜딩페이지 완성 - 새벽부터 정오까지 자연스러운 색상 변화, HSL 보간 적용
- ✅ **August 12, 2025**: EAS Build 성공! GitHub에서 직접 Android APK 생성 완료 (Build ID: 56ae4157-3fb1-4d3e-a182-4412a0977387)
- ✅ **August 12, 2025**: APK 다운로드 링크 생성: https://expo.dev/artifacts/eas/bGPfpupUvAnB3qVvDG7dXi.apk
- ✅ **August 11, 2025**: 랜딩페이지 완전 정리 - landingpage 폴더로 모든 파일 통합, 실제 앱 스크린샷 적용
- ✅ **August 11, 2025**: Google Play Console 개발자 승인 완료 - 앱 배포 준비 완료

## User Preferences
Preferred communication style: Simple, everyday language.
Performance preferences: 하이브리드 간격 시스템 - 앱 활성시 30초, 비활성시 5분 간격으로 배터리 효율성과 실시간성 최적화.
Deployment target: Android 전용 배포 (iOS 제외).
Security priority: 극도로 높음 - 법적 책임 우려로 완전한 보안 준수 요구.
Documentation organization: 모든 민감한 문서는 `private_docs/` 폴더에 격리하여 외부 노출 완전 차단.
Focus: 웹 브라우저보다 모바일 앱 우선, 핵심 기능 중심 개발.

## System Architecture
### Frontend
- **Framework**: React Native 0.79.5 with TypeScript
- **Development Platform**: Expo 53.0.20 with Development Build
- **Navigation**: React Navigation 7.x
- **State Management**: Zustand 5.0.6
- **Styling**: React Native StyleSheet with Android Material Design

### Backend  
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time Features**: Supabase real-time subscriptions

### Core Features
- **Authentication**: Email-based sign-in/sign-up, Google OAuth integration
- **Goal Management**: 30-minute interval time picker, status tracking, automatic expiration
- **Retrospect System**: Daily reflection functionality
- **Enhanced Notifications**: 3-tier system with 46 Korean messages (ID 1-46)
- **Offline Capabilities**: Full offline functionality with automatic sync
- **Android Optimization**: Streamlined for Android-first deployment

## File Structure (Cleaned August 2025)
```
├── src/                 # Main app source code
├── assets/              # App assets (icons, images, animations)
├── android/             # Android build files  
├── landingpage/         # Marketing website
├── docs/                # Documentation and guides
├── private_docs/        # Private files and archives
├── attached_assets/     # User uploaded assets
└── [config files]       # package.json, metro.config.js, etc.
```

## External Dependencies
- `@supabase/supabase-js` - Backend integration
- `@supabase/postgrest-js` - Database queries
- `react-navigation` - App navigation
- `zustand` - State management
- `date-fns` - Date handling
- `expo-notifications` - Push notifications