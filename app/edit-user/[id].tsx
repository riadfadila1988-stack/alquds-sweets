import React, {useEffect, useState} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import {useTranslation} from '../_i18n';
import Header from '../components/header';
import {getUser, updateUser} from '@/services/user';
import {useRouter, useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    withTiming,
    useAnimatedStyle,
    interpolateColor,
    Easing
} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {ScreenTemplate} from "@/components/ScreenTemplate";

const isRTL = true;

// Reusable animated input field with icon and focus animation
function InputField({iconName, value, onChangeText, placeholder, secureTextEntry, textAlign}: any) {
    const focused = useSharedValue(0);
    const onFocus = () => {
        focused.value = withTiming(1, {duration: 220, easing: Easing.out(Easing.cubic)} as any);
    };
    const onBlur = () => {
        focused.value = withTiming(0, {duration: 220, easing: Easing.out(Easing.cubic)} as any);
    };

    const animatedStyle = useAnimatedStyle(() => {
        const border = interpolateColor(focused.value, [0, 1], ['#e5e7eb', '#0a7ea4']);
        const shadowOpacity = 0.06 + focused.value * 0.12; // 0.06 -> 0.18
        const shadowRadius = 6 + focused.value * 12;
        const shadowOffsetY = 2 + focused.value * 6;
        return {
            borderColor: border,
            shadowOpacity,
            shadowRadius,
            shadowOffset: {width: 0, height: shadowOffsetY},
            elevation: Math.round(3 + focused.value * 4),
        } as any;
    });

    return (
        <Animated.View style={[styles.inputWrapper, animatedStyle]}>
            <Ionicons name={iconName} size={20} color="#64748b" style={styles.inputIcon}/>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                style={[styles.input, {textAlign: textAlign || 'left'}]}
                secureTextEntry={!!secureTextEntry}
                onFocus={onFocus}
                onBlur={onBlur}
            />
        </Animated.View>
    );
}

