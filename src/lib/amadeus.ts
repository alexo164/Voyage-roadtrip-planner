/**
 * Amadeus API Client
 * Documentation: https://developers.amadeus.com/self-service
 * 
 * This client handles authentication and provides typed methods for:
 * - Flight Offers Search
 * - Hotel Search
 * - Flight Price Analysis (for price optimizer)
 * - Airport/City Search
 */

// Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

const AMADEUS_API_BASE = 'https://api.amadeus.com';
const AMADEUS_TEST_BASE = 'https://test.api.amadeus.com'; // Use test environment for development

// Use test API in development, production API in production
const API_BASE = process.env.NODE_ENV === 'production' ? AMADEUS_API_BASE : AMADEUS_TEST_BASE;

/**
 * Get OAuth2 access token from Amadeus
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  const clientId = process.env.AMADEUS_API_KEY;
  const clientSecret = process.env.AMADEUS_API_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Amadeus API credentials not configured');
  }

  const response = await fetch(`${API_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Amadeus authentication failed: ${error}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  return accessToken!;
}

/**
 * Make authenticated request to Amadeus API
 */
async function amadeusRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Amadeus API error:', errorText);
    throw new Error(`Amadeus API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// TYPES
// ============================================================================

export interface AmadeusFlightOffer {
  type: string;
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: AmadeusItinerary[];
  price: {
    currency: string;
    total: string;
    base: string;
    fees: { amount: string; type: string }[];
    grandTotal: string;
  };
  pricingOptions: {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  };
  validatingAirlineCodes: string[];
  travelerPricings: {
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: {
      currency: string;
      total: string;
      base: string;
    };
  }[];
}

export interface AmadeusItinerary {
  duration: string;
  segments: AmadeusSegment[];
}

export interface AmadeusSegment {
  departure: {
    iataCode: string;
    terminal?: string;
    at: string;
  };
  arrival: {
    iataCode: string;
    terminal?: string;
    at: string;
  };
  carrierCode: string;
  number: string;
  aircraft: { code: string };
  operating?: { carrierCode: string };
  duration: string;
  id: string;
  numberOfStops: number;
  blacklistedInEU: boolean;
}

export interface AmadeusHotelOffer {
  type: string;
  hotel: {
    type: string;
    hotelId: string;
    chainCode?: string;
    dupeId: string;
    name: string;
    cityCode: string;
    latitude: number;
    longitude: number;
    address?: {
      lines?: string[];
      cityName?: string;
      countryCode?: string;
    };
    amenities?: string[];
    rating?: string;
    media?: { uri: string; category: string }[];
  };
  available: boolean;
  offers: {
    id: string;
    checkInDate: string;
    checkOutDate: string;
    rateCode: string;
    room: {
      type: string;
      typeEstimated?: {
        category: string;
        beds?: number;
        bedType?: string;
      };
      description?: { text: string };
    };
    guests?: { adults: number };
    price: {
      currency: string;
      base?: string;
      total: string;
      variations?: {
        average?: { base: string };
        changes?: { startDate: string; endDate: string; base: string }[];
      };
    };
    policies?: {
      cancellation?: { deadline?: string; amount?: string };
      paymentType?: string;
    };
  }[];
}

export interface AmadeusLocation {
  type: string;
  subType: string;
  name: string;
  detailedName: string;
  id: string;
  iataCode: string;
  address: {
    cityName: string;
    cityCode: string;
    countryName: string;
    countryCode: string;
  };
  geoCode: {
    latitude: number;
    longitude: number;
  };
}

export interface FlightPriceAnalysis {
  type: string;
  origin: string;
  destination: string;
  departureDate: string;
  oneWay: boolean;
  duration: string;
  nonStop: boolean;
  viewBy: string;
  price: {
    min: string;
    max: string;
    median: string;
    firstQuartile: string;
    thirdQuartile: string;
  };
}

// ============================================================================
// FLIGHT SEARCH
// ============================================================================

export interface FlightSearchParams {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  nonStop?: boolean;
  currencyCode?: string;
  maxPrice?: number;
  max?: number;
}

export async function searchFlights(params: FlightSearchParams): Promise<AmadeusFlightOffer[]> {
  const queryParams = new URLSearchParams({
    originLocationCode: params.originLocationCode,
    destinationLocationCode: params.destinationLocationCode,
    departureDate: params.departureDate,
    adults: params.adults.toString(),
    currencyCode: params.currencyCode || 'EUR',
    max: (params.max || 10).toString(),
  });

  if (params.returnDate) {
    queryParams.set('returnDate', params.returnDate);
  }
  if (params.children) {
    queryParams.set('children', params.children.toString());
  }
  if (params.infants) {
    queryParams.set('infants', params.infants.toString());
  }
  if (params.travelClass) {
    queryParams.set('travelClass', params.travelClass);
  }
  if (params.nonStop) {
    queryParams.set('nonStop', 'true');
  }
  if (params.maxPrice) {
    queryParams.set('maxPrice', params.maxPrice.toString());
  }

  const response = await amadeusRequest<{ data: AmadeusFlightOffer[] }>(
    `/v2/shopping/flight-offers?${queryParams.toString()}`
  );

  return response.data || [];
}

// ============================================================================
// HOTEL SEARCH
// ============================================================================

export interface HotelSearchParams {
  cityCode: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string;
  adults?: number;
  roomQuantity?: number;
  priceRange?: string; // e.g., "100-200"
  currency?: string;
  ratings?: string[]; // e.g., ["3", "4", "5"]
  amenities?: string[];
  radius?: number;
  radiusUnit?: 'KM' | 'MILE';
}

/**
 * Search for hotels by city
 * Uses the Hotel List API to get hotel IDs, then Hotel Search for offers
 */
export async function searchHotelsByCity(params: HotelSearchParams): Promise<AmadeusHotelOffer[]> {
  try {
    // Step 1: Get hotel IDs by city code
    const hotelListParams = new URLSearchParams({
      cityCode: params.cityCode,
    });

    if (params.radius) {
      hotelListParams.set('radius', params.radius.toString());
      hotelListParams.set('radiusUnit', params.radiusUnit || 'KM');
    }
    if (params.ratings && params.ratings.length > 0) {
      hotelListParams.set('ratings', params.ratings.join(','));
    }
    if (params.amenities && params.amenities.length > 0) {
      hotelListParams.set('amenities', params.amenities.join(','));
    }

    const hotelListResponse = await amadeusRequest<{ data: { hotelId: string }[] }>(
      `/v1/reference-data/locations/hotels/by-city?${hotelListParams.toString()}`
    );

    const hotelIds = hotelListResponse.data?.slice(0, 20).map(h => h.hotelId) || [];

    if (hotelIds.length === 0) {
      return [];
    }

    // Step 2: Get hotel offers
    const offerParams = new URLSearchParams({
      hotelIds: hotelIds.join(','),
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      adults: (params.adults || 1).toString(),
      roomQuantity: (params.roomQuantity || 1).toString(),
      currency: params.currency || 'EUR',
    });

    if (params.priceRange) {
      offerParams.set('priceRange', params.priceRange);
    }

    const offersResponse = await amadeusRequest<{ data: AmadeusHotelOffer[] }>(
      `/v3/shopping/hotel-offers?${offerParams.toString()}`
    );

    return offersResponse.data || [];
  } catch (error) {
    console.error('Hotel search error:', error);
    return [];
  }
}

// ============================================================================
// LOCATION SEARCH (for airports and cities)
// ============================================================================

export async function searchLocations(
  keyword: string,
  subType: 'AIRPORT' | 'CITY' | 'AIRPORT,CITY' = 'AIRPORT,CITY'
): Promise<AmadeusLocation[]> {
  const queryParams = new URLSearchParams({
    keyword,
    subType,
    'page[limit]': '10',
  });

  const response = await amadeusRequest<{ data: AmadeusLocation[] }>(
    `/v1/reference-data/locations?${queryParams.toString()}`
  );

  return response.data || [];
}

/**
 * Search for nearest airports to given coordinates
 * Uses Amadeus Airport Nearest Relevant API
 */
export async function searchNearestAirport(
  latitude: number,
  longitude: number,
  radius: number = 300, // km
  limit: number = 5
): Promise<AmadeusLocation[]> {
  try {
    const queryParams = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: Math.min(radius, 500).toString(), // Amadeus max is 500km
      'page[limit]': Math.min(limit, 10).toString(),
      sort: 'distance',
    });

    const response = await amadeusRequest<{ data: AmadeusLocation[] }>(
      `/v1/reference-data/locations/airports?${queryParams.toString()}`
    );

    return response.data || [];
  } catch (error) {
    console.error('Error searching nearest airports:', error);
    return [];
  }
}

/**
 * Get IATA code for a city
 */
export async function getCityCode(cityName: string): Promise<string | null> {
  try {
    const locations = await searchLocations(cityName, 'CITY');
    return locations[0]?.iataCode || null;
  } catch (error) {
    console.error('Error getting city code:', error);
    return null;
  }
}

// ============================================================================
// FLIGHT PRICE ANALYSIS (for price optimizer)
// ============================================================================

export interface FlightPriceAnalysisParams {
  originIataCode: string;
  destinationIataCode: string;
  departureDate: string; // YYYY-MM-DD
  currencyCode?: string;
  oneWay?: boolean;
}

/**
 * Get flight price analysis for a route
 * Uses Flight Price Analysis API to get historical price insights
 */
export async function getFlightPriceAnalysis(
  params: FlightPriceAnalysisParams
): Promise<FlightPriceAnalysis | null> {
  try {
    const queryParams = new URLSearchParams({
      originIataCode: params.originIataCode,
      destinationIataCode: params.destinationIataCode,
      departureDate: params.departureDate,
      currencyCode: params.currencyCode || 'EUR',
      oneWay: (params.oneWay ?? false).toString(),
    });

    const response = await amadeusRequest<{ data: FlightPriceAnalysis[] }>(
      `/v1/analytics/itinerary-price-metrics?${queryParams.toString()}`
    );

    return response.data?.[0] || null;
  } catch (error) {
    console.error('Flight price analysis error:', error);
    return null;
  }
}

/**
 * Get flight inspiration (cheapest destinations from origin)
 */
export async function getFlightInspiration(
  origin: string,
  departureDate?: string,
  maxPrice?: number
): Promise<{ destination: string; price: { total: string }; departureDate: string }[]> {
  try {
    const queryParams = new URLSearchParams({
      origin,
      oneWay: 'false',
      nonStop: 'false',
      currency: 'EUR',
    });

    if (departureDate) {
      queryParams.set('departureDate', departureDate);
    }
    if (maxPrice) {
      queryParams.set('maxPrice', maxPrice.toString());
    }

    const response = await amadeusRequest<{
      data: { destination: string; price: { total: string }; departureDate: string }[];
    }>(`/v1/shopping/flight-destinations?${queryParams.toString()}`);

    return response.data || [];
  } catch (error) {
    console.error('Flight inspiration error:', error);
    return [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Map airline code to name
 */
const AIRLINE_NAMES: Record<string, string> = {
  LH: 'Lufthansa',
  OS: 'Austrian Airlines',
  LX: 'Swiss International',
  EW: 'Eurowings',
  FR: 'Ryanair',
  U2: 'easyJet',
  BA: 'British Airways',
  AF: 'Air France',
  KL: 'KLM',
  IB: 'Iberia',
  VY: 'Vueling',
  W6: 'Wizz Air',
  DE: 'Condor',
  X3: 'TUIfly',
  EN: 'Air Dolomiti',
  AZ: 'ITA Airways',
};

export function getAirlineName(code: string): string {
  return AIRLINE_NAMES[code] || code;
}

/**
 * Parse ISO 8601 duration to minutes
 */
export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes;
}

/**
 * Format duration for display
 */
export function formatFlightDuration(isoDuration: string): string {
  const totalMinutes = parseDuration(isoDuration);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/**
 * Check if Amadeus API is configured
 */
export function isAmadeusConfigured(): boolean {
  return !!(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
}

// City code mapping for common cities
export const CITY_CODES: Record<string, string> = {
  'Munich': 'MUC',
  'Salzburg': 'SZG',
  'Vienna': 'VIE',
  'Innsbruck': 'INN',
  'Zurich': 'ZRH',
  'Geneva': 'GVA',
  'Milan': 'MIL',
  'Frankfurt': 'FRA',
  'Berlin': 'BER',
  'Paris': 'PAR',
  'Amsterdam': 'AMS',
  'Rome': 'ROM',
  'Barcelona': 'BCN',
  'Madrid': 'MAD',
  'London': 'LON',
  'Lucerne': 'ZRH', // Closest major airport
  'Interlaken': 'BRN', // Bern is closest
  'Bern': 'BRN',
  'Basel': 'BSL',
  'Graz': 'GRZ',
  'Linz': 'LNZ',
  'Stuttgart': 'STR',
  'Nuremberg': 'NUE',
};

// Dynamic cache for city codes fetched from API
const dynamicCityCodeCache = new Map<string, string>();

export function getCityCodeSync(cityName: string): string | null {
  // First check dynamic cache (from API)
  const cachedCode = dynamicCityCodeCache.get(cityName.toLowerCase());
  if (cachedCode) {
    return cachedCode;
  }
  
  // Then check our static mapping as fallback
  for (const [city, code] of Object.entries(CITY_CODES)) {
    if (cityName.toLowerCase().includes(city.toLowerCase())) {
      return code;
    }
  }
  return null;
}

/**
 * Get city/airport code asynchronously, searching Amadeus if not in cache
 */
export async function getCityCodeAsync(cityName: string): Promise<string | null> {
  // Check sync cache first
  const syncCode = getCityCodeSync(cityName);
  if (syncCode) {
    return syncCode;
  }
  
  // Search Amadeus for the city
  try {
    if (!isAmadeusConfigured()) {
      return null;
    }
    
    const locations = await searchLocations(cityName, 'AIRPORT,CITY');
    
    if (locations.length > 0) {
      const code = locations[0].iataCode;
      // Cache the result
      dynamicCityCodeCache.set(cityName.toLowerCase(), code);
      return code;
    }
  } catch (error) {
    console.error('Error fetching city code:', error);
  }
  
  return null;
}

/**
 * Batch lookup of city codes - more efficient for multiple cities
 */
export async function getCityCodesAsync(cityNames: string[]): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};
  
  // First check sync for all
  const needsLookup: string[] = [];
  for (const cityName of cityNames) {
    const syncCode = getCityCodeSync(cityName);
    if (syncCode) {
      results[cityName] = syncCode;
    } else {
      needsLookup.push(cityName);
    }
  }
  
  // Lookup remaining in parallel
  if (needsLookup.length > 0 && isAmadeusConfigured()) {
    const lookupPromises = needsLookup.map(async (cityName) => {
      try {
        const locations = await searchLocations(cityName, 'AIRPORT,CITY');
        if (locations.length > 0) {
          const code = locations[0].iataCode;
          dynamicCityCodeCache.set(cityName.toLowerCase(), code);
          return { cityName, code };
        }
      } catch (error) {
        console.error(`Error fetching code for ${cityName}:`, error);
      }
      return { cityName, code: null };
    });
    
    const lookupResults = await Promise.all(lookupPromises);
    for (const { cityName, code } of lookupResults) {
      results[cityName] = code;
    }
  } else {
    // Amadeus not configured, set nulls
    for (const cityName of needsLookup) {
      results[cityName] = null;
    }
  }
  
  return results;
}

