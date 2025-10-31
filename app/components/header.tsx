import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../_i18n';

type HeaderProps = {
  title?: string;
  titleKey?: string; // optional i18n key to translate
  subtitle?: string; // optional second line (e.g., user name)
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
};

export default function Header({ title, titleKey, subtitle, showBack = true, onBack, right }: HeaderProps) {
  const { t } = useTranslation();
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('back') || 'Back'} onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-forward" size={28} color="#007AFF" style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}

        <View style={styles.titleWrap}>
          {/* Prefer explicit titleKey for translation; fall back to title prop (already translated) */}
          { (/* @ts-ignore */ titleKey) ? <Text numberOfLines={1} style={styles.title}>{t((titleKey as any) || '')}</Text> : (title ? <Text numberOfLines={1} style={styles.title}>{title}</Text> : null) }
          {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
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
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  rightWrap: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightPlaceholder: { width: 44 },
});
