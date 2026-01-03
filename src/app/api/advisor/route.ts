import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Trip, TripAnalysis } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the trip advisor
const SYSTEM_PROMPT = `You are an expert road trip advisor specializing in European travel, particularly in Germany, Austria, and Switzerland. You help travelers plan efficient and enjoyable road trips.

Your expertise includes:
- Optimal route planning and stop ordering
- Realistic travel time estimates
- Best times of year to visit different destinations
- Local tips and hidden gems
- Budget optimization
- Driving conditions and mountain passes
- Cultural insights and must-see attractions

When analyzing a trip, consider:
1. Driving distances and times between stops
2. Time needed at each destination (sightseeing, rest)
3. Seasonal factors (weather, crowds, prices)
4. Border crossings and vignettes
5. Mountain road conditions

Always provide practical, actionable advice. Be encouraging but honest about feasibility.`;

export async function POST(request: NextRequest) {
  try {
    const { trip, message, type } = await request.json();
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    if (type === 'analyze') {
      return await analyzeTrip(trip);
    } else if (type === 'chat') {
      return await chatWithAdvisor(trip, message);
    }
    
    return NextResponse.json(
      { error: 'Invalid request type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Advisor API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function analyzeTrip(trip: Trip): Promise<NextResponse> {
  if (!trip || !trip.stops || trip.stops.length === 0) {
    return NextResponse.json(
      { error: 'No trip data provided' },
      { status: 400 }
    );
  }
  
  const tripSummary = formatTripForAI(trip);
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Please analyze this road trip and provide a detailed assessment:

${tripSummary}

Provide your analysis in the following JSON format:
{
  "isFeasible": boolean,
  "feasibilityScore": number (0-100),
  "daysRecommendation": "too_short" | "good" | "too_long",
  "suggestedDays": number,
  "warnings": ["warning1", "warning2"],
  "tips": ["tip1", "tip2", "tip3"],
  "bestTimeToVisit": "description of best months/seasons",
  "estimatedBudget": {
    "low": number,
    "mid": number,
    "high": number,
    "currency": "EUR"
  }
}

Only respond with valid JSON, no additional text.`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });
  
  const analysisText = completion.choices[0].message.content;
  
  try {
    const analysis: TripAnalysis = JSON.parse(analysisText || '{}');
    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse analysis' },
      { status: 500 }
    );
  }
}

async function chatWithAdvisor(trip: Trip, userMessage: string): Promise<NextResponse> {
  const tripContext = trip && trip.stops?.length > 0 
    ? `Current trip plan:\n${formatTripForAI(trip)}\n\n` 
    : 'No trip planned yet.\n\n';
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `${tripContext}User question: ${userMessage}`
      }
    ],
    temperature: 0.7,
    max_tokens: 500,
  });
  
  const response = completion.choices[0].message.content;
  
  return NextResponse.json({ 
    message: response,
    role: 'assistant'
  });
}

function formatTripForAI(trip: Trip): string {
  const lines = [
    `Trip Name: ${trip.name}`,
    `Total Days Planned: ${trip.totalDays}`,
    `Number of Stops: ${trip.stops.length}`,
    '',
    'Stops:',
  ];
  
  trip.stops.forEach((stop, index) => {
    lines.push(`${index + 1}. ${stop.location.name}, ${stop.location.country}`);
    lines.push(`   - Days planned: ${stop.daysPlanned}`);
    lines.push(`   - Coordinates: ${stop.location.lat.toFixed(4)}, ${stop.location.lng.toFixed(4)}`);
    if (stop.notes) {
      lines.push(`   - Notes: ${stop.notes}`);
    }
  });
  
  if (trip.startDate) {
    lines.push('');
    lines.push(`Start Date: ${new Date(trip.startDate).toLocaleDateString()}`);
  }
  
  return lines.join('\n');
}

