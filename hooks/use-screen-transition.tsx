import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export const useScreenTransition = (duration: number = 400) => {
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }),
        ]).start();
    }, []);

    return {
        containerStyle: {
            flex: 1,
            opacity: fadeAnim,
            transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
            ],
        },
    };
};

export const useScreenFade = (duration: number = 300) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
        }).start();
    }, []);

    return {
        containerStyle: {
            flex: 1,
            opacity: fadeAnim,
        },
    };
};
