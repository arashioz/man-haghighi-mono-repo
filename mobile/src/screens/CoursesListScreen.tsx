import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import * as coursesApi from '../api/courses';
import type { Course } from '../types';

const DEFAULT_IMAGE = 'https://via.placeholder.com/120x80/1a1a1a/666?text=دوره';

export default function CoursesListScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const list = await coursesApi.getMyCourses();
      setCourses(list);
    } catch (e: any) {
      setError(e.response?.data?.message || 'خطا در بارگذاری دوره‌ها');
      setCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderItem = ({ item }: { item: Course }) => {
    const videoCount = item.videos?.length ?? 0;
    const audioCount = item.audios?.length ?? 0;
    const thumb = item.thumbnail || DEFAULT_IMAGE;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CourseDetail', { course: item })}
        activeOpacity={0.8}
      >
        <Image source={{ uri: thumb }} style={styles.thumb} />
        <View style={styles.cardBody}>
          <Text style={styles.courseTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.meta}>
            {videoCount > 0 && `${videoCount} ویدیو`}
            {videoCount > 0 && audioCount > 0 && ' · '}
            {audioCount > 0 && `${audioCount} صوتی`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && courses.length === 0) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.centeredText}>در حال بارگذاری...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>دوره‌های من</Text>
        <Text style={styles.headerSub}>{user?.firstName || user?.username || 'کاربر'}</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>خروج از حساب</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#facc15" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>دوره‌ای ثبت نشده است.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  centeredText: { color: '#888', marginTop: 12 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 14, color: '#888', marginTop: 4 },
  logoutBtn: { marginTop: 8, alignSelf: 'flex-start' },
  logoutText: { color: '#facc15', fontSize: 14 },
  errorBox: { padding: 16, backgroundColor: '#2a1515' },
  errorText: { color: '#f87171', textAlign: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  thumb: { width: 120, height: 80, backgroundColor: '#222' },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  courseTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  meta: { color: '#888', fontSize: 12, marginTop: 4 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 16 },
});
