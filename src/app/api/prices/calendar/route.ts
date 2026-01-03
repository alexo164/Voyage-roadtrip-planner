import { NextRequest, NextResponse } from 'next/server';
import { isAmadeusConfigured, searchFlights, getCityCodeAsync } from '@/lib/amadeus';

export interface OriginAirport {
  code: string;
  name: string;
  city: string;
}

export interface PriceData {
  flight: number;
  hotel: number;
  total: number;
}

export interface DayPriceData {
  date: string;
  origins: Record<string, PriceData>;
  bestOrigin: string;
  bestPrice: number;
  hotelEstimate: number;
  tier: 'low' | 'mid' | 'high';
}

export interface CalendarPriceResponse {
  prices: Record<string, DayPriceData>;
  priceRange: { min: number; max: number };
  source: 'amadeus' | 'mock';
}

interface RequestBody {
  originAirports: OriginAirport[];
  destinationCities: string[];
  destinationAirport?: string; // IATA code, auto-detected from first stop
  returnAirport?: string; // IATA code, auto-detected from last stop
  month: number; // 1-12
  year: number;
  tripDuration: number; // in days
  hotelBudgetPerNight?: number;
}

// Sample dates throughout the month to reduce API calls
function getSampleDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Sample every 3-4 days (8 samples per month)
  for (let day = 1; day <= daysInMonth; day += 4) {
    const date = new Date(year, month - 1, day);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Interpolate prices for days between samples
function interpolatePrices(
  sampledPrices: Record<string, Record<string, number>>,
  year: number,
  month: number
): Record<string, Record<string, number>> {
  const interpolated: Record<string, Record<string, number>> = {};
  const daysInMonth = new Date(year, month, 0).getDate();
  const sampleDates = Object.keys(sampledPrices).sort();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = new Date(year, month - 1, day).toISOString().split('T')[0];
    
    // If we have a sample for this date, use it
    if (sampledPrices[dateStr]) {
      interpolated[dateStr] = sampledPrices[dateStr];
      continue;
    }
    
    // Find surrounding sample dates
    let prevDate: string | null = null;
    let nextDate: string | null = null;
    
    for (const sampleDate of sampleDates) {
      if (sampleDate < dateStr) {
        prevDate = sampleDate;
      } else if (sampleDate > dateStr && !nextDate) {
        nextDate = sampleDate;
        break;
      }
    }
    
    // Interpolate between prev and next
    if (prevDate && nextDate && sampledPrices[prevDate] && sampledPrices[nextDate]) {
      const prevTime = new Date(prevDate).getTime();
      const nextTime = new Date(nextDate).getTime();
      const currentTime = new Date(dateStr).getTime();
      const ratio = (currentTime - prevTime) / (nextTime - prevTime);
      
      interpolated[dateStr] = {};
      
      // Interpolate for each origin
      const origins = new Set([
        ...Object.keys(sampledPrices[prevDate]),
        ...Object.keys(sampledPrices[nextDate])
      ]);
      
      for (const origin of origins) {
        const prevPrice = sampledPrices[prevDate][origin] || 0;
        const nextPrice = sampledPrices[nextDate][origin] || 0;
        interpolated[dateStr][origin] = Math.round(prevPrice + (nextPrice - prevPrice) * ratio);
      }
    } else if (prevDate && sampledPrices[prevDate]) {
      interpolated[dateStr] = { ...sampledPrices[prevDate] };
    } else if (nextDate && sampledPrices[nextDate]) {
      interpolated[dateStr] = { ...sampledPrices[nextDate] };
    }
  }
  
  return interpolated;
}

