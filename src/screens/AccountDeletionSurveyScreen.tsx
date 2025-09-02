import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../supabaseClient";
import useUserStore from "../store/userStore";
import { useAuthStore } from "../store/authStore";

interface AccountDeletionSurveyScreenProps {
  navigation: any;
}

const DELETION_REASONS = [
  { id: "not_useful", label: "앱이 도움이 되지 않았어요" },
  { id: "DSnot_good", label: "디자인이 별로에요" },
  { id: "lack_time", label: "사용할 시간이 없어요" },
  { id: "better_alternative", label: "더 좋은 앱을 찾았어요" },
  { id: "technical_issues", label: "기술적 문제가 있어요" },
  { id: "other", label: "기타" },
];

export default function AccountDeletionSurveyScreen({
  navigation,
}: AccountDeletionSurveyScreenProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [additionalFeedback, setAdditionalFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signOut } = useUserStore();
  const { disableAutoLogin } = useAuthStore();

  const toggleReason = (reasonId: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonId)
        ? prev.filter((id) => id !== reasonId)
        : [...prev, reasonId],
    );
  };

  const submitSurveyAndDeleteAccount = async () => {
    if (selectedReasons.length === 0) {
      Alert.alert("선택 필요", "탈퇴 사유를 하나 이상 선택해주세요.");
      return;
    }

    Alert.alert(
      "계정 삭제 확인",
      "정말로 계정을 삭제하시겠습니까?\n\n• 모든 목표와 회고 데이터가 영구적으로 삭제됩니다\n• 이 작업은 되돌릴 수 없습니다\n• 같은 이메일로 재가입이 가능합니다",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: performAccountDeletion,
        },
      ],
    );
  };

  const performAccountDeletion = async () => {
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("오류", "사용자 정보를 찾을 수 없습니다.");
        return;
      }

      // 1. 설문 응답 저장 (삭제 전에 저장)
      try {
        await supabase.from("account_deletion_surveys").insert({
          user_id: user.id,
          reasons: selectedReasons,
          additional_feedback: additionalFeedback.trim() || null,
          deleted_at: new Date().toISOString(),
        });
        console.log("설문 응답 저장 완료");
      } catch (surveyError) {
        console.warn("설문 응답 저장 실패 (계속 진행):", surveyError);
        // 설문 저장 실패해도 계정 삭제는 진행
      }

      // 2. 사용자 데이터 삭제 (순서 중요 - 외래키 제약조건 때문)
      await Promise.all([
        supabase.from("goals").delete().eq("user_id", user.id),
        supabase.from("retrospects").delete().eq("user_id", user.id),
        supabase.from("daily_resolutions").delete().eq("user_id", user.id),
        supabase.from("flexible_goals").delete().eq("user_id", user.id),
      ]);

      // 3. 프로필 삭제
      await supabase.from("profiles").delete().eq("user_id", user.id);

      // 4. 계정 삭제 (Supabase Auth)
      // 참고: 실제로는 서버 측 함수나 관리자 API를 통해 해야 함
      // 클라이언트에서는 제한적임

      // 5. 로그아웃 처리
      await disableAutoLogin();
      await signOut();

      Alert.alert(
        "계정 삭제 완료",
        "소중한 의견 감사드립니다.\n 큰 도움을 드리지는 못 했지만, 귀하에 행복한 날들을 마지하기를 진심으로 소망합니다.",
        [
          {
            text: "확인",
            onPress: () => {
              // 자동으로 AuthStack으로 이동됨
            },
          },
        ],
      );
    } catch (error) {
      console.error("계정 삭제 오류:", error);
      Alert.alert(
        "삭제 오류",
        "계정 삭제 중 오류가 발생했습니다.\n고객센터로 문의해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>계정 삭제</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>부탁드립니다!</Text>
          <Text style={styles.introText}>
            소중한 시간을 내어 저희가 더 나아질 수 있도록 {"\n"} 도와주시면 정말
            감사드리겠습니다 ㅠㅠ
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            어떤 이유로 탈퇴하시나요? (중복 선택 가능)
          </Text>

          {DELETION_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonItem,
                selectedReasons.includes(reason.id) &&
                  styles.reasonItemSelected,
              ]}
              onPress={() => toggleReason(reason.id)}
            >
              <View
                style={[
                  styles.checkbox,
                  selectedReasons.includes(reason.id) &&
                    styles.checkboxSelected,
                ]}
              >
                {selectedReasons.includes(reason.id) && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text
                style={[
                  styles.reasonText,
                  selectedReasons.includes(reason.id) &&
                    styles.reasonTextSelected,
                ]}
              >
                {reason.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, styles.singleLineTitle]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            추가로 전하고 싶은 말씀이 있으시다면 부담없이 말씀해주세요!
            (선택사항)
          </Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="어떤 부분이 아쉬웠는지, 개선했으면 하는 점 등을 자유롭게 적어주세요"
            multiline
            numberOfLines={4}
            value={additionalFeedback}
            onChangeText={setAdditionalFeedback}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {additionalFeedback.length}/500
          </Text>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.deleteButton, isSubmitting && styles.disabledButton]}
            onPress={submitSurveyAndDeleteAccount}
            disabled={isSubmitting}
          >
            <Text style={styles.deleteButtonText}>
              {isSubmitting ? "처리 중..." : "계정 삭제하기"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            마음이 바뀌셨다면 언제든 돌아와 주세요.
            {"\n"}더 나은 모습으로 기다리고 있겠습니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  content: {
    flex: 1,
  },
  introSection: {
    backgroundColor: "white",
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  introText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#666",
    textAlign: "center",
  },
  section: {
    backgroundColor: "white",
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  singleLineTitle: {
    fontSize: 13,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  reasonItemSelected: {
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ddd",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  reasonText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
  },
  reasonTextSelected: {
    color: "#667eea",
    fontWeight: "500",
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#333",
    textAlignVertical: "top",
    minHeight: 100,
  },
  characterCount: {
    textAlign: "right",
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  buttonSection: {
    padding: 16,
  },
  deleteButton: {
    backgroundColor: "#ff6b6b",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  disabledButton: {
    backgroundColor: "#ccc",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});
