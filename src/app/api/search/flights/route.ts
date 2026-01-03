import { NextRequest, NextResponse } from 'next/server';
import { 
  searchFlights, 
  isAmadeusConfigured, 
  getCityCodeSync, 
  getAirlineName,
  formatFlightDuration,
  parseDuration,
  AmadeusFlightOffer 
} from '@/lib/amadeus';

export interface FlightResult {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departure: {
    airport: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    time: string;
    date: string;
  };
  duration: string;
  durationMinutes: number;
  stops: number;
  price: number;
  currency: string;
  cabinClass: string;
  seatsAvailable: number;
  bookingUrl: string;
  segments: {
    departure: { airport: string; time: string };
    arrival: { airport: string; time: string };
    airline: string;
    flightNumber: string;
    duration: string;
  }[];
}

// Mock flight data for when Amadeus is not configured
const MOCK_FLIGHTS: Record<string, FlightResult[]> = {
  'MUC-VIE': [
    {
      id: 'lh-muc-vie-1',
      airline: 'Lufthansa',
      airlineCode: 'LH',
      flightNumber: 'LH1234',
      departure: { airport: 'MUC', time: '08:00', date: '2024-06-15' },
      arrival: { airport: 'VIE', time: '09:10', date: '2024-06-15' },
      duration: '1h 10m',
      durationMinutes: 70,
      stops: 0,
      price: 89,
      currency: 'EUR',
      cabinClass: 'ECONOMY',
      seatsAvailable: 9,
      bookingUrl: 'https://www.lufthansa.com',
      segments: [
        { departure: { airport: 'MUC', time: '08:00' }, arrival: { airport: 'VIE', time: '09:10' }, airline: 'Lufthansa', flightNumber: 'LH1234', duration: '1h 10m' }
      ],
    },
    {
      id: 'os-muc-vie-1',
      airline: 'Austrian Airlines',
      airlineCode: 'OS',
      flightNumber: 'OS112',
      departure: { airport: 'MUC', time: '14:30', date: '2024-06-15' },
      arrival: { airport: 'VIE', time: '15:40', date: '2024-06-15' },
      duration: '1h 10m',
      durationMinutes: 70,
      stops: 0,
      price: 75,
      currency: 'EUR',
      cabinClass: 'ECONOMY',
      seatsAvailable: 5,
      bookingUrl: 'https://www.austrian.com',
      segments: [
        { departure: { airport: 'MUC', time: '14:30' }, arrival: { airport: 'VIE', time: '15:40' }, airline: 'Austrian Airlines', flightNumber: 'OS112', duration: '1h 10m' }
      ],
    },
  ],
  'MUC-ZRH': [
    {
      id: 'lx-muc-zrh-1',
      airline: 'Swiss International',
      airlineCode: 'LX',
      flightNumber: 'LX1105',
      departure: { airport: 'MUC', time: '07:15', date: '2024-06-15' },
      arrival: { airport: 'ZRH', time: '08:15', date: '2024-06-15' },
      duration: '1h 00m',
      durationMinutes: 60,
      stops: 0,
      price: 125,
      currency: 'EUR',
      cabinClass: 'ECONOMY',
      seatsAvailable: 4,
      bookingUrl: 'https://www.swiss.com',
      segments: [
        { departure: { airport: 'MUC', time: '07:15' }, arrival: { airport: 'ZRH', time: '08:15' }, airline: 'Swiss International', flightNumber: 'LX1105', duration: '1h 00m' }
      ],
    },
    {
      id: 'lh-muc-zrh-1',
      airline: 'Lufthansa',
      airlineCode: 'LH',
      flightNumber: 'LH2554',
      departure: { airport: 'MUC', time: '11:45', date: '2024-06-15' },
      arrival: { airport: 'ZRH', time: '12:45', date: '2024-06-15' },
      duration: '1h 00m',
      durationMinutes: 60,
      stops: 0,
      price: 110,
      currency: 'EUR',
      cabinClass: 'ECONOMY',
      seatsAvailable: 7,
      bookingUrl: 'https://www.lufthansa.com',
      segments: [
        { departure: { airport: 'MUC', time: '11:45' }, arrival: { airport: 'ZRH', time: '12:45' }, airline: 'Lufthansa', flightNumber: 'LH2554', duration: '1h 00m' }
      ],
    },
  ],
};

export async function POST(request: NextRequest) {
  try {
    const { 
      origin, 
      destination, 
      departureDate, 
      returnDate,
      passengers = 1,
      cabinClass = 'ECONOMY',
      directOnly = false,
      maxPrice,
    } = await request.json();
    
    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        { error: 'Origin, destination, and departure date are required' },
        { status: 400 }
      );
    }
    
    let flights: FlightResult[] = [];
    
    // Get IATA codes
    const originCode = getCityCodeSync(origin) || origin;
    const destinationCode = getCityCodeSync(destination) || destination;
    
    // Try Amadeus API first if configured
    if (isAmadeusConfigured()) {
      try {
        const amadeusFlights = await searchFlights({
          originLocationCode: originCode,
          destinationLocationCode: destinationCode,
          departureDate,
          returnDate,
          adults: passengers,
          travelClass: cabinClass,
          nonStop: directOnly,
          maxPrice,
          currencyCode: 'EUR',
          max: 20,
        });
        
        flights = transformAmadeusFlights(amadeusFlights, departureDate);
      } catch (amadeusError) {
        console.error('Amadeus flight search failed, using mock data:', amadeusError);
        flights = getMockFlights(originCode, destinationCode, departureDate);
      }
    } else {
      // Amadeus not configured, use mock data
      flights = getMockFlights(originCode, destinationCode, departureDate);
    }
    
    return NextResponse.json({
      results: flights,
      totalCount: flights.length,
      origin: originCode,
      destination: destinationCode,
    });
  } catch (error) {
    console.error('Flight search error:', error);
    return NextResponse.json(
      { error: 'Failed to search flights' },
      { status: 500 }
    );
  }
}

