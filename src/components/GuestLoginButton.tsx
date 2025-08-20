import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import useProfileStore from '../store/profileStore';

interface GuestLoginButtonProps {
  onSuccess?: () => void;
}

export default function GuestLoginButton({ onSuccess }: GuestLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const { performGuestLogin } = useAuthStore();
  const { createProfile } = useProfileStore();

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      
      console.log('🚀 게스트 로그인 시작');
      
      // 게스트 로그인 실행
      const guestSession = await performGuestLogin();
      
      if (guestSession) {
        console.log('✅ 게스트 로그인 성공');
        
        // 기본 프로필 생성
        await createProfile({
          display_name: `게스트${Math.floor(Math.random() * 1000)}`,
          dream: '더 나은 내일을 위한 작은 시작'
        });
        
        onSuccess?.();
      }
    } catch (error) {
      console.error('❌ 게스트 로그인 실패:', error);
      Alert.alert('알림', '게스트 모드 시작에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, loading && styles.disabled]} 
      onPress={handleGuestLogin}
      disabled={loading}
    >
      <Text style={styles.buttonText}>
        {loading ? '시작 중...' : '게스트로 시작하기'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});