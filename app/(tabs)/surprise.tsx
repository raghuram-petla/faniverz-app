import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors } from '@/theme/colors';
import { useSurpriseContent } from '@/features/surprise/hooks';
import { SurpriseCategory, SurpriseContent } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 16) / 2;
const VIDEO_WIDTH = SCREEN_WIDTH - 32; // 16px margin each side
const VIDEO_HEIGHT = Math.round((VIDEO_WIDTH * 9) / 16);

type FilterOption = 'all' | SurpriseCategory;

interface PillConfig {
  label: string;
  value: FilterOption;
  activeColor: string;
}

const PILLS: PillConfig[] = [
  { label: 'All', value: 'all', activeColor: colors.red600 },
  { label: 'Songs', value: 'song', activeColor: colors.purple600 },
  { label: 'Short Films', value: 'short-film', activeColor: colors.blue600 },
  { label: 'BTS', value: 'bts', activeColor: colors.green500 },
  { label: 'Interviews', value: 'interview', activeColor: colors.orange500 },
];

const CARD_GRADIENTS: string[] = [
  '#1e1b4b', // indigo-950
  '#1a0533', // deep purple
  '#0a1628', // dark navy
  '#0f2a0f', // dark green
  '#2a0a0a', // dark red
  '#1a1a0a', // dark amber
  '#0a1a2a', // dark blue
  '#1a0a1a', // dark magenta
];

function getCategoryColor(category: SurpriseCategory): string {
  switch (category) {
    case 'song':
      return colors.purple600;
    case 'short-film':
      return colors.blue600;
    case 'bts':
      return colors.green500;
    case 'interview':
      return colors.orange500;
    default:
      return colors.red600;
  }
}

function getCategoryLabel(category: SurpriseCategory): string {
  switch (category) {
    case 'song':
      return 'Song';
    case 'short-film':
      return 'Short Film';
    case 'bts':
      return 'BTS';
    case 'interview':
      return 'Interview';
    case 'trailer':
      return 'Trailer';
    default:
      return category;
  }
}

function getCategoryIconName(
  category: SurpriseCategory,
): React.ComponentProps<typeof Ionicons>['name'] {
  switch (category) {
    case 'song':
      return 'musical-notes';
    case 'short-film':
      return 'film';
    case 'bts':
      return 'videocam';
    case 'interview':
      return 'mic';
    case 'trailer':
      return 'play-circle';
    default:
      return 'play';
  }
}

