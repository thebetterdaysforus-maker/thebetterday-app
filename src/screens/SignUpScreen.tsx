import React, { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';
import useUserStore from '../store/userStore';

export default function SignUpScreen({ navigation }: any) {
  const signUp = useUserStore((s) => s.signUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    try {
      await signUp(email, password);
      Alert.alert('가입 완료', '가입한 이메일로 확인 메일이 발송되었습니다. 이메일을 확인한 후 로그인해 주세요.');
      navigation.replace('SignIn');
    } catch (error: any) {
      Alert.alert('회원가입 오류', error.message);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>회원가입</Text>
      <TextInput placeholder="이메일" value={email} onChangeText={setEmail} autoCapitalize="none" style={{ borderBottomWidth: 1, marginBottom: 12 }} />
      <TextInput placeholder="비밀번호" secureTextEntry value={password} onChangeText={setPassword} style={{ borderBottomWidth: 1, marginBottom: 12 }} />
      <Button title="회원가입" onPress={handleSignUp} />
      <Button title="로그인으로 이동" onPress={() => navigation.navigate('SignIn')} />
    </View>
  );
}
