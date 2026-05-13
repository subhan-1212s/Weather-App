import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Wind, 
  Droplets, 
  Thermometer, 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudLightning,
  Navigation,
  MapPin
} from 'lucide-react';
import './index.css';

const API_KEY = 'd72af36fb7f6b091e31ed6713d18d949'; // Public demo key (OpenWeatherMap)
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWeather = async (searchCity) => {
    if (!searchCity) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `${BASE_URL}?q=${searchCity}&units=metric&appid=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('City not found');
      }
      
      const data = await response.json();
      setWeather(data);
    } catch (err) {
      setError(err.message);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch for a default city
    fetchWeather('London');
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWeather(city);
  };

  const getWeatherIcon = (main) => {
    switch (main.toLowerCase()) {
      case 'clouds': return <Cloud size={80} className="weather-icon-glow" />;
      case 'rain': return <CloudRain size={80} className="weather-icon-glow" />;
      case 'clear': return <Sun size={80} className="weather-icon-glow" />;
      case 'thunderstorm': return <CloudLightning size={80} className="weather-icon-glow" />;
      default: return <Cloud size={80} className="weather-icon-glow" />;
    }
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <Navigation size={32} color="#38bdf8" />
          <h1>SkyCast</h1>
        </div>
        
        <form onSubmit={handleSearch} className="search-container">
          <input
            type="text"
            placeholder="Search city..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? '...' : <Search size={20} />}
          </button>
        </form>
      </header>

      {error && <div className="error-message">{error}</div>}

      {weather && (
        <div className="glass-card weather-info">
          <div className="main-weather">
            <div className="location">
              <MapPin size={20} />
              <span>{weather.name}, {weather.sys.country}</span>
            </div>
            
            <div className="icon-temp-group">
              {getWeatherIcon(weather.weather[0].main)}
              <h2 className="temp">{Math.round(weather.main.temp)}°C</h2>
            </div>
            
            <p className="description">{weather.weather[0].description}</p>
            <p className="feels-like">Feels like {Math.round(weather.main.feels_like)}°C</p>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <Droplets size={24} color="#38bdf8" />
              <span className="detail-label">Humidity</span>
              <span className="detail-value">{weather.main.humidity}%</span>
            </div>
            
            <div className="detail-item">
              <Wind size={24} color="#38bdf8" />
              <span className="detail-label">Wind Speed</span>
              <span className="detail-value">{weather.wind.speed} m/s</span>
            </div>
            
            <div className="detail-item">
              <Thermometer size={24} color="#38bdf8" />
              <span className="detail-label">Pressure</span>
              <span className="detail-value">{weather.main.pressure} hPa</span>
            </div>
            
            <div className="detail-item">
              <Cloud size={24} color="#38bdf8" />
              <span className="detail-label">Cloudiness</span>
              <span className="detail-value">{weather.clouds.all}%</span>
            </div>
          </div>
        </div>
      )}

      <footer>
        <p>Powered by OpenWeatherMap API</p>
      </footer>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .app-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        
        header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2rem;
          gap: 1.5rem;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .logo h1 {
          margin: 0;
          font-size: 2rem;
          background: linear-gradient(to right, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .location {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          color: #fff;
          margin-bottom: 1rem;
        }
        
        .icon-temp-group {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        
        .weather-icon-glow {
          filter: drop-shadow(0 0 15px rgba(56, 189, 248, 0.4));
        }
        
        .feels-like {
          color: #64748b;
          font-size: 1rem;
        }
        
        footer {
          margin-top: 3rem;
          color: #475569;
          font-size: 0.875rem;
        }
        
        @media (max-width: 640px) {
          .icon-temp-group {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .temp {
            font-size: 4rem;
          }
        }
      `}} />
    </div>
  );
}

export default App;
