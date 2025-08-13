# 📝 .gitignore 파일 내용

```gitignore
# 환경 변수 (중요한 API 키들)
.env
.env.local
.env.production
.env.staging

# 첨부 파일들 (개인정보, 임시파일)
attached_assets/
private_docs/

# 의존성
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Expo
.expo/
dist/
web-build/

# 네이티브 빌드 파일
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# 맥OS
.DS_Store

# Android/iOS 빌드 파일
android/build/
android/.gradle/
android/.idea/
android/local.properties
ios/build/
ios/Pods/

# IDE 파일
.vscode/
.idea/
*.swp
*.swo
*~

# 로그 파일
*.log

# 템프 파일
tmp/
temp/

# 보안 관련 파일들
*.keystore
*.p8
*.p12  
*.key
*.pem
*.crt
*.cer
*secret*
*private*
credentials.json
service-account*.json

# 개인정보 및 민감데이터
*.sql
*.db
*.sqlite
user_data/
personal_info/
sensitive_files/

# 빌드 과정 민감정보
build-credentials/
upload-keystore/
google-services.json
GoogleService-Info.plist
```