import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Map as MapIcon, Layers, Truck, ArrowRight, Filter, Database, AlertCircle, RefreshCw, MapPin, Square, ChevronUp, ChevronDown, Minimize2, Navigation, Tag, SlidersHorizontal, ArrowDownUp, Sun, Moon, Sunrise, Sunset, AlertTriangle, MessageSquare, Cloud, CloudRain, CloudLightning, CloudSnow, Clock as ClockIcon, Thermometer, X } from 'lucide-react';

// ==========================================
// 1. DATA SOURCE CONFIGURATION
//Instructions: 
// 1. Upload your data to Google Sheets.
// 2. Go to File > Share > Publish to web > Select "Comma-separated values (.csv)".
// 3. Paste the generated links below.
// ==========================================

const FACILITY_DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStGLrqXIxCAtIaFRYfQW0V7L1Or2uOL-vyXMMqOf1hnx6GdYrn1Y_yY3ex3VIKsKfremF-GtC_X7_P/pub?output=csv";
const CONNECTION_DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQRUpjmmU-vIisjGmoF8Mv5E6qyuetEG_iIWj6i_HDFPH7BYcY-juDFpj2V6UOAz-95d2EhpTeFW-7J/pub?output=csv";

// Utility to load external scripts/styles dynamically
const useExternalResource = (url, type) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const selector = type === 'script' ? `script[src="${url}"]` : `link[href="${url}"]`;
    const existing = document.querySelector(selector);
    
    if (existing) {
      setLoaded(true);
      return;
    }

    if (type === 'script') {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => setLoaded(true);
      script.onerror = () => console.error(`Failed to load script: ${url}`);
      document.body.appendChild(script);
    } else if (type === 'style') {
      const link = document.createElement('link');
      link.href = url;
      link.rel = 'stylesheet';
      link.onload = () => setLoaded(true);
      document.head.appendChild(link);
    }
  }, [url, type]);

  return loaded;
};

// Distance Helper (Haversine Formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const d = R * c; 
    return Math.round(d);
};

// Shift Helper
const getShift = (timeStr) => {
    if (!timeStr) return 'UNK';
    // Handle formats like "10:00" or "18:00 (+2)"
    const cleanTime = timeStr.split(' ')[0]; 
    const hour = parseInt(cleanTime.split(':')[0], 10);
    
    if (isNaN(hour)) return 'UNK';

    // Morning: 06:00 to 13:59 (Effective)
    if (hour >= 6 && hour < 14) return 'MORNING';
    // Afternoon: 14:00 to 21:59 (Effective)
    if (hour >= 14 && hour < 22) return 'AFTERNOON';
    // Night: 22:00 to 05:59 (Effective)
    return 'NIGHT';
};

