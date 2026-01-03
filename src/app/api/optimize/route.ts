import { NextRequest, NextResponse } from 'next/server';
import { Trip, PriceData, PriceAnalysis } from '@/types';
import { 
  getFlightPriceAnalysis, 
  isAmadeusConfigured, 
  getCityCodeSync,
  searchFlights
} from '@/lib/amadeus';

// Simulated seasonal price multipliers for different regions
const SEASONAL_MULTIPLIERS = {
  // Month index (0-11) to price multiplier
  alpineRegion: {
    0: 0.8,   // Jan - ski season, higher for ski resorts but we're looking at general
    1: 0.75,  // Feb
    2: 0.7,   // Mar - shoulder season
    3: 0.75,  // Apr - Easter bump
    4: 0.85,  // May - spring, good weather starting
    5: 1.0,   // Jun - summer starting
    6: 1.2,   // Jul - peak summer
    7: 1.25,  // Aug - peak summer
    8: 0.9,   // Sep - autumn, great weather
    9: 0.8,   // Oct - shoulder
    10: 0.7,  // Nov - low season
    11: 0.9,  // Dec - Christmas markets
  },
};

// Average base prices (EUR) for the Munich-Austria-Switzerland region
const BASE_PRICES = {
  hotelPerNight: 120,      // Mid-range hotel
  carRentalPerDay: 45,     // Compact car
  flightFromMunich: 150,   // Average flight price
};

// Cache for Amadeus price data
interface PriceCache {
  [key: string]: {
    price: number;
    fetchedAt: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { trip, originAirport } = await request.json();
    
    if (!trip || !trip.stops || trip.stops.length === 0) {
      return NextResponse.json(
        { error: 'No trip data provided' },
        { status: 400 }
      );
    }
    
    const analysis = await calculateOptimalPricing(trip, originAirport);
    
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Optimize API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}

async function calculateOptimalPricing(trip: Trip, originAirport?: string): Promise<PriceAnalysis> {
  const pricesByDate: PriceData[] = [];
  const today = new Date();
  
  // Get first destination for flight pricing
  const firstStop = trip.stops[0];
  const destinationCode = firstStop ? getCityCodeSync(firstStop.location.city) : null;
  const originCode = originAirport || 'MUC'; // Default to Munich
  
  // Try to get real flight prices from Amadeus
  let amadeusFlightPrices: Record<number, number> = {};
  
  if (isAmadeusConfigured() && destinationCode) {
    console.log('Using Amadeus API for price optimization...');
    
    // Fetch flight prices for each month (sample dates)
    const flightPricePromises = [];
    
    for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
      const checkDate = new Date(today);
      checkDate.setMonth(today.getMonth() + monthOffset);
      // Use the 15th of each month as sample
      checkDate.setDate(15);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      flightPricePromises.push(
        (async () => {
          try {
            // Try price analysis API first
            const analysis = await getFlightPriceAnalysis({
              originIataCode: originCode,
              destinationIataCode: destinationCode,
              departureDate: dateStr,
              currencyCode: 'EUR',
            });
            
            if (analysis?.price?.median) {
              return { month: monthOffset, price: parseFloat(analysis.price.median) };
            }
            
            // Fallback: try actual flight search for that date
            const flights = await searchFlights({
              originLocationCode: originCode,
              destinationLocationCode: destinationCode,
              departureDate: dateStr,
              adults: 1,
              currencyCode: 'EUR',
              max: 3,
            });
            
            if (flights.length > 0) {
              const avgPrice = flights.reduce((sum, f) => sum + parseFloat(f.price.grandTotal), 0) / flights.length;
              return { month: monthOffset, price: avgPrice };
            }
            
            return { month: monthOffset, price: null };
          } catch (error) {
            console.error(`Failed to get flight price for month ${monthOffset}:`, error);
            return { month: monthOffset, price: null };
          }
        })()
      );
    }
    
    try {
      const results = await Promise.all(flightPricePromises);
      results.forEach(({ month, price }) => {
        if (price !== null) {
          amadeusFlightPrices[month] = price;
        }
      });
      console.log(`Retrieved ${Object.keys(amadeusFlightPrices).length} flight prices from Amadeus`);
    } catch (error) {
      console.error('Error fetching Amadeus prices:', error);
    }
  }
  
  // Calculate prices for the next 12 months
  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    const checkDate = new Date(today);
    checkDate.setMonth(today.getMonth() + monthOffset);
    
    const monthIndex = checkDate.getMonth();
    const seasonalMultiplier = SEASONAL_MULTIPLIERS.alpineRegion[monthIndex as keyof typeof SEASONAL_MULTIPLIERS.alpineRegion];
    
