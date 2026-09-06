/**
 * Cyber Snake - Procedural Audio Engine (Web Audio API)
 * Generates all sound effects and background ambient music procedurally.
 */
class SnakeSoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.musicEnabled = true;
        this.musicGain = null;
        this.ambientInterval = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        this.musicGain.connect(this.ctx.destination);

        this.initialized = true;
        this.startAmbientMusic();
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.ensureContext();
        this.isMuted = !this.isMuted;
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : 0.15, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    playTurn() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.06);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    }

    playEat(combo = 1) {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;

        const baseFreq = 440; // A4
        const pitchStep = Math.min(2.2, 1 + (combo - 1) * 0.12);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq * pitchStep, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * pitchStep * 1.5, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
    }

    playBonusEat() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;
        const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            gain.gain.setValueAtTime(0.15, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.28);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.3);
        });
    }

    playPowerup() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(1050, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playDie() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;

        // Sub bass drop
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);

        // White noise glitch impact
        try {
            const bufferSize = this.ctx.sampleRate * 0.3;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.18, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            noise.connect(filter);
            filter.connect(nGain);
            nGain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    startAmbientMusic() {
        if (this.ambientInterval) return;
        const synthScale = [146.83, 164.81, 196.00, 220.00, 261.63, 293.66]; // D minor pentatonic cyberpunk
        let step = 0;

        this.ambientInterval = setInterval(() => {
            if (this.isMuted || !this.ctx || !this.musicEnabled) return;
            try {
                const now = this.ctx.currentTime;
                // Bass pulse on every 4th step
                if (step % 4 === 0) {
                    const bassOsc = this.ctx.createOscillator();
                    const bassGain = this.ctx.createGain();
                    bassOsc.type = 'sine';
                    bassOsc.frequency.setValueAtTime(73.42, now); // D2
                    bassGain.gain.setValueAtTime(0.1, now);
                    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
                    bassOsc.connect(bassGain);
                    bassGain.connect(this.musicGain);
                    bassOsc.start(now);
                    bassOsc.stop(now + 1.7);
                }

                // Synth arpeggio tone
                const note = synthScale[Math.floor(Math.random() * synthScale.length)];
                const arpOsc = this.ctx.createOscillator();
                const arpGain = this.ctx.createGain();
                arpOsc.type = 'triangle';
                arpOsc.frequency.setValueAtTime(note, now);
                arpGain.gain.setValueAtTime(0.035, now);
                arpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
                arpOsc.connect(arpGain);
                arpGain.connect(this.musicGain);
                arpOsc.start(now);
                arpOsc.stop(now + 0.9);

                step++;
            } catch (e) {}
        }, 600);
    }
}

window.snakeSound = new SnakeSoundEngine();

