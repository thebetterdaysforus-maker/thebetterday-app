# 📂 2단계: 다음 폴더 업로드 가이드

## ✅ 1단계 완료 확인
**모든 핵심 파일 업로드 완료:**
- ✅ app.config.js
- ✅ eas.json  
- ✅ package.json
- ✅ App.tsx
- ✅ index.js
- ✅ babel.config.js
- ✅ metro.config.js
- ✅ tsconfig.json

## 🔄 2단계: src 폴더 업로드 (70개 파일)

### GitHub에서 진행할 작업:
1. **"Add file" → "Upload files" 클릭**
2. **로컬에서 전체 src 폴더 선택**
3. **드래그 앤 드롭 또는 "choose your files"**
4. **커밋 메시지:** `feat: 완전한 소스 코드 추가 (70개 파일)`

### src 폴더 구조 (70개 파일):
```
src/
├── components/          # UI 컴포넌트들
├── screens/            # 화면 컴포넌트들  
├── store/              # Zustand 상태 관리
├── utils/              # 유틸리티 함수들
├── services/           # API 및 서비스
├── types/              # TypeScript 타입 정의
└── helpers/            # 헬퍼 함수들
```

## 🎨 3단계: 기본 assets 폴더 (12개 파일)

### 업로드할 기본 assets:
```
assets/
├── adaptive-icon.png    # 앱 아이콘 (필수!)
├── images/             # 5개 이미지 파일
├── icons/              # 아이콘 파일들
├── animations/         # 애니메이션 파일들
└── splash/             # 스플래시 화면 파일들
```

**커밋 메시지:** `feat: 기본 assets 및 앱 아이콘 추가`

## 🏆 4-5단계: 배지 폴더 (108개 파일)

### 4단계: 배지 1차 (50개)
- badges 폴더의 첫 번째 배치
**커밋 메시지:** `feat: 배지 시스템 1차 추가 (50개)`

### 5단계: 배지 2차 (58개)  
- 나머지 모든 배지
**커밋 메시지:** `feat: 배지 시스템 완료 (총 108개)`

## 📝 .gitignore 파일도 추가

GitHub에서 .gitignore 파일 생성:
- "Add file" → "Create new file"
- 파일명: `.gitignore`
- 내용: 환경변수, 개인정보, 빌드 파일 제외 설정

이제 **2단계 src 폴더 업로드**를 진행하세요!