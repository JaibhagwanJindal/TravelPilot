import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination');

  if (!destination) {
    return NextResponse.json({ success: false, error: 'Destination is required' }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.warn("OPENWEATHERMAP_API_KEY is not set. Returning mock weather data.");
    // Return mock data so the app doesn't break if they haven't set the key yet.
    return NextResponse.json({
      success: true,
      data: {
        temp: 22,
        condition: "Clear",
        description: "clear sky",
        isRaining: false,
        alerts: []
      }
    });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destination)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch weather data');
    }

    const condition = data.weather[0]?.main || 'Unknown';
    const description = data.weather[0]?.description || '';
    const isRaining = condition === 'Rain' || condition === 'Drizzle' || condition === 'Thunderstorm';
    
    // OpenWeatherMap standard endpoint doesn't include alerts. 
    // We'd need the OneCall API for real alerts, so we'll do a simple mock based on wind or extreme conditions.
    const alerts = [];
    if (data.wind?.speed > 20) {
      alerts.push("High wind warning");
    }
    if (data.main?.temp > 35) {
      alerts.push("Extreme heat warning");
    }

    return NextResponse.json({
      success: true,
      data: {
        temp: Math.round(data.main?.temp),
        condition,
        description,
        isRaining,
        alerts,
        icon: data.weather[0]?.icon
      }
    });
  } catch (error: any) {
    console.error("Error fetching weather:", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch weather' }, { status: 500 });
  }
}
