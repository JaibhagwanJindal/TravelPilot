import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    
    // TODO: Implement weather API integration (e.g., OpenWeatherMap)
    
    return NextResponse.json({ 
      success: true, 
      location: location || 'unknown',
      weather: {
        temp: 22,
        condition: 'Sunny',
        forecast: 'Clear skies'
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch weather' }, { status: 500 });
  }
}
