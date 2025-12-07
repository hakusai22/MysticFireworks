// AudioContext singleton
let audioCtx: AudioContext | null = null;
let lastOut = 0; // Moved to top to prevent TDZ errors

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playLaunchSound = () => {
  const ctx = initAudio();
  const t = ctx.currentTime;

  // 1. The "Thump" of the mortar
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(150, t);
  oscillator.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  
  gainNode.gain.setValueAtTime(0.15, t);
  gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(t);
  oscillator.stop(t + 0.15);

  // 2. The "Whistle" rising up
  const whistleOsc = ctx.createOscillator();
  const whistleGain = ctx.createGain();

  whistleOsc.type = 'sine';
  whistleOsc.frequency.setValueAtTime(200, t);
  whistleOsc.frequency.linearRampToValueAtTime(600, t + 1.0); // Rising pitch

  whistleGain.gain.setValueAtTime(0, t);
  whistleGain.gain.linearRampToValueAtTime(0.05, t + 0.1);
  whistleGain.gain.linearRampToValueAtTime(0, t + 1.0);

  whistleOsc.connect(whistleGain);
  whistleGain.connect(ctx.destination);
  whistleOsc.start(t);
  whistleOsc.stop(t + 1.0);
};

export const playExplosionSound = () => {
  const ctx = initAudio();
  const t = ctx.currentTime;

  // 1. The "Boom" (Low frequency impact)
  const boomOsc = ctx.createOscillator();
  const boomGain = ctx.createGain();
  
  boomOsc.type = 'sine';
  boomOsc.frequency.setValueAtTime(120, t);
  boomOsc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
  
  boomGain.gain.setValueAtTime(0.5, t);
  boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  
  boomOsc.connect(boomGain);
  boomGain.connect(ctx.destination);
  boomOsc.start(t);
  boomOsc.stop(t + 0.5);

  // 2. The "Crackle" (Pink/White noise burst)
  const bufferSize = ctx.sampleRate * 2.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Fill with noise
  for (let i = 0; i < bufferSize; i++) {
    // Pink noise approximation
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5; // Amplify
  }

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = buffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(800, t);
  noiseFilter.frequency.linearRampToValueAtTime(0, t + 1.5);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.8, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  noiseSrc.start(t);
  noiseSrc.stop(t + 1.5);

  // 3. Delayed secondary crackles (for distance/echo effect)
  setTimeout(() => {
     const crackleOsc = ctx.createOscillator();
     const crackleGain = ctx.createGain();
     crackleOsc.type = 'sawtooth';
     crackleOsc.frequency.value = 100 + Math.random() * 100;
     crackleGain.gain.setValueAtTime(0.05, ctx.currentTime);
     crackleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
     crackleOsc.connect(crackleGain);
     crackleGain.connect(ctx.destination);
     crackleOsc.start();
     crackleOsc.stop(ctx.currentTime + 0.1);
  }, 100 + Math.random() * 200);
};