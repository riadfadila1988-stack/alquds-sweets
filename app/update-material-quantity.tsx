import React, {useEffect, useState, useMemo, useRef} from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Animated,
    Easing
} from 'react-native';
import {useMaterials} from '@/hooks/use-materials';
import {useAuth} from '@/hooks/use-auth';
import {useMaterialGroups, useMaterialGroup} from '@/hooks/use-material-groups';
import Header from './components/header';
import {useTranslation} from './_i18n';
import {useWorkingHours} from '@/hooks/use-working-hours';
import {Ionicons} from '@expo/vector-icons';
import {ScreenTemplate} from "@/components/ScreenTemplate";
import AnimatedMenuItem from "@/components/ui/AnimatedMenuItem";
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Super fun confetti particle component with varied shapes and colors 🎉
function ConfettiParticle({ delay }: { delay: number }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start();
    }, [anim, delay]);

    const randomX = useRef((Math.random() - 0.5) * 250).current;
    const randomRotate = useRef((Math.random() - 0.5) * 720).current;
    const randomSize = useRef(6 + Math.random() * 8).current;
    const shapes = ['square', 'circle', 'star'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8CC6', '#A8E6CF', '#FFB347', '#C3AED6'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    let particleStyle = {};
    if (shape === 'circle') {
        particleStyle = { borderRadius: randomSize / 2 };
    } else if (shape === 'star') {
        particleStyle = { borderRadius: 2 };
    }

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    width: randomSize,
                    height: randomSize,
                    backgroundColor: color,
                    opacity: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                    transform: [
                        {
                            translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 350],
                            }),
                        },
                        {
                            translateX: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, randomX],
                            }),
                        },
                        {
                            rotate: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', `${randomRotate}deg`],
                            }),
                        },
                        {
                            scale: anim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [1, 1.3, 0.5],
                            }),
                        },
                    ],
                },
                particleStyle,
            ]}
        />
    );
}

