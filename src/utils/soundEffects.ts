/**
 * PropFlow Interactive Audio Synthesizer Node
 * Uses purely Client-Side Web Audio API to create futuristic sci-fi trading cockpit sound indicators
 * No asset dependencies or network loads required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    // Standard and Webkit compatibility
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  
  // Resume context if suspended (browser security blocks autoplay)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const playBeep = (freq = 880, duration = 0.08, type: OscillatorType = 'sine') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Smooth fast decay to avoid pops
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore context blocked logs
  }
};

export const playHighTechClick = () => {
  // A dual frequency click that feels very high-tech
  playBeep(1200, 0.04, 'triangle');
  setTimeout(() => {
    playBeep(2400, 0.02, 'sine');
  }, 30);
};

export const playRoboStartup = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Play a nice futuristic ascending 3-note chime
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      
      gain.gain.setValueAtTime(0.0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.3);
    });
  } catch (e) {}
};

export const playRoboShutdown = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Descending heavy sweep
    const notes = [659, 554, 440, 220];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      osc.frequency.exponentialRampToValueAtTime(freq / 2, now + idx * 0.1 + 0.18);
      
      gain.gain.setValueAtTime(0.0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.05, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.18);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.2);
    });
  } catch (e) {}
};

export const playCriticalWarningSiren = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Double pulse buzzer sounds
    [0, 0.25].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now + delay);
      osc.frequency.linearRampToValueAtTime(180, now + delay + 0.15);
      
      gain.gain.setValueAtTime(0.0, now + delay);
      gain.gain.linearRampToValueAtTime(0.07, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.18);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
  } catch (e) {}
};
