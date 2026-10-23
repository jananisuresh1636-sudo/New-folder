/**
 * Subway Surfers - Metro Runner
 * Audio Engine powered by Web Audio API (Zero external assets required, 100% reliable)
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.musicPlaying = false;
        this.musicTimer = null;
        this.musicTempo = 126; // BPM
        this.musicStep = 0;
        this.masterVolume = 0.35;
        this.sfxVolume = 0.5;

        // Sound state
        this.jetpackGain = null;
        this.jetpackOsc = null;
        this.coinStreak = 0;
        this.lastCoinTime = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopMusic();
            if (this.jetpackGain) this.jetpackGain.gain.setValueAtTime(0, this.ctx.currentTime);
        } else {
            this.startMusic();
        }
        return this.isMuted;
    }

    setMute(muted) {
        if (this.isMuted !== muted) {
            this.toggleMute();
        }
    }

    // --- Sound Effects ---

    playJump() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);

        gain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.23);
    }

    playSuperJump() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.28);

        gain.gain.setValueAtTime(this.sfxVolume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.33);
    }

    playRoll() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(700, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
    }

    playLaneSwitch() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);

        gain.gain.setValueAtTime(this.sfxVolume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.11);
    }

    playCoin() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;

        // Combo streak pitch-scaling
        if (now - this.lastCoinTime < 0.35) {
            this.coinStreak = Math.min(this.coinStreak + 1, 8);
        } else {
            this.coinStreak = 0;
        }
        this.lastCoinTime = now;

        const baseFrequencies = [987.77, 1046.50, 1174.66, 1318.51, 1396.91, 1567.98, 1760.00, 1975.53, 2093.00];
        const freq = baseFrequencies[this.coinStreak] || 1318.51;

        const osc = this.ctx.createOscillator();
        const oscHarmonic = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        oscHarmonic.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        oscHarmonic.frequency.setValueAtTime(freq * 2, now);

        gain.gain.setValueAtTime(this.sfxVolume * 0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        oscHarmonic.start(now);
        osc.stop(now + 0.13);
        oscHarmonic.stop(now + 0.13);
    }

    playPowerup() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = now + idx * 0.06;

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(this.sfxVolume * 0.22, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.19);
        });
    }

    playHoverboard() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);

        gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.31);
    }

    playCrash() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;

        // Low thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

        gain.gain.setValueAtTime(this.sfxVolume * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);

        // Crash noise burst
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
    }

    playStumble() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.17);
    }

    startJetpackLoop() {
        if (this.isMuted || this.jetpackOsc) return;
        this.init();
        const now = this.ctx.currentTime;

        this.jetpackOsc = this.ctx.createOscillator();
        this.jetpackGain = this.ctx.createGain();

        this.jetpackOsc.type = 'sawtooth';
        this.jetpackOsc.frequency.setValueAtTime(110, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        this.jetpackGain.gain.setValueAtTime(0.001, now);
        this.jetpackGain.gain.linearRampToValueAtTime(this.sfxVolume * 0.22, now + 0.3);

        this.jetpackOsc.connect(filter);
        filter.connect(this.jetpackGain);
        this.jetpackGain.connect(this.ctx.destination);

        this.jetpackOsc.start(now);
    }

    stopJetpackLoop() {
        if (!this.jetpackOsc) return;
        try {
            const now = this.ctx.currentTime;
            this.jetpackGain.gain.linearRampToValueAtTime(0.001, now + 0.2);
            this.jetpackOsc.stop(now + 0.25);
        } catch (e) {}
        this.jetpackOsc = null;
        this.jetpackGain = null;
    }

    // --- Dynamic Background Subway Runner Music Loop ---

    startMusic() {
        if (this.isMuted || this.musicPlaying) return;
        this.init();
        this.musicPlaying = true;
        this.musicStep = 0;
        this.scheduleMusicBeat();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    scheduleMusicBeat() {
        if (!this.musicPlaying || this.isMuted) return;

        const secondsPerBeat = 60 / this.musicTempo;
        const stepTime = secondsPerBeat / 4; // 16th notes
        const now = this.ctx.currentTime;

        const step = this.musicStep % 32;

        // Bassline pattern (funky subway groove in D minor: D, F, G, A, C)
        const bassNotes = [
            73.42, 0, 73.42, 0, 87.31, 0, 98.00, 0,
            110.00, 0, 98.00, 0, 87.31, 0, 73.42, 87.31,
            73.42, 0, 73.42, 0, 65.41, 0, 73.42, 0,
            87.31, 0, 110.00, 0, 130.81, 0, 110.00, 0
        ];

        const bassFreq = bassNotes[step];
        if (bassFreq > 0) {
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(bassFreq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, now);
            filter.frequency.exponentialRampToValueAtTime(90, now + stepTime * 1.5);

            gain.gain.setValueAtTime(this.masterVolume * 0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 1.8);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + stepTime * 2);
        }

        // Drum: Kick on 0, 4, 8, 12, 16, 20, 24, 28
        if (step % 4 === 0) {
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();

            kickOsc.frequency.setValueAtTime(140, now);
            kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.1);

            kickGain.gain.setValueAtTime(this.masterVolume * 0.65, now);
            kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

            kickOsc.connect(kickGain);
            kickGain.connect(this.ctx.destination);

            kickOsc.start(now);
            kickOsc.stop(now + 0.15);
        }

        // Drum: Snare on 4, 12, 20, 28
        if (step % 8 === 4) {
            const snareNoise = this.ctx.createBufferSource();
            const bufferSize = this.ctx.sampleRate * 0.08;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
            }
            snareNoise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(900, now);

            const snareGain = this.ctx.createGain();
            snareGain.gain.setValueAtTime(this.masterVolume * 0.35, now);
            snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            snareNoise.connect(filter);
            filter.connect(snareGain);
            snareGain.connect(this.ctx.destination);

            snareNoise.start(now);
        }

        // Drum: Hi-hat on every off-beat 2, 6, 10, 14, 18, 22, 26, 30
        if (step % 2 === 1) {
            const hatNoise = this.ctx.createBufferSource();
            const bufferSize = this.ctx.sampleRate * 0.03;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
            }
            hatNoise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(6000, now);

            const hatGain = this.ctx.createGain();
            hatGain.gain.setValueAtTime(this.masterVolume * 0.15, now);
            hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

            hatNoise.connect(filter);
            filter.connect(hatGain);
            hatGain.connect(this.ctx.destination);

            hatNoise.start(now);
        }

        this.musicStep++;
        this.musicTimer = setTimeout(() => this.scheduleMusicBeat(), stepTime * 1000);
    }
}

window.AudioEngine = new AudioEngine();
