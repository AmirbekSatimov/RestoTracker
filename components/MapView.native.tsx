import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

type Props = {
  latitude: number;
  longitude: number;
  markers?: Array<{ id: string; latitude: number; longitude: number; emoji?: string }>;
};

export default function AppMapView({ latitude, longitude, markers = [] }: Props) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
        >
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{marker.emoji || '📍'}</Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
});