// A super fun, modern, and pretty material card
function MaterialCard({ item, index, value, saving, isRTL, onInc, onDec, onChange, onSave }: any) {
    const translate = useRef(new Animated.Value(30)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;
    const inputRef = useRef<any>(null);
    const repeatRef = useRef<any>(null);
    const cardScale = useRef(new Animated.Value(1)).current;
    const shimmer = useRef(new Animated.Value(0)).current;
    const sparkle = useRef(new Animated.Value(0)).current;
    const wiggle = useRef(new Animated.Value(0)).current;
    // saved animation
    const savedAnim = useRef(new Animated.Value(0)).current;
    const [showSaved, setShowSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Dynamic gradient colors - each card gets unique vibrant colors
    const gradientSets = [
        ['#667eea', '#764ba2'],
        ['#f093fb', '#f5576c'],
        ['#4facfe', '#00f2fe'],
        ['#43e97b', '#38f9d7'],
        ['#fa709a', '#fee140'],
        ['#30cfd0', '#330867'],
        ['#a8edea', '#fed6e3'],
        ['#ff9a9e', '#fecfef'],
    ];
    const cardGradient = gradientSets[index % gradientSets.length];

    useEffect(() => {
        // Bouncy entrance animation
        Animated.parallel([
            Animated.spring(translate, {
                toValue: 0,
                friction: 6,
                tension: 40,
                delay: index * 60,
                useNativeDriver: true
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 500,
                delay: index * 60,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true
            })
        ]).start();

        // Continuous shimmer effect
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [index, opacity, translate, shimmer]);

    useEffect(() => {
        let anim: any;
        if (!saving) {
            // Gentle pulse animation
            anim = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.08, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                    Animated.timing(pulse, { toValue: 1.0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
                ])
            );
            anim.start();
        }
        return () => anim && anim.stop();
    }, [saving, pulse]);

    useEffect(() => {
        // Random sparkle effect
        const sparkleInterval = setInterval(() => {
            Animated.sequence([
                Animated.timing(sparkle, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(sparkle, { toValue: 0, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true })
            ]).start();
        }, 3000 + Math.random() * 2000);

        return () => clearInterval(sparkleInterval);
    }, [sparkle]);

    useEffect(() => {
        return () => {
            // cleanup repeating when component unmounts
            if (repeatRef.current) clearInterval(repeatRef.current);
        };
    }, []);

    const startRepeat = (type: 'inc' | 'dec', step = 1) => {
        // initial immediate action
        if (type === 'inc') onInc(item._id ?? item.name, step);
        else onDec(item._id ?? item.name, step);
        // small haptic tick
        Haptics.selectionAsync();
        // Fun wiggle animation
        Animated.sequence([
            Animated.timing(wiggle, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(wiggle, { toValue: -10, duration: 100, useNativeDriver: true }),
            Animated.timing(wiggle, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
        // start repeating
        clearInterval(repeatRef.current);
        repeatRef.current = setInterval(() => {
            if (type === 'inc') onInc(item._id ?? item.name, step);
            else onDec(item._id ?? item.name, step);
        }, 160);
    };

    const stopRepeat = () => {
        if (repeatRef.current) {
            clearInterval(repeatRef.current);
            repeatRef.current = null;
        }
    };

    const focusInput = () => {
        try { inputRef.current?.focus(); } catch {}
    };

    const onCardPress = () => {
        Animated.sequence([
            Animated.spring(cardScale, { toValue: 0.95, friction: 3, useNativeDriver: true }),
            Animated.spring(cardScale, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        focusInput();
    };

    const updatedLabel = item.updatedAt ? new Date(item.updatedAt).toLocaleString() : undefined;

    // Fun emoji set that rotates
    const emojiSet = ['✨', '🌟', '💎', '🎨', '🎯', '🚀', '🎪', '🎭'];
    const emoji = emojiSet[index % emojiSet.length];

    return (
        <Animated.View style={[styles.cardWrapper, {
            opacity,
            transform: [
                {translateY: translate},
                {scale: cardScale},
                {rotate: wiggle.interpolate({inputRange: [-10, 10], outputRange: ['-2deg', '2deg']})}
            ]
        }]}>
            <TouchableOpacity activeOpacity={0.9} onPress={onCardPress}>
                <LinearGradient
                    colors={cardGradient as any}
                    style={styles.cardBackground}
                    start={{x:0, y:0}}
                    end={{x:1, y:1}}
                >
                    {/* Shimmer overlay */}
                    <Animated.View
                        style={[
                            styles.shimmerOverlay,
                            {
                                opacity: shimmer.interpolate({inputRange: [0, 0.5, 1], outputRange: [0, 0.3, 0]}),
                                transform: [{
                                    translateX: shimmer.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-300, 300]
                                    })
                                }]
                            }
                        ]}
                        pointerEvents="none"
                    />

                    {/* Glassmorphic inner container */}
                    <View style={styles.glassContainer}>
                        <View style={styles.cardHeader}>
                            <View style={{flex:1}}>
                                <Text style={[styles.cardTitle, isRTL ? {textAlign: 'right'} : undefined]}>
                                    {emoji} {item.name}
                                </Text>
                                {item.heName ? (
                                    <Text style={[styles.cardSubtitle, isRTL ? {textAlign: 'right'} : undefined]}>
                                        {item.heName}
                                    </Text>
                                ) : null}
                            </View>

                            {/* Animated sparkle icon */}
                            <Animated.View style={{
                                transform: [
                                    {scale: sparkle.interpolate({inputRange: [0, 1], outputRange: [1, 1.4]})},
                                    {rotate: sparkle.interpolate({inputRange: [0, 1], outputRange: ['0deg', '180deg']})}
                                ]
                            }}>
                                <Ionicons name="cube" size={32} color="#fff" />
                            </Animated.View>
                        </View>

                        {updatedLabel ? (
                            <View style={styles.updatedBadge}>
                                <Ionicons name="time-outline" size={12} color="#fff" />
                                <Text style={styles.updatedSmall}>{`${updatedLabel}`}</Text>
                            </View>
                        ) : null}

                        <View style={[styles.cardControlsRow, isRTL ? {flexDirection: 'row-reverse'} : undefined]}>
                            <View style={styles.amtGroup}>
                                <TouchableOpacity
                                    style={styles.iconBtn}
                                    onPress={() => onDec(item._id ?? item.name)}
                                    onPressIn={() => startRepeat('dec')}
                                    onPressOut={stopRepeat}
                                    accessibilityLabel="decrease"
                                >
                                    <LinearGradient
                                        colors={['#ff6b6b', '#ee5a6f']}
                                        style={styles.iconBtnGradient}
                                    >
                                        <Text style={styles.iconBtnText}>−</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        ref={inputRef}
                                        style={[styles.bigInput, isRTL ? styles.inputRtl : undefined]}
                                        value={value}
                                        onChangeText={(v) => onChange(item._id ?? item.name, v)}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor="rgba(255,255,255,0.5)"
                                        accessibilityLabel="quantity input"
                                        onSubmitEditing={() => { onSave(item._id ?? item.name); Haptics.selectionAsync(); }}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.iconBtn}
                                    onPress={() => onInc(item._id ?? item.name)}
                                    onPressIn={() => startRepeat('inc')}
                                    onPressOut={stopRepeat}
                                    accessibilityLabel="increase"
                                >
                                    <LinearGradient
                                        colors={['#51cf66', '#37b24d']}
                                        style={styles.iconBtnGradient}
                                    >
                                        <Text style={styles.iconBtnText}>+</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            <Animated.View style={[styles.saveBtnWrapper, {transform: [{scale: pulse}], flex: 0, flexShrink: 1}]}>
                                <TouchableOpacity
                                    style={[styles.saveBtnCard, saving ? {opacity: 0.7} : undefined]}
                                    onPress={async () => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        try {
                                            const ok = await onSave(item._id ?? item.name);
                                            if (ok) {
                                                // show confetti and saved check animation
                                                setShowConfetti(true);
                                                setShowSaved(true);
                                                Animated.sequence([
                                                    Animated.spring(savedAnim, {toValue: 1, friction: 4, useNativeDriver: true}),
                                                    Animated.delay(800),
                                                    Animated.timing(savedAnim, {toValue: 0, duration: 300, useNativeDriver: true})
                                                ]).start(() => { setShowSaved(false); setShowConfetti(false); });
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                            }
                                        } catch {}
                                    }}
                                    disabled={saving}
                                    accessibilityLabel="Save quantity"
                                >
                                    <LinearGradient
                                        colors={['#ffd43b', '#fab005']}
                                        style={styles.saveBtnGradient}
                                    >
                                        {saving ? (
                                            <ActivityIndicator color="#fff" size="small"/>
                                        ) : (
                                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                                <Ionicons name="save" size={14} color="#fff" style={{marginRight: 3}} />
                                                <Text style={styles.saveBtnCardText}>Save</Text>
                                            </View>
                                        )}
                                        {/** success overlay */}
                                        {showSaved ? (
                                            <Animated.View
                                                style={[
                                                    styles.savedOverlay,
                                                    {
                                                        opacity: savedAnim,
                                                        transform: [{
                                                            scale: savedAnim.interpolate({
                                                                inputRange:[0,1],
                                                                outputRange:[0.5, 1.2]
                                                            })
                                                        }]
                                                    }
                                                ]}
                                                pointerEvents="none"
                                            >
                                                <Ionicons name="checkmark-circle" size={36} color="#51cf66" />
                                            </Animated.View>
                                        ) : null}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>

                        {/** Confetti burst */}
                        {showConfetti && (
                            <View style={styles.confettiContainer} pointerEvents="none">
                                {Array.from({length: 20}).map((_, i) => (
                                    <ConfettiParticle key={i} delay={i * 25} />
                                ))}
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function UpdateMaterialQuantityScreen() {
    const {t} = useTranslation();
    // selected group id needs to exist before hooks that depend on it
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    // Screen transition animations
    const screenSlide = useRef(new Animated.Value(0)).current;
    const screenFade = useRef(new Animated.Value(1)).current;

    const {materialGroups, isLoading: groupsLoading} = useMaterialGroups();
    const {
        materialGroup,
        isLoading: groupLoading,
        refetch: refetchGroup
    } = useMaterialGroup(selectedGroupId ?? undefined);
    // When a specific group is selected we fetch its materials from server; otherwise use all materials
    const {materials: allMaterials, isLoading: materialsLoading, error, updateQuantity, refetch} = useMaterials();

    // true when either the selected group is loading or (when no group) the materials list is loading
    const loadingMaterials = selectedGroupId ? groupLoading : materialsLoading;

    const {user} = useAuth();
    const {currentSession} = useWorkingHours();

    const [edits, setEdits] = useState<Record<string, string>>({});
    const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // App always RTL
    const isRTL = true;

    // Animate screen transitions when selecting/deselecting group
    useEffect(() => {
        if (selectedGroupId) {
            // Transitioning TO material list
            Animated.parallel([
                Animated.timing(screenSlide, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(screenFade, { toValue: 0, duration: 150, useNativeDriver: true }),
                    Animated.timing(screenFade, { toValue: 1, duration: 250, useNativeDriver: true }),
                ])
            ]).start();
        } else {
            // Transitioning BACK to groups
            Animated.parallel([
                Animated.timing(screenSlide, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(screenFade, { toValue: 0, duration: 150, useNativeDriver: true }),
                    Animated.timing(screenFade, { toValue: 1, duration: 250, useNativeDriver: true }),
                ])
            ]).start();
        }
    }, [selectedGroupId, screenFade, screenSlide]);

    // Initialize local edit values from current materials source (group or all)
    useEffect(() => {
        const source = selectedGroupId ? (materialGroup?.materials || []) : (allMaterials || []);
        const map: Record<string, string> = {};
        (source || []).forEach((m: any) => {
            const id = m._id ?? m.name;
            map[id] = m.quantity != null ? String(m.quantity) : '';
        });
        setEdits(map);
    }, [allMaterials, materialGroup, selectedGroupId]);

    // Filter materials by search query (name or heName)
    const filteredMaterials = useMemo(() => {
        const q = (searchQuery || '').trim().toLowerCase();
        // choose material source
        const source = selectedGroupId ? (materialGroup?.materials || []) : (allMaterials || []);
        let list = source as any[];
        if (!q) return list;
        return list.filter((m: any) => {
            const name = (m.name || '').toString().toLowerCase();
            const he = (m.heName || '').toString().toLowerCase();
            return name.includes(q) || he.includes(q);
        });
    }, [allMaterials, materialGroup, selectedGroupId, searchQuery]);

    const onChange = (id: string, value: string) => {
        // allow only numeric input, optional decimal and negative guard will be handled on save
        setEdits((s) => ({...s, [id]: value}));
    };

    const inc = (id: string, step = 1) => {
        setEdits((s) => {
            const cur = Number(s[id] ?? 0) || 0;
            return {...s, [id]: String(cur + step)};
        });
    };

    const dec = (id: string, step = 1) => {
        setEdits((s) => {
            const cur = Number(s[id] ?? 0) || 0;
            const next = cur - step;
            return {...s, [id]: String(next >= 0 ? next : 0)};
        });
    };

    const handleSave = async (id: string) => {
        // Prevent saving when the user is not clocked in
        if (!currentSession) {
            Alert.alert(t('mustClockIn') || 'Please clock in before saving changes');
            return;
        }
        const raw = edits[id];
        const n = raw === '' ? NaN : Number(raw);
        if (Number.isNaN(n)) {
            Alert.alert(t('invalidQuantity') || 'Please enter a valid number');
            return;
        }
        if (n < 0) {
            Alert.alert(t('invalidQuantity') || 'Quantity cannot be negative');
            return;
        }

        try {
            setSavingIds((s) => ({...s, [id]: true}));
            const ok = await updateQuantity(id, {quantity: n});
            if (ok) {
                // refresh group or all materials after a successful update
                if (selectedGroupId) {
                    await refetchGroup?.();
                } else {
                    await refetch?.();
                }
                Alert.alert(t('saved') || 'Saved');
            } else {
                Alert.alert(t('failedToSave') || 'Failed to save quantity');
            }
        } catch {
            Alert.alert(t('failedToSave') || 'Failed to save quantity');
        } finally {
            setSavingIds((s) => ({...s, [id]: false}));
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await refetch?.();
        } finally {
            setRefreshing(false);
        }
    };

    // Only allow access for employee role (also allow admin for convenience)
    if (!user || (user.role !== 'employee' && user.role !== 'admin')) {
        return (
            <View style={{flex: 1}}>
                <Header title={t('updateMaterialsQuantity') || 'Update Materials'}/>
                <View style={styles.centered}>
                    <Text>{t('accessDenied') || 'Access denied. Employees only.'}</Text>
                </View>
            </View>
        );
    }

    // If no group selected show groups list first
    if (!selectedGroupId) {
        return (
            <ScreenTemplate title={t('updateMaterialsQuantity') || 'Update Materials'}>
            <Animated.View
                style={[
                    styles.container,
                    {
                        opacity: screenFade,
                        transform: [{
                            translateX: screenSlide.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -100]
                            })
                        }]
                    }
                ]}
            >
                <View style={{padding: 16}}>
                    {groupsLoading ? (
                        <ActivityIndicator/>
                    ) : materialGroups && materialGroups.length > 0 ? (
                        // use animated menu items grid when showing groups
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
                            {materialGroups.map((item: any, idx: number) => {
                                const id = item._id ?? item.name;
                                // alternate colors for better visual variety
                                const colors = idx % 2 === 0 ? ["#667eea", "#764ba2"] : ["#f093fb", "#f5576c"];
                                return (
                                    <View key={id} style={{width: '48%', paddingVertical: 8}}>
                                        <AnimatedMenuItem
                                            icon="cube"
                                            text={`${item.name}${item.heName ? ' | ' + item.heName : ''}`}
                                            delay={idx * 60}
                                            color={colors}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedGroupId(id);
                                            }}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <Text>{t('noGroups') || 'No material groups found'}</Text>
                    )}
                </View>
            </Animated.View>
            </ScreenTemplate>
        );
    }

    return (
        <ScreenTemplate title={selectedGroupId ? `${materialGroup?.name ?? ''}${materialGroup?.heName ? ' | ' + materialGroup.heName : ''}` : t('updateMaterialsQuantity') || 'Update Materials'}
                        showSearchBar={true}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        subtitle={t('updateMaterialsQuantity') || 'Update Materials'}>
            <Animated.View
                style={[
                    styles.container,
                    {
                        opacity: screenFade,
                        transform: [{
                            translateX: screenSlide.interpolate({
                                inputRange: [0, 1],
                                outputRange: [100, 0]
                            })
                        }]
                    }
                ]}
            >
                {/* Back to groups */}
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedGroupId(null);
                    }}
                    style={{paddingHorizontal: 16, paddingVertical: 8}}
                    accessibilityRole="button"
                    accessibilityLabel={t('backToGroups') || 'Back to groups'}
                >
                    <Animated.View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            transform: [{
                                translateX: screenSlide.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0]
                                })
                            }]
                        }}
                    >
                        <Text style={{color: '#1976D2', marginLeft: 6, fontWeight: '600'}}>
                            ← {t('backToGroups') || 'Back to groups'}
                        </Text>
                    </Animated.View>
                </TouchableOpacity>
                {loadingMaterials ? (
                    <ActivityIndicator style={{marginTop: 24}} size="large"/>
                ) : error ? (
                    <View style={styles.centered}>
                        <Text style={styles.error}>{error}</Text>
                    </View>
                ) : (
                    // render materials list
                    <FlatList
                        data={filteredMaterials}
                        ListEmptyComponent={() => (
                            <View style={styles.noResultsContainer}>
                                <Text
                                    style={styles.noResultsText}>{isRTL ? 'لا توجد نتائج' : (t('noResults') || 'No results')}</Text>
                            </View>
                        )}
                        keyExtractor={(item) => item._id ?? item.name}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
                        contentContainerStyle={{padding: 16, paddingBottom: 120}}
                        renderItem={({item, index}) => {
                            const id = item._id ?? item.name;
                            const value = edits[id] ?? '';
                            const saving = !!savingIds[id];

                            // canSave is unused in this modern card UI, remove to avoid lint warning

                            return (
                                <MaterialCard
                                    item={item}
                                    index={index}
                                    value={value}
                                    saving={saving}
                                    isRTL={isRTL}
                                    onInc={inc}
                                    onDec={dec}
                                    onChange={onChange}
                                    onSave={handleSave}
                                />
                            );
                        }}
                    />
                )}
            </Animated.View>
        </ScreenTemplate>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#f8f9fa'},
    centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    searchContainerRow: {paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center'},
    searchLabelRow: {fontSize: 14, marginRight: 8},
    searchRowCenter: {flexDirection: 'row', alignItems: 'center'},
    searchInputRow: {borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6},
    clearBtn: {padding: 8},
    clearBtnText: {fontSize: 18},
    noResultsContainer: {padding: 20, alignItems: 'center'},
    noResultsText: {color: '#666'},
    groupRow: {paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee'},
    groupName: {fontSize: 16, fontWeight: '600', textAlign: 'right'},
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#eee'
    },
    name: {fontSize: 16, fontWeight: '600'},
    updated: {fontSize: 12, color: '#666'},
    controlsRow: {marginTop: 8, alignItems: 'center'},
    smallBtn: {padding: 8, borderRadius: 4, backgroundColor: '#f0f0f0', marginHorizontal: 6},
    smallBtnText: {fontSize: 16},
    input: {borderWidth: 1, borderColor: '#ddd', padding: 8, minWidth: 80, borderRadius: 6, textAlign: 'left'},
    inputRtl: {textAlign: 'right'},
    saveBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#1976D2',
        marginLeft: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    error: {color: '#a00'},

    // MaterialCard styles - Super modern, fun, and pretty! 🎨✨
    cardWrapper: {marginBottom: 16},
    cardBackground: {
        borderRadius: 20,
        padding: 4,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: {width:0, height:6},
        shadowOpacity: 0.15,
        shadowRadius: 12,
        overflow: 'hidden'
    },
    shimmerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        width: 100,
    },
    glassContainer: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 16,
        padding: 16,
        backdropFilter: 'blur(10px)',
    },
    cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
    cardTitle: {fontSize: 18, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2},
    cardSubtitle: {fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 2, fontWeight: '600'},
    updatedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    updatedSmall: {fontSize: 11, color: '#fff', marginLeft: 4, fontWeight: '600'},
    cardControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    amtGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: 2,
        borderRadius: 14,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: {width:0, height:3},
        shadowRadius: 6,
        alignSelf: 'flex-start',
    },
    iconBtn: {padding: 1},
    iconBtnGradient: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 32,
    },
    iconBtnText: {fontSize: 18, fontWeight: '800', color: '#fff'},
    inputContainer: {
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 10,
        marginHorizontal: 3,
        paddingHorizontal: 1,
    },
    bigInput: {
        width: 60,
        paddingHorizontal: 4,
        paddingVertical: 6,
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: {width: 1, height: 1},
        textShadowRadius: 2,
    },
    saveBtnWrapper: {flexShrink: 0},
    saveBtnCard: {borderRadius: 14, overflow: 'hidden'},
    saveBtnGradient: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: {width: 0, height: 4},
        shadowRadius: 8,
    },
    saveBtnCardText: {color: '#fff', fontWeight: '800', fontSize: 13, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2},
    savedOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: -50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confettiContainer: {position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, alignItems: 'center', justifyContent: 'center'},
});
