import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMarkers } from '@/components/MarkersContext';

export default function AboutScreen() {
  const [placeQuery, setPlaceQuery] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [proxyStatus, setProxyStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [suggestions, setSuggestions] = useState<Array<{ name: string; placeId: string }>>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const { addMarker } = useMarkers();

  const proxyBase = useMemo(() => process.env.EXPO_PUBLIC_PLACES_PROXY_URL?.trim() ?? '', []);

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
  }, []);

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
        const token = sessionToken || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        if (!sessionToken) {
          setSessionToken(token);
        }
        const url = `${normalized}/api/places?query=${encodeURIComponent(
          trimmedQuery
        )}&sessionToken=${encodeURIComponent(token)}`;
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
  }, [placeQuery, proxyBase]);

  const handleSuggestionPress = async (placeId: string, label: string) => {
    if (!proxyBase) {
      Alert.alert('Missing proxy', 'Set EXPO_PUBLIC_PLACES_PROXY_URL to use the Places proxy.');
      return;
    }
    const normalized = proxyBase.replace(/\/$/, '');
    try {
      const token = sessionToken;
      const tokenParam = token ? `&sessionToken=${encodeURIComponent(token)}` : '';
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
      addMarker(location.lat, location.lng, placeQuery.trim());
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
      addMarker(location.lat, location.lng, label);
      router.push({
        pathname: '/tabs',
        params: { lat: location.lat.toString(), lng: location.lng.toString() },
      });
    } catch (error) {
      Alert.alert('Search failed', 'Unable to reach Google Places right now.');
    }
  };

  const handleSubmit = () => {
    const lat = Number.parseFloat(latitude.trim());
    const lng = Number.parseFloat(longitude.trim());

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert('Invalid coordinates', 'Enter valid numbers for latitude and longitude.');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Out of range', 'Latitude must be between -90 and 90, longitude between -180 and 180.');
      return;
    }

    addMarker(lat, lng);
    router.push({ pathname: '/tabs', params: { lat: lat.toString(), lng: lng.toString() } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Location</Text>
      <Text style={styles.status}>
        Proxy status: {proxyStatus === 'checking' ? 'checking…' : proxyStatus}
      </Text>
      <View style={styles.form}>
        <Text style={styles.label}>Place name</Text>
        <TextInput
          style={styles.input}
          value={placeQuery}
          onChangeText={setPlaceQuery}
          placeholder="e.g. Pizza Hut Toronto"
          placeholderTextColor="#9aa0a6"
          autoCapitalize="none"
        />
        {isSuggesting ? (
          <Text style={styles.suggestingText}>Searching…</Text>
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
        <Text style={styles.orDivider}>Or enter coordinates</Text>
        <Text style={styles.label}>Latitude</Text>
        <TextInput
          style={styles.input}
          value={latitude}
          onChangeText={setLatitude}
          keyboardType="decimal-pad"
          placeholder="43.6532"
          placeholderTextColor="#9aa0a6"
        />
        <Text style={styles.label}>Longitude</Text>
        <TextInput
          style={styles.input}
          value={longitude}
          onChangeText={setLongitude}
          keyboardType="decimal-pad"
          placeholder="-79.3832"
          placeholderTextColor="#9aa0a6"
        />
        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Show on Map</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  status: {
    color: '#b3b8bf',
    marginBottom: 12,
  },
  form: {
    width: '100%',
    maxWidth: 360,
  },
  label: {
    color: '#fff',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1f2328',
    borderColor: '#3a3f45',
    borderWidth: 1,
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestingText: {
    color: '#b3b8bf',
    marginTop: 8,
  },
  suggestions: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3f45',
    backgroundColor: '#171a1f',
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f35',
  },
  suggestionTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    marginTop: 18,
    backgroundColor: '#ffd33d',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  orDivider: {
    color: '#b3b8bf',
    marginTop: 16,
  },
  buttonText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
});
