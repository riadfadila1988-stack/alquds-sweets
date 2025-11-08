import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import MaterialGroupForm from '@/components/material-group/material-group-form';
import { useMaterialGroups } from '@/hooks/use-material-groups';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/app/_i18n';
import Header from '../components/header';

export default function NewMaterialGroupScreen() {
  const { t } = useTranslation();
  const { create } = useMaterialGroups();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (data: any) => {
    try {
      setIsSaving(true);
      await create(data);
      router.replace('/material-groups' as any);
    } catch (err: any) {
      console.error('Failed to create material group', err);
      Alert.alert(t('error') || 'Error', err?.message || 'Failed to create material group');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t('newMaterialGroup') || 'New Material Group'} />
      <MaterialGroupForm onSubmit={handleSubmit} onClose={() => router.back()} isSaving={isSaving} />
      {isSaving && (
        <View style={styles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12 }}>{t('saving') || 'Saving...'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centerOverlay: { position: 'absolute', left: 0, right: 0, top: 60, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },
});
