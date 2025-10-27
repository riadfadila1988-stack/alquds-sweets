import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type HeaderProps = {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
};

export default function Header({ title, showBack = true, onBack, right }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) return onBack();
    try {
      router.back();
    } catch (e) {
      console.warn('Header back navigation failed', e);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top || 12 }]}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity accessibilityRole="button" onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}

        <View style={styles.titleWrap}>
          {title ? <Text numberOfLines={1} style={styles.title}>{title}</Text> : null}
        </View>

        <View style={styles.rightWrap}>{right ?? <View style={styles.rightPlaceholder} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e6',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 44,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  rightWrap: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightPlaceholder: { width: 44 },
});
