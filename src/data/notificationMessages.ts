// 알림 메시지 데이터 (자체 코드 DB)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
export interface NotificationMessage {
  id: number;
  type: "general" | "goal";
  message: string;
  variables?: string[];
}

export const NOTIFICATION_MESSAGES: NotificationMessage[] = [
  // General형 (닉네임만 사용)
  {
    id: 1,
    type: "general",
    message: "오늘의 망설임이 내일의 후회가 되지 않도록!",
    variables: [],
  },
  {
    id: 2,
    type: "general",
    message: "망설임보다 미래의 낭만을 위해!",
    variables: [],
  },
  {
    id: 3,
    type: "general",
    message: "생각은 천천히 행동은 빠르게",
    variables: [],
  },
  { id: 4, type: "general", message: "가볍게 시작해보지죠!", variables: [] },
  {
    id: 5,
    type: "general",
    message: "작은 시도가 성공을 만듭니다.",
    variables: [],
  },
  {
    id: 6,
    type: "general",
    message: "{display_name}님의 소중한 마음입니다.",
    variables: ["display_name"],
  },
  {
    id: 7,
    type: "general",
    message: "지금의 행동이 {display_name}님의 미래를 만듭니다!",
    variables: ["display_name"],
  },
  {
    id: 8,
    type: "general",
    message: "오늘의 걸음은 어제 꿈 위에 있어요.",
    variables: [],
  },
  {
    id: 9,
    type: "general",
    message: "무엇을 하기로 했는지, 왜 시작했는지 떠올려보세요.",
    variables: [],
  },
  {
    id: 10,
    type: "general",
    message: "This is the way for you.",
    variables: [],
  },
  {
    id: 11,
    type: "general",
    message: "멈추면 어제의 나를 놓칠 수 있습니다.",
    variables: [],
  },
  {
    id: 12,
    type: "general",
    message: "그 순간을 위해 계획한거 아닌가요?",
    variables: [],
  },
  {
    id: 13,
    type: "general",
    message: "해보면 생각보다 괜찮을겁니다.",
    variables: [],
  },
  {
    id: 14,
    type: "general",
    message: "낭만은 움직일 때 시작돼요.",
    variables: [],
  },
  {
    id: 15,
    type: "general",
    message: "오늘의 시도가 {display_name}님의 위대한 도약이 될 수 있습니다.",
    variables: ["display_name"],
  },
  { id: 16, type: "general", message: "For you For all of us", variables: [] },
  {
    id: 17,
    type: "general",
    message: "언젠가 찾아올 The Better Day, 그 행복한 순간을 위해",
    variables: [],
  },
  {
    id: 18,
    type: "general",
    message: "결심은 행동과 만나 의미를 얻습니다!",
    variables: [],
  },
  {
    id: 19,
    type: "general",
    message: "지금 이 행동이 변화를 위한 완벽한 계기에요.",
    variables: [],
  },
  {
    id: 20,
    type: "general",
    message:
      "잠시 힘들고, 잠시 망설여져도 {display_name}님은 결국 해낼 거예요.",
    variables: ["display_name"],
  },
  {
    id: 21,
    type: "general",
    message: "{display_name}님의 이야기를 보여주세요.",
    variables: ["display_name"],
  },
  {
    id: 22,
    type: "general",
    message: "생각보다 훨씬 멋지고 뿌듯할 거예요.",
    variables: [],
  },
  {
    id: 23,
    type: "general",
    message: "조금씩 한 발짝씩, 바로 지금부터!",
    variables: [],
  },
  {
    id: 24,
    type: "general",
    message: "{display_name}님이 원하는 삶을 위하여. Cheers",
    variables: ["display_name"],
  },
  {
    id: 25,
    type: "general",
    message: "더 나은 내일은 오늘부터 시작돼요.",
    variables: [],
  },
  {
    id: 26,
    type: "general",
    message: "작은 시도에서 꿈은 점점 커집니다!.",
    variables: [],
  },
  {
    id: 27,
    type: "general",
    message:
      "오늘 디딘 이 한 걸음이, 비록 조용하고 작을지라도, 달의 발자국처럼 불가능을 현실로 바꾸는 계단이 될 것입니다.",
    variables: [],
  },

  // Goal형 (목표 제목 + 닉네임 사용, 20자 이하 목표에만 적용)
  {
    id: 28,
    type: "goal",
    message: "『{goal}』, 타이밍 Is 놔우",
    variables: ["goal"],
  },
  {
    id: 29,
    type: "goal",
    message: "『{goal}』, 내일은 영원히 오늘이 될 수 없습니다.",
    variables: ["goal"],
  },
  {
    id: 30,
    type: "goal",
    message: "『{goal}』, {display_name}님만이 해낼 수 있어요.",
    variables: ["goal", "display_name"],
  },
  {
    id: 31,
    type: "goal",
    message: "『{goal}』, 이건 지금 이 순간 해야합니다.",
    variables: ["goal"],
  },
  {
    id: 32,
    type: "goal",
    message: "『{goal}』, 그때의 그 마음, 그대로 실천하세요!",
    variables: ["goal"],
  },
  {
    id: 33,
    type: "goal",
    message: "『{goal}』, 오늘이 기념일이 될 거예요.",
    variables: ["goal"],
  },
  {
    id: 34,
    type: "goal",
    message: "『{goal}』, {display_name}님의 위대한 도약을 위하여 Cheers",
    variables: ["goal", "display_name"],
  },
  {
    id: 35,
    type: "goal",
    message: "『{goal}』, 이 선택은 {display_name}님의 길이에요.",
    variables: ["goal", "display_name"],
  },
  {
    id: 36,
    type: "goal",
    message: "『{goal}』, 지금을 놓치지 마세요.",
    variables: ["goal"],
  },
  {
    id: 37,
    type: "goal",
    message: "『{goal}』, 마음의 이유를 기억해주세요.",
    variables: ["goal"],
  },
  {
    id: 38,
    type: "goal",
    message: "『{goal}』, 행동으로 진심을 보여줘요.",
    variables: ["goal"],
  },
  {
    id: 39,
    type: "goal",
    message: "『{goal}』, 미래의 낭만이 {display_name}님을 기다려요.",
    variables: ["goal", "display_name"],
  },
  {
    id: 40,
    type: "goal",
    message: "『{goal}』, 오늘의 결정은 빛날 거예요.",
    variables: ["goal"],
  },
  {
    id: 41,
    type: "goal",
    message: "『{goal}』, {display_name}님의 꿈에 가까워시기를...",
    variables: ["goal", "display_name"],
  },
  {
    id: 42,
    type: "goal",
    message: "『{goal}』, 결국 끝까지 가면 이김!",
    variables: ["goal"],
  },
  {
    id: 43,
    type: "goal",
    message: "『{goal}』, 후회 없는 오늘을 만들어요.",
    variables: ["goal"],
  },
  {
    id: 44,
    type: "goal",
    message: "『{goal}』, {display_name}님의 위대한 도약을 위하여. Cheers",
    variables: ["goal", "display_name"],
  },
  {
    id: 45,
    type: "goal",
    message:
      "『{goal}』, {display_name}님의 꿈을, 희망을, 낭만을 현실로 만들어봐요.",
    variables: ["goal", "display_name"],
  },
  {
    id: 46,
    type: "goal",
    message: "『{goal}』, 언젠가 찾아올 The Better Day, 그 행복한 순간을 위해",
    variables: ["goal"],
  },
];

