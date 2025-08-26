import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import GoalBatchScreen from "../screens/GoalBatchScreen";
import GoalDetailScreen from "../screens/GoalDetailScreen";
import GoalListScreen from "../screens/GoalListScreen";
import TimeSelectScreen from "../screens/TimeSelectScreen";
import FlexibleGoalScreen from "../screens/FlexibleGoalScreen";
import RetrospectScreen from "../screens/RetrospectScreen";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="GoalList"
        component={GoalListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={{ title: "수행 목록 상세" }}
      />
      <Stack.Screen
        name="GoalBatch"
        component={GoalBatchScreen}
        options={{ title: "수행 목록 설정" }}
      />
      <Stack.Screen
        name="TimeSelect"
        component={TimeSelectScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FlexibleGoal"
        component={FlexibleGoalScreen}
        options={{ title: "자유 목표" }}
      />
      <Stack.Screen
        name="Retrospect"
        component={RetrospectScreen}
        options={{ title: "회고 작성" }}
      />
    </Stack.Navigator>
  );
}
