import React, { useRef, useEffect, useCallback } from 'react';
import { Coordinates } from '../types';
import { playExplosionSound, playLaunchSound } from '../utils/soundUtils';

interface FireworkCanvasProps {
  triggerQueue: Coordinates[];
  onTriggerProcessed: () => void;
}

// --- Visual Configuration ---
// UPDATED: Standardized to the "Middle Blue" (Azure/Electric Blue) as requested.
// All fireworks will now use this single color scheme.
const PALETTES = [
  { 
    name: 'Mystic Blue', 
    innerColor: 'rgb(0, 255, 255)',   // Bright Cyan (The "Center" look)
    haloColor: 'rgb(0, 100, 255)'     // Electric Blue Halo
  }
];

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  age: number;
  bloomDelay: number;
  innerColor: string;
  haloColor: string;
  targetSize: number;
  currentSize: number;
  alpha: number;
  friction: number;
  gravity: number;
  history: {x: number, y: number}[];
  rotation: number;
  rotationSpeed: number;
  type: 'core' | 'shell' | 'sparkle' | 'willow';

  constructor(x: number, y: number, innerColor: string, haloColor: string, speed: number, angle: number, type: 'core' | 'shell' | 'sparkle' | 'willow', scale: number = 1.0) {
    this.x = x;
    this.y = y;
    this.innerColor = innerColor;
    this.haloColor = haloColor;
    this.type = type;
    this.history = [];
    this.age = 0;

    // 3D-ish velocity projection to 2D
    // Scale velocity slightly with size for physics consistency
    const speedMult = type === 'shell' ? (scale * 0.8 + 0.2) : 1.0; 
    this.vx = Math.cos(angle) * speed * speedMult;
    this.vy = Math.sin(angle) * speed * speedMult;
    
    // REQ: All hearts must be upright ("正的")
    this.rotation = 0;
    this.rotationSpeed = 0; 

    this.currentSize = 0; // Start at 0, wait for bloom

    // PHYSICS TWEAKS FOR 0.8x SPEED (Maintained)
    if (type === 'shell') {
      // UPDATED: Less friction (closer to 1) so they fly wider
      this.friction = 0.975; 
      this.gravity = 0.022;  
      this.life = 150 + Math.random() * 50; 
      this.targetSize = 16.0 * scale; // Apply Scale
      this.bloomDelay = 19 + Math.random() * 19; 
    } else if (type === 'core') {
      this.friction = 0.936; 
      this.gravity = 0.022;
      this.life = 75 + Math.random() * 25; 
      this.targetSize = 10.0 * scale; // Apply Scale
      this.bloomDelay = 0; 
    } else if (type === 'willow') {
      this.friction = 0.944; 
      this.gravity = 0.013;  
      this.life = 175 + Math.random() * 50; 
      this.targetSize = 9.0 * scale; // Apply Scale
      this.bloomDelay = 6 + Math.random() * 13;
    } else { // Sparkle
      this.friction = 0.90; 
      this.gravity = 0.025; 
      this.life = 65 + Math.random() * 30;
      this.targetSize = 6.0 * scale; // Apply Scale
      this.bloomDelay = 0;
    }
    
    this.maxLife = this.life;
    this.alpha = 1;
  }

  update() {
    this.age++;

    // Add TURBULENCE / JITTER
    if (this.type === 'shell') {
      this.vx += (Math.random() - 0.5) * 0.08;
      this.vy += (Math.random() - 0.5) * 0.08;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    
    this.x += this.vx;
    this.y += this.vy;
    
    // Logic: Only start growing the heart after the bloom delay
    if (this.age >= this.bloomDelay) {
      if (this.currentSize < this.targetSize) {
        // "Pop" animation
        this.currentSize += (this.targetSize - this.currentSize) * 0.15; 
      }
    }
    
    this.life--;
    this.alpha = Math.max(0, this.life / this.maxLife);

    // Trail logic
    if (this.alpha > 0.05) {
      this.history.push({x: this.x, y: this.y});
      if (this.history.length > 25) this.history.shift();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Phase 1: Scattering Route (Trail)
    if (this.type === 'shell' && this.history.length > 2) {
      const gradient = ctx.createLinearGradient(
        this.history[0].x, this.history[0].y, 
        this.x, this.y
      );
      
      const tailColor = this.haloColor.replace(')', ', 0.2)').replace('rgb', 'rgba');

      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.2, tailColor); 
      gradient.addColorStop(1, this.innerColor); 
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(1, this.targetSize * 0.2); // Scale trail width
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 0; i < this.history.length - 1; i++) {
        const p0 = this.history[i];
        const p1 = this.history[i + 1];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }
      ctx.lineTo(this.x, this.y);
      ctx.globalAlpha = this.alpha * 0.8; 
      ctx.stroke();

      ctx.globalAlpha = this.alpha; 
    }

    // Phase 2: Neon Border Hearts
    if (this.currentSize > 0.1) {
      ctx.save();
      ctx.translate(this.x, this.y);
      
      const s = this.currentSize;
      
      // Define path for "Wide Top, Pointed Bottom" Heart (Q-Style)
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.35);
      
      // Left Lobe
      ctx.bezierCurveTo(-s * 0.9, -s * 1.2, -s * 1.6, -s * 0.5, -s * 1.6, s * 0.1);
      // Left Tip
      ctx.bezierCurveTo(-s * 1.6, s * 0.8, -s * 0.6, s * 1.4, 0, s * 1.7);
      // Right Side
      ctx.bezierCurveTo(s * 0.6, s * 1.4, s * 1.6, s * 0.8, s * 1.6, s * 0.1);
      ctx.bezierCurveTo(s * 1.6, -s * 0.5, s * 0.9, -s * 1.2, 0, -s * 0.35);
      
      ctx.closePath();

      // FILL
      const maskGradient = ctx.createRadialGradient(0, -s * 0.2, 0, 0, 0, s * 1.4);
      maskGradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.05)'); 
      maskGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)'); 
      maskGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.5)'); 
      
      ctx.fillStyle = maskGradient;
      ctx.globalAlpha = this.alpha;
      ctx.fill();

      // STROKE
      // 1. Halo
      ctx.lineWidth = s * 0.25;
      ctx.strokeStyle = this.haloColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = this.alpha * 0.3;
      ctx.stroke();

      // 2. Neon Tube
      ctx.lineWidth = s * 0.1;
      ctx.strokeStyle = this.innerColor;
      ctx.globalAlpha = this.alpha; 
      ctx.stroke();

      // 3. Highlight
      ctx.lineWidth = s * 0.03;
      ctx.strokeStyle = '#FFFFFF';
      ctx.globalAlpha = this.alpha * 0.9;
      ctx.stroke();
      
      ctx.restore();
    }
    
    ctx.globalAlpha = 1;
  }
}

