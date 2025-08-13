# 🔧 EAS Build 테스트 가이드

## 🎯 현재 목적
GitHub 저장소와 Expo 연결 후 EAS Build 테스트

## 📋 다음 단계

### 1단계: EAS 로그인
```bash
npx eas login
```

### 2단계: GitHub 저장소와 Expo 프로젝트 연결
```bash
npx eas init
```
- GitHub 저장소 자동 인식
- Expo 프로젝트와 연결

### 3단계: 테스트 빌드 실행
```bash
npx eas build --platform android --profile preview
```

### 4단계: 빌드 결과 확인
- 빌드 성공 여부 확인
- APK 파일 다운로드 가능
- 실제 디바이스에서 테스트

## ⚡ 즉시 실행 가능

GitHub 업로드가 완료되었으므로 바로 EAS Build 테스트를 시작할 수 있습니다.