function transformAmadeusFlights(amadeusFlights: AmadeusFlightOffer[], departureDate: string): FlightResult[] {
  return amadeusFlights.map((offer) => {
    const outbound = offer.itineraries[0];
    const firstSegment = outbound.segments[0];
    const lastSegment = outbound.segments[outbound.segments.length - 1];
    
    const departureTime = new Date(firstSegment.departure.at);
    const arrivalTime = new Date(lastSegment.arrival.at);
    
    return {
      id: offer.id,
      airline: getAirlineName(offer.validatingAirlineCodes[0]),
      airlineCode: offer.validatingAirlineCodes[0],
      flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
      departure: {
        airport: firstSegment.departure.iataCode,
        time: departureTime.toTimeString().slice(0, 5),
        date: departureTime.toISOString().split('T')[0],
      },
      arrival: {
        airport: lastSegment.arrival.iataCode,
        time: arrivalTime.toTimeString().slice(0, 5),
        date: arrivalTime.toISOString().split('T')[0],
      },
      duration: formatFlightDuration(outbound.duration),
      durationMinutes: parseDuration(outbound.duration),
      stops: outbound.segments.length - 1,
      price: parseFloat(offer.price.grandTotal),
      currency: offer.price.currency,
      cabinClass: offer.travelerPricings[0]?.fareOption || 'ECONOMY',
      seatsAvailable: offer.numberOfBookableSeats,
      bookingUrl: `https://www.amadeus.com/flights/${offer.id}`,
      segments: outbound.segments.map((seg) => ({
        departure: { 
          airport: seg.departure.iataCode, 
          time: new Date(seg.departure.at).toTimeString().slice(0, 5) 
        },
        arrival: { 
          airport: seg.arrival.iataCode, 
          time: new Date(seg.arrival.at).toTimeString().slice(0, 5) 
        },
        airline: getAirlineName(seg.carrierCode),
        flightNumber: `${seg.carrierCode}${seg.number}`,
        duration: formatFlightDuration(seg.duration),
      })),
    };
  });
}

function getMockFlights(origin: string, destination: string, departureDate: string): FlightResult[] {
  const routeKey = `${origin}-${destination}`;
  const reverseRouteKey = `${destination}-${origin}`;
  
  let flights = MOCK_FLIGHTS[routeKey] || MOCK_FLIGHTS[reverseRouteKey] || [];
  
  // If no specific route, generate generic flights
  if (flights.length === 0) {
    flights = [
      {
        id: `mock-${origin}-${destination}-1`,
        airline: 'Lufthansa',
        airlineCode: 'LH',
        flightNumber: 'LH' + Math.floor(Math.random() * 9000 + 1000),
        departure: { airport: origin, time: '09:00', date: departureDate },
        arrival: { airport: destination, time: '11:00', date: departureDate },
        duration: '2h 00m',
        durationMinutes: 120,
        stops: 0,
        price: 120 + Math.floor(Math.random() * 80),
        currency: 'EUR',
        cabinClass: 'ECONOMY',
        seatsAvailable: 5,
        bookingUrl: 'https://www.lufthansa.com',
        segments: [
          { departure: { airport: origin, time: '09:00' }, arrival: { airport: destination, time: '11:00' }, airline: 'Lufthansa', flightNumber: 'LH1234', duration: '2h 00m' }
        ],
      },
      {
        id: `mock-${origin}-${destination}-2`,
        airline: 'easyJet',
        airlineCode: 'U2',
        flightNumber: 'U2' + Math.floor(Math.random() * 9000 + 1000),
        departure: { airport: origin, time: '14:30', date: departureDate },
        arrival: { airport: destination, time: '16:45', date: departureDate },
        duration: '2h 15m',
        durationMinutes: 135,
        stops: 0,
        price: 55 + Math.floor(Math.random() * 40),
        currency: 'EUR',
        cabinClass: 'ECONOMY',
        seatsAvailable: 12,
        bookingUrl: 'https://www.easyjet.com',
        segments: [
          { departure: { airport: origin, time: '14:30' }, arrival: { airport: destination, time: '16:45' }, airline: 'easyJet', flightNumber: 'U25678', duration: '2h 15m' }
        ],
      },
    ];
  }
  
  // Update dates in mock data
  return flights.map(f => ({
    ...f,
    departure: { ...f.departure, date: departureDate },
    arrival: { ...f.arrival, date: departureDate },
  }));
}

