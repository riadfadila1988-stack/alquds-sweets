import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '@/app/_i18n';
import { IMaterial } from '@/types/material';

// Memoized input row component to avoid remounts that can steal focus
const InputRow = React.memo(
  ({
    nameKey,
    icon,
    placeholder,
    value,
    onChangeText,
    keyboardType,
  }: {
    nameKey: string;
    icon: React.ComponentProps<typeof Icon>['name'];
    placeholder: string;
    value: string;
    onChangeText: (v: string) => void;
    keyboardType?: any;
  }) => {
    const iconScaleRef = useRef(new Animated.Value(1));

    useEffect(() => {
      console.log(`[InputRow] mount ${nameKey}`);
      return () => {
        console.log(`[InputRow] unmount ${nameKey}`);
      };
    }, [nameKey]);

    const handleFocus = () => {
      Animated.timing(iconScaleRef.current, {
        toValue: 1.12,
        duration: 160,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }).start();
    };
    const handleBlur = () => {
      Animated.timing(iconScaleRef.current, { toValue: 1, duration: 140, useNativeDriver: true }).start();
    };

    return (
      <View style={[styles.inputRow, { flexDirection: 'row' /* default; parent handles RTL */ }]}>
        <Animated.View style={[styles.iconBox, { transform: [{ scale: iconScaleRef.current }] }]}>
          <Icon name={icon} size={18} color="#fff" />
        </Animated.View>
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={(text) => onChangeText(text)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          blurOnSubmit={false}
          style={[styles.input]}
          keyboardType={keyboardType}
          placeholderTextColor="#999"
        />
      </View>
    );
  }
);
InputRow.displayName = 'InputRow';

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
  const { width: windowWidth } = useWindowDimensions();

  // no overlay press handler — rely on ScrollView keyboardShouldPersistTaps='always' so inputs keep focus

  // keep prior default for now; ideally derive from i18n or context
  const isRTL = true;

  // form state
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string | undefined>(undefined);
  const [heName, setHeName] = useState('');
  const [cost, setCost] = useState<string>('');
  const [minQuantity, setMinQuantity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // animations
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(20)).current; // subtle translateY
  const rotationAnim = useRef(new Animated.Value(0)).current; // 0..1
  const rotationLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // floating bubbles
  const bubbleAnims = useRef(
    [...Array(6)].map(() => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  const reset = () => {
    setName('');
    setQuantity('');
    setUnit(undefined);
    setHeName('');
    setCost('');
    setMinQuantity('');
    setError(null);
    // hide bubbles
    bubbleAnims.forEach((b) => b.scale.setValue(0));
  };

  // seed values when opened
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name ?? '');
        setHeName((initialData as any).heName ?? '');
        setQuantity(
          typeof initialData.quantity === 'number' && !Number.isNaN(initialData.quantity)
            ? String(initialData.quantity)
            : ''
        );
        setUnit((initialData as any).unit);
        setMinQuantity(
          typeof (initialData as any).notificationThreshold === 'number'
            ? String((initialData as any).notificationThreshold)
            : ''
        );
        setCost(
          typeof (initialData as any).cost === 'number' && !Number.isNaN((initialData as any).cost)
            ? String((initialData as any).cost)
            : ''
        );
      } else {
        reset();
      }
    }
    // no need to run when values change otherwise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // entrance + decorative animations
  useEffect(() => {
    if (!visible) {
      // cleanup
      rotationLoopRef.current?.stop?.();
      return;
    }

    // reset
    opacityAnim.setValue(0);
    scaleAnim.setValue(0.95);
    slideAnim.setValue(20);

    // header rotation
    rotationAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotationLoopRef.current = loop;

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    loop.start();

    // bubbles: pop in with stagger then gentle float
    bubbleAnims.forEach((bubble, i) => {
      const delay = i * 120;
      const yRange = -60 - Math.random() * 30;
      const xRange = (Math.random() - 0.5) * 50;

      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(bubble.scale, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.parallel([
          Animated.loop(
            Animated.sequence([
              Animated.timing(bubble.y, {
                toValue: yRange,
                duration: 2200 + i * 250,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(bubble.y, {
                toValue: 0,
                duration: 2200 + i * 250,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ])
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(bubble.x, {
                toValue: xRange,
                duration: 1600 + i * 180,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(bubble.x, {
                toValue: -xRange,
                duration: 1600 + i * 180,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ])
          ),
        ]),
      ]).start();
    });

    return () => {
      rotationLoopRef.current?.stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Debug: listen for keyboard hide events to help trace unexpected dismissals
  useEffect(() => {
    const onHide = () => {
      console.log('[MaterialForm] keyboardDidHide');
    };
    const sub = Keyboard.addListener ? Keyboard.addListener('keyboardDidHide', onHide) : null;
    return () => {
      sub?.remove?.();
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError(t('name') + ' ' + t('isRequired'));
      // hide bubbles subtly as a cue
      bubbleAnims.forEach((b) => {
        Animated.timing(b.scale, { toValue: 0.8, duration: 200, useNativeDriver: true }).start();
      });
      return;
    }

    setIsSubmitting(true);

    const data: Partial<IMaterial> = {
      name: name.trim(),
      heName: heName.trim(),
      quantity: quantity.trim().length ? Number(quantity) : undefined,
      unit: unit,
      notificationThreshold: minQuantity.trim().length ? Number(minQuantity) : 0,
      cost: cost.trim().length ? Number(cost) : undefined,
    } as any;

    try {
      if (initialData && (initialData as any)._id && onUpdate) {
        const ok = await onUpdate(String((initialData as any)._id), data);
        if (!ok) {
          setError(t('failedToCreateMaterial'));
          setIsSubmitting(false);
          return;
        }
      } else {
        const ok = await onCreate(data);
        if (!ok) {
          setError(t('failedToCreateMaterial'));
          setIsSubmitting(false);
          return;
        }
      }
      reset();
      onClose();
    } catch {
      setError(t('failedToCreateMaterial'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const rotate = rotationAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Modal visible={visible} animationType="none" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}
      >
        {/* Background overlay is a Pressable so taps outside the modal content dismiss the keyboard.
            The content area uses pointerEvents and ScrollView keyboardShouldPersistTaps='always'
            so TextInput presses aren't intercepted by the background handler. */}
        <View style={{ flex: 1, width: '95%' , justifyContent: 'center', alignItems: 'center'}}>
          <View style={{ flex: 1, width: '100%' }}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
            >
              <Animated.View
                style={[
                  styles.container,
                  { width: Math.min(820, Math.round(windowWidth * 0.96)) },
                  isRTL ? styles.containerRTL : styles.containerLTR,
                  styles.cardShadow,
                  { opacity: opacityAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] },
                ]}
              >
                {/* header */}
                <LinearGradient colors={["#6a11cb", "#2575fc"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradientInline}>
                  <View style={[styles.headerContentInline, isRTL ? styles.headerRowReverse : null]}>
                    <TouchableOpacity onPress={onClose} style={[styles.closeCircle, isRTL ? { marginRight: 8 } : { marginLeft: 8 }]} accessibilityLabel={t('close')}>
                      <LinearGradient colors={["#fff", "#f0f0f0"]} style={styles.closeCircleInner}>
                        <Icon name="x" size={16} color="#333" />
                      </LinearGradient>
                    </TouchableOpacity>
                    <Text style={[styles.titleInline, isRTL ? styles.rtlText : styles.ltrText]} numberOfLines={1} ellipsizeMode="tail">
                      {initialData ? t('editMaterial') : t('addMaterial')}
                    </Text>
                    <Animated.View style={[styles.headerIconSmall, { transform: [{ rotate: rotate }] }]}>
                      <Icon name="box" size={16} color="#fff" />
                    </Animated.View>
                  </View>
                </LinearGradient>

                {/* floating bubbles */}
                {bubbleAnims.map((bubble, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.bubble,
                      {
                        left: `${15 + i * 14}%`,
                        top: '12%',
                        width: 20 + (i % 3) * 8,
                        height: 20 + (i % 3) * 8,
                        backgroundColor: ['#ff9a9e55', '#fad0c455', '#a18cd155', '#84fab055', '#fccb9055', '#8ec5fc55'][i],
                        transform: [{ translateY: bubble.y }, { translateX: bubble.x }, { scale: bubble.scale }],
                      },
                    ]}
                  />
                ))}

                {/* form sections */}
                <View style={styles.section}>
                  <Text style={[styles.label, isRTL ? styles.rtlText : styles.ltrText]}>{t('name')}</Text>
                  <InputRow nameKey="name" icon="type" placeholder={t('name')} value={name} onChangeText={setName} />
                </View>

                <View style={styles.section}>
                  <Text style={[styles.label, isRTL ? styles.rtlText : styles.ltrText]}>{t('quantity')}</Text>
                  <InputRow nameKey="quantity" icon="bar-chart-2" placeholder={t('quantity')} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
                </View>

                <View style={styles.section}>
                  <Text style={[styles.label, isRTL ? styles.rtlText : styles.ltrText]}>{t('minQuantity')}</Text>
                  <InputRow nameKey="minQuantity" icon="alert-circle" placeholder={t('minQuantity')} value={minQuantity} onChangeText={setMinQuantity} keyboardType="numeric" />
                </View>

                <View style={styles.section}>
                  <Text style={[styles.label, isRTL ? styles.rtlText : styles.ltrText]}>{t('hebrewName')}</Text>
                  <InputRow nameKey="heName" icon="globe" placeholder={t('hebrewName')} value={heName} onChangeText={setHeName} />
                </View>

                <View style={styles.section}>
                  <Text style={[styles.label, isRTL ? styles.rtlText : styles.ltrText]}>{t('cost')}</Text>
                  <InputRow nameKey="cost" icon="dollar-sign" placeholder={t('cost')} value={cost} onChangeText={setCost} keyboardType="numeric" />
                </View>

                {/*<View style={styles.section}>*/}
                {/*  <Text style={[styles.label, isRTL ? styles.rtlText : styles.ltrText]}>{t('unit') || 'Unit'}</Text>*/}
                {/*  <InputRow nameKey="unit" icon="tag" placeholder={t('unit') || 'Unit'} value={unit ?? ''} onChangeText={(v: string) => setUnit(v || undefined)} />*/}
                {/*</View>*/}

                {error ? <Text style={[styles.error, isRTL ? styles.rtlText : styles.ltrText]}>{error}</Text> : null}

                <View style={[styles.buttons, isRTL ? styles.buttonsRTL : styles.buttonsLTR]}>
                  <TouchableOpacity onPress={onClose} style={[styles.button, styles.cancelBtn]} accessibilityLabel={t('cancel')}>
                    <Text style={styles.cancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting} style={[styles.button, styles.saveBtn]} accessibilityLabel={t('save')}>
                    <LinearGradient colors={["#6a11cb", "#2575fc"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientFill}>
                      {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.modalActionText}>{t('save')}</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
  },
  containerRTL: { alignItems: 'flex-end' },
  containerLTR: { alignItems: 'flex-start' },
  cardShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 12 },

  headerGradientInline: { width: '100%', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  headerContentInline: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRowReverse: { flexDirection: 'row-reverse' },
  closeCircle: { width: 28, height: 28, borderRadius: 16, overflow: 'hidden' },
  closeCircleInner: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleInline: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '700' },
  headerIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },

  section: { width: '100%', marginTop: 8 },
  label: { fontSize: 13, color: '#444', marginBottom: 6, marginTop: 6 },

  inputRow: { width: '100%', alignItems: 'center' },
  rowRTL: { flexDirection: 'row-reverse' },
  rowLTR: { flexDirection: 'row' },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#6a11cb',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#6a11cb',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 5,
  },
  input: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff' },

  buttons: { width: '100%', marginTop: 14, alignItems: 'center' },
  buttonsRTL: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  buttonsLTR: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { flex: 1 },
  saveBtn: { marginStart: 8 },
  cancelBtn: { marginEnd: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#f2f2f2' },
  gradientFill: { paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  modalActionText: { color: '#fff', fontWeight: '700' },
  cancelText: { color: '#333', fontWeight: '600' },

  rtlText: { textAlign: 'right' },
  ltrText: { textAlign: 'left' },

  error: { color: 'red', marginTop: 8 },

  bubble: {
    position: 'absolute',
    borderRadius: 100,
  },
});
