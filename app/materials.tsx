import React, {useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput} from 'react-native';
import MaterialListItem from '@/components/material/material-list-item';
import MaterialForm from '@/components/material/material-form';
import {useMaterials} from '@/hooks/use-materials';
import {useTranslation} from './_i18n';
import {useAuth} from '@/hooks/use-auth';
import Header from './components/header';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {ScreenTemplate} from "@/components/ScreenTemplate";

export default function MaterialsScreen() {
    const {t} = useTranslation();
    const {materials, isLoading, error, create, update, remove} = useMaterials();
    const {user} = useAuth();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
    const [search, setSearch] = useState('');

    // RTL forced on
    const isRTL = true;

    const handleCreate = async (data: any) => {
        return create(data);
    };

    const handleUpdate = async (id: string, data: any) => {
        return update(id, data);
    };

    // Accept optional id and bail out early if missing to satisfy TypeScript strictness.
    const confirmDelete = (id?: string, name?: string) => {
        if (!id) return;
        Alert.alert(
            t('delete') || 'Delete',
            (t('deleteConfirm') || 'Are you sure you want to delete this item?') + (name ? `\n${name}` : ''),
            [
                {text: t('cancel') || 'Cancel', style: 'cancel'},
                {
                    text: t('delete') || 'Delete', style: 'destructive', onPress: async () => {
                        await remove(id);
                    }
                },
            ]
        );
    };

    // Premium palette
    const premiumColors = {
        backgroundGradient: ['#0f2027', '#203a43', '#2c5364'] as const,
        cardBg: '#ffffffee',
        accent: '#0a7ea4',
        fabGradient: ['#0ea5e9', '#0a7ea4'] as const,
        textPrimary: '#F8FAFC',
        textSecondary: '#CBD5E0',
        searchBg: '#ffffff14',
    };

    return (
        <ScreenTemplate showSearchBar={true} searchQuery={search} onSearchChange={setSearch} title={t('materialsManagement') || 'Materials'}>
            <LinearGradient colors={['#FFFFFF', ...premiumColors.fabGradient, premiumColors.textSecondary]} style={styles.gradient}>
                <View style={styles.container}>
                    {isLoading ? (
                        <ActivityIndicator size="large" color={premiumColors.accent}/>
                    ) : error ? (
                        <Text style={[styles.errorText, isRTL ? styles.textRight : null]}>{error}</Text>
                    ) : (
                        <FlatList
                            data={materials.filter(m => {
                                const s = search.trim().toLowerCase();
                                if (!s) return true;
                                return (m.name || '').toLowerCase().includes(s) || (m.heName || '').toLowerCase().includes(s);
                            })}
                            keyExtractor={(item) => item._id ?? item.name}
                            renderItem={({item}) => (
                                <View style={styles.itemCard}>
                                    <MaterialListItem
                                        item={item}
                                        onPress={() => {
                                            setSelectedMaterial(item);
                                            setIsModalVisible(true);
                                        }}
                                        onLongPress={user?.role === 'admin' ? () => confirmDelete(item._id, item.name) : undefined}
                                    />
                                </View>
                            )}
                            contentContainerStyle={{paddingBottom: 140}}
                            ListEmptyComponent={<Text
                                style={[styles.empty, isRTL ? styles.textRight : null]}>{t('noMaterialsData') || 'No materials yet'}</Text>}
                        />
                    )}

                    <TouchableOpacity style={[styles.addBtn, isRTL ? styles.addBtnRTL : null]} onPress={() => {
                        setSelectedMaterial(null);
                        setIsModalVisible(true);
                    }} activeOpacity={0.9}>
                        <LinearGradient colors={premiumColors.fabGradient} style={styles.addBtnGradient}
                                        start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                            <Ionicons name="add" size={28} color="#fff"/>
                        </LinearGradient>
                    </TouchableOpacity>

                    <MaterialForm
                        visible={isModalVisible}
                        onClose={() => {
                            setIsModalVisible(false);
                            setSelectedMaterial(null);
                        }}
                        onCreate={handleCreate}
                        initialData={selectedMaterial}
                        onUpdate={handleUpdate}
                    />
                </View>
            </LinearGradient>
        </ScreenTemplate>
    );
}

const styles = StyleSheet.create({
    gradient: {flex: 1},
    container: {flex: 1, padding: 16},
    title: {fontSize: 22, fontWeight: '600', marginBottom: 12, textAlign: 'center', color: '#F8FAFC'},
    addBtn: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#0a7ea4',
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: {width: 0, height: 6}
    },
    addBtnGradient: {width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 32},
    // mirrored add button for RTL
    addBtnRTL: {left: 20, right: undefined},
    addBtnText: {color: '#fff', fontSize: 32, lineHeight: 34},
    empty: {textAlign: 'center', color: '#CBD5E0', marginTop: 24},
    errorText: {color: '#FED7D7', textAlign: 'center', marginTop: 20},
    // helper text align for RTL
    textRight: {textAlign: 'right'},
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#E2E8F0',
        marginBottom: 6,
        textAlign: 'right',
        alignSelf: 'flex-end',
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10
    },
    searchIcon: {marginHorizontal: 6},
    searchInput: {
        flex: 1,
        borderWidth: 0,
        borderColor: 'transparent',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 8,
        fontSize: 16,
        color: '#E2E8F0',
        backgroundColor: 'transparent',
    },
    clearBtn: {paddingHorizontal: 8},
    itemCard: {
        backgroundColor: '#ffffffee',
        borderRadius: 14,
        padding: 8,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 4},
        elevation: 3
    },
    // search styles
    searchInputOld: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: '#f9fafb',
        marginBottom: 2,
    },
    searchShadow: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 40,
        height: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: {width: 0, height: 2},
    },
});
