import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTaskGroups } from '@/hooks/use-task-groups';
import { useTranslation } from './_i18n';
import { Link } from 'expo-router';
import Header from './components/header';

export default function TaskGroupsScreen() {
  const { t } = useTranslation();
  const { taskGroups, isLoading, error, remove } = useTaskGroups();

  const confirmDelete = (id: string, name?: string) => {
    Alert.alert(
      t('delete') || 'Delete',
      (t('deleteConfirm') || 'Are you sure you want to delete this item?') + (name ? `\n${name}` : ''),
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { text: t('delete') || 'Delete', style: 'destructive', onPress: async () => { await remove(id); } },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title={t('taskGroups') || 'Task Groups'} />

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={taskGroups}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Link style={{flexDirection: 'row-reverse'}} href={`./task-groups/${item._id}`} asChild>
              <TouchableOpacity onLongPress={() => confirmDelete(item._id, item.name)} style={styles.itemContainer}>
                <Text style={styles.itemText}>{item.name}</Text>
              </TouchableOpacity>
            </Link>
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={<Text style={styles.empty}>{t('noTaskGroups') || 'No task groups yet'}</Text>}
        />
      )}

      <Link href={{
          pathname: '/task-groups/[id]',
          params: { id: 'new' }
      }} asChild>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
  },
  itemContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 16,
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
    elevation: 3,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 34,
  },
});
