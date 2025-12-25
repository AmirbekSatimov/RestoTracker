import { useLocalSearchParams } from 'expo-router';
import AppMapView from '@/components/MapView';
import { StyleSheet, Text, View } from 'react-native';
import { useMarkers } from '@/components/MarkersContext';

const DEFAULT_LATITUDE = 43.6532;
const DEFAULT_LONGITUDE = -79.3832;

function parseCoord(value: string | string[] | undefined, fallback: number) {
  if (Array.isArray(value)) {
    value = value[0];
  }
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function Index() {
  const { lat, lng } = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const latitude = parseCoord(lat, DEFAULT_LATITUDE);
  const longitude = parseCoord(lng, DEFAULT_LONGITUDE);
  const { markers } = useMarkers();

  return (
    <View style={styles.container}>
      <AppMapView latitude={latitude} longitude={longitude} markers={markers} />
      <View style={styles.debugPanel}>
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
  debugPanel: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