// Generate mock prices with realistic seasonal variations
function generateMockPrices(
  originAirports: OriginAirport[],
  year: number,
  month: number,
  tripDuration: number,
  hotelBudgetPerNight: number
): CalendarPriceResponse {
  const prices: Record<string, DayPriceData> = {};
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Seasonal multiplier
  const seasonalMultiplier = getSeasonalMultiplier(month);
  
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    
    // Weekend premium
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.15 : 1;
    
    const origins: Record<string, PriceData> = {};
    let bestPrice = Infinity;
    let bestOrigin = '';
    
    for (const airport of originAirports) {
      // Base flight price varies by origin
      const baseFlightPrice = getBaseFlightPrice(airport.code);
      
      // Add some randomness (±15%)
      const randomFactor = 0.85 + Math.random() * 0.30;
      
      const flightPrice = Math.round(
        baseFlightPrice * 2 * seasonalMultiplier * weekendMultiplier * randomFactor
      );
      
      const hotelTotal = hotelBudgetPerNight * tripDuration;
      const total = flightPrice + hotelTotal;
      
      origins[airport.code] = {
        flight: flightPrice,
        hotel: hotelTotal,
        total,
      };
      
      if (total < bestPrice) {
        bestPrice = total;
        bestOrigin = airport.code;
      }
    }
    
    if (bestPrice < minPrice) minPrice = bestPrice;
    if (bestPrice > maxPrice) maxPrice = bestPrice;
    
    prices[dateStr] = {
      date: dateStr,
      origins,
      bestOrigin,
      bestPrice,
      hotelEstimate: hotelBudgetPerNight * tripDuration,
      tier: 'mid', // Will be set later
    };
  }
  
  // Calculate tiers based on price distribution
  const allPrices = Object.values(prices).map(p => p.bestPrice).sort((a, b) => a - b);
  const lowThreshold = allPrices[Math.floor(allPrices.length * 0.25)];
  const highThreshold = allPrices[Math.floor(allPrices.length * 0.75)];
  
  for (const dateStr of Object.keys(prices)) {
    const price = prices[dateStr].bestPrice;
    if (price <= lowThreshold) {
      prices[dateStr].tier = 'low';
    } else if (price >= highThreshold) {
      prices[dateStr].tier = 'high';
    } else {
      prices[dateStr].tier = 'mid';
    }
  }
  
  return {
    prices,
    priceRange: { min: minPrice, max: maxPrice },
    source: 'mock',
  };
}

function getSeasonalMultiplier(month: number): number {
  // Peak: July, August, December
  // Low: January, February, November
  const multipliers: Record<number, number> = {
    1: 0.75,  // January - low
    2: 0.80,  // February - low
    3: 0.90,  // March
    4: 1.00,  // April
    5: 1.05,  // May
    6: 1.20,  // June
    7: 1.40,  // July - peak
    8: 1.45,  // August - peak
    9: 1.10,  // September
    10: 0.95, // October
    11: 0.70, // November - low
    12: 1.30, // December - peak (holidays)
  };
  return multipliers[month] || 1.0;
}

