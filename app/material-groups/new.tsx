import React, {useState, useRef, useEffect} from 'react';
import {View, StyleSheet, ActivityIndicator, Text, Alert, Animated, Easing, TextInput, Platform, TouchableOpacity} from 'react-native';
import MaterialGroupForm from '@/components/material-group/material-group-form';
import {useMaterialGroups} from '@/hooks/use-material-groups';
import {useRouter} from 'expo-router';
import {useTranslation} from '@/app/_i18n';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ScreenTemplate} from "@/components/ScreenTemplate";
import {LinearGradient} from 'expo-linear-gradient';
import {Feather} from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export default function NewMaterialGroupScreen() {
    const {t} = useTranslation();
    const {create} = useMaterialGroups();
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    // Controlled name and selected materials lifted to parent
    const [groupName, setGroupName] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [nameFocused, setNameFocused] = useState(false);

    // Animated scales for action buttons
    const cancelScale = useRef(new Animated.Value(1)).current;
    const saveScale = useRef(new Animated.Value(1)).current;

    const animatePressIn = (val: Animated.Value) => {
        Animated.timing(val, { toValue: 0.97, duration: 90, useNativeDriver: true }).start();
    };
    const animatePressOut = (val: Animated.Value) => {
        Animated.spring(val, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    };

    const canSave = groupName.trim().length > 0; // enable when name entered

    // Main card entrance animation
    const anim = useRef(new Animated.Value(0)).current;

    // Floating bubbles animations
    const bubbles = useRef(
        [...Array(5)].map(() => ({
            y: new Animated.Value(0),
            x: new Animated.Value(0),
            scale: new Animated.Value(0),
            rotate: new Animated.Value(0),
        }))
    ).current;

    useEffect(() => {
        // Card entrance with bouncy effect
        Animated.spring(anim, {
            toValue: 1,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
        }).start();

        // Animate floating bubbles with staggered delays
        bubbles.forEach((bubble, i) => {
            const delay = i * 100;
            const yRange = -100 - Math.random() * 60;
            const xRange = (Math.random() - 0.5) * 80;

            Animated.sequence([
                Animated.delay(delay),
                Animated.spring(bubble.scale, {
                    toValue: 1,
                    friction: 6,
                    useNativeDriver: true
                }),
                Animated.parallel([
                    Animated.loop(
                        Animated.sequence([
                            Animated.timing(bubble.y, {
                                toValue: yRange,
                                duration: 3000 + i * 400,
                                easing: Easing.inOut(Easing.ease),
                                useNativeDriver: true,
                            }),
                            Animated.timing(bubble.y, {
                                toValue: 0,
                                duration: 3000 + i * 400,
                                easing: Easing.inOut(Easing.ease),
                                useNativeDriver: true,
                            }),
                        ])
                    ),
                    Animated.loop(
                        Animated.sequence([
                            Animated.timing(bubble.x, {
                                toValue: xRange,
                                duration: 2000 + i * 300,
                                easing: Easing.inOut(Easing.sin),
                                useNativeDriver: true,
                            }),
                            Animated.timing(bubble.x, {
                                toValue: -xRange,
                                duration: 2000 + i * 300,
                                easing: Easing.inOut(Easing.sin),
                                useNativeDriver: true,
                            }),
                        ])
                    ),
                    Animated.loop(
                        Animated.sequence([
                            Animated.timing(bubble.rotate, {
                                toValue: 1,
                                duration: 4000 + i * 500,
                                easing: Easing.linear,
                                useNativeDriver: true,
                            }),
                        ])
                    ),
                ]),
            ]).start();
        });
    }, [anim, bubbles]);

    const handleSubmit = async (data?: any) => {
        try {
            setIsSaving(true);
            const payload = data ?? { name: groupName.trim(), materials: selectedIds };
            if (!payload.name) {
                Alert.alert(t('error') || 'Error', t('nameRequired') || 'Name required');
                setIsSaving(false);
                return;
            }
            await create(payload);
            router.replace('/material-groups' as any);
        } catch (err: any) {
            console.error('Failed to create material group', err);
            Alert.alert(t('error') || 'Error', err?.message || 'Failed to create material group');
        } finally {
            setIsSaving(false);
        }
    };

    // Main card animation style
    const cardStyle = {
        transform: [
            {
                scale: anim.interpolate({inputRange: [0, 1], outputRange: [0.92, 1]}),
            },
            {translateY: anim.interpolate({inputRange: [0, 1], outputRange: [30, 0]})},
        ],
        opacity: anim,
    } as any;

    return (
        <ScreenTemplate title={t('newMaterialGroup') || 'New Material Group'}>
            <SafeAreaView style={styles.container}>
                {/* Parent-level name input - premium gradient border with focus state */}
                <View style={styles.nameBar}>
                    <Text style={styles.nameLabel}>{t('name') || 'Name'}</Text>
                    <LinearGradient
                        colors={nameFocused ? ['#667eea', '#764ba2'] : ['#e9ecef', '#e9ecef']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.nameInputGradient}
                    >
                        <View style={styles.nameInputInner}>
                            <Feather name="folder" size={18} color={nameFocused ? '#667eea' : '#999'} style={{ marginRight: 10 }} />
                            <TextInput
                                value={groupName}
                                onChangeText={setGroupName}
                                style={styles.nameInput}
                                placeholder={t('namePlaceholder') || 'Enter group name'}
                                placeholderTextColor="#999"
                                autoCapitalize="sentences"
                                autoCorrect={false}
                                returnKeyType="done"
                                underlineColorAndroid="transparent"
                                onFocus={() => setNameFocused(true)}
                                onBlur={() => setNameFocused(false)}
                                accessibilityLabel={t('name') || 'Name'}
                            />
                            {groupName.length > 0 && (
                                <TouchableOpacity onPress={() => setGroupName('')} accessibilityLabel={t('clear') || 'Clear'}>
                                    <Feather name="x-circle" size={18} color="#bbb" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </LinearGradient>
                </View>

                {/* Floating bubbles decoration */}
                {bubbles.map((bubble, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.bubble,
                            {
                                left: `${10 + i * 18}%`,
                                top: `${15 + (i % 2) * 10}%`,
                                width: 40 + (i % 3) * 20,
                                height: 40 + (i % 3) * 20,
                                backgroundColor: [
                                    '#667eea44',
                                    '#764ba244',
                                    '#f093fb44',
                                    '#fad0c444',
                                    '#a18cd144'
                                ][i],
                                transform: [
                                    { translateY: bubble.y },
                                    { translateX: bubble.x },
                                    { scale: bubble.scale },
                                    {
                                        rotate: bubble.rotate.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '360deg'],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                ))}
                <View style={styles.content}>
                    <Animated.View style={[styles.cardContainer, cardStyle]}>
                        {/* Gradient border effect */}
                        <LinearGradient
                            colors={['#667eea22', '#764ba222', '#f093fb22']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardGradientBorder}
                        >
                            <View style={styles.card}>
                                <MaterialGroupForm
                                    showNameInput={false}
                                    showActions={false}
                                    name={groupName}
                                    onChangeName={setGroupName}
                                    onChangeSelected={setSelectedIds}
                                    onSubmit={(data) => handleSubmit(data)}
                                    onClose={() => router.back()}
                                    isSaving={isSaving}
                                />
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </View>

                {/* Persistent action bar with blur background */}
                <BlurView intensity={40} tint="light" style={styles.actionBar}>
                    <Animated.View style={{ flex: 1, transform: [{ scale: cancelScale }] }}>
                        <TouchableOpacity
                            onPressIn={() => animatePressIn(cancelScale)}
                            onPressOut={() => animatePressOut(cancelScale)}
                            onPress={() => router.back()}
                            activeOpacity={0.85}
                            style={[styles.actionBtn, styles.actionCancel]}
                            accessibilityRole="button"
                            accessibilityLabel={t('cancel') || 'Cancel'}
                        >
                            <Feather name="x" size={18} color="#667eea" />
                            <Text style={styles.actionCancelText}>{t('cancel') || 'Cancel'}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                    <View style={{ width: 12 }} />
                    <Animated.View style={{ flex: 1, transform: [{ scale: saveScale }], opacity: canSave ? 1 : 0.6 }}>
                        <TouchableOpacity
                            onPressIn={() => canSave && animatePressIn(saveScale)}
                            onPressOut={() => animatePressOut(saveScale)}
                            onPress={() => canSave && handleSubmit()}
                            disabled={!canSave || isSaving}
                            activeOpacity={0.9}
                            style={[styles.actionBtn, styles.actionSave]}
                            accessibilityRole="button"
                            accessibilityLabel={t('save') || 'Save'}
                        >
                            <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionSaveGradient}>
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Feather name="check" size={18} color="#fff" />
                                        <Text style={styles.actionSaveText}>{t('save') || 'Save'}</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </BlurView>

                {isSaving && (
                    <View style={styles.overlay} pointerEvents="none">
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.overlayBox}
                        >
                            <ActivityIndicator size="large" color="#fff"/>
                            <Text style={styles.overlayText}>{t('saving') || 'Saving...'}</Text>
                        </LinearGradient>
                    </View>
                )}
            </SafeAreaView>
        </ScreenTemplate>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },

    // Floating bubbles
    bubble: {
        position: 'absolute',
        borderRadius: 1000,
        opacity: 0.6,
    },

    // Hero section
    heroSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    heroIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 300,
    },

    // Content
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 70, // leave space for the floating action bar
    },
    cardContainer: {
        width: '100%',
        maxWidth: 600,
    },
    cardGradientBorder: {
        borderRadius: 20,
        padding: 2,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 18,
        padding: 24,
    },

    // Name input bar
    nameBar: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    nameLabel: {
        fontSize: 13,
        color: '#444',
        marginBottom: 6,
        fontWeight: '700'
    },
    nameInputGradient: {
        borderRadius: 14,
        padding: 2,
    },
    nameInputInner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: Platform.select({ ios: 12, default: 10 }),
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 2,
        paddingRight: 12, // space for clear icon
    },
    nameInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        padding: 0,
        margin: 0,
        minHeight: Platform.select({ ios: 20, android: 24 }),
    },

    // Action bar
    actionBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 12,
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        backgroundColor: 'transparent',
    },
    actionBtn: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
    },
    actionCancel: {
        backgroundColor: '#f9fafe',
        borderWidth: 1,
        borderColor: '#667eea33',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingVertical: 14,
        marginRight: 12,
    },
    actionCancelText: { fontSize: 15, fontWeight: '700', color: '#667eea', marginLeft: 8 },
    actionSave: {
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    actionSaveGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
    },
    actionSaveText: { fontSize: 15, fontWeight: '800', color: '#fff', marginLeft: 8 },

    // Overlay during saving
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    overlayBox: {
        paddingVertical: 24,
        paddingHorizontal: 40,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    overlayText: {
        color: '#fff',
        marginTop: 12,
        fontSize: 16,
        fontWeight: '700',
    },
});
