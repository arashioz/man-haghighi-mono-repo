import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import * as coursesApi from '../api/courses';
import type { Course, Video as VideoType, Audio as AudioType } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ListItem = { type: 'video'; data: VideoType } | { type: 'audio'; data: AudioType };

export default function CourseDetailScreen({ route, navigation }: any) {
  const { course } = route.params as { course: Course };
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'audio' | null>(null);
  const [mediaTitle, setMediaTitle] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const videos = course.videos ?? [];
  const audios = course.audios ?? [];
  const sections: { title: string; data: ListItem[] }[] = [];
  if (videos.length) {
    sections.push({
      title: `ویدیوها (${videos.length})`,
      data: videos.map((v) => ({ type: 'video' as const, data: v })),
    });
  }
  if (audios.length) {
    sections.push({
      title: `فایل‌های صوتی (${audios.length})`,
      data: audios.map((a) => ({ type: 'audio' as const, data: a })),
    });
  }

  const openVideo = async (v: VideoType) => {
    setLoadingUrl(true);
    setMediaTitle(v.title);
    setMediaType('video');
    setStreamUrl(null);
    try {
      const url = await coursesApi.getVideoStreamUrl(v.id);
      setStreamUrl(url);
    } catch {
      setMediaType(null);
      setMediaTitle('');
    } finally {
      setLoadingUrl(false);
    }
  };

  const openAudio = async (a: AudioType) => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setLoadingUrl(true);
    setMediaTitle(a.title);
    setMediaType('audio');
    setStreamUrl(null);
    try {
      const url = await coursesApi.getAudioStreamUrl(a.id);
      setStreamUrl(url);
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (status?.isLoaded && status.didJustFinishAndNotLoop) {
            setPlaying(false);
          }
        }
      );
      setSound(s);
      setPlaying(true);
    } catch {
      setMediaType(null);
      setMediaTitle('');
    } finally {
      setLoadingUrl(false);
    }
  };

  const closeModal = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setMediaType(null);
    setStreamUrl(null);
    setMediaTitle('');
    setPlaying(false);
  };

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'video') {
      const v = item.data;
      return (
        <TouchableOpacity
          style={styles.row}
          onPress={() => openVideo(v)}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>▶</Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={2}>{v.title}</Text>
            {v.duration != null && (
              <Text style={styles.duration}>{Math.floor(v.duration / 60)} دقیقه</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    }
    const a = item.data;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openAudio(a)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, styles.iconWrapAudio]}>
          <Text style={styles.icon}>♪</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={2}>{a.title}</Text>
          {a.duration != null && (
            <Text style={styles.duration}>{Math.floor(a.duration / 60)} دقیقه</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← بازگشت</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>{course.title}</Text>
      </View>

      {loadingUrl && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>در حال بارگذاری...</Text>
        </View>
      )}

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>ویدیو یا فایل صوتی در این دوره نیست.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.type}-${item.data.id}`}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}

      <Modal visible={mediaType === 'video' && !!streamUrl} animationType="slide">
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalClose} onPress={closeModal}>
            <Text style={styles.modalCloseText}>بستن</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>{mediaTitle}</Text>
          {streamUrl && (
            <Video
              source={{ uri: streamUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {}}
              shouldPlay
            />
          )}
        </View>
      </Modal>

      <Modal visible={mediaType === 'audio' && !!streamUrl} transparent animationType="slide">
        <View style={styles.audioModal}>
          <View style={styles.audioCard}>
            <Text style={styles.audioTitle} numberOfLines={2}>{mediaTitle}</Text>
            <View style={styles.audioControls}>
              <TouchableOpacity
                onPress={async () => {
                  if (sound) {
                    const st = await sound.getStatusAsync();
                    if (st?.isLoaded && st.isPlaying) {
                      await sound.pauseAsync();
                      setPlaying(false);
                    } else {
                      await sound.playAsync();
                      setPlaying(true);
                    }
                  }
                }}
                style={styles.playBtn}
              >
                <Text style={styles.playBtnText}>{playing ? '⏸ توقف' : '▶ پخش'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={closeModal} style={styles.audioClose}>
              <Text style={styles.audioCloseText}>بستن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#facc15', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },
  loadingText: { color: '#fff', marginTop: 12 },
  list: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#facc15',
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#eab308',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  iconWrapAudio: { backgroundColor: '#0ea5e9' },
  icon: { color: '#000', fontSize: 18, fontWeight: '700' },
  rowBody: { flex: 1 },
  rowTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
  duration: { color: '#888', fontSize: 12, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#666', fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalClose: { position: 'absolute', top: 56, right: 16, zIndex: 2 },
  modalCloseText: { color: '#fff', fontSize: 16 },
  modalTitle: { position: 'absolute', top: 56, left: 16, right: 60, color: '#fff', fontSize: 14, zIndex: 2 },
  video: { flex: 1, width: SCREEN_WIDTH, marginTop: 100 },
  audioModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  audioCard: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  audioTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 20 },
  audioControls: { alignItems: 'center', marginVertical: 12 },
  playBtn: {
    backgroundColor: '#eab308',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  playBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },
  audioClose: { marginTop: 16, alignItems: 'center' },
  audioCloseText: { color: '#888', fontSize: 16 },
});
