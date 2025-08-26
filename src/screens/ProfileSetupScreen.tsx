import React, { useState, useEffect } from "react";
import {
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import useProfileStore from "../store/profileStore";
import { supabase } from "../supabaseClient";

/** 약관 항목 정의 */
const AGREEMENTS = [
  { key: "age14", label: "만 14세 이상입니다. (필수)", required: true },
  { key: "tos", label: "서비스 이용약관에 동의합니다. (필수)", required: true },
  {
    key: "privacy",
    label: "개인정보 수집·이용에 동의합니다. (필수)",
    required: true,
  },
  { key: "marketing", label: "마케팅 수신 동의 (선택)", required: false },
] as const;

type AgreeKey = (typeof AGREEMENTS)[number]["key"];

// 유입 경로 옵션들 (라디오 버튼 형식)
const REFERRER_OPTIONS = [
  {
    id: "search",
    text: "검색",
    subtext: "(Google, Naver 검색 등)",
    value: "search",
  },
  {
    id: "sns",
    text: "SNS",
    subtext: "(Instagram, Threads, X 등)",
    value: "sns",
  },
  {
    id: "community",
    text: "커뮤니티/포럼",
    subtext: "(네이버 카페&블로그 등)",
    value: "community",
  },
  { id: "referral", text: "지인추천", subtext: "", value: "referral" },
  {
    id: "ai",
    text: "AI 추천",
    subtext: "(ChatGPT, Perplexity AI 등)",
    value: "ai",
  },
  { id: "other", text: "그 외", subtext: "", value: "other" },
];

export default function ProfileSetupScreen({ route }: any) {
  // useNavigation hook 사용
  const navigation = useNavigation() as any;
  const { saveProfile } = useProfileStore();

  // 온보딩 데이터 받아오기
  const onboardingData = route?.params?.onboardingData;

  /* 입력 상태 */
  const [dream, setDream] = useState("");
  const [nickname, setNickname] = useState("");
  const [referrer, setReferrer] = useState(""); // 단일 선택 (필수)
  const [agree, setAgree] = useState<Record<AgreeKey, boolean>>(
    Object.fromEntries(AGREEMENTS.map((a) => [a.key, false])) as Record<
      AgreeKey,
      boolean
    >,
  );
  const [allAgree, setAllAgree] = useState(false);



  /* 원클릭 전체 동의 */
  const handleOneClickAgree = () => {
    const allRequired = Object.fromEntries(
      AGREEMENTS.map((a) => [a.key, a.required ? true : agree[a.key]]),
    ) as Record<AgreeKey, boolean>;

    setAgree(allRequired);
    setAllAgree(true);
  };

  /* master 체크박스 토글 */
  const toggleAll = () => {
    const next = !allAgree;
    setAllAgree(next);
    setAgree(
      Object.fromEntries(
        AGREEMENTS.map((a) => [a.key, next || (!a.required && agree[a.key])]),
      ) as Record<AgreeKey, boolean>,
    );
  };

  /* 개별 체크박스 토글 */
  const toggleOne = (k: AgreeKey) => {
    const next = { ...agree, [k]: !agree[k] };
    setAgree(next);
    const requiredAllOn = AGREEMENTS.every((a) =>
      a.required ? next[a.key] : true,
    );
    setAllAgree(requiredAllOn && Object.values(next).every(Boolean));
  };

  /* 유입 경로 라디오 버튼 선택 */
  const selectReferrer = (value: string) => {
    setReferrer(value);
  };

  /* 닉네임 중복 검사 */
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState("");

  // 📛 단순한 닉네임 검증 (길이와 욕설만 체크)
  const checkNicknameContent = (inputNickname: string): string | null => {
    const trimmed = inputNickname.trim();

    // 기본 검증만
    if (!trimmed) return "닉네임을 입력해주세요";
    if (trimmed.length < 2) return "닉네임은 최소 2글자 이상이어야 합니다";
    if (trimmed.length > 10) return "닉네임은 최대 10글자까지 가능합니다";

    // 욕설/불쾌한 표현만 필터링
    try {
      const Filter = require("badwords-ko");
      const filter = new Filter();

      if (filter.isProfane(trimmed)) {
        return "부적절한 단어가 포함되어 있습니다. 다른 닉네임을 사용해주세요";
      }
    } catch (error) {
      console.log("욕설 필터 오류:", error);
      // 필터 오류 시에도 계속 진행
    }

    return null; // 통과
  };

  const checkNicknameUnique = async (
    inputNickname: string,
  ): Promise<boolean> => {
    if (!inputNickname.trim()) return false;

    setIsCheckingNickname(true);
    setNicknameError("");

    try {
      // 1. 콘텐츠 필터링 먼저 체크
      const contentError = checkNicknameContent(inputNickname);
      if (contentError) {
        setNicknameError(contentError);
        return false;
      }

      // 2. 중복 검사 (RLS 우회 함수 사용)
      const { data, error } = await supabase.rpc("check_display_name_exists", {
        input_display_name: inputNickname.trim(),
      });

      if (error) {
        console.error("닉네임 중복 검사 오류:", error);
        setNicknameError("닉네임 확인 중 오류가 발생했습니다");
        return false;
      }

      const isDuplicate = data === true;
      if (isDuplicate) {
        setNicknameError("이미 사용 중인 닉네임입니다");
        return false;
      }

      setNicknameError("");
      return true;
    } catch (error) {
      console.error("닉네임 검사 예외:", error);
      setNicknameError("닉네임 확인 중 오류가 발생했습니다");
      return false;
    } finally {
      setIsCheckingNickname(false);
    }
  };

  if (__DEV__) console.log("🔍 ProfileSetupScreen 렌더링됨");

  /* 저장 */
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    // 필수 입력·약관 검사
    if (!dream.trim() || !nickname.trim()) {
      Alert.alert("입력 확인", "필수 정보를 모두 입력해 주세요.");
      return;
    }

    // 닉네임 중복 검사
    const isNicknameUnique = await checkNicknameUnique(nickname);
    if (!isNicknameUnique) {
      Alert.alert(
        "닉네임 중복",
        nicknameError ||
          "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.",
      );
      return;
    }
    const unAgreed = AGREEMENTS.filter((a) => a.required && !agree[a.key]);
    if (unAgreed.length) {
      Alert.alert("약관 동의", "필수 약관에 모두 동의해 주세요.");
      return;
    }

    setIsSaving(true);
    try {
      // 유입 경로와 함께 프로필 저장 (유입경로는 선택사항)
      await saveProfile(nickname.trim(), dream.trim(), referrer || "direct");

      console.log("🔘 프로필 저장 완료 - 메인 화면으로 이동");

      // 첫 실행 플래그 명시적으로 해제 (프로필 설정 완료)
      try {
        await AsyncStorage.setItem('hasLaunchedBefore', 'true');
        console.log("✅ 첫 실행 플래그 해제 완료");
      } catch (error) {
        console.log("⚠️ 첫 실행 플래그 해제 실패:", error);
      }

      // 🔥 "내일 우선" 로직: 신규 사용자는 첫 목표를 내일 목표로 작성
      // 프로필 설정 완료 후 자동으로 MainTab으로 이동됨 (App.tsx에서 처리)
      console.log("✅ 신규 사용자 프로필 설정 완료 - App.tsx에서 자동 화면 전환 대기");
      
      // App.tsx의 profile 상태 변화 감지에 의존하여 자동 화면 전환
    } catch (e: any) {
      console.error("프로필 저장 실패:", e);
      Alert.alert(
        "네트워크 오류",
        "인터넷 연결을 확인하고 다시 시도해주세요.\n\n오류: " +
          (e.message || "알 수 없는 오류"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderReferrerRadioButtons = () => {
    return (
      <View style={styles.referrerContainer}>
        {REFERRER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.referrerRow}
            onPress={() => selectReferrer(option.value)}
          >
            <View
              style={[
                styles.radioButton,
                referrer === option.value && styles.radioButtonSelected,
              ]}
            />
            <View style={styles.referrerTextContainer}>
              <Text style={styles.referrerLabel}>
                {option.text}
                {option.subtext && (
                  <Text style={styles.referrerSubtext}> {option.subtext}</Text>
                )}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      contentContainerStyle={{
        padding: 24,
        paddingBottom: 40,
        backgroundColor: "#ffffff",
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* 헤드라인 */}
      <Text style={styles.head1}>
        지금 바로 시작하기 위해{"\n"}
        <Text style={styles.head2}>간단한 정보만 입력해주세요!</Text>
      </Text>

      {/* 꿈 입력 */}
      <Text style={styles.label}>꿈이 무엇인가요?</Text>
      <TextInput
        value={dream}
        onChangeText={setDream}
        placeholder="사람들이 하찮다고 여기는 꿈일지라도, 그 꿈을 향해 나아가는 모든 사람들은 위대합니다!"
        placeholderTextColor="#888"
        multiline
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
      />

      {/* 닉네임 */}
      <Text style={styles.label}>닉네임</Text>
      <TextInput
        value={nickname}
        onChangeText={(t) => {
          if (t.length <= 10) {
            setNickname(t);
            setNicknameError(""); // 입력 시 오류 메시지 초기화

            // 실시간 콘텐츠 필터링
            const contentError = checkNicknameContent(t);
            if (contentError && t.trim().length > 0) {
              setNicknameError(contentError);
            }
          }
        }}
        placeholder="닉네임을 입력해주세요 (10글자 이내)"
        placeholderTextColor="#888"
        style={[
          styles.input,
          nicknameError ? styles.inputError : null,
          isCheckingNickname ? styles.inputChecking : null,
        ]}
      />
      {/* 닉네임 상태 표시 */}
      {isCheckingNickname && (
        <Text style={styles.checkingText}>닉네임 중복 확인 중...</Text>
      )}
      {nicknameError && <Text style={styles.errorText}>{nicknameError}</Text>}

      {/* 유입 경로 라디오 버튼 */}
      <Text style={styles.label}>
        The Better Day를 어떻게 알게 되셨나요? (선택사항)
      </Text>
      {renderReferrerRadioButtons()}

      {/* 동의 항목 섹션 */}
      <View style={styles.agreementSection}>
        {/* 전체 동의 */}
        <TouchableOpacity style={styles.allAgreeRow} onPress={toggleAll}>
          <View style={styles.checkboxContainer}>
            <Ionicons
              name={allAgree ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={allAgree ? "#8b5cf6" : "#d1d5db"}
            />
          </View>
          <Text style={styles.allAgreeText}>모두 동의합니다.</Text>
        </TouchableOpacity>

        {/* 개별 약관 */}
        {AGREEMENTS.map((agreement) => (
          <TouchableOpacity
            key={agreement.key}
            style={styles.agreementRow}
            onPress={() => toggleOne(agreement.key)}
          >
            <View style={styles.checkboxContainer}>
              <Ionicons
                name={
                  agree[agreement.key] ? "checkmark-circle" : "ellipse-outline"
                }
                size={20}
                color={agree[agreement.key] ? "#8b5cf6" : "#d1d5db"}
              />
            </View>
            <Text style={styles.agreementText}>{agreement.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 버튼 영역 */}
      <View style={{ marginTop: 24 }}>
        <TouchableOpacity
          style={[
            styles.startButton,
            (isCheckingNickname || isSaving) && styles.startButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={isCheckingNickname || isSaving}
        >
          <Text style={styles.startButtonText}>
            {isSaving
              ? "저장 중..."
              : isCheckingNickname
                ? "닉네임 확인 중..."
                : "완료"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* ────────────── 스타일 ────────────── */
const styles = StyleSheet.create({
  head1: { fontSize: 18, color: "#888", marginBottom: 4 },
  head2: { fontSize: 18, color: "#0066ff", fontWeight: "bold" },

  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    color: "#333",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },

  inputError: {
    borderColor: "#ff4444",
    borderWidth: 2,
  },

  inputChecking: {
    borderColor: "#ffa500",
    borderWidth: 2,
  },

  errorText: {
    color: "#ff4444",
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },

  checkingText: {
    color: "#ffa500",
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },

  referrerContainer: {
    marginTop: 8,
    marginBottom: 16,
  },

  referrerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 4,
  },

  referrerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  referrerLabel: {
    fontSize: 16,
    color: "#333",
  },

  referrerSubtext: {
    fontSize: 14,
    color: "#999",
  },

  allAgree: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
    paddingVertical: 8,
  },
  allAgreeLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#0066ff",
  },

  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 4,
  },
  agreeLabel: {
    fontSize: 14,
    marginLeft: 8,
    color: "#666",
    flex: 1,
  },
  req: { fontWeight: "bold", color: "#333" },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  checked: {
    backgroundColor: "#0066ff",
    borderColor: "#0066ff",
  },

  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  radioButtonSelected: {
    backgroundColor: "#0066ff",
    borderColor: "#0066ff",
  },

  // 동의 섹션 전체 컨테이너
  agreementSection: {
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },

  // 전체 동의 행
  allAgreeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 12,
  },

  allAgreeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },

  // 개별 동의 행
  agreementRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  agreementText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },

  // 체크박스 컨테이너
  checkboxContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  // 원클릭 전체 동의 버튼
  oneClickAgreeButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  oneClickAgreeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },

  // 시작 버튼
  startButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
    shadowOpacity: 0,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
});
