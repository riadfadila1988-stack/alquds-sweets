import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';

interface CircularDonutProps {
    size?: number;
    strokeWidth?: number;
    greenPercent?: number;
    redPercent?: number;
    animate?: boolean;
    children?: React.ReactNode;
}

/**
 * CircularDonut - A beautiful 3D animated donut chart component using SVG
 *
 * @param size - Outer diameter of the donut (default: 160)
 * @param strokeWidth - Thickness of the donut ring (default: 24)
 * @param greenPercent - Percentage for green arc (0-100, default: 0)
 * @param redPercent - Percentage for red arc (0-100, default: 0)
 * @param animate - Whether to animate the arcs (default: true)
 * @param children - Content to display in the center of the donut
 */
export const CircularDonut: React.FC<CircularDonutProps> = ({
    size = 160,
    strokeWidth = 24,
    greenPercent = 0,
    redPercent = 0,
    animate = true,
    children
}) => {
    const [animGreen, setAnimGreen] = useState(animate ? 0 : greenPercent);
    const [animRed, setAnimRed] = useState(animate ? 0 : redPercent);

    useEffect(() => {
        if (!animate) {
            setAnimGreen(greenPercent);
            setAnimRed(redPercent);
            return;
        }

        // Simple animation using setTimeout
        const duration = 500;
        const steps = 30;
        const stepDuration = duration / steps;

        let currentStep = 0;
        const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            setAnimGreen(greenPercent * progress);
            setAnimRed(redPercent * progress);

            if (currentStep >= steps) {
                clearInterval(timer);
            }
        }, stepDuration);

        return () => clearInterval(timer);
    }, [greenPercent, redPercent, animate]);

    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate stroke dash values
    const greenDash = (animGreen / 100) * circumference;
    const redDash = (animRed / 100) * circumference;
    const greenOffset = -circumference / 4; // Start at top (rotate -90deg)
    const redOffset = greenOffset - greenDash;

    const innerSize = size - strokeWidth * 2;

    return (
        <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
            {/* Outer shadow for 3D depth */}
            <View style={{
                position: 'absolute',
                width: size + 8,
                height: size + 8,
                borderRadius: (size + 8) / 2,
                backgroundColor: 'transparent',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
            }}/>

            {/* SVG Chart */}
            <Svg width={size} height={size} style={{position: 'absolute'}}>
                {/* Background circle (gray) */}
                <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#E8E8E8"
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Green arc */}
                {animGreen > 0 && (
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="#34C759"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={`${greenDash} ${circumference - greenDash}`}
                        strokeDashoffset={greenOffset}
                        strokeLinecap="butt"
                    />
                )}

                {/* Orange arc */}
                {animRed > 0 && (
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="#FF9500"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={`${redDash} ${circumference - redDash}`}
                        strokeDashoffset={redOffset}
                        strokeLinecap="butt"
                    />
                )}
            </Svg>

            {/* Inner circle with white background and subtle shadow */}
            <View style={{
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 3,
            }}>
                {/* Inner glossy highlight for 3D effect */}
                <View style={{
                    position: 'absolute',
                    top: strokeWidth / 2,
                    width: innerSize - strokeWidth,
                    height: (innerSize - strokeWidth) / 3,
                    borderRadius: (innerSize - strokeWidth) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                }}/>
                {children}
            </View>

            {/* Outer glossy highlight for 3D effect */}
            <View style={{
                position: 'absolute',
                top: strokeWidth / 2,
                width: size - strokeWidth * 1.5,
                height: strokeWidth / 2,
                borderRadius: size / 2,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                pointerEvents: 'none',
            }}/>
        </View>
    );
};

