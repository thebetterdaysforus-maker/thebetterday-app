# 📂 GitHub 파일 정리 가이드

## 🔧 현재 상황
- 배지 파일들이 루트 폴더에 개별 업로드됨
- assets 폴더는 이미 존재
- 배지들을 assets/badges 폴더로 이동 필요

## 🚀 해결 방법

### 방법 1: GitHub에서 파일 이동 (수동)
각 배지 파일마다:
1. 파일 클릭 → "Edit this file" (연필 아이콘)
2. 파일명을 `assets/badges/파일명.png`로 변경
3. "Commit changes"

**단점:** 108개 파일을 하나씩 해야 함 (매우 번거로움)

### 방법 2: 파일 삭제 후 올바른 위치에 재업로드 (추천)
1. **루트의 배지 파일들 삭제**
   - 여러 파일 선택 후 일괄 삭제
2. **assets 폴더로 이동**
3. **"Upload files"로 로컬 배지들 재업로드**

### 방법 3: Git 명령어 사용 (고급)
로컬에서 git으로 파일 이동 후 푸시

## 💡 GitHub 일괄 삭제 상세 방법

### 1단계: 여러 파일 선택
1. **GitHub 메인 페이지에서 파일 목록 보기**
2. **각 배지 파일 앞의 체크박스 클릭**
   - 한 번에 여러 개 선택 가능
   - Ctrl+클릭으로 개별 선택
3. **또는 "Select all" 옵션 사용** (상단에 있을 수 있음)

### 2단계: 삭제 실행
1. **선택된 파일들 위에 "Delete" 버튼 나타남**
2. **"Delete files" 또는 "Delete selected files" 클릭**
3. **커밋 메시지 입력:** "Remove misplaced badge files"
4. **"Commit changes" 클릭**

### 3단계: 올바른 위치에 재업로드
1. **assets 폴더 클릭**
2. **"Add file" → "Upload files"**
3. **"choose your files"로 배지들 선택**
4. **자동으로 badges/ 폴더 생성됨**

**💡 팁:** 한 번에 모든 배지를 선택하기 어려우면 10-20개씩 나누어서 삭제하세요!