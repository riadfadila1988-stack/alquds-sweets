import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from './_i18n';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const { login, user, isLoading, error } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

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
      <TextInput
        style={styles.input}
        placeholder={t('idNumber')}
        value={idNumber}
        onChangeText={setIdNumber}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder={t('password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={isLoading ? t('loginButton') + '...' : t('loginButton')} onPress={handleLogin} disabled={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 12, marginBottom: 16, writingDirection: 'rtl', textAlign: 'right' }
});
