import { NextRequest, NextResponse } from 'next/server';
import { searchLocations, isAmadeusConfigured, AmadeusLocation } from '@/lib/amadeus';

export interface AirportResult {
  code: string;        // IATA code (e.g., DUB)
  icao: string;        // ICAO code if available
  name: string;
  city: string;
  country: string;
  countryCode: string;
  type: 'AIRPORT';
  lat: number;
  lng: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }
    
    if (!isAmadeusConfigured()) {
      return NextResponse.json({ 
        results: [],
        error: 'Amadeus API not configured'
      });
    }
    
    // Search Amadeus for airports only
    const amadeusResults = await searchLocations(query, 'AIRPORT');
    
    console.log(`Amadeus returned ${amadeusResults.length} airports for "${query}"`);
    
    const results = transformAmadeusLocations(amadeusResults);
    
    return NextResponse.json({ 
      results,
      source: 'amadeus'
    });
  } catch (error) {
    console.error('Airport search error:', error);
    return NextResponse.json(
      { error: 'Failed to search airports' },
      { status: 500 }
    );
  }
}

function transformAmadeusLocations(locations: AmadeusLocation[]): AirportResult[] {
  return locations
    .filter(loc => loc.iataCode && loc.subType === 'AIRPORT')
    .map((loc) => ({
      code: loc.iataCode,
      icao: '', // Amadeus doesn't provide ICAO codes directly
      name: loc.name || loc.detailedName || loc.iataCode,
      city: loc.address?.cityName || loc.name || '',
      country: loc.address?.countryName || '',
      countryCode: loc.address?.countryCode || '',
      type: 'AIRPORT' as const,
      lat: loc.geoCode?.latitude || 0,
      lng: loc.geoCode?.longitude || 0,
    }));
}