function getBaseFlightPrice(airportCode: string): number {
  // Different base prices for different airports
  const basePrices: Record<string, number> = {
    'MUC': 120,
    'FRA': 100,
    'BER': 110,
    'VIE': 130,
    'ZRH': 150,
    'CDG': 95,
    'LHR': 140,
    'AMS': 105,
    'FCO': 125,
    'BCN': 115,
    'MAD': 120,
    'STR': 135,
    'NUE': 145,
    'GVA': 140,
  };
  return basePrices[airportCode] || 130;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { 
      originAirports, 
      destinationCities,
      destinationAirport,
      returnAirport, 
      month, 
      year, 
      tripDuration,
      hotelBudgetPerNight = 100 
    } = body;
    
    if (!originAirports?.length || !month || !year) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Need at least destination cities or destination airport
    if (!destinationCities?.length && !destinationAirport) {
      return NextResponse.json(
        { error: 'No destination specified' },
        { status: 400 }
      );
    }
    
    // If Amadeus is not configured, use mock data
    if (!isAmadeusConfigured()) {
      const mockResponse = generateMockPrices(
        originAirports,
        year,
        month,
        tripDuration,
        hotelBudgetPerNight
      );
      return NextResponse.json(mockResponse);
    }
    
    // Use provided airport codes or resolve from city names
    let firstDestCode = destinationAirport;
    let lastDestCode = returnAirport || destinationAirport;
    
    // If no airport codes provided, try to get from city names
    if (!firstDestCode && destinationCities?.length) {
      const firstDestination = destinationCities[0];
      const lastDestination = destinationCities[destinationCities.length - 1];
      
      [firstDestCode, lastDestCode] = await Promise.all([
        getCityCodeAsync(firstDestination),
        getCityCodeAsync(lastDestination),
      ]) as [string | null, string | null];
    }
    
    if (!firstDestCode) {
      // Fallback to mock data if we can't resolve destination
      const mockResponse = generateMockPrices(
        originAirports,
        year,
        month,
        tripDuration,
        hotelBudgetPerNight
      );
      return NextResponse.json(mockResponse);
    }
    
    // Get sample dates
    const sampleDates = getSampleDates(year, month);
    
    // Fetch prices for each sample date from each origin
    const sampledPrices: Record<string, Record<string, number>> = {};
    
    const searchPromises = sampleDates.flatMap((date) =>
      originAirports.map(async (origin) => {
        try {
          // Calculate return date
          const departDate = new Date(date);
          const returnDate = new Date(departDate);
          returnDate.setDate(returnDate.getDate() + tripDuration);
          const returnDateStr = returnDate.toISOString().split('T')[0];
          
          // Search outbound
          const outboundOffers = await searchFlights({
            originLocationCode: origin.code,
            destinationLocationCode: firstDestCode,
            departureDate: date,
            adults: 1,
            max: 1,
          });
          
          // Search return (if different destination for last stop)
          const returnOffers = await searchFlights({
            originLocationCode: lastDestCode || firstDestCode,
            destinationLocationCode: origin.code,
            departureDate: returnDateStr,
            adults: 1,
            max: 1,
          });
          
          const outboundPrice = outboundOffers[0]?.price?.total 
            ? parseFloat(outboundOffers[0].price.total) 
            : 0;
          const returnPrice = returnOffers[0]?.price?.total 
            ? parseFloat(returnOffers[0].price.total) 
            : 0;
          
          const totalFlight = outboundPrice + returnPrice;
          
          if (totalFlight > 0) {
            if (!sampledPrices[date]) {
              sampledPrices[date] = {};
            }
            sampledPrices[date][origin.code] = totalFlight;
          }
          
          return { date, origin: origin.code, price: totalFlight };
        } catch (error) {
          console.error(`Price fetch failed for ${origin.code} on ${date}:`, error);
          return { date, origin: origin.code, price: 0 };
        }
      })
    );
    
    await Promise.all(searchPromises);
    
    // If no real prices fetched, fall back to mock
    if (Object.keys(sampledPrices).length === 0) {
      const mockResponse = generateMockPrices(
        originAirports,
        year,
        month,
        tripDuration,
        hotelBudgetPerNight
      );
      return NextResponse.json(mockResponse);
    }
    
    // Interpolate prices for all days
    const allFlightPrices = interpolatePrices(sampledPrices, year, month);
    
    // Build response
    const prices: Record<string, DayPriceData> = {};
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(year, month - 1, day).toISOString().split('T')[0];
      const dayPrices = allFlightPrices[dateStr] || {};
      
      const origins: Record<string, PriceData> = {};
      let bestPrice = Infinity;
      let bestOrigin = '';
      const hotelTotal = hotelBudgetPerNight * tripDuration;
      
      for (const origin of originAirports) {
        const flightPrice = dayPrices[origin.code] || 0;
        if (flightPrice === 0) continue;
        
        const total = flightPrice + hotelTotal;
        
        origins[origin.code] = {
          flight: flightPrice,
          hotel: hotelTotal,
          total,
        };
        
        if (total < bestPrice) {
          bestPrice = total;
          bestOrigin = origin.code;
        }
      }
      
      // Skip days with no prices
      if (bestPrice === Infinity) {
        // Use mock for this day
        const mockPrice = generateMockPriceForDay(originAirports, month, hotelTotal);
        bestPrice = mockPrice.bestPrice;
        bestOrigin = mockPrice.bestOrigin;
        Object.assign(origins, mockPrice.origins);
      }
      
      if (bestPrice < minPrice) minPrice = bestPrice;
      if (bestPrice > maxPrice) maxPrice = bestPrice;
      
      prices[dateStr] = {
        date: dateStr,
        origins,
        bestOrigin,
        bestPrice,
        hotelEstimate: hotelTotal,
        tier: 'mid',
      };
    }
    
    // Calculate tiers
    const allPrices = Object.values(prices).map(p => p.bestPrice).sort((a, b) => a - b);
    const lowThreshold = allPrices[Math.floor(allPrices.length * 0.25)];
    const highThreshold = allPrices[Math.floor(allPrices.length * 0.75)];
    
    for (const dateStr of Object.keys(prices)) {
      const price = prices[dateStr].bestPrice;
      if (price <= lowThreshold) {
        prices[dateStr].tier = 'low';
      } else if (price >= highThreshold) {
        prices[dateStr].tier = 'high';
      } else {
        prices[dateStr].tier = 'mid';
      }
    }
    
    return NextResponse.json({
      prices,
      priceRange: { min: minPrice, max: maxPrice },
      source: 'amadeus',
    } as CalendarPriceResponse);
    
  } catch (error) {
    console.error('Calendar price API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar prices' },
      { status: 500 }
    );
  }
}

function generateMockPriceForDay(
  originAirports: OriginAirport[],
  month: number,
  hotelTotal: number
): { origins: Record<string, PriceData>; bestPrice: number; bestOrigin: string } {
  const origins: Record<string, PriceData> = {};
  let bestPrice = Infinity;
  let bestOrigin = '';
  const seasonalMultiplier = getSeasonalMultiplier(month);
  
  for (const airport of originAirports) {
    const basePrice = getBaseFlightPrice(airport.code);
    const flightPrice = Math.round(basePrice * 2 * seasonalMultiplier * (0.9 + Math.random() * 0.2));
    const total = flightPrice + hotelTotal;
    
    origins[airport.code] = {
      flight: flightPrice,
      hotel: hotelTotal,
      total,
    };
    
    if (total < bestPrice) {
      bestPrice = total;
      bestOrigin = airport.code;
    }
  }
  
  return { origins, bestPrice, bestOrigin };
}

