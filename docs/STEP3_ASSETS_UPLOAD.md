# 🎨 3단계: 기본 Assets 폴더 업로드

## 📋 업로드할 기본 Assets (12개 파일)

### 필수 파일들:
```
assets/
├── adaptive-icon.png    # 앱 아이콘 (EAS Build 필수!)
├── images/             
│   ├── app-logo.png
│   ├── welcome-background.png
│   ├── welcome-background.jpg
│   ├── main_logo_icon.png
│   └── logo.png
├── icons/              # 아이콘 파일들
├── animations/         # 애니메이션 파일들 (2개)
└── splash/             # 스플래시 화면 파일들 (2개)
```

## 🚀 GitHub 업로드 방법

### 방법 1: 폴더별 업로드
1. **"Add file" → "Upload files"**
2. **adaptive-icon.png 먼저 업로드** (가장 중요)
3. **images 폴더 업로드** (5개 파일)
4. **icons, animations, splash 폴더들 추가**

### 방법 2: 한 번에 업로드
- **전체 assets 폴더에서 badges 제외하고 선택**
- **12개 파일을 한 번에 업로드**

## 📝 커밋 메시지
```
feat: 기본 assets 및 앱 아이콘 추가

- EAS Build 필수 앱 아이콘 (adaptive-icon.png)
- 앱 로고 및 배경 이미지들
- 아이콘, 애니메이션, 스플래시 파일들
```

## ⚠️ 중요 사항
- **adaptive-icon.png는 반드시 포함** (EAS Build 실패 방지)
- **badges 폴더는 제외** (다음 단계에서 별도 업로드)
- **총 12개 파일로 100개 제한 내 안전**