    // Calculate total hotel cost for the trip
    const hotelCost = trip.stops.reduce((total, stop) => {
      // Add some variation based on country
      const countryMultiplier = getCountryMultiplier(stop.location.country);
      return total + (BASE_PRICES.hotelPerNight * stop.daysPlanned * seasonalMultiplier * countryMultiplier);
    }, 0);
    
    // Car rental for the entire trip
    const carRentalCost = BASE_PRICES.carRentalPerDay * trip.totalDays * seasonalMultiplier;
    
    // Flight cost - use Amadeus data if available, otherwise estimate
    let flightCost = 0;
    if (originAirport || destinationCode) {
      if (amadeusFlightPrices[monthOffset] !== undefined) {
        // Use real Amadeus price
        flightCost = amadeusFlightPrices[monthOffset];
      } else {
        // Fallback to estimate
        flightCost = BASE_PRICES.flightFromMunich * seasonalMultiplier;
      }
    }
    
    // Add some randomness only if using estimated prices
    const randomVariation = Object.keys(amadeusFlightPrices).length > 0 
      ? 1.0 
      : 0.9 + Math.random() * 0.2;
    
    pricesByDate.push({
      date: new Date(checkDate),
      hotelAvg: Math.round(hotelCost * randomVariation),
      flightPrice: Math.round(flightCost),
      carRentalPerDay: Math.round(BASE_PRICES.carRentalPerDay * seasonalMultiplier * randomVariation),
      total: Math.round((hotelCost + carRentalCost + flightCost) * randomVariation),
    });
  }
  
  // Find the optimal month (lowest total price)
  const sortedByPrice = [...pricesByDate].sort((a, b) => a.total - b.total);
  const optimalMonth = sortedByPrice[0];
  const peakMonth = sortedByPrice[sortedByPrice.length - 1];
  
  // Calculate potential savings
  const estimatedSavings = peakMonth.total - optimalMonth.total;
  
  // Generate recommendations
  const recommendations = generateRecommendations(trip, optimalMonth, pricesByDate);
  
  // Add note about data source
  if (Object.keys(amadeusFlightPrices).length > 0) {
    recommendations.unshift('✈️ Flight prices powered by Amadeus real-time data');
  }
  
  // Calculate breakdown for optimal period
  const breakdown = {
    hotels: Math.round(optimalMonth.hotelAvg),
    flights: Math.round(optimalMonth.flightPrice),
    carRental: Math.round(optimalMonth.carRentalPerDay * trip.totalDays),
    total: Math.round(optimalMonth.total),
  };
  
  return {
    tripId: trip.id,
    analyzedAt: new Date(),
    optimalStartDate: optimalMonth.date,
    optimalEndDate: new Date(optimalMonth.date.getTime() + trip.totalDays * 24 * 60 * 60 * 1000),
    estimatedSavings,
    currency: 'EUR',
    pricesByDate,
    breakdown,
    recommendations,
  };
}

function getCountryMultiplier(country: string): number {
  const multipliers: Record<string, number> = {
    'Germany': 1.0,
    'Austria': 0.95,
    'Switzerland': 1.5, // Switzerland is notably more expensive
    'Italy': 0.9,
    'France': 1.1,
  };
  return multipliers[country] || 1.0;
}

function generateRecommendations(trip: Trip, optimalMonth: PriceData, allPrices: PriceData[]): string[] {
  const recommendations: string[] = [];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  const optimalMonthName = monthNames[optimalMonth.date.getMonth()];
  
  recommendations.push(
    `Best value: Travel in ${optimalMonthName} for the lowest overall prices`
  );
  
  // Check if trip includes Switzerland
  const hasSwiss = trip.stops.some(s => s.location.country === 'Switzerland');
  if (hasSwiss) {
    recommendations.push(
      'Switzerland tip: Consider staying just across the border in Germany or Austria to save on accommodation costs'
    );
  }
  
  // Season-specific tips
  const month = optimalMonth.date.getMonth();
  if (month >= 5 && month <= 8) {
    recommendations.push(
      'Summer advantage: All mountain passes will be open, perfect for scenic Alpine drives'
    );
  } else if (month >= 8 && month <= 10) {
    recommendations.push(
      'Autumn advantage: Fewer tourists, beautiful fall colors, and lower prices than summer'
    );
  } else if (month === 11) {
    recommendations.push(
      'December tip: Experience magical Christmas markets in Munich, Salzburg, and Zurich'
    );
  }
  
  // Duration-based tips
  if (trip.totalDays < 7) {
    recommendations.push(
      'Consider extending your trip by 2-3 days to have more relaxed pace at each stop'
    );
  }
  
  // Booking timing
  recommendations.push(
    'Book hotels 2-3 months in advance for best rates; car rentals 1 month ahead'
  );
  
  return recommendations;
}

