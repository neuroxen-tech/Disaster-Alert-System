import time
from app.services.earthquake_service import fetch_earthquakes
from app.services.risk_engine import calculate_risk
from app.config import POLL_INTERVAL
import app.state as state

def background_fetch():
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

        state.cached_data = processed
        print(f"Updated disaster data, fetched {len(processed)} events")

        time.sleep(POLL_INTERVAL)
