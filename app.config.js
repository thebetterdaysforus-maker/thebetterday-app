export default ({ config }) => ({
  ...config,
  name: "TheBetterDay",
  slug: "thebetterday",
  version: "1.0.1",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.thebetterday.app"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.thebetterday.app",
    permissions: [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.ACCESS_WIFI_STATE",
      "android.permission.WAKE_LOCK",
      "android.permission.VIBRATE",
      "android.permission.RECEIVE_BOOT_COMPLETED"
    ],
    versionCode: 2,
    // APK 실행 안정성을 위한 추가 설정
    allowBackup: true,
    usesCleartextTraffic: true // HTTP 연결 허용 (개발용)
  },
  extra: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: "e0c8ae65-ddfb-46f6-bf01-4dcd170000d5"
    }
  },
  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          enableProguardInReleaseBuilds: false,
          enableShrinkResourcesInReleaseBuilds: false
        }
      }
    ]
  ]
});