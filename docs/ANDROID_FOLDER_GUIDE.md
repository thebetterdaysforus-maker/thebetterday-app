# 📱 Android 폴더 업로드 가이드

## 🤔 Android 폴더 업로드 필요성

### EAS Build vs 네이티브 Android 폴더

**EAS Build (권장):**
- ✅ EAS가 Android 빌드를 자동으로 생성
- ✅ app.config.js와 eas.json만으로 충분
- ✅ 클라우드에서 자동 빌드
- ✅ 간단하고 안전

**네이티브 Android 폴더:**
- ⚠️ 로컬 개발용
- ⚠️ 커스텀 네이티브 코드 필요시만
- ⚠️ 복잡한 설정 관리 필요

## 📋 Android 폴더 현황 (46개 파일)

### 포함된 파일들:
```
android/
├── app/build.gradle        # 앱 빌드 설정
├── gradle.properties       # Gradle 설정
├── settings.gradle         # 프로젝트 설정
├── app/src/main/
│   ├── MainApplication.kt  # 메인 앱 클래스
│   ├── MainActivity.kt     # 메인 액티비티
│   └── res/               # 리소스 파일들 (아이콘, 색상 등)
└── gradlew, gradlew.bat   # Gradle 래퍼
```

## 💡 추천 방안

### 방법 1: EAS Build만 사용 (권장)
- **Android 폴더 업로드 생략**
- **EAS가 자동으로 Android 빌드 생성**
- **더 안전하고 간단**

### 방법 2: Android 폴더도 업로드
- **Development Build 커스터마이징 필요시**
- **네이티브 모듈 추가 필요시**
- **46개 파일 추가 업로드**

## 🚀 결론

**현재 상황:**
- ✅ app.config.js, eas.json 설정 완료
- ✅ EAS Build 준비 완료
- ✅ Android 폴더 없이도 빌드 가능

**추천:** Android 폴더는 **업로드하지 않고** EAS Build로 진행하세요.

필요시 나중에 추가할 수 있습니다.