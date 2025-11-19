import React, {useState, useEffect, useRef} from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    Image
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useTranslation} from './_i18n';
import {useAuth} from '@/hooks/use-auth';
import {Colors} from '@/constants/theme';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Ionicons} from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {BlurView} from 'expo-blur';
import {useRouter} from 'expo-router';

export default function LoginScreen() {
    const [idNumber, setIdNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showHello, setShowHello] = useState(false);
    const [userName, setUserName] = useState('');
    const {login, user, isLoading} = useAuth();
    const router = useRouter();
    const {t, lang} = useTranslation();
    const isRtl = lang === 'ar';
    const colorScheme = useColorScheme();
    const textColor = Colors[colorScheme].text;
    const placeholderTextColor = colorScheme === 'light' ? '#6b7280' : '#9BA1A6';

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Hello overlay animations
    const helloOpacity = useRef(new Animated.Value(0)).current;
    const helloScale = useRef(new Animated.Value(0.6)).current;
    // extra pulse for lively text
    const helloPulse = useRef(new Animated.Value(1)).current;
    const helloPulseAnimRef = useRef<any>(null);
    const helloTimeoutRef = useRef<any>(null);

    // Confetti burst
    const CONFETTI_COUNT = 12;
    const confettiAnims = useRef(Array.from({length: CONFETTI_COUNT}, () => new Animated.Value(0))).current;
    const confettiOffsets = useRef(Array.from({length: CONFETTI_COUNT}, () => (Math.random() * 220 - 110))).current;
    const confettiColors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6', '#FF7AB6'];
    // Fun emoji burst
    const EMOJI_COUNT = 5;
    const emojiAnims = useRef(Array.from({length: EMOJI_COUNT}, () => ({
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(0),
        scale: new Animated.Value(0.6),
    }))).current;
    const emojis = ['🎉', '🍬', '✨', '🚀', '😄'];

    useEffect(() => {
        // Initial animations (screen entrance)
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Trigger the hello animation sequence and navigate afterwards
    const triggerHelloSequence = React.useCallback((maybeUser?: any) => {
        setShowHello(true);

        // Reset confetti animations
        confettiAnims.forEach((a) => a.setValue(0));
        helloOpacity.setValue(0);
        helloScale.setValue(0.6);
        // reset emoji anims
        emojiAnims.forEach((e) => {
            e.opacity.setValue(0);
            e.translateY.setValue(0);
            e.scale.setValue(0.6);
        });

        // Hello card entrance
        Animated.parallel([
            Animated.timing(helloOpacity, {
                toValue: 1,
                duration: 450,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true
            }),
            Animated.spring(helloScale, {toValue: 1, friction: 5, tension: 100, useNativeDriver: true}),
        ]).start(() => {
            // small haptic
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // start a gentle looping pulse on top of the scale to make the greeting feel alive
            helloPulseAnimRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(helloPulse, {
                        toValue: 1.04,
                        duration: 750,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true
                    }),
                    Animated.timing(helloPulse, {
                        toValue: 1.0,
                        duration: 750,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true
                    }),
                ])
            );
            helloPulseAnimRef.current.start();

            // Confetti burst: staggered animations that fly outwards
            const confettiAnimsSeq = confettiAnims.map((anim) =>
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 900 + Math.round(Math.random() * 400),
                    easing: Easing.out(Easing.exp),
                    useNativeDriver: true
                })
            );
            Animated.stagger(60, confettiAnimsSeq).start();

            // Emoji pop burst (quick, fun)
            const emojiSeq = emojiAnims.map((e, i) => Animated.parallel([
                Animated.timing(e.opacity, {toValue: 1, duration: 300, useNativeDriver: true}),
                Animated.timing(e.translateY, {
                    toValue: -60 - i * 10,
                    duration: 700 + i * 80,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true
                }),
                Animated.spring(e.scale, {toValue: 1.1, friction: 4, useNativeDriver: true}),
            ]));
            Animated.stagger(80, emojiSeq).start();

            // After a short pause navigate to the correct screen
            helloTimeoutRef.current = setTimeout(() => {
                const route = maybeUser?.role === 'admin'  ? '/admin' : '/employee';
                // fade out the hello overlay a bit before navigating
                // stop pulse
                helloPulseAnimRef.current?.stop();
                Animated.timing(helloOpacity, {toValue: 0, duration: 400, useNativeDriver: true}).start(() => {
                    setShowHello(false);
                    router.replace(route);
                });
            }, 2000);
        });
    }, [confettiAnims, helloOpacity, helloScale, router, emojiAnims, helloPulse]);

    // If the user is already logged in on mount, trigger the hello sequence
    useEffect(() => {
        if (user) {
            setUserName(user.name ?? '');
            triggerHelloSequence(user);
        }
    }, [user, router, triggerHelloSequence]);

    // Allow user to tap the overlay to skip animations and navigate immediately
    const skipHello = React.useCallback(() => {
        if (helloTimeoutRef.current) {
            clearTimeout(helloTimeoutRef.current);
            helloTimeoutRef.current = null;
        }
        helloPulseAnimRef.current?.stop();
        const route = user?.role === 'admin' ? '/admin' : '/employee';
        setShowHello(false);
        router.replace(route);
    }, [router, user]);

    const handleLogin = () => {
        // Button press animation
        Animated.sequence([
            Animated.timing(scaleAnim, {toValue: 0.95, duration: 100, useNativeDriver: true}),
            Animated.timing(scaleAnim, {toValue: 1, duration: 100, useNativeDriver: true}),
        ]).start(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            login(idNumber, password).then((success) => {
                if (!success.status) {
                    Alert.alert(t('loginError'));
                } else {
                    // trigger fun hello animation and navigation
                    triggerHelloSequence(success.user);
                }
            });
        });
    };

    // cleanup on unmount: stop pulse and clear timeout if any
    useEffect(() => {
        return () => {
            if (helloTimeoutRef.current) {
                clearTimeout(helloTimeoutRef.current);
                helloTimeoutRef.current = null;
            }
            try {
                helloPulseAnimRef.current?.stop();
            } catch {
                // ignore
            }
        };
    }, []);

    if (isLoading && !user) {
        return (
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
                <ActivityIndicator size="large" color="#fff"/>
            </LinearGradient>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <LinearGradient colors={['#667eea', '#764ba2', '#f093fb']} style={styles.background}>
                <BlurView intensity={80} tint={colorScheme === 'light' ? 'light' : 'dark'} style={styles.blurContainer}>
                    <Animated.View style={[styles.card, {
                        opacity: fadeAnim,
                        transform: [{translateY: slideAnim}, {scale: scaleAnim}]
                    }]}>
                        <View style={{borderRadius: 20, overflow: 'hidden', width: 250, height: 250}}>
                        <Image source={require('../assets/images/logo.jpg')} style={styles.logo} resizeMode="contain"/>
                        </View>

                        <View style={[styles.titleContainer, isRtl && styles.rowReverse]}>
                            <Ionicons name="log-in-outline" size={28} color={textColor} style={isRtl ? {transform: [{scaleX: -1}]} : {}} />
                            <Text style={[styles.titleText, {color: textColor, textAlign: isRtl ? 'right' : 'left'}]}>{t('login')}</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.labelContainer}>
                                <Ionicons name="card-outline" size={16} color={textColor}/>
                                <Text style={[styles.labelText, {color: textColor, textAlign: isRtl ? 'right' : 'left'}]}>{t('idNumber')}</Text>
                            </View>
                            <TextInput
                                style={[styles.input, {
                                    color: textColor,
                                    borderColor: colorScheme === 'light' ? '#e5e7eb' : '#374151',
                                    textAlign: isRtl ? 'right' : 'left'
                                }]}
                                placeholder={t('idNumber')}
                                placeholderTextColor={placeholderTextColor}
                                value={idNumber}
                                onChangeText={setIdNumber}
                                autoCapitalize="none"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.labelContainer}>
                                <Ionicons name="key-outline" size={16} color={textColor}/>
                                <Text style={[styles.labelText, {color: textColor}]}>{t('password')}</Text>
                            </View>
                            <View style={[styles.inputRow, isRtl && styles.rowReverse]}>
                                <TextInput
                                    style={[styles.input, {
                                        color: textColor,
                                        flex: 1,
                                        marginBottom: 0,
                                        borderColor: colorScheme === 'light' ? '#e5e7eb' : '#374151'
                                    }]}
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
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18}
                                              color={textColor} style={isRtl ? {transform: [{scaleX: -1}]} : {}} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient colors={['#ff9a9e', '#fecfef']} style={styles.gradient}>
                                <View style={styles.buttonContent}>
                                    <Ionicons name="rocket-outline" size={18} color="#fff"/>
                                    <Text
                                        style={styles.buttonTextInner}>{isLoading ? '⏳ ' + t('loginButton') + '...' : t('loginButton')}</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </BlurView>
            </LinearGradient>

            {/* Hello overlay: animated card + confetti burst */}
            {showHello && (
                <TouchableOpacity activeOpacity={1} onPress={skipHello} style={StyleSheet.absoluteFill}>
                    <Animated.View style={[StyleSheet.absoluteFill, styles.helloOverlay, {opacity: helloOpacity}]}>
                        <LinearGradient colors={['#7F7FD5', '#86A8E7', '#91EAE4']} style={styles.helloGradient}>
                            <Animated.View style={{transform: [{scale: Animated.multiply(helloScale, helloPulse)}]}}>
                                <Text style={[styles.helloMain, {textAlign: isRtl ? 'right' : 'center'}]}>{t('welcomeBackMain')} {userName} 👋</Text>
                                <Text style={[styles.helloSub, {textAlign: isRtl ? 'right' : 'center'}]}>{t('welcomeBackSub')}</Text>
                            </Animated.View>

                            {/* Confetti pieces */}
                            {confettiAnims.map((anim, i) => {
                                const translateY = anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -240 - Math.random() * 80]
                                });
                                const translateX = confettiOffsets[i];
                                const rotate = anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', `${360 * (Math.random() > 0.5 ? 1 : -1)}deg`]
                                });
                                const opacity = anim.interpolate({inputRange: [0, 0.6, 1], outputRange: [0, 1, 0]});
                                const size = 10 + (i % 3) * 4;
                                const color = confettiColors[i % confettiColors.length];

                                return (
                                    <Animated.View
                                        key={`conf-${i}`}
                                        pointerEvents="none"
                                        style={[
                                            styles.confetti,
                                            {
                                                backgroundColor: color,
                                                width: size,
                                                height: size,
                                                left: '50%',
                                                marginLeft: translateX,
                                                transform: [{translateY}, {rotate}],
                                                opacity,
                                            },
                                        ]}
                                    />
                                );
                            })}

                            {/* Emoji pop burst */}
                            {emojiAnims.map((ea, i) => (
                                <Animated.Text
                                    key={`emo-${i}`}
                                    pointerEvents="none"
                                    style={[
                                        styles.emoji,
                                        {
                                            opacity: ea.opacity,
                                            transform: [
                                                {translateY: ea.translateY},
                                                {scale: ea.scale},
                                            ],
                                            left: `${50 + (i - 2) * 8}%`,
                                            color: confettiColors[i % confettiColors.length],
                                        },
                                    ]}
                                >
                                    {emojis[i % emojis.length]}
                                </Animated.Text>
                            ))}
                        </LinearGradient>
                    </Animated.View>
                </TouchableOpacity>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    blurContainer: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 25,
        overflow: 'hidden',
        padding: 20,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 25,
        padding: 18,
        width: '100%',
        maxWidth: 420,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 15},
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
    },
    logo: {
        alignSelf: 'center',
        marginBottom: 18,
        height: 250,
        borderRadius: 12,
        overflow: 'hidden',

    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    titleText: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginLeft: 10,
    },
    inputContainer: {
        marginBottom: 16,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    labelText: {
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eyeButton: {
        padding: 10,
        marginLeft: 10,
    },
    loginButton: {
        marginTop: 18,
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonTextInner: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
    /* Hello overlay styles */
    helloOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        position: 'absolute',
        zIndex: 1000,
        padding: 24,
    },
    helloGradient: {
        width: '100%',
        maxWidth: 520,
        borderRadius: 28,
        paddingVertical: 32,
        paddingHorizontal: 20,
        alignItems: 'center',
        shadowColor: 'rgba(0,0,0,0.18)',
        shadowOffset: {width: 0, height: 12},
        shadowOpacity: 0.22,
        shadowRadius: 22,
        elevation: 16,
    },
    helloMain: {
        fontSize: 30,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: 0.8,
        textShadowColor: 'rgba(0,0,0,0.28)',
        textShadowOffset: {width: 0, height: 6},
        textShadowRadius: 14,
    },
    helloSub: {
        fontSize: 17,
        color: 'rgba(255,255,255,0.95)',
        textAlign: 'center',
        marginBottom: 8,
    },
    emoji: {
        position: 'absolute',
        fontSize: 24,
        top: '55%',
        textAlign: 'center',
    },
    confetti: {
        position: 'absolute',
        bottom: 30,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 6,
    },
    rowReverse: {
        flexDirection: 'row-reverse',
    },
});
