
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { DriftState, WikiArticle, GeoPoint, DriftEntry } from './types';
import { DRIFT_RADIUS_METERS } from './constants';
import { fetchNearbyArticles } from './services/WikipediaService';
import { spectralEngine } from './services/SpectralEngine';
import { audioEngine } from './services/AudioEngine';
import { generateId } from './utils';
import Radar from './components/Radar';
import Log from './components/Log';

// Required platform initialization for Google GenAI SDK compliance
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const App: React.FC = () => {
  const [state, setState] = useState<DriftState>(DriftState.IDLE);
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [log, setLog] = useState<DriftEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  
  const lastDriftCoords = useRef<GeoPoint | null>(null);
  const isGeneratingRef = useRef(false);

  // Distance threshold to trigger new drift (roughly 15 meters)
  const DRIFT_THRESHOLD_METERS = 0.00015;

  const startEngine = async () => {
    setState(DriftState.INITIALIZING);
    setError(null);

    // 1. Immediately request geolocation to trigger browser prompt
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(
        (pos) => {
          const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(newCoords);
          console.log("Anchor established at:", newCoords);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setError(`Dimensional Anchor Failed: ${err.message}. Please enable location permissions.`);
          setState(DriftState.ERROR);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    } else {
      setError("Geospatial sensors are absent in this vessel.");
      setState(DriftState.ERROR);
      return;
    }

    try {
      // 2. Initialize Audio and Model concurrently
      await audioEngine.init();
      await spectralEngine.init((p) => setLoadProgress(p));
    } catch (e: any) {
      setError(`Spectral Core Failure: ${e.message}`);
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
          voice: "Local-Spectral"
        };

        setLog(prev => [newEntry, ...prev]);
        await audioEngine.speak(whisperText);
        
        setTimeout(() => setIsTransmitting(false), 5000);
      } else {
        console.log("No anchors found in current sector.");
      }
    } catch (err) {
      console.error("Drift collapse:", err);
    } finally {
      isGeneratingRef.current = false;
      setState(DriftState.SCANNING);
    }
  }, []);

  useEffect(() => {
    // Wait for both model (100%) and coords to be ready
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
    <div className={`h-screen w-full flex flex-col md:flex-row bg-[#050505] text-[#d1d1d1] transition-all duration-700 ${isTransmitting ? 'bg-[#0a0505]' : ''}`}>
      <div className={`w-full md:w-1/2 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-green-900/20 bg-black/40 relative overflow-hidden`}>
        
        {isTransmitting && (
          <div className="absolute inset-0 z-50 pointer-events-none bg-green-500/5 animate-pulse flex flex-col items-center justify-center gap-4">
             <div className="text-green-500 font-mono text-xl tracking-[0.8em] uppercase animate-ping">Interception</div>
             <div className="text-[10px] font-mono text-green-500/50">LOCAL_MODEL_INFERENCE_ACTIVE</div>
          </div>
        )}

        <div className="absolute top-4 left-4 font-mono text-[10px] text-green-500/30 flex flex-col gap-1">
          <div>DRIFT_ON_DEVICE_v5.2</div>
          <div>MODEL: OPENELM-270M</div>
          <div>GPS: {coords ? 'LOCKED' : 'SEARCHING...'}</div>
          <div>ANCHORS: {articles.length}</div>
        </div>

        <h1 className="text-4xl font-['Special_Elite'] text-green-500 mb-8 tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(0,255,65,0.3)]">Drift</h1>

        {state === DriftState.IDLE ? (
          <div className="text-center space-y-6">
            <p className="max-w-xs text-sm opacity-40 leading-relaxed italic font-serif">
              "The latent space is not empty. It is a crowded silence waiting for a navigator."
            </p>
            <button
              onClick={startEngine}
              className="px-10 py-4 border border-green-500/50 text-green-500 hover:bg-green-500/10 transition-all duration-500 font-mono tracking-widest uppercase text-xs"
            >
              Wake Spectral Core
            </button>
          </div>
        ) : state === DriftState.INITIALIZING ? (
          <div className="w-64 space-y-4">
             <div className="flex justify-between font-mono text-[10px] text-green-500/60 uppercase">
                <span>{loadProgress < 100 ? "Loading Core..." : (!coords ? "Awaiting Signal..." : "Syncing...")}</span>
                <span>{Math.min(loadProgress, 100)}%</span>
             </div>
             <div className="h-1 w-full bg-green-900/20 relative overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300 shadow-[0_0_8px_rgba(0,255,65,0.8)]" 
                  style={{ width: `${Math.min(loadProgress, 100)}%` }}
                />
             </div>
             <p className="text-[9px] text-center font-serif italic opacity-30 leading-tight">
               {!coords ? "Please allow location access to anchor the radar..." : "Stabilizing aethereal blueprints..."}
             </p>
          </div>
        ) : (
          <div className={`w-full space-y-12 transition-all duration-500 ${isTransmitting ? 'scale-105 blur-[0.5px]' : 'scale-100'}`}>
            <Radar userCoords={coords || { lat: 0, lng: 0 }} articles={articles} radius={DRIFT_RADIUS_METERS} />
            
            <div className="text-center">
              <div className="text-[10px] font-mono uppercase tracking-[0.4em] mb-3 text-green-500/50">
                {isTransmitting ? "Interpreting Echo..." : (state === DriftState.DRIFTING ? "Decoding Gaps..." : (coords ? "Monitoring Sector..." : "Signal Lost..."))}
              </div>
              <div className="flex justify-center gap-1.5 h-4 items-center">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3 h-0.5 transition-all duration-500 ${state === DriftState.DRIFTING || isTransmitting ? "bg-green-500 shadow-[0_0_5px_rgba(0,255,65,1)]" : "bg-green-900/30"}`} 
                    style={{animation: (state === DriftState.DRIFTING || isTransmitting) ? `pulse-bar 1.2s infinite ${i * 0.15}s` : 'none'}} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 p-6 bg-red-950/20 border border-red-900/40 text-red-500 text-[10px] font-mono text-center uppercase tracking-widest leading-relaxed max-w-xs">
            {error}
            <button onClick={() => window.location.reload()} className="block mt-4 mx-auto underline opacity-60 hover:opacity-100">Restart Core</button>
          </div>
        )}
      </div>

      <div className="w-full md:w-1/2 flex flex-col bg-[#070707] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.02)_0%,transparent_70%)] pointer-events-none" />
        <Log entries={log} />
      </div>

      <style>{`
        @keyframes pulse-bar {
          0%, 100% { height: 2px; opacity: 0.3; }
          50% { height: 12px; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default App;
