import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';

import AccountDeletionSurveyScreen from '../screens/AccountDeletionSurveyScreen';

export type SettingsStackParamList = {
  SettingsMain: undefined;
  ProfileSetup: undefined;
  ProfileEdit: undefined;

  AccountDeletionSurvey: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />

      <Stack.Screen name="AccountDeletionSurvey" component={AccountDeletionSurveyScreen} />
    </Stack.Navigator>
  );
}
