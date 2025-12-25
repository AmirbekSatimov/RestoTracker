import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
};

type MarkersContextValue = {
  markers: MapMarker[];
  addMarker: (latitude: number, longitude: number, name?: string) => void;
};

const MarkersContext = createContext<MarkersContextValue | null>(null);

export function MarkersProvider({ children }: { children: React.ReactNode }) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const apiBase = useMemo(() => {
    const base =
      process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ??
      process.env.EXPO_PUBLIC_PLACES_PROXY_URL?.trim() ??
      '';
    return base.replace(/\/$/, '');
  }, []);

  useEffect(() => {
    if (!apiBase) {
      return;
    }
    fetch(`${apiBase}/api/markers`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data?.markers)) {
          setMarkers(data.markers);
        }
      })
      .catch(() => {});
  }, [apiBase]);

  const addMarker = async (latitude: number, longitude: number, name?: string) => {
    if (!apiBase) {
      setMarkers((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          latitude,
          longitude,
          name,
        },
      ]);
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/markers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, name }),
      });
      const data = await response.json();
      if (data?.marker) {
        setMarkers((prev) => [...prev, data.marker]);
        return;
      }
    } catch (error) {
      // Fall back to local state if the server is unreachable.
    }

    setMarkers((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        latitude,
        longitude,
        name,
      },
    ]);
  };

  const value = useMemo(() => ({ markers, addMarker }), [markers]);

  return <MarkersContext.Provider value={value}>{children}</MarkersContext.Provider>;
}

export function useMarkers() {
  const context = useContext(MarkersContext);
  if (!context) {
    throw new Error('useMarkers must be used within MarkersProvider.');
  }
  return context;
}
