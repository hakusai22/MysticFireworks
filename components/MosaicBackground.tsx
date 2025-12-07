import React, { useRef, useEffect } from 'react';

interface MosaicBackgroundProps {
  animate: boolean;
  texts: string[];
}

const CELL_SIZE = 12; // Size of each mosaic block
const GAP = 2;        // Gap between blocks

// UPDATED: Palette changed to White/Silver themes as requested
const PALETTE = [
  '#FFFFFF', // Pure White
  '#F8F8FF', // Ghost White
  '#F0F8FF', // Alice Blue (Subtle cool white)
  '#E5E4E2', // Platinum (Silver white)
];

const MosaicBackground: React.FC<MosaicBackgroundProps> = ({ animate, texts }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs to hold mutable state without re-triggering effects
  const stateRef = useRef({
    textIndex: 0,
    intervalId: null as number | null,
  });

  const textsRef = useRef(texts);
  const animateRef = useRef(animate);
  
  // Store the grid update function so we can call it from other effects
  const updateGridRef = useRef<() => void>(() => {});

  // Sync props to refs
  useEffect(() => {
    textsRef.current = texts;
    // If we are not animating (static mode) and text changes, update immediately
    // so the user sees what they type.
    if (!animateRef.current && updateGridRef.current) {
        stateRef.current.textIndex = 0;
        updateGridRef.current();
    }
  }, [texts]);

  useEffect(() => {
    animateRef.current = animate;
  }, [animate]);

  // Main Canvas Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    let cols = Math.ceil(width / (CELL_SIZE + GAP));
    let rows = Math.ceil(height / (CELL_SIZE + GAP));
    const PALETTE_copy = PALETTE; 
    
    interface Cell {
      color: string;
      alpha: number;
      targetAlpha: number;
      transitionSpeed: number;
    }
    
    let grid: Cell[] = new Array(cols * rows).fill(null).map(() => ({
      color: PALETTE_copy[Math.floor(Math.random() * PALETTE_copy.length)],
      alpha: 0,
      targetAlpha: 0,
      transitionSpeed: 0.05 + Math.random() * 0.08
    }));

    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');
    
    const updateGridTargets = () => {
      if (!offCtx) return;
      offscreen.width = width;
      offscreen.height = height;
      offCtx.clearRect(0, 0, width, height);
      offCtx.fillStyle = '#FFFFFF';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      const fontSize = Math.min(width * 0.25, 400);
      offCtx.font = `900 ${fontSize}px "Cinzel", "Microsoft YaHei", serif`;
      
      const currentTexts = textsRef.current.length > 0 ? textsRef.current : [''];
      // Ensure index is valid
      const safeIndex = stateRef.current.textIndex % currentTexts.length;
      
      offCtx.fillText(currentTexts[safeIndex], width / 2, height / 2);
      const imgData = offCtx.getImageData(0, 0, width, height).data;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = Math.floor(c * (CELL_SIZE + GAP) + CELL_SIZE / 2);
          const y = Math.floor(r * (CELL_SIZE + GAP) + CELL_SIZE / 2);
          if (x < width && y < height) {
            const pxIndex = (y * width + x) * 4;
            const isText = imgData[pxIndex + 3] > 100;
            const i = r * cols + c;
            if (grid[i]) {
               grid[i].targetAlpha = isText ? 1 : 0;
               // Randomize color occasionally to keep the sparkle alive
               if (Math.random() > 0.95) grid[i].color = PALETTE_copy[Math.floor(Math.random() * PALETTE_copy.length)];
            }
          }
        }
      }
    };

    // Expose update function to ref
    updateGridRef.current = updateGridTargets;

    // Initial render
    updateGridTargets();

    // Loop
    let lastSwitchTime = Date.now();
    let animId: number;
    
    const render = () => {
      // Check animation timer logic inside the loop
      if (animateRef.current) {
        // Switch text every 1500ms
        if (Date.now() - lastSwitchTime > 1500) {
          const currentTexts = textsRef.current;
          if (currentTexts.length > 0) {
              stateRef.current.textIndex = (stateRef.current.textIndex + 1) % currentTexts.length;
              updateGridTargets();
          }
          lastSwitchTime = Date.now();
        }
      } else {
        lastSwitchTime = Date.now(); // Reset timer so it doesn't instantly switch when enabled
      }

      ctx.clearRect(0, 0, width, height);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const cell = grid[i];
          if (!cell) continue;
          const diff = cell.targetAlpha - cell.alpha;
          // Smooth interpolation
          if (Math.abs(diff) > 0.005) cell.alpha += diff * cell.transitionSpeed;
          else cell.alpha = cell.targetAlpha;

          if (cell.alpha > 0.01) {
            const x = c * (CELL_SIZE + GAP);
            const y = r * (CELL_SIZE + GAP);
            ctx.fillStyle = cell.color;
            ctx.globalAlpha = cell.alpha;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            if (cell.alpha > 0.8) {
               ctx.fillStyle = 'rgba(255,255,255,0.4)'; // Highlight center
               ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            }
          }
        }
      }
      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      cols = Math.ceil(width / (CELL_SIZE + GAP));
      rows = Math.ceil(height / (CELL_SIZE + GAP));
      grid = new Array(cols * rows).fill(null).map(() => ({
        color: PALETTE_copy[Math.floor(Math.random() * PALETTE_copy.length)],
        alpha: 0,
        targetAlpha: 0,
        transitionSpeed: 0.05 + Math.random() * 0.08
      }));
      updateGridTargets();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 pointer-events-none mix-blend-screen opacity-90"
    />
  );
};

export default MosaicBackground;