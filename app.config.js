module.exports = {
  expo: {
    name: "TheBetterDay",
    slug: "thebetterday",

    version: "1.0.0",
    orientation: "portrait",
    scheme: "thebetterday",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    main: "index.js",
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: "e0c8ae65-ddfb-46f6-bf01-4dcd170000d5"
      }
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png"
    },
    // iOS 설정 제거 - Android 전용 배포
    android: {
      package: "com.thebetterday.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "thebetterday"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    plugins: [
      "expo-notifications",
      "expo-dev-client",
      [
        "expo-build-properties", 
        {
          android: {
            usesCleartextTraffic: true
          }
        }
      ]
    ],
    assetBundlePatterns: [
      "**/*"
    ]
  }
};