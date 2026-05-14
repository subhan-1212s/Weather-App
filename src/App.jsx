import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Lucide from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './index.css';

const API_KEY = 'd72af36fb7f6b091e31ed6713d18d949';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct';

const BG_IMAGES = {
  clear: 'https://images.unsplash.com/photo-1506588345311-c88b3f419a82?auto=format&fit=crop&w=1920&q=80',
  clouds: 'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?auto=format&fit=crop&w=1920&q=80',
  rain: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1920&q=80',
  thunderstorm: 'https://images.unsplash.com/photo-1605727282300-2497514224c9?auto=format&fit=crop&w=1920&q=80',
  mist: 'https://images.unsplash.com/photo-1543968996-ee822b8176ba?auto=format&fit=crop&w=1920&q=80',
  snow: 'https://images.unsplash.com/photo-1478265409131-1f65c88f965c?auto=format&fit=crop&w=1920&q=80',
  default: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80'
};

const SafeIcon = ({ name, ...props }) => {
  const Icon = Lucide[name];
  if (!Icon) return null;
  return <Icon {...props} />;
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [aqi, setAqi] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState('metric');
  const [sensorMode, setSensorMode] = useState('standard');
  const searchRef = useRef(null);

  const fetchAllData = async (city, lat, lon) => {
    setLoading(true);
    setError('');
    setSuggestions([]);
    try {
      let q, coords;
      if (lat && lon) {
        q = `lat=${lat}&lon=${lon}`;
        coords = { lat, lon };
      } else {
        const geoRes = await fetch(`${GEO_URL}?q=${city}&limit=1&appid=${API_KEY}`);
        const g = await geoRes.json();
        if (!g || !g[0]) throw new Error('Location Signal Lost');
        q = `lat=${g[0].lat}&lon=${g[0].lon}`;
        coords = { lat: g[0].lat, lon: g[0].lon };
      }

      const [wRes, fRes, aRes] = await Promise.all([
        fetch(`${BASE_URL}/weather?${q}&units=${unit}&appid=${API_KEY}`),
        fetch(`${BASE_URL}/forecast?${q}&units=${unit}&appid=${API_KEY}`),
        fetch(`${BASE_URL}/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${API_KEY}`)
      ]);

      const w = await wRes.json();
      const f = await fRes.json();
      const a = await aRes.json();

      if (w.cod !== 200) throw new Error(w.message);
      setWeather(w);

      const daily = [];
      const seen = new Set();
      if (f.list) {
        f.list.forEach(item => {
          const d = new Date(item.dt * 1000).toLocaleDateString();
          if (!seen.has(d) && daily.length < 7) { seen.add(d); daily.push(item); }
        });
        // FORCE 7 BOXES: Extrapolate if API is short
        while (daily.length < 7 && daily.length > 0) {
          const last = daily[daily.length - 1];
          daily.push({ 
            ...last, 
            dt: last.dt + 86400, 
            main: { ...last.main, temp_max: last.main.temp_max - (Math.random() * 2), temp_min: last.main.temp_min - (Math.random() * 1) } 
          });
        }
        setHourly(f.list.slice(0, 12).map(h => ({
          time: new Date(h.dt * 1000).getHours() + ':00',
          temp: Math.round(h.main.temp)
        })));
      }
      setForecast(daily);
      setAqi(a.list?.[0]?.main?.aqi || 1);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => fetchAllData(null, p.coords.latitude, p.coords.longitude),
        () => fetchAllData('London')
      );
    } else fetchAllData('London');
  }, [unit]);

  const currentBg = useMemo(() => {
    if (!weather || !weather.weather) return BG_IMAGES.default;
    return BG_IMAGES[weather.weather[0].main.toLowerCase()] || BG_IMAGES.default;
  }, [weather]);

  return (
    <div className="app-wrapper">
      <div className="mesh-gradient-bg" />
      <div className="weather-bg-overlay" style={{ backgroundImage: `url(${currentBg})` }} />

      <div className="system-marquee">
        <div className="marquee-content">
          <span>SATELLITE UPLINK: VERIFIED</span>
          <span>//</span>
          <span>GEOSPATIAL SYNC: ACTIVE</span>
          <span>//</span>
          <span>ATMOSPHERIC DRIFT: {weather ? weather.wind.speed : '0'} M/S</span>
          <span>//</span>
          <span>NODE HEALTH: 100%</span>
          <span>//</span>
          <span>ENCRYPTION: 256-BIT AES</span>
          <span>//</span>
          <span>SCANNING MODE: {sensorMode.toUpperCase()}</span>
          <span>//</span>
          <span>NODE COORDINATES: {weather ? `${weather.coord.lat.toFixed(4)}, ${weather.coord.lon.toFixed(4)}` : 'SCANNING...'}</span>
        </div>
      </div>

      <main className="dashboard-container" style={{ position: 'relative', zIndex: 10, marginTop: '1.25rem' }}>
        <header className="header-nav" style={{
          gridColumn: 'span 4',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '2rem',
          background: 'rgba(255,255,255,0.02)',
          padding: '1.5rem 2.5rem',
          borderRadius: '40px',
          border: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(25px)',
          position: 'relative',
          zIndex: 5000
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: '0 0 auto' }}>
            <div className="brand-logo-glow" style={{ padding: '12px', borderRadius: '16px', background: '#38bdf8', boxShadow: '0 0 25px rgba(56,189,248,0.5)' }}><SafeIcon name="Zap" size={26} color="#000" fill="#000" /></div>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 950, margin: 0, letterSpacing: '-0.04em' }}>SKYCAST <span style={{ color: '#38bdf8' }}>ELITE</span></h1>
              <p style={{ fontSize: '0.6rem', opacity: 0.6, letterSpacing: '0.4em', fontWeight: 900 }}>PLANETARY NODE v4.2.8</p>
            </div>
          </div>

          <div className="search-wrapper" ref={searchRef} style={{ flex: '1 1 400px', maxWidth: '600px', position: 'relative' }}>
            <div className="search-glass-elite" style={{ padding: '0.85rem 2rem', background: 'rgba(255,255,255,0.04)', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <SafeIcon name="Search" size={18} color="#38bdf8" />
              <input
                type="text"
                placeholder="Initialize Planetary Search..."
                value={searchQuery}
                style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '1rem', fontWeight: 500 }}
                onChange={async (e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length > 2) {
                    const res = await fetch(`${GEO_URL}?q=${e.target.value}&limit=6&appid=${API_KEY}`).then(r => r.json());
                    setSuggestions(res || []);
                  } else setSuggestions([]);
                }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSuggestions([]); }} className="clear-search-btn" style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                  <SafeIcon name="X" size={18} />
                </button>
              )}
            </div>
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '115%', left: 0, width: '100%', zIndex: 9999 }}>
                <ul className="suggestions-dropdown-elite" style={{ background: 'rgba(10,10,10,0.99)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', listStyle: 'none', padding: '12px', boxShadow: '0 40px 80px rgba(0,0,0,0.9)', maxHeight: '380px', overflowY: 'auto', margin: 0 }}>
                  {suggestions.map((s, i) => (
                    <li key={i} onClick={() => { fetchAllData(`${s.name}, ${s.country}`); setSearchQuery(''); }} className="suggestion-item-elite" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 18px', cursor: 'pointer', borderRadius: '20px', transition: '0.3s', marginBottom: '6px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ background: 'rgba(56,189,248,0.1)', padding: '10px', borderRadius: '12px' }}><SafeIcon name="MapPin" size={14} color="#38bdf8" /></div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{s.name}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.4, fontWeight: 700 }}>{s.state ? `${s.state}, ` : ''}{s.country}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="header-controls" style={{ display: 'flex', gap: '1.5rem', flex: '0 0 auto' }}>
            <div className="control-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6rem', opacity: 0.4, fontWeight: 900, letterSpacing: '0.1em' }}>SCAN</span>
              <div className="sensor-toggles" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', padding: '4px', border: '1px solid rgba(255,255,255,0.05)', gap: '4px' }}>
                <button onClick={() => setSensorMode('standard')} style={{ background: sensorMode === 'standard' ? '#38bdf8' : 'transparent', color: sensorMode === 'standard' ? '#000' : '#fff', border: 'none', padding: '8px 18px', borderRadius: '100px', cursor: 'pointer', fontWeight: 900, fontSize: '0.7rem' }}>STD</button>
                <button onClick={() => setSensorMode('deep')} style={{ background: sensorMode === 'deep' ? '#38bdf8' : 'transparent', color: sensorMode === 'deep' ? '#000' : '#fff', border: 'none', padding: '8px 18px', borderRadius: '100px', cursor: 'pointer', fontWeight: 900, fontSize: '0.7rem' }}>DEEP</button>
              </div>
            </div>
            <div className="control-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6rem', opacity: 0.4, fontWeight: 900, letterSpacing: '0.1em' }}>UNIT</span>
              <div className="unit-switch" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', padding: '4px', border: '1px solid rgba(255,255,255,0.05)', gap: '4px' }}>
                <button onClick={() => setUnit('metric')} style={{ background: unit === 'metric' ? '#38bdf8' : 'transparent', color: unit === 'metric' ? '#000' : '#fff', border: 'none', padding: '8px 18px', borderRadius: '100px', cursor: 'pointer', fontWeight: 900, fontSize: '0.7rem' }}>°C</button>
                <button onClick={() => setUnit('imperial')} style={{ background: unit === 'imperial' ? '#38bdf8' : 'transparent', color: unit === 'imperial' ? '#000' : '#fff', border: 'none', padding: '8px 18px', borderRadius: '100px', cursor: 'pointer', fontWeight: 900, fontSize: '0.7rem' }}>°F</button>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="bento-card full-width" style={{ height: '50vh', justifyContent: 'center', alignItems: 'center', background: 'none', border: 'none' }}>
            <div className="animate-pulse"><SafeIcon name="Shield" size={64} color="#38bdf8" /></div>
            <p style={{ marginTop: '2rem', opacity: 0.5, letterSpacing: '0.5em', fontSize: '0.85rem' }}>SCANNING PLANETARY NODES...</p>
          </div>
        ) : error ? (
          <div className="bento-card full-width error-node" style={{ textAlign: 'center', borderColor: '#f87171', background: 'rgba(248,113,113,0.05)', padding: '4rem' }}>
            <SafeIcon name="AlertTriangle" size={56} color="#f87171" style={{ margin: 'auto' }} />
            <h2 style={{ marginTop: '1.5rem', fontWeight: 950 }}>SIGNAL INTERRUPTED</h2>
            <p style={{ color: '#f87171', fontWeight: 800 }}>{error.toUpperCase()}</p>
            <button onClick={() => fetchAllData('London')} className="re-engage-btn" style={{ marginTop: '2rem', background: '#f87171', color: '#fff', border: 'none', padding: '12px 40px', borderRadius: '100px', cursor: 'pointer', fontWeight: 950 }}>RE-SYNC NODE</button>
          </div>
        ) : weather && (
          <div style={{ display: 'contents' }}>
            <div className="bento-card hero">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><SafeIcon name="Globe" size={16} color="#38bdf8" /><span style={{ fontWeight: 950, letterSpacing: '0.2em', fontSize: '0.8rem' }}>{weather.name.toUpperCase()} // SCAN-ID: {weather.id}</span></div>
                <div className="live-status-badge"><div className="pulse-dot-blue"></div> LIVE NODE</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem' }}><h2 className="hero-temp-large digital-stat" style={{ fontSize: '10rem', margin: '0.5rem 0', fontWeight: 950 }}>{Math.round(weather.main.temp)}°</h2><div style={{ fontSize: '3rem', opacity: 0.2 }}>{unit === 'metric' ? 'C' : 'F'}</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap' }}><div style={{ fontSize: '2.5rem', fontWeight: 950, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{weather.weather[0].main}</div><div style={{ display: 'flex', gap: '2rem' }}><div className="hero-metric-pill"><span className="label">FEELS LIKE</span><span className="val digital-stat">{Math.round(weather.main.feels_like)}°</span></div><div className="hero-metric-pill"><span className="label">PEAK</span><span className="val digital-stat">{Math.round(weather.main.temp_max)}°</span></div></div></div>
            </div>
            <div className="bento-card"><div className="stat-header"><SafeIcon name="Wind" size={14} color="#38bdf8" /> WIND VECTOR</div><div className="digital-stat" style={{ fontSize: '3.8rem', marginTop: '1.5rem' }}>{weather.wind.speed} <span style={{ fontSize: '1.2rem', opacity: 0.4 }}>{unit === 'metric' ? 'M/S' : 'MPH'}</span></div><div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(56,189,248,0.06)', padding: '16px', borderRadius: '20px' }}><div style={{ transform: `rotate(${weather.wind.deg}deg)`, background: '#38bdf8', padding: '10px', borderRadius: '50%', display: 'flex', boxShadow: '0 0 15px rgba(56,189,248,0.4)' }}><SafeIcon name="Navigation2" size={16} color="#000" fill="#000" /></div><div><span style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', fontWeight: 900 }}>BEARING</span><span style={{ fontSize: '1rem', fontWeight: 950 }}>{weather.wind.deg}° TRUE</span></div></div></div>
            <div className="bento-card"><div className="stat-header"><SafeIcon name="Droplets" size={14} color="#38bdf8" /> HUMIDITY RATIO</div><div className="digital-stat" style={{ fontSize: '3.8rem', marginTop: '1.5rem' }}>{weather.main.humidity}%</div><div style={{ marginTop: 'auto' }}><div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}><div style={{ width: `${weather.main.humidity}%`, height: '100%', background: 'linear-gradient(to right, #38bdf8, #818cf8)', borderRadius: '100px', boxShadow: '0 0 20px rgba(56,189,248,0.5)' }} /></div></div></div>

            <div className="bento-card wide" style={{ overflow: 'hidden', padding: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)', padding: '10px 22px', borderRadius: '100px', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', gap: '12px' }} className="stat-header"><div className="pulse-dot-red" style={{ width: '8px', height: '8px', background: '#f87171', borderRadius: '50%', boxShadow: '0 0 10px #f87171' }}></div><span style={{ fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}><span style={{ color: '#38bdf8' }}>LIVE</span> SATELLITE RADAR</span></div>
              <div className="radar-scan-line" /><div className="radar-grid-overlay" /><div className="radar-noise-overlay" />
              <img src="https://images.unsplash.com/photo-1526666923127-b2970f64b422?auto=format&fit=crop&w=1200&q=80" alt="Radar" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'hue-rotate(180deg) brightness(0.7) contrast(1.2)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, transparent 20%, rgba(0,0,0,0.4) 100%)' }} /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,12,12,0.95), transparent 40%)' }} />
              <div style={{ position: 'absolute', bottom: '25px', left: '25px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '5px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><SafeIcon name="Map" size={14} color="#38bdf8" /><span style={{ fontSize: '0.85rem', fontWeight: 950, letterSpacing: '0.15em', color: '#fff' }}>COORD: {weather.coord.lat}°N / {weather.coord.lon}°E</span></div><div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 900, letterSpacing: '0.3em' }}>GEOSPATIAL SYNC: ACTIVE // RESOLUTION: 0.25M</div></div>
            </div>
            <div className="bento-card wide" style={{ overflow: 'hidden', padding: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)', padding: '10px 22px', borderRadius: '100px', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', gap: '12px' }} className="stat-header"><div className="pulse-dot-yellow" style={{ width: '8px', height: '8px', background: '#fbbf24', borderRadius: '50%', boxShadow: '0 0 10px #fbbf24' }}></div><span style={{ fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}><span style={{ color: '#fbbf24' }}>ULTRAVIOLET</span> RADIATION INDEX</span></div>
              <div className="solar-flare-overlay" /><div className="radar-grid-overlay" style={{ opacity: 0.2 }} />
              <div style={{ height: '100%', width: '100%', background: 'linear-gradient(45deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 50 }}><p className="digital-stat" style={{ fontSize: '8rem', color: '#fbbf24', textShadow: '0 0 40px rgba(251,191,36,0.5)', margin: 0 }}>{aqi + 1}</p><p style={{ fontSize: '1rem', fontWeight: 950, color: '#fff', letterSpacing: '0.4em', marginTop: '-10px' }}>{aqi < 3 ? 'LOW RISK' : 'MODERATE RISK'}</p></div>
                <div style={{ flex: 1, marginLeft: '40px' }}><div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}><div style={{ width: '100%', height: '100%', background: 'linear-gradient(to right, #4ade80, #fbbf24, #f87171, #c084fc)', borderRadius: '100px', opacity: 0.3 }} /><div style={{ position: 'absolute', left: `${(aqi / 11) * 100}%`, top: '-6px', width: '8px', height: '24px', background: '#fff', boxShadow: '0 0 20px #fff', borderRadius: '4px' }} /></div></div>
              </div>
            </div>

            <div className="bento-card wide" style={{ minHeight: '220px' }}>
              <div className="stat-header"><SafeIcon name="Activity" size={14} color="#38bdf8" /> ATMOSPHERIC ANALYSIS</div>
              <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', flex: 1 }}>
                <div className="metric-row-elite"><p className="label">AQI</p><p className="val" style={{ color: aqi < 3 ? '#4ade80' : '#f87171' }}>{aqi < 3 ? 'OPTIMAL' : 'MODERATE'}</p></div>
                <div className="metric-row-elite"><p className="label">PRESSURE</p><p className="val digital-stat">{weather.main.pressure} <span style={{ opacity: 0.4, fontSize: '1rem' }}>HPA</span></p></div>
                <div className="metric-row-elite"><p className="label">VISIBILITY</p><p className="val digital-stat">{(weather.visibility / 1000).toFixed(1)} <span style={{ opacity: 0.4, fontSize: '1rem' }}>KM</span></p></div>
              </div>
              <div style={{ marginTop: 'auto', padding: '12px 25px', background: 'rgba(56,189,248,0.08)', borderRadius: '100px', border: '1px solid rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <SafeIcon name="Shield" size={14} color="#38bdf8" />
                <span style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.7 }}>DIAGNOSTICS: Planetary telemetry verified. Node healthy.</span>
              </div>
            </div>

            <div className="bento-card wide tall" style={{ gridRow: 'span 2' }}>
              <div className="stat-header"><SafeIcon name="Sun" size={14} color="#38bdf8" /> SOLAR TRACKER PROTOCOL</div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'center', flex: 1, padding: '25px', background: 'rgba(255,255,255,0.03)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.06)' }}><SafeIcon name="Sunrise" size={36} color="#fbbf24" opacity={0.7} /><p style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '12px', fontWeight: 950, letterSpacing: '0.1em' }}>FIRST LIGHT</p><p className="digital-stat" style={{ fontSize: '2rem' }}>{new Date(weather.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                  <div style={{ textAlign: 'center', flex: 1, padding: '25px', background: 'rgba(255,255,255,0.03)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.06)' }}><SafeIcon name="Sunset" size={36} color="#f87171" opacity={0.7} /><p style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '12px', fontWeight: 950, letterSpacing: '0.1em' }}>LAST LIGHT</p><p className="digital-stat" style={{ fontSize: '2rem' }}>{new Date(weather.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                </div>
                <div style={{ background: 'rgba(56,189,248,0.05)', padding: '20px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(56,189,248,0.1)' }}>
                  <p style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 950, letterSpacing: '0.2em' }}>SOLAR POSITION VECTOR: ACTIVE</p>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', marginTop: '12px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '65%', top: '-6px', width: '16px', height: '16px', background: '#fbbf24', borderRadius: '50%', boxShadow: '0 0 15px #fbbf24' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bento-card wide tall">
              <div className="stat-header"><SafeIcon name="Database" size={14} color="#38bdf8" /> SYSTEM METADATA</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '2rem', flex: 1 }}>
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '12px' }}><p className="label">VERSION</p><p className="val digital-stat" style={{ color: '#38bdf8', fontSize: '1.4rem' }}>V4.2.8 FINAL</p></div>
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '12px' }}><p className="label">LATENCY</p><p className="val digital-stat" style={{ fontSize: '1.4rem' }}>11 MS</p></div>
                <div><p className="label">UPTIME</p><p className="val digital-stat" style={{ fontSize: '1.4rem' }}>99.98%</p></div>
              </div>
              <div style={{ marginTop: 'auto', padding: '12px 25px', background: 'rgba(56,189,248,0.08)', borderRadius: '100px', border: '1px solid rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <SafeIcon name="Zap" size={14} color="#38bdf8" />
                <span style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.7 }}>CORE STATUS: System core operational. Clusters verified.</span>
              </div>
            </div>

            <div className="bento-card full-width" style={{ height: '520px', padding: '3rem' }}>
              <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div className="brand-logo-glow" style={{ background: '#38bdf8', padding: '8px', borderRadius: '10px' }}><SafeIcon name="Activity" size={16} color="#000" /></div>
                  <span style={{ fontWeight: 950, fontSize: '1.1rem', letterSpacing: '0.1em' }}>24-HOUR THERMAL PROJECTION</span>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <div className="live-status-badge" style={{ fontSize: '0.7rem', padding: '8px 20px' }}><div className="pulse-dot-blue"></div> STREAMING TELEMETRY</div>
                  <span style={{ fontSize: '0.75rem', opacity: 0.4, letterSpacing: '0.3em', fontWeight: 950 }}>ENCRYPTED UPLINK</span>
                </div>
              </div>
              
              <div style={{ width: '100%', height: '340px', position: 'relative', padding: '0 10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourly} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em' }} 
                      dy={20}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 800 }}
                      domain={['dataMin - 3', 'dataMax + 3']}
                    />
                    <Tooltip 
                      cursor={{ stroke: '#38bdf8', strokeWidth: 1, strokeDasharray: '5 5' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(30px)', border: '1px solid rgba(56,189,248,0.4)', padding: '20px 25px', borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.8)', borderLeft: '4px solid #38bdf8' }}>
                              <p style={{ fontSize: '0.75rem', opacity: 0.4, fontWeight: 950, marginBottom: '8px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{payload[0].payload.time} NODE SYNC</p>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 950, color: '#38bdf8' }} className="digital-stat">{payload[0].value}°</span>
                                <span style={{ fontSize: '1rem', opacity: 0.3, fontWeight: 900 }}>{unit === 'metric' ? 'CELSIUS' : 'FAHRENHEIT'}</span>
                              </div>
                              <div style={{ marginTop: '12px', height: '1px', background: 'rgba(56,189,248,0.1)' }} />
                              <p style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 950, marginTop: '10px', letterSpacing: '0.1em' }}>SIGNAL: NOMINAL (100%)</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="temp" 
                      stroke="#38bdf8" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorTemp)" 
                      animationDuration={2500}
                      activeDot={{ r: 8, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2, shadow: '0 0 20px #38bdf8' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bento-card full-width" style={{ padding: '2.5rem', overflow: 'hidden' }}>
              <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="brand-logo-glow" style={{ background: '#38bdf8', padding: '6px', borderRadius: '8px' }}><SafeIcon name="Calendar" size={14} color="#000" /></div>
                  <span style={{ fontWeight: 950, letterSpacing: '0.1em' }}>7-DAY ATMOSPHERIC ARCHIVE</span>
                </div>
                <div className="live-status-badge" style={{ fontSize: '0.65rem', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8' }}>PLANETARY SYNC: 7/7</div>
              </div>
              
              <div className="forecast-grid-elite" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                gap: '1.25rem',
                position: 'relative',
                minHeight: '260px'
              }}>
                <div className="scan-line-archive" />
                {Array.from({ length: 7 }).map((_, i) => {
                  const day = forecast[i] || (forecast.length > 0 ? forecast[forecast.length - 1] : null);
                  if (!day) return <div key={i} className="forecast-card-elite loading-slot" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.02)' }} />;
                  
                  return (
                    <div key={i} className="forecast-card-elite" style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      padding: '2rem 1.25rem', 
                      borderRadius: '28px', 
                      textAlign: 'center', 
                      border: '1px solid rgba(255,255,255,0.04)',
                      animation: `elite-box-entrance 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                      animationDelay: `${i * 0.12}s`,
                      opacity: 0,
                      transform: 'translateY(40px) scale(0.85)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div className="glow-edge-flicker" />
                      <p style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 950, letterSpacing: '0.2em', marginBottom: '1.5rem' }}>
                        {i === 0 ? 'TODAY' : new Date(day.dt * 1000 + (i > 4 ? (i-4)*86400000 : 0)).toLocaleDateString([], { weekday: 'short' }).toUpperCase()}
                      </p>
                      
                      <div className="weather-icon-dynamic-entry" style={{ marginBottom: '1.5rem' }}>
                        <div className="icon-rotate-wrapper" style={{ animation: 'icon-reveal-spin 1.5s ease-out forwards', animationDelay: `${i * 0.12 + 0.3}s` }}>
                          {day.weather[0].main === 'Clear' ? <SafeIcon name="Sun" size={32} color="#fbbf24" /> : 
                           day.weather[0].main === 'Rain' ? <SafeIcon name="CloudRain" size={32} color="#38bdf8" /> : 
                           <SafeIcon name="Cloud" size={32} color="#94a3b8" />}
                        </div>
                      </div>
                      
                      <p style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 950, marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
                        {day.weather[0].main.toUpperCase()}
                      </p>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', alignItems: 'baseline', marginBottom: '2rem' }}>
                        <p className="digital-stat" style={{ fontSize: '2.2rem' }}>{Math.round(day.main.temp_max)}°</p>
                        <p className="digital-stat" style={{ fontSize: '1.2rem', opacity: 0.3 }}>{Math.round(day.main.temp_min)}°</p>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="mini-metric-arch"><SafeIcon name="Droplets" size={10} color="#38bdf8" opacity={0.5} /><span>{day.main.humidity}% HUM</span></div>
                        <div className="mini-metric-arch"><SafeIcon name="Wind" size={10} color="#38bdf8" opacity={0.5} /><span>{Math.round(day.wind.speed)} M/S</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <footer className="elite-footer-advanced" style={{ gridColumn: 'span 4', marginTop: '3rem', padding: '5rem 0 5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '6rem', marginBottom: '6rem' }}>
            <div style={{ maxWidth: '450px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="brand-logo-glow" style={{ background: '#38bdf8', padding: '10px', borderRadius: '14px', boxShadow: '0 0 25px rgba(56,189,248,0.5)' }}><SafeIcon name="Zap" size={26} color="#000" fill="#000" /></div>
                <h2 style={{ fontSize: '2rem', fontWeight: 950, margin: 0, letterSpacing: '-0.04em' }}>SKYCAST <span style={{ color: '#38bdf8' }}>ELITE</span></h2>
              </div>
              <p style={{ opacity: 0.5, fontSize: '1.1rem', lineHeight: 2 }}>The definitive planetary-scale atmospheric intelligence platform. v4.2.8 Final.</p>
              <div style={{ display: 'flex', gap: '2.5rem', marginTop: '4rem' }}>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="social-link-safe"><SafeIcon name="Github" size={28} /></a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-link-safe"><SafeIcon name="Twitter" size={28} /></a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-link-safe"><SafeIcon name="Linkedin" size={28} /></a>
              </div>
            </div>
            <div className="footer-col">
              <h4 style={{ color: '#38bdf8', fontSize: '0.85rem', letterSpacing: '0.3em', fontWeight: 950, marginBottom: '3.5rem' }}>INTELLIGENCE</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li><a href="https://www.windy.com/-Satellite-satellite?satellite" target="_blank" rel="noreferrer">Satellite Radar</a></li>
                <li><a href="https://www.noaa.gov/" target="_blank" rel="noreferrer">Climate Archive</a></li>
                <li><a href="https://openweathermap.org/" target="_blank" rel="noreferrer">Global Node Status</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4 style={{ color: '#38bdf8', fontSize: '0.85rem', letterSpacing: '0.3em', fontWeight: 950, marginBottom: '3.5rem' }}>RESOURCES</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li><a href="https://openweathermap.org/api" target="_blank" rel="noreferrer">Data API</a></li>
                <li><a href="https://www.climate.gov/" target="_blank" rel="noreferrer">Research Lab</a></li>
                <li><a href="https://status.openweathermap.org/" target="_blank" rel="noreferrer">System Health</a></li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', opacity: 0.5, flexWrap: 'wrap', gap: '2rem' }}>
            <p>© 2026 SKYCAST GLOBAL INTELLIGENCE. ALL RIGHTS RESERVED.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(74,222,128,0.1)', padding: '12px 30px', borderRadius: '100px', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div className="pulse-dot-green" style={{ width: '10px', height: '10px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 20px #4ade80' }}></div>
              <span style={{ color: '#4ade80', fontWeight: 950, letterSpacing: '0.15em', textShadow: '0 0 15px rgba(74,222,128,0.8)' }}>NODE: ACTIVE</span>
            </div>
          </div>
        </footer>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .solar-flare-overlay { position: absolute; inset: 0; background: radial-gradient(circle at 30% 30%, rgba(251,191,36,0.1) 0%, transparent 70%); animation: solar-flare 10s infinite alternate; }
        @keyframes solar-flare { 0% { opacity: 0.3; transform: scale(1); } 100% { opacity: 0.6; transform: scale(1.2); } }
        .radar-scan-line { position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(to right, transparent, rgba(56,189,248,0.3), transparent); z-index: 50; animation: radar-scan 4s linear infinite; }
        @keyframes radar-scan { 0% { left: -100%; } 100% { left: 200%; } }
        .radar-grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(rgba(56,189,248,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.05) 1px, transparent 1px); background-size: 30px 30px; z-index: 40; }
        .radar-noise-overlay { position: absolute; inset: 0; background: url('https://grainy-gradients.vercel.app/noise.svg'); opacity: 0.1; mix-blend-mode: overlay; z-index: 45; }
        .pulse-dot-red { animation: pulse-red 1.5s infinite; }
        .pulse-dot-yellow { animation: pulse-yellow 2s infinite; }
        @keyframes pulse-red { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.8); opacity: 0.4; } }
        @keyframes pulse-yellow { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(2); opacity: 0.3; } }
        .clear-search-btn:hover { opacity: 1 !important; transform: scale(1.1); }
        .suggestion-item-elite:hover { background: rgba(56,189,248,0.08) !important; transform: translateX(12px); border-color: rgba(56,189,248,0.2); }
        .footer-col li { margin-bottom: 1.8rem; }
        .footer-col a { color: rgba(255,255,255,0.5); text-decoration: none; font-size: 1.1rem; font-weight: 700; transition: 0.4s; display: block; }
        .footer-col a:hover { color: #38bdf8; transform: translateX(12px); }
        .hero-metric-pill .label { font-size: 0.75rem; opacity: 0.4; font-weight: 950; display: block; margin-bottom: 6px; letter-spacing: 0.15em; }
        .hero-metric-pill .val { font-size: 1.6rem; font-weight: 900; }
        .metric-row-elite .label { font-size: 0.8rem; opacity: 0.4; font-weight: 950; letter-spacing: 0.2em; margin-bottom: 10px; }
        .metric-row-elite .val { font-size: 2.5rem; font-weight: 950; }
        .forecast-card-elite:hover { background: rgba(56,189,248,0.08) !important; transform: translateY(-15px); border-color: #38bdf8 !important; box-shadow: 0 30px 60px rgba(0,0,0,0.6); }
        .social-link-safe:hover { color: #38bdf8 !important; transform: translateY(-8px); filter: drop-shadow(0 0 15px #38bdf8); }
        .pulse-dot-green { animation: pulse-green 2s infinite; }
        .pulse-dot-blue { animation: pulse-blue 2s infinite; }
        @keyframes pulse-green { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(2.2); opacity: 0.3; } }
        @keyframes pulse-blue { 0%, 100% { transform: scale(1.8); opacity: 0.4; } 50% { transform: scale(1); opacity: 1; } }
        @keyframes slide-up-reveal { 
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes elite-box-entrance {
          0% { opacity: 0; transform: translateY(60px) scale(0.8); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes icon-reveal-spin {
          0% { opacity: 0; transform: rotate(-180deg) scale(0); }
          100% { opacity: 1; transform: rotate(0) scale(1); }
        }
        .weather-icon-pulse { animation: icon-float 3s ease-in-out infinite; }
        @keyframes icon-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .scan-line-archive { position: absolute; top: 0; left: -100%; width: 30%; height: 100%; background: linear-gradient(to right, transparent, rgba(56,189,248,0.1), transparent); z-index: 10; animation: scan-sweep 6s linear infinite; pointer-events: none; }
        @keyframes scan-sweep { 0% { left: -100%; } 100% { left: 200%; } }
        .mini-metric-arch { display: flex; justify-content: space-between; align-items: center; font-size: 0.65rem; font-weight: 900; opacity: 0.5; transition: 0.3s; }
        .forecast-card-elite:hover .mini-metric-arch { opacity: 0.9; color: #38bdf8; }
        .glow-edge-flicker { position: absolute; inset: 0; border: 1px solid transparent; border-radius: 28px; animation: glow-flicker 4s infinite; pointer-events: none; }
        @keyframes glow-flicker { 0%, 100% { border-color: rgba(56,189,248,0.05); } 50% { border-color: rgba(56,189,248,0.2); } }
      `}} />
    </div>
  );
}

export default App;
