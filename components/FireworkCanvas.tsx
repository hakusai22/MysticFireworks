import React, { useRef, useEffect, useCallback } from 'react';
import { Coordinates } from '../types';
import { playExplosionSound, playLaunchSound } from '../utils/soundUtils';

interface FireworkCanvasProps {
  triggerQueue: Coordinates[];
  onTriggerProcessed: () => void;
}

// --- Visual Configuration ---
// User requested: "I like Blue" - Switched to Neon Blue / Royal Blue themes
// CHANGED: Used rgb() strings so .replace works for gradients
const PALETTES = [
  { 
    name: 'Electric Blue', 
    innerColor: 'rgb(0, 255, 255)', // Cyan #00FFFF
    haloColor: 'rgb(0, 85, 255)'    // Royal Blue #0055FF
  }, 
  { 
    name: 'Ocean Depths', 
    innerColor: 'rgb(30, 144, 255)', // Dodger Blue #1E90FF
    haloColor: 'rgb(0, 0, 128)'      // Navy Blue #000080
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

  constructor(x: number, y: number, innerColor: string, haloColor: string, speed: number, angle: number, type: 'core' | 'shell' | 'sparkle' | 'willow') {
    this.x = x;
    this.y = y;
    this.innerColor = innerColor;
    this.haloColor = haloColor;
    this.type = type;
    this.history = [];
    this.age = 0;

    // 3D-ish velocity projection to 2D
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    // REQ: All hearts must be upright ("正的")
    // Disabled random rotation and rotationSpeed
    this.rotation = 0;
    this.rotationSpeed = 0; 

    this.currentSize = 0; // Start at 0, wait for bloom

    // PHYSICS TWEAKS FOR 0.8x SPEED (Maintained)
    if (type === 'shell') {
      this.friction = 0.968; 
      this.gravity = 0.022;  
      this.life = 150 + Math.random() * 50; 
      this.targetSize = 16.0; // Large size
      this.bloomDelay = 19 + Math.random() * 19; 
    } else if (type === 'core') {
      this.friction = 0.936; 
      this.gravity = 0.022;
      this.life = 75 + Math.random() * 25; 
      this.targetSize = 10.0;
      this.bloomDelay = 0; // Core blooms instantly
    } else if (type === 'willow') {
      this.friction = 0.944; 
      this.gravity = 0.013;  
      this.life = 175 + Math.random() * 50; 
      this.targetSize = 9.0;
      this.bloomDelay = 6 + Math.random() * 13;
    } else { // Sparkle
      this.friction = 0.90; 
      this.gravity = 0.025; 
      this.life = 65 + Math.random() * 30;
      this.targetSize = 6.0;
      this.bloomDelay = 0;
    }
    
    this.maxLife = this.life;
    this.alpha = 1;
  }

  update() {
    this.age++;

    // Add TURBULENCE / JITTER
    // This creates organic, non-straight paths ("Scattering route")
    if (this.type === 'shell') {
      this.vx += (Math.random() - 0.5) * 0.08;
      this.vy += (Math.random() - 0.5) * 0.08;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    
    this.x += this.vx;
    this.y += this.vy;
    
    this.rotation += this.rotationSpeed;
    
    // Logic: Only start growing the heart after the bloom delay
    if (this.age >= this.bloomDelay) {
      if (this.currentSize < this.targetSize) {
        // "Pop" animation - slightly slower pop for the slow-mo feel
        this.currentSize += (this.targetSize - this.currentSize) * 0.15; 
      }
    }
    
    this.life--;
    this.alpha = Math.max(0, this.life / this.maxLife);

    // Trail logic: Record history every frame for a smooth continuous line
    // Simulates the physical path/route of the spark
    if (this.alpha > 0.05) {
      this.history.push({x: this.x, y: this.y});
      // Keep a longer tail for the "scattering route" effect
      // Increased to 25 to show curves during fall
      if (this.history.length > 25) this.history.shift();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Phase 1: Scattering Route (Trail)
    // Simulates the path of the firecracker. Follows the heart.
    if (this.type === 'shell' && this.history.length > 2) {
      
      // Create a gradient for the trail (Transparent Tail -> Bright Head)
      // This gives it a "Comet" look
      const gradient = ctx.createLinearGradient(
        this.history[0].x, this.history[0].y, 
        this.x, this.y
      );
      
      // Use rgb string replacement for transparency which now works because colors are rgb(...)
      const tailColor = this.haloColor.replace(')', ', 0.2)').replace('rgb', 'rgba');

      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.2, tailColor); // Faint
      gradient.addColorStop(1, this.innerColor); // Bright
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Draw SMOOTH Curve using Quadratic Bezier interpolation
      ctx.beginPath();
      ctx.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 0; i < this.history.length - 1; i++) {
        const p0 = this.history[i];
        const p1 = this.history[i + 1];
        // Midpoint for quadratic curve control
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }
      ctx.lineTo(this.x, this.y);
      ctx.globalAlpha = this.alpha * 0.8; 
      ctx.stroke();

      ctx.globalAlpha = this.alpha; // Reset alpha
    }

    // Phase 2: Neon Border Hearts with Outside-to-Inside Gradient
    if (this.currentSize > 0.1) {
      ctx.save();
      ctx.translate(this.x, this.y);
      // ctx.rotate(this.rotation); // Removed rotation effect effectively since rotation is 0
      
      const s = this.currentSize;
      
      // Define path for "Wide Top, Pointed Bottom" Heart (Q-Style)
      ctx.beginPath();
      
      // Start at top center dip
      ctx.moveTo(0, -s * 0.35);
      
      // Left Lobe: High, Round, Plump
      ctx.bezierCurveTo(
        -s * 0.9, -s * 1.2, // Control 1: High arch
        -s * 1.6, -s * 0.5, // Control 2: Wide belly
        -s * 1.6, s * 0.1   // End: Widest point
      );
      
      // Left Tip: Sharp convergence
      ctx.bezierCurveTo(
        -s * 1.6, s * 0.8,  // Control 1: Curve down
        -s * 0.6, s * 1.4,  // Control 2: Sharp approach
        0, s * 1.7          // End: Bottom Tip (Pointed)
      );
      
      // Right Side Mirror
      ctx.bezierCurveTo(s * 0.6, s * 1.4, s * 1.6, s * 0.8, s * 1.6, s * 0.1);
      ctx.bezierCurveTo(s * 1.6, -s * 0.5, s * 0.9, -s * 1.2, 0, -s * 0.35);
      
      ctx.closePath();

      // FILL: "Outside to Inside Gradient"
      // Center (0.0) is transparent/faint. Edge (1.0) is stronger.
      // This mimics light seeping in from the neon rim.
      const maskGradient = ctx.createRadialGradient(0, -s * 0.2, 0, 0, 0, s * 1.4);
      maskGradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.05)'); // Center: Almost transparent
      maskGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)'); // Mid: Subtle mist
      maskGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.5)');  // Edge: White haze from neon
      
      ctx.fillStyle = maskGradient;
      ctx.globalAlpha = this.alpha;
      ctx.fill();

      // STROKE: "Neon Color Border"
      
      // 1. Outer Glow (The Halo) - Wide and faint
      ctx.lineWidth = s * 0.25;
      ctx.strokeStyle = this.haloColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = this.alpha * 0.3;
      ctx.stroke();

      // 2. Main Neon Tube (The Inner Color) - Sharp and bright
      ctx.lineWidth = s * 0.1;
      ctx.strokeStyle = this.innerColor;
      ctx.globalAlpha = this.alpha; // Full opacity
      ctx.stroke();

      // 3. Tube Highlight (Pure White Thin Line) - The glass reflection
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
  trail: {x: number, y: number, alpha: number}[];

  constructor(x: number, startY: number, targetY: number) {
    this.x = x;
    this.y = startY;
    this.startY = startY;
    this.targetY = targetY;
    this.color = '#E0FFFF'; // Light Cyan (to match blue theme)
    this.speed = 11; // 0.8x approx
    this.trail = [];
  }

  update() {
    const dist = this.y - this.targetY;
    if (dist > 150) {
      this.y -= this.speed;
    } else {
      // Slower deceleration
      this.y -= Math.max(2.5, dist * 0.07); 
    }

    this.trail.push({x: this.x + (Math.random() - 0.5) * 2, y: this.y, alpha: 1.0});
    for(let i=0; i<this.trail.length; i++) {
      this.trail[i].alpha -= 0.12; 
    }
    this.trail = this.trail.filter(t => t.alpha > 0);

    if (this.y <= this.targetY + 10) { 
      this.exploded = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    
    this.trail.forEach(t => {
      ctx.globalAlpha = t.alpha;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

const FireworkCanvas: React.FC<FireworkCanvasProps> = ({ triggerQueue, onTriggerProcessed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  const createExplosion = useCallback((x: number, y: number) => {
    playExplosionSound();
    
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    
    // 1. Core (Dense center)
    const coreCount = 15;
    for (let i = 0; i < coreCount; i++) {
       const angle = Math.random() * Math.PI * 2;
       const speed = Math.random() * 2.4;
       particlesRef.current.push(new Particle(x, y, palette.innerColor, palette.haloColor, speed, angle, 'core'));
    }

    // 2. Main Shell (Large uniform sphere)
    const shellCount = 120; 
    for (let i = 0; i < shellCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4.8 + Math.random() * 9.6; 
      particlesRef.current.push(new Particle(x, y, palette.innerColor, palette.haloColor, speed, angle, 'shell'));
    }

    // 3. Pistil / Glitter (Sparkling overlay)
    const willowCount = 40;
    for (let i = 0; i < willowCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12; 
      particlesRef.current.push(new Particle(x, y, '#FFFFFF', palette.haloColor, speed, angle, 'willow'));
    }
  }, []);

  const launchFirework = useCallback((x: number, targetY: number) => {
    playLaunchSound();
    rocketsRef.current.push(new Rocket(x, window.innerHeight, targetY));
  }, []);

  useEffect(() => {
    if (triggerQueue.length > 0) {
      triggerQueue.forEach(coord => {
        const targetY = Math.max(coord.y, window.innerHeight * 0.15); 
        launchFirework(coord.x, targetY);
      });
      onTriggerProcessed();
    }
  }, [triggerQueue, launchFirework, onTriggerProcessed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const animate = () => {
      // Clear with slight opacity for trails
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(5, 5, 5, 0.2)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Additive blending for neon glow
      ctx.globalCompositeOperation = 'lighter';

      // Update Rockets
      for (let i = rocketsRef.current.length - 1; i >= 0; i--) {
        const rocket = rocketsRef.current[i];
        rocket.update();
        rocket.draw(ctx);
        if (rocket.exploded) {
          createExplosion(rocket.x, rocket.y);
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

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [createExplosion]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-10" />;
};

export default FireworkCanvas;