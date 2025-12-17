import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Map as MapIcon, Layers, Truck, ArrowRight, Filter, Database, AlertCircle, RefreshCw, MapPin, Square, ChevronUp, ChevronDown, Minimize2, Navigation, Tag, SlidersHorizontal, ArrowDownUp, Sun, Moon, Sunrise, Sunset, AlertTriangle, MessageSquare, Cloud, CloudRain, CloudLightning, CloudSnow, Clock as ClockIcon, Thermometer, X, Loader2, Search, LocateFixed, Sparkles, Route as RouteIcon, ArrowLeft, Timer, Activity, TrendingUp, Lightbulb, Lock, Unlock, Zap, Satellite, BarChart3, Gauge, Milestone, List, PieChart, Info, Bell, ShieldCheck, CheckCircle2, Cpu, Globe, WifiOff, Settings, CornerUpLeft, CornerUpRight, Move, Ban, Eye, GitMerge, GitCommit, Repeat, ArrowUpCircle, ArrowDownCircle, History, Waypoints, Package, Hourglass, PlayCircle, StopCircle, ArrowLeftRight, Flag } from 'lucide-react';

// ==========================================
// 1. DATA SOURCE CONFIGURATION
// ==========================================

const FACILITY_DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStGLrqXIxCAtIaFRYfQW0V7L1Or2uOL-vyXMMqOf1hnx6GdYrn1Y_yY3ex3VIKsKfremF-GtC_X7_P/pub?output=csv";
const CONNECTION_DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQRUpjmmU-vIisjGmoF8Mv5E6qyuetEG_iIWj6i_HDFPH7BYcY-juDFpj2V6UOAz-95d2EhpTeFW-7J/pub?output=csv";
const MAPBOX_TOKEN = "pk.eyJ1IjoicmFodWxwaCIsImEiOiJjbWZpbTVnMnYwbjg3MmxweTRmcG1rdDNtIn0.mIOYkpIEShhheDWZ8BvtHA";

// Map Layer Configuration
const MAP_STYLES = [
    { 
        id: 'google_terrain', 
        name: 'Terrain (Default)', 
        icon: <MapIcon size={14}/>,
        url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', 
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps' 
    },
    { 
        id: 'google_hybrid', 
        name: 'Satellite Hybrid', 
        icon: <Satellite size={14}/>,
        url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', 
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps' 
    },
    { 
        id: 'carto_dark', 
        name: 'Dark Matter', 
        icon: <Moon size={14}/>,
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', 
        subdomains: ['a', 'b', 'c', 'd'],
        attribution: '&copy; CartoDB' 
    },
    { 
        id: 'carto_light', 
        name: 'Positron (Light)', 
        icon: <Sun size={14}/>,
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', 
        subdomains: ['a', 'b', 'c', 'd'],
        attribution: '&copy; CartoDB' 
    }
];

// Loading Screen Tips Data
const LOADING_TIPS = [
    { 
        icon: <Globe size={24} className="text-blue-400"/>,
        title: "Network Visualization", 
        desc: "Visualize the entire logistics web. Blue nodes represent Hubs, while Violet nodes indicate Gateways." 
    },
    { 
        icon: <Repeat size={24} className="text-pink-400"/>,
        title: "Round Trip Logic", 
        desc: "Advanced algos now stitch together Forward and Reverse legs into complete Round Trip circuits." 
    },
    { 
        icon: <Waypoints size={24} className="text-emerald-400"/>,
        title: "Full Route Tracing", 
        desc: "Click on any multi-stop route to see the vehicle's entire journey traced sequentially on the map." 
    },
    { 
        icon: <Search size={24} className="text-indigo-400"/>,
        title: "Smart Search", 
        desc: "Type a pincode (e.g., '110037') or a partial address to instantly fly the camera to the nearest facility." 
    },
    { 
        icon: <Hourglass size={24} className="text-amber-400"/>,
        title: "Buffer Calculation", 
        desc: "The system automatically deduces loading/unloading times at each stop by comparing schedule vs. road time." 
    }
];

// Flag Icon Component
const FlagIcon = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
        <line x1="4" y1="22" x2="4" y2="15"></line>
    </svg>
);

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
      script.onerror = () => {
          console.error(`Failed to load script: ${url}`);
      };
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

// Distance Helper (Haversine Formula - Air Distance)
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

// Time Formatter for Duration (Seconds to H:M)
const formatDuration = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
};

// Helper: Parse HH:MM to minutes from midnight
const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + m;
};

// Helper: Format minutes to HH:MM
const formatTimeFromMinutes = (minutes) => {
    let m = Math.round(minutes);
    // Handle day wrap
    while (m < 0) m += 1440;
    while (m >= 1440) m -= 1440;
    
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
};

// Helper: Calculate duration between two time strings in MINUTES (handles midnight crossing)
const calculateTimeDiffMinutes = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    let start = parseTime(startStr);
    let end = parseTime(endStr);
    if (end < start) end += 24 * 60; // Assume next day if end < start
    return end - start;
};

// Helper: Calculate duration between two time strings in HOURS
const calculateTimeDiffHours = (startStr, endStr) => {
    return calculateTimeDiffMinutes(startStr, endStr) / 60;
};

// Shift Helper
const getShift = (timeStr) => {
    if (!timeStr) return 'UNK';
    const cleanTime = timeStr.split(' ')[0]; 
    const hour = parseInt(cleanTime.split(':')[0], 10);
    
    if (isNaN(hour)) return 'UNK';

    // Morning: 06:00 to 13:59
    if (hour >= 6 && hour < 14) return 'MORNING';
    // Afternoon: 14:00 to 21:59
    if (hour >= 14 && hour < 22) return 'AFTERNOON';
    // Night: 22:00 to 05:59
    return 'NIGHT';
};

// --- WEATHER WIDGET ---
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
            Loading...
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

// --- LIVE CLOCK ---
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

// --- DYNAMIC TIPS TICKER ---
const TipsTicker = () => {
    const tips = [
        "Tip: Search by Pincode (e.g. '110037') to find the nearest hub instantly.",
        "Feature: Round Trips now auto-detected! Look for the 'Round Trip' cards.",
        "Did you know? You can see the live weather information of the selected facility on top-right!",
        "Tip: Click on a Round Trip card to trace the entire vehicle journey on the map.",
        "Guide: Blue = Hubs, Violet = Gateways, Cyan = IPCs.",
        "Tip: Use the Smart Search to find locations by raw address text."
    ];
    
    const [currentTip, setCurrentTip] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false); // Fade out
            setTimeout(() => {
                setCurrentTip((prev) => (prev + 1) % tips.length);
                setFade(true); // Fade in
            }, 500);
        }, 6000); // Change every 6 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 mt-1 text-[10px] font-medium text-slate-400 max-w-md overflow-hidden">
            <Lightbulb size={12} className="text-amber-400 shrink-0" />
            <span className={`transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'} truncate`}>
                {tips[currentTip]}
            </span>
        </div>
    );
};

const NotificationBanner = ({ notification, onClose }) => {
    if (!notification) return null;
    
    return (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[2000] animate-fadeIn">
            <div className={`px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border ${
                notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
                notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
                'bg-slate-800 border-slate-700 text-white'
            }`}>
                {notification.type === 'error' ? <AlertCircle size={18}/> : 
                 notification.type === 'success' ? <Zap size={18} className="text-emerald-500 fill-emerald-500"/> : 
                 <Info size={18}/>}
                <div className="text-sm font-medium whitespace-pre-line">{notification.message}</div>
                <button onClick={onClose} className="p-1 hover:bg-black/10 rounded"><X size={14}/></button>
            </div>
        </div>
    );
}