class Rocket {
  x: number;
  y: number;
  startY: number;
  targetY: number;
  speed: number;
  color: string;
  exploded: boolean = false;
  paletteIndex: number | undefined;
  scale: number;
  trail: {x: number, y: number, alpha: number}[];

  constructor(x: number, startY: number, targetY: number, paletteIndex?: number, scale: number = 1.0) {
    this.x = x;
    this.y = startY;
    this.startY = startY;
    this.targetY = targetY;
    this.paletteIndex = paletteIndex;
    this.scale = scale;
    this.speed = -12; // Vertical speed
    this.color = '#E0FFFF'; // Light Cyan
    this.trail = [];
  }

  update() {
    this.y += this.speed;
    
    // Simple trail
    this.trail.push({x: this.x, y: this.y, alpha: 1.0});
    if (this.trail.length > 20) this.trail.shift();
    this.trail.forEach(t => t.alpha *= 0.85);

    if (this.y <= this.targetY) {
      this.exploded = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw trail
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < this.trail.length - 1; i++) {
      const t1 = this.trail[i];
      const t2 = this.trail[i+1];
      ctx.strokeStyle = `rgba(224, 255, 255, ${t1.alpha * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.stroke();
    }

    // Draw Rocket Head
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

const FireworkCanvas: React.FC<FireworkCanvasProps> = ({ triggerQueue, onTriggerProcessed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);

  const createExplosion = (rocket: Rocket) => {
    playExplosionSound();
    
    // With only one palette, modulo ensures we always pick Index 0
    const paletteIdx = rocket.paletteIndex !== undefined 
      ? rocket.paletteIndex 
      : 0;
      
    const palette = PALETTES[paletteIdx % PALETTES.length];
    
    // UPDATED: Reduce count for "less dense" feel (was 120)
    const particleCount = 80; 
    
    // Core (Instant bloom)
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 / 15) * i;
      const speed = Math.random() * 2;
      particlesRef.current.push(new Particle(rocket.x, rocket.y, palette.innerColor, palette.haloColor, speed, angle, 'core', rocket.scale));
    }

    // Main Shell (Delayed bloom)
    for (let i = 0; i < particleCount; i++) {
      // UPDATED: Even distribution (Uniform angles)
      const angle = (Math.PI * 2 * i) / particleCount;
      
      // UPDATED: Faster speed for "Wider Range"
      // Range: 6.0 * 0.8 = 4.8  to  12.0 * 0.8 = 9.6
      const r = Math.random();
      const speed = (6 + r * 6) * 0.8; 
      
      particlesRef.current.push(new Particle(rocket.x, rocket.y, palette.innerColor, palette.haloColor, speed, angle, 'shell', rocket.scale));
    }
    
    // Sparkles
    for (let i = 0; i < 30; i++) {
       const angle = Math.random() * Math.PI * 2;
       const speed = Math.random() * 8;
       particlesRef.current.push(new Particle(rocket.x, rocket.y, '#FFFFFF', palette.haloColor, speed, angle, 'sparkle', rocket.scale));
    }
  };

  useEffect(() => {
    if (triggerQueue.length > 0) {
      triggerQueue.forEach(coord => {
        playLaunchSound();
        const targetY = coord.y;
        rocketsRef.current.push(new Rocket(coord.x, window.innerHeight, targetY, coord.paletteIndex, coord.scale));
      });
      onTriggerProcessed();
    }
  }, [triggerQueue, onTriggerProcessed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear canvas with trail effect
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Fades out previous frames
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.globalCompositeOperation = 'lighter';

      // Update Rockets
      for (let i = rocketsRef.current.length - 1; i >= 0; i--) {
        const r = rocketsRef.current[i];
        r.update();
        r.draw(ctx);
        if (r.exploded) {
          createExplosion(r);
          rocketsRef.current.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-10 block" />;
};

export default FireworkCanvas;