import requests
from app.config import USGS_URL

def fetch_earthquakes(): 
    try:
        response = requests.get(USGS_URL, timeout=10)
        data = response.json() 

        earth_quakes = []

        for feature in data['features']:
            properties = feature["properties"]
            geometry = feature["geometry"]

            earth_quakes.append({
                "place": properties.get("place"),
                "magnitude": properties.get("mag"),
                "time": properties.get("time"),
                "longitude": geometry["coordinates"][0],
                "latitude": geometry["coordinates"][1],
                "depth": geometry["coordinates"][2]
            })

        return earth_quakes
        
    except Exception as e:
        print("Error fetching data!")
        return []

