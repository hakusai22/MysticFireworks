import React, { useState, useEffect, useCallback } from 'react';
import FireworkCanvas from './components/FireworkCanvas';
import UIOverlay from './components/UIOverlay';
import MosaicBackground from './components/MosaicBackground';
import { Coordinates } from './types';

const App: React.FC = () => {
  const [triggerQueue, setTriggerQueue] = useState<Coordinates[]>([]);
  const [isTextAnimating, setIsTextAnimating] = useState(false);
  const [inputText, setInputText] = useState('YOLO,皆得所愿');

  // Parse input text into array
  const backgroundTexts = inputText
    .split(/[,，]/) // Split by English or Chinese comma
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  // Fallback if empty
  const displayTexts = backgroundTexts.length > 0 ? backgroundTexts : ['Mystic'];

  const triggerFormation = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const spacing = w * 0.20; // Increased spacing

    // Assign specific paletteIndex (0-4) to ensure unique colors
    // 0: Azure King (Center)
    // 1: Deep Ocean
    // 2: Royal Gold
    // 3: Neon Teal
    // 4: Ice Crystal
    const formation: Coordinates[] = [
      // Center: Highest & Largest (Scale 1.5) - Brightest Blue
      { x: cx, y: h * 0.25, paletteIndex: 0, scale: 1.5 },
      
      // Middle Pair: Medium Height & Normal Size (Scale 1.0)
      { x: cx - spacing, y: h * 0.4, paletteIndex: 1, scale: 1.0 }, // Deep Blue
      { x: cx + spacing, y: h * 0.4, paletteIndex: 3, scale: 1.0 }, // Neon Teal (Symmetric position)
      
      // Outer Pair: Lowest Height & Smallest Size (Scale 0.7)
      { x: cx - spacing * 2, y: h * 0.55, paletteIndex: 4, scale: 0.7 }, // Ice Crystal
      { x: cx + spacing * 2, y: h * 0.55, paletteIndex: 2, scale: 0.7 }  // Royal Gold (Accent)
    ];

    setTriggerQueue(prev => [...prev, ...formation]);
  }, []);

  // Auto-launch symmetric formation on startup (Fireworks ONLY, Text remains static)
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerFormation();
    }, 800); 

    return () => clearTimeout(timer);
  }, [triggerFormation]);

  // Handler for mouse click
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('input')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Manual clicks are default size (1.0)
    addFirework(x, y);
  };

  const addFirework = (x: number, y: number) => {
    setTriggerQueue(prev => [...prev, { x, y, scale: 1.0 }]);
  };

  const clearQueue = () => {
    setTriggerQueue([]);
  };

  const handleIgnite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTextAnimating(true); // Start text switching on button click
    
    // Launch 3 waves of fireworks
    triggerFormation(); // Wave 1: Immediate
    
    setTimeout(() => {
      triggerFormation(); // Wave 2
    }, 800);
    
    setTimeout(() => {
      triggerFormation(); // Wave 3
    }, 1600);
  };

  return (
    <div 
      className="relative w-full h-screen bg-[#050505] cursor-crosshair overflow-hidden"
      onClick={handleCanvasClick}
    >
      <MosaicBackground animate={isTextAnimating} texts={displayTexts} />
      <FireworkCanvas 
        triggerQueue={triggerQueue} 
        onTriggerProcessed={clearQueue} 
      />
      
      <UIOverlay status="" />
      
      {/* Input Field for Custom Text */}
      <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 z-40 w-64 md:w-80">
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="YOLO, 皆得所愿"
          className="w-full bg-black/40 border-b-2 border-[#d4af37]/50 text-[#d4af37] text-center
                     font-tarot tracking-widest text-lg outline-none py-2 px-4 
                     placeholder-[#d4af37]/30 transition-all duration-300
                     focus:border-[#d4af37] focus:bg-black/60 focus:scale-105"
        />
      </div>

      {/* Trigger Button */}
      <button 
        onClick={handleIgnite}
        className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-30 
                   px-10 py-3 border border-[#d4af37] text-[#d4af37] font-tarot 
                   bg-black/60 backdrop-blur-sm hover:bg-[#d4af37] hover:text-black 
                   transition-all duration-500 uppercase tracking-[0.25em] text-sm 
                   shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)]"
      >
        Ignite
      </button>
      
      {/* Background ambience visual */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
    </div>
  );
};

export default App;