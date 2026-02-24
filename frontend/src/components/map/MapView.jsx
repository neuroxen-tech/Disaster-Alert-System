import React, { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';

// Define custom icons based on risk
const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        // Multiple triggers to ensure layout is stable
        const resize = () => {
            if (map && map.getContainer()) {
                map.invalidateSize();
            }
        };

        const timer1 = setTimeout(resize, 100);
        const timer2 = setTimeout(resize, 500);
        const timer3 = setTimeout(resize, 1000);

        window.addEventListener('resize', resize);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            window.removeEventListener('resize', resize);
        };
    }, [map]);
    return null;
};

const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, Math.max(map.getZoom(), 4), {
                animate: true,
                duration: 1.5
            });
        }
    }, [center, map]);
    return null;
};

const createRiskIcon = (risk) => {
    const pinColors = {
        High: '#f97316',
        Medium: '#eab308',
        Low: '#22c55e',
    };
    const color = pinColors[risk] || '#64748b';

    return L.divIcon({
        className: 'custom-pin',
        html: `<svg viewBox="0 0 24 24" width="24" height="24" fill="${color}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
               </svg>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -20]
    });
};

const LocationMarker = ({ lat, lon }) => {
    return null; // The circle itself will serve as the marker, or we can use a separate one
};

const MapEvents = ({ onLocationChange }) => {
    const map = useMapEvents({
        dragend: () => {
            const center = map.getCenter();
            onLocationChange(center.lat, center.lng);
        },
        click: (e) => {
            onLocationChange(e.latlng.lat, e.latlng.lng);
        }
    });
    return null;
};

const MapView = ({ events, userLat, userLon, radius, onMarkerClick, onLocationChange }) => {
    const defaultCenter = [20.5937, 78.9629]; // India Center as fallback
    const center = userLat && userLon ? [userLat, userLon] : defaultCenter;

    return (
        <div className="map-container">
            <MapContainer
                center={center}
                zoom={2.5}
                minZoom={2}
                maxZoom={18}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
                attributionControl={true}
                worldCopyJump={true}
            >
                <MapResizer />
                <MapController center={center} />
                <MapEvents onLocationChange={onLocationChange} />
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"
                    attribution='Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC'
                    noWrap={false}
                />

                {userLat && userLon && (
                    <Marker
                        position={[userLat, userLon]}
                        icon={L.divIcon({
                            className: 'custom-marker',
                            html: `<div style="width: 16px; height: 16px; background: #3b82f6; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #3b82f6;"></div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8],
                        })}
                    />
                )}

                {userLat && userLon && radius && (
                    <Circle
                        center={[userLat, userLon]}
                        radius={radius * 1000} /* Leaflet radius is in meters */
                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2, dashArray: '5, 10' }}
                    />
                )}

                {events.map((event, idx) => {
                    if (!event.latitude || !event.longitude) return null;

                    // Calculate impact radius based on magnitude (e.g., Mag 5.0 -> ~50km)
                    // The formula is arbitrary, but an exponential curve fits map visuals well
                    const eventRadius = Math.max(5000, Math.pow(1.8, event.magnitude) * 5000);
                    const riskColor = event.risk === 'High' ? '#ef4444' : event.risk === 'Medium' ? '#f59e0b' : '#10b981';

                    return (
                        <React.Fragment key={idx}>
                            <Circle
                                center={[event.latitude, event.longitude]}
                                radius={eventRadius}
                                pathOptions={{
                                    color: riskColor,
                                    fillColor: riskColor,
                                    fillOpacity: 0.15,
                                    weight: 1,
                                    opacity: 0.5
                                }}
                            />
                            <Marker
                                position={[event.latitude, event.longitude]}
                                icon={createRiskIcon(event.risk)}
                                eventHandlers={{
                                    click: () => {
                                        if (onMarkerClick) onMarkerClick(event);
                                    },
                                }}
                            >
                                <Popup>
                                    <div className="popup-content">
                                        <h3>{event.place}</h3>
                                        <p>Magnitude: <span>{event.magnitude}</span></p>
                                        <p>Risk: <span className={`risk-badge badge-${event.risk}`}>{event.risk}</span></p>
                                        <p>Depth: <span>{event.depth} km</span></p>
                                        {event.distance_km && <p>Distance: <span>{event.distance_km} km</span></p>}
                                        <p>Time: <span>{new Date(event.time).toLocaleString()}</span></p>
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default MapView;
