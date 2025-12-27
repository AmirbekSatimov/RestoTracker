import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthContext';

type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  emoji?: string;
};

type MarkersContextValue = {
  markers: MapMarker[];
  addMarker: (latitude: number, longitude: number, name?: string, emoji?: string) => void;
  refreshMarkers: () => void;
};

const MarkersContext = createContext<MarkersContextValue | null>(null);

export function MarkersProvider({ children }: { children: React.ReactNode }) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const { token } = useAuth();
  const apiBase = useMemo(() => {
    const base =
      process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ??
      process.env.EXPO_PUBLIC_PLACES_PROXY_URL?.trim() ??
      '';
    return base.replace(/\/$/, '');
  }, []);

  const fetchMarkers = () => {
    if (!apiBase || !token) {
      setMarkers([]);
      return;
    }
    fetch(`${apiBase}/api/markers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data?.markers)) {
          setMarkers(data.markers);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchMarkers();
  }, [apiBase, token]);

  const addMarker = async (
    latitude: number,
    longitude: number,
    name?: string,
    emoji?: string
  ) => {
    if (!apiBase || !token) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/markers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude, longitude, name, emoji }),
      });
      const data = await response.json();
      if (data?.marker) {
        setMarkers((prev) => [...prev, data.marker]);
        return;
      }
    } catch (error) {
      // No-op: keep server as the source of truth.
    }
  };

  const value = useMemo(
    () => ({ markers, addMarker, refreshMarkers: fetchMarkers }),
    [markers, apiBase, token]
  );

  return <MarkersContext.Provider value={value}>{children}</MarkersContext.Provider>;
}

export function useMarkers() {
  const context = useContext(MarkersContext);
  if (!context) {
    throw new Error('useMarkers must be used within MarkersProvider.');
  }
  return context;
}
