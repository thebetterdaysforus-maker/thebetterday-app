import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

interface ProfileEditScreenProps {
  navigation: any;
}

export default function ProfileEditScreen({ navigation }: ProfileEditScreenProps) {
  const [nickname, setNickname] = useState('');
  const [dream, setDream] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [originalNickname, setOriginalNickname] = useState(''); // 원래 닉네임 저장
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setNickname(profileData.display_name || '');
          setOriginalNickname(profileData.display_name || ''); // 원래 닉네임 저장
          setDream(profileData.dream || '');
        }
      }
    } catch (error) {
      console.error('프로필 로드 실패:', error);
      Alert.alert('오류', '프로필을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  /* 닉네임 중복 검사 */
  const checkNicknameUnique = async (inputNickname: string): Promise<boolean> => {
    if (!inputNickname.trim()) return false;
    
    // 원래 닉네임과 같으면 중복 검사 생략
    if (inputNickname.trim() === originalNickname) return true;
    
    setIsCheckingNickname(true);
    setNicknameError('');
    
    try {
      const { data, error } = await supabase.rpc(
        'check_display_name_exists',
        { input_display_name: inputNickname.trim() }
      );

      if (error) {
        console.error('닉네임 중복 검사 오류:', error);
        setNicknameError('닉네임 확인 중 오류가 발생했습니다');
        return false;
      }

      const isDuplicate = data === true;
      if (isDuplicate) {
        setNicknameError('이미 사용 중인 닉네임입니다');
        return false;
      }

      setNicknameError('');
      return true;
    } catch (error) {
      console.error('닉네임 검사 예외:', error);
      setNicknameError('닉네임 확인 중 오류가 발생했습니다');
      return false;
    } finally {
      setIsCheckingNickname(false);
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }

    if (!dream.trim()) {
      Alert.alert('알림', '꿈을 입력해주세요.');
      return;
    }

    // 닉네임이 변경된 경우에만 중복 검사
    if (nickname.trim() !== originalNickname) {
      const isNicknameUnique = await checkNicknameUnique(nickname);
      if (!isNicknameUnique) {
        Alert.alert('닉네임 중복', nicknameError || '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.');
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.');

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: nickname.trim(),
          dream: dream.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // 프로필 수정 후 다른 화면의 상태 업데이트를 위해 새로고침
      navigation.navigate('SettingsMain', { profileUpdated: true });
      
      Alert.alert('완료', '프로필이 성공적으로 수정되었습니다.');
    } catch (error) {
      console.error('프로필 수정 실패:', error);
      Alert.alert('오류', '프로필 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={{ paddingTop: Math.max(useSafeAreaInsets().top, 44) }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>프로필을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  const insets = useSafeAreaInsets();
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={{ paddingTop: insets.top }} />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView}>
          {/* 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>프로필 수정</Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={[styles.saveButtonText, loading && styles.saveButtonDisabled]}>
                {loading ? '저장 중...' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>

        {/* 프로필 폼 */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>닉네임</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임을 입력하세요 (10글자 이내)"
              maxLength={10}
              editable={!loading}
            />
            <Text style={styles.charCount}>{nickname.length}/10</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>꿈</Text>
            <TextInput
              style={[styles.input, styles.dreamInput]}
              value={dream}
              onChangeText={setDream}
              placeholder="사용자님의 꿈은 무엇인가요?"
              multiline
              numberOfLines={4}
              maxLength={200}
              editable={!loading}
            />
            <Text style={styles.charCount}>{dream.length}/200</Text>
          </View>

          <View style={styles.helpText}>
            <Text style={styles.helpTitle}>💡 작성 가이드</Text>
            <Text style={styles.helpContent}>
              • 불쾌함과 혐오감을 줄 수 있는 표현은 삼가 주세요.{'\n'}
              • 어떤 꿈이든 소중하며, 그 자체로 위대한 의미가 있습니다.{'\n'}
              • 언제든지 수정할 수 있으니 편하게 작성해주세요
            </Text>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 60,
  },
  backButton: {
    padding: 10,
    margin: -5,
    borderRadius: 20,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dreamInput: {
    height: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  helpText: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  helpContent: {
    fontSize: 12,
    color: '#666',
    lineHeight: 20,
  },
});