// --- COMPONENT: ROUND TRIP CARD (Creative Circuit View) ---
const RoundTripCard = ({ data, onSelect }) => {
    const { routeId, forward, reverse } = data;
    
    // Calculate Stats
    const startTime = forward[0].cutoff;
    const endTime = reverse[reverse.length - 1].eta;
    
    // Construct Route Name: "OC -> P1 -> P2 -> OC"
    const sequenceNames = [forward[0].oc, ...forward.map(f => f.cn)];
    const routeDisplayName = sequenceNames.join(' → ');

    return (
        <div onClick={() => onSelect(data)} className="bg-white border border-pink-200 rounded-xl p-0 shadow-md relative overflow-hidden group hover:border-pink-400 transition-all mb-3 cursor-pointer">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-50 to-white p-3 border-b border-pink-100">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className="bg-pink-100 text-pink-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-pink-200 uppercase tracking-wide flex items-center gap-1">
                            <Repeat size={10}/> Round Trip
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {routeId}</span>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-medium">Trip Duration</div>
                        <div className="text-xs font-black text-pink-600 font-mono">{startTime} - {endTime}</div>
                    </div>
                </div>
                <div className="text-xs font-bold text-slate-700 leading-tight">
                    {routeDisplayName}
                </div>
            </div>

            {/* Circuit Visualization */}
            <div className="p-3 relative">
                {/* Center Spine */}
                <div className="absolute left-1/2 top-4 bottom-4 w-px bg-slate-100 transform -translate-x-1/2"></div>

                <div className="flex gap-4">
                    {/* Left: Forward / Outbound */}
                    <div className="flex-1">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-1">
                            <ArrowDownCircle size={10} className="text-emerald-500"/> Outbound
                        </div>
                        <div className="space-y-3 relative">
                            {/* Line */}
                            <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-200 to-emerald-50/0 rounded-full"></div>
                            
                            {/* Start Point */}
                            <div className="flex flex-col items-end relative pr-3 group/step">
                                <div className="absolute right-[-3px] top-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 border border-white shadow-sm z-10"></div>
                                <div className="text-[10px] font-bold text-slate-700">{forward[0].oc}</div>
                                <div className="text-[8px] font-mono text-slate-400">Dep: {forward[0].cutoff}</div>
                            </div>

                            {forward.map((stop, i) => (
                                <div key={i} className="flex flex-col items-end relative pr-3 group/step">
                                    <div className="absolute right-[-3px] top-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white shadow-sm z-10"></div>
                                    <div className="text-[10px] font-bold text-slate-700 group-hover/step:text-indigo-600 transition-colors">{stop.cn}</div>
                                    <div className="text-[8px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100">
                                        Arr: {stop.eta}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Reverse / Inbound */}
                    <div className="flex-1">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-1">
                            <ArrowUpCircle size={10} className="text-amber-500"/> Inbound
                        </div>
                        <div className="space-y-3 relative">
                             {/* Line */}
                             <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gradient-to-t from-amber-200 to-amber-50/0 rounded-full"></div>

                             {reverse.map((stop, i) => (
                                <div key={i} className="flex flex-col items-start relative pl-3 group/step">
                                    <div className="absolute left-[-3px] top-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 border border-white shadow-sm z-10"></div>
                                    <div className="text-[10px] font-bold text-slate-700 group-hover/step:text-indigo-600 transition-colors">{stop.oc}</div>
                                    <div className="text-[8px] font-mono text-amber-600 bg-amber-50 px-1 rounded border border-amber-100">
                                        Dep: {stop.cutoff}
                                    </div>
                                </div>
                            ))}
                            
                            {/* Final Point */}
                            <div className="flex flex-col items-start relative pl-3 group/step">
                                <div className="absolute left-[-3px] top-1.5 w-1.5 h-1.5 rounded-full bg-slate-800 border border-white shadow-sm z-10"></div>
                                <div className="text-[10px] font-bold text-slate-700">{reverse[reverse.length-1].cn}</div>
                                <div className="text-[8px] font-mono text-slate-400">Arr: {reverse[reverse.length-1].eta}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Loop Connector Visual at bottom */}
                <div className="mt-2 flex justify-center">
                    <div className="h-1 w-1/2 bg-gradient-to-r from-emerald-100 via-slate-200 to-amber-100 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: ROUTE CARD (Standard) ---
const RouteCard = ({ type, data, onSelect, facilityMap }) => {
    const isMilkRun = data.stops && data.stops.length > 1;

    // Direct (Single) Connection Card
    if (!isMilkRun) {
        const conn = isMilkRun ? data.stops[0] : data;
        const isOutbound = type === 'outbound';
        const colorClass = isOutbound ? 'emerald' : 'amber';
        
        return (
            <div onClick={() => onSelect(conn)} className={`bg-${colorClass}-50/50 border border-${colorClass}-100 p-3 rounded-lg hover:bg-${colorClass}-50 transition-colors shadow-sm cursor-pointer hover:border-${colorClass}-300 group`}>
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-bold text-${colorClass}-900`}>{isOutbound ? conn.cn : conn.oc}</span>
                    <div className="flex flex-col items-end">
                        <span className={`text-[10px] font-bold text-${colorClass}-700 border border-${colorClass}-200 bg-white px-1.5 py-0.5 rounded mb-1`}>{conn.vmode}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{conn.vehicle_size}</span>
                    </div>
                </div>
                
                <div className={`flex items-center justify-between text-xs mt-2 bg-white/60 p-2 rounded border border-${colorClass}-100/50`}>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">ETD</span>
                        <span className={`font-bold text-${colorClass}-700 text-sm`}>{conn.cutoff}</span>
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
        );
    }

    // Milk Run Card (One Way)
    const stops = data.stops;
    const isOutbound = type === 'outbound';
    
    return (
        <div onClick={() => onSelect(data)} className="bg-white border border-slate-200 rounded-lg p-3 shadow-md relative overflow-hidden group hover:border-indigo-300 transition-all cursor-pointer">
            {/* Header Badge */}
            <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg shadow-sm flex items-center gap-1">
                <GitMerge size={10} className="text-indigo-100"/> MILK RUN
            </div>

            <div className="mb-3 pr-16">
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-0.5">
                    {isOutbound ? 'Multi-Stop Distribution' : 'Multi-Stop Collection'}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                    {stops[0].vmode} • {stops[0].vehicle_size}
                </div>
            </div>

            {/* Stepper Visualization */}
            <div className="relative pl-2 py-1">
                <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-slate-200"></div>

                {isOutbound && (
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-800">{stops[0].oc}</div>
                            <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block border border-emerald-100">
                                Dep: {stops[0].cutoff}
                            </div>
                        </div>
                    </div>
                )}

                {stops.map((stop, idx) => {
                    const isLast = idx === stops.length - 1;
                    const nodeName = isOutbound ? stop.cn : stop.oc;
                    const timeLabel = isOutbound ? `Arr: ${stop.eta}` : `Dep: ${stop.cutoff}`;
                    const timeColor = isOutbound ? 'text-slate-500' : 'text-slate-500';

                    return (
                        <div key={idx} className="flex items-start gap-3 mb-4 last:mb-0 relative z-10 group/stop">
                            <div className={`w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center shrink-0 transition-colors ${isLast && !isOutbound ? 'bg-slate-800' : 'bg-white border-indigo-200'}`}>
                                <div className={`w-2 h-2 rounded-full ${isLast && !isOutbound ? 'bg-white' : 'bg-indigo-500'}`}></div>
                            </div>
                            <div className="flex-1 -mt-0.5 p-1.5 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                                <div className="text-xs font-bold text-slate-700 group-hover/stop:text-indigo-600">{nodeName}</div>
                                <div className={`text-[9px] font-mono ${timeColor} flex items-center gap-2`}>
                                    <span>{timeLabel}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {!isOutbound && (
                    <div className="flex items-center gap-3 mt-0 relative z-10">
                         <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-800">{stops[0].cn}</div>
                            <div className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded inline-block border border-amber-100">
                                Arr: {stops[0].eta}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const App = () => {
  const leafletCssLoaded = useExternalResource('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'style');
  const leafletJsLoaded = useExternalResource('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'script');
  const papaParseLoaded = useExternalResource('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js', 'script');

  const [facilities, setFacilities] = useState([]);
  const [connections, setConnections] = useState([]);
  const [notification, setNotification] = useState(null);
  
  // SELECTION STATE
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [selectedRouteGroup, setSelectedRouteGroup] = useState(null); // For Multi-Stop/RoundTrip
  
  const [facilityStats, setFacilityStats] = useState({ total: 0, active: 0 });
  const [connectionStats, setConnectionStats] = useState({ total: 0, valid: 0 });
  
  const [filters, setFilters] = useState({
      showOutbound: true,
      showInbound: true,
      showRoundTrips: true, // NEW FILTER
      vmodes: {}
  });

  const [facTypeFilters, setFacTypeFilters] = useState({
      GW: true, 
      H: true,  
      I: true, 
      OTH: false 
  });

  const [sidebarFilter, setSidebarFilter] = useState('ALL'); 
  const [sortConfig, setSortConfig] = useState({ key: 'dist', dir: 'desc' }); 

  const [showFacLegend, setShowFacLegend] = useState(true); // OPEN BY DEFAULT
  
  // NEW UI STATES
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(true); // For sidebar accordion
  const [showSlowGenWarning, setShowSlowGenWarning] = useState(false);
  const [showMapLayers, setShowMapLayers] = useState(false); // Map layer selector
  const [currentMapStyle, setCurrentMapStyle] = useState(MAP_STYLES[0]); // Default to Terrain

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isPincodeSearching, setIsPincodeSearching] = useState(false);

  // ROUTING & MAPBOX STATE
  const [activePaths, setActivePaths] = useState({}); // Store cached paths
  const routeCache = useRef({}); // Persist across renders
  const [mapboxUnlocked, setMapboxUnlocked] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [showPasskeyInput, setShowPasskeyInput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false); // Ref for timeout access
  const [genProgress, setGenProgress] = useState('');
  const [detailedViewMode, setDetailedViewMode] = useState('ANATOMY'); // 'ANATOMY' or 'STEPS'

  // NEW UI TWEAK STATES
  const [showShiftBreakdown, setShowShiftBreakdown] = useState(false);
  const [showRouteGenModal, setShowRouteGenModal] = useState(false);
  const [routeGenTarget, setRouteGenTarget] = useState('ALL'); // 'ALL', 'INBOUND', 'OUTBOUND', 'ROUNDTRIP'


  const [appState, setAppState] = useState('LOADING'); // LOADING, VERIFY, READY, ERROR
  const [statusMsg, setStatusMsg] = useState('Initializing Satellite Link...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentLoadingTipIndex, setCurrentLoadingTipIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const tileLayerRef = useRef(null); // Reference to the tile layer for switching
  const initTimerRef = useRef(null);
  const safetyTimerRef = useRef(null);

  const areScriptsLoaded = leafletCssLoaded && leafletJsLoaded && papaParseLoaded;

  // --- LOADING TIPS CYCLER ---
  useEffect(() => {
      if (appState === 'LOADING') {
          const interval = setInterval(() => {
              setCurrentLoadingTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
          }, 4000); // Change tip every 4 seconds
          return () => clearInterval(interval);
      }
  }, [appState]);

  // --- HELPER: FACILITY TYPE ---
  const getFacilityType = (name) => {
      if (!name) return 'OTH';
      const parts = name.split('_');
      const suffix = parts[parts.length - 1].toUpperCase();
      if (['GW'].includes(suffix)) return 'GW';
      if (['H', 'HUB'].includes(suffix)) return 'H'; 
      if (['I'].includes(suffix)) return 'I';
      return 'OTH';
  };

  const showToast = (message, type = 'info') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 5000);
  };

  const getFacilityStyle = (type, isSelected) => {
      let radius, color, weight;
      
      switch (type) {
          case 'GW': radius = 7; break; 
          case 'H':  radius = 5.5; break;
          case 'I':  radius = 4; break;
          default:   radius = 4; 
      }

      if (isSelected) {
          radius += 4;
          weight = 3;
          color = '#1e293b'; // Darker border for selection on light map
      } else {
          weight = 1;
          color = '#475569'; // Slate 600 border for visibility on light map
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

  // --- SEARCH FILTER MEMO ---
  const filteredFacilities = useMemo(() => {
      if (!searchQuery) return [];
      return facilities
        .filter(f => {
            const stats = globalFacilityStats[f.name];
            const isActive = stats && (stats.in > 0 || stats.out > 0);
            if (!isActive) return false; 

            return f.name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .slice(0, 5); 
  }, [searchQuery, facilities, globalFacilityStats]);

  const isPincode = /^\d{6}$/.test(searchQuery);

  // --- HANDLERS ---
  const handleSearchSelect = (facility) => {
      setSelectedFacility(facility);
      setSelectedConnection(null); 
      setSelectedRouteGroup(null);
      if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([facility.lat, facility.lng], 10, { duration: 1.5 });
      }
      setSearchQuery('');
      setIsSearchFocused(false);
  };

  const handleConnectionClick = (data) => {
      if (data.forward || data.stops) {
          // It's a complex route (Round Trip or Milk Run)
          setSelectedRouteGroup(data);
          setSelectedConnection(null);
          // Trigger Multi-Stop Routing
          handleMultiStopRoute(data);
      } else {
          // Standard Single Connection
          setSelectedConnection(data);
          setSelectedRouteGroup(null);
      }
  };

  // NEW: Handle Multi-Stop Route Calculation and Visualization
  const handleMultiStopRoute = async (groupData) => {
      if (!groupData) return;
      
      // 1. Construct Waypoints List (Sequence of Lat/Lngs for Routing)
      let waypoints = [];
      
      if (groupData.forward && groupData.reverse) {
          // Round Trip - Create linear sequence
          waypoints.push(groupData.forward[0].oc);
          groupData.forward.forEach(s => waypoints.push(s.cn));
          // Reverse sequence (usually retracing or looping back)
          // We can append reverse stops. Note: reverse[0].oc is usually same as forward[last].cn
          groupData.reverse.forEach(s => waypoints.push(s.cn)); // reverse cn is the destination of inbound leg
      } else if (groupData.stops) {
          // Milk Run
          const first = groupData.stops[0];
          waypoints.push(first.oc);
          groupData.stops.forEach(s => waypoints.push(s.cn));
      }

      // Map Names to Lat/Lng
      const points = waypoints.map(name => {
          const fac = facilityMap[name];
          return fac ? { lat: fac.lat, lng: fac.lng } : null;
      }).filter(p => p !== null);

      // Remove adjacent duplicates to avoid OSRM errors (0 distance segments)
      const cleanPoints = points.filter((p, i) => {
          if (i === 0) return true;
          return p.lat !== points[i-1].lat || p.lng !== points[i-1].lng;
      });

      if (cleanPoints.length < 2) return;

      // 2. Fetch Route
      const routeKey = `MULTI_${groupData.routeId || groupData.stops[0].oc}`;
      if (routeCache.current[routeKey]) {
          setActivePaths(prev => ({ ...prev, [routeKey]: routeCache.current[routeKey] }));
          return;
      }

      setIsGenerating(true);
      try {
          const data = await fetchRouteOSRMMulti(cleanPoints);
          if (data) {
              routeCache.current[routeKey] = data;
              setActivePaths(prev => ({ ...prev, [routeKey]: data }));
          }
      } catch (e) {
          console.error("Multi-stop route failed", e);
          showToast("Could not trace full route path.", 'error');
      } finally {
          setIsGenerating(false);
      }
  };

  const handleUnlockMapbox = () => {
      if (passkeyInput === '1732') {
          setMapboxUnlocked(true);
          setShowPasskeyInput(false);
          setShowSlowGenWarning(false); // Close warning if unlocked via popup
          showToast("🚀 Mapbox Precision Mode Unlocked!", 'success');
      } else {
          showToast("❌ Invalid Access Key. Please try again.", 'error');
      }
  };

  const handleVerifyEntry = () => {
      setIsVerifying(true);
      setTimeout(() => {
          setIsVerifying(false);
          setAppState('READY');
      }, 1200); 
  };

  // --- SMART AI-LIKE ADDRESS SEARCH ---
  const performLocationSearch = async (query) => {
      setIsPincodeSearching(true);
      try {
          let searchAttempts = [query];
          const cleanedQuery = query.replace(/ke pass|near|opposite|opp|behind|next to/gi, "").trim();
          if (cleanedQuery !== query) searchAttempts.push(cleanedQuery);
          const parts = query.split(',');
          if (parts.length > 1) {
              const broadQuery = parts.slice(-2).join(',').trim();
              searchAttempts.push(broadQuery);
          }

          let data = null;
          let foundQuery = "";

          for (const q of searchAttempts) {
              const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=in&format=json&limit=1`);
              const results = await response.json();
              if (results && results.length > 0) {
                  data = results[0];
                  foundQuery = q;
                  break;
              }
          }

          if (data) {
              const { lat, lon, display_name } = data;
              const userLat = parseFloat(lat);
              const userLng = parseFloat(lon);

              let nearest = null;
              let minDist = Infinity;

              facilities.forEach(fac => {
                  const stats = globalFacilityStats[fac.name];
                  if (!stats || (stats.in === 0 && stats.out === 0)) return;

                  const d = calculateDistance(userLat, userLng, fac.lat, fac.lng);
                  if (d < minDist) {
                      minDist = d;
                      nearest = fac;
                  }
              });

              if (nearest) {
                  setSelectedFacility(nearest);
                  setSelectedConnection(null);
                  if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([nearest.lat, nearest.lng], 9, { duration: 1.5 });
                  }
                  setSearchQuery(''); 
                  showToast(`🔍 Found location: "${foundQuery}"\n📍 ${display_name}\n\n🚀 Nearest Facility: ${nearest.name} (~${minDist} km away)`, 'success');
              } else {
                  showToast("No active facilities found nearby.", 'error');
              }
          } else {
              showToast("Could not identify this location.", 'error');
          }
      } catch (error) {
          console.error("Geocoding error:", error);
          showToast("Failed to search location.", 'error');
      } finally {
          setIsPincodeSearching(false);
          setIsSearchFocused(false);
      }
  };

  const handlePincodeSearch = () => performLocationSearch(searchQuery);
  const handleSmartAddressSearch = () => performLocationSearch(searchQuery);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Safety Timer
    safetyTimerRef.current = setTimeout(() => {
        if (appState === 'LOADING') {
            setAppState('ERROR');
            setStatusMsg('Connection Timed Out. Resources failed to load.');
        }
    }, 15000);

    return () => {
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        if (initTimerRef.current) clearInterval(initTimerRef.current);
    }
  }, [appState]);

  useEffect(() => {
    if (!areScriptsLoaded) return;
    
    const checkAndInit = () => {
        if (window.Papa && window.L && mapRef.current) {
            if (initTimerRef.current) clearInterval(initTimerRef.current);
            initializeMap();
        } else {
            setStatusMsg('Initializing Map Engine...');
        }
    };
    initTimerRef.current = setInterval(checkAndInit, 200);
    return () => { if (initTimerRef.current) clearInterval(initTimerRef.current); };
  }, [areScriptsLoaded]);

  const initializeMap = () => {
    try {
        if (!mapInstanceRef.current) {
            const map = window.L.map(mapRef.current).setView([22.5937, 78.9629], 5);
            
            // NOTE: We do NOT add tile layer here anymore.
            // The useEffect below handles tile layer addition/switching.

            // Use featureGroup instead of layerGroup to allow bringToFront
            layerGroupRef.current = window.L.featureGroup().addTo(map);
            mapInstanceRef.current = map;
        }
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        loadData();
    } catch (err) {
        console.error("Init Error", err);
        setAppState('ERROR');
        setStatusMsg('Map Initialization Failed: ' + err.message);
    }
  };

  // --- MAP LAYER SWITCHER EFFECT ---
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Remove old layer if exists
    if (tileLayerRef.current) {
        tileLayerRef.current.remove();
    }

    // Create new layer
    tileLayerRef.current = window.L.tileLayer(currentMapStyle.url, {
        maxZoom: 20,
        subdomains: currentMapStyle.subdomains,
        attribution: currentMapStyle.attribution
    });

    // Add to map
    tileLayerRef.current.addTo(mapInstanceRef.current);

    // IMPORTANT: Move tile layer to back so it doesn't cover markers
    tileLayerRef.current.bringToBack();
    
    // Ensure overlays are on top
    if (layerGroupRef.current && layerGroupRef.current.bringToFront) {
        layerGroupRef.current.bringToFront();
    }

  }, [currentMapStyle, areScriptsLoaded, appState]); // Runs when map style changes or map is ready

  const loadData = async () => {
      setLoadingProgress(5);
      setStatusMsg('Establishing Secure Link...');
      
      try {
          await new Promise(r => setTimeout(r, 400));
          
          setStatusMsg('Acquiring Facility Manifest...');
          const facRes = await fetch(FACILITY_DATA_URL);
          setLoadingProgress(35);
          
          await new Promise(r => setTimeout(r, 200));

          setStatusMsg('Downloading Route Matrix...');
          const connRes = await fetch(CONNECTION_DATA_URL);
          setLoadingProgress(60);

          if (!facRes.ok || !connRes.ok) {
              throw new Error("Failed to download data files");
          }

          const facText = await facRes.text();
          const connText = await connRes.text();
          
          setStatusMsg('Compiling Geospatial Index...');
          setLoadingProgress(80);
          
          await new Promise(r => setTimeout(r, 300)); 
          
          processCSV(facText, connText);

      } catch (err) {
          console.error("Fetch Error:", err);
          setAppState('ERROR');
          setStatusMsg('Failed to load data. Please check internet connection.');
      }
  };

  const processCSV = (facText, connText) => {
    if (!window.Papa) return;
    setStatusMsg('Finalizing Data Structures...');

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
                                const routeId = row.route_id ? row.route_id.trim() : 'NA';
                                const routeSetId = row.route_set_id ? row.route_set_id.trim() : 'NA';
                                
                                const uniqueKey = `${ocClean}|${cnClean}|${row.cutoff_departure}|${row.eta}|${row.tat}|${vmode}|${vehSize}|${routeId}|${routeSetId}`;
                                
                                if (!seenConnections.has(uniqueKey)) {
                                    parsedConnections.push({
                                        oc: ocClean,
                                        cn: cnClean,
                                        vmode: vmode,
                                        cutoff: row.cutoff_departure,
                                        eta: row.eta,
                                        tat: row.tat,
                                        vehicle_size: vehSize,
                                        route_id: routeId,
                                        route_set_id: routeSetId
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

                        setLoadingProgress(100);
                        setStatusMsg('System Ready.');
                        
                        setTimeout(() => {
                            setAppState('VERIFY');
                        }, 500);
                    }
                });
            }
        });
    } catch (e) {
        setAppState('ERROR');
        setStatusMsg('Data Parsing Error: ' + e.message);
    }
  };

  // --- FILTERS, MAP UPDATES, ROUTING --- 
  
  useEffect(() => {
      if (connections.length > 0) {
          const modes = {};
          connections.forEach(c => {
              modes[c.vmode] = true;
          });
          setFilters(prev => ({ ...prev, vmodes: modes }));
      }
  }, [connections]);

  const facilityMap = useMemo(() => {
    const map = {};
    facilities.forEach(f => {
      map[f.name.trim()] = { lat: f.lat, lng: f.lng, type: f.type };
    });
    return map;
  }, [facilities]);

  const fetchRouteOSRM = async (origin, dest) => {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const legs = route.legs[0];
          const rawSegments = legs.steps.map(s => {
              const speedCalc = s.duration > 0 ? (s.distance / 1000) / (s.duration / 3600) : 0;
              return {
                  name: s.name || "Local Road",
                  dist: s.distance,
                  time: s.duration,
                  mode: s.mode,
                  instruction: s.maneuver,
                  geometry: s.geometry,
                  speed: speedCalc
              }
          });
          const aggregated = {};
          rawSegments.forEach(seg => {
              const key = seg.name;
              if(!aggregated[key]) aggregated[key] = { name: key, dist: 0, time: 0 };
              aggregated[key].dist += seg.dist;
              aggregated[key].time += seg.time;
          });
          const segments = Object.values(aggregated).map(s => ({...s, speed: s.time > 0 ? (s.dist / 1000) / (s.time / 3600) : 0})).sort((a,b) => b.dist - a.dist);
          return { coords: route.geometry.coordinates.map(c => [c[1], c[0]]), metrics: { distance: route.distance, duration: route.duration }, segments: segments, rawSteps: rawSegments };
      }
      return null;
  };

  // NEW: Fetch Route for Multiple Points and Return LEGS
  const fetchRouteOSRMMulti = async (points) => {
      // points = [{lat, lng}, {lat, lng}, ...]
      const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          
          // OSRM returns 'legs' array where leg[i] is from waypoint[i] to waypoint[i+1]
          // We need this detailed leg data for the buffer calculation
          return { 
              coords: route.geometry.coordinates.map(c => [c[1], c[0]]), 
              metrics: { distance: route.distance, duration: route.duration },
              legs: route.legs // Array of leg objects with duration and distance
          };
      }
      return null;
  };

  const fetchRouteMapbox = async (origin, dest) => {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?geometries=geojson&steps=true&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const legs = route.legs[0];
          const rawSegments = legs.steps.map(s => {
              const speedCalc = s.duration > 0 ? (s.distance / 1000) / (s.duration / 3600) : 0;
              return { name: s.name || "Local Road", dist: s.distance, time: s.duration, instruction: s.maneuver, geometry: s.geometry, speed: speedCalc }
          });
          const aggregated = {};
          rawSegments.forEach(seg => {
              const key = seg.name;
              if(!aggregated[key]) aggregated[key] = { name: key, dist: 0, time: 0 };
              aggregated[key].dist += seg.dist;
              aggregated[key].time += seg.time;
          });
          const segments = Object.values(aggregated).map(s => ({...s, speed: s.time > 0 ? (s.dist / 1000) / (s.time / 3600) : 0})).sort((a,b) => b.dist - a.dist);
          return { coords: data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]), metrics: { distance: data.routes[0].distance, duration: data.routes[0].duration }, segments: segments, rawSteps: rawSegments };
      }
      return null;
  };

  const handleRegenerateRoutes = async (provider = 'OSRM', targetFilter = null) => {
      let targets = [];
      const filterToUse = targetFilter || routeGenTarget;
      
      // If single route selected (Priority)
      if (selectedConnection) {
          targets = [selectedConnection];
      }
      else if (selectedRouteGroup) {
          // If a multi-stop group is active, maybe re-generate that?
          // For now, let's assume this button is for batch generation of the LIST
          // But if a group is selected, we might want to just refresh that.
          // Let's stick to the list logic for batch buttons.
      }
      
      // Batch Logic based on Facility
      if (selectedFacility && targets.length === 0) {
          if (filterToUse === 'ALL' || filterToUse === 'OUTBOUND') {
             targets = [...targets, ...connections.filter(c => c.oc === selectedFacility.name && filters.vmodes[c.vmode])];
          }
          if (filterToUse === 'ALL' || filterToUse === 'INBOUND') {
             targets = [...targets, ...connections.filter(c => c.cn === selectedFacility.name && filters.vmodes[c.vmode])];
          }
          // Note: Round trips are subsets of these connections, so fetching connections covers them
          // If we want to only fetch round trips, we'd need to filter the connections that belong to round trips
          // For simplicity, 'ROUNDTRIP' target could filter connections that have route_id
          if (filterToUse === 'ROUNDTRIP') {
             targets = connections.filter(c => (c.oc === selectedFacility.name || c.cn === selectedFacility.name) && c.route_id !== 'NA' && filters.vmodes[c.vmode]);
          }
      }

      if (targets.length === 0) {
          showToast("No routes found to visualize.", 'error');
          return;
      }
      
      // Close Modal
      setShowRouteGenModal(false);

      setIsGenerating(true);
      isGeneratingRef.current = true;
      setGenProgress(`0/${targets.length}`);
      
      // Start Warning Timer for OSRM
      let warningTimer = null;
      if (provider === 'OSRM') {
          warningTimer = setTimeout(() => {
              if (isGeneratingRef.current) {
                  setShowSlowGenWarning(true);
              }
          }, 10000); // 10 Seconds
      }

      const chunkSize = 5;
      for (let i = 0; i < targets.length; i += chunkSize) {
          const chunk = targets.slice(i, i + chunkSize);
          await Promise.all(chunk.map(async (conn) => {
              const routeKey = `${conn.oc}|${conn.cn}`;
              const origin = facilityMap[conn.oc];
              const dest = facilityMap[conn.cn];
              if (origin && dest) {
                  try {
                      let data;
                      if (provider === 'MAPBOX') data = await fetchRouteMapbox(origin, dest);
                      else data = await fetchRouteOSRM(origin, dest);
                      if (data) {
                          routeCache.current[routeKey] = data;
                          setActivePaths(prev => ({ ...prev, [routeKey]: data }));
                      }
                  } catch (e) { console.error("Route fetch failed", e); }
              }
          }));
          setGenProgress(`${Math.min(i + chunkSize, targets.length)}/${targets.length}`);
          if (provider === 'OSRM') await new Promise(r => setTimeout(r, 200)); 
      }
      
      if (warningTimer) clearTimeout(warningTimer);
      setIsGenerating(false);
      isGeneratingRef.current = false;
      setGenProgress('');
      showToast(`Successfully visualized ${targets.length} routes!`, 'success');
  };

  // Wrapper to open modal
  const openRouteGenModal = (target) => {
      setRouteGenTarget(target);
      setShowRouteGenModal(true);
  };

  useEffect(() => {
      if (!selectedConnection) return;
      const { oc, cn } = selectedConnection;
      const routeKey = `${oc}|${cn}`;
      if (routeCache.current[routeKey]) { setActivePaths(prev => ({ ...prev })); return; }
      const origin = facilityMap[oc];
      const dest = facilityMap[cn];
      if (!origin || !dest) return;
      fetchRouteOSRM(origin, dest).then(data => {
          if (data) {
              routeCache.current[routeKey] = data;
              setActivePaths(prev => ({ ...prev, [routeKey]: data }));
          }
      });
  }, [selectedConnection, facilityMap]);

  useEffect(() => {
    if (appState !== 'READY' && appState !== 'VERIFY' && appState !== 'LOADING') return; // Allow rendering during verify/loading if map ready
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    
    const L = window.L;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();
    const bounds = L.latLngBounds();
    let hasLayers = false;
    const connectedToSelection = new Set();
    
    if (selectedFacility) {
        connections.forEach(conn => {
            if (conn.oc === selectedFacility.name) connectedToSelection.add(conn.cn);
            if (conn.cn === selectedFacility.name) connectedToSelection.add(conn.oc);
        });
        connectedToSelection.add(selectedFacility.name); 
    }

    // 1. Draw Multi-Stop Route if Selected
    if (selectedRouteGroup) {
        // Find Multi-Path in Cache
        const groupKey = `MULTI_${selectedRouteGroup.routeId || selectedRouteGroup.stops[0].oc}`;
        const cachedPath = activePaths[groupKey];
        
        if (cachedPath && cachedPath.coords) {
            // Draw Continuous Trace
            const polyline = L.polyline(cachedPath.coords, { color: '#ec4899', weight: 5, opacity: 0.9, lineJoin: 'round' });
            polyline.bindTooltip(`<div class="font-bold text-xs text-pink-600">Full Route Trace</div><div class="text-[9px]">${formatDuration(cachedPath.metrics.duration)}</div>`, { sticky: true });
            polyline.addTo(layerGroup);
            mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
            hasLayers = true;
        } else {
            // Fallback: Draw straight lines between points if no geom yet
            // (Will happen briefly while fetching)
        }
    }

    connections.forEach(conn => {
      // Logic for rendering individual connections
      // Skip if looking at a specific multi-route group to reduce clutter?
      // Or keep them faint. Let's hide others if selectedRouteGroup is active to focus.
      if (selectedRouteGroup) return;

      const origin = facilityMap[conn.oc];
      const dest = facilityMap[conn.cn];
      if (!origin || !dest) return;
      
      const isRelatedToSelection = selectedFacility && (conn.oc === selectedFacility.name || conn.cn === selectedFacility.name);
      const isOriginVisible = facTypeFilters[origin.type];
      const isDestVisible = facTypeFilters[dest.type];
      
      let shouldRenderLine = false;
      if (selectedFacility) { if (isRelatedToSelection) shouldRenderLine = true; } 
      else { if (isOriginVisible && isDestVisible) shouldRenderLine = true; }
      
      if (shouldRenderLine) {
        if (selectedFacility) {
             const isOutbound = selectedFacility.name === conn.oc;
             const isInbound = selectedFacility.name === conn.cn;
             if (isOutbound && !filters.showOutbound) return;
             if (isInbound && !filters.showInbound) return;
        }
        if (!filters.vmodes[conn.vmode]) return;
        const isFocused = selectedConnection && selectedConnection.oc === conn.oc && selectedConnection.cn === conn.cn && selectedConnection.vmode === conn.vmode && selectedConnection.cutoff === conn.cutoff;
        if (selectedConnection && !isFocused) return;
        
        let latlngs = [[origin.lat, origin.lng], [dest.lat, dest.lng]]; 
        const routeKey = `${conn.oc}|${conn.cn}`;
        const cachedData = activePaths[routeKey];
        
        if (!isFocused) {
            if (cachedData && cachedData.coords) latlngs = cachedData.coords;
            let color = '#334155'; let weight = 1.5; let opacity = 0.5;
            
            // Adjust colors for Dark Mode to be more visible
            const isDarkMode = currentMapStyle.id.includes('dark');
            const defaultLineColor = isDarkMode ? '#cbd5e1' : '#334155'; // Lighter slate for dark mode

            if (selectedFacility) { 
                opacity = 0.9; weight = 2.5; 
                const isOutbound = selectedFacility.name === conn.oc; 
                color = isOutbound ? '#059669' : '#d97706'; 
            } else {
                color = defaultLineColor;
            }

            const polyline = L.polyline(latlngs, { color, weight, opacity, smoothFactor: 1 });
            polyline.on('click', (e) => { L.DomEvent.stopPropagation(e); handleConnectionClick(conn); });
            polyline.addTo(layerGroup);
        } else {
            if (cachedData && cachedData.rawSteps && cachedData.rawSteps.length > 0) {
                cachedData.rawSteps.forEach(step => {
                    if (step.geometry && step.geometry.coordinates) {
                        const stepLatLngs = step.geometry.coordinates.map(c => [c[1], c[0]]);
                        let segColor = '#2563eb'; 
                        if (step.speed < 30) segColor = '#dc2626'; else if (step.speed < 60) segColor = '#d97706'; else segColor = '#059669'; 
                        const segLine = L.polyline(stepLatLngs, { color: segColor, weight: 6, opacity: 1, smoothFactor: 0.5 });
                        segLine.bindTooltip(`<div class="text-xs font-bold text-slate-800">${step.name || 'Road'}</div><div class="text-[9px] font-mono mb-1">Avg: ${Math.round(step.speed)} km/h</div>`, {sticky: true, direction: 'top'});
                        segLine.addTo(layerGroup);
                    }
                });
            } else {
                if (cachedData && cachedData.coords) latlngs = cachedData.coords;
                const polyline = L.polyline(latlngs, { color: '#2563eb', weight: 6, opacity: 1 });
                polyline.addTo(layerGroup);
            }
        }
      }
    });
    
    // Render Facilities
    facilities.forEach(fac => {
      const stats = globalFacilityStats[fac.name];
      const hasConnections = stats && (stats.in > 0 || stats.out > 0);
      if (!hasConnections) return; 
      
      const isSelected = selectedFacility?.name === fac.name;
      const isConnected = selectedFacility && connectedToSelection.has(fac.name);
      
      // If RouteGroup Selected, only show relevant nodes
      let isVisible = true;
      if (selectedRouteGroup) {
          // Check if this facility is part of the route group
          let isInGroup = false;
          if (selectedRouteGroup.forward) {
              // Round Trip
              if (selectedRouteGroup.forward.some(c => c.oc === fac.name || c.cn === fac.name)) isInGroup = true;
              if (selectedRouteGroup.reverse.some(c => c.oc === fac.name || c.cn === fac.name)) isInGroup = true;
          } else if (selectedRouteGroup.stops) {
              // Milk Run
              if (selectedRouteGroup.stops.some(c => c.oc === fac.name || c.cn === fac.name)) isInGroup = true;
          }
          isVisible = isInGroup;
      } else {
          isVisible = facTypeFilters[fac.type] || isSelected || isConnected;
          if (selectedConnection) { if (fac.name === selectedConnection.oc || fac.name === selectedConnection.cn) isVisible = true; else isVisible = false; }
      }

      if (!isVisible) return;
      
      hasLayers = true;
      const style = getFacilityStyle(fac.type, isSelected);
      
      // Adjust border color for dark mode visibility
      if (currentMapStyle.id.includes('dark') && !isSelected) {
          style.color = '#94a3b8'; // Lighter border in dark mode
      }

      const marker = L.circleMarker([fac.lat, fac.lng], style);
      marker.on('click', () => { setSelectedFacility(fac); setSelectedConnection(null); setSelectedRouteGroup(null); mapInstanceRef.current.flyTo([fac.lat, fac.lng], 6, { duration: 1.5 }); });
      const fStats = stats || { in: 0, out: 0 };
      let typeColorClass = 'text-slate-500'; if (fac.type === 'GW') typeColorClass = 'text-violet-600'; if (fac.type === 'H') typeColorClass = 'text-blue-600'; if (fac.type === 'I') typeColorClass = 'text-cyan-600';
      const tooltipHTML = `<div class="min-w-[180px] font-sans"><div class="border-b border-slate-100 pb-1 mb-1"><div class="font-bold text-sm text-slate-800">${fac.name}</div><div class="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5"><span>📍</span> ${fac.address}</div></div><div class="grid grid-cols-3 gap-1 text-center"><div class="bg-slate-50 rounded p-1 border border-slate-100"><div class="text-[8px] uppercase text-slate-400 font-bold tracking-wider">Type</div><div class="font-bold text-xs ${typeColorClass}">${fac.type}</div></div><div class="bg-emerald-50 rounded p-1 border border-emerald-100"><div class="text-[8px] uppercase text-emerald-400 font-bold tracking-wider">Out</div><div class="font-bold text-xs text-emerald-700">${fStats.out}</div></div><div class="bg-amber-50 rounded p-1 border border-amber-100"><div class="text-[8px] uppercase text-amber-400 font-bold tracking-wider">In</div><div class="font-bold text-xs text-amber-700">${fStats.in}</div></div></div></div>`;
      marker.bindTooltip(tooltipHTML, { direction: 'top', className: 'custom-tooltip-card', opacity: 1 });
      marker.addTo(layerGroup);
      if (isSelected || isConnected || (selectedRouteGroup && isVisible)) { marker.bringToFront(); }
      bounds.extend([fac.lat, fac.lng]);
    });
    if (hasLayers && !selectedFacility && !selectedConnection && !selectedRouteGroup && !mapRef.current.dataset.initialFit) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      mapRef.current.dataset.initialFit = "true";
    }
  }, [facilities, connections, selectedFacility, selectedConnection, selectedRouteGroup, facilityMap, filters, facTypeFilters, appState, globalFacilityStats, activePaths, currentMapStyle]);

  const getFacilitySpecificStats = () => {
      if (!selectedFacility) return null;
      let outbound = connections.filter(c => c.oc === selectedFacility.name);
      let inbound = connections.filter(c => c.cn === selectedFacility.name);
      const processRoute = (route, isOut) => {
         const origin = facilityMap[route.oc]; const dest = facilityMap[route.cn];
         const dist = (origin && dest) ? calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng) : 0;
         return { ...route, dist };
      };
      outbound = outbound.map(r => processRoute(r, true));
      inbound = inbound.map(r => processRoute(r, false));
      const rawOutCount = outbound.length; const rawInCount = inbound.length;
      const shifts = { MORNING: { out: 0, in: 0, out_ftl: 0, out_crt: 0, in_ftl: 0, in_crt: 0 }, AFTERNOON: { out: 0, in: 0, out_ftl: 0, out_crt: 0, in_ftl: 0, in_crt: 0 }, NIGHT: { out: 0, in: 0, out_ftl: 0, out_crt: 0, in_ftl: 0, in_crt: 0 } };
      const aggShift = (list, isOut) => { list.forEach(r => { const time = isOut ? r.cutoff : r.eta; const shift = getShift(time); if (shifts[shift]) { if(isOut) { shifts[shift].out++; if(r.vmode === 'FTL') shifts[shift].out_ftl++; else shifts[shift].out_crt++; } else { shifts[shift].in++; if(r.vmode === 'FTL') shifts[shift].in_ftl++; else shifts[shift].in_crt++; } } }); };
      aggShift(outbound, true); aggShift(inbound, false);
      if (!filters.showOutbound) outbound = []; if (!filters.showInbound) inbound = [];
      outbound = outbound.filter(c => filters.vmodes[c.vmode]); inbound = inbound.filter(c => filters.vmodes[c.vmode]);
      const applySidebarFilter = (list) => { if (sidebarFilter === 'ALL') return list; if (sidebarFilter === 'FTL') return list.filter(c => c.vmode === 'FTL'); if (sidebarFilter === 'CARTING') return list.filter(c => c.vmode === 'CARTING' || c.vmode === 'LTL'); if (sidebarFilter === 'LONG') return list.filter(c => c.dist > 500); return list; };
      outbound = applySidebarFilter(outbound); inbound = applySidebarFilter(inbound);
      
      // --- ADVANCED GROUPING LOGIC ---
      // 1. Bucket everything by RouteID|SetID
      const routeMap = {}; // Key: "ID|SetID", Value: { outbound: [], inbound: [] }
      
      // Process Outbound
      const finalOutbound = [];
      outbound.forEach(c => {
          if (c.route_id !== 'NA' && c.route_set_id !== 'NA') {
              const key = `${c.route_id}|${c.route_set_id}`;
              if (!routeMap[key]) routeMap[key] = { outbound: [], inbound: [] };
              routeMap[key].outbound.push(c);
          } else {
              finalOutbound.push(c); // Single outbound
          }
      });

      // Process Inbound
      const finalInbound = [];
      inbound.forEach(c => {
          if (c.route_id !== 'NA' && c.route_set_id !== 'NA') {
              const key = `${c.route_id}|${c.route_set_id}`;
              if (!routeMap[key]) routeMap[key] = { outbound: [], inbound: [] };
              routeMap[key].inbound.push(c);
          } else {
              finalInbound.push(c); // Single inbound
          }
      });

      const roundTrips = [];

      // 2. Classify Buckets
      Object.entries(routeMap).forEach(([key, group]) => {
          const { outbound: outs, inbound: ins } = group;
          
          if (outs.length > 0 && ins.length > 0) {
              // Round Trip
              outs.sort((a,b) => a.eta.localeCompare(b.eta));
              ins.sort((a,b) => a.cutoff.localeCompare(b.cutoff));
              roundTrips.push({ routeId: key.split('|')[0], forward: outs, reverse: ins });
          } else {
              // One-Way Milk Runs
              if (outs.length > 0) {
                  outs.sort((a,b) => a.eta.localeCompare(b.eta));
                  finalOutbound.push({ ...outs[0], stops: outs });
              }
              if (ins.length > 0) {
                  ins.sort((a,b) => a.cutoff.localeCompare(b.cutoff));
                  finalInbound.push({ ...ins[0], stops: ins });
              }
          }
      });

      const sortList = (list) => { return list.sort((a, b) => { let valA, valB; if (sortConfig.key === 'dist') { valA = a.dist; valB = b.dist; } else { valA = a.vehicle_size.toLowerCase(); valB = b.vehicle_size.toLowerCase(); } if (valA < valB) return sortConfig.dir === 'asc' ? -1 : 1; if (valA > valB) return sortConfig.dir === 'asc' ? 1 : -1; return 0; }); };
      
      return { 
          outbound: sortList(finalOutbound), 
          inbound: sortList(finalInbound), 
          roundTrips: roundTrips,
          rawOutCount, 
          rawInCount, 
          shifts 
      };
  };
  const currentStats = getFacilitySpecificStats();
  const getOSRMInfo = () => {
      if (!selectedConnection) return null;
      const key = `${selectedConnection.oc}|${selectedConnection.cn}`;
      const data = activePaths[key];
      if (!data || !data.metrics) return null;
      const distKm = (data.metrics.distance / 1000).toFixed(1);
      const durStr = formatDuration(data.metrics.duration);
      const airDist = calculateDistance(facilityMap[selectedConnection.oc].lat, facilityMap[selectedConnection.oc].lng, facilityMap[selectedConnection.cn].lat, facilityMap[selectedConnection.cn].lng);
      const bufferHours = Math.max(0, (selectedConnection.tat - (data.metrics.duration/3600))).toFixed(1);
      return { distKm, durStr, airDist, bufferHours, segments: data.segments || [], rawSteps: data.rawSteps || [] };
  };
  const osrmData = getOSRMInfo();

  // NEW: Advanced Multi-Route Metrics with Stop-Wise Buffer Calculation
  const getMultiRouteMetrics = () => {
      if (!selectedRouteGroup) return null;
      const groupKey = `MULTI_${selectedRouteGroup.routeId || selectedRouteGroup.stops[0].oc}`;
      const data = activePaths[groupKey];
      
      // 1. Build LOGICAL Timeline using STAR TOPOLOGY data
      let logicalSequence = [];
      let startTime = "";
      let endTime = "";

      if (selectedRouteGroup.forward && selectedRouteGroup.reverse) {
          // ROUND TRIP: 
          // Forward Array contains: Hub -> Stop 1, Hub -> Stop 2, etc. (Sorted by ETA)
          // Reverse Array contains: Stop 1 -> Hub, Stop 2 -> Hub, etc. (Lookup for departures)

          // 1. Start (Hub)
          const hubName = selectedRouteGroup.forward[0].oc;
          startTime = selectedRouteGroup.forward[0].cutoff;
          logicalSequence.push({ 
              name: hubName, 
              arr: null, 
              dep: startTime, 
              type: 'start' 
          });

          // 2. Intermediate Stops
          selectedRouteGroup.forward.forEach((fwdItem) => {
              const stopName = fwdItem.cn;
              const arrivalTime = fwdItem.eta;
              
              // Find matching departure (Reverse leg from Stop -> Hub)
              const revItem = selectedRouteGroup.reverse.find(r => r.oc === stopName);
              const departureTime = revItem ? revItem.cutoff : null;
              
              // Calculate Dwell
              let dwell = 0;
              if (departureTime) {
                  dwell = calculateTimeDiffMinutes(arrivalTime, departureTime);
              }

              logicalSequence.push({
                  name: stopName,
                  arr: arrivalTime,
                  dep: departureTime,
                  dwell: dwell,
                  type: 'stop'
              });
          });

          // 3. End (Hub)
          // The arrival at Hub is the ETA of the LAST reverse leg (Last Stop -> Hub)
          // Sequence implies: Last Stop -> Hub is the final leg
          const lastStopName = logicalSequence[logicalSequence.length - 1].name;
          const lastRevItem = selectedRouteGroup.reverse.find(r => r.oc === lastStopName);
          
          if (lastRevItem) {
              endTime = lastRevItem.eta;
              logicalSequence.push({
                  name: hubName, // Back to Hub
                  arr: endTime,
                  dep: null,
                  type: 'end'
              });
          }

      } else if (selectedRouteGroup.stops) {
          // MILK RUN (One Way)
          startTime = selectedRouteGroup.stops[0].cutoff;
          logicalSequence.push({ name: selectedRouteGroup.stops[0].oc, arr: null, dep: startTime, type: 'start' });
          
          selectedRouteGroup.stops.forEach((s) => {
              logicalSequence.push({
                  name: s.cn,
                  arr: s.eta,
                  dep: null, // One way, no dep logic from data usually
                  dwell: 0,
                  type: 'stop'
              });
          });
          
          // Mark last as end
          logicalSequence[logicalSequence.length - 1].type = 'end';
          endTime = logicalSequence[logicalSequence.length - 1].arr;
      }

      const scheduledDurationHours = calculateTimeDiffHours(startTime, endTime);
      
      if (!data || !data.metrics) return { 
          distKm: "...", 
          durStr: "...", 
          bufferHours: "...",
          scheduledDuration: scheduledDurationHours.toFixed(1),
          detailedStops: []
      };

      const distKm = (data.metrics.distance / 1000).toFixed(1);
      const durStr = formatDuration(data.metrics.duration);
      
      // 2. MAP OSRM LEGS TO LOGICAL SEQUENCE
      let detailedStops = [];
      let legIndex = 0;
      
      // We iterate through logical nodes (0 to N-1) to build segments
      for (let i = 0; i < logicalSequence.length; i++) {
          const node = logicalSequence[i];
          const nextNode = logicalSequence[i+1]; // Can be undefined if last

          // If last node, push simple
          if (!nextNode) {
             detailedStops.push({
                 nodeName: node.name,
                 type: 'end',
                 arrivalTime: node.arr,
                 departureTime: null,
                 dwellTime: 0,
                 nextLeg: null
             });
             continue;
          }

          // Leg Data (OSRM)
          let legDistance = 0;
          let legDurationMin = 0;
          
          if (data.legs && data.legs[legIndex]) {
              legDistance = (data.legs[legIndex].distance / 1000).toFixed(1);
              legDurationMin = Math.round(data.legs[legIndex].duration / 60);
              legIndex++;
          }
          
          // Calculate Road Buffer
          // Schedule gap between Current Dep -> Next Arr
          // Note: Current node might be Start (Dep) or Stop (Arr, Dep)
          const tDep = node.dep || node.arr; // Fallback
          const tArr = nextNode.arr;
          
          const scheduleGap = calculateTimeDiffMinutes(tDep, tArr);
          const roadBuffer = Math.max(0, scheduleGap - legDurationMin);

          detailedStops.push({
              nodeName: node.name,
              type: node.type,
              arrivalTime: node.arr,
              departureTime: node.dep,
              dwellTime: node.dwell || 0,
              
              nextLeg: {
                  to: nextNode.name,
                  distance: legDistance,
                  duration: legDurationMin,
                  roadBuffer: roadBuffer
              }
          });
      }

      // Calc Total Buffer (Dwell + Road Slack)
      const totalBufferHours = (detailedStops.reduce((acc, s) => acc + (s.nextLeg ? s.nextLeg.roadBuffer || 0 : 0) + s.dwellTime, 0) / 60).toFixed(1);

      return { 
          distKm, 
          durStr, 
          bufferHours: totalBufferHours, 
          scheduledDuration: scheduledDurationHours.toFixed(1),
          detailedStops
      };
  };
  const multiRouteData = getMultiRouteMetrics();

  if (appState === 'ERROR') {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
            <div className="bg-slate-800 p-6 rounded-2xl border border-red-500/30 shadow-2xl max-w-md w-full">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
                <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">{statusMsg}</p>
                
                <div className="flex flex-col gap-3">
                    <button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg transition-colors font-bold text-sm w-full">
                        <RefreshCw size={16} /> Retry Connection
                    </button>
                    <div className="text-[10px] text-slate-500 mt-2 flex items-center justify-center gap-2">
                        <WifiOff size={12}/> Check your internet or disable ad-blockers.
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 relative">
      <NotificationBanner notification={notification} onClose={() => setNotification(null)} />
      
      {/* ROUTE GENERATION CONFIRMATION MODAL */}
      {showRouteGenModal && (
          <div className="fixed inset-0 z-[2500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200">
                  <div className="text-center mb-6">
                      <h3 className="text-lg font-bold text-slate-800">Choose Routing Engine</h3>
                      <p className="text-xs text-slate-500 mt-1">Select a provider to visualize {routeGenTarget.toLowerCase().replace('_', ' ')} routes.</p>
                  </div>
                  
                  <div className="space-y-3">
                      {/* OSRM Option */}
                      <button 
                          onClick={() => handleRegenerateRoutes('OSRM')}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group relative overflow-hidden"
                      >
                          <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-slate-700 flex items-center gap-2"><Zap size={16} className="text-amber-500"/> Standard (OSRM)</span>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed">Open Source, fast approximation. Good for general network overview.</p>
                      </button>

                      {/* Mapbox Option */}
                      <div className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden ${mapboxUnlocked ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-slate-700 flex items-center gap-2"><Satellite size={16} className="text-indigo-500"/> Precision (Mapbox)</span>
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Enterprise</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed mb-3">High-fidelity, turn-by-turn road geometry. Requires authentication.</p>
                          
                          {!mapboxUnlocked ? (
                              <div className="flex gap-2">
                                  <input 
                                      type="password" 
                                      placeholder="Passkey"
                                      className="flex-1 text-xs px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                      value={passkeyInput}
                                      onChange={(e) => setPasskeyInput(e.target.value)}
                                  />
                                  <button onClick={handleUnlockMapbox} className="bg-slate-800 text-white px-3 rounded hover:bg-slate-700 transition-colors text-xs font-bold">Unlock</button>
                              </div>
                          ) : (
                               <button 
                                  onClick={() => handleRegenerateRoutes('MAPBOX')}
                                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                               >
                                  Generate High-Res Paths <ArrowRight size={12}/>
                               </button>
                          )}
                      </div>
                  </div>
                  
                  <button onClick={() => setShowRouteGenModal(false)} className="mt-4 text-xs text-slate-400 hover:text-slate-600 w-full">Cancel</button>
              </div>
          </div>
      )}
      
      {/* SLOW GENERATION WARNING POPUP */}
      {showSlowGenWarning && (
          <div className="fixed inset-0 z-[2500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200">
                  <div className="flex flex-col items-center text-center">
                      <div className="bg-amber-100 p-3 rounded-full mb-4 animate-pulse">
                          <Timer size={32} className="text-amber-600"/>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Generating Routes is Taking Time</h3>
                      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                          The public OSRM server is currently busy. For faster, enterprise-grade speeds, please unlock the Mapbox API integration.
                      </p>
                      
                      <div className="w-full space-y-3">
                         <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                             <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><Lock size={12}/> Unlock Precision Mode</div>
                             <div className="flex gap-2">
                                 <input 
                                     type="password" 
                                     placeholder="Enter Passkey"
                                     className="flex-1 text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                     value={passkeyInput}
                                     onChange={(e) => setPasskeyInput(e.target.value)}
                                 />
                                 <button onClick={handleUnlockMapbox} className="bg-indigo-600 text-white px-3 rounded-lg hover:bg-indigo-700 transition-colors"><ArrowRight size={16}/></button>
                             </div>
                         </div>
                         
                         <button 
                             onClick={() => setShowSlowGenWarning(false)} 
                             className="text-xs font-bold text-slate-400 hover:text-slate-600 w-full py-2"
                         >
                             I'll wait for OSRM...
                         </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* LOADING SCREEN OVERLAY (Must be here to allow map to render behind it) */}
      {appState === 'LOADING' && (
          <div className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col items-center justify-center text-white p-6 transition-opacity duration-500">
              {/* Branding */}
              <div className="flex items-center gap-3 mb-10 animate-bounce-slow">
                  <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-2xl shadow-indigo-500/30 transform -rotate-3 border border-indigo-400/50">
                      <MapIcon size={40} strokeWidth={2.5} />
                  </div>
                  <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                      DLV<span className="text-indigo-500">-</span>SIGHTS
                  </h1>
              </div>

              {/* Progress Section */}
              <div className="w-full max-w-md space-y-3 mb-12">
                  <div className="flex justify-between items-end text-xs font-mono tracking-widest uppercase text-slate-400">
                      <span className="animate-pulse">{statusMsg}</span>
                      <span className="text-indigo-400 font-bold">{loadingProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                      <div 
                          className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                          style={{ width: `${loadingProgress}%` }}
                      >
                          <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1.5s_infinite] skew-x-[-20deg]"></div>
                      </div>
                  </div>
              </div>

              {/* Tip Card */}
              <div className="w-full max-w-lg bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm transition-all duration-500 h-32 flex items-center">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Cpu size={80}/>
                  </div>
                  <div key={currentLoadingTipIndex} className="flex gap-5 items-start animate-fadeIn w-full">
                      <div className="p-3 bg-slate-800 rounded-lg shadow-lg shrink-0">
                          {LOADING_TIPS[currentLoadingTipIndex].icon}
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-1">{LOADING_TIPS[currentLoadingTipIndex].title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">{LOADING_TIPS[currentLoadingTipIndex].desc}</p>
                      </div>
                  </div>
                  {/* Paginator */}
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5">
                      {LOADING_TIPS.map((_, idx) => (
                          <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentLoadingTipIndex ? 'w-4 bg-indigo-500' : 'w-1 bg-slate-700'}`}></div>
                      ))}
                  </div>
              </div>
              
              <div className="absolute bottom-6 text-[10px] text-slate-600 font-mono">
                  Designed & Crafted by Rh. | for 🦅 Black Falcons
              </div>
          </div>
      )}

      {/* VERIFY SCREEN OVERLAY */}
      {appState === 'VERIFY' && (
          <div className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col items-center justify-center text-white p-4">
                <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-sm w-full text-center relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                    <div className="mb-6 flex justify-center relative">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
                        <ShieldCheck size={64} className="text-emerald-500 relative z-10" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">DISCLAIMER</h2>
                 <div className="max-w-2xl text-sm text-slate-300 leading-relaxed mb-8">
  <p>
    DLV-SIGHTS uses <em className="not-italic font-medium text-slate-200">RouteDbData</em> from DoctorHub for connection mapping. 
    While data is updated regularly, this database relies on manual updates and may not reflect real-time changes. 
    Please <button className="underline hover:text-white decoration-slate-500 underline-offset-4">report any discrepancies</button>.
  </p>
  <p className="mt-3 text-amber-200/90 font-medium">
    ⚠ This tool is for assistive interpretation only. Do not rely solely on this data for decision-making.
  </p>
</div>
                    <button 
                        onClick={handleVerifyEntry}
                        disabled={isVerifying}
                        className={`w-full py-3.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 group relative overflow-hidden ${
                            isVerifying 
                            ? 'bg-emerald-600/50 text-emerald-200 cursor-wait' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 hover:shadow-emerald-500/30'
                        }`}
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 size={18} className="animate-spin"/> Verifying Access...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform"/> Click to Verify Entry
                            </>
                        )}
                    </button>
                    <div className="mt-6 flex justify-center gap-4 text-[10px] text-slate-600 font-mono">
                        <span className="flex items-center gap-1"><Zap size={10}/> LOW LATENCY</span>
                        <span className="flex items-center gap-1"><Lock size={10}/> TLS 1.3</span>
                    </div>
                </div>
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
            <TipsTicker />
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
            
            {/* Conditional Sidebar Header based on Mode */}
            {selectedConnection || selectedRouteGroup ? (
               <div className="p-4 border-b border-slate-100 bg-blue-50/80 flex items-center gap-2 animate-fadeIn relative">
                   <button onClick={() => { setSelectedConnection(null); setSelectedRouteGroup(null); }} className="p-1 rounded-full hover:bg-white text-blue-600 transition-colors"><ArrowLeft size={16}/></button>
                   <div className="flex-1">
                       <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Route Focus</div>
                       <div className="text-sm font-bold text-blue-800 leading-tight truncate">
                           {selectedRouteGroup ? `Multi-Stop Route` : `${selectedConnection.oc} ➝ ${selectedConnection.cn}`}
                       </div>
                   </div>
                   {/* Settings Icon in Route Focus Mode */}
                    <div className="relative">
                       <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-white text-indigo-600 shadow-sm' : 'hover:bg-blue-100 text-blue-500'}`}>
                           <Settings size={18} className={isGenerating ? "animate-spin-slow" : ""}/>
                       </button>
                    </div>
               </div>
            ) : (
               <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center relative">
                   <div>
                       <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Network Inspector (Beta)</h3>
                       {selectedFacility && (
                           <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">FOCUSED</span>
                       )}
                   </div>
                   <div className="relative">
                       <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-white text-indigo-600 shadow-sm' : 'hover:bg-slate-200 text-slate-400'}`}>
                           <Settings size={18} className={isGenerating ? "animate-spin-slow" : ""}/>
                       </button>
                   </div>
               </div>
            )}
            
            {/* SETTINGS POPOVER (Positioned absolute relative to the header button area logic needs care, but here putting it relative to Sidebar top) */}
            {showSettings && (
                <div className="absolute top-[60px] right-2 z-50 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 p-4 animate-fadeIn origin-top-right">
                    <div className="flex justify-between items-center mb-3">
                         <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                             <Satellite size={12}/> Route Precision (Beta)
                         </h4>
                         <button onClick={() => setShowSettings(false)} className="text-slate-300 hover:text-slate-500"><X size={14}/></button>
                    </div>
                    
                    {isGenerating && <div className="text-[9px] font-mono text-indigo-600 animate-pulse mb-2 text-center">Processing: {genProgress}</div>}
                    
                    <div className="space-y-2">
                        {/* OSRM Option */}
                        <button 
                            onClick={() => handleRegenerateRoutes('OSRM')}
                            disabled={isGenerating}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group disabled:opacity-50 text-left"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Zap size={12} className="text-amber-500 fill-amber-500"/> Load Real Paths (OSRM)</span>
                                <span className="text-[9px] text-slate-400 mt-0.5">Open-Source • Free • ~5-10s</span>
                            </div>
                            {isGenerating ? <Loader2 size={14} className="animate-spin text-indigo-500"/> : <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500"/>}
                        </button>

                        {/* Mapbox Option */}
                        {!mapboxUnlocked ? (
                            <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Lock size={12}/> Precision Paths (Mapbox)</span>
                                        <button onClick={() => setShowPasskeyInput(!showPasskeyInput)} className="text-[9px] text-indigo-600 font-bold hover:underline">Unlock</button>
                                    </div>
                                    {showPasskeyInput ? (
                                        <div className="flex gap-1 mt-1 animate-fadeIn">
                                            <input 
                                                type="password" 
                                                placeholder="Enter Passkey"
                                                className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                                value={passkeyInput}
                                                onChange={(e) => setPasskeyInput(e.target.value)}
                                            />
                                            <button onClick={handleUnlockMapbox} className="bg-indigo-600 text-white px-2 rounded hover:bg-indigo-700 transition-colors"><Unlock size={12}/></button>
                                        </div>
                                    ) : (
                                        <span className="text-[9px] text-slate-400 block">Enterprise Grade • High-Fidelity • Fast</span>
                                    )}
                            </div>
                        ) : (
                            <button 
                                onClick={() => handleRegenerateRoutes('MAPBOX')}
                                disabled={isGenerating}
                                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all disabled:opacity-50 text-left"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-xs font-bold flex items-center gap-1.5"><Satellite size={12} className="animate-pulse"/> Generate Precision Paths</span>
                                    <span className="text-[9px] text-indigo-100 mt-0.5">Powered by Mapbox API • Instant</span>
                                </div>
                                {isGenerating ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 pb-20">
                
                {selectedRouteGroup ? (
                    // SHOW MULTI-STOP SUMMARY
                    <div className="space-y-4 animate-fadeIn">
                        {/* 1. MISSION SUMMARY DASHBOARD */}
                        <div className="bg-white border border-pink-200 rounded-lg p-3 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-5"><Activity size={64}/></div>
                            
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Trip Control</h4>
                            
                            {/* METRICS GRID */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                                        <Truck size={12}/> Total Drive Dist.
                                    </div>
                                    <div className="text-xl font-black text-indigo-600">
                                        {multiRouteData.distKm} <span className="text-xs font-normal text-slate-400">km</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                                        <Timer size={12}/> Pure Drive Time
                                    </div>
                                    <div className="text-xl font-black text-indigo-600">
                                        {multiRouteData.durStr}
                                    </div>
                                </div>
                            </div>

                            {/* TIMELINE ANALYSIS */}
                            <div className="bg-slate-50 rounded border border-slate-100 p-2">
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                                    <span>Schedule Efficiency</span>
                                    <span>{multiRouteData.scheduledDuration}h Total</span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex mb-1">
                                    {/* Drive Time (approx % of total) */}
                                    <div className="h-full bg-indigo-500" style={{ width: '60%' }}></div>
                                    {/* Buffer/Ops Time */}
                                    <div className="h-full bg-emerald-400" style={{ flex: 1 }}></div>
                                </div>
                                <div className="flex justify-between text-[9px]">
                                    <span className="text-indigo-600 font-bold">Driving</span>
                                    <span className="text-emerald-600 font-bold">Total Ops & Buffer: {multiRouteData.bufferHours}h</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. MISSION MANIFEST (VERTICAL TIMELINE WITH BUFFERS) */}
                        <div className="bg-white border border-indigo-200 rounded-lg p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <List size={16} className="text-indigo-500"/> 
                                Trip Manifest
                            </h3>
                           <div className="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
  <p>
    This is a work in progress; some visual or functional inconsistencies may be present and are actively being addressed.
    A known issue includes incorrect mapping of touchpoints and ETD timings in the case of multi-stop/roundtrip routes.
    Please click on respective route line on the map to view individual details for any data-inconsistent lane.       
  </p>
</div>
                            
                            <div className="space-y-0 relative pl-2">
                                {/* Vertical Line */}
                                <div className="absolute left-[21px] top-2 bottom-6 w-0.5 bg-slate-200"></div>

                                {multiRouteData.detailedStops.map((stop, i) => (
                                    <React.Fragment key={i}>
                                        {/* STOP NODE */}
                                        <div className="flex items-start gap-3 mb-0 relative z-10 group">
                                            <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shrink-0 shadow-sm z-10">
                                                {i === 0 ? <PlayCircle size={16} className="text-emerald-500"/> : 
                                                 stop.type === 'end' ? <FlagIcon size={16} className="text-red-500"/> :
                                                 <StopCircle size={16} className="text-slate-500"/>}
                                            </div>
                                            <div className="flex-1 bg-slate-50 hover:bg-white border border-slate-200 p-2 rounded-lg transition-all shadow-sm">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold text-slate-800">{stop.nodeName}</span>
                                                    {/* Time Display Badge */}
                                                    {i === 0 ? (
                                                        <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-100">
                                                            Dep: {stop.departureTime}
                                                        </span>
                                                    ) : stop.type === 'end' ? (
                                                        <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-1.5 rounded">
                                                            Arr: {stop.arrivalTime}
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col items-end text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200">
                                                            <span>Arr: {stop.arrivalTime}</span>
                                                            <span className="border-t border-slate-200 w-full text-right mt-0.5 pt-0.5">Dep: {stop.departureTime}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Dwell Time Highlight */}
                                                {stop.dwellTime > 0 && (
                                                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 w-fit">
                                                        <ArrowLeftRight size={10}/> {stop.dwellTime}m Unloading/Loading Buffer
                                                    </div>
                                                )}
                                                
                                                {i === 0 && <div className="text-[9px] text-slate-400 mt-1">Trip Start</div>}
                                                {stop.type === 'end' && <div className="text-[9px] text-emerald-500 font-bold mt-1">Trip Complete</div>}
                                            </div>
                                        </div>

                                        {/* DRIVE LEG (If next leg exists) */}
                                        {stop.nextLeg && (
                                            <div className="flex items-center gap-3 my-2 ml-2 relative z-0">
                                                <div className="w-4 flex flex-col items-center">
                                                    {/* Spacer aligned with dots */}
                                                </div>
                                                <div className="flex-1 border-l-2 border-indigo-200 pl-4 py-2 ml-1.5 relative">
                                                    <div className="text-[10px] font-bold text-indigo-600 flex items-center gap-1.5 mb-0.5">
                                                        <Truck size={10}/> {stop.nextLeg.distance} km
                                                    </div>
                                                    <div className="text-[9px] text-slate-500 font-mono">
                                                        ~{stop.nextLeg.duration} min drive
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => { setSelectedRouteGroup(null); }} className="w-full py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded transition-colors">MAP VIEW.</button>
                    </div>
                ) : selectedConnection ? (
                    // ROUTE DETAIL VIEW WITH METRICS
                    <div className="space-y-4 animate-fadeIn">
                        <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                            
                            {/* TIMELINE VISUALIZATION */}
                            <div className="flex justify-between items-end mb-1">
                                <div className="text-left">
                                    <div className="text-[10px] font-bold text-slate-400">START</div>
                                    <div className="text-lg font-black text-slate-800">{selectedConnection.cutoff}</div>
                                </div>
                                <div className="flex-1 mx-3 pb-2">
                                     <div className="flex justify-between text-[9px] text-slate-400 font-mono mb-1">
                                         <span>Drive {osrmData ? osrmData.durStr : '...'}</span>
                                         <span>Total TAT {selectedConnection.tat}h</span>
                                     </div>
                                     <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                         {/* Drive Segment */}
                                         <div className="h-full bg-indigo-500" style={{ width: osrmData ? `${Math.min(100, (activePaths[`${selectedConnection.oc}|${selectedConnection.cn}`]?.metrics.duration / 3600 / selectedConnection.tat) * 100)}%` : '50%' }}></div>
                                         {/* Buffer Segment */}
                                         <div className="h-full bg-emerald-400" style={{ flex: 1 }}></div>
                                     </div>
                                     <div className="text-[8px] text-center text-emerald-600 font-bold mt-1">
                                         {osrmData ? `+ ${osrmData.bufferHours}h Buffer (Rest)` : 'Calculating...'}
                                     </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-400">ARRIVE</div>
                                    <div className="text-lg font-black text-slate-800">{selectedConnection.eta}</div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 my-4"></div>

                            {/* METRICS GRID */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                                        <Truck size={12}/> Actual Road Dist.
                                    </div>
                                    <div className="text-xl font-black text-indigo-600">
                                        {osrmData ? osrmData.distKm : <Loader2 size={16} className="animate-spin inline"/>} <span className="text-xs font-normal text-slate-400">km</span>
                                    </div>
                                    {osrmData && (
                                        <div className="text-[9px] text-slate-400 mt-0.5">
                                            vs {osrmData.airDist} km (Air)
                                        </div>
                                    )}
                                </div>
                                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                                        <Timer size={12}/> Est. Drive Time
                                    </div>
                                    <div className="text-xl font-black text-indigo-600">
                                        {osrmData ? osrmData.durStr : <Loader2 size={16} className="animate-spin inline"/>}
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                        Avg Speed: {osrmData ? Math.round(osrmData.distKm / (activePaths[`${selectedConnection.oc}|${selectedConnection.cn}`].metrics.duration / 3600)) : '-'} km/h
                                    </div>
                                </div>
                            </div>
                            
                            {/* DETAILED ROUTE ANALYTICS */}
                            {osrmData && (
                                <div className="mt-4 pt-4 border-t border-slate-100 animate-fadeIn">
                                    
                                    {/* Tabs */}
                                    <div className="flex mb-4 bg-slate-100 p-1 rounded-lg">
                                        <button 
                                            onClick={() => setDetailedViewMode('ANATOMY')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-md transition-all ${detailedViewMode === 'ANATOMY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <PieChart size={12}/> Analysis
                                        </button>
                                        <button 
                                            onClick={() => setDetailedViewMode('STEPS')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-md transition-all ${detailedViewMode === 'STEPS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <List size={12}/> Directions
                                        </button>
                                    </div>

                                    {/* Content Area */}
                                    <div className="max-h-80 overflow-y-auto pr-1 scrollbar-hide">
                                        
                                        {/* VIEW 1: ANATOMY */}
                                        {detailedViewMode === 'ANATOMY' && (
                                            <div className="space-y-4">
                                                {/* Time Distribution */}
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Time Allocation</h5>
                                                    <div className="flex items-center gap-1 mb-1 h-3 rounded-full overflow-hidden w-full">
                                                        <div className="h-full bg-emerald-400" style={{width: `${(osrmData.rawSteps.filter(s => s.speed > 60).reduce((a,b)=>a+b.time,0) / (activePaths[`${selectedConnection.oc}|${selectedConnection.cn}`].metrics.duration)) * 100}%`}}></div>
                                                        <div className="h-full bg-amber-400" style={{width: `${(osrmData.rawSteps.filter(s => s.speed > 30 && s.speed <= 60).reduce((a,b)=>a+b.time,0) / (activePaths[`${selectedConnection.oc}|${selectedConnection.cn}`].metrics.duration)) * 100}%`}}></div>
                                                        <div className="h-full bg-red-400 flex-1"></div>
                                                    </div>
                                                    <div className="flex justify-between text-[9px] font-medium text-slate-400">
                                                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>Fast (&gt;60km/h)</span>
                                                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>Moderate</span>
                                                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>Slow (&lt;30km/h)</span>
                                                    </div>
                                                </div>

                                                {/* Top Segments */}
                                                <div>
                                                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Major Road Segments</h5>
                                                    <div className="space-y-1.5">
                                                        {osrmData.segments.slice(0, 6).map((seg, idx) => {
                                                            const speed = Math.round(seg.speed);
                                                            let barColor = 'bg-slate-200';
                                                            let speedColor = 'text-slate-500';
                                                            if (speed > 60) { barColor = 'bg-emerald-400'; speedColor = 'text-emerald-600'; }
                                                            else if (speed > 30) { barColor = 'bg-amber-400'; speedColor = 'text-amber-600'; }
                                                            else { barColor = 'bg-red-400'; speedColor = 'text-red-500'; }

                                                            return (
                                                                <div key={idx} className="flex items-center justify-between text-[10px] border-b border-slate-50 pb-1 last:border-0">
                                                                    <div className="flex items-center gap-2 max-w-[65%]">
                                                                        <div className={`w-1 h-6 rounded-full ${barColor}`}></div>
                                                                        <div>
                                                                            <div className="truncate font-bold text-slate-700" title={seg.name}>{seg.name}</div>
                                                                            <div className="text-[9px] text-slate-400">{formatDuration(seg.time)} duration</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className={`font-black ${speedColor}`}>{speed} km/h</div>
                                                                        <div className="text-slate-400">{(seg.dist / 1000).toFixed(1)} km</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* VIEW 2: STEPS (ENHANCED) */}
                                        {detailedViewMode === 'STEPS' && (
                                            <div className="space-y-0">
                                                {osrmData.rawSteps.map((step, idx) => {
                                                    const dist = step.dist; 
                                                    const time = step.time;
                                                    if (dist < 10 && idx !== osrmData.rawSteps.length -1) return null; // Skip tiny steps except destination

                                                    // MANEUVER ICON & TEXT LOGIC
                                                    let icon = <Navigation size={14} className="text-slate-400"/>;
                                                    let instructionText = step.name || "Continue";
                                                    const type = step.instruction?.type || 'straight';
                                                    const modifier = step.instruction?.modifier || '';

                                                    if (type === 'turn') {
                                                        if (modifier.includes('left')) icon = <CornerUpLeft size={14} className="text-indigo-500"/>;
                                                        else if (modifier.includes('right')) icon = <CornerUpRight size={14} className="text-indigo-500"/>;
                                                        instructionText = `Turn ${modifier} onto ${step.name || 'road'}`;
                                                    } else if (type === 'new name') {
                                                        icon = <Navigation size={14} className="text-slate-400"/>;
                                                        instructionText = `Continue onto ${step.name}`;
                                                    } else if (type === 'depart') {
                                                        icon = <Move size={14} className="text-emerald-500"/>;
                                                        instructionText = `Depart from ${selectedConnection.oc}`;
                                                    } else if (type === 'arrive') {
                                                        icon = <MapPin size={14} className="text-red-500"/>;
                                                        instructionText = `Arrive at ${selectedConnection.cn}`;
                                                    } else if (type === 'roundabout') {
                                                        icon = <RefreshCw size={14} className="text-amber-500"/>;
                                                        instructionText = `Enter roundabout and take exit onto ${step.name || 'road'}`;
                                                    }

                                                    // Speed Calculation for Segment
                                                    const speed = step.speed || 0;
                                                    let speedColorClass = "text-slate-400";
                                                    if (speed > 60) speedColorClass = "text-emerald-500";
                                                    else if (speed > 30) speedColorClass = "text-amber-500";
                                                    else if (speed > 0) speedColorClass = "text-red-400";

                                                    return (
                                                        <div key={idx} className="flex gap-3 text-[10px] py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors p-2 rounded group">
                                                            <div className="font-mono text-slate-300 font-bold text-[9px] mt-0.5 w-4 text-right shrink-0">{idx + 1}.</div>
                                                            <div className="mt-0.5 shrink-0">{icon}</div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-slate-700 mb-1 leading-tight group-hover:text-indigo-700 transition-colors">{instructionText}</div>
                                                                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium">
                                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">{(dist/1000).toFixed(2)} km</span>
                                                                    <span>{formatDuration(time)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex flex-col items-end justify-center shrink-0 w-12">
                                                                {speed > 0 && (
                                                                    <>
                                                                    <div className={`font-bold text-[10px] ${speedColorClass}`}>{Math.round(speed)}</div>
                                                                    <div className="text-[7px] text-slate-300 uppercase font-bold">km/h</div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 flex gap-2 text-xs">
                                <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold border border-slate-200">{selectedConnection.vehicle_size}</span>
                                <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold border border-slate-200">{selectedConnection.vmode}</span>
                            </div>
                        </div>
                        <button onClick={() => setSelectedConnection(null)} className="w-full py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded transition-colors">Return to Hub View</button>
                    </div>
                ) : selectedFacility && currentStats ? (
                    // FACILITY DETAIL VIEW
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
                            
                            {/* Toggle Shift Analysis */}
                            <button 
                                onClick={() => setShowShiftBreakdown(!showShiftBreakdown)} 
                                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Toggle Shift Analysis"
                            >
                                <BarChart3 size={16}/>
                            </button>
                        </div>

                        {/* Shift Breakdown Matrix (Collapsible) */}
                        {showShiftBreakdown && (
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 animate-fadeIn">
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
                        )}

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

                        {/* 1. GLOBAL NETWORK FILTERS (New Integration - Moved Below Facility Card) */}
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <h4 className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                    <SlidersHorizontal size={14} className="text-indigo-500"/> Network Config
                                </h4>
                                {showFilters ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                            </button>
                            
                            {showFilters && (
                                 <div className="p-4 bg-white space-y-4 animate-fadeIn border-t border-slate-100">
                                     {/* Direction */}
                                     <div>
                                         <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Traffic Direction</h5>
                                         <div className="flex gap-2">
                                            <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${filters.showOutbound ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                                <input type="checkbox" className="hidden" checked={filters.showOutbound} onChange={(e) => setFilters({...filters, showOutbound: e.target.checked})}/>
                                                <div className={`w-2 h-2 rounded-full ${filters.showOutbound ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                <span className={`text-[10px] font-bold ${filters.showOutbound ? 'text-emerald-700' : 'text-slate-400'}`}>Outbound</span>
                                            </label>
                                            <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${filters.showInbound ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                                <input type="checkbox" className="hidden" checked={filters.showInbound} onChange={(e) => setFilters({...filters, showInbound: e.target.checked})}/>
                                                <div className={`w-2 h-2 rounded-full ${filters.showInbound ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                                                <span className={`text-[10px] font-bold ${filters.showInbound ? 'text-amber-700' : 'text-slate-400'}`}>Inbound</span>
                                            </label>
                                            <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${filters.showRoundTrips ? 'bg-pink-50 border-pink-200' : 'bg-slate-50 border-slate-100'}`}>
                                                <input type="checkbox" className="hidden" checked={filters.showRoundTrips} onChange={(e) => setFilters({...filters, showRoundTrips: e.target.checked})}/>
                                                <div className={`w-2 h-2 rounded-full ${filters.showRoundTrips ? 'bg-pink-500' : 'bg-slate-300'}`}></div>
                                                <span className={`text-[10px] font-bold ${filters.showRoundTrips ? 'text-pink-700' : 'text-slate-400'}`}>Round Trips</span>
                                            </label>
                                         </div>
                                     </div>

                                     {/* Vehicle Modes */}
                                     {Object.keys(filters.vmodes).length > 0 && (
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Service Type</h5>
                                                <button 
                                                    onClick={() => {
                                                        const allTrue = Object.keys(filters.vmodes).every(k => filters.vmodes[k]);
                                                        const newModes = {};
                                                        Object.keys(filters.vmodes).forEach(k => newModes[k] = !allTrue);
                                                        setFilters(p => ({...p, vmodes: newModes}));
                                                    }}
                                                    className="text-[8px] text-indigo-600 font-bold hover:underline"
                                                >
                                                    Toggle All
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {Object.keys(filters.vmodes).sort().map(mode => (
                                                    <label key={mode} className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer transition-colors ${filters.vmodes[mode] ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                                        <input type="checkbox" className="accent-indigo-500" checked={filters.vmodes[mode]} onChange={(e) => setFilters(p => ({...p, vmodes: {...p.vmodes, [mode]: e.target.checked}}))}/>
                                                        <span className={`text-[10px] font-bold truncate ${filters.vmodes[mode] ? 'text-indigo-700' : 'text-slate-400 line-through'}`}>{mode}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                     )}

                                     {/* Route Visualization Action Toolbar */}
                                     <div>
                                         <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Visualize Routes</h5>
                                         <div className="grid grid-cols-2 gap-2">
                                             <button onClick={() => openRouteGenModal('OUTBOUND')} className="bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 rounded text-[10px] font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"><ArrowRight size={10}/> Outbound</button>
                                             <button onClick={() => openRouteGenModal('INBOUND')} className="bg-amber-50 text-amber-700 border border-amber-200 py-1.5 rounded text-[10px] font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"><ArrowLeft size={10}/> Inbound</button>
                                             <button onClick={() => openRouteGenModal('ROUNDTRIP')} className="bg-pink-50 text-pink-700 border border-pink-200 py-1.5 rounded text-[10px] font-bold hover:bg-pink-100 transition-colors flex items-center justify-center gap-1"><Repeat size={10}/> Round Trips</button>
                                             <button onClick={() => openRouteGenModal('ALL')} className="bg-indigo-50 text-indigo-700 border border-indigo-200 py-1.5 rounded text-[10px] font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"><Waypoints size={10}/> All Routes</button>
                                         </div>
                                     </div>
                                 </div>
                            )}
                        </div>

                        {/* ROUND TRIPS SECTION (NEW) */}
                        {filters.showRoundTrips && currentStats.roundTrips.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-pink-500 shadow-sm shadow-pink-200"></div> Round Trips ({currentStats.roundTrips.length})
                                </h4>
                                <div>
                                    {currentStats.roundTrips.map((rt, idx) => (
                                        <RoundTripCard 
                                            key={idx} 
                                            data={rt}
                                            onSelect={handleConnectionClick}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

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
                                        <RouteCard 
                                            key={idx} 
                                            type="outbound" 
                                            data={conn} 
                                            onSelect={handleConnectionClick} 
                                            facilityMap={facilityMap}
                                        />
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
                                        <RouteCard 
                                            key={idx} 
                                            type="inbound" 
                                            data={conn} 
                                            onSelect={handleConnectionClick} 
                                            facilityMap={facilityMap}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center opacity-60">
                        <div className="bg-slate-100 p-4 rounded-full mb-4"><Truck className="w-10 h-10 text-slate-400" /></div>
                        <h3 className="text-sm font-bold text-slate-600 mb-1">Explore DELHIVERY Network like Never Before!</h3>
                        <p className="text-xs max-w-[200px] leading-relaxed">Click on any <span className="text-blue-500 font-bold">Facility Marker</span> on the map to view its connections.</p>
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-400 text-center font-medium tracking-wide">Designed & Crafted by Rh. | for 🦅 Black Falcons</div>
        </aside>

        {/* Map Area */}
        <main className="flex-1 relative bg-slate-200">
          <div id="map" ref={mapRef} className="absolute inset-0 z-0 outline-none" />
          
          {/* SEARCH BOX (Bottom Left) */}
          {appState === 'READY' && (
              <div className="absolute bottom-6 left-6 z-[400] w-64 font-sans">
                  {/* Results Dropdown */}
                  {isSearchFocused && filteredFacilities.length > 0 && (
                      <div className="bg-white/90 backdrop-blur-md rounded-t-xl shadow-lg border border-slate-200/50 overflow-hidden mb-1 animate-fadeIn">
                          {filteredFacilities.map(fac => {
                              // Get Color
                              let typeColorClass = 'text-slate-500';
                              if (fac.type === 'GW') typeColorClass = 'text-violet-600';
                              if (fac.type === 'H') typeColorClass = 'text-blue-600';
                              if (fac.type === 'I') typeColorClass = 'text-cyan-600';

                              return (
                                  <button 
                                      key={fac.name}
                                      onClick={() => handleSearchSelect(fac)}
                                      className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex items-center gap-3 border-b border-slate-100 last:border-0 transition-colors"
                                  >
                                      <div className={`text-[10px] font-bold ${typeColorClass} border border-slate-200 rounded px-1`}>{fac.type}</div>
                                      <div className="min-w-0">
                                          <div className="text-xs font-bold text-slate-700 truncate">{fac.name}</div>
                                          <div className="text-[9px] text-slate-400 truncate">{fac.address}</div>
                                      </div>
                                  </button>
                              )
                          })}
                      </div>
                  )}
                  
                  {/* Input Field */}
                  <div className="bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200/50 flex items-center px-4 py-2.5 gap-2 group focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
                      <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors"/>
                      <input 
                          type="text" 
                          placeholder="Search facility or pincode..." 
                          className="bg-transparent border-none outline-none text-xs w-full text-slate-700 placeholder:text-slate-400"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      />
                      {isPincode ? (
                          <button 
                             onClick={handlePincodeSearch}
                             disabled={isPincodeSearching}
                             className="text-[9px] bg-indigo-600 text-white px-2 py-1 rounded font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1"
                          >
                             {isPincodeSearching ? <Loader2 size={10} className="animate-spin"/> : <LocateFixed size={10}/>} Find
                          </button>
                      ) : searchQuery && filteredFacilities.length === 0 ? (
                         <button 
                             onClick={handleSmartAddressSearch}
                             disabled={isPincodeSearching}
                             className="text-[9px] bg-indigo-600 text-white px-2 py-1 rounded font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 whitespace-nowrap"
                             title="Smart Address Search"
                          >
                             {isPincodeSearching ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10}/>} Smart Find
                          </button>
                      ) : searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                              <X size={14}/>
                          </button>
                      )}
                  </div>
              </div>
          )}
          
          {/* Facility Type Filters (Top Right) - Collapsible */}
          {appState === 'READY' && (
              <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2">
                  
                  {/* MAP LAYER SELECTOR BUTTON */}
                  <div className="relative">
                      <button 
                         onClick={() => { setShowMapLayers(!showMapLayers); setShowFacLegend(false); }}
                         className={`bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg text-slate-600 hover:text-indigo-600 hover:bg-white transition-all border border-slate-200 ${showMapLayers ? 'ring-2 ring-indigo-100 text-indigo-600' : ''}`}
                         title="Map Layers"
                      >
                          <Layers size={20} strokeWidth={2} />
                      </button>

                       {/* Map Layer Dropdown */}
                       {showMapLayers && (
                        <div className="absolute top-12 right-0 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-2xl text-xs border border-slate-200/50 w-48 animate-fadeIn origin-top-right z-[500]">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                               <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-widest">Base Map</h4>
                               <button onClick={() => setShowMapLayers(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                            </div>
                            <div className="space-y-1">
                                {MAP_STYLES.map(style => (
                                    <button 
                                        key={style.id}
                                        onClick={() => setCurrentMapStyle(style)}
                                        className={`w-full flex items-center gap-3 p-2 rounded transition-all text-left ${currentMapStyle.id === style.id ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold' : 'hover:bg-slate-50 border border-transparent text-slate-600'}`}
                                    >
                                        <div className={`p-1.5 rounded-md ${currentMapStyle.id === style.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                            {style.icon}
                                        </div>
                                        <span>{style.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                      )}
                  </div>

                  {/* FACILITY FILTER BUTTON */}
                  <button 
                     onClick={() => { setShowFacLegend(!showFacLegend); setShowMapLayers(false); }}
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
                        <div className="space-y-1 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50/50 p-1.5 rounded transition-colors">
                                <input type="checkbox" className="accent-indigo-600" checked={facTypeFilters.GW} onChange={e => setFacTypeFilters(prev => ({...prev, GW: e.target.checked}))}/>
                                <div className="w-2.5 h-2.5 rounded-full bg-violet-600 shadow-sm shadow-violet-200"></div>
                                <span className={facTypeFilters.GW ? "text-slate-700 font-medium" : "text-slate-400"}>Gateway (GW)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50/50 p-1.5 rounded transition-colors">
                                <input type="checkbox" className="accent-blue-500" checked={facTypeFilters.H} onChange={e => setFacTypeFilters(prev => ({...prev, H: e.target.checked}))}/>
                                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-sm shadow-blue-200"></div>
                                <span className={facTypeFilters.H ? "text-slate-700 font-medium" : "text-slate-400"}>Hub (H)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50/50 p-1.5 rounded transition-colors">
                                <input type="checkbox" className="accent-sky-500" checked={facTypeFilters.I} onChange={e => setFacTypeFilters(prev => ({...prev, I: e.target.checked}))}/>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 shadow-sm shadow-cyan-200"></div>
                                <span className={facTypeFilters.I ? "text-slate-700 font-medium" : "text-slate-400"}>IPC (I)</span>
                            </label>
                        </div>
                        <div className="bg-slate-50/80 p-2 rounded border border-slate-100 text-[9px] text-slate-500 leading-tight italic">
                            <span className="font-bold text-slate-600">Note:</span> DC/DPPs/IM etc. are hidden to reduce clutter. You can still search for them or view them by clicking a connected facility.
                        </div>
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
