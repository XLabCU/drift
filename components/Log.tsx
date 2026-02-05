
import React from 'react';
import { DriftEntry } from '../types';
import { formatCoords } from '../utils';

interface LogProps {
  entries: DriftEntry[];
}

const Log: React.FC<LogProps> = ({ entries }) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scroll-smooth custom-scrollbar">
      <h2 className="text-xl uppercase tracking-widest text-secondary text-center font-bold opacity-80 border-b border-secondary/20 pb-2">Aethereal Plane Log</h2>
      {entries.length === 0 ? (
        <div className="text-center italic opacity-30 py-20">The log is empty. Move through physical space to anchor the void.</div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="relative group border-l-2 border-green-900/30 pl-6 py-2">
            <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(0,255,65,0.8)]" />
            
            <div className="flex justify-between items-start mb-2 opacity-50 text-xs font-mono uppercase tracking-tighter">
              <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
              <span>{formatCoords(entry.coords)}</span>
            </div>

            <p className="text-lg leading-relaxed text-gray-300 font-serif italic selection:bg-green-900/50">
              "{entry.text}"
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {entry.anchors.map((anchor, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-secondary/10 text-secondary border border-secondary/20 rounded-full">
                  Anchor: {anchor}
                </span>
              ))}
            </div>

            <div className="mt-1 text-[9px] text-gray-600 font-mono">
              Spectral Voice: {entry.voice}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Log;
