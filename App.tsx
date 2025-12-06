import React, { useState } from 'react';
import FireworkCanvas from './components/FireworkCanvas';
import UIOverlay from './components/UIOverlay';
import { Coordinates } from './types';

const App: React.FC = () => {
  const [triggerQueue, setTriggerQueue] = useState<Coordinates[]>([]);

  // Handler for mouse click
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    addFirework(x, y);
  };

  const addFirework = (x: number, y: number) => {
    setTriggerQueue(prev => [...prev, { x, y }]);
  };

  const clearQueue = () => {
    setTriggerQueue([]);
  };

  return (
    <div 
      className="relative w-full h-screen bg-[#050505] cursor-crosshair overflow-hidden"
      onClick={handleCanvasClick}
    >
      <FireworkCanvas 
        triggerQueue={triggerQueue} 
        onTriggerProcessed={clearQueue} 
      />
      
      <UIOverlay status="" />
      
      {/* Background ambience noise visual (Optional) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
    </div>
  );
};

export default App;