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
      mapType="mutedStandard"
      userInterfaceStyle="dark"

      // moves the Maps attribution up so it doesn't sit at the very bottom
      legalLabelInsets={{ top: 0, left: 12, right: 12, bottom: 80 }}

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