function formatViews(views: number): string {
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(0)}K`;
  }
  return String(views);
}

interface FeaturedVideoProps {
  item: SurpriseContent;
}

const FEATURED_VIDEO_ID = 'roYRXbhxhlM';
const THUMBNAIL_URL = `https://img.youtube.com/vi/${FEATURED_VIDEO_ID}/hqdefault.jpg`;
const CONTROLS_HEIGHT = 36;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// YouTube IFrame API — controls=0 hides YouTube UI, we draw our own controls in RN
const VIDEO_HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0}body{background:#000;overflow:hidden}
#player,#player iframe{width:100%!important;height:100%!important;position:absolute;top:0;left:0}
#overlay{position:absolute;top:0;left:0;width:100%;height:100%;z-index:999}</style>
</head><body>
<div id="player"></div><div id="overlay"></div>
<script>
var tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';
document.head.appendChild(tag);var player;
function onYouTubeIframeAPIReady(){
  player=new YT.Player('player',{
    videoId:'${FEATURED_VIDEO_ID}',
    playerVars:{autoplay:1,playsinline:1,controls:0,rel:0,modestbranding:1,iv_load_policy:3,fs:1,disablekb:1,showinfo:0},
    events:{
      onReady:function(e){
        e.target.playVideo();
        var iframe=e.target.getIframe();
        iframe.setAttribute('allowfullscreen','');
        iframe.setAttribute('webkitallowfullscreen','');
      },
      onStateChange:function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'state',state:e.data}))}
    }
  });
  setInterval(function(){
    if(player&&player.getCurrentTime&&player.getDuration){
      var c=player.getCurrentTime(),d=player.getDuration();
      if(d>0)window.ReactNativeWebView.postMessage(JSON.stringify({type:'time',current:c,duration:d}));
    }
  },500);
}
function seekTo(t){if(player)player.seekTo(t,true);}
</script></body></html>`;

function getFullscreenHtml(startAt: number): string {
  return VIDEO_HTML.replace('showinfo:0}', `showinfo:0,start:${Math.floor(startAt)}}`);
}

function FeaturedVideo({ item }: FeaturedVideoProps) {
  const catColor = getCategoryColor(item.category);
  const catLabel = getCategoryLabel(item.category);
  const iconName = getCategoryIconName(item.category);
  const [activated, setActivated] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenHtml, setFullscreenHtml] = useState('');
  const webViewRef = useRef<WebView>(null);
  const fullscreenWebViewRef = useRef<WebView>(null);
  const isFullscreenRef = useRef(false);
  const isSeekingRef = useRef(false);
  const seekTimeRef = useRef(0);
  const seekBarWidthRef = useRef(0);
  const progressRef = useRef(0);

  const handlePlay = useCallback(() => {
    setActivated(true);
  }, []);

  const togglePlayPause = useCallback(() => {
    const ref = isFullscreenRef.current ? fullscreenWebViewRef : webViewRef;
    ref.current?.injectJavaScript(
      `if(player){var s=player.getPlayerState();if(s===1)player.pauseVideo();else player.playVideo();}true;`,
    );
  }, []);

  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'state') {
        setPlaying(msg.state === 1 || msg.state === 3);
      } else if (msg.type === 'time' && !isSeekingRef.current) {
        progressRef.current = msg.current;
        setProgress(msg.current);
        setDuration(msg.duration);
      }
    } catch {
      /* ignore non-JSON messages */
    }
  }, []);

  const onFullscreenMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'state') {
        setPlaying(msg.state === 1 || msg.state === 3);
      } else if (msg.type === 'time' && !isSeekingRef.current) {
        progressRef.current = msg.current;
        setProgress(msg.current);
        setDuration(msg.duration);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSeekLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    seekBarWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  const handleSeekStart = useCallback(
    (e: GestureResponderEvent) => {
      isSeekingRef.current = true;
      const w = seekBarWidthRef.current || 1;
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / w));
      seekTimeRef.current = ratio * duration;
      setProgress(seekTimeRef.current);
    },
    [duration],
  );

  const handleSeekMove = useCallback(
    (e: GestureResponderEvent) => {
      const w = seekBarWidthRef.current || 1;
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / w));
      seekTimeRef.current = ratio * duration;
      setProgress(seekTimeRef.current);
    },
    [duration],
  );

  const handleSeekEnd = useCallback(() => {
    const ref = isFullscreenRef.current ? fullscreenWebViewRef : webViewRef;
    ref.current?.injectJavaScript(`seekTo(${seekTimeRef.current});true;`);
    isSeekingRef.current = false;
  }, []);

  const enterFullscreen = useCallback(() => {
    webViewRef.current?.injectJavaScript(`if(player)player.pauseVideo();true;`);
    setFullscreenHtml(getFullscreenHtml(progressRef.current));
    isFullscreenRef.current = true;
    setIsFullscreen(true);
  }, []);

  const exitFullscreen = useCallback(() => {
    const t = progressRef.current;
    isFullscreenRef.current = false;
    setIsFullscreen(false);
    setTimeout(() => {
      webViewRef.current?.injectJavaScript(`seekTo(${t});if(player)player.playVideo();true;`);
    }, 500);
  }, []);

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={styles.featuredContainer}>
      <View style={styles.featuredVideoBox}>
        {!activated ? (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            onPress={handlePlay}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Play video"
          >
            <Image
              source={{ uri: THUMBNAIL_URL }}
              style={styles.thumbnailImage}
              contentFit="cover"
            />
            <View style={styles.thumbnailPlayBtn}>
              <Ionicons name="play" size={28} color={colors.white} style={styles.playIcon} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.videoPlayer}>
            <WebView
              ref={webViewRef}
              source={{ html: VIDEO_HTML, baseUrl: 'https://example.com' }}
              style={StyleSheet.absoluteFill}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              originWhitelist={['*']}
              scrollEnabled={false}
              bounces={false}
              javaScriptEnabled
              onMessage={onMessage}
            />
            {/* Tap area for play/pause — stops above controls bar */}
            <TouchableOpacity
              style={styles.playerTapOverlay}
              onPress={togglePlayPause}
              activeOpacity={1}
            />
            {/* Controls bar */}
            <View style={styles.controlsBar}>
              <TouchableOpacity
                onPress={togglePlayPause}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={playing ? 'pause' : 'play'} size={18} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.timeText}>{formatTime(progress)}</Text>
              {/* Seekable progress bar */}
              <View
                style={styles.seekBarContainer}
                onLayout={handleSeekLayout}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleSeekStart}
                onResponderMove={handleSeekMove}
                onResponderRelease={handleSeekEnd}
                onResponderTerminate={handleSeekEnd}
              >
                <View style={styles.seekBarTrack}>
                  <View style={[styles.seekBarFill, { width: `${progressPct}%` }]} />
                  <View style={[styles.seekBarThumb, { left: `${progressPct}%` }]} />
                </View>
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
              <TouchableOpacity
                onPress={enterFullscreen}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="expand" size={18} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Fullscreen Modal */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}
        statusBarTranslucent
      >
        <View style={styles.fullscreenContainer}>
          <View style={styles.fullscreenRotated}>
            <WebView
              ref={fullscreenWebViewRef}
              source={{ html: fullscreenHtml, baseUrl: 'https://example.com' }}
              style={StyleSheet.absoluteFill}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              originWhitelist={['*']}
              scrollEnabled={false}
              bounces={false}
              javaScriptEnabled
              onMessage={onFullscreenMessage}
            />
            {/* Tap to play/pause in fullscreen */}
            <TouchableOpacity
              style={styles.fullscreenTapArea}
              onPress={togglePlayPause}
              activeOpacity={1}
            />
            {/* Fullscreen controls */}
            <View style={styles.fullscreenControlsBar}>
              <TouchableOpacity
                onPress={togglePlayPause}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={playing ? 'pause' : 'play'} size={20} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.timeText}>{formatTime(progress)}</Text>
              <View
                style={styles.seekBarContainer}
                onLayout={handleSeekLayout}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleSeekStart}
                onResponderMove={handleSeekMove}
                onResponderRelease={handleSeekEnd}
                onResponderTerminate={handleSeekEnd}
              >
                <View style={styles.seekBarTrack}>
                  <View style={[styles.seekBarFill, { width: `${progressPct}%` }]} />
                  <View style={[styles.seekBarThumb, { left: `${progressPct}%` }]} />
                </View>
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
              <TouchableOpacity
                onPress={exitFullscreen}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="contract" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Meta */}
      <View style={styles.featuredMeta}>
        <View style={styles.featuredBadgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: catColor }]}>
            <Ionicons name={iconName} size={11} color={colors.white} />
            <Text style={styles.categoryBadgeText}>{catLabel.toUpperCase()}</Text>
          </View>
          {item.duration ? <Text style={styles.featuredDuration}>{item.duration}</Text> : null}
          <Text style={styles.featuredViews}>{formatViews(item.views)} views</Text>
        </View>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.featuredDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

interface ContentCardProps {
  item: SurpriseContent;
  index: number;
}

function ContentCard({ item, index }: ContentCardProps) {
  const catColor = getCategoryColor(item.category);
  const iconName = getCategoryIconName(item.category);
  const bgColor = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Play ${item.title}`}
    >
      {/* Thumbnail placeholder */}
      <View style={[styles.cardThumb, { backgroundColor: bgColor }]}>
        {/* Play button overlay */}
        <View style={styles.cardPlayBtn}>
          <Ionicons name="play" size={20} color={colors.white} style={styles.playIcon} />
        </View>

        {/* Category badge — top left */}
        <View style={[styles.cardCategoryBadge, { backgroundColor: catColor }]}>
          <Ionicons name={iconName} size={10} color={colors.white} />
        </View>

        {/* Duration — bottom right */}
        {item.duration ? (
          <View style={styles.cardDurationBadge}>
            <Text style={styles.cardDurationText}>{item.duration}</Text>
          </View>
        ) : null}
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cardViews}>{formatViews(item.views)} views</Text>
      </View>
    </TouchableOpacity>
  );
}

