import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import * as AuthApi from '../api/auth';

const deviceTypeLabel: Record<string, string> = {
  ANDROID: 'اندروید',
  IOS: 'آی‌او‌اس',
  DESKTOP: 'دسکتاپ',
};

export default function LoginScreen() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loggedElsewhereModal, setLoggedElsewhereModal] = useState<{ deviceType: string } | null>(null);
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    const id = loginId.trim();
    if (!id || !password) {
      setError('شماره موبایل/ایمیل و رمز عبور را وارد کنید.');
      return;
    }
    setError('');
    setLoggedElsewhereModal(null);
    setLoading(true);
    try {
      await login(id, password);
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.code === 'LOGGED_IN_ELSEWHERE') {
        setLoggedElsewhereModal({ deviceType: err.response.data.deviceType || 'DESKTOP' });
        setError('');
      } else {
        const msg =
          err.response?.data?.message ||
          (err.response?.status === 429
            ? 'درخواست زیاد. چند دقیقه دیگر تلاش کنید.'
            : 'ورود ناموفق. اطلاعات را بررسی کنید.');
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogoutAll = async () => {
    const id = loginId.trim();
    setForceLogoutLoading(true);
    setError('');
    try {
      await AuthApi.forceLogoutAll({ login: id, password });
      setLoggedElsewhereModal(null);
      await login(id, password);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'خروج از همه دستگاه‌ها ناموفق بود. دوباره تلاش کنید.';
      setError(msg);
    } finally {
      setForceLogoutLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Modal
        visible={!!loggedElsewhereModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLoggedElsewhereModal(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !forceLogoutLoading && setLoggedElsewhereModal(null)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {loggedElsewhereModal && (
              <>
                <Text style={styles.modalTitle}>ورود از دستگاه دیگر</Text>
                <Text style={styles.modalText}>
                  شما با دستگاه دیگری ({deviceTypeLabel[loggedElsewhereModal.deviceType] || loggedElsewhereModal.deviceType}) وارد شده‌اید.
                </Text>
                <Text style={styles.modalSubtext}>
                  برای ورود از این دستگاه، ابتدا از همه دستگاه‌ها خارج شوید.
                </Text>
                <TouchableOpacity
                  style={[styles.modalButton, forceLogoutLoading && styles.buttonDisabled]}
                  onPress={handleForceLogoutAll}
                  disabled={forceLogoutLoading}
                >
                  {forceLogoutLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>خروج از همه دستگاه‌ها</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setLoggedElsewhereModal(null)}
                  disabled={forceLogoutLoading}
                >
                  <Text style={styles.modalCancelText}>انصراف</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

    <KeyboardAvoidingView
      style={styles.containerInner}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.card, Platform.OS === 'android' && styles.cardAndroid]}>
        <Text style={styles.title}>من حقیقی</Text>
        <Text style={styles.subtitle}>ورود به حساب کاربری</Text>

        <TextInput
          style={styles.input}
          placeholder="شماره موبایل یا ایمیل"
          placeholderTextColor="#888"
          value={loginId}
          onChangeText={(t) => {
            setLoginId(t);
            setError('');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="رمز عبور"
          placeholderTextColor="#888"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError('');
          }}
          secureTextEntry
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>ورود</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  containerInner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardAndroid: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#facc15',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  error: {
    color: '#f87171',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#eab308',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#eab308',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalCancel: {
    marginTop: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#888',
    fontSize: 14,
  },
});
