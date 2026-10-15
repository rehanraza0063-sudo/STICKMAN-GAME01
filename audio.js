/**
 * Web Audio API Sound Synthesizer & Procedural BGM Engine
 * Zero external audio files required - 100% self-contained, reliable & offline!
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.bgmGain = null;
        this.analyser = null;
        
        this.sfxVolume = 0.85;
        this.bgmVolume = 0.55;
        this.isMuted = false;
        
        // Continuous looping sounds
        this.slideNodes = { p1: null, p2: null };
        
        // Procedural BGM Sequencer state
        this.bgmActive = false;
        this.bgmTimer = null;
        this.bgmBpm = 132;
        this.bgmStep = 0;
        this.bgmTrackIndex = 0;
        this.bgmFilter = null;
        
        // Noise buffer cache
        this.noiseBuffers = {};
    }

    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        // Dynamics Compressor for punchy arcade sound without clipping
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

        // Visualizer Analyser
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

        // Sub gains
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);

        // Master routing
        this.sfxGain.connect(this.compressor);
        this.bgmGain.connect(this.compressor);
        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        this._createNoiseBuffers();
    }

    _resume() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    _createNoiseBuffers() {
        const sampleRate = this.ctx.sampleRate;
        // White noise
        const whiteBuffer = this.ctx.createBuffer(1, sampleRate * 2, sampleRate);
        const whiteData = whiteBuffer.getChannelData(0);
        for (let i = 0; i < sampleRate * 2; i++) {
            whiteData[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffers.white = whiteBuffer;

        // Pink/warm noise (friction/wind)
        const pinkBuffer = this.ctx.createBuffer(1, sampleRate * 2, sampleRate);
        const pinkData = pinkBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < sampleRate * 2; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            pinkData[i] = (b0 + b1 + b2) * 0.4;
        }
        this.noiseBuffers.pink = pinkBuffer;
    }

    // ==========================================
    // ATTACK SOUNDS
    // ==========================================

    playPunchWhoosh(speed = 1.0) {
        this._resume();
        const now = this.ctx.currentTime;
        
        // Fast pitch envelope white noise whoosh
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.pink;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(3.5, now);
        filter.frequency.setValueAtTime(350 * speed, now);
        filter.frequency.exponentialRampToValueAtTime(1400 * speed, now + 0.07);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.45, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.16);
    }

    playHit(strength = 1.0, isKick = false) {
        this._resume();
        const now = this.ctx.currentTime;

        // 1. Transient smack (fast noise burst)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.white;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(isKick ? 600 : 1200, now);
        noiseFilter.Q.setValueAtTime(2.0, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6 * strength, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (isKick ? 0.12 : 0.08));

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.13);

        // 2. Body thud (low oscillator dive)
        const osc = this.ctx.createOscillator();
        osc.type = isKick ? 'triangle' : 'sine';
        const startFreq = isKick ? 180 : 240;
        const endFreq = isKick ? 45 : 60;
        osc.frequency.setValueAtTime(startFreq * (0.9 + Math.random() * 0.2), now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.14);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.8 * strength, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    playHeavyHit() {
        this._resume();
        const now = this.ctx.currentTime;

        // Bone crunch + Bass blast
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

        const oscFilter = this.ctx.createBiquadFilter();
        oscFilter.type = 'lowpass';
        oscFilter.frequency.setValueAtTime(600, now);
        oscFilter.frequency.exponentialRampToValueAtTime(80, now + 0.25);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(1.0, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(oscFilter);
        oscFilter.connect(oscGain);
        oscGain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.26);

        // Crack sound
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.white;
        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.setValueAtTime(1500, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.7, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.1);
    }

    playUppercut() {
        this._resume();
        const now = this.ctx.currentTime;

        // Rising whoosh followed by thunderous punch
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.28);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.29);

        this.playHit(1.2, true);
    }

    // ==========================================
    // DAMAGE & HURT SOUNDS
    // ==========================================

    playDamageHurt(isHeavy = false) {
        this._resume();
        const now = this.ctx.currentTime;

        // Vocalized grunt / pain resonance
        const grunt = this.ctx.createOscillator();
        grunt.type = 'sawtooth';
        const startPitch = isHeavy ? 170 : 220;
        grunt.frequency.setValueAtTime(startPitch * (0.95 + Math.random() * 0.1), now);
        grunt.frequency.exponentialRampToValueAtTime(startPitch * 0.45, now + (isHeavy ? 0.25 : 0.14));

        const gruntFilter = this.ctx.createBiquadFilter();
        gruntFilter.type = 'bandpass';
        gruntFilter.Q.setValueAtTime(4.0, now);
        gruntFilter.frequency.setValueAtTime(isHeavy ? 450 : 600, now);
        gruntFilter.frequency.exponentialRampToValueAtTime(200, now + 0.18);

        const gruntGain = this.ctx.createGain();
        gruntGain.gain.setValueAtTime(0.55, now);
        gruntGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.25 : 0.15));

        grunt.connect(gruntFilter);
        gruntFilter.connect(gruntGain);
        gruntGain.connect(this.sfxGain);

        grunt.start(now);
        grunt.stop(now + (isHeavy ? 0.26 : 0.16));
    }

    playBlock() {
        this._resume();
        const now = this.ctx.currentTime;

        // Metallic ping / shield deflection
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(950, now);
        osc2.frequency.exponentialRampToValueAtTime(300, now + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.19);
        osc2.stop(now + 0.19);
    }

    // ==========================================
    // MOVEMENT & ACROBATICS SOUNDS
    // ==========================================

    playJump() {
        this._resume();
        const now = this.ctx.currentTime;

        // Upward springy pitch sweep
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.16);
    }

    playDoubleJump() {
        this._resume();
        const now = this.ctx.currentTime;

        // Air jump sonic pop
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.pink;
        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(1600, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.3, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.sfxGain);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        noise.start(now);
        osc.stop(now + 0.14);
        noise.stop(now + 0.11);
    }

    playLand() {
        this._resume();
        const now = this.ctx.currentTime;

        // Heavy floor impact thud
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.1);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.11);
    }

    // SLIDING SOUND: Continuous looping friction sound
    startSlide(playerId = 'p1') {
        this._resume();
        if (this.slideNodes[playerId]) return; // already active

        const now = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.pink;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.Q.setValueAtTime(2.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.38, now + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);

        this.slideNodes[playerId] = { noise, gain, filter };
    }

    stopSlide(playerId = 'p1') {
        if (!this.slideNodes[playerId]) return;
        const now = this.ctx.currentTime;
        const { noise, gain } = this.slideNodes[playerId];
        try {
            gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
            setTimeout(() => {
                try { noise.stop(); noise.disconnect(); } catch (e) {}
            }, 70);
        } catch (e) {}
        this.slideNodes[playerId] = null;
    }

    playDash() {
        this._resume();
        const now = this.ctx.currentTime;

        // Sonic displacement rush
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.pink;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(2200, now + 0.1);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.21);
    }

    playFootstep() {
        this._resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140 + Math.random() * 30, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    // ==========================================
    // WEAPON SOUNDS
    // ==========================================

    playSwordSlash() {
        this._resume();
        const now = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.white;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        filter.Q.setValueAtTime(5.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.16);
    }

    playGunshot() {
        this._resume();
        const now = this.ctx.currentTime;

        // Sharp crack
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.white;
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.7, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noise.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.09);

        // Sub blast
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.65, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.19);
    }

    playExplosion() {
        this._resume();
        const now = this.ctx.currentTime;

        // Massive bass drop
        const sub = this.ctx.createOscillator();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(90, now);
        sub.frequency.exponentialRampToValueAtTime(25, now + 0.45);

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.95, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + 0.46);

        // Rumbling noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.pink;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.85, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.56);
    }

    playWeaponPickup() {
        this._resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(780, now + 0.06);
        osc.frequency.setValueAtTime(1040, now + 0.12);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.23);
    }

    // ==========================================
    // SPECIAL & ANNOUNCER SOUNDS
    // ==========================================

    playSuperCharge() {
        this._resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.6);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 0.6);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.65, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.66);
    }

    playSuperBeam() {
        this._resume();
        const now = this.ctx.currentTime;

        // Powerful energy discharge
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.4);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.white;

        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(1200, now);
        nFilter.Q.setValueAtTime(2.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.85, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        noise.connect(nFilter);
        nFilter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        noise.start(now);
        osc.stop(now + 0.46);
        noise.stop(now + 0.46);
    }

    playSlowMoSound() {
        this._resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.51);
    }

    playKoAnnounce() {
        this._resume();
        const now = this.ctx.currentTime;

        // Dramatic power chord (C minor power chord: C2, G2, C3)
        [65.41, 98.00, 130.81, 155.56].forEach(freq => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.frequency.exponentialRampToValueAtTime(250, now + 1.2);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 1.45);
        });
    }

    playMenuClick() {
        this._resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    // ==========================================
    // PROCEDURAL FIGHT BGM ENGINE
    // ==========================================

    startBgm(trackIndex = 0) {
        this._resume();
        this.bgmTrackIndex = trackIndex;
        if (this.bgmActive) {
            this.stopBgm();
        }

        this.bgmActive = true;
        this.bgmStep = 0;

        // Track configs: BPM and musical scales
        const tracks = [
            { bpm: 130, name: "Neon Brawler" },
            { bpm: 142, name: "Shadow Dojo" },
            { bpm: 152, name: "Adrenaline Rush" }
        ];

        const cfg = tracks[trackIndex] || tracks[0];
        this.bgmBpm = cfg.bpm;

        const stepDuration = (60 / this.bgmBpm) / 4; // 16th note steps

        const tick = () => {
            if (!this.bgmActive) return;
            this._playBgmStep(this.bgmStep, this.bgmTrackIndex);
            this.bgmStep = (this.bgmStep + 1) % 64; // 4-bar 16-step pattern
            this.bgmTimer = setTimeout(tick, stepDuration * 1000);
        };

        tick();
    }

    stopBgm() {
        this.bgmActive = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    toggleBgm() {
        if (this.bgmActive) {
            this.stopBgm();
            return false;
        } else {
            this.startBgm(this.bgmTrackIndex);
            return true;
        }
    }

    setTrack(index) {
        const wasActive = this.bgmActive;
        this.stopBgm();
        this.bgmTrackIndex = index;
        if (wasActive) {
            this.startBgm(index);
        }
    }

    _playBgmStep(step, trackIndex) {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const beatInBar = step % 16;
        const bar = Math.floor(step / 16);

        // 1. DRUMS
        // Kick on 0, 4, 8, 12 (four-on-the-floor) + syncopation
        const hasKick = (beatInBar === 0 || beatInBar === 4 || beatInBar === 8 || beatInBar === 12) ||
                        (trackIndex === 1 && (beatInBar === 10 || beatInBar === 14));
        if (hasKick) {
            this._synthKick(now, beatInBar === 0 ? 0.7 : 0.55);
        }

        // Snare/Clap on beats 4 and 12 (standard 2 & 4 backbeat)
        if (beatInBar === 4 || beatInBar === 12) {
            this._synthSnare(now, 0.45);
        }

        // Hi-hats: every 2 steps or 16th notes
        if (beatInBar % 2 === 0 || trackIndex === 2) {
            const isAccent = beatInBar % 4 === 2; // offbeat hat
            this._synthHiHat(now, isAccent ? 0.28 : 0.14, isAccent);
        }

        // 2. BASSLINE
        // Note frequencies: E minor scale (E1=41.2, G1=49.0, A1=55.0, B1=61.7, D2=73.4)
        const bassNotesTrack0 = [
            41.2, 41.2, 41.2, 82.4,  41.2, 41.2, 49.0, 55.0,
            41.2, 41.2, 41.2, 73.4,  61.7, 55.0, 49.0, 41.2
        ];
        const bassNotesTrack1 = [
            55.0, 55.0, 110.0, 55.0,  65.4, 65.4, 130.8, 65.4,
            49.0, 49.0, 98.0, 49.0,   73.4, 65.4, 55.0, 49.0
        ];
        const bassNotesTrack2 = [
            41.2, 82.4, 41.2, 82.4,   41.2, 82.4, 49.0, 98.0,
            55.0, 110.0, 55.0, 110.0, 61.7, 55.0, 49.0, 41.2
        ];

        const bassPatterns = [bassNotesTrack0, bassNotesTrack1, bassNotesTrack2];
        const currentPattern = bassPatterns[trackIndex] || bassNotesTrack0;
        const noteFreq = currentPattern[beatInBar];

        if (noteFreq && beatInBar % 2 === 0) {
            this._synthBass(now, noteFreq, 0.35);
        }

        // 3. SYNTH LEAD / ARPEGGIOS
        // Melodic lines that evolve over 4 bars
        const melodyScale = [164.8, 196.0, 220.0, 246.9, 293.7, 329.6, 392.0, 440.0]; // E pentatonic/minor
        if (trackIndex === 0) {
            // Synth Arp
            const arpIndex = (step * 3) % melodyScale.length;
            if (beatInBar % 2 === 1) {
                this._synthLead(now, melodyScale[arpIndex], 0.18, 0.08);
            }
        } else if (trackIndex === 1) {
            // Ninja stabs
            if (beatInBar === 0 || beatInBar === 3 || beatInBar === 6 || beatInBar === 11) {
                const leadFreq = melodyScale[(bar * 2 + (beatInBar > 5 ? 4 : 2)) % melodyScale.length];
                this._synthLead(now, leadFreq * 1.5, 0.22, 0.12);
            }
        } else if (trackIndex === 2) {
            // Fast arcade chords
            if (beatInBar % 4 === 0) {
                const chordRoot = melodyScale[(bar * 2) % 5];
                this._synthLead(now, chordRoot, 0.22, 0.14);
                this._synthLead(now, chordRoot * 1.5, 0.18, 0.14);
            }
        }
    }

    _synthKick(now, vol = 0.6) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + 0.13);
    }

    _synthSnare(now, vol = 0.4) {
        // Noise snap
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.white;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        noise.start(now);
        noise.stop(now + 0.13);

        // Body tone
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(vol * 0.7, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(oscGain);
        oscGain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    _synthHiHat(now, vol = 0.15, isOpen = false) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.white;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, now);

        const duration = isOpen ? 0.08 : 0.035;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        noise.start(now);
        noise.stop(now + duration + 0.01);
    }

    _synthBass(now, freq, vol = 0.3) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, now);
        filter.frequency.exponentialRampToValueAtTime(140, now + 0.12);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + 0.17);
    }

    _synthLead(now, freq, vol = 0.2, duration = 0.1) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    // ==========================================
    // VOLUME & SETTINGS
    // ==========================================

    setSfxVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, val));
        if (this.sfxGain) {
            this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVolume, this.ctx ? this.ctx.currentTime : 0);
        }
    }

    setBgmVolume(val) {
        this.bgmVolume = Math.max(0, Math.min(1, val));
        if (this.bgmGain) {
            this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : this.bgmVolume, this.ctx ? this.ctx.currentTime : 0);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        const now = this.ctx ? this.ctx.currentTime : 0;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, now);
        }
        return this.isMuted;
    }
}

// Global Sound Engine singleton
window.soundEngine = new SoundEngine();
