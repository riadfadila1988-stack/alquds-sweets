import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useTranslation } from '../_i18n';
import Header from '../components/header';
import { getUser, updateUser } from '@/services/user';
import { useRouter, useLocalSearchParams } from 'expo-router';

const isRTL = true;

export default function EditUserScreen() {
  const { t } = useTranslation();
  const params: any = useLocalSearchParams();
  const id = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ name: '', idNumber: '', role: 'employee', active: true });
  // password fields for changing password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // track keyboard height to add bottom padding so inputs are visible
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // choose behavior and offset so keyboard avoids inputs on both platforms
  // Use 'padding' for consistent behavior across platforms with a ScrollView
  const behavior = 'padding';
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 80 : 100;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    };
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getUser(id);
        if (!mounted) return;
        setForm({ name: data.name, idNumber: data.idNumber, role: data.role, active: data.active });
      } catch (err: any) {
        Alert.alert(t('error') || 'Error', err.response?.data?.message || t('failedToLoadUser') || 'Failed to load user', [
          { text: t('ok') || 'OK', onPress: () => router.back() },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // include router and t to satisfy lint rules (they are stable here)
  }, [id, router, t]);

  const handleSave = async () => {
    // validate password fields if user wants to change password
    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        Alert.alert(t('error') || 'Error', t('passwordMinLength') || 'Password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert(t('error') || 'Error', t('passwordsDoNotMatch') || "Passwords don't match");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = { name: form.name, idNumber: form.idNumber, role: form.role, active: form.active };
      if (newPassword) payload.password = newPassword; // include password only when provided
      await updateUser(id, payload);
      Alert.alert(t('success') || 'Success', t('userUpdated') || 'User updated', [{ text: t('ok') || 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert(t('error') || 'Error', err.response?.data?.message || t('failedToUpdateUser') || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={behavior as any} keyboardVerticalOffset={keyboardVerticalOffset}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboardHeight }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          <View style={{ flex: 1 }}>
            <Header titleKey="editUser" />
            <View style={styles.container}>
              <View style={styles.form}>
                <Text style={styles.label}>{t('name')}</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((s: any) => ({ ...s, name: v }))} textAlign={isRTL ? 'right' : 'left'} />

                <Text style={[styles.label, { marginTop: 12 }]}>{t('idNumber')}</Text>
                <TextInput style={styles.input} value={form.idNumber} onChangeText={(v) => setForm((s: any) => ({ ...s, idNumber: v }))} textAlign={isRTL ? 'right' : 'left'} />

                <Text style={[styles.label, { marginTop: 12 }]}>{t('role')}</Text>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 8 }}>
                  <TouchableOpacity style={[styles.roleBtn, form.role === 'employee' && styles.roleBtnActive]} onPress={() => setForm((s: any) => ({ ...s, role: 'employee' }))}>
                    <Text style={[styles.roleText, form.role === 'employee' && styles.roleTextActive]}>{t('employee')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.roleBtn, form.role === 'admin' && styles.roleBtnActive]} onPress={() => setForm((s: any) => ({ ...s, role: 'admin' }))}>
                    <Text style={[styles.roleText, form.role === 'admin' && styles.roleTextActive]}>{t('admin')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Password change section */}
                <Text style={[styles.label, { marginTop: 12 }]}>{t('newPassword') || 'New password'}</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder={t('newPassword') || 'New password'}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <Text style={[styles.label, { marginTop: 12 }]}>{t('confirmPassword') || 'Confirm password'}</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder={t('confirmPassword') || 'Confirm password'}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{t('passwordHelp') || 'Leave blank to keep the current password. Minimum 6 characters.'}</Text>

                <View style={{ marginTop: 16 }}>
                  <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('save') || 'Save'}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  form: { backgroundColor: '#fff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 14, color: '#374151', fontWeight: '600', textAlign: 'right', alignSelf: 'flex-end' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 8, marginTop: 8 },
  roleBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, alignItems: 'center', marginRight: 8 },
  roleBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  roleText: { color: '#6b7280', fontWeight: '600' },
  roleTextActive: { color: '#3b82f6' },
  saveBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
