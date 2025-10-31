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
            <Header title={t('addNewUser') || 'Add New User'} />
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={styles.subtitle}>{t('addUserSubtitle')}</Text>
            </View>

            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{`${t('name')} *`}</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={formData.name}
                  onChangeText={(text) => updateField('name', text)}
                  placeholder={t('enterUserName')}
                  placeholderTextColor="#999"
                  textAlign={isRTL ? 'right' : 'left'}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* ID Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{`${t('idNumber')} *`}</Text>
                <TextInput
                  style={[styles.input, errors.idNumber && styles.inputError]}
                  value={formData.idNumber}
                  onChangeText={(text) => updateField('idNumber', text)}
                  placeholder={t('enterIdNumber')}
                  placeholderTextColor="#999"
                  textAlign={isRTL ? 'right' : 'left'}
                  autoCapitalize="none"
                />
                {errors.idNumber && <Text style={styles.errorText}>{errors.idNumber}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{`${t('password')} *`}</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={formData.password}
                  onChangeText={(text) => updateField('password', text)}
                  placeholder={t('enterPassword')}
                  placeholderTextColor="#999"
                  textAlign={isRTL ? 'right' : 'left'}
                  secureTextEntry
                  autoCapitalize="none"
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{`${t('confirmPassword')} *`}</Text>
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateField('confirmPassword', text)}
                  placeholder={t('reEnterPassword')}
                  placeholderTextColor="#999"
                  textAlign={isRTL ? 'right' : 'left'}
                  secureTextEntry
                  autoCapitalize="none"
                />
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
                  >
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
                  >
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
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('addUser')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: isRTL ? 'right' : 'left',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: isRTL ? 'right' : 'left',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  roleContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 14,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  roleButtonTextActive: {
    color: '#3b82f6',
  },
  switchContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  switchDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
