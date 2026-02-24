import os
from dotenv import load_dotenv

load_dotenv()

USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"

POLL_INTERVAL = 60  # seconds
ALERT_RADIUS_KM = 300  # distance filter