import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from './_i18n';
import { useAuth } from '@/hooks/use-auth';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const textColor = Colors[colorScheme].text;
  const placeholderTextColor = colorScheme === 'light' ? '#6b7280' : '#9BA1A6';

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.replace('./admin');
      } else {
        router.replace('./employee');
      }
    }
  }, [user, router]);

  const handleLogin = async () => {
    const success = await login(idNumber, password);
    if (!success) {
      Alert.alert(t('loginError'));
    }
  };

  if (isLoading && !user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('login')}</Text>
      <Text style={styles.label}>{t('idNumber')}</Text>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholder={t('idNumber')}
        placeholderTextColor={placeholderTextColor}
        value={idNumber}
        onChangeText={setIdNumber}
        autoCapitalize="none"
      />
      <Text style={styles.label}>{t('password')}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { color: textColor, flex: 1, marginBottom: 0 }]}
          placeholder={t('password')}
          placeholderTextColor={placeholderTextColor}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword((s) => !s)}
          accessibilityLabel={showPassword ? (t('hide') ?? 'Hide') : (t('show') ?? 'Show')}
          style={styles.eyeButton}
        >
          <Text style={[styles.eyeText, { color: textColor }]}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
      <Button title={isLoading ? t('loginButton') + '...' : t('loginButton')} onPress={handleLogin} disabled={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 16, marginBottom: 8, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  eyeButton: { paddingHorizontal: 8, paddingVertical: 6 },
  eyeText: { fontSize: 18 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 12, marginBottom: 16, writingDirection: 'rtl', textAlign: 'right' }
});
