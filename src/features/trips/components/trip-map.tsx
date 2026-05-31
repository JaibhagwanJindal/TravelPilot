"use client"

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function TripMap({ days }: { days: any[] }) {
  // Extract all activities with coordinates
  const markers: { lat: number, lng: number, title: string, day: number }[] = [];
  
  days.forEach(day => {
    day.activities?.forEach((activity: any) => {
      if (activity.lat && activity.lng) {
        markers.push({
          lat: activity.lat,
          lng: activity.lng,
          title: activity.title,
          day: day.day
        });
      }
    });
  });

  if (markers.length === 0) {
    return (
      <div className="h-64 w-full rounded-md border flex items-center justify-center bg-muted/50 text-muted-foreground">
        No map data available for this trip.
      </div>
    );
  }

  // Calculate center
  const centerLat = markers.reduce((acc, curr) => acc + curr.lat, 0) / markers.length;
  const centerLng = markers.reduce((acc, curr) => acc + curr.lng, 0) / markers.length;

  return (
    <div className="h-[400px] w-full rounded-md overflow-hidden border">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={13} 
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker, idx) => (
          <Marker key={idx} position={[marker.lat, marker.lng]} icon={icon}>
            <Popup>
              <strong>Day {marker.day}</strong><br/>
              {marker.title}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
