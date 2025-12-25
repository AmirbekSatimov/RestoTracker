import MapView, { Marker } from 'react-native-maps';

type Props = {
  latitude: number;
  longitude: number;
  markers?: Array<{ id: string; latitude: number; longitude: number }>;
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
        />
      ))}
    </MapView>
  );
}
