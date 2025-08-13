# 📁 GitHub에서 폴더 구조 만들기

## 🎯 목표 구조
```
assets/
├── badges/
│   ├── 유리세공_1.png
│   ├── 도자기_1.png
│   └── ... (모든 배지들)
├── images/
├── icons/
├── animations/
└── splash/
```

## 📋 GitHub에서 폴더 생성 방법

### 방법 1: 파일 업로드 시 폴더 자동 생성
1. "Add file" → "Upload files" 클릭
2. 파일들을 드래그 앤 드롭
3. GitHub가 자동으로 폴더 구조 인식

### 방법 2: 수동 폴더 생성
1. "Add file" → "Create new file" 클릭
2. 파일명에 `assets/badges/임시파일.txt` 입력
3. 폴더 구조 생성 후 실제 파일들 업로드

### 방법 3: 한 번에 여러 파일 업로드
1. 로컬에서 폴더 선택
2. 드래그 앤 드롭으로 업로드
3. 폴더 구조 유지됨

## 🚀 추천 순서

1. **badges 폴더 생성**
   - "Create new file" → `assets/badges/README.md`
   - 임시 내용 입력하고 커밋

2. **배지 파일들 업로드**
   - "Upload files"에서 배지들 50개씩 나누어 업로드

3. **다른 assets 폴더들**
   - 같은 방식으로 images, icons 등 추가