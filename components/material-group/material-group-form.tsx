import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useMaterials } from '@/hooks/use-materials';
import { useTranslation } from '@/app/_i18n';

export default function MaterialGroupForm({ initialData, onSubmit, onClose, isSaving = false }: { initialData?: any; onSubmit: (data: any) => void; onClose: () => void; isSaving?: boolean; }) {
  const { t } = useTranslation();
  const { materials } = useMaterials();
  const [name, setName] = useState(initialData?.name || '');
  const [selected, setSelected] = useState<string[]>(() => (initialData?.materials || []).map((m: any) => (typeof m === 'string' ? m : m._id)));

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setSelected((initialData.materials || []).map((m: any) => (typeof m === 'string' ? m : m._id)));
    }
  }, [initialData]);

  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleSubmit = () => {
    if (!name.trim()) { Alert.alert(t('error') || 'Error', t('nameRequired') || 'Name required'); return; }
    onSubmit({ name: name.trim(), materials: selected });
  };

  if (!materials) return <ActivityIndicator size="small" />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>{t('name') || 'Name'}</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
        {materials.map((m: any) => (
        <TouchableOpacity key={m._id} style={styles.materialRow} onPress={() => toggle(m._id)}>
          <Text style={styles.materialText}>{m.name}{m.heName ? ` | ${m.heName}` : ''}</Text>
          <View style={[styles.checkbox, selected.includes(m._id) ? styles.checkboxChecked : null]} />
        </TouchableOpacity>
      ))}

      <View style={{ flexDirection: 'row', marginTop: 16 }}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#777' }]} onPress={onClose}><Text style={{ color: '#fff' }}>{t('cancel') || 'Cancel'}</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { marginLeft: 8 }]} onPress={handleSubmit} disabled={isSaving}><Text style={{ color: '#fff' }}>{isSaving ? (t('saving') || 'Saving...') : (t('save') || 'Save')}</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, textAlign: 'right'},
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10 },
  materialRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  materialText: { fontSize: 15, textAlign: 'right', maxWidth: '90%' },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: '#777', backgroundColor: '#fff' },
  checkboxChecked: { backgroundColor: '#007AFF' },
  btn: { padding: 12, borderRadius: 6, backgroundColor: '#007AFF', flex: 1, alignItems: 'center', justifyContent: 'center' },
});

