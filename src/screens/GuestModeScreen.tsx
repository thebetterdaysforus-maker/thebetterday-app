import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../store/authStore";

interface GuestModeScreenProps {
  navigation: any;
}

export default function GuestModeScreen({ navigation }: GuestModeScreenProps) {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const { signInAsGuest } = useAuthStore();

  const startGuestMode = async () => {
    if (isLoading) return; // 중복 실행 방지

    setIsLoading(true);
    try {
      console.log("🚀 게스트 모드 시작...");
      const result = await signInAsGuest();

      if (result.success) {
        console.log("✅ 게스트 로그인 성공 - ProfileSetup으로 이동");
        // 명시적으로 ProfileSetup으로 네비게이션
        navigation.navigate("ProfileSetup");
      } else {
        Alert.alert(
          "게스트 모드 시작 실패",
          result.error || "게스트 모드를 시작할 수 없습니다.",
          [{ text: "확인" }],
        );
      }
    } catch (error) {
      console.error("❌ 게스트 모드 시작 오류:", error);
      Alert.alert("게스트 모드 오류", "예상치 못한 오류가 발생했습니다.", [
        { text: "확인" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 44) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>비회원 체험</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>👤</Text>
        </View>

        <Text style={styles.description}>
          회원가입 없이 앱의 모든 기능을{"\n"}
          완전히 체험할 수 있습니다
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>목표 설정 및 관리</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⏰</Text>
            <Text style={styles.featureText}>실시간 달성 체크</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📝</Text>
            <Text style={styles.featureText}>회고 작성</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureText}>성장 분석</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={startGuestMode}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>체험 시작하기</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Welcome")}
        >
          <Text style={styles.secondaryButtonText}>회원가입하고 시작하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: 44, // SafeArea 고려
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
  },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 40,
  },
  description: {
    fontSize: 18,
    color: "#34495e",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 40,
  },
  featureList: {
    width: "100%",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  featureText: {
    fontSize: 16,
    color: "#34495e",
  },
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  primaryButton: {
    height: 56,
    backgroundColor: "#667eea",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  secondaryButton: {
    height: 56,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#667eea",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#667eea",
    fontSize: 18,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
