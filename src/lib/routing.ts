/**
 * Routing utilities using Mapbox Directions API
 * Provides road-snapped routes between destinations
 */

import { Stop, RouteSegment, TripRoute } from '@/types';

interface MapboxRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    coordinates: [number, number][];
    type: string;
  };
  legs: {
    distance: number;
    duration: number;
    summary: string;
    steps: any[];
  }[];
}

interface DirectionsResponse {
  routes: MapboxRoute[];
  waypoints: {
    name: string;
    location: [number, number];
  }[];
  code: string;
  uuid: string;
}

/**
 * Fetch driving route between two points using Mapbox Directions API
 */
export async function fetchRouteSegment(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  accessToken: string
): Promise<{
  distance: number;
  duration: number;
  coordinates: [number, number][];
} | null> {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox Directions API error:', response.status);
      return null;
    }
    
    const data: DirectionsResponse = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('No route found');
      return null;
    }
    
    const route = data.routes[0];
    
    return {
      distance: route.distance / 1000, // Convert to km
      duration: Math.round(route.duration / 60), // Convert to minutes
      coordinates: route.geometry.coordinates,
    };
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

/**
 * Fetch the complete route for all stops
 * Uses Mapbox Directions API with waypoints
 */
export async function fetchFullRoute(
  stops: Stop[],
  accessToken: string
): Promise<TripRoute | null> {
  if (stops.length < 2) {
    return null;
  }
  
  try {
    // Build waypoints string: lng,lat;lng,lat;...
    const waypoints = stops
      .map((stop) => `${stop.location.lng},${stop.location.lat}`)
      .join(';');
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&steps=false&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox Directions API error:', response.status);
      return null;
    }
    
    const data: DirectionsResponse = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('No route found');
      return null;
    }
    
    const route = data.routes[0];
    
    // Build segments from legs
    const segments: RouteSegment[] = route.legs.map((leg, index) => ({
      fromStopId: stops[index].id,
      toStopId: stops[index + 1].id,
      distance: leg.distance / 1000, // km
      duration: Math.round(leg.duration / 60), // minutes
      polyline: '', // We use the full route geometry instead
    }));
    
    return {
      tripId: stops[0].id, // We'll update this with actual trip ID
      totalDistance: route.distance / 1000, // km
      totalDrivingTime: Math.round(route.duration / 60), // minutes
      segments,
      // Store the full geometry for rendering
      geometry: route.geometry.coordinates,
    };
  } catch (error) {
    console.error('Error fetching full route:', error);
    return null;
  }
}

/**
 * Optimize waypoint order for the most efficient route
 * Uses Mapbox Optimization API
 */
export async function optimizeRouteOrder(
  stops: Stop[],
  accessToken: string,
  keepFirstAndLast: boolean = true
): Promise<number[] | null> {
  if (stops.length < 3) {
    return stops.map((_, i) => i);
  }
  
  try {
    // Build waypoints string
    const waypoints = stops
      .map((stop) => `${stop.location.lng},${stop.location.lat}`)
      .join(';');
    
    // Distribution options: first stop is source, last is destination (if keepFirstAndLast)
    const distributions = keepFirstAndLast
      ? `source=first&destination=last`
      : '';
    
    const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${waypoints}?${distributions}&geometries=geojson&overview=full&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox Optimization API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.waypoints) {
      console.error('Optimization failed');
      return null;
    }
    
    // Extract the optimized order from waypoint indices
    const optimizedOrder = data.waypoints.map((wp: { waypoint_index: number }) => wp.waypoint_index);
    
    return optimizedOrder;
  } catch (error) {
    console.error('Error optimizing route:', error);
    return null;
  }
}

/**
 * Get travel time estimate based on time of day
 * Mapbox supports traffic-aware routing
 */
export async function fetchRouteWithTraffic(
  stops: Stop[],
  accessToken: string,
  departureTime?: Date
): Promise<TripRoute | null> {
  if (stops.length < 2) {
    return null;
  }
  
  try {
    const waypoints = stops
      .map((stop) => `${stop.location.lng},${stop.location.lat}`)
      .join(';');
    
    // Use driving-traffic profile for real-time traffic consideration
    let url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${waypoints}?geometries=geojson&overview=full&steps=false&access_token=${accessToken}`;
    
    // Add departure time if provided (for predictive traffic)
    if (departureTime) {
      url += `&depart_at=${departureTime.toISOString()}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      // Fall back to regular driving if traffic not available
      return fetchFullRoute(stops, accessToken);
    }
    
    const data: DirectionsResponse = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return fetchFullRoute(stops, accessToken);
    }
    
    const route = data.routes[0];
    
    const segments: RouteSegment[] = route.legs.map((leg, index) => ({
      fromStopId: stops[index].id,
      toStopId: stops[index + 1].id,
      distance: leg.distance / 1000,
      duration: Math.round(leg.duration / 60),
      polyline: '',
    }));
    
    return {
      tripId: stops[0].id,
      totalDistance: route.distance / 1000,
      totalDrivingTime: Math.round(route.duration / 60),
      segments,
      geometry: route.geometry.coordinates,
    };
  } catch (error) {
    console.error('Error fetching route with traffic:', error);
    return fetchFullRoute(stops, accessToken);
  }
}