// 메시지 조회 함수들
export const getGeneralMessages = (): NotificationMessage[] => {
  return NOTIFICATION_MESSAGES.filter((msg) => msg.type === "general");
};

export const getGoalMessages = (): NotificationMessage[] => {
  return NOTIFICATION_MESSAGES.filter((msg) => msg.type === "goal");
};

export const getMessageById = (id: number): NotificationMessage | undefined => {
  return NOTIFICATION_MESSAGES.find((msg) => msg.id === id);
};

export const getRandomMessage = (
  type?: "general" | "goal",
): NotificationMessage => {
  const messages = type
    ? NOTIFICATION_MESSAGES.filter((msg) => msg.type === type)
    : NOTIFICATION_MESSAGES;
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
};

// 변수 치환 함수
export const replaceVariables = (
  message: string,
  variables: { [key: string]: string },
): string => {
  let result = message;
  console.log("🔄 변수 치환 시작:", { message, variables });

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    const beforeReplace = result;
    result = result.replace(regex, value);
    console.log(`  ${key}: "${beforeReplace}" → "${result}"`);
  });

  console.log("✅ 변수 치환 완료:", result);
  return result;
};

// Supabase profiles 테이블에서 display_name 가져오기
const getUserDisplayName = async (): Promise<string | null> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      if (__DEV__) console.log('🚫 세션 없음 - display_name 조회 불가');
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', session.user.id)
      .single();

    if (error) {
      if (__DEV__) console.log('❌ display_name 조회 실패:', error.message);
      return null;
    }

    if (__DEV__) console.log('✅ display_name 조회 성공:', data?.display_name);
    return data?.display_name || null;
    
  } catch (error) {
    if (__DEV__) console.error('❌ getUserDisplayName 오류:', error);
    return null;
  }
};

// 목표 제목 길이 체크 함수 (20자 이하면 GOAL형 사용 가능)
const canUseGoalNotification = (goalTitle: string): boolean => {
  return !!(goalTitle && goalTitle.trim().length <= 20);
};

// 개인화된 알림 메시지 생성 함수 - 자동 타입 선택 및 길이 제한 적용
export const getRandomNotificationMessage = async (goalTitle?: string) => {
  // 🎯 목표 제목이 20자 이하면 50% 확률로 GOAL형 사용, 아니면 General형
  const useGoalType = goalTitle && canUseGoalNotification(goalTitle) && Math.random() < 0.5;
  const messageType: "general" | "goal" = useGoalType ? "goal" : "general";
  
  const filteredMessages = NOTIFICATION_MESSAGES.filter(msg => msg.type === messageType);
  const randomMessage = filteredMessages[Math.floor(Math.random() * filteredMessages.length)];
  
  if (!randomMessage) {
    return "목표 달성 시간입니다!";
  }

  let finalMessage = randomMessage.message;

  // display_name 치환
  if (randomMessage.variables?.includes('display_name')) {
    const displayName = await getUserDisplayName();
    finalMessage = finalMessage.replace(/\{display_name\}/g, displayName || '사용자');
  }

  // goal 치환 (GOAL형 메시지용, 20자 이하 목표에만 적용)
  if (randomMessage.variables?.includes('goal') && goalTitle && canUseGoalNotification(goalTitle)) {
    finalMessage = finalMessage.replace(/\{goal\}/g, goalTitle.trim());
    if (__DEV__) console.log(`🎯 GOAL형 메시지 적용: "${goalTitle}" (${goalTitle.length}자) → "${finalMessage}"`);
  }

  if (__DEV__) console.log(`🔔 선택된 알림 타입: ${messageType}, 최종 메시지: "${finalMessage}"`);

  return finalMessage;
};
