import { Trip, Stop, Location } from '@/types';
import { generateId } from './utils';

// Pre-built sample trip: Munich to Switzerland via Austria
export const MUNICH_ALPS_TRIP: Omit<Trip, 'createdAt' | 'updatedAt'> = {
  id: generateId(),
  name: 'Alpine Adventure: Munich → Switzerland',
  originAirport: {
    code: 'MUC',
    name: 'Munich Airport',
    city: 'Munich',
    country: 'Germany',
    lat: 48.3537,
    lng: 11.7750,
  },
  startDate: null,
  endDate: null,
  totalDays: 11, // Hallstatt is now a stopover, not a full day
  stops: [
    {
      id: generateId(),
      order: 0,
      location: {
        name: 'Munich',
        city: 'Munich',
        country: 'Germany',
        countryCode: 'DE',
        lat: 48.1351,
        lng: 11.5820,
      },
      stopType: 'stay',
      daysPlanned: 1,
      notes: 'Starting point - pick up rental car. Explore Marienplatz and English Garden if time.',
    },
    {
      id: generateId(),
      order: 1,
      location: {
        name: 'Salzburg',
        city: 'Salzburg',
        country: 'Austria',
        countryCode: 'AT',
        lat: 47.8095,
        lng: 13.0550,
      },
      stopType: 'stay',
      daysPlanned: 2,
      notes: 'Mozart\'s birthplace. Visit Hohensalzburg Fortress, Old Town, and Mirabell Gardens. Day trip to Untersberg if weather is good.',
    },
    {
      id: generateId(),
      order: 2,
      location: {
        name: 'Hallstatt',
        city: 'Hallstatt',
        country: 'Austria',
        countryCode: 'AT',
        lat: 47.5622,
        lng: 13.6493,
      },
      stopType: 'stopover',
      daysPlanned: 0,
      stopoverHours: 3,
      notes: 'UNESCO World Heritage lakeside village. Quick photo stop and walk around the village.',
    },
    {
      id: generateId(),
      order: 3,
      location: {
        name: 'Innsbruck',
        city: 'Innsbruck',
        country: 'Austria',
        countryCode: 'AT',
        lat: 47.2692,
        lng: 11.4041,
      },
      stopType: 'stay',
      daysPlanned: 2,
      notes: 'Capital of Tyrol. Take Nordkette cable car for Alpine views. Golden Roof, Imperial Palace. Great base for hiking.',
    },
    {
      id: generateId(),
      order: 4,
      location: {
        name: 'Zürich',
        city: 'Zürich',
        country: 'Switzerland',
        countryCode: 'CH',
        lat: 47.3769,
        lng: 8.5417,
      },
      stopType: 'stay',
      daysPlanned: 2,
      notes: 'Largest Swiss city. Old Town (Altstadt), Lake Zürich promenade, Kunsthaus museum. Consider day trip to Rhine Falls.',
    },
    {
      id: generateId(),
      order: 5,
      location: {
        name: 'Interlaken',
        city: 'Interlaken',
        country: 'Switzerland',
        countryCode: 'CH',
        lat: 46.6863,
        lng: 7.8632,
      },
      stopType: 'stay',
      daysPlanned: 2,
      notes: 'Adventure capital between two lakes. Jungfraujoch "Top of Europe" trip. Lauterbrunnen Valley. Grindelwald hiking.',
    },
    {
      id: generateId(),
      order: 6,
      location: {
        name: 'Lucerne',
        city: 'Lucerne',
        country: 'Switzerland',
        countryCode: 'CH',
        lat: 47.0502,
        lng: 8.3093,
      },
      stopType: 'stay',
      daysPlanned: 2,
      notes: 'Chapel Bridge, Lion Monument, Old Town. Mount Pilatus or Rigi day trip. Lake cruise.',
    },
  ],
  status: 'planning',
};

