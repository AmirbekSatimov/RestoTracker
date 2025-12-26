import React, { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import AppMapView from '@/components/MapView';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useMarkers } from '@/components/MarkersContext';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const DEFAULT_LATITUDE = 43.6532;
const DEFAULT_LONGITUDE = -79.3832;

// persistent key
const LOCATION_STORAGE_KEY = 'rt_location_text_v1';

function parseCoord(value: string | string[] | undefined, fallback: number) {
  if (Array.isArray(value)) value = value[0];
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function Index() {
  const { lat, lng } = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const latitude = parseCoord(lat, DEFAULT_LATITUDE);
  const longitude = parseCoord(lng, DEFAULT_LONGITUDE);
  const { markers } = useMarkers();

  const insets = useSafeAreaInsets();

  // location input state (persisted)
  const [locationText, setLocationText] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(LOCATION_STORAGE_KEY);
        if (saved != null) setLocationText(saved);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  
    saveTimer.current = setTimeout(async () => {
      try {
        if (locationText.trim().length === 0) {
          await SecureStore.deleteItemAsync(LOCATION_STORAGE_KEY);
        } else {
          await SecureStore.setItemAsync(LOCATION_STORAGE_KEY, locationText.trim());
        }
      } catch {
        // ignore
      }
    }, 250);
  
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [locationText]);


  return (
    <View style={styles.container}>
      <AppMapView latitude={latitude} longitude={longitude} markers={markers} />

      {/* Aesthetic location bar (persists) */}
      <View style={[styles.topOverlay, { top: insets.top + 10 }]}>
        <View style={styles.locationBar}>
          <Ionicons
            name="location-outline"
            size={18}
            color="rgba(255,255,255,0.92)"
            style={{ marginRight: 10 }}
          />

          <TextInput
            value={locationText}
            onChangeText={setLocationText}
            placeholder="Where are you?"
            placeholderTextColor="rgba(255,255,255,0.55)"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            style={styles.locationInput}
          />

          {locationText.trim().length > 0 ? (
            <Text onPress={() => setLocationText('')} style={styles.clear}>
              Clear
            </Text>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
      </View>

      {/* Debug panel (moved below the location bar so it doesn't overlap) */}
      <View style={[styles.debugPanel, { top: insets.top + 68 }]}>
        <Text style={styles.debugTitle}>Markers: {markers.length}</Text>
        {markers.slice(-3).map((marker) => (
          <Text key={marker.id} style={styles.debugItem}>
            {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },

  topOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
  },

  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 16,

    // glassy look
    backgroundColor: 'rgba(20, 20, 20, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',

    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  locationInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 0,
  },

  clear: {
    width: 44,
    textAlign: 'right',
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
  },

  debugPanel: {
    position: 'absolute',
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },

  debugTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },

  debugItem: {
    color: '#fff',
    fontSize: 12,
  },
});
