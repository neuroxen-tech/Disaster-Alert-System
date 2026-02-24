import asyncio
import threading
import time

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.services.earthquake_service import fetch_earthquakes
from app.services.risk_engine import calculate_risk
from app.services.websocket_manager import ConnectionManager
from app.utils.distance import haversine
from app.config import POLL_INTERVAL, ALERT_RADIUS_KM
from typing import Optional

app = FastAPI()
manager = ConnectionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cached_data = []

# Location will be passed dynamically from frontend query params
# Removing fixed USER_LAT and USER_LON

def background_fetch():
    global cached_data

    while True:
        earthquakes = fetch_earthquakes()
        processed = []

        if earthquakes:
            for eq in earthquakes:
                magnitude = eq.get("magnitude")
                eq_lat = eq.get("latitude")
                eq_lon = eq.get("longitude")
    
                if magnitude is None or eq_lat is None or eq_lon is None:
                    continue
    
                risk = calculate_risk(magnitude)
    
                processed.append({
                    "place": eq["place"],
                    "magnitude": magnitude,
                    "depth": eq["depth"],
                    "risk": risk,
                    "latitude": eq_lat,
                    "longitude": eq_lon,
                    "time": eq["time"]
                })

        cached_data = processed
        print(f"Updated disaster data, fetched {len(processed)} events")

        time.sleep(POLL_INTERVAL)


threading.Thread(target=background_fetch, daemon=True).start()


@app.get("/health")
def health_check():
    return {"status": "running"}

@app.get("/data")
def get_data(lat: Optional[float] = None, lon: Optional[float] = None, radius: Optional[float] = ALERT_RADIUS_KM):
    if lat is not None and lon is not None:
        filtered = []
        for eq in cached_data:
            dist = haversine(lat, lon, eq["latitude"], eq["longitude"])
            if dist <= radius:
                # Add distance field for the client
                eq_filtered = dict(eq)
                eq_filtered["distance_km"] = round(dist, 2)
                filtered.append(eq_filtered)
        
        # Sort by most recent
        filtered.sort(key=lambda x: x["time"], reverse=True)
        return {
            "count": len(filtered),
            "events": filtered
        }

    # If no region given, return sorted global data
    sorted_data = sorted(cached_data, key=lambda x: x["time"], reverse=True)
    return {
        "count": len(sorted_data),
        "events": sorted_data
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            await manager.broadcast(cached_data)
            await asyncio.sleep(2)
    except:
        manager.disconnect(websocket)