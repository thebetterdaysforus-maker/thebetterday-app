import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useAuthStore } from "../store/authStore";

interface WelcomeScreenProps {
  navigation: any;
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signInWithGoogle } = useAuthStore();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.success) {
        if (result.isNewUser) {
          navigation.navigate("ProfileSetup");
        } else {
          navigation.navigate("Main");
        }
      } else {
        Alert.alert(
          "Google 로그인 실패",
          result.error || "로그인 중 오류가 발생했습니다.",
          [{ text: "확인" }],
        );
      }
    } catch (error) {
      Alert.alert("Google 로그인 오류", "예상치 못한 오류가 발생했습니다.", [
        { text: "확인" },
      ]);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/welcome-background.jpg")}
      style={styles.backgroundContainer}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        {/* 왼쪽 상단 로고와 텍스트 */}
        <View style={styles.topSection}>
          <Image
            source={require("../../assets/images/app-logo.png")}
            style={styles.appLogo}
            resizeMode="contain"
          />
          <Text style={styles.mainSubtitle}>
            패배에 굴복하지 않고{"\n"}성장하는 우리를 위하여
          </Text>
        </View>

        {/* 하단 로그인 버튼들 */}
        <View style={styles.bottomSection}>
          {/* Google 로그인 */}
          <TouchableOpacity
            style={[styles.loginButton, styles.googleButton]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Google로 계속하기</Text>
              </>
            )}
          </TouchableOpacity>

          {/* 게스트 모드로 시작하기 */}
          <TouchableOpacity
            style={[styles.loginButton, styles.guestButton]}
            onPress={() => navigation.navigate("GuestMode")}
          >
            <Text style={styles.guestButtonText}>게스트 모드로 시작하기</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              게스트로 이용하실 경우 일부 기능은 제한될 수 있습니다.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // 텍스트 가독성을 위한 오버레이
  },
  topSection: {
    flex: 1,
    paddingTop: 10,
    paddingLeft: 15,
    paddingRight: 15,
  },
  appLogo: {
    width: 200,
    height: 120,
    marginBottom: -20,
    marginTop: 14,
  },
  mainSubtitle: {
    fontSize: 18,
    color: "#FFFFFF",
    lineHeight: 26,
    paddingLeft: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  loginButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    flexDirection: "row",
  },
  googleButton: {
    backgroundColor: "#4285f4",
    marginBottom: 16,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: "bold",
    marginRight: 12,
    backgroundColor: "#fff",
    color: "#4285f4",
    width: 32,
    height: 32,
    textAlign: "center",
    lineHeight: 32,
    borderRadius: 16,
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  guestButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginBottom: 24,
  },
  guestButtonText: {
    color: "#333",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    color: "#b0b0b0",
    fontSize: 12,
    textAlign: "center",
  },
});
