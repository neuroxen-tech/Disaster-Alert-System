import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const fetchDisasterData = async (lat, lon, radius) => {
    try {
        const params = {};
        if (lat !== null && lon !== null) {
            params.lat = lat;
            params.lon = lon;
            if (radius) params.radius = radius;
        }
        const response = await axios.get(`${API_URL}/data`, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching data:", error);
        return { count: 0, events: [] };
    }
};
