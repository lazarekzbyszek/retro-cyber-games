/**
 * Meteor Surfing - Procedural Audio Engine (Web Audio API)
 * Generates all sound effects and background ambient music procedurally.
 * No external audio files required.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.musicEnabled = true;
        this.chargeOsc = null;
        this.chargeGain = null;
        this.musicGain = null;
        this.ambientInterval = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();
        
        // Master Music Gain
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
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
            this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : 0.18, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    // --- SOUND EFFECTS ---

    startCharge() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        this.stopCharge();

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(720, now + 1.2);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();

            this.chargeOsc = osc;
            this.chargeGain = gain;
        } catch (e) {}
    }

    stopCharge() {
        if (this.chargeOsc) {
            try {
                this.chargeGain.gain.setValueAtTime(this.chargeGain.gain.value, this.ctx.currentTime);
                this.chargeGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);
                this.chargeOsc.stop(this.ctx.currentTime + 0.06);
            } catch (e) {}
            this.chargeOsc = null;
            this.chargeGain = null;
        }
    }

    playJump(isBooster = false) {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        this.stopCharge();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isBooster ? 'sawtooth' : 'triangle';
        const startFreq = isBooster ? 600 : 380;
        const endFreq = isBooster ? 1200 : 180;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.22);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);

        // Whoosh noise layer
        this.createWhoosh(now, isBooster ? 0.25 : 0.18);
    }

    createWhoosh(now, duration) {
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(2200, now + duration);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    playLand(type = 'NORMAL') {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;

        // Sub thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        
        let freq = 120;
        if (type === 'CRYSTAL') freq = 220;
        if (type === 'ICE') freq = 160;
        if (type === 'BOOSTER') freq = 180;

        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.16);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);

        // Special tone for crystal or ice
        if (type === 'CRYSTAL') {
            this.playCrystal();
        } else if (type === 'ICE') {
            this.playIceSlide();
        }
    }

    playCrystal() {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            gain.gain.setValueAtTime(0.12, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.32);
        });
    }

    playIceSlide() {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1400, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    playCombo(multiplier) {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;
        const root = 440;
        const pitchMultiplier = Math.min(2.5, 1 + (multiplier - 1) * 0.2);
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(root * pitchMultiplier, now);
        osc.frequency.exponentialRampToValueAtTime(root * pitchMultiplier * 1.5, now + 0.22);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
    }

    playPowerup(name) {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();
        const now = this.ctx.currentTime;
        const chords = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
        chords.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.15, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.36);
        });
    }

    playUnstableTick() {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    playExplode() {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.46);
        this.createWhoosh(now, 0.4);
    }

    playShieldBreak() {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.33);
    }

    playDeath() {
        if (this.isMuted || !this.ctx) return;
        this.stopCharge();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);
    }

    // --- PROCEDURAL AMBIENT SYNTH MUSIC ---
    startAmbientMusic() {
        if (this.ambientInterval) return;
        const scale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63];
        let step = 0;

        this.ambientInterval = setInterval(() => {
            if (this.isMuted || !this.ctx || !this.musicEnabled) return;
            try {
                const now = this.ctx.currentTime;
                // Deep drone bass note every 4 beats
                if (step % 4 === 0) {
                    const bassOsc = this.ctx.createOscillator();
                    const bassGain = this.ctx.createGain();
                    bassOsc.type = 'sine';
                    bassOsc.frequency.setValueAtTime(65.41, now); // C2
                    bassGain.gain.setValueAtTime(0.12, now);
                    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
                    bassOsc.connect(bassGain);
                    bassGain.connect(this.musicGain);
                    bassOsc.start(now);
                    bassOsc.stop(now + 2.9);
                }

                // Ethereal arpeggio tone
                const note = scale[Math.floor(Math.random() * scale.length)];
                const arpOsc = this.ctx.createOscillator();
                const arpGain = this.ctx.createGain();
                arpOsc.type = 'sine';
                arpOsc.frequency.setValueAtTime(note, now);
                arpGain.gain.setValueAtTime(0.05, now);
                arpGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

                arpOsc.connect(arpGain);
                arpGain.connect(this.musicGain);
                arpOsc.start(now);
                arpOsc.stop(now + 1.3);

                step++;
            } catch (e) {}
        }, 750);
    }
}

window.soundEngine = new SoundEngine();

