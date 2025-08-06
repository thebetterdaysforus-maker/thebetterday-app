// src/screens/TutorialScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import TutorialGoalListScreen from "./tutorial/TutorialGoalListScreen";
import TutorialCalendarScreen from "./tutorial/TutorialCalendarScreen";
import TutorialNetworkingScreen from "./tutorial/TutorialNetworkingScreen";

const { width, height } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'goal_creation',
    title: '수행 목록 작성하기',
    description: '최소 5개 이상의 목표를 30분 간격으로 설정해보세요',
    component: TutorialGoalListScreen,
  },
  {
    id: 'calendar',
    title: '캘린더 기능',
    description: '날짜를 클릭하여 일별 기록을 확인하고 성장 목록으로 전체 분석을 확인하세요',
    component: TutorialCalendarScreen,
  },
  {
    id: 'networking',
    title: '네트워킹 기능',
    description: '다른 사용자들과 소통하고 동기부여를 받아보세요',
    component: TutorialNetworkingScreen,
  },
];

export default function TutorialScreen() {
  const navigation = useNavigation() as any;
  const [currentStep, setCurrentStep] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayOpacity] = useState(new Animated.Value(0.8));

  useEffect(() => {
    // 오버레이 애니메이션
    Animated.timing(overlayOpacity, {
      toValue: showOverlay ? 0.8 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showOverlay]);

  const handleNextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setShowOverlay(true);
    } else {
      // 튜토리얼 완료
      handleCompleteTutorial();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setShowOverlay(true);
    }
  };

  const handleSkipTutorial = () => {
    // AuthStack에서는 Main이 없으므로 App.tsx가 자동으로 MainTab으로 전환
    navigation.goBack();
  };

  const handleCompleteTutorial = () => {
    console.log("✅ 튜토리얼 완료 - 메인 화면으로 이동");
    
    // 튜토리얼 완료 후 ProfileSetup으로 돌아가면 App.tsx가 자동으로 MainTab으로 전환
    navigation.goBack();
  };

  const hideOverlay = () => {
    setShowOverlay(false);
  };

  const currentTutorialStep = TUTORIAL_STEPS[currentStep];
  const CurrentComponent = currentTutorialStep.component;

  return (
    <SafeAreaView style={styles.container}>
      {/* 튜토리얼 화면 */}
      <CurrentComponent 
        onOverlayToggle={hideOverlay}
        tutorialMode={true}
      />

      {/* 오버레이 */}
      {showOverlay && (
        <Modal
          transparent
          visible={showOverlay}
          animationType="none"
        >
          <TouchableOpacity 
            style={styles.overlay}
            onPress={handleNextStep}
            activeOpacity={1}
          >
            <Animated.View 
              style={[
                styles.overlayBackground,
                { opacity: overlayOpacity }
              ]}
            />
            
            {/* 설명 카드 */}
            <View style={styles.explanationCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.stepIndicator}>
                  {currentStep + 1} / {TUTORIAL_STEPS.length}
                </Text>
                <TouchableOpacity 
                  onPress={handleSkipTutorial}
                  style={styles.skipButton}
                >
                  <Text style={styles.skipText}>건너뛰기</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {currentTutorialStep.title}
                </Text>
                <Text style={styles.cardDescription}>
                  {currentTutorialStep.description}
                </Text>

                {/* 수행 목록 작성 상세 설명 */}
                {currentStep === 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>📝 수행 목록 작성 규칙</Text>
                    <View style={styles.ruleItem}>
                      <Text style={styles.ruleNumber}>1.</Text>
                      <Text style={styles.ruleText}>최소 5개 이상의 목표를 작성해주세요</Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Text style={styles.ruleNumber}>2.</Text>
                      <Text style={styles.ruleText}>시간은 30분 간격으로만 설정 가능합니다</Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Text style={styles.ruleNumber}>3.</Text>
                      <Text style={styles.ruleText}>목표 시간은 언제든지 수정할 수 있습니다</Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Text style={styles.ruleNumber}>4.</Text>
                      <Text style={styles.ruleText}>중복된 시간대는 선택할 수 없습니다</Text>
                    </View>
                  </View>
                )}

                {/* 캘린더 설명 */}
                {currentStep === 1 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>📅 캘린더 사용법</Text>
                    <View style={styles.ruleItem}>
                      <Text style={styles.ruleNumber}>•</Text>
                      <Text style={styles.ruleText}>날짜를 클릭하면 해당 날의 상세 기록을 볼 수 있습니다</Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Text style={styles.ruleNumber}>•</Text>
                      <Text style={styles.ruleText}>'성장 목록'을 클릭하면 전체적인 데이터 분석을 확인할 수 있습니다</Text>
                    </View>
                  </View>
                )}

                {/* 네트워킹 설명 */}
                {currentStep === 2 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>🤝 네트워킹 기능</Text>
                    <View style={styles.ruleItem}>
                      <Text style={styles.ruleNumber}>•</Text>
                      <Text style={styles.ruleText}>다른 사용자들의 일일 다짐을 확인할 수 있습니다</Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Text style={styles.ruleNumber}>•</Text>
                      <Text style={styles.ruleText}>좋아요를 통해 서로 응원하고 동기부여를 받아보세요</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* 버튼 영역 */}
              <View style={styles.buttonContainer}>
                {currentStep > 0 && (
                  <TouchableOpacity 
                    onPress={handlePrevStep}
                    style={[styles.navButton, styles.prevButton]}
                  >
                    <Ionicons name="chevron-back" size={20} color="#666" />
                    <Text style={styles.prevButtonText}>이전</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  onPress={hideOverlay}
                  style={[styles.navButton, styles.tryButton]}
                >
                  <Text style={styles.tryButtonText}>체험해보기</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleNextStep}
                  style={[styles.navButton, styles.nextButton]}
                >
                  <Text style={styles.nextButtonText}>
                    {currentStep === TUTORIAL_STEPS.length - 1 ? '완료' : '다음'}
                  </Text>
                  {currentStep < TUTORIAL_STEPS.length - 1 && (
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.tapIndicatorArea}>
                <Text style={styles.tapText}>
                  {currentStep === TUTORIAL_STEPS.length - 1 ? '화면을 터치하여 앱 시작하기' : '화면을 터치하여 계속하기'}
                </Text>
                <Ionicons name="hand-left" size={20} color="#8B5CF6" />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* 하단 진행 표시기 */}
      {!showOverlay && (
        <View style={styles.bottomIndicator}>
          <TouchableOpacity 
            onPress={() => setShowOverlay(true)}
            style={styles.helpButton}
          >
            <Ionicons name="help-circle" size={24} color="#8B5CF6" />
            <Text style={styles.helpText}>도움말</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  explanationCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: height * 0.7,
    minHeight: height * 0.4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailSection: {
    marginTop: 16,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ruleNumber: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 20,
  },
  ruleText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  prevButton: {
    backgroundColor: '#f1f3f4',
  },
  prevButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  tryButton: {
    backgroundColor: '#e8f3ff',
    flex: 1,
  },
  tryButtonText: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#8B5CF6',
  },
  nextButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginRight: 4,
  },
  bottomIndicator: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
    marginLeft: 4,
  },

  tapIndicatorArea: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  tapText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    marginRight: 8,
  },
});