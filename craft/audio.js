/**
 * Voxel Craft 3D - Procedural Audio Engine (Web Audio API)
 * Generates step sounds, digging, block placement, TNT explosions, and C418-style ambient music.
 */
class CraftSoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
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
        this.musicGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
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
            this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : 0.12, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    // Step sounds
    playStep(type = 'GRASS') {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;

        try {
            const bufferSize = this.ctx.sampleRate * 0.08;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            const freq = (type === 'STONE') ? 1200 : (type === 'WOOD') ? 600 : 400;
            filter.frequency.setValueAtTime(freq, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    // Block breaking crunch
    playBreak(type = 'DIRT') {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;

        try {
            const bufferSize = this.ctx.sampleRate * 0.18;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.16);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);

            // Pop impulse
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
            oscGain.gain.setValueAtTime(0.18, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.14);
        } catch (e) {}
    }

    // Block placing "pop"
    playPlace() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    // TNT Sizzling Fuse
    playTntFuse() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;

        try {
            const bufferSize = this.ctx.sampleRate * 2.8;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                // Intermittent sizzling noise
                data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.4 ? 1 : 0);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(3200, now);
            filter.Q.setValueAtTime(4, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.14, now + 2.7);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    // TNT Explosion
    playExplosion() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;

        // Sub bass concussive blast
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.9);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.0);

        // Explosion debris roar
        try {
            const bufferSize = this.ctx.sampleRate * 1.1;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 1.0);

            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.35, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

            noise.connect(filter);
            filter.connect(nGain);
            nGain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    playSelect() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    // Calm C418-style ambient piano chords
    startAmbientMusic() {
        if (this.ambientInterval) return;

        // Chords: Cmaj7, Am7, Fmaj7, G6 (peaceful Minecraft vibes)
        const chordProgressions = [
            [261.63, 329.63, 392.00, 493.88], // C, E, G, B
            [220.00, 261.63, 329.63, 392.00], // A, C, E, G
            [174.61, 220.00, 261.63, 329.63], // F, A, C, E
            [196.00, 246.94, 293.66, 329.63]  // G, B, D, E
        ];
        let chordIdx = 0;

        const playChord = () => {
            if (this.isMuted || !this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const chord = chordProgressions[chordIdx % chordProgressions.length];
                chordIdx++;

                chord.forEach((freq, i) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + i * 0.15);

                    gain.gain.setValueAtTime(0.02, now + i * 0.15);
                    gain.gain.linearRampToValueAtTime(0.045, now + i * 0.15 + 0.3);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 4.5);

                    osc.connect(gain);
                    gain.connect(this.musicGain);
                    osc.start(now + i * 0.15);
                    osc.stop(now + i * 0.15 + 4.8);
                });
            } catch (e) {}
        };

        // Play initial chord after 2s, then every 8-10 seconds
        setTimeout(playChord, 2000);
        this.ambientInterval = setInterval(playChord, 8500);
    }
}

window.craftSound = new CraftSoundEngine();

