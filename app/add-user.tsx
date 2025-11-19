import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { addUser } from '@/services/user';
import { useTranslation } from './_i18n';
import Header from './components/header';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Premium palette
const premiumColors = {
  backgroundGradient: ['#0f2027', '#203a43', '#2c5364'] as const,
  cardGradient: ['#ffffff', '#f8fafb'] as const,
  accent: '#0a7ea4',
  accentLight: '#0ea5e9',
  success: '#10b981',
  danger: '#ef4444',
  textPrimary: '#1A202C',
  textSecondary: '#64748b',
  inputBg: '#f8fafc',
  inputBorder: '#e2e8f0',
  inputBorderFocus: '#0a7ea4',
};

interface UserForm {
  name: string;
  idNumber: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'employee';
  active: boolean;
}

const isRTL = true;

export default function AddUserScreen() {
  const { t } = useTranslation();
  const scrollRef = useRef<any>(null);
  const [formData, setFormData] = useState<UserForm>({
    name: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof UserForm, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserForm, string>> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = t('nameRequired');
    }

    // Validate ID number
    if (!formData.idNumber.trim()) {
      newErrors.idNumber = t('idNumberRequired');
    } else if (formData.idNumber.length < 3) {
      newErrors.idNumber = t('idNumberMin');
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = t('passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('passwordMin');
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('passwordsNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name: formData.name,
        idNumber: formData.idNumber,
        password: formData.password,
        role: formData.role,
        active: formData.active,
      };

      await addUser(userData);

      Alert.alert(
        t('success'),
        t('userAddedSuccessfully'),
        [
          {
            text: t('ok'),
            onPress: () => {
              // Reset form
              setFormData({
                name: '',
                idNumber: '',
                password: '',
                confirmPassword: '',
                role: 'employee',
                active: true,
              });
              setErrors({});
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        t('error'),
        error.response?.data?.message || t('failedToAddUser')
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof UserForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <LinearGradient colors={premiumColors.backgroundGradient} style={{ flex: 1 }}>
      <Header title={t('addNewUser') || 'Add New User'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <KeyboardAwareScrollView
            innerRef={(r) => (scrollRef.current = r)}
            style={styles.container}
            contentContainerStyle={[styles.contentContainer, { flexGrow: 1 }]}
            enableOnAndroid
            extraScrollHeight={Platform.OS === 'ios' ? 80 : 60}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flex: 1 }}>
              <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                <Text style={styles.subtitle}>{t('addUserSubtitle')}</Text>
              </View>

            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{`${t('name')} *`}</Text>
                <View style={[styles.inputWrapper, errors.name && styles.inputWrapperError]}>
                  <Ionicons name="person-outline" size={20} color={premiumColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => updateField('name', text)}
                    placeholder={t('enterUserName')}
                    placeholderTextColor="#94a3b8"
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* ID Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{`${t('idNumber')} *`}</Text>
                <View style={[styles.inputWrapper, errors.idNumber && styles.inputWrapperError]}>
                  <Ionicons name="card-outline" size={20} color={premiumColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.idNumber}
                    onChangeText={(text) => updateField('idNumber', text)}
                    placeholder={t('enterIdNumber')}
                    placeholderTextColor="#94a3b8"
                    textAlign={isRTL ? 'right' : 'left'}
                    autoCapitalize="none"
                  />
                </View>
                {errors.idNumber && <Text style={styles.errorText}>{errors.idNumber}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{`${t('password')} *`}</Text>
                <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                  <Ionicons name="lock-closed-outline" size={20} color={premiumColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={(text) => updateField('password', text)}
                    placeholder={t('enterPassword')}
                    placeholderTextColor="#94a3b8"
                    textAlign={isRTL ? 'right' : 'left'}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{`${t('confirmPassword')} *`}</Text>
                <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
                  <Ionicons name="lock-closed-outline" size={20} color={premiumColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.confirmPassword}
                    onChangeText={(text) => updateField('confirmPassword', text)}
                    placeholder={t('reEnterPassword')}
                    placeholderTextColor="#94a3b8"
                    textAlign={isRTL ? 'right' : 'left'}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{`${t('role')} *`}</Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'employee' && styles.roleButtonActive,
                    ]}
                    onPress={() => updateField('role', 'employee')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="briefcase-outline"
                      size={20}
                      color={formData.role === 'employee' ? premiumColors.accent : premiumColors.textSecondary}
                      style={{ marginBottom: 4 }}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === 'employee' && styles.roleButtonTextActive,
                      ]}
                    >
                      {t('employee')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'admin' && styles.roleButtonActive,
                    ]}
                    onPress={() => updateField('role', 'admin')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={formData.role === 'admin' ? premiumColors.accent : premiumColors.textSecondary}
                      style={{ marginBottom: 4 }}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === 'admin' && styles.roleButtonTextActive,
                      ]}
                    >
                      {t('admin')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[premiumColors.accentLight, premiumColors.accent]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={22} color="#fff" style={{ marginEnd: 8 }} />
                      <Text style={styles.submitButtonText}>{t('addUser')}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F7FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#CBD5E0',
    textAlign: isRTL ? 'right' : 'left',
    lineHeight: 22,
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: premiumColors.textPrimary,
    marginBottom: 10,
    textAlign: 'right',
    alignSelf: 'flex-end',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: premiumColors.inputBg,
    borderWidth: 1.5,
    borderColor: premiumColors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  inputWrapperError: {
    borderColor: premiumColors.danger,
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginHorizontal: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: premiumColors.textPrimary,
  },
  inputError: {
    borderColor: premiumColors.danger,
  },
  errorText: {
    color: premiumColors.danger,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'right',
    alignSelf: 'flex-end',
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderColor: premiumColors.inputBorder,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: premiumColors.inputBg,
  },
  roleButtonActive: {
    borderColor: premiumColors.accent,
    backgroundColor: '#f0f9ff',
    shadowColor: premiumColors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: premiumColors.textSecondary,
  },
  roleButtonTextActive: {
    color: premiumColors.accent,
  },
  switchContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: premiumColors.textPrimary,
  },
  switchDescription: {
    fontSize: 14,
    color: premiumColors.textSecondary,
    marginTop: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  submitButton: {
    borderRadius: 14,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: premiumColors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
