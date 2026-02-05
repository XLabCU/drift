
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DriftState, WikiArticle, GeoPoint, DriftEntry } from './types.ts';
import { DRIFT_RADIUS_METERS } from './constants.ts';
import { fetchNearbyArticles } from './services/WikipediaService.ts';
import { spectralEngine } from './services/SpectralEngine.ts';
import { audioEngine } from './services/AudioEngine.ts';
import { generateId } from './utils.ts';
import Radar from './components/Radar.tsx';
import Log from './components/Log.tsx';

const App: React.FC = () => {
  const [state, setState] = useState<DriftState>(DriftState.IDLE);
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [log, setLog] = useState<DriftEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  
  const lastDriftCoords = useRef<GeoPoint | null>(null);
  const isGeneratingRef = useRef(false);

  const DRIFT_THRESHOLD_METERS = 0.00015;

  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        return permissionState === 'granted';
      } catch (e) {
        console.error("Orientation permission denied", e);
        return false;
      }
    }
    return true; 
  };

  const startEngine = async () => {
    setState(DriftState.INITIALIZING);
    setError(null);

    await requestOrientationPermission();
    
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(
        (pos) => {
          const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(newCoords);
        },
        (err) => {
          setError(`Dimensional anchoring failed: ${err.message}`);
          setState(DriftState.ERROR);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    } else {
      setError("Geospatial sensors unavailable on this hardware.");
      setState(DriftState.ERROR);
      return;
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        const compassHeading = (e as any).webkitCompassHeading || (360 - e.alpha);
        setHeading(compassHeading);
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);

    try {
      await audioEngine.init();
      // This will download ~270MB of model weights locally
      await spectralEngine.init((p) => setLoadProgress(p));
    } catch (e: any) {
      setError(`Core Initialization Failure: ${e.message}. Note: Local AI requires a stable connection for the first-time setup.`);
      setState(DriftState.ERROR);
    }
  };

  const performDrift = useCallback(async (currentCoords: GeoPoint) => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setState(DriftState.DRIFTING);

    try {
      const nearby = await fetchNearbyArticles(currentCoords, DRIFT_RADIUS_METERS);
      setArticles(nearby);

      if (nearby.length >= 1) {
        setIsTransmitting(true);
        audioEngine.playSonarPing();
        
        const whisperText = await spectralEngine.generateWhisper(nearby, currentCoords);
        
        const newEntry: DriftEntry = {
          id: generateId(),
          timestamp: Date.now(),
          text: whisperText,
          coords: currentCoords,
          anchors: nearby.slice(0, 3).map(a => a.title),
          voice: "Local-OpenELM"
        };

        setLog(prev => [newEntry, ...prev]);
        await audioEngine.speak(whisperText);
        
        setTimeout(() => setIsTransmitting(false), 5000);
      }
    } catch (err) {
      console.error("Drift collapse:", err);
    } finally {
      isGeneratingRef.current = false;
      setState(DriftState.SCANNING);
    }
  }, []);

  useEffect(() => {
    if (state === DriftState.INITIALIZING && loadProgress >= 100 && coords) {
      setState(DriftState.SCANNING);
      performDrift(coords);
      lastDriftCoords.current = coords;
      return;
    }

    if (state === DriftState.SCANNING && coords) {
      const last = lastDriftCoords.current;
      if (!last) {
        performDrift(coords);
        lastDriftCoords.current = coords;
        return;
      }

      const distLat = Math.abs(coords.lat - last.lat);
      const distLng = Math.abs(coords.lng - last.lng);
      
      if (distLat > DRIFT_THRESHOLD_METERS || distLng > DRIFT_THRESHOLD_METERS) {
        performDrift(coords);
        lastDriftCoords.current = coords;
      }
    }
  }, [coords, state, loadProgress, performDrift]);

  return (
    <div className={`h-screen w-full flex flex-col md:flex-row bg-[#050505] text-[#d1d1d1] transition-all duration-1000 ${isTransmitting ? 'bg-[#1a0a0a]' : ''}`}>
      <div className={`w-full md:w-1/2 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-green-900/20 bg-black/50 relative overflow-hidden`}>
        
        {isTransmitting && (
          <div className="absolute inset-0 z-50 pointer-events-none bg-red-500/10 animate-pulse flex flex-col items-center justify-center gap-4">
             <div className="text-red-500 font-mono text-3xl tracking-[1em] uppercase animate-ping blur-[1px]">Receiving</div>
             <div className="text-[10px] font-mono text-red-500/80 font-bold uppercase tracking-[0.5em]">Local Spectral Intercept</div>
          </div>
        )}

        <div className="absolute top-6 left-6 font-mono text-[10px] text-green-500/40 flex flex-col gap-2 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${coords ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-red-900 animate-pulse'}`} />
            <span>Signal: {coords ? 'LOCKED' : 'SEARCHING...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${loadProgress >= 100 ? 'bg-green-500' : 'bg-yellow-600 animate-pulse'}`} />
            <span>Matrix: {loadProgress >= 100 ? 'LOCALIZED' : `DOWNLOADING ${loadProgress}%`}</span>
          </div>
        </div>

        <h1 className="text-5xl font-['Special_Elite'] text-green-500 mb-12 tracking-[0.3em] uppercase drop-shadow-[0_0_20px_rgba(0,255,65,0.3)]">Drift</h1>

        {state === DriftState.IDLE ? (
          <div className="text-center space-y-10 animate-in fade-in zoom-in duration-1000">
            <p className="max-w-xs mx-auto text-sm opacity-50 leading-relaxed italic font-serif">
              "The silence between locations is where the ghosts of knowledge reside. Turn the dial, and listen."
            </p>
            <button
              onClick={startEngine}
              className="group relative px-10 py-5 overflow-hidden border border-green-500/50 text-green-500 hover:bg-green-500 hover:text-black transition-all duration-700 font-mono tracking-[0.4em] uppercase text-xs"
            >
              <span className="relative z-10">Wake Local Core</span>
              <div className="absolute inset-0 bg-green-500 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </button>
          </div>
        ) : state === DriftState.INITIALIZING ? (
          <div className="w-64 space-y-6">
             <div className="flex justify-between font-mono text-[10px] text-green-500/80 uppercase tracking-widest">
                <span>Necromantic Interface Loading</span>
                <span>{loadProgress}%</span>
             </div>
             <div className="h-1 w-full bg-green-950/40 border border-green-500/10 rounded-full relative overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500 shadow-[0_0_15px_rgba(0,255,65,0.8)]" 
                  style={{ width: `${loadProgress}%` }}
                />
             </div>
             <p className="text-[10px] text-center font-serif italic opacity-30 tracking-wide">
               Anchoring 270M parameters for offline spectral intercept.
             </p>
          </div>
        ) : (
          <div className={`w-full space-y-12 transition-all duration-1000 ${isTransmitting ? 'scale-105' : 'scale-100'}`}>
            <Radar userCoords={coords || { lat: 0, lng: 0 }} articles={articles} radius={DRIFT_RADIUS_METERS} heading={heading} />
            
            <div className="text-center space-y-6">
              <div className="text-[11px] font-mono uppercase tracking-[0.6em] text-green-500/70 animate-pulse">
                {isTransmitting ? "DECODING ECHO..." : "WATCHING THE VOID"}
              </div>
              <div className="flex justify-center gap-3 h-8 items-center">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3 h-1 transition-all duration-300 ${isTransmitting ? "bg-red-500 shadow-[0_0_10px_red]" : "bg-green-900/30"}`} 
                    style={{animation: isTransmitting ? `vibe 1s infinite ${i * 0.1}s` : 'none'}} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-10 p-6 bg-red-950/20 border border-red-900/40 text-red-500 text-[10px] font-mono text-center uppercase tracking-[0.2em] leading-relaxed max-w-sm">
            {error}
            <button onClick={() => window.location.reload()} className="block mt-6 mx-auto border border-red-500/40 px-4 py-2 hover:bg-red-500/10 transition-all font-bold">REBOOT CORE</button>
          </div>
        )}
      </div>

      <div className="w-full md:w-1/2 flex flex-col bg-[#070707] relative overflow-hidden border-t md:border-t-0 border-green-900/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,255,65,0.02)_0%,transparent_50%)] pointer-events-none" />
        <Log entries={log} />
      </div>

      <style>{`
        @keyframes vibe {
          0%, 100% { height: 2px; opacity: 0.3; }
          50% { height: 24px; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default App;
