import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from 'react-native-paper';

interface RandomAnimatedMenuItemProps {
    href: string;
    icon: any;
    text: string;
    color: readonly [string, string, ...string[]];
    animationTrigger?: number; // Triggers synchronized animation across all icons
}

// Random animation types that will be selected on each render
// Added FUNNY and LAUGHABLE animations! 😂
const ANIMATION_TYPES = [
    'bounce',
    'swing',
    'pulse',
    'rotate',
    'flip',
    'slide',
    'scale',
    'shake',
    'wiggle',        // 🤪 Wiggles left-right rapidly
    'jello',         // 🍮 Jiggly jello effect
    'rubber',        // 🎈 Stretchy rubber band effect
    'tada',          // 🎉 Ta-da! celebration
    'crazy-spin',    // 🌀 Spinning like crazy
    'wobble',        // 🥴 Drunk wobble effect
    'bounce-crazy',  // 🤹 Super bouncy like a ping pong ball
    'heartbeat',     // 💓 Heartbeat pulse
];

export default function RandomAnimatedMenuItem({ href, icon, text, color, animationTrigger = 0 }: RandomAnimatedMenuItemProps) {
    // 🎲 RANDOM MODE: Each icon gets a different funny animation on each visit!
    const animationType = useRef(ANIMATION_TYPES[Math.floor(Math.random() * ANIMATION_TYPES.length)]).current;

    const randomDelay = useRef(Math.random() * 500).current; // Random delay 0-500ms for staggered entrance

    // Debug: Log the selected animation
    console.log(`🎬 ${text}: ${animationType} animation (delay: ${randomDelay}ms)`);

    const animValue = useRef(new Animated.Value(0)).current;
    const scaleValue = useRef(new Animated.Value(1)).current;
    const rotateValue = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    // 🐱🐕 CAT & DOG CHASE ANIMATION - Triggered every 10 seconds!
    const chaseX = useRef(new Animated.Value(0)).current;
    const chaseY = useRef(new Animated.Value(0)).current;
    const chaseRotate = useRef(new Animated.Value(0)).current;
    const chaseScale = useRef(new Animated.Value(1)).current;

    // Different chase patterns that rotate each time
    const CHASE_PATTERNS = [
        'run-right',      // 🐱💨➡️ Cat runs to the right, dog chases
        'run-left',       // ⬅️💨🐱 Cat runs to the left
        'run-up',         // ⬆️💨🐱 Cat runs up
        'run-down',       // ⬇️💨🐱 Cat runs down
        'zigzag',         // 🐱↗️↘️↗️ Cat zigzags away
        'spiral',         // 🐱🌀 Cat runs in spiral
        'jump-scatter',   // 🐱⬆️💥 All cats jump and scatter
        'hide-shrink',    // 🐱📦 Cats shrink to hide
        'panic-spin',     // 🐱🌪️ Cats spin in panic
        'bounce-escape',  // 🐱⬆️⬇️⬆️ Cats bounce away
    ];

    const currentPattern = useRef(CHASE_PATTERNS[animationTrigger % CHASE_PATTERNS.length]).current;

    useEffect(() => {
        // Entrance animation - icon fades in
        Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            delay: randomDelay,
            useNativeDriver: true,
        }).start();

        // Continuous animation based on type
        let animation: Animated.CompositeAnimation;

        switch (animationType) {
            case 'bounce':
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(translateY, {
                            toValue: -10,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                        Animated.spring(translateY, {
                            toValue: 0,
                            tension: 100,
                            friction: 5,
                            useNativeDriver: true,
                        }),
                    ])
                );
                break;

            case 'swing':
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(rotateValue, {
                            toValue: 1,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(rotateValue, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                    ])
                );
                break;

            case 'pulse':
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(scaleValue, {
                            toValue: 1.08,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scaleValue, {
                            toValue: 1,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                    ])
                );
                break;

            case 'rotate':
                animation = Animated.loop(
                    Animated.timing(rotateValue, {
                        toValue: 1,
                        duration: 8000,
                        useNativeDriver: true,
                    })
                );
                break;

            case 'flip':
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(animValue, {
                            toValue: 1,
                            duration: 3000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(animValue, {
                            toValue: 0,
                            duration: 3000,
                            useNativeDriver: true,
                        }),
                    ])
                );
                break;

            case 'slide':
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(translateX, {
                            toValue: 5,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: -5,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                    ])
                );
                break;

            case 'scale':
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(scaleValue, {
                            toValue: 1.05,
                            duration: 1800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scaleValue, {
                            toValue: 0.98,
                            duration: 1800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scaleValue, {
                            toValue: 1,
                            duration: 1800,
                            useNativeDriver: true,
                        }),
                    ])
                );
                break;

            case 'shake':
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(translateX, {
                            toValue: -3,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: 3,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: -3,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: 3,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: 0,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        Animated.delay(3000), // Pause between shakes
                    ])
                );
                break;

            case 'wiggle':
                // 🤪 Rapid wiggle - very funny! (MADE MORE EXTREME!)
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(rotateValue, {
                            toValue: 0.25, // MORE WIGGLE! (was 0.15)
                            duration: 60, // FASTER! (was 80)
                            useNativeDriver: true,
                        }),
                        Animated.timing(rotateValue, {
                            toValue: -0.25, // MORE WIGGLE!
                            duration: 60,
                            useNativeDriver: true,
                        }),
                        Animated.timing(rotateValue, {
                            toValue: 0.25,
                            duration: 60,
                            useNativeDriver: true,
                        }),
                        Animated.timing(rotateValue, {
                            toValue: -0.25,
                            duration: 60,
                            useNativeDriver: true,
                        }),
                        Animated.timing(rotateValue, {
                            toValue: 0,
                            duration: 60,
                            useNativeDriver: true,
                        }),
                        Animated.delay(1000), // SHORTER PAUSE! (was 2000)
                    ])
                );
                break;

            case 'jello':
                // 🍮 EXTREME JELLO for TESTING - You CANNOT miss this!
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(scaleValue, {
                            toValue: 2.0, // HUGE! 200% size!
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.spring(scaleValue, {
                            toValue: 0.5, // TINY! 50% size!
                            tension: 200,
                            friction: 1, // SUPER JIGGLY!
                            useNativeDriver: true,
                        }),
                        Animated.spring(scaleValue, {
                            toValue: 1.8, // HUGE again!
                            tension: 200,
                            friction: 1,
                            useNativeDriver: true,
                        }),
                        Animated.spring(scaleValue, {
                            toValue: 1,
                            tension: 200,
                            friction: 5,
                            useNativeDriver: true,
                        }),
                        Animated.delay(500), // SHORT PAUSE - keeps repeating!
                    ])
                );
                break;

            case 'rubber':
                // 🎈 Rubber band stretch effect
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(scaleValue, {
                            toValue: 1.3,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.spring(scaleValue, {
                            toValue: 0.7,
                            tension: 100,
                            friction: 4,
                            useNativeDriver: true,
                        }),
                        Animated.spring(scaleValue, {
                            toValue: 1,
                            tension: 100,
                            friction: 5,
                            useNativeDriver: true,
                        }),
                        Animated.delay(2000),
                    ])
                );
                break;

            case 'tada':
                // 🎉 Ta-da! celebration effect
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.parallel([
                            Animated.timing(scaleValue, {
                                toValue: 1.2,
                                duration: 150,
                                useNativeDriver: true,
                            }),
                            Animated.timing(rotateValue, {
                                toValue: 0.1,
                                duration: 150,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.parallel([
                            Animated.timing(rotateValue, {
                                toValue: -0.1,
                                duration: 150,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.parallel([
                            Animated.timing(rotateValue, {
                                toValue: 0.1,
                                duration: 150,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.parallel([
                            Animated.timing(scaleValue, {
                                toValue: 1,
                                duration: 150,
                                useNativeDriver: true,
                            }),
                            Animated.timing(rotateValue, {
                                toValue: 0,
                                duration: 150,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.delay(3000),
                    ])
                );
                break;

            case 'crazy-spin':
                // 🌀 Crazy fast spinning - very funny!
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(rotateValue, {
                            toValue: 1,
                            duration: 500, // Super fast!
                            useNativeDriver: true,
                        }),
                        Animated.timing(rotateValue, {
                            toValue: 2,
                            duration: 500,
                            useNativeDriver: true,
                        }),
                        Animated.delay(2000),
                        Animated.timing(rotateValue, {
                            toValue: 0,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                    ])
                );
                break;

            case 'wobble':
                // 🥴 Drunk wobble - hilarious!
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.parallel([
                            Animated.timing(translateX, {
                                toValue: -8,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                            Animated.timing(rotateValue, {
                                toValue: -0.08,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.parallel([
                            Animated.timing(translateX, {
                                toValue: 8,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                            Animated.timing(rotateValue, {
                                toValue: 0.08,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.parallel([
                            Animated.timing(translateX, {
                                toValue: -6,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                            Animated.timing(rotateValue, {
                                toValue: -0.06,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.parallel([
                            Animated.timing(translateX, {
                                toValue: 6,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                            Animated.timing(rotateValue, {
                                toValue: 0.06,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.parallel([
                            Animated.timing(translateX, {
                                toValue: 0,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                            Animated.timing(rotateValue, {
                                toValue: 0,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.delay(2500),
                    ])
                );
                break;

            case 'bounce-crazy':
                // 🤹 Super bouncy like a ping pong ball!
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(translateY, {
                            toValue: -25,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateY, {
                            toValue: 0,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateY, {
                            toValue: -20,
                            duration: 150,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateY, {
                            toValue: 0,
                            duration: 150,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateY, {
                            toValue: -15,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateY, {
                            toValue: 0,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateY, {
                            toValue: -10,
                            duration: 80,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateY, {
                            toValue: 0,
                            duration: 80,
                            useNativeDriver: true,
                        }),
                        Animated.delay(2000),
                    ])
                );
                break;

            case 'heartbeat':
                // 💓 Heartbeat pulse - cute and funny!
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(scaleValue, {
                            toValue: 1.2,
                            duration: 150,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scaleValue, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scaleValue, {
                            toValue: 1.2,
                            duration: 150,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scaleValue, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                        }),
                        Animated.delay(1500),
                    ])
                );
                break;

            default:
                animation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(scaleValue, {
                            toValue: 1.05,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scaleValue, {
                            toValue: 1,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                    ])
                );
        }

        animation.start();

        return () => animation.stop();
    }, [animationType, randomDelay, animValue, scaleValue, rotateValue, translateX, translateY, opacity]);

    // 🐱🐕 CHASE ANIMATION EFFECT - Triggered every 10 seconds!
    useEffect(() => {
        if (animationTrigger === 0) return; // Skip on initial load

        console.log(`🐱💨🐕 CHASE! Pattern: ${currentPattern}`);

        let chaseAnimation: Animated.CompositeAnimation;

        switch (currentPattern) {
            case 'run-right':
                // Cat runs to the right!
                chaseAnimation = Animated.sequence([
                    Animated.parallel([
                        Animated.timing(chaseX, {
                            toValue: 150,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(chaseRotate, {
                            toValue: 1,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.spring(chaseX, {
                        toValue: 0,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                    Animated.timing(chaseRotate, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]);
                break;

            case 'run-left':
                // Cat runs to the left!
                chaseAnimation = Animated.sequence([
                    Animated.parallel([
                        Animated.timing(chaseX, {
                            toValue: -150,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(chaseRotate, {
                            toValue: -1,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.spring(chaseX, {
                        toValue: 0,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                    Animated.timing(chaseRotate, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]);
                break;

            case 'run-up':
                // Cat runs up!
                chaseAnimation = Animated.sequence([
                    Animated.parallel([
                        Animated.timing(chaseY, {
                            toValue: -100,
                            duration: 700,
                            useNativeDriver: true,
                        }),
                        Animated.timing(chaseScale, {
                            toValue: 0.7,
                            duration: 700,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.spring(chaseY, {
                        toValue: 0,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                    Animated.spring(chaseScale, {
                        toValue: 1,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                ]);
                break;

            case 'run-down':
                // Cat runs down!
                chaseAnimation = Animated.sequence([
                    Animated.parallel([
                        Animated.timing(chaseY, {
                            toValue: 100,
                            duration: 700,
                            useNativeDriver: true,
                        }),
                        Animated.timing(chaseScale, {
                            toValue: 1.3,
                            duration: 700,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.spring(chaseY, {
                        toValue: 0,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                    Animated.spring(chaseScale, {
                        toValue: 1,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                ]);
                break;

            case 'zigzag':
                // Cat zigzags away!
                chaseAnimation = Animated.sequence([
                    Animated.parallel([
                        Animated.timing(chaseX, { toValue: 80, duration: 150, useNativeDriver: true }),
                        Animated.timing(chaseY, { toValue: -40, duration: 150, useNativeDriver: true }),
                    ]),
                    Animated.parallel([
                        Animated.timing(chaseX, { toValue: -80, duration: 150, useNativeDriver: true }),
                        Animated.timing(chaseY, { toValue: -80, duration: 150, useNativeDriver: true }),
                    ]),
                    Animated.parallel([
                        Animated.timing(chaseX, { toValue: 80, duration: 150, useNativeDriver: true }),
                        Animated.timing(chaseY, { toValue: -40, duration: 150, useNativeDriver: true }),
                    ]),
                    Animated.parallel([
                        Animated.timing(chaseX, { toValue: -80, duration: 150, useNativeDriver: true }),
                        Animated.timing(chaseY, { toValue: 0, duration: 150, useNativeDriver: true }),
                    ]),
                    Animated.spring(chaseX, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
                ]);
                break;

            case 'spiral':
                // Cat runs in a spiral!
                chaseAnimation = Animated.sequence([
                    Animated.timing(chaseRotate, { toValue: 3, duration: 1000, useNativeDriver: true }),
                    Animated.parallel([
                        Animated.timing(chaseX, { toValue: 100, duration: 200, useNativeDriver: true }),
                        Animated.timing(chaseY, { toValue: -100, duration: 200, useNativeDriver: true }),
                    ]),
                    Animated.parallel([
                        Animated.spring(chaseX, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
                        Animated.spring(chaseY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
                        Animated.timing(chaseRotate, { toValue: 0, duration: 300, useNativeDriver: true }),
                    ]),
                ]);
                break;

            case 'jump-scatter':
                // All cats jump and scatter!
                const randomX = (Math.random() - 0.5) * 200;
                const randomY = -50 - Math.random() * 100;
                chaseAnimation = Animated.sequence([
                    Animated.parallel([
                        Animated.timing(chaseY, { toValue: randomY, duration: 400, useNativeDriver: true }),
                        Animated.timing(chaseX, { toValue: randomX, duration: 400, useNativeDriver: true }),
                        Animated.timing(chaseRotate, { toValue: (Math.random() - 0.5) * 4, duration: 400, useNativeDriver: true }),
                    ]),
                    Animated.parallel([
                        Animated.spring(chaseY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
                        Animated.spring(chaseX, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
                        Animated.spring(chaseRotate, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
                    ]),
                ]);
                break;

            case 'hide-shrink':
                // Cats shrink to hide!
                chaseAnimation = Animated.sequence([
                    Animated.timing(chaseScale, {
                        toValue: 0.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.delay(500),
                    Animated.spring(chaseScale, {
                        toValue: 1,
                        tension: 50,
                        friction: 5,
                        useNativeDriver: true,
                    }),
                ]);
                break;

            case 'panic-spin':
                // Cats spin in panic!
                chaseAnimation = Animated.sequence([
                    Animated.timing(chaseRotate, {
                        toValue: 5,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.spring(chaseRotate, {
                        toValue: 0,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                ]);
                break;

            case 'bounce-escape':
                // Cats bounce away frantically!
                chaseAnimation = Animated.sequence([
                    Animated.timing(chaseY, { toValue: -80, duration: 200, useNativeDriver: true }),
                    Animated.timing(chaseY, { toValue: 0, duration: 200, useNativeDriver: true }),
                    Animated.timing(chaseY, { toValue: -60, duration: 150, useNativeDriver: true }),
                    Animated.timing(chaseY, { toValue: 0, duration: 150, useNativeDriver: true }),
                    Animated.timing(chaseY, { toValue: -40, duration: 100, useNativeDriver: true }),
                    Animated.timing(chaseY, { toValue: 0, duration: 100, useNativeDriver: true }),
                ]);
                break;

            default:
                chaseAnimation = Animated.sequence([
                    Animated.timing(chaseScale, { toValue: 1.3, duration: 200, useNativeDriver: true }),
                    Animated.spring(chaseScale, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }),
                ]);
        }

        chaseAnimation.start();

    }, [animationTrigger, currentPattern, chaseX, chaseY, chaseRotate, chaseScale]);

    // Calculate animated styles based on type
    const getAnimatedStyle = () => {
        let rotation: Animated.AnimatedInterpolation<string | number> = rotateValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '0deg'],
        });
        let flipRotation: Animated.AnimatedInterpolation<string | number> = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '0deg'],
        });

        // Chase rotation for cat running from dog
        const chaseRotation = chaseRotate.interpolate({
            inputRange: [0, 1, 2, 3, 4, 5],
            outputRange: ['0deg', '360deg', '720deg', '1080deg', '1440deg', '1800deg'],
        });

        if (animationType === 'swing') {
            rotation = rotateValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['-5deg', '5deg'],
            });
        } else if (animationType === 'rotate') {
            rotation = rotateValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
            });
        } else if (animationType === 'flip') {
            flipRotation = animValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: ['0deg', '180deg', '360deg'],
            });
        } else if (animationType === 'wiggle') {
            rotation = rotateValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '25deg'], // BIGGER! (was 15deg)
            });
        } else if (animationType === 'tada') {
            rotation = rotateValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '10deg'],
            });
        } else if (animationType === 'crazy-spin') {
            rotation = rotateValue.interpolate({
                inputRange: [0, 1, 2],
                outputRange: ['0deg', '360deg', '720deg'],
            });
        } else if (animationType === 'wobble') {
            rotation = rotateValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '8deg'],
            });
        }

        return {
            opacity,
            transform: [
                { translateX: Animated.add(translateX, chaseX) }, // Combine normal + chase movement
                { translateY: Animated.add(translateY, chaseY) }, // Combine normal + chase movement
                { scale: Animated.multiply(scaleValue, chaseScale) }, // Combine normal + chase scale
                { rotate: rotation },
                { rotate: chaseRotation }, // Add chase rotation
                { rotateY: flipRotation },
            ],
        };
    };

    const handlePress = () => {
        router.push(href as any);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.touchable}>
                <LinearGradient
                    colors={color}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.menuItem}
                >
                    {/* Only the icon is animated */}
                    <Animated.View style={getAnimatedStyle()}>
                        <Ionicons name={icon} size={36} color="#fff" />
                    </Animated.View>
                    <Text style={styles.menuText}>{text}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    touchable: {
        flex: 1,
    },
    menuItem: {
        flex: 1,
        padding: 20,
        borderRadius: 16,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
    },
    menuText: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginTop: 8,
    },
});

