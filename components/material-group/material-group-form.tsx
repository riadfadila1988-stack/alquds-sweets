import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Platform, Animated } from 'react-native';
import { useMaterials } from '@/hooks/use-materials';
import { useTranslation } from '@/app/_i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

export default function MaterialGroupForm({
  initialData,
  onSubmit,
  onClose,
  isSaving = false,
  showNameInput = true,
  showActions = true,
  name: controlledName,
  onChangeName,
  onChangeSelected,
}: {
  initialData?: any;
  onSubmit: (data: any) => void;
  onClose: () => void;
  isSaving?: boolean;
  showNameInput?: boolean;
  showActions?: boolean;
  name?: string;
  onChangeName?: (text: string) => void;
  onChangeSelected?: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const { materials } = useMaterials();
  const [name, setName] = useState(initialData?.name || '');
  const [focusedName, setFocusedName] = useState(false);
  const [selected, setSelected] = useState<string[]>(() => (initialData?.materials || []).map((m: any) => (typeof m === 'string' ? m : m._id)));

  // Animation refs
  const materialItemAnims = useRef<Map<string, Animated.Value>>(new Map()).current;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setSelected((initialData.materials || []).map((m: any) => (typeof m === 'string' ? m : m._id)));
    }
  }, [initialData]);

  // propagate selection changes to parent when needed
  useEffect(() => {
    onChangeSelected?.(selected);
  }, [selected, onChangeSelected]);

  // memoized list of selected material objects (moved above early return to respect rules-of-hooks)
  const selectedMaterials = useMemo(() => {
    try {
      return (materials || []).filter((m: any) => selected.includes(m._id));
    } catch {
      return [] as any[];
    }
  }, [materials, selected]);

  const toggle = (id: string) => {
    // Animate the item
    if (!materialItemAnims.has(id)) {
      materialItemAnims.set(id, new Animated.Value(1));
    }
    const anim = materialItemAnims.get(id)!;

    Animated.sequence([
      Animated.timing(anim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const handleSubmit = () => {
    const effectiveName = controlledName ?? name;
    if (!effectiveName?.trim()) {
      Alert.alert(t('error') || 'Error', t('nameRequired') || 'Name required');
      return;
    }
    onSubmit({ name: effectiveName.trim(), materials: selected });
  };

  if (!materials) return <ActivityIndicator size="small" />;

  // compute sticky header index based on whether name input is rendered
  const stickyHeaderIndices = [showNameInput ? 1 : 0];

  // chips display logic (limit to avoid overflow)
  const MAX_CHIPS = 6;
  const chipsToShow = selectedMaterials.slice(0, MAX_CHIPS);
  const overflowCount = Math.max(0, selectedMaterials.length - MAX_CHIPS);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 16 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      stickyHeaderIndices={stickyHeaderIndices}
    >
      {/* Name Input Section (optional) */}
      {showNameInput && (
        <View style={styles.inputSection}>
          <View style={styles.labelRow}>
            <Feather name="edit-3" size={16} color="#667eea" />
            <Text style={styles.label}>{t('name') || 'Name'}</Text>
          </View>
          <View style={[styles.inputContainer, focusedName && styles.inputContainerFocused]}>
            <Feather name="folder" size={18} color={focusedName ? '#667eea' : '#999'} style={{ marginRight: 10 }} />
            <TextInput
              value={controlledName ?? name}
              onChangeText={(txt) => (onChangeName ? onChangeName(txt) : setName(txt))}
              style={styles.input}
              placeholder={t('namePlaceholder') || 'Enter group name'}
              placeholderTextColor="#999"
              onFocus={() => {
                setFocusedName(true);
              }}
              onBlur={() => {
                setFocusedName(false);
              }}
              autoCapitalize="sentences"
              autoCorrect={false}
              returnKeyType="done"
              editable={!isSaving}
              underlineColorAndroid="transparent"
              blurOnSubmit={true}
            />
          </View>
        </View>
      )}

      {/* Sticky Materials Header */}
      <View style={styles.stickyHeader}>
        <View style={styles.labelRow}>
          <Feather name="package" size={16} color="#667eea" />
          <Text style={styles.label}>{t('selectMaterials') || 'Select Materials'} ({selected.length})</Text>
        </View>

        {/* Selected chips (only when there are selections) */}
        {selectedMaterials.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {chipsToShow.map((m: any) => (
              <TouchableOpacity key={m._id} onPress={() => toggle(m._id)} activeOpacity={0.85} style={styles.chip}>
                <Feather name="check-circle" size={14} color="#667eea" />
                <Text numberOfLines={1} style={styles.chipText}>{m.name}</Text>
              </TouchableOpacity>
            ))}
            {overflowCount > 0 && (
              <View style={[styles.chip, styles.chipOverflow]}>
                <Text style={[styles.chipText, styles.chipOverflowText]}>+{overflowCount}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Materials List */}
      <View style={styles.materialsSection}>
        {materials.map((m: any) => {
          const isSelected = selected.includes(m._id);
          const initials = String(m.name || '')
            .trim()
            .split(' ')
            .map((s: string) => s[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          if (!materialItemAnims.has(m._id)) {
            materialItemAnims.set(m._id, new Animated.Value(1));
          }
          const itemAnim = materialItemAnims.get(m._id)!;

          return (
            <Animated.View key={m._id} style={{ transform: [{ scale: itemAnim }] }}>
              <TouchableOpacity
                style={[styles.materialCard, isSelected && styles.materialCardSelected]}
                onPress={() => toggle(m._id)}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <LinearGradient
                    colors={["#667eea", "#764ba2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.selectedBorder}
                  />
                )}

                <View style={styles.materialCardContent}>
                  <View style={styles.checkboxContainer}>
                    {isSelected ? (
                      <LinearGradient
                        colors={["#667eea", "#764ba2"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.checkboxChecked}
                      >
                        <Feather name="check" size={14} color="#fff" />
                      </LinearGradient>
                    ) : (
                      <View style={styles.checkbox} />
                    )}
                  </View>

                  <View style={styles.materialInfo}>
                    <Text style={styles.materialName} numberOfLines={1}>
                      {m.name}
                    </Text>
                    {m.heName && (
                      <Text style={styles.materialHeName} numberOfLines={1}>
                        {m.heName}
                      </Text>
                    )}
                  </View>

                  <LinearGradient
                    colors={isSelected ? ["#667eea", "#764ba2"] : ["#f0f0f0", "#e0e0e0"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>{initials}</Text>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Action Buttons (optional) */}
      {showActions && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose} activeOpacity={0.7}>
            <Feather name="x" size={18} color="#666" />
            <Text style={[styles.btnCancelText, { marginLeft: 8 }]}>{t('cancel') || 'Cancel'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSubmit} disabled={isSaving} activeOpacity={0.8}>
            <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnSaveGradient}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={[styles.btnSaveText, { marginLeft: 8 }]}>{t('save') || 'Save'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Input Section
  inputSection: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, default: 12 }),
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  inputContainerFocused: {
    borderColor: '#667eea',
    backgroundColor: '#fff',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
    margin: 0,
    minHeight: Platform.select({ ios: 20, android: 24 }),
  },

  // Materials Section
  materialsSection: {
    marginBottom: 24,
  },
  materialCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
    position: 'relative',
  },
  materialCardSelected: {
    borderColor: 'transparent',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  selectedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  materialCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 11,
    margin: 1,
  },

  // Checkbox
  checkboxContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Material Info
  materialInfo: {
    flex: 1,
    marginRight: 12,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  materialHeName: {
    fontSize: 13,
    color: '#666',
  },

  // Avatar
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  avatarTextSelected: {
    color: '#fff',
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  btn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnCancel: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginRight: 12,
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  btnSave: {
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnSaveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  btnSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Sticky Header
  stickyHeader: {
    backgroundColor: '#fff',
    paddingTop: 4,
    paddingBottom: 8,
    // visual separation
    borderBottomWidth: Platform.select({ ios: 0, default: 1 }),
    borderBottomColor: '#eee',
    // subtle shadow on iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // elevation on Android kept low for performance
    elevation: 1,
    zIndex: 2,
  },
  chipsRow: {
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f4f5ff',
    borderWidth: 1,
    borderColor: '#667eea33',
    borderRadius: 999,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    color: '#334155',
    marginLeft: 6,
    maxWidth: 160,
    fontWeight: '600',
  },
  chipOverflow: {
    backgroundColor: '#eef2ff',
  },
  chipOverflowText: {
    color: '#667eea',
  },
});
