import React, { useState, useEffect, useRef } from 'react';
import MapView from './components/map/MapView';
import AlertCard from './components/alerts/AlertCard';
import { fetchDisasterData } from './services/api';

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLat, setUserLat] = useState(null);
  const [userLon, setUserLon] = useState(null);
  const [radius, setRadius] = useState(2500); // Default 2500km
  const [locationError, setLocationError] = useState(null);

  // Refs for real-time filtering without triggering re-connections
  const userLatRef = useRef(userLat);
  const userLonRef = useRef(userLon);
  const radiusRef = useRef(radius);

  // Keep refs in sync with state
  useEffect(() => {
    userLatRef.current = userLat;
    userLonRef.current = userLon;
    radiusRef.current = radius;
  }, [userLat, userLon, radius]);

  useEffect(() => {
    // Get user location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude);
          setUserLon(position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Could not retrieve precise location. Showing global events.");
          // Fallback to fetch global data
          fetchData(null, null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocationError("Geolocation is not supported. Showing global events.");
      fetchData(null, null);
    }
  }, []);

  // Handle manual location selection via map interactions
  const handleLocationChange = (lat, lon) => {
    setUserLat(lat);
    setUserLon(lon);
    userLatRef.current = lat;
    userLonRef.current = lon;

    // Re-calculate distances and sort without fetching global data again
    setEvents(prevEvents => {
      const updated = prevEvents.map(eq => ({
        ...eq,
        distance_km: getDistance(lat, lon, eq.latitude, eq.longitude).toFixed(2)
      }));
      // Sort by distance
      return [...updated].sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));
    });
  };

  const fetchData = async () => {
    setLoading(true);
    // Always fetch global data to ensure we have something to show
    const data = await fetchDisasterData(null, null, null);
    if (data && data.events) {
      // If we have user location, calculate distance and sort
      if (userLatRef.current && userLonRef.current) {
        const globalEvents = data.events.map(eq => ({
          ...eq,
          distance_km: getDistance(userLatRef.current, userLonRef.current, eq.latitude, eq.longitude).toFixed(2)
        }));

        setEvents(globalEvents);
      } else {
        setEvents(data.events);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userLat, userLon]); // Re-fetch or re-calculate when location changes

  // WebSocket for Real-time Updates
  useEffect(() => {
    // Derive WS URL from API URL so we don't need to configure both ports
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = import.meta.env.VITE_WS_URL || apiUrl.replace('http', 'ws') + '/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      try {
        const fullData = JSON.parse(event.data);
        const currentLat = userLatRef.current;
        const currentLon = userLonRef.current;
        const currentRadius = radiusRef.current;

        let filtered = fullData;
        if (currentLat && currentLon) {
          filtered = fullData.map(eq => {
            const dist = getDistance(currentLat, currentLon, eq.latitude, eq.longitude);
            return { ...eq, distance_km: dist.toFixed(2) };
          });

          // Sort by distance if they are within or near radius, otherwise by time
          filtered.sort((a, b) => {
            const aInRadius = a.distance_km <= currentRadius;
            const bInRadius = b.distance_km <= currentRadius;
            if (aInRadius && !bInRadius) return -1;
            if (!aInRadius && bInRadius) return 1;
            return b.time - a.time;
          });
        } else {
          filtered.sort((a, b) => b.time - a.time);
        }

        setEvents(filtered);
      } catch (err) {
        console.error("WS parse error: ", err);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, []); // Only run once on mount

  const handleRadiusChange = (e) => {
    setRadius(Number(e.target.value));
  };

  return (
    <>
      <header className="header">
        <h1>Global Disaster Alert System</h1>
      </header>

      <div className="main-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Recent Alerts</h2>
            <p>{events.length} active events detected (last 24h)</p>
            {locationError && <p style={{ color: '#ef4444', marginTop: '4px', fontSize: '0.75rem' }}>{locationError}</p>}

            <div className="radius-control">
              <div className="radius-header">
                <label htmlFor="radius-slider">Alert Radius</label>
                <span>{radius} km</span>
              </div>
              <input
                id="radius-slider"
                type="range"
                min="500"
                max="10000"
                step="500"
                value={radius}
                onChange={handleRadiusChange}
                disabled={userLat === null}
                className="slider"
              />
              {userLat === null && <small>Location needed to filter by distance.</small>}
            </div>
          </div>

          <div className="sidebar-content">
            {loading ? (
              <div className="empty-state">
                <div className="spinner"></div>
                <p>Scanning global sensors...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="empty-state">
                <p>No significant events detected in your region.</p>
              </div>
            ) : (
              events.map((event, idx) => (
                <AlertCard
                  key={idx}
                  event={event}
                  onClick={(e) => handleLocationChange(e.latitude, e.longitude)}
                />
              ))
            )}
          </div>
        </aside>

        <main className="map-container">
          <MapView
            events={events}
            userLat={userLat}
            userLon={userLon}
            radius={radius}
            onLocationChange={handleLocationChange}
          />
        </main>
      </div>
    </>
  );
}

export default App;