// --- NEW COMPONENT: WEATHER WIDGET ---
const WeatherWidget = ({ lat, lng, locationName }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!lat || !lng) {
            setWeather(null);
            return;
        }

        const fetchWeather = async () => {
            setLoading(true);
            try {
                // Free Open-Meteo API
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&timezone=auto`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.current) {
                    setWeather({
                        temp: Math.round(data.current.temperature_2m),
                        code: data.current.weather_code,
                        isDay: data.current.is_day
                    });
                }
            } catch (error) {
                console.error("Weather fetch failed", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [lat, lng]);

    // WMO Weather Code to Icon/Text
    const getWeatherIcon = (code, isDay) => {
        if (code === undefined) return { icon: <Sun size={16}/>, label: 'Unknown' };
        
        if (code === 0) return { icon: isDay ? <Sun size={16} className="text-amber-500"/> : <Moon size={16} className="text-slate-400"/>, label: 'Clear' };
        if (code <= 3) return { icon: <Cloud size={16} className="text-slate-400"/>, label: 'Cloudy' };
        if (code <= 48) return { icon: <Cloud size={16} className="text-slate-300"/>, label: 'Foggy' };
        if (code <= 67) return { icon: <CloudRain size={16} className="text-blue-400"/>, label: 'Rain' };
        if (code <= 77) return { icon: <CloudSnow size={16} className="text-cyan-200"/>, label: 'Snow' };
        if (code <= 99) return { icon: <CloudLightning size={16} className="text-purple-500"/>, label: 'Storm' };
        return { icon: <Sun size={16}/>, label: 'Clear' };
    };

    if (!locationName) return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded text-slate-400 text-[10px] font-mono">
            <MapPin size={12}/> Select Hub for Weather
        </div>
    );

    if (loading) return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded text-slate-400 text-[10px] font-mono animate-pulse">
            Loading Weather...
        </div>
    );

    if (!weather) return null;

    const { icon, label } = getWeatherIcon(weather.code, weather.isDay);

    return (
        <div className="flex items-center gap-3 px-3 py-1 bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded shadow-sm">
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-700 truncate max-w-[100px]">{locationName}</span>
                <span className="text-[9px] text-slate-400">{label}</span>
            </div>
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-100">
                {icon}
                <span className="text-sm font-black text-slate-800">{weather.temp}°</span>
            </div>
        </div>
    );
};

// --- NEW COMPONENT: LIVE CLOCK ---
const LiveClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = time.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' });

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded shadow-md border border-slate-700">
            <ClockIcon size={14} className="text-indigo-400"/>
            <div className="flex flex-col leading-none">
                <span className="text-[11px] font-bold font-mono tracking-wide">{timeStr}</span>
                <span className="text-[8px] text-slate-400 font-medium uppercase tracking-wider">{dateStr}</span>
            </div>
        </div>
    );
};


const App = () => {
  const leafletCssLoaded = useExternalResource('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'style');
  const leafletJsLoaded = useExternalResource('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'script');
  const papaParseLoaded = useExternalResource('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js', 'script');

  const [facilities, setFacilities] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  
  const [facilityStats, setFacilityStats] = useState({ total: 0, active: 0 });
  const [connectionStats, setConnectionStats] = useState({ total: 0, valid: 0 });
  
  const [filters, setFilters] = useState({
      showOutbound: true,
      showInbound: true,
      vmodes: {}
  });

  const [facTypeFilters, setFacTypeFilters] = useState({
      GW: true, 
      H: true,  
      I: false, 
      OTH: false 
  });

  const [sidebarFilter, setSidebarFilter] = useState('ALL'); 
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'dist', dir: 'desc' }); 

  const [showFacLegend, setShowFacLegend] = useState(false); // Default Closed for Minimal Look
  const [showRouteLegend, setShowRouteLegend] = useState(false); // Default Closed for Minimal Look

  const [appState, setAppState] = useState('LOADING'); 
  const [statusMsg, setStatusMsg] = useState('Loading Resources...');

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const initTimerRef = useRef(null);

  const areScriptsLoaded = leafletCssLoaded && leafletJsLoaded && papaParseLoaded;

  // --- HELPER: FACILITY TYPE ---
  const getFacilityType = (name) => {
      if (!name) return 'OTH';
      const parts = name.split('_');
      const suffix = parts[parts.length - 1].toUpperCase();
      if (['GW', 'H', 'I'].includes(suffix)) return suffix;
      return 'OTH';
  };

  const getFacilityStyle = (type, isSelected) => {
      let radius, color, weight;
      
      switch (type) {
          case 'GW': radius = 7; break; 
          case 'H':  radius = 5.5; break;
          case 'I':  radius = 4; break;
          default:   radius = 3;
      }

      if (isSelected) {
          radius += 4;
          weight = 3;
          color = '#ffffff'; 
      } else {
          weight = 1;
          color = '#ffffff';
      }

      let fillColor;
      switch (type) {
          case 'GW': fillColor = '#7c3aed'; break; // Violet
          case 'H':  fillColor = '#2563eb'; break; // Blue
          case 'I':  fillColor = '#0891b2'; break; // Cyan
          default:   fillColor = '#64748b'; break; // Slate
      }

      return { radius, fillColor, color, weight, fillOpacity: isSelected ? 1 : 0.85 };
  };

  // --- GLOBAL STATS MEMO ---
  const globalFacilityStats = useMemo(() => {
      const stats = {};
      connections.forEach(conn => {
          if (!stats[conn.oc]) stats[conn.oc] = { in: 0, out: 0 };
          stats[conn.oc].out += 1;
          if (!stats[conn.cn]) stats[conn.cn] = { in: 0, out: 0 };
          stats[conn.cn].in += 1;
      });
      return stats;
  }, [connections]);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!areScriptsLoaded) return;
    const checkAndInit = () => {
        if (window.Papa && window.L && mapRef.current) {
            if (initTimerRef.current) clearInterval(initTimerRef.current);
            initializeMap();
        } else {
            setStatusMsg('Waiting for Map Engine to start...');
        }
    };
    initTimerRef.current = setInterval(checkAndInit, 500);
    return () => { if (initTimerRef.current) clearInterval(initTimerRef.current); };
  }, [areScriptsLoaded]);

  const initializeMap = () => {
    try {
        if (!mapInstanceRef.current) {
            const map = window.L.map(mapRef.current).setView([22.5937, 78.9629], 5);
            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(map);
            layerGroupRef.current = window.L.layerGroup().addTo(map);
            mapInstanceRef.current = map;
        }
        loadData();
    } catch (err) {
        console.error("Init Error", err);
        setAppState('ERROR');
        setStatusMsg('Map Initialization Failed: ' + err.message);
    }
  };

  const loadData = async () => {
      setStatusMsg('Fetching Data...');
      
      try {
          const facRes = await fetch(FACILITY_DATA_URL);
          const connRes = await fetch(CONNECTION_DATA_URL);

          if (!facRes.ok || !connRes.ok) {
              throw new Error("Failed to download data files");
          }

          const facText = await facRes.text();
          const connText = await connRes.text();
          processCSV(facText, connText);

      } catch (err) {
          console.error("Fetch Error:", err);
          setAppState('ERROR');
          setStatusMsg('Failed to load data. Please check internet connection or file permissions.');
      }
  };

  const processCSV = (facText, connText) => {
    if (!window.Papa) return;
    setStatusMsg('Processing Data...');

    const cleanName = (name) => {
        if (!name) return '';
        return name.split('(')[0].trim();
    };

    try {
        window.Papa.parse(facText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: h => h.trim().toLowerCase(),
            complete: (resFac) => {
                const parsedFacilities = [];
                const seenFacilities = new Set(); 
                let active = 0;
                
                resFac.data.forEach(row => {
                    if (row.deactivated_at && row.deactivated_at.trim() !== '') return;
                    
                    const name = row.name ? row.name.trim() : '';
                    if (!name || seenFacilities.has(name)) return; 

                    const lat = parseFloat(row.property_lat);
                    const lng = parseFloat(row.property_long);
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
                        parsedFacilities.push({ 
                            name, 
                            lat, 
                            lng,
                            address: row.property_address || 'Address not available',
                            type: getFacilityType(name)
                        });
                        seenFacilities.add(name);
                        active++;
                    }
                });

                window.Papa.parse(connText, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: h => h.trim().toLowerCase(),
                    complete: (resConn) => {
                        const parsedConnections = [];
                        const seenConnections = new Set();
                        let valid = 0;
                        
                        resConn.data.forEach(row => {
                            if (row.oc && row.cn) {
                                const ocClean = cleanName(row.oc);
                                const cnClean = cleanName(row.cn);
                                const vehSize = row.vehicle_size ? row.vehicle_size.trim() : 'Unknown';
                                const vmode = row.vmode ? row.vmode.trim().toUpperCase() : 'UNKNOWN';
                                
                                const uniqueKey = `${ocClean}|${cnClean}|${row.cutoff_departure}|${row.eta}|${row.tat}|${vmode}|${vehSize}`;
                                
                                if (!seenConnections.has(uniqueKey)) {
                                    parsedConnections.push({
                                        oc: ocClean,
                                        cn: cnClean,
                                        vmode: vmode,
                                        cutoff: row.cutoff_departure,
                                        eta: row.eta,
                                        tat: row.tat,
                                        vehicle_size: vehSize
                                    });
                                    seenConnections.add(uniqueKey);
                                    valid++;
                                }
                            }
                        });

                        setFacilities(parsedFacilities);
                        setFacilityStats({ total: resFac.data.length, active });
                        setConnections(parsedConnections);
                        setConnectionStats({ total: resConn.data.length, valid });
                        
                        const modes = {};
                        parsedConnections.forEach(c => modes[c.vmode] = true);
                        setFilters(p => ({ ...p, vmodes: modes }));

                        setAppState('READY');
                    }
                });
            }
        });
    } catch (e) {
        setAppState('ERROR');
        setStatusMsg('Data Parsing Error: ' + e.message);
    }
  };

  // --- FILTERS ---
  useEffect(() => {
      if (connections.length > 0) {
          const modes = {};
          connections.forEach(c => {
              modes[c.vmode] = true;
          });
          setFilters(prev => ({ ...prev, vmodes: modes }));
      }
  }, [connections]);

  // --- MAP RENDERING ---
  const facilityMap = useMemo(() => {
    const map = {};
    facilities.forEach(f => {
      map[f.name.trim()] = { lat: f.lat, lng: f.lng, type: f.type };
    });
    return map;
  }, [facilities]);

  useEffect(() => {
    if (appState !== 'READY' || !mapInstanceRef.current || !layerGroupRef.current) return;
    
    const L = window.L;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const bounds = L.latLngBounds();
    let hasLayers = false;

    // --- HELPER: Check if facility is connected to selection ---
    const connectedToSelection = new Set();
    if (selectedFacility) {
        connections.forEach(conn => {
            if (conn.oc === selectedFacility.name) connectedToSelection.add(conn.cn);
            if (conn.cn === selectedFacility.name) connectedToSelection.add(conn.oc);
        });
        connectedToSelection.add(selectedFacility.name); // Include self
    }

    // 1. Draw Connections
    connections.forEach(conn => {
      const origin = facilityMap[conn.oc];
      const dest = facilityMap[conn.cn];

      if (!origin || !dest) return;

      const isRelatedToSelection = selectedFacility && (conn.oc === selectedFacility.name || conn.cn === selectedFacility.name);

      const isOriginVisible = facTypeFilters[origin.type];
      const isDestVisible = facTypeFilters[dest.type];
      
      let shouldRenderLine = false;

      if (selectedFacility) {
          if (isRelatedToSelection) shouldRenderLine = true;
      } else {
          if (isOriginVisible && isDestVisible) shouldRenderLine = true;
      }

      if (shouldRenderLine) {
        if (selectedFacility) {
             const isOutbound = selectedFacility.name === conn.oc;
             const isInbound = selectedFacility.name === conn.cn;
             if (isOutbound && !filters.showOutbound) return;
             if (isInbound && !filters.showInbound) return;
        }
        
        if (!filters.vmodes[conn.vmode]) return;

        let color = '#374151';
        let weight = 1;
        let opacity = 0.2; 
        
        if (selectedFacility) {
            opacity = 0.8;
            weight = 2; 
            const isOutbound = selectedFacility.name === conn.oc;
            color = isOutbound ? '#10b981' : '#f59e0b';
        }

        const polyline = L.polyline([[origin.lat, origin.lng], [dest.lat, dest.lng]], {
          color, weight, opacity, smoothFactor: 1
        });

        const dist = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
        const distLabel = dist > 0 ? `${dist} km` : 'Dist. N/A';

        const tooltipContent = `
          <div class="font-sans text-xs p-1">
            <div class="font-bold border-b pb-1 mb-1 border-slate-200">${conn.oc} <span class="text-slate-400">→</span> ${conn.cn}</div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
               <span class="text-slate-500">Mode:</span> <span class="font-bold text-slate-700">${conn.vmode}</span>
               <span class="text-slate-500">Dist:</span> <span class="font-medium">${distLabel}</span>
               <span class="text-slate-500">TAT:</span> <span class="font-medium">${conn.tat} hrs</span>
               <span class="text-slate-500">Cutoff:</span> <span>${conn.cutoff}</span>
            </div>
          </div>
        `;
        polyline.bindTooltip(tooltipContent, { sticky: true, className: 'custom-tooltip' });
        polyline.addTo(layerGroup);
      }
    });

    // 2. Draw Facilities
    facilities.forEach(fac => {
      const isSelected = selectedFacility?.name === fac.name;
      const isConnected = selectedFacility && connectedToSelection.has(fac.name);
      
      const isVisible = facTypeFilters[fac.type] || isSelected || isConnected;

      if (!isVisible) return;

      hasLayers = true;
      const style = getFacilityStyle(fac.type, isSelected);

      const marker = L.circleMarker([fac.lat, fac.lng], style);

      marker.on('click', () => {
        setSelectedFacility(fac);
        mapInstanceRef.current.flyTo([fac.lat, fac.lng], 6, { duration: 1.5 });
      });

      // --- ENHANCED HOVER CARD ---
      const fStats = globalFacilityStats[fac.name] || { in: 0, out: 0 };
      let typeColorClass = 'text-slate-500';
      if (fac.type === 'GW') typeColorClass = 'text-violet-600';
      if (fac.type === 'H') typeColorClass = 'text-blue-600';
      if (fac.type === 'I') typeColorClass = 'text-cyan-600';

      const tooltipHTML = `
        <div class="min-w-[180px] font-sans">
            <div class="border-b border-slate-100 pb-1 mb-1">
                <div class="font-bold text-sm text-slate-800">${fac.name}</div>
                <div class="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                    <span>📍</span> ${fac.address}
                </div>
            </div>
            <div class="grid grid-cols-3 gap-1 text-center">
                <div class="bg-slate-50 rounded p-1 border border-slate-100">
                    <div class="text-[8px] uppercase text-slate-400 font-bold tracking-wider">Type</div>
                    <div class="font-bold text-xs ${typeColorClass}">${fac.type}</div>
                </div>
                <div class="bg-emerald-50 rounded p-1 border border-emerald-100">
                    <div class="text-[8px] uppercase text-emerald-400 font-bold tracking-wider">Out</div>
                    <div class="font-bold text-xs text-emerald-700">${fStats.out}</div>
                </div>
                <div class="bg-amber-50 rounded p-1 border border-amber-100">
                    <div class="text-[8px] uppercase text-amber-400 font-bold tracking-wider">In</div>
                    <div class="font-bold text-xs text-amber-700">${fStats.in}</div>
                </div>
            </div>
        </div>
      `;

      marker.bindTooltip(tooltipHTML, { 
          direction: 'top', 
          className: 'custom-tooltip-card', 
          opacity: 1
      });
      
      marker.addTo(layerGroup);
      
      if (isSelected || isConnected) {
          marker.bringToFront();
      }

      bounds.extend([fac.lat, fac.lng]);
    });

    if (hasLayers && !selectedFacility && !mapRef.current.dataset.initialFit) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      mapRef.current.dataset.initialFit = "true";
    }

  }, [facilities, connections, selectedFacility, facilityMap, filters, facTypeFilters, appState, globalFacilityStats]);


  // --- STATS HELPER ---
  const getFacilitySpecificStats = () => {
      if (!selectedFacility) return null;
      let outbound = connections.filter(c => c.oc === selectedFacility.name);
      let inbound = connections.filter(c => c.cn === selectedFacility.name);

      // 1. Calculate Distances and Attach to Objects
      const processRoute = (route, isOut) => {
         const origin = facilityMap[route.oc];
         const dest = facilityMap[route.cn];
         const dist = (origin && dest) ? calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng) : 0;
         return { ...route, dist };
      };

      outbound = outbound.map(r => processRoute(r, true));
      inbound = inbound.map(r => processRoute(r, false));

      // 2. RAW Counts
      const rawOutCount = outbound.length;
      const rawInCount = inbound.length;

      // 3. SHIFT CALCULATIONS (on Raw Data)
      const shifts = {
          MORNING: { out: 0, in: 0, out_ftl: 0, out_crt: 0, in_ftl: 0, in_crt: 0 },
          AFTERNOON: { out: 0, in: 0, out_ftl: 0, out_crt: 0, in_ftl: 0, in_crt: 0 },
          NIGHT: { out: 0, in: 0, out_ftl: 0, out_crt: 0, in_ftl: 0, in_crt: 0 }
      };

      // Helper to aggregate shift data
      const aggShift = (list, isOut) => {
          list.forEach(r => {
              const time = isOut ? r.cutoff : r.eta;
              const shift = getShift(time);
              if (shifts[shift]) {
                  if(isOut) {
                      shifts[shift].out++;
                      if(r.vmode === 'FTL') shifts[shift].out_ftl++; else shifts[shift].out_crt++;
                  } else {
                      shifts[shift].in++;
                      if(r.vmode === 'FTL') shifts[shift].in_ftl++; else shifts[shift].in_crt++;
                  }
              }
          });
      };
      aggShift(outbound, true);
      aggShift(inbound, false);


      // 4. Apply Global Filters for LIST VIEW
      if (!filters.showOutbound) outbound = [];
      if (!filters.showInbound) inbound = [];
      outbound = outbound.filter(c => filters.vmodes[c.vmode]);
      inbound = inbound.filter(c => filters.vmodes[c.vmode]);

      // 5. Apply Sidebar Pills Filter
      const applySidebarFilter = (list) => {
          if (sidebarFilter === 'ALL') return list;
          if (sidebarFilter === 'FTL') return list.filter(c => c.vmode === 'FTL');
          if (sidebarFilter === 'CARTING') return list.filter(c => c.vmode === 'CARTING' || c.vmode === 'LTL'); 
          if (sidebarFilter === 'LONG') return list.filter(c => c.dist > 500);
          return list;
      };

      outbound = applySidebarFilter(outbound);
      inbound = applySidebarFilter(inbound);

      // 6. Apply Sorter
      const sortList = (list) => {
          return list.sort((a, b) => {
              let valA, valB;
              if (sortConfig.key === 'dist') {
                  valA = a.dist;
                  valB = b.dist;
              } else { // size
                  valA = a.vehicle_size.toLowerCase();
                  valB = b.vehicle_size.toLowerCase();
              }
              
              if (valA < valB) return sortConfig.dir === 'asc' ? -1 : 1;
              if (valA > valB) return sortConfig.dir === 'asc' ? 1 : -1;
              return 0;
          });
      };

      outbound = sortList(outbound);
      inbound = sortList(inbound);

      return { outbound, inbound, rawOutCount, rawInCount, shifts };
  };

  const currentStats = getFacilitySpecificStats();
  const vmodeKeys = Object.keys(filters.vmodes).sort();

  if (appState === 'ERROR') {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-lg font-bold">System Error</h2>
            <p className="text-slate-400 mt-2 mb-6">{statusMsg}</p>
            <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"><RefreshCw size={16} /> Reload Application</button>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 relative">
      
      {appState === 'LOADING' && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-900 text-white">
            <Database className="animate-bounce w-10 h-10 mb-4 text-indigo-500"/>
            <p className="text-sm font-medium">{statusMsg}</p>
            <p className="text-xs text-slate-500 mt-2">Your Patience is Appreciated...</p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-4 border-indigo-600 px-6 py-4 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200 transform -rotate-3">
            <MapIcon size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                DLV<span className="text-indigo-600">-</span>SIGHTS
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                {facilityStats.active} Facilities <span className="text-slate-300 mx-1">|</span> {connectionStats.valid} Routes
            </p>
          </div>
        </div>

        <div className="text-right flex items-center gap-4">
            <div className="flex flex-col items-end">
                <WeatherWidget lat={selectedFacility?.lat} lng={selectedFacility?.lng} locationName={selectedFacility?.name?.split('_')[1] || "Select Hub"}/>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <LiveClock />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-96 bg-white border-r border-slate-200 flex flex-col z-10 shadow-lg relative">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">BETA VERSION: USE FACILITY FILTER (TOP RIGHT) AND ROUTE FILTER (BOTTOM RIGHT) TO CUSTOMIZE YOUR DATA</h3>
                {selectedFacility && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">FOCUSED</span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-20">
                {selectedFacility && currentStats ? (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Selected Hub Header with Summary */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative group">
                            <h2 className="text-lg font-bold text-slate-800 mb-1">{selectedFacility.name}</h2>
                            <div className="flex gap-2 text-xs text-slate-500 mb-2">
                                <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5"/>
                                <span className="leading-tight">{selectedFacility.address}</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 text-[10px]">
                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 font-mono">
                                    Type: <b>{selectedFacility.type}</b>
                                </span>
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-medium">
                                    {currentStats.rawOutCount} Outbound
                                </span>
                                <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200 font-medium">
                                    {currentStats.rawInCount} Inbound
                                </span>
                            </div>

                            <button onClick={() => { setSelectedFacility(null); mapInstanceRef.current.closePopup(); }} className="mt-3 text-xs text-red-500 hover:text-red-700 underline flex items-center gap-1 font-medium"><ArrowRight className="rotate-180" size={12}/> Clear Selection</button>
                        </div>

                        {/* Shift Breakdown Matrix */}
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Shift Breakdown</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {/* Morning */}
                                <div className="bg-white p-2 rounded border border-orange-100 text-center">
                                    <div className="flex justify-center mb-1"><Sunrise size={14} className="text-orange-400"/></div>
                                    <div className="text-[10px] font-bold text-slate-700">MORNING</div>
                                    <div className="text-[9px] text-slate-400 mb-1">06:00 - 14:00</div>
                                    
                                    <div className="flex justify-between text-[10px] border-t border-slate-100 pt-1 mt-1 text-left">
                                        <div className="flex flex-col items-start">
                                            <span className="text-emerald-600 font-bold">Out: {currentStats.shifts.MORNING.out}</span>
                                            <span className="text-[7px] text-slate-400">F:{currentStats.shifts.MORNING.out_ftl} C:{currentStats.shifts.MORNING.out_crt}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-amber-600 font-bold">In: {currentStats.shifts.MORNING.in}</span>
                                            <span className="text-[7px] text-slate-400">F:{currentStats.shifts.MORNING.in_ftl} C:{currentStats.shifts.MORNING.in_crt}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Afternoon */}
                                <div className="bg-white p-2 rounded border border-blue-100 text-center">
                                    <div className="flex justify-center mb-1"><Sun size={14} className="text-blue-400"/></div>
                                    <div className="text-[10px] font-bold text-slate-700">AFTERNOON</div>
                                    <div className="text-[9px] text-slate-400 mb-1">14:00 - 22:00</div>
                                    
                                    <div className="flex justify-between text-[10px] border-t border-slate-100 pt-1 mt-1 text-left">
                                        <div className="flex flex-col items-start">
                                            <span className="text-emerald-600 font-bold">Out: {currentStats.shifts.AFTERNOON.out}</span>
                                            <span className="text-[7px] text-slate-400">F:{currentStats.shifts.AFTERNOON.out_ftl} C:{currentStats.shifts.AFTERNOON.out_crt}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-amber-600 font-bold">In: {currentStats.shifts.AFTERNOON.in}</span>
                                            <span className="text-[7px] text-slate-400">F:{currentStats.shifts.AFTERNOON.in_ftl} C:{currentStats.shifts.AFTERNOON.in_crt}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Night */}
                                <div className="bg-white p-2 rounded border border-indigo-100 text-center">
                                    <div className="flex justify-center mb-1"><Moon size={14} className="text-indigo-400"/></div>
                                    <div className="text-[10px] font-bold text-slate-700">NIGHT</div>
                                    <div className="text-[9px] text-slate-400 mb-1">22:00 - 06:00</div>
                                    
                                    <div className="flex justify-between text-[10px] border-t border-slate-100 pt-1 mt-1 text-left">
                                        <div className="flex flex-col items-start">
                                            <span className="text-emerald-600 font-bold">Out: {currentStats.shifts.NIGHT.out}</span>
                                            <span className="text-[7px] text-slate-400">F:{currentStats.shifts.NIGHT.out_ftl} C:{currentStats.shifts.NIGHT.out_crt}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-amber-600 font-bold">In: {currentStats.shifts.NIGHT.in}</span>
                                            <span className="text-[7px] text-slate-400">F:{currentStats.shifts.NIGHT.in_ftl} C:{currentStats.shifts.NIGHT.in_crt}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Filters (Pills) */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {['ALL', 'FTL', 'CARTING', 'LONG'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setSidebarFilter(f)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors border ${
                                        sidebarFilter === f 
                                        ? 'bg-indigo-600 text-white border-indigo-600' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                                    }`}
                                >
                                    {f === 'LONG' ? '> 500KM' : f}
                                </button>
                            ))}
                        </div>

                        {/* NEW: Collapsible Sorter */}
                        <div className="border border-slate-100 rounded-lg overflow-hidden">
                            <button 
                                onClick={() => setShowSortOptions(!showSortOptions)}
                                className="w-full flex justify-between items-center px-3 py-2 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-500"
                            >
                                <div className="flex items-center gap-1"><SlidersHorizontal size={12}/> More Options</div>
                                {showSortOptions ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                            </button>
                            
                            {showSortOptions && (
                                <div className="p-3 bg-white space-y-3 animate-fadeIn">
                                    {/* Sort By */}
                                    <div>
                                        <h5 className="text-[10px] uppercase text-slate-400 font-bold mb-2">Sort By</h5>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                onClick={() => setSortConfig({key:'dist', dir: sortConfig.key === 'dist' && sortConfig.dir === 'desc' ? 'asc' : 'desc'})}
                                                className={`flex items-center justify-center gap-1 py-1.5 rounded text-[10px] border ${sortConfig.key === 'dist' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                                            >
                                                Distance <ArrowDownUp size={10} />
                                            </button>
                                            <button 
                                                onClick={() => setSortConfig({key:'size', dir: sortConfig.key === 'size' && sortConfig.dir === 'asc' ? 'desc' : 'asc'})}
                                                className={`flex items-center justify-center gap-1 py-1.5 rounded text-[10px] border ${sortConfig.key === 'size' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                                            >
                                                Vehicle Size <ArrowDownUp size={10} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 italic text-center pt-1">
                                        Currently sorted by: <b>{sortConfig.key === 'dist' ? 'Distance' : 'Vehicle'} ({sortConfig.dir === 'asc' ? 'Low-High' : 'High-Low'})</b>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Outbound Card */}
                        {filters.showOutbound && (
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div> Outbound ({currentStats.outbound.length})
                                </h4>
                                <div className="space-y-2">
                                    {currentStats.outbound.length === 0 ? 
                                        <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded border border-slate-100 text-center">No outbound routes match current filters.</div> :
                                    currentStats.outbound.map((conn, idx) => (
                                        <div key={idx} className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg hover:bg-emerald-50 transition-colors shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-bold text-emerald-900">{conn.cn}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-emerald-700 border border-emerald-200 bg-white px-1.5 py-0.5 rounded mb-1">{conn.vmode}</span>
                                                    <span className="text-[10px] text-slate-500 font-medium">{conn.vehicle_size}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between text-xs mt-2 bg-white/60 p-2 rounded border border-emerald-100/50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">ETD</span>
                                                    <span className="font-bold text-emerald-700 text-sm">{conn.cutoff}</span>
                                                </div>
                                                <div className="flex flex-col items-center px-2">
                                                        <span className="text-[10px] text-slate-400 mb-0.5 font-mono bg-slate-100 px-1 rounded">{conn.tat}h</span>
                                                        <div className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">{conn.dist > 0 ? conn.dist + ' km' : 'N/A'}</div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase">ETA</span>
                                                    <span className="text-slate-600 font-medium">{conn.eta}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Inbound Card */}
                        {filters.showInbound && (
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-200"></div> Inbound ({currentStats.inbound.length})
                                </h4>
                                <div className="space-y-2">
                                    {currentStats.inbound.length === 0 ? 
                                        <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded border border-slate-100 text-center">No inbound routes match current filters.</div> :
                                    currentStats.inbound.map((conn, idx) => (
                                        <div key={idx} className="bg-amber-50/50 border border-amber-100 p-3 rounded-lg hover:bg-amber-50 transition-colors shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-bold text-amber-900">{conn.oc}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-amber-700 border border-amber-200 bg-white px-1.5 py-0.5 rounded mb-1">{conn.vmode}</span>
                                                    <span className="text-[10px] text-slate-500 font-medium">{conn.vehicle_size}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-xs mt-2 bg-white/60 p-2 rounded border border-amber-100/50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase">ETD</span>
                                                    <span className="text-slate-600 font-medium">{conn.cutoff}</span>
                                                </div>
                                                <div className="flex flex-col items-center px-2">
                                                        <span className="text-[10px] text-slate-400 mb-0.5 font-mono bg-slate-100 px-1 rounded">{conn.tat}h</span>
                                                        <div className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">{conn.dist > 0 ? conn.dist + ' km' : 'N/A'}</div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">ETA</span>
                                                    <span className="font-bold text-amber-700 text-sm">{conn.eta}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center opacity-60">
                        <div className="bg-slate-100 p-4 rounded-full mb-4"><Truck className="w-10 h-10 text-slate-400" /></div>
                        <h3 className="text-sm font-bold text-slate-600 mb-1">Explore DELHIVERY Network Like Never Before</h3>
                        <p className="text-xs max-w-[200px] leading-relaxed">Click on any <span className="text-blue-500 font-bold">Facility Marker</span> on the map to inspect its FTL/CARTING/AIR connections.</p>
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-400 text-center font-medium tracking-wide">Designed & Crafted by Rh. | for 🦅 Black Falcons</div>
        </aside>

        {/* Map Area */}
        <main className="flex-1 relative bg-slate-900">
          <div id="map" ref={mapRef} className="absolute inset-0 z-0 outline-none" />
          
          {/* Facility Type Filters (Top Right) - Collapsible */}
          {appState === 'READY' && (
              <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2">
                  <button 
                     onClick={() => setShowFacLegend(!showFacLegend)}
                     className={`bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg text-slate-600 hover:text-indigo-600 hover:bg-white transition-all border border-slate-200 ${showFacLegend ? 'ring-2 ring-indigo-100 text-indigo-600' : ''}`}
                     title="Facility Filters"
                  >
                      <MapPin size={20} strokeWidth={2} />
                  </button>

                  {showFacLegend && (
                    <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-2xl text-xs border border-slate-200/50 w-44 animate-fadeIn origin-top-right">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                           <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-widest">Facility Type</h4>
                           <button onClick={() => setShowFacLegend(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                        </div>
                        <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50/50 p-1.5 rounded transition-colors">
                                <input type="checkbox" className="accent-indigo-600" checked={facTypeFilters.GW} onChange={e => setFacTypeFilters({...facTypeFilters, GW: e.target.checked})}/>
                                <div className="w-2.5 h-2.5 rounded-full bg-violet-600 shadow-sm shadow-violet-200"></div>
                                <span className={facTypeFilters.GW ? "text-slate-700 font-medium" : "text-slate-400"}>Gateway (GW)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50/50 p-1.5 rounded transition-colors">
                                <input type="checkbox" className="accent-blue-500" checked={facTypeFilters.H} onChange={e => setFacTypeFilters({...facTypeFilters, H: e.target.checked})}/>
                                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-sm shadow-blue-200"></div>
                                <span className={facTypeFilters.H ? "text-slate-700 font-medium" : "text-slate-400"}>Hub (H)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50/50 p-1.5 rounded transition-colors">
                                <input type="checkbox" className="accent-sky-500" checked={facTypeFilters.I} onChange={e => setFacTypeFilters({...facTypeFilters, I: e.target.checked})}/>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 shadow-sm shadow-cyan-200"></div>
                                <span className={facTypeFilters.I ? "text-slate-700 font-medium" : "text-slate-400"}>IPC (I)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50/50 p-1.5 rounded transition-colors">
                                <input type="checkbox" className="accent-slate-400" checked={facTypeFilters.OTH} onChange={e => setFacTypeFilters({...facTypeFilters, OTH: e.target.checked})}/>
                                <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                                <span className={facTypeFilters.OTH ? "text-slate-700 font-medium" : "text-slate-400"}>Others</span>
                            </label>
                        </div>
                    </div>
                  )}
              </div>
          )}

          {/* Route Filters (Bottom Right) - Collapsible */}
          {appState === 'READY' && (
            <div className="absolute bottom-6 right-6 flex flex-col items-end z-[400] gap-2">
               <button 
                  onClick={() => setShowRouteLegend(!showRouteLegend)}
                  className={`bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg text-slate-600 hover:text-emerald-600 hover:bg-white transition-all border border-slate-200 ${showRouteLegend ? 'ring-2 ring-emerald-100 text-emerald-600' : ''}`}
                  title="Route Filters"
               >
                  <Filter size={20} strokeWidth={2} />
               </button>

               {showRouteLegend && (
                  <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-2xl text-xs border border-slate-200/50 w-56 animate-fadeIn origin-bottom-right">
                      <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                          <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-widest">Route Options</h4>
                          <button onClick={() => setShowRouteLegend(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                      </div>

                      <div className="space-y-2 mb-4">
                          <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50/50 p-1.5 rounded transition-colors">
                              <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${filters.showOutbound ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-slate-300'}`}></span>
                                  <span className={filters.showOutbound ? 'text-slate-700 font-medium' : 'text-slate-400'}>Outbound</span>
                              </div>
                              <input type="checkbox" className="accent-emerald-500" checked={filters.showOutbound} onChange={(e) => setFilters({...filters, showOutbound: e.target.checked})}/>
                          </label>
                          <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50/50 p-1.5 rounded transition-colors">
                              <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${filters.showInbound ? 'bg-amber-500 shadow-sm shadow-amber-200' : 'bg-slate-300'}`}></span>
                                  <span className={filters.showInbound ? 'text-slate-700 font-medium' : 'text-slate-400'}>Inbound</span>
                              </div>
                              <input type="checkbox" className="accent-amber-500" checked={filters.showInbound} onChange={(e) => setFilters({...filters, showInbound: e.target.checked})}/>
                          </label>
                      </div>

                      {Object.keys(filters.vmodes).length > 0 && (
                          <div className="border-t border-slate-100 pt-3">
                              <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Service Type</h5>
                              <div className="space-y-1 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
                                  {Object.keys(filters.vmodes).sort().map(mode => (
                                      <label key={mode} className="flex items-center justify-between cursor-pointer hover:bg-slate-50/50 p-1.5 rounded transition-colors">
                                          <span className={`truncate ${filters.vmodes[mode] ? 'text-slate-600' : 'text-slate-400 line-through'}`}>{mode}</span>
                                          <input type="checkbox" className="accent-indigo-500" checked={filters.vmodes[mode]} onChange={(e) => setFilters(p => ({...p, vmodes: {...p.vmodes, [mode]: e.target.checked}}))}/>
                                      </label>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
               )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