export default function EditUserScreen() {
    const {t} = useTranslation();
    const params: any = useLocalSearchParams();
    const id = params.id as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<any>({name: '', idNumber: '', role: 'employee', active: true});
    // password fields for changing password
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // track keyboard height to add bottom padding so inputs are visible
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // choose behavior and offset so keyboard avoids inputs on both platforms
    // Use 'padding' for consistent behavior across platforms with a ScrollView
    const behavior = Platform.OS === 'ios' ? 'padding' : undefined;
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
                setForm({name: data.name, idNumber: data.idNumber, role: data.role, active: data.active});
            } catch (err: any) {
                Alert.alert(t('error') || 'Error', err.response?.data?.message || t('failedToLoadUser') || 'Failed to load user', [
                    {text: t('ok') || 'OK', onPress: () => router.back()},
                ]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
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
            const payload: any = {name: form.name, idNumber: form.idNumber, role: form.role, active: form.active};
            if (newPassword) payload.password = newPassword; // include password only when provided
            await updateUser(id, payload);
            Alert.alert(t('success') || 'Success', t('userUpdated') || 'User updated', [{
                text: t('ok') || 'OK',
                onPress: () => router.back()
            }]);
        } catch (err: any) {
            Alert.alert(t('error') || 'Error', err.response?.data?.message || t('failedToUpdateUser') || 'Failed to update user');
        } finally {
            setSaving(false);
        }
    };

    // updateField helper
    const updateField = (k: string, v: any) => setForm((s: any) => ({...s, [k]: v}));

    // animated press scale for save button (reanimated v2)
    const saveScale = useSharedValue(1);
    const onPressInSave = () => {
        saveScale.value = withTiming(0.96, {duration: 120, easing: Easing.out(Easing.quad)} as any);
    };
    const onPressOutSave = () => {
        saveScale.value = withTiming(1, {duration: 180, easing: Easing.out(Easing.quad)} as any);
    };
    const saveAnimatedStyle = useAnimatedStyle(() => ({transform: [{scale: saveScale.value}]}));

    if (loading) return <ActivityIndicator style={{flex: 1}}/>;

    return (
        <ScreenTemplate title={t('editUser')}>
            <KeyboardAvoidingView style={{flex: 1}} behavior={behavior as any}
                                  keyboardVerticalOffset={keyboardVerticalOffset}>
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <ScrollView contentContainerStyle={{flexGrow: 1, paddingBottom: keyboardHeight}}
                                keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
                        <View style={{flex: 1}}>
                            <View style={styles.container}>
                                <Animated.View style={styles.form} entering={undefined}>
                                    <Text style={styles.label}>{t('name')}</Text>
                                    <InputField
                                        iconName="person-outline"
                                        value={form.name}
                                        onChangeText={(v: string) => updateField('name', v)}
                                        placeholder={t('enterUserName')}
                                        textAlign={isRTL ? 'right' : 'left'}
                                    />

                                    <Text style={[styles.label, {marginTop: 12}]}>{t('idNumber')}</Text>
                                    <InputField
                                        iconName="card-outline"
                                        value={form.idNumber}
                                        onChangeText={(v: string) => updateField('idNumber', v)}
                                        placeholder={t('enterIdNumber')}
                                        textAlign={isRTL ? 'right' : 'left'}
                                    />

                                    <Text style={[styles.label, {marginTop: 12}]}>{t('role')}</Text>
                                    <View style={{flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 8}}>
                                        <TouchableOpacity
                                            style={[styles.roleBtn, form.role === 'employee' && styles.roleBtnActive]}
                                            onPress={() => updateField('role', 'employee')}
                                            activeOpacity={0.85}
                                        >
                                            <Ionicons name="briefcase-outline" size={18}
                                                      color={form.role === 'employee' ? '#0a7ea4' : '#64748b'}
                                                      style={{marginBottom: 4}}/>
                                            <Text
                                                style={[styles.roleText, form.role === 'employee' && styles.roleTextActive]}>{t('employee')}</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.roleBtn, form.role === 'admin' && styles.roleBtnActive]}
                                            onPress={() => updateField('role', 'admin')}
                                            activeOpacity={0.85}
                                        >
                                            <Ionicons name="shield-checkmark-outline" size={18}
                                                      color={form.role === 'admin' ? '#0a7ea4' : '#64748b'}
                                                      style={{marginBottom: 4}}/>
                                            <Text
                                                style={[styles.roleText, form.role === 'admin' && styles.roleTextActive]}>{t('admin')}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Password change section */}
                                    <Text
                                        style={[styles.label, {marginTop: 12}]}>{t('newPassword') || 'New password'}</Text>
                                    <InputField
                                        iconName="lock-closed-outline"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder={t('newPassword') || 'New password'}
                                        secureTextEntry
                                        textAlign={isRTL ? 'right' : 'left'}
                                    />

                                    <Text
                                        style={[styles.label, {marginTop: 12}]}>{t('confirmPassword') || 'Confirm password'}</Text>
                                    <InputField
                                        iconName="lock-closed-outline"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder={t('confirmPassword') || 'Confirm password'}
                                        secureTextEntry
                                        textAlign={isRTL ? 'right' : 'left'}
                                    />

                                    <Text style={{
                                        fontSize: 12,
                                        color: '#64748b',
                                        marginTop: 6
                                    }}>{t('passwordHelp') || 'Leave blank to keep the current password. Minimum 6 characters.'}</Text>

                                    <View style={{marginTop: 18}}>
                                        <Animated.View style={saveAnimatedStyle as any}>
                                            <TouchableOpacity
                                                style={[styles.saveBtn, saving && {opacity: 0.6}]}
                                                onPress={handleSave}
                                                disabled={saving}
                                                onPressIn={onPressInSave}
                                                onPressOut={onPressOutSave}
                                                activeOpacity={0.9}
                                            >
                                                <LinearGradient colors={['#06a3d8', '#0a7ea4']}
                                                                style={styles.saveBtnGradient} start={{x: 0, y: 0}}
                                                                end={{x: 1, y: 0}}>
                                                    {saving ? <ActivityIndicator color="#fff"/> :
                                                        <Text style={styles.saveText}>{t('save') || 'Save'}</Text>}
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    </View>
                                </Animated.View>
                            </View>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </ScreenTemplate>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, padding: 16},
    form: {
        backgroundColor: 'rgba(255,255,255,0.98)',
        padding: 18,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)'
    },
    label: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '700',
        textAlign: 'right',
        alignSelf: 'flex-end',
        marginBottom: 6
    },
    inputWrapper: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginTop: 6
    },
    inputIcon: {marginHorizontal: 8, color: '#64748b'},
    input: {flex: 1, paddingVertical: 8, paddingHorizontal: 6, fontSize: 16, color: '#0f172a'},
    roleBtn: {
        flex: 1,
        padding: 14,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        alignItems: 'center',
        marginRight: 8,
        backgroundColor: '#fff'
    },
    roleBtnActive: {
        borderColor: '#0a7ea4',
        backgroundColor: '#f0fbff',
        shadowColor: '#0a7ea4',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 4}
    },
    roleText: {color: '#64748b', fontWeight: '700'},
    roleTextActive: {color: '#0a7ea4'},
    saveBtn: {borderRadius: 12, overflow: 'hidden'},
    saveBtnGradient: {paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center'},
    saveText: {color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.35},
});
