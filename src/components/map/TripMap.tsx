'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTripStore } from '@/store/tripStore';
import { Location } from '@/types';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Default to European center (will be overridden by actual token)
const DEFAULT_CENTER: [number, number] = [11.5820, 48.1351]; // Munich
const DEFAULT_ZOOM = 6;

interface TripMapProps {
  onLocationSelect?: (location: Location) => void;
}

export function TripMap({ onLocationSelect }: TripMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const { currentTrip, selectedStopId, selectStop, addStop, route, isRouteFetching, updateRoute } = useTripStore();
  
  // Trigger initial route calculation when map loads with existing stops
  useEffect(() => {
    if (mapLoaded && currentTrip?.stops && currentTrip.stops.length >= 2 && !route?.geometry) {
      updateRoute();
    }
  }, [mapLoaded, currentTrip?.stops?.length]);
  
  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!token || token === 'pk.your_mapbox_public_token') {
      console.warn('Mapbox token not configured');
      return;
    }
    
    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 30,
      bearing: 0,
    });
    
    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );
    
    // Add scale control
    map.current.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 150 }),
      'bottom-right'
    );
    
    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add route source and layer
      map.current?.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [],
          },
        },
      });
      
      // Route line - glow effect
      map.current?.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#14b8a6',
          'line-width': 8,
          'line-opacity': 0.3,
          'line-blur': 3,
        },
      });
      
      // Route line - main
      map.current?.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#14b8a6',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      });
    });
    
    // Handle map clicks for adding stops
    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      
      try {
        // Reverse geocode the clicked location
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,locality,neighborhood`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const context = feature.context || [];
          
          const countryContext = context.find((c: any) => c.id.startsWith('country'));
          const regionContext = context.find((c: any) => c.id.startsWith('region'));
          
          const location: Location = {
            name: feature.text,
            city: feature.place_name.split(',')[0],
            country: countryContext?.text || 'Unknown',
            countryCode: countryContext?.short_code?.toUpperCase() || '',
            lat,
            lng,
            placeId: feature.id,
          };
          
          if (onLocationSelect) {
            onLocationSelect(location);
          } else {
            addStop(location);
            toast.success(`Added ${location.name} to your trip!`);
          }
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        toast.error('Failed to get location details');
      }
    });
    
    // Cursor style on hover
    map.current.on('mouseenter', 'route', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    
    map.current.on('mouseleave', 'route', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
    
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);
  
  // Update markers when stops change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    const stops = currentTrip?.stops || [];
    
    // Remove old markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!stops.find((s) => s.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
    
    // Add/update markers
    stops.forEach((stop, index) => {
      if (markersRef.current[stop.id]) {
        // Update existing marker position if needed
        markersRef.current[stop.id].setLngLat([stop.location.lng, stop.location.lat]);
        
        // Update selection state
        const el = markersRef.current[stop.id].getElement();
        if (selectedStopId === stop.id) {
          el.classList.add('selected');
        } else {
          el.classList.remove('selected');
        }
      } else {
        // Create new marker
        const el = document.createElement('div');
        el.className = `custom-marker stop ${selectedStopId === stop.id ? 'selected' : ''}`;
        el.innerHTML = `${index + 1}`;
        el.onclick = (e) => {
          e.stopPropagation();
          selectStop(stop.id);
        };
        
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([stop.location.lng, stop.location.lat])
          .addTo(map.current!);
        
        markersRef.current[stop.id] = marker;
      }
    });
    
    // Fit bounds to show all stops
    if (stops.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach((stop) => {
        bounds.extend([stop.location.lng, stop.location.lat]);
      });
      
      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 400, right: 100 },
        maxZoom: 10,
        duration: 1000,
      });
    }
  }, [currentTrip?.stops, mapLoaded, selectedStopId, selectStop]);
  
  // Update route line - use road-snapped geometry when available
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
    if (!source) return;
    
    const stops = currentTrip?.stops || [];
    
    if (stops.length < 2) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      });
      return;
    }
    
    // Use road-snapped route geometry if available, otherwise fall back to straight lines
    let coordinates: [number, number][];
    
    if (route?.geometry && route.geometry.length > 0) {
      // Use the actual road route from Mapbox Directions API
      coordinates = route.geometry;
    } else {
      // Fallback: straight lines between stops
      coordinates = stops.map((stop) => [stop.location.lng, stop.location.lat]);
    }
    
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  }, [currentTrip?.stops, route?.geometry, mapLoaded]);
  
  // Focus on selected stop
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedStopId) return;
    
    const stop = currentTrip?.stops.find((s) => s.id === selectedStopId);
    if (!stop) return;
    
    map.current.flyTo({
      center: [stop.location.lng, stop.location.lat],
      zoom: 10,
      duration: 1000,
    });
  }, [selectedStopId, mapLoaded]);
  
  const hasToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN && 
                   process.env.NEXT_PUBLIC_MAPBOX_TOKEN !== 'pk.your_mapbox_public_token';
  
  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {!hasToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
          <div className="text-center max-w-md p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-alpine-500 to-alpine-600 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-display font-semibold text-white mb-3">
              Map Configuration Required
            </h2>
            <p className="text-slate-400 mb-6">
              To display the interactive map, please add your Mapbox access token to the <code className="text-alpine-400">.env.local</code> file.
            </p>
            <div className="bg-slate-800/50 rounded-lg p-4 text-left">
              <code className="text-sm text-slate-300">
                NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
              </code>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              Get a free token at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-alpine-400 hover:underline">mapbox.com</a>
            </p>
          </div>
        </div>
      )}
      
      {/* Map instructions overlay */}
      {hasToken && currentTrip?.stops.length === 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-strong rounded-2xl px-6 py-4 flex items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-alpine-500/20 flex items-center justify-center">
            <Navigation className="w-6 h-6 text-alpine-400" />
          </div>
          <div>
            <p className="font-medium text-white">Click anywhere on the map</p>
            <p className="text-sm text-slate-400">to add your first destination</p>
          </div>
        </div>
      )}
      
      {/* Route calculating indicator */}
      {isRouteFetching && (
        <div className="absolute top-20 right-4 glass-strong rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
          <Loader2 className="w-5 h-5 text-alpine-400 animate-spin" />
          <div>
            <p className="text-sm font-medium text-white">Calculating route...</p>
            <p className="text-xs text-slate-400">Finding best roads</p>
          </div>
        </div>
      )}
      
      {/* Route info badge */}
      {hasToken && route && route.totalDistance > 0 && !isRouteFetching && (
        <div className="absolute top-20 right-4 glass-strong rounded-xl px-4 py-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-alpine-500/20 flex items-center justify-center">
              <Navigation className="w-4 h-4 text-alpine-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {route.totalDistance.toFixed(0)} km total
              </p>
              <p className="text-xs text-slate-400">
                {Math.floor(route.totalDrivingTime / 60)}h {route.totalDrivingTime % 60}m driving
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

