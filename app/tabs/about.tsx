import { useAuth } from '@/components/AuthContext';
import { useMarkers } from '@/components/MarkersContext';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function AboutScreen() {
  const { token, user, authStatus, authError, login, register, logout } = useAuth();
  const [linkUrl, setLinkUrl] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [proxyStatus, setProxyStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [suggestions, setSuggestions] = useState<Array<{ name: string; placeId: string }>>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [linkStatus, setLinkStatus] = useState<'idle' | 'sending' | 'received' | 'error'>('idle');
  const [linkError, setLinkError] = useState('');
  const { addMarker, refreshMarkers, markers } = useMarkers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'menu' | 'link' | 'search'>('menu');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const apiBase = useMemo(() => process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '', []);
  const proxyBase = useMemo(
    () => process.env.EXPO_PUBLIC_PLACES_PROXY_URL?.trim() ?? apiBase,
    [apiBase]
  );

  const sortedMarkers = useMemo(() => {
    return [...markers].sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (aTime !== bTime) {
        return bTime - aTime;
      }
      const aId = typeof a.id === 'number' ? a.id : Number.parseInt(String(a.id), 10) || 0;
      const bId = typeof b.id === 'number' ? b.id : Number.parseInt(String(b.id), 10) || 0;
      return bId - aId;
    });
  }, [markers]);

  const getCity = (address?: string) => {
    if (!address) {
      return '';
    }
    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    return parts.length >= 2 ? parts[1] : parts[0] || '';
  };

  useEffect(() => {
    if (!proxyBase) {
      setProxyStatus('error');
      return;
    }
    const normalized = proxyBase.replace(/\/$/, '');
    fetch(`${normalized}/api/health`)
      .then((response) => {
        setProxyStatus(response.ok ? 'ok' : 'error');
      })
      .catch(() => {
        setProxyStatus('error');
      });
  }, [proxyBase]);

  useEffect(() => {
    const trimmedQuery = placeQuery.trim();
    if (!proxyBase || trimmedQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const normalized = proxyBase.replace(/\/$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const tokenValue = sessionToken || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        if (!sessionToken) {
          setSessionToken(tokenValue);
        }
        const url = `${normalized}/api/places?query=${encodeURIComponent(
          trimmedQuery
        )}&sessionToken=${encodeURIComponent(tokenValue)}`;
        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();
        if (data.status !== 'OK' || !data.predictions?.length) {
          setSuggestions([]);
          return;
        }
        const nextSuggestions = data.predictions.slice(0, 5).map((result: any) => ({
          name: result.description,
          placeId: result.place_id,
        }));
        setSuggestions(nextSuggestions);
      } catch (error) {
        setSuggestions([]);
      } finally {
        setIsSuggesting(false);
      }
    }, 700);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [placeQuery, proxyBase, sessionToken]);

  const handleLogin = async () => {
    const username = authUsername.trim();
    const password = authPassword.trim();
    if (!username || !password) {
      Alert.alert('Missing credentials', 'Enter a username and password.');
      return;
    }
    const result = await login(username, password);
    if (!result.ok) {
      Alert.alert('Login failed', result.error || 'Unable to log in.');
      return;
    }
    setAuthPassword('');
  };

  const handleRegister = async () => {
    const username = authUsername.trim();
    const password = authPassword.trim();
    if (!username || !password) {
      Alert.alert('Missing credentials', 'Enter a username and password.');
      return;
    }
    const result = await register(username, password);
    if (!result.ok) {
      Alert.alert('Registration failed', result.error || 'Unable to create account.');
      return;
    }
    setAuthPassword('');
  };

  const handleSuggestionPress = async (placeId: string, label: string) => {
    if (!token) {
      Alert.alert('Sign in required', 'Log in to save markers to your account.');
      return;
    }
    if (!proxyBase) {
      Alert.alert('Missing proxy', 'Set EXPO_PUBLIC_PLACES_PROXY_URL to use the Places proxy.');
      return;
    }
    const normalized = proxyBase.replace(/\/$/, '');
    try {
      const tokenValue = sessionToken;
      const tokenParam = tokenValue ? `&sessionToken=${encodeURIComponent(tokenValue)}` : '';
      const url = `${normalized}/api/place-details?placeId=${encodeURIComponent(placeId)}${tokenParam}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status !== 'OK' || !data.result?.geometry?.location) {
        Alert.alert('No results', data.error_message || 'No matching places found.');
        return;
      }
      const location = data.result.geometry.location;
      setPlaceQuery(label);
      setSuggestions([]);
      setSessionToken('');
      addMarker(location.lat, location.lng, label);
      router.push({
        pathname: '/tabs',
        params: { lat: location.lat.toString(), lng: location.lng.toString() },
      });
    } catch (error) {
      Alert.alert('Search failed', 'Unable to reach Google Places right now.');
    }
  };

  const handlePlaceSearch = async () => {
    if (!placeQuery.trim()) {
      Alert.alert('Missing place', 'Enter a place name to search.');
      return;
    }
    if (!token) {
      Alert.alert('Sign in required', 'Log in to save markers to your account.');
      return;
    }

    try {
      let url = '';

      if (proxyBase) {
        const normalized = proxyBase.replace(/\/$/, '');
        url = `${normalized}/api/places?query=${encodeURIComponent(placeQuery.trim())}`;
      } else {
        if (Platform.OS === 'web') {
          Alert.alert(
            'Proxy required',
            'Set EXPO_PUBLIC_PLACES_PROXY_URL so the web app can reach Google Places.'
          );
          return;
        }
        Alert.alert('Missing proxy', 'Set EXPO_PUBLIC_PLACES_PROXY_URL to use the Places proxy.');
        return;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.status !== 'OK' || !data.results?.length) {
        Alert.alert('No results', data.error_message || 'No matching places found.');
        return;
      }
      const location = data.results[0].geometry?.location;
      if (!location) {
        Alert.alert('No location data', 'The place does not include coordinates.');
        return;
      }
      addMarker(location.lat, location.lng, placeQuery.trim());
      router.push({
        pathname: '/tabs',
        params: { lat: location.lat.toString(), lng: location.lng.toString() },
      });
    } catch (error) {
      Alert.alert('Search failed', 'Unable to reach Google Places right now.');
    }
  };

  const handleLinkSubmit = async () => {
    const url = linkUrl.trim();
    if (!url) {
      Alert.alert('Missing link', 'Paste a TikTok or Instagram link.');
      return;
    }
    if (!token) {
      Alert.alert('Sign in required', 'Log in to save markers to your account.');
      return;
    }
    if (!apiBase) {
      Alert.alert('Missing proxy', 'Set EXPO_PUBLIC_API_BASE_URL to use the server.');
      return;
    }

    try {
      setLinkStatus('sending');
      setLinkError('');
      const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      });
      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (error) {
        data = null;
      }
      if (!response.ok) {
        setLinkStatus('error');
        const message = data?.error || text || 'Unable to submit the link.';
        setLinkError(message);
        Alert.alert('Submit failed', message);
        return;
      }
      if (data?.marker?.latitude && data?.marker?.longitude) {
        refreshMarkers();
        router.push({
          pathname: '/tabs',
          params: {
            lat: data.marker.latitude.toString(),
            lng: data.marker.longitude.toString(),
          },
        });
        setLinkStatus('received');
        Alert.alert('Location added', 'We added a location from the link.');
      } else {
        setLinkStatus('received');
        Alert.alert('Link submitted', 'We received the link and will process it.');
      }
      setLinkUrl('');
    } catch (error) {
      setLinkStatus('error');
      setLinkError('Unable to reach the server.');
      Alert.alert('Submit failed', 'Unable to reach the server.');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedMarkers}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.cardRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Add Location</Text>
            <Text style={styles.status}>
              Proxy status: {proxyStatus === 'checking' ? 'checking...' : proxyStatus}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const hasThumbnail = Boolean(item.thumbnailUrl);
          const content = (
            <>
              <View style={styles.cardEmoji}>
                <Text style={styles.cardEmojiText}>{item.emoji || '\u{1F4CD}'}</Text>
              </View>
              <Text style={hasThumbnail ? styles.cardTitleLight : styles.cardTitleDark} numberOfLines={2}>
                {item.name || 'Unknown place'}
              </Text>
              <Text style={hasThumbnail ? styles.cardCityLight : styles.cardCityDark} numberOfLines={1}>
                {getCity(item.address)}
              </Text>
              {item.sourceUrl ? (
                <Text style={hasThumbnail ? styles.cardLinkLight : styles.cardLinkDark} numberOfLines={1}>
                  {item.sourceUrl}
                </Text>
              ) : null}
            </>
          );

          return (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/tabs',
                  params: {
                    lat: item.latitude.toString(),
                    lng: item.longitude.toString(),
                  },
                })
              }
            >
              {hasThumbnail ? (
                <ImageBackground
                  source={{ uri: item.thumbnailUrl }}
                  style={styles.cardImage}
                  imageStyle={styles.cardImageRadius}
                >
                  <View style={styles.cardOverlay}>{content}</View>
                </ImageBackground>
              ) : (
                content
              )}
            </Pressable>
          );
        }}
      />
      <Pressable style={styles.settingsButton} onPress={() => setIsSettingsOpen(true)}>
        <Text style={styles.settingsIcon}>{'\u2699'}</Text>
      </Pressable>
      <Pressable
        style={styles.fab}
        onPress={() => {
          setModalMode('menu');
          setIsModalOpen(true);
        }}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
      <Modal
        animationType="slide"
        transparent
        visible={isSettingsOpen}
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Account</Text>
            <TextInput
              style={styles.input}
              value={authUsername}
              onChangeText={setAuthUsername}
              placeholder="Username"
              placeholderTextColor="#9aa0a6"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={authPassword}
              onChangeText={setAuthPassword}
              placeholder="Password"
              placeholderTextColor="#9aa0a6"
              secureTextEntry
            />
            <View style={styles.authButtons}>
              <Pressable style={styles.buttonCompact} onPress={handleLogin}>
                <Text style={styles.buttonTextDark}>Log in</Text>
              </Pressable>
              <Pressable style={styles.buttonCompact} onPress={handleRegister}>
                <Text style={styles.buttonTextDark}>Register</Text>
              </Pressable>
            </View>
            <View style={styles.authFooter}>
              <Text style={styles.authStatus}>
                {token && user ? `Signed in as ${user.username}` : 'Not signed in'}
              </Text>
              {token ? (
                <Pressable onPress={logout}>
                  <Text style={styles.linkText}>Sign out</Text>
                </Pressable>
              ) : null}
            </View>
            {authStatus === 'error' && authError ? (
              <Text style={styles.authError}>Auth error: {authError}</Text>
            ) : null}
            <Pressable style={styles.modalCancel} onPress={() => setIsSettingsOpen(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent
        visible={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {modalMode === 'menu' ? (
              <>
                <Text style={styles.modalTitle}>Add location</Text>
                <Pressable style={styles.modalOption} onPress={() => setModalMode('link')}>
                  <Text style={styles.modalOptionText}>Paste a link</Text>
                </Pressable>
                <Pressable style={styles.modalOption} onPress={() => setModalMode('search')}>
                  <Text style={styles.modalOptionText}>Search by name</Text>
                </Pressable>
                <Pressable style={styles.modalCancel} onPress={() => setIsModalOpen(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
              </>
            ) : modalMode === 'link' ? (
              <>
                <Text style={styles.modalTitle}>Paste link</Text>
                <TextInput
                  style={styles.input}
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  placeholder="https://www.tiktok.com/@user/video/..."
                  placeholderTextColor="#9aa0a6"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable style={styles.button} onPress={handleLinkSubmit}>
                  <Text style={styles.buttonText}>Send Link</Text>
                </Pressable>
                <Text style={styles.linkStatus}>
                  {linkStatus === 'idle' && 'Status: idle'}
                  {linkStatus === 'sending' && 'Status: sending link...'}
                  {linkStatus === 'received' && 'Status: link received'}
                  {linkStatus === 'error' && `Status: error${linkError ? ` (${linkError})` : ''}`}
                </Text>
                <Pressable style={styles.modalCancel} onPress={() => setModalMode('menu')}>
                  <Text style={styles.modalCancelText}>Back</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Search place</Text>
                <TextInput
                  style={styles.input}
                  value={placeQuery}
                  onChangeText={setPlaceQuery}
                  placeholder="e.g. Pizza Hut Toronto"
                  placeholderTextColor="#9aa0a6"
                  autoCapitalize="none"
                />
                {isSuggesting ? (
                  <Text style={styles.suggestingText}>Searching...</Text>
                ) : (
                  suggestions.length > 0 && (
                    <View style={styles.suggestions}>
                      {suggestions.map((suggestion) => (
                        <Pressable
                          key={suggestion.placeId}
                          style={styles.suggestionItem}
                          onPress={() => handleSuggestionPress(suggestion.placeId, suggestion.name)}
                        >
                          <Text style={styles.suggestionTitle}>{suggestion.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )
                )}
                <Pressable style={styles.button} onPress={handlePlaceSearch}>
                  <Text style={styles.buttonText}>Search Place</Text>
                </Pressable>
                <Pressable style={styles.modalCancel} onPress={() => setModalMode('menu')}>
                  <Text style={styles.modalCancelText}>Back</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'stretch',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    color: '#111',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  status: {
    color: '#333',
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  cardRow: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    height: 160,
    backgroundColor: '#f4f4f4',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  cardImage: {
    flex: 1,
  },
  cardImageRadius: {
    borderRadius: 14,
  },
  cardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    padding: 12,
  },
  cardEmoji: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e6e6e6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardEmojiText: {
    fontSize: 16,
  },
  cardTitleDark: {
    color: '#111',
    fontWeight: '600',
    marginBottom: 6,
  },
  cardTitleLight: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 6,
  },
  cardCityDark: {
    color: '#444',
    fontSize: 12,
  },
  cardCityLight: {
    color: '#e0e0e0',
    fontSize: 12,
  },
  cardLinkDark: {
    color: '#555',
    fontSize: 11,
    marginTop: 8,
  },
  cardLinkLight: {
    color: '#d0d0d0',
    fontSize: 11,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d0d0d0',
    borderWidth: 1,
    borderRadius: 8,
    color: '#111',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestingText: {
    color: '#444',
    marginTop: 8,
  },
  suggestions: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  suggestionTitle: {
    color: '#111',
    fontWeight: '600',
  },
  button: {
    marginTop: 18,
    backgroundColor: '#ffd33d',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  buttonCompact: {
    flex: 1,
    backgroundColor: '#ffd33d',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
  },
  buttonText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  buttonTextDark: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  linkStatus: {
    color: '#444',
    marginTop: 8,
  },
  authButtons: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  authFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  authStatus: {
    color: '#444',
    fontSize: 12,
  },
  authError: {
    color: '#a00000',
    marginBottom: 8,
  },
  linkText: {
    color: '#7a5a00',
    fontSize: 12,
  },
  settingsButton: {
    position: 'absolute',
    top: 44,
    right: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6e6e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    color: '#111',
    fontSize: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffd33d',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: {
    color: '#1a1a1a',
    fontSize: 28,
    fontWeight: '700',
    marginTop: -2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalOption: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  modalOptionText: {
    color: '#111',
    fontWeight: '600',
  },
  modalCancel: {
    marginTop: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#444',
  },
});