// Suggested stops database for the region
export const SUGGESTED_DESTINATIONS: Location[] = [
  // Germany
  { name: 'Munich', city: 'Munich', country: 'Germany', countryCode: 'DE', lat: 48.1351, lng: 11.5820 },
  { name: 'Neuschwanstein Castle', city: 'Schwangau', country: 'Germany', countryCode: 'DE', lat: 47.5576, lng: 10.7498 },
  { name: 'Garmisch-Partenkirchen', city: 'Garmisch-Partenkirchen', country: 'Germany', countryCode: 'DE', lat: 47.4919, lng: 11.0953 },
  
  // Austria
  { name: 'Salzburg', city: 'Salzburg', country: 'Austria', countryCode: 'AT', lat: 47.8095, lng: 13.0550 },
  { name: 'Hallstatt', city: 'Hallstatt', country: 'Austria', countryCode: 'AT', lat: 47.5622, lng: 13.6493 },
  { name: 'Innsbruck', city: 'Innsbruck', country: 'Austria', countryCode: 'AT', lat: 47.2692, lng: 11.4041 },
  { name: 'Vienna', city: 'Vienna', country: 'Austria', countryCode: 'AT', lat: 48.2082, lng: 16.3738 },
  { name: 'Zell am See', city: 'Zell am See', country: 'Austria', countryCode: 'AT', lat: 47.3232, lng: 12.7968 },
  { name: 'Grossglockner High Alpine Road', city: 'Heiligenblut', country: 'Austria', countryCode: 'AT', lat: 47.0403, lng: 12.8425 },
  
  // Switzerland
  { name: 'Zürich', city: 'Zürich', country: 'Switzerland', countryCode: 'CH', lat: 47.3769, lng: 8.5417 },
  { name: 'Interlaken', city: 'Interlaken', country: 'Switzerland', countryCode: 'CH', lat: 46.6863, lng: 7.8632 },
  { name: 'Lucerne', city: 'Lucerne', country: 'Switzerland', countryCode: 'CH', lat: 47.0502, lng: 8.3093 },
  { name: 'Grindelwald', city: 'Grindelwald', country: 'Switzerland', countryCode: 'CH', lat: 46.6240, lng: 8.0365 },
  { name: 'Lauterbrunnen', city: 'Lauterbrunnen', country: 'Switzerland', countryCode: 'CH', lat: 46.5936, lng: 7.9086 },
  { name: 'Zermatt', city: 'Zermatt', country: 'Switzerland', countryCode: 'CH', lat: 46.0207, lng: 7.7491 },
  { name: 'Geneva', city: 'Geneva', country: 'Switzerland', countryCode: 'CH', lat: 46.2044, lng: 6.1432 },
  { name: 'Bern', city: 'Bern', country: 'Switzerland', countryCode: 'CH', lat: 46.9480, lng: 7.4474 },
  
  // Italy (for extended trips)
  { name: 'Lake Como', city: 'Como', country: 'Italy', countryCode: 'IT', lat: 45.8081, lng: 9.0852 },
  { name: 'Milan', city: 'Milan', country: 'Italy', countryCode: 'IT', lat: 45.4642, lng: 9.1900 },
];

// Season recommendations
export const SEASON_RECOMMENDATIONS = {
  spring: {
    months: ['March', 'April', 'May'],
    pros: [
      'Fewer tourists than summer',
      'Lower prices on accommodation',
      'Wildflowers in Alpine meadows',
      'Easter markets in late March/April',
    ],
    cons: [
      'Some mountain passes may still be closed',
      'Weather can be unpredictable',
      'Cable cars may have maintenance closures',
    ],
    rating: 4,
  },
  summer: {
    months: ['June', 'July', 'August'],
    pros: [
      'All mountain passes open',
      'Best weather for hiking',
      'Long daylight hours',
      'All attractions operating',
    ],
    cons: [
      'Peak tourist season - very crowded',
      'Highest prices',
      'Book accommodations months in advance',
      'Traffic on popular routes',
    ],
    rating: 3,
  },
  fall: {
    months: ['September', 'October', 'November'],
    pros: [
      'Beautiful fall colors',
      'Lower prices after summer peak',
      'Still good weather in September',
      'Wine festivals in some regions',
    ],
    cons: [
      'Mountain passes start closing late October',
      'Shorter days',
      'Some seasonal attractions close',
    ],
    rating: 5,
  },
  winter: {
    months: ['December', 'January', 'February'],
    pros: [
      'Christmas markets (December)',
      'Skiing opportunities',
      'Magical snowy landscapes',
      'Authentic winter atmosphere',
    ],
    cons: [
      'Most mountain passes closed',
      'Many hiking trails inaccessible',
      'Shorter daylight hours',
      'Winter tires required',
    ],
    rating: 3,
  },
};

// Driving tips for the region
export const DRIVING_TIPS = [
  {
    country: 'Germany',
    flag: '🇩🇪',
    tips: [
      'No general speed limit on Autobahn, but watch for restrictions',
      'Right lane is for driving, left for passing only',
      'Winter tires mandatory from December to February',
    ],
  },
  {
    country: 'Austria',
    flag: '🇦🇹',
    tips: [
      'Vignette (highway sticker) required - buy at border stations or online',
      'Speed limit: 130 km/h on highways, 100 km/h on main roads, 50 km/h in towns',
      'Mountain roads can have tolls (Brenner, Grossglockner)',
    ],
  },
  {
    country: 'Switzerland',
    flag: '🇨🇭',
    tips: [
      'Vignette required for highways (40 CHF annual)',
      'Very strict traffic laws - fines are expensive!',
      'Some mountain passes closed in winter (check conditions)',
      'Parking is expensive in cities - use P+R',
    ],
  },
];

