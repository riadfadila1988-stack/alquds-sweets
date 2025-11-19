import React, {ReactNode, useEffect, useRef} from 'react';
import {
    View,
    StyleSheet,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    TouchableOpacity,
    Animated
} from 'react-native';
import {Surface, Text, IconButton, FAB, Searchbar} from 'react-native-paper';
import {LinearGradient} from 'expo-linear-gradient';
import {router} from 'expo-router';
import {MaterialIcons} from '@expo/vector-icons';

interface ScreenTemplateProps {
    // Header props
    title: string;
    subtitle?: string;
    showBackButton?: boolean;
    onBackPress?: () => void;

    // Add button props
    showAddButton?: boolean;
    onAddPress?: () => void;

    // Search bar props
    showSearchBar?: boolean;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    searchPlaceholder?: string;

    // Children
    children: ReactNode;

    // Style customization
    headerGradient?: readonly [string, string, string];
    fabColor?: string;
    fabIcon?: string;
}

interface ScreenTemplateModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    onSave?: () => void;
    headerGradient?: readonly [string, string];
    saveIconColor?: string;
    overlays?: ReactNode; // For rendering overlays above modal content
}

/**
 * Reusable screen template with header and optional add button
 * Styled like the customers screen
 */
export function ScreenTemplate({
                                   title,
                                   subtitle,
                                   showBackButton = true,
                                   onBackPress,
                                   showAddButton = false,
                                   onAddPress,
                                   showSearchBar = false,
                                   searchQuery = '',
                                   onSearchChange,
                                   searchPlaceholder = 'Search...',
                                   children,
                                   headerGradient = ['#667eea', '#764ba2', '#f093fb'],
                                   fabColor = '#667eea',
                                   fabIcon = 'plus',
                               }: ScreenTemplateProps) {
    // Header mount animation
    const headerOpacity = useRef(new Animated.Value(0)).current;
    const headerTranslateY = useRef(new Animated.Value(-50)).current;

    // Fun floating animations for decorative elements
    const float1 = useRef(new Animated.Value(0)).current;
    const float2 = useRef(new Animated.Value(0)).current;
    const float3 = useRef(new Animated.Value(0)).current;
    const rotate1 = useRef(new Animated.Value(0)).current;
    const rotate2 = useRef(new Animated.Value(0)).current;
    const scale1 = useRef(new Animated.Value(1)).current;
    const scale2 = useRef(new Animated.Value(1)).current;

    // Shimmer effect for header
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Header entrance animation
        Animated.parallel([
            Animated.timing(headerOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(headerTranslateY, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        // Continuous floating animations
        Animated.loop(
            Animated.sequence([
                Animated.timing(float1, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(float1, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(float2, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(float2, {
                    toValue: 0,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(float3, {
                    toValue: 1,
                    duration: 3500,
                    useNativeDriver: true,
                }),
                Animated.timing(float3, {
                    toValue: 0,
                    duration: 3500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotation animations
        Animated.loop(
            Animated.timing(rotate1, {
                toValue: 1,
                duration: 8000,
                useNativeDriver: true,
            })
        ).start();

        Animated.loop(
            Animated.timing(rotate2, {
                toValue: 1,
                duration: 6000,
                useNativeDriver: true,
            })
        ).start();

        // Pulsing scale animations
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale1, {
                    toValue: 1.2,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(scale1, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(scale2, {
                    toValue: 1.3,
                    duration: 2500,
                    useNativeDriver: true,
                }),
                Animated.timing(scale2, {
                    toValue: 1,
                    duration: 2500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Shimmer effect
        Animated.loop(
            Animated.timing(shimmer, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        ).start();
    }, [headerOpacity, headerTranslateY, float1, float2, float3, rotate1, rotate2, scale1, scale2, shimmer]);
    const handleBackPress = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            router.back();
        }
    };

    // Interpolate animation values
    const float1TranslateY = float1.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -15],
    });

    const float2TranslateY = float2.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 20],
    });

    const float3TranslateY = float3.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -12],
    });

    const rotate1Deg = rotate1.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const rotate2Deg = rotate2.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-360deg'],
    });

    const shimmerTranslateX = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 100],
    });

    return (
        <View style={styles.container}>
            {/* Floating decorative elements - visible across all screens */}
            <Animated.View
                style={[
                    styles.floatingDecor,
                    styles.decor1,
                    {
                        transform: [
                            { translateY: float1TranslateY },
                            { scale: scale1 }
                        ],
                        opacity: 0.35,
                    }
                ]}
            >
                <MaterialIcons name="star" size={40} color="#FFD700" />
            </Animated.View>

            <Animated.View
                style={[
                    styles.floatingDecor,
                    styles.decor2,
                    {
                        transform: [
                            { translateY: float2TranslateY },
                            { rotate: rotate1Deg }
                        ],
                        opacity: 0.3,
                    }
                ]}
            >
                <MaterialIcons name="auto-awesome" size={35} color="#FF6B9D" />
            </Animated.View>

            <Animated.View
                style={[
                    styles.floatingDecor,
                    styles.decor3,
                    {
                        transform: [
                            { translateY: float3TranslateY },
                            { scale: scale2 }
                        ],
                        opacity: 0.25,
                    }
                ]}
            >
                <MaterialIcons name="bubble-chart" size={50} color="#4FACFE" />
            </Animated.View>

            <Animated.View
                style={[
                    styles.floatingDecor,
                    styles.decor4,
                    {
                        transform: [
                            { translateY: float1TranslateY },
                            { rotate: rotate2Deg }
                        ],
                        opacity: 0.25,
                    }
                ]}
            >
                <MaterialIcons name="favorite" size={30} color="#FF6B9D" />
            </Animated.View>

            <Animated.View
                style={[
                    styles.floatingDecor,
                    styles.decor5,
                    {
                        transform: [
                            { translateY: float2TranslateY },
                            { scale: scale1 }
                        ],
                        opacity: 0.3,
                    }
                ]}
            >
                <MaterialIcons name="emoji-events" size={32} color="#FFD700" />
            </Animated.View>

            <Animated.View style={{
                opacity: headerOpacity,
                transform: [{ translateY: headerTranslateY }]
            }}>
                <LinearGradient
                    colors={headerGradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.headerGradient}
                >
                    {/* Shimmer effect overlay */}
                    <Animated.View
                        style={[
                            styles.shimmerOverlay,
                            {
                                transform: [{ translateX: shimmerTranslateX }]
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 0}}
                            style={styles.shimmerGradient}
                        />
                    </Animated.View>

                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <View></View>
                            <View style={styles.headerTextContainer}>
                                <Text variant="headlineSmall" style={styles.headerTitle}>
                                    {title}
                                </Text>
                                {subtitle && (
                                    <Text variant="bodyMedium" style={styles.headerSubtitle}>
                                        {subtitle}
                                    </Text>
                                )}
                            </View>
                            {showBackButton && (
                                <IconButton
                                    icon="arrow-right"
                                    iconColor="#fff"
                                    size={28}
                                    onPress={handleBackPress}
                                    style={styles.backButton}
                                />
                            )}
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>

            {showSearchBar && onSearchChange && (
                <View style={styles.searchContainer}>
                    <Searchbar
                        placeholder={searchPlaceholder}
                        onChangeText={onSearchChange}
                        value={searchQuery}
                        style={styles.searchbar}
                        iconColor="#667eea"
                        elevation={3}
                    />
                </View>
            )}

            {children}

            {showAddButton && onAddPress && (
                <FAB
                    icon={fabIcon}
                    style={[styles.fab, {backgroundColor: fabColor}]}
                    onPress={onAddPress}
                    color="#fff"
                />
            )}
        </View>
    );
}

/**
 * Reusable modal component styled like the customers screen modal
 */
export function ScreenTemplateModal({
                                        visible,
                                        onClose,
                                        title,
                                        children,
                                        onSave,
                                        headerGradient = ['#667eea', '#764ba2'],
                                        saveIconColor = '#fff',
                                        overlays,
                                    }: ScreenTemplateModalProps) {
    return (
        <Modal
            visible={visible}
            onRequestClose={onClose}
            animationType="slide"
            transparent={true}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalContainer}
                keyboardVerticalOffset={0}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.overlayTouchable}
                        activeOpacity={1}
                        onPress={onClose}
                    />
                    <View style={styles.modalContentWrapper} pointerEvents="box-none">
                        <Surface style={styles.modalContent} elevation={5}>
                            <LinearGradient
                                colors={headerGradient}
                                start={{x: 0, y: 0}}
                                end={{x: 1, y: 1}}
                                style={styles.modalHeader}
                            >
                                <Text variant="headlineMedium" style={styles.modalTitle}>
                                    {title}
                                </Text>
                                <View style={styles.headerActions}>
                                    {onSave && (
                                        <IconButton
                                            icon="check"
                                            iconColor={saveIconColor}
                                            size={24}
                                            onPress={onSave}
                                            style={styles.saveIconButton}
                                        />
                                    )}
                                    <IconButton
                                        icon="close"
                                        iconColor="#fff"
                                        size={24}
                                        onPress={onClose}
                                        style={styles.closeButton}
                                    />
                                </View>
                            </LinearGradient>

                            <ScrollView
                                style={styles.modalScrollView}
                                contentContainerStyle={styles.modalScrollContent}
                                showsVerticalScrollIndicator={true}
                                keyboardShouldPersistTaps="handled"
                                nestedScrollEnabled={true}
                                scrollEventThrottle={16}
                                bounces={true}
                                keyboardDismissMode="on-drag"
                            >
                                {children}
                            </ScrollView>
                        </Surface>

                        {/* Render overlays above modal content */}
                        {overlays}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    // Floating decorative elements
    floatingDecor: {
        position: 'absolute',
        zIndex: 999,
        pointerEvents: 'none', // Don't interfere with touches
        elevation: 10, // Android elevation
    },
    decor1: {
        top: '15%',
        right: '10%',
    },
    decor2: {
        top: '25%',
        left: '8%',
    },
    decor3: {
        top: '45%',
        right: '5%',
    },
    decor4: {
        top: '60%',
        left: '12%',
    },
    decor5: {
        top: '75%',
        right: '15%',
    },
    shimmerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '200%',
    },
    shimmerGradient: {
        flex: 1,
        width: '100%',
    },
    headerGradient: {
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    header: {
        paddingHorizontal: 20,
        zIndex: 1,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    backButton: {
        margin: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerTextContainer: {},
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 3,
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.15)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 2,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    searchbar: {
        elevation: 3,
        borderRadius: 16,
        backgroundColor: '#fff',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        borderRadius: 16,
    },
    modalContainer: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    overlayTouchable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContentWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        height: Dimensions.get('window').height * 0.85,
        marginHorizontal: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -6},
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        paddingTop: 20,
    },
    modalTitle: {
        color: '#fff',
        fontWeight: '700',
        flex: 1,
        letterSpacing: 0.2,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    saveIconButton: {
        margin: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    closeButton: {
        margin: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    modalScrollView: {
        flex: 1,
    },
    modalScrollContent: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 24,
    },
    // small helper: rounded section card inside modal
    modalFormCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
});
