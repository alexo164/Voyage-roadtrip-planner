import { NextRequest, NextResponse } from 'next/server';
import { searchNearestAirport, isAmadeusConfigured, AmadeusLocation } from '@/lib/amadeus';

export interface NearestAirportResult {
  code: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  type: 'AIRPORT';
  lat: number;
  lng: number;
  distance: number; // km from the requested coordinates
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radius = parseInt(searchParams.get('radius') || '300'); // km
    const limit = parseInt(searchParams.get('limit') || '5');
    
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ 
        error: 'lat and lng parameters are required',
        results: []
      }, { status: 400 });
    }
    
    if (!isAmadeusConfigured()) {
      return NextResponse.json({ 
        results: [],
        error: 'Amadeus API not configured'
      });
    }
    
    // Search Amadeus for nearby airports
    const amadeusResults = await searchNearestAirport(lat, lng, radius, limit);
    
    console.log(`Amadeus returned ${amadeusResults.length} airports near (${lat}, ${lng})`);
    
    const results = transformAmadeusLocations(amadeusResults, lat, lng);
    
    return NextResponse.json({ 
      results,
      source: 'amadeus'
    });
  } catch (error) {
    console.error('Nearest airport search error:', error);
    return NextResponse.json(
      { error: 'Failed to search nearby airports', results: [] },
      { status: 500 }
    );
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function transformAmadeusLocations(
  locations: AmadeusLocation[], 
  requestLat: number, 
  requestLng: number
): NearestAirportResult[] {
  return locations
    .filter(loc => loc.iataCode && loc.subType === 'AIRPORT')
    .map((loc) => {
      const airportLat = loc.geoCode?.latitude || 0;
      const airportLng = loc.geoCode?.longitude || 0;
      const distance = calculateDistance(requestLat, requestLng, airportLat, airportLng);
      
      return {
        code: loc.iataCode,
        icao: '', // Amadeus doesn't provide ICAO codes directly
        name: loc.name || loc.detailedName || loc.iataCode,
        city: loc.address?.cityName || loc.name || '',
        country: loc.address?.countryName || '',
        countryCode: loc.address?.countryCode || '',
        type: 'AIRPORT' as const,
        lat: airportLat,
        lng: airportLng,
        distance: Math.round(distance),
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