interface FunFactBoxProps {
  fact: string;
}

function FunFactBox({ fact }: FunFactBoxProps) {
  return (
    <View style={styles.funFact}>
      <Ionicons name="sparkles" size={20} color={colors.white} style={styles.funFactIcon} />
      <View style={styles.funFactTextBlock}>
        <Text style={styles.funFactHeading}>Did you know?</Text>
        <Text style={styles.funFactBody}>{fact}</Text>
      </View>
    </View>
  );
}

const FUN_FACT =
  "This section features rare content you won't find on regular streaming platforms — from unreleased songs to exclusive behind-the-scenes footage!";

export default function SurpriseScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterOption>('all');

  const category = filter === 'all' ? undefined : filter;
  const { data: items = [], isLoading } = useSurpriseContent(category);

  const featured = items[0] ?? null;
  const gridItems = items.slice(1);

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerIconBadge}>
          <Ionicons name="sparkles" size={20} color={colors.white} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Surprise Content</Text>
          <Text style={styles.headerSubtitle}>Exclusive &amp; Hidden Gems</Text>
        </View>
      </View>

      {/* ── Category pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillScroll}
        contentContainerStyle={styles.pillScrollContent}
      >
        {PILLS.map((pill) => {
          const active = filter === pill.value;
          return (
            <TouchableOpacity
              key={pill.value}
              style={[
                styles.pill,
                active
                  ? { backgroundColor: pill.activeColor, borderColor: pill.activeColor }
                  : styles.pillInactive,
              ]}
              onPress={() => setFilter(pill.value)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter by ${pill.label}`}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{pill.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Main scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            {/* Featured video */}
            {featured ? <FeaturedVideo item={featured} /> : null}

            {/* Content grid */}
            {gridItems.length > 0 ? (
              <View style={styles.grid}>
                {gridItems.map((item, idx) => (
                  <ContentCard key={item.id} item={item} index={idx} />
                ))}
              </View>
            ) : null}

            {/* Fun Fact */}
            <FunFactBox fact={FUN_FACT} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.black95,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.purple600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.white60,
    marginTop: 1,
  },

  // ── Pills ────────────────────────────────────────────────────────────────────
  pillScroll: {
    flexGrow: 0,
    backgroundColor: colors.black95,
  },
  pillScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillInactive: {
    backgroundColor: colors.white5,
    borderColor: colors.white20,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white60,
  },
  pillTextActive: {
    color: colors.white,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    gap: 24,
  },
  loadingContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white60,
    fontSize: 15,
  },

  // ── Featured video ────────────────────────────────────────────────────────────
  featuredContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.white5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredVideoBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.white5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Thumbnail (pre-play) ──
  thumbnailContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    ...StyleSheet.absoluteFillObject,
  },
  thumbnailPlayBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.red600,
    alignItems: 'center',
    justifyContent: 'center',
    // Slight shadow for contrast on thumbnails
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  playIcon: {
    marginLeft: 3,
  },
  videoPlayer: {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
  },
  playerTapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: CONTROLS_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  overlayPlayBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CONTROLS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 3,
  },
  timeText: {
    fontSize: 11,
    color: colors.white,
    fontVariant: ['tabular-nums'],
    minWidth: 32,
  },
  seekBarContainer: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  seekBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
  },
  seekBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: colors.red600,
    borderRadius: 1.5,
  },
  seekBarThumb: {
    position: 'absolute',
    top: -5,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: colors.red600,
    marginLeft: -6.5,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenRotated: {
    width: SCREEN_HEIGHT,
    height: SCREEN_WIDTH,
    transform: [{ rotate: '90deg' }],
  },
  fullscreenTapArea: {
    ...StyleSheet.absoluteFillObject,
    bottom: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  fullscreenControlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 3,
  },
  featuredMeta: {
    padding: 14,
    gap: 6,
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  featuredDuration: {
    fontSize: 12,
    color: colors.white60,
  },
  featuredViews: {
    fontSize: 12,
    color: colors.white60,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 22,
  },
  featuredDesc: {
    fontSize: 13,
    color: colors.white60,
    lineHeight: 18,
  },

  // ── Grid ─────────────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.white5,
  },
  cardThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPlayBtn: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(220, 38, 38, 0.80)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDurationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: colors.black80,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardDurationText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  cardBody: {
    padding: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 18,
  },
  cardViews: {
    fontSize: 11,
    color: colors.white40,
  },

  // ── Fun Fact ──────────────────────────────────────────────────────────────────
  funFact: {
    marginHorizontal: 16,
    backgroundColor: colors.purple600,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  funFactIcon: {
    marginTop: 1,
  },
  funFactTextBlock: {
    flex: 1,
    gap: 4,
  },
  funFactHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  funFactBody: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
});
