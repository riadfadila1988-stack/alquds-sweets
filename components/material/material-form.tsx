import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Button, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { IMaterial } from '@/types/material';
import { useTranslation } from '@/app/_i18n';

export default function MaterialForm({
  visible,
  onClose,
  onCreate,
  initialData,
  onUpdate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: Partial<IMaterial>) => Promise<boolean>;
  initialData?: Partial<IMaterial> | null;
  onUpdate?: (id: string, data: Partial<IMaterial>) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string | undefined>(undefined);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const UNITS = ['kg', 'g', 'pcs', 'ltr', 'pack', 'm'];
  const [heName, setHeName] = useState('');
  const [cost, setCost] = useState<string>('');
  const [minQuantity, setMinQuantity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate fields when initialData changes (edit mode)
  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name ?? '');
      setQuantity(initialData.quantity != null ? String(initialData.quantity) : '');
      setUnit(initialData.unit ?? undefined);
      setHeName(initialData.heName ?? '');
      setCost(initialData.cost != null ? String(initialData.cost) : '');
      setMinQuantity(initialData.notificationThreshold != null ? String(initialData.notificationThreshold) : '');
      setShowUnitPicker(false);
      setError(null);
    } else {
      reset();
    }
  }, [initialData]);

  const reset = () => {
    setName('');
    setQuantity('');
    setUnit(undefined);
    setHeName('');
    setCost('');
    setMinQuantity('');
    setShowUnitPicker(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t('nameRequired'));
      return;
    }
    if (!heName.trim()) {
      setError(t('hebrewNameRequired'));
      return;
    }
    if (!cost || Number.isNaN(Number(cost))) {
      setError(t('costRequired'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const data: Partial<IMaterial> = {
      name: name.trim(),
      heName: heName.trim(),
      quantity: quantity ? Number(quantity) : undefined,
      unit: unit,
      notificationThreshold: minQuantity ? Number(minQuantity) : 0,
      cost: cost ? Number(cost) : undefined,
    };
    try {
      if (initialData && initialData._id && onUpdate) {
        const ok = await onUpdate(initialData._id, data);
        if (ok) {
          reset();
          onClose();
        } else {
          setError(t('failedToCreateMaterial'));
        }
      } else {
        const ok = await onCreate(data);
        if (ok) {
          reset();
          onClose();
        } else {
          setError(t('failedToCreateMaterial'));
        }
      }
    } catch {
      setError(t('failedToCreateMaterial'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{initialData ? t('editMaterial') : t('addMaterial')}</Text>
          <Text style={styles.label}>{t('name')}</Text>
          <TextInput placeholder={t('name')} value={name} onChangeText={setName} style={styles.input} />

          <Text style={styles.label}>{t('quantity')}</Text>
          <TextInput placeholder={t('quantity')} value={quantity} onChangeText={setQuantity} style={styles.input} keyboardType="numeric" />

          <Text style={styles.label}>{t('minQuantity')}</Text>
          <TextInput placeholder={t('minQuantity')} value={minQuantity} onChangeText={setMinQuantity} style={styles.input} keyboardType="numeric" />

          <Text style={styles.label}>{t('hebrewName')}</Text>
          <TextInput placeholder={t('hebrewName')} value={heName} onChangeText={setHeName} style={styles.input} />

          <Text style={styles.label}>{t('cost')}</Text>
          <TextInput placeholder={t('cost')} value={cost} onChangeText={setCost} style={styles.input} keyboardType="numeric" />

          {/* Unit selector */}
          <Text style={styles.label}>{t('selectUnit')}</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowUnitPicker((s) => !s)}>
            <Text style={styles.inputText}>{unit ? (t(('unit_' + unit) as any) ?? unit) : t('selectUnit')}</Text>
          </TouchableOpacity>
          {showUnitPicker && (
            <View style={styles.unitList}>
              {UNITS.map((u) => (
                <TouchableOpacity key={u} style={styles.unitItem} onPress={() => { setUnit(u); setShowUnitPicker(false); }}>
                  <Text style={styles.unitText}>{t(('unit_' + u) as any) ?? u}</Text>
                 </TouchableOpacity>
              ))}
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {isSubmitting ? (
            <ActivityIndicator size="small" />
          ) : (
            <View style={styles.buttons}>
              <Button title={t('cancel')} onPress={() => { reset(); onClose(); }} />
              <Button title={initialData ? t('save') : t('add')} onPress={handleSubmit} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  container: { width: '90%', backgroundColor: '#fff', padding: 16, borderRadius: 8, alignItems: 'flex-end' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center', writingDirection: 'rtl' },
  label: { fontSize: 14, color: '#333', marginBottom: 6, textAlign: 'right', writingDirection: 'rtl' },
  // make inputs full width of the modal container
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginBottom: 8, justifyContent: 'center', textAlign: 'right', writingDirection: 'rtl' },
  inputText: { textAlign: 'right', writingDirection: 'rtl' },
  unitList: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 6, marginBottom: 8 },
  unitItem: { padding: 10, alignItems: 'flex-end' },
  unitText: { fontSize: 16, textAlign: 'right', writingDirection: 'rtl' },
  // make buttons container full width and space the actions to the ends
  buttons: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8, width: '100%' },
  error: { color: 'red', marginBottom: 8, textAlign: 'right' },
});
