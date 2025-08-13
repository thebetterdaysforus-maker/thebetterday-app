import React, { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';
import useUserStore from '../store/userStore'; // 다시 추가

export default function SignInScreen({ navigation }: any) {
  const signIn = useUserStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      // 로그인 성공 후 App.tsx에서 자동으로 MainTab으로 전환
      // navigation.replace 제거
    } catch (error: any) {
      Alert.alert('로그인 오류', error.message);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>로그인</Text>
      <TextInput placeholder="이메일" value={email} onChangeText={setEmail} autoCapitalize="none" style={{ borderBottomWidth: 1, marginBottom: 12 }} />
      <TextInput placeholder="비밀번호" secureTextEntry value={password} onChangeText={setPassword} style={{ borderBottomWidth: 1, marginBottom: 12 }} />
      <Button title="로그인" onPress={handleSignIn} />
      <Button title="회원가입으로 이동" onPress={() => navigation.navigate('SignUp')} />
    </View>
  );
}
