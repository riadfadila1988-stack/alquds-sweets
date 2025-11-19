import React, {useEffect, useState, useRef} from 'react';
import {
    View,
    StyleSheet,
    ActivityIndicator,
    Text,
    Alert,
    TouchableOpacity,
    Modal,
    FlatList,
    Pressable,
    TextInput,
    Animated,
    Easing,
    TouchableWithoutFeedback
} from 'react-native';
import {useMaterialGroups} from '@/hooks/use-material-groups';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {getMaterialGroup} from '@/services/material-group';
import {useTranslation} from '@/app/_i18n';
import DraggableFlatList, {RenderItemParams} from 'react-native-draggable-flatlist';
import MaterialListItem from '@/components/material/material-list-item';
import {useMaterials} from '@/hooks/use-materials';
import {MaterialIcons, Feather} from '@expo/vector-icons';
import MaterialForm from '@/components/material/material-form';
import {ScreenTemplate} from "@/components/ScreenTemplate";
import {LinearGradient} from 'expo-linear-gradient';

export default function EditMaterialGroupScreen() {
    const {t} = useTranslation();
    const router = useRouter();
    const {id} = useLocalSearchParams<{ id: string }>();
    const {update} = useMaterialGroups();
    // get materials and update helper to edit single materials
    const {materials: allMaterials, update: updateMaterial, create: createMaterial} = useMaterials();

    const [group, setGroup] = useState<any | null>(null);
    const [localMaterials, setLocalMaterials] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // edit material modal state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<any | null>(null);

    // picker modal state
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');

    // picker animations
    const pickerOpacity = useRef(new Animated.Value(0)).current;
    const pickerScale = useRef(new Animated.Value(0.9)).current;
    const pickerSlide = useRef(new Animated.Value(50)).current;

    const openEditModal = (mat: any) => {
        if (!mat) return;
        // material can be id string or object
        const m = typeof mat === 'string' ? (allMaterials || []).find((a: any) => String(a._id) === String(mat)) || {
            _id: mat,
            name: ''
        } : mat;
        setEditingMaterial(m);
        setEditModalVisible(true);
    };

    const closeEditModal = () => {
        setEditModalVisible(false);
        setEditingMaterial(null);
    };

    // wrapper to update a material and keep the group's localMaterials in sync
    const handleMaterialUpdate = async (id: string, data: Partial<any>) => {
        try {
            const ok = await updateMaterial(String(id), data);
            if (ok) {
                setLocalMaterials(prev => prev.map(m => (String(m._id ?? m) === String(id) ? ({...m, ...data}) : m)));
            }
            return ok;
        } catch (err) {
            console.error('handleMaterialUpdate error', err);
            return false;
        }
    };

    useEffect(() => {
        if (!id) return;
        if (id === 'new') {
            router.replace('/material-groups/new' as any);
            return;
        }

        let mounted = true;
        const load = async () => {
            try {
                setIsLoading(true);
                const data = await getMaterialGroup(String(id));
                if (mounted) {
                    setGroup(data);
                    const mats = (data?.materials || []).map((m: any) => (typeof m === 'string' ? {
                        _id: m,
                        name: m
                    } : m));
                    setLocalMaterials(mats);
                }
            } catch (err: any) {
                console.error('Failed to load material group', err);
                const status = err?.response?.status;
                if (status === 404) {
                    Alert.alert(t('notFound') || 'Not found', t('materialGroupNotFound') || 'Material group not found');
                    router.replace('/material-groups' as any);
                    return;
                }
                const msg = err?.message || (t('error') || 'Failed to load material group');
                if (mounted) setError(msg);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, [id, router, t]);

    const saveMaterials = async (materialsArr: any[]) => {
        if (!id) return false;
        try {
            setIsSaving(true);
            const ids = materialsArr.map((m: any) => m._id ?? m);
            await update({id: String(id), data: {materials: ids}});
            // keep local state in sync
            setGroup((g: any) => ({...(g || {}), materials: ids}));
            return true;
        } catch (err: any) {
            console.error('Failed to save material group materials', err);
            Alert.alert(t('error') || 'Error', err?.message || 'Failed to save group');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const onDragEnd = async ({data}: { data: any[] }) => {
        setLocalMaterials(data);
        await saveMaterials(data);
    };

    const openPicker = () => {
        setPickerSearch('');
        setPickerVisible(true);

        // Reset animation values
        pickerOpacity.setValue(0);
        pickerScale.setValue(0.9);
        pickerSlide.setValue(50);

        // Animate in
        Animated.parallel([
            Animated.timing(pickerOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.spring(pickerScale, {
                toValue: 1,
                friction: 8,
                tension: 50,
                useNativeDriver: true,
            }),
            Animated.spring(pickerSlide, {
                toValue: 0,
                friction: 8,
                tension: 50,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closePicker = () => {
        Animated.parallel([
            Animated.timing(pickerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(pickerScale, {
                toValue: 0.9,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setPickerVisible(false);
        });
    };

    const addMaterialToGroup = async (mat: any) => {
        // if already present, do nothing
        const exists = localMaterials.find((m) => String(m._id) === String(mat._id));
        if (exists) {
            Alert.alert(t('info') || 'Info', t('materialAlreadyInGroup') || 'Material already in group');
            return;
        }
        const next = [...localMaterials, mat];
        setLocalMaterials(next);
        const ok = await saveMaterials(next);
        if (ok) {
            // keep picker open for multiple adds
        } else {
            // revert
            setLocalMaterials(localMaterials);
        }
    };

    const removeMaterialFromGroup = async (matId: string) => {
        const next = localMaterials.filter((m) => String(m._id) !== String(matId));
        setLocalMaterials(next);
        const ok = await saveMaterials(next);
        if (!ok) {
            // revert by reloading group
            try {
                const data = await getMaterialGroup(String(id));
                const mats = (data?.materials || []).map((m: any) => (typeof m === 'string' ? {_id: m, name: m} : m));
                setLocalMaterials(mats);
            } catch {
                // ignore reload errors
            }
        }
    };

    if (isLoading) {
        return (
            <ScreenTemplate title={t('loading') || 'Loading'}>
                <ActivityIndicator size="large"/>
                <Text style={{marginTop: 12}}>{t('loading') || 'Loading...'}</Text>
            </ScreenTemplate>
        );
    }

    if (error) {
        return (
            <ScreenTemplate title={t('materialGroup') || 'Material Group'}>
                <Text style={styles.empty}>{t('r') || 'Material group not found'}</Text>
            </ScreenTemplate>
        );
    }

    if (!group) {
        return (
            <ScreenTemplate title={t('materialGroup') || 'Material Group'}>
                <Text style={styles.empty}>{t('r') || 'Material group not found'}</Text>
            </ScreenTemplate>
        );
    }

    return (
        <ScreenTemplate title={group.name || t('materialGroup') || 'Material Group'}>

            <View style={styles.container}>

                <View style={{flex: 1}}>
                    {localMaterials && localMaterials.length > 0 ? (
                        <DraggableFlatList
                            data={localMaterials}
                            keyExtractor={(item) => String(item._id ?? item)}
                            renderItem={({item, drag, isActive}: RenderItemParams<any>) => {
                                return (
                                    // open edit modal on press, keep long-press for drag
                                    <TouchableOpacity onLongPress={drag} disabled={isActive} activeOpacity={0.9}
                                                      style={{marginBottom: 8}}>
                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            {/* Delete button moved inside the card container and positioned absolutely at top-left */}
                                            <View style={{flex: 1, position: 'relative'}}>
                                                <TouchableOpacity
                                                    onPress={() => removeMaterialFromGroup(item._id)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        zIndex: 10,
                                                        width: 36,
                                                        height: 36,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: 18,
                                                        backgroundColor: 'rgba(255,255,255,0.9)'
                                                    }}
                                                    accessibilityLabel={t('removeMaterial') || 'Remove material'}
                                                >
                                                    <MaterialIcons name="delete" size={20} color="#d9534f"/>
                                                </TouchableOpacity>

                                                <MaterialListItem onPress={() => openEditModal(item)} item={item}/>
                                            </View>

                                            <TouchableOpacity
                                                onPressIn={drag}
                                                disabled={isActive}
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                accessibilityLabel={t('dragHandle') || 'Drag'}
                                            >
                                                <MaterialIcons name="drag-handle" size={20}
                                                               color={isActive ? '#007AFF' : '#777'}/>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            onDragEnd={onDragEnd}
                            contentContainerStyle={{padding: 16}}
                        />
                    ) : (
                        <View style={{padding: 16}}>
                            <Text style={{color: '#666'}}>{t('noMaterialsData') || 'No materials in this group'}</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity style={styles.addBtn} onPress={openPicker}>
                    <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>

                <Modal visible={pickerVisible} animationType="none" transparent onRequestClose={closePicker}>
                    <TouchableWithoutFeedback onPress={closePicker}>
                        <View style={styles.pickerOverlay}>
                            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                <Animated.View style={[
                                    styles.pickerContainer,
                                    {
                                        opacity: pickerOpacity,
                                        transform: [
                                            { scale: pickerScale },
                                            { translateY: pickerSlide }
                                        ]
                                    }
                                ]}>
                                    {/* Floating bubbles decoration */}
                                    <View style={styles.bubbleDecor1} />
                                    <View style={styles.bubbleDecor2} />
                                    <View style={styles.bubbleDecor3} />

                                    {/* Premium gradient header */}
                                    <LinearGradient
                                        colors={['#667eea', '#764ba2', '#f093fb']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.pickerHeader}
                                    >
                                        <View style={styles.pickerHeaderIcon}>
                                            <Feather name="plus-circle" size={24} color="#fff" />
                                        </View>
                                        <Text style={styles.pickerTitle}>
                                            {t('addMaterialToGroup') || 'Add Material'}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={closePicker}
                                            style={styles.pickerCloseBtn}
                                            accessibilityLabel={t('close') || 'Close'}
                                        >
                                            <LinearGradient
                                                colors={['#fff', '#f5f5f5']}
                                                style={styles.pickerCloseBtnInner}
                                            >
                                                <Feather name="x" size={18} color="#667eea" />
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </LinearGradient>

                                    {/* Search input with icon */}
                                    <View style={styles.pickerSearchContainer}>
                                        <View style={styles.searchIconBox}>
                                            <Feather name="search" size={18} color="#667eea" />
                                        </View>
                                        <TextInput
                                            placeholder={t('searchMaterials') || 'Search materials...'}
                                            value={pickerSearch}
                                            onChangeText={setPickerSearch}
                                            style={styles.pickerSearchInput}
                                            placeholderTextColor="#999"
                                        />
                                        {pickerSearch.length > 0 && (
                                            <TouchableOpacity
                                                onPress={() => setPickerSearch('')}
                                                style={styles.searchClearBtn}
                                            >
                                                <Feather name="x-circle" size={16} color="#999" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Material list */}
                                    <FlatList
                                        data={(allMaterials || []).filter((m: any) => {
                                            const alreadyInGroup = localMaterials.some((lm: any) => String(lm?._id ?? lm) === String(m?._id ?? m));
                                            if (alreadyInGroup) return false;

                                            const q = (pickerSearch || '').trim().toLowerCase();
                                            if (!q) return true;
                                            return (m.name || '').toLowerCase().includes(q) || (m.heName || '').toLowerCase().includes(q);
                                        })}
                                        keyExtractor={(item) => String(item._id)}
                                        renderItem={({item}) => (
                                            <Pressable
                                                style={({ pressed }) => [
                                                    styles.pickerItem,
                                                    pressed && styles.pickerItemPressed
                                                ]}
                                                onPress={() => addMaterialToGroup(item)}
                                            >
                                                <View style={styles.pickerItemContent}>
                                                    <View style={styles.pickerItemTextContainer}>
                                                        <Text style={styles.pickerItemName} numberOfLines={1}>
                                                            {item.name}
                                                        </Text>
                                                        {item.heName && (
                                                            <Text style={styles.pickerItemHeName} numberOfLines={1}>
                                                                {item.heName}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <View style={styles.pickerItemAddBtn}>
                                                        <LinearGradient
                                                            colors={['#667eea', '#764ba2']}
                                                            start={{ x: 0, y: 0 }}
                                                            end={{ x: 1, y: 0 }}
                                                            style={styles.pickerItemAddBtnInner}
                                                        >
                                                            <Feather name="plus" size={16} color="#fff" />
                                                            <Text style={styles.pickerItemAddText}>
                                                                {t('add') || 'Add'}
                                                            </Text>
                                                        </LinearGradient>
                                                    </View>
                                                </View>
                                            </Pressable>
                                        )}
                                        ListEmptyComponent={
                                            <View style={styles.pickerEmptyState}>
                                                <Feather name="inbox" size={48} color="#ddd" />
                                                <Text style={styles.pickerEmptyText}>
                                                    {pickerSearch ? (t('noResults') || 'No materials found') : (t('noMaterialsAvailable') || 'No materials available')}
                                                </Text>
                                            </View>
                                        }
                                        contentContainerStyle={styles.pickerListContent}
                                    />
                                </Animated.View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* Edit material modal using shared MaterialForm component */}
                <MaterialForm
                    visible={editModalVisible}
                    onClose={closeEditModal}
                    initialData={editingMaterial}
                    onUpdate={handleMaterialUpdate}
                    onCreate={createMaterial}
                />

                {isSaving && (
                    <View style={styles.centerOverlay} pointerEvents="none">
                        <ActivityIndicator size="large"/>
                        <Text style={{marginTop: 12}}>{t('saving') || 'Saving...'}</Text>
                    </View>
                )}
            </View>
        </ScreenTemplate>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, paddingTop: 16},
    center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    errorText: {color: 'red', textAlign: 'center', marginTop: 20},
    empty: {textAlign: 'center', color: '#666', marginTop: 24},
    centerOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 60,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)'
    },
    addBtn: {
        position: 'absolute',
        left: 20,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3
    },
    addBtnText: {color: '#fff', fontSize: 32, lineHeight: 34},

    // Modern Picker Modal Styles
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    pickerContainer: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '85%',
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 16,
    },

    // Floating bubble decorations
    bubbleDecor1: {
        position: 'absolute',
        top: 20,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#667eea33',
    },
    bubbleDecor2: {
        position: 'absolute',
        top: 80,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f093fb33',
    },
    bubbleDecor3: {
        position: 'absolute',
        top: 140,
        right: 60,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#764ba233',
    },

    // Header styles
    pickerHeader: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    pickerHeaderIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    pickerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
    },
    pickerCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        marginLeft: 12,
    },
    pickerCloseBtnInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Search input styles
    pickerSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#e9ecef',
    },
    searchIconBox: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerSearchInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        fontSize: 15,
        color: '#333',
    },
    searchClearBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // List styles
    pickerListContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        flexGrow: 1,
    },
    pickerItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    pickerItemPressed: {
        backgroundColor: '#f8f9fa',
        transform: [{ scale: 0.98 }],
    },
    pickerItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    pickerItemTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    pickerItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    pickerItemHeName: {
        fontSize: 13,
        color: '#666',
    },
    pickerItemAddBtn: {
        borderRadius: 8,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    pickerItemAddBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 6,
    },
    pickerItemAddText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },

    // Empty state
    pickerEmptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    pickerEmptyText: {
        marginTop: 16,
        fontSize: 15,
        color: '#999',
        textAlign: 'center',
    },
});
