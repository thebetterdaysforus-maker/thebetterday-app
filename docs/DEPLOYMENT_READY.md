# 🚀 GitHub 새 저장소 업로드 완벽 가이드

## 📋 1단계: 핵심 설정 파일들 (우선 업로드)

### 필수 설정 파일 8개:
```
app.config.js          # Expo 앱 설정
eas.json              # EAS Build 설정  
package.json          # 의존성 및 스크립트
App.tsx               # 메인 앱 컴포넌트
index.js              # 앱 진입점 (필수!)
babel.config.js       # Babel 설정
metro.config.js       # Metro 번들러 설정
tsconfig.json         # TypeScript 설정
```

## 📁 2단계: src 폴더 업로드 (70개 파일)

### 폴더 구조:
```
src/
├── components/       # 재사용 컴포넌트
├── screens/         # 화면 컴포넌트
├── store/           # Zustand 상태 관리
├── types/           # TypeScript 타입
├── utils/           # 유틸리티 함수
└── services/        # API 및 서비스
```

## 🎨 3단계: assets 폴더 업로드 (120개 파일)

### 올바른 assets 구조:
```
assets/
├── adaptive-icon.png     # 앱 아이콘 (필수!)
├── images/              # 앱 이미지들 (5개)
├── icons/               # 아이콘들
├── animations/          # 애니메이션 파일들
├── splash/              # 스플래시 화면
└── badges/              # 배지 파일들 (108개)
    ├── 건축_1.png ~ 건축_12.png
    ├── 나비_1.png ~ 나비_12.png
    ├── 도자기_1.png ~ 도자기_12.png
    └── ... (총 9개 카테고리 × 12레벨)
```

## 🔄 업로드 순서 (100개 제한 해결)

### 1차: 핵심 파일들
- 8개 설정 파일 업로드

### 2차: src 폴더
- 전체 src 폴더 업로드 (70개 파일)

### 3차: 기본 assets  
- adaptive-icon.png, images/, icons/, animations/, splash/

### 4차: 배지 1차
- badges 폴더의 배지 50개

### 5차: 배지 2차  
- 나머지 배지 58개

## ✅ 최종 확인사항

- [ ] EAS Build 설정 완료
- [ ] 앱 아이콘 포함 
- [ ] 모든 소스 코드 포함
- [ ] 배지 시스템 완전 포함
- [ ] 올바른 폴더 구조