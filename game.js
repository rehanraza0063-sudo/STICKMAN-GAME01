/**
 * Main Stickman Fight Game Engine
 * Orchestrates loop, camera, controls, state machine, collisions, and HUD
 */

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Dimensions
        this.baseWidth = 1000;
        this.baseHeight = 600;
        this.canvas.width = this.baseWidth;
        this.canvas.height = this.baseHeight;

        // Players
        this.player1 = new Stickman('p1', 'BLUE DRAGON', '#00e5ff', 300, 450, false);
        this.player2 = new Stickman('p2', 'SHADOW VIPER', '#ff1744', 700, 450, true);
        this.ai = new StickmanAI(this.player2, 'normal');

        // Game Configuration & State
        this.gameMode = 'pve'; // 'pve', 'pvp', 'survival', 'training'
        this.state = 'MENU'; // 'MENU', 'COUNTDOWN', 'PLAYING', 'ROUND_END', 'MATCH_END'
        this.roundsToWin = 2;
        this.currentRound = 1;
        this.countdownTimer = 0;
        this.roundEndTimer = 0;
        this.winner = null;
        this.hitStopFrames = 0;

        // Survival mode stats
        this.survivalWave = 1;
        this.survivalScore = 0;

        // Camera
        this.camera = {
            x: 500,
            y: 300,
            targetX: 500,
            targetY: 300,
            zoom: 1.0,
            targetZoom: 1.0
        };

        // Key states
        this.keys = {};
        this._setupInputListeners();

        // Audio visualizer state
        this.analyserData = new Uint8Array(32);
    }

    init() {
        this._bindUI();
        this._updateHUD();
        requestAnimationFrame((ts) => this.loop(ts));
    }

    _setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            // Initialize Web Audio on first user interaction
            if (window.soundEngine && (!window.soundEngine.ctx || window.soundEngine.ctx.state === 'suspended')) {
                window.soundEngine.init();
            }

            if (this.keys[e.code]) return; // prevent repeat spam for single-presses
            this.keys[e.code] = true;

            if (this.state === 'PLAYING') {
                this._handleSingleKeyDown(e.code);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;

            if (this.state === 'PLAYING') {
                // Blocking releases
                if (e.code === 'KeyH' || e.code === 'KeyL') {
                    this.player1.block(false);
                }
                if (this.gameMode === 'pvp' && (e.code === 'Numpad3' || e.code === 'Slash' || e.code === 'KeyM')) {
                    this.player2.block(false);
                }
            }
        });
    }

    _handleSingleKeyDown(code) {
        // --- PLAYER 1 INPUTS ---
        // Jump
        if (code === 'KeyW' || code === 'Space') {
            this.player1.jump();
        }
        // Slide / Crouch
        if (code === 'KeyS') {
            this.player1.slide();
        }
        // Dash
        if (code === 'ShiftLeft') {
            this.player1.dash();
        }
        // Attack 1 (Combo Punch)
        if (code === 'KeyF' || code === 'KeyJ') {
            this.player1.attack();
        }
        // Attack 2 (Kick)
        if (code === 'KeyG' || code === 'KeyK') {
            this.player1.kick();
        }
        // Block
        if (code === 'KeyH' || code === 'KeyL') {
            this.player1.block(true);
        }
        // Weapon Pickup / Throw
        if (code === 'KeyE' || code === 'KeyU') {
            this.player1.pickupOrThrowWeapon();
        }
        // Super Move
        if (code === 'KeyR' || code === 'KeyI') {
            this.player1.superAttack();
        }

        // --- PLAYER 2 INPUTS (PVP LOCAL) ---
        if (this.gameMode === 'pvp') {
            if (code === 'ArrowUp') {
                this.player2.jump();
            }
            if (code === 'ArrowDown') {
                this.player2.slide();
            }
            if (code === 'ControlRight' || code === 'Enter') {
                this.player2.dash();
            }
            if (code === 'Numpad1' || code === 'Comma' || code === 'KeyB') {
                this.player2.attack();
            }
            if (code === 'Numpad2' || code === 'Period' || code === 'KeyN') {
                this.player2.kick();
            }
            if (code === 'Numpad3' || code === 'Slash' || code === 'KeyM') {
                this.player2.block(true);
            }
            if (code === 'Numpad4' || code === 'KeyO') {
                this.player2.pickupOrThrowWeapon();
            }
            if (code === 'Numpad5' || code === 'KeyP') {
                this.player2.superAttack();
            }
        }
    }

    _processContinuousInput() {
        // P1 Continuous Movement
        let p1Dir = 0;
        if (this.keys['KeyA']) p1Dir -= 1;
        if (this.keys['KeyD']) p1Dir += 1;
        this.player1.move(p1Dir);

        // P2 Continuous Movement (if PVP)
        if (this.gameMode === 'pvp') {
            let p2Dir = 0;
            if (this.keys['ArrowLeft']) p2Dir -= 1;
            if (this.keys['ArrowRight']) p2Dir += 1;
            this.player2.move(p2Dir);
        }
    }

    startMatch(mode = 'pve', stageIndex = 0, difficulty = 'normal') {
        this.gameMode = mode;
        this.ai.setDifficulty(difficulty);
        window.stageManager.setStage(stageIndex);
        window.weaponManager.reset();

        this.player1.roundsWon = 0;
        this.player2.roundsWon = 0;
        this.currentRound = 1;
        this.survivalWave = 1;
        this.survivalScore = 0;

        if (mode === 'pvp') {
            this.player2.isAI = false;
            this.player2.name = 'RED PHOENIX';
        } else {
            this.player2.isAI = true;
            this.player2.name = mode === 'survival' ? `CYBER BOT #${this.survivalWave}` : 'AI VIPER';
        }

        this.startRound();
    }

    startRound() {
        this.state = 'COUNTDOWN';
        this.countdownTimer = 110;
        this.winner = null;

        const stage = window.stageManager.getStage();
        this.player1.reset(stage.bounds.left + 220, 440);
        this.player2.reset(stage.bounds.right - 220, 440);

        // Start Background Music automatically
        window.soundEngine.startBgm(window.stageManager.currentStageIndex);
    }

    loop(timestamp) {
        // Hit-stop effect (momentary freeze on crunchy hits)
        if (this.hitStopFrames > 0) {
            this.hitStopFrames--;
            this.draw();
            requestAnimationFrame((ts) => this.loop(ts));
            return;
        }

        this.update();
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }

    update() {
        window.stageManager.update();
        window.particles.update();

        if (this.state === 'COUNTDOWN') {
            this.countdownTimer--;
            if (this.countdownTimer <= 0) {
                this.state = 'PLAYING';
                window.soundEngine.playHit(1.5, true);
                window.particles.spawnShockwave(500, 300, 100, '#00e5ff');
            }
        } else if (this.state === 'PLAYING') {
            this._processContinuousInput();

            const stage = window.stageManager.getStage();
            const platforms = stage.platforms;

            // Update AI if active
            if (this.player2.isAI) {
                this.ai.update(this.player1, platforms, window.weaponManager.drops);
            }

            // Update players
            this.player1.update(platforms, this.player2, stage.bounds);
            this.player2.update(platforms, this.player1, stage.bounds);

            // Update weapons & check projectile hits
            window.weaponManager.update(platforms, stage.bounds);
            this._checkProjectileCollisions();

            // Check Round Over condition
            if (this.player1.isDead || this.player2.isDead) {
                this.state = 'ROUND_END';
                this.roundEndTimer = 140;
                this.hitStopFrames = 12; // slowmo crunch

                if (this.player1.isDead && !this.player2.isDead) {
                    this.winner = this.player2;
                    this.player2.roundsWon++;
                } else if (this.player2.isDead && !this.player1.isDead) {
                    this.winner = this.player1;
                    this.player1.roundsWon++;
                    this.survivalScore += 1000 * this.survivalWave;
                }
            }
        } else if (this.state === 'ROUND_END') {
            const stage = window.stageManager.getStage();
            this.player1.update(stage.platforms, this.player2, stage.bounds);
            this.player2.update(stage.platforms, this.player1, stage.bounds);
            window.weaponManager.update(stage.platforms, stage.bounds);

            this.roundEndTimer--;
            if (this.roundEndTimer <= 0) {
                if (this.gameMode === 'survival') {
                    if (this.player1.isDead) {
                        this.state = 'MATCH_END';
                    } else {
                        // Next wave!
                        this.survivalWave++;
                        this.player2.name = `CYBER BOT #${this.survivalWave}`;
                        this.player2.maxHealth = Math.min(220, 100 + this.survivalWave * 20);
                        this.startRound();
                    }
                } else {
                    if (this.player1.roundsWon >= this.roundsToWin || this.player2.roundsWon >= this.roundsToWin) {
                        this.state = 'MATCH_END';
                    } else {
                        this.currentRound++;
                        this.startRound();
                    }
                }
            }
        }

        this._updateCamera();
        this._updateHUD();
    }

    _checkProjectileCollisions() {
        for (const proj of window.weaponManager.projectiles) {
            if (proj.isDead) continue;

            const targets = [this.player1, this.player2];
            for (const target of targets) {
                if (proj.owner === target || target.isDead) continue;

                const dist = Math.hypot(proj.x - target.x, proj.y - (target.y - 25));
                if (dist < target.width + proj.radius) {
                    proj.explode();
                    const kbX = Math.sign(proj.vx) * proj.config.knockback;
                    const kbY = -4;
                    target.takeDamage(proj.config.damage, kbX, kbY, proj.owner, proj.config.isExplosive);
                    break;
                }
            }
        }
    }

    _updateCamera() {
        // Track midpoint between fighters
        const midX = (this.player1.x + this.player2.x) / 2;
        const midY = (this.player1.y + this.player2.y) / 2;
        const dist = Math.hypot(this.player1.x - this.player2.x, this.player1.y - this.player2.y);

        this.camera.targetX = midX;
        this.camera.targetY = Math.min(360, Math.max(240, midY));

        // Dynamic Zoom: zoom closer during tight combat, zoom out when fighters spread
        const targetZoom = Math.max(0.78, Math.min(1.22, 1000 / (dist + 420)));
        this.camera.targetZoom = targetZoom;

        // Smooth camera lerp
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.08;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.08;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.05;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Screen Shake
        const shake = window.particles.getShakeOffset();

        this.ctx.save();

        // Center on screen and apply camera transform
        this.ctx.translate(this.canvas.width / 2 + shake.x, this.canvas.height / 2 + shake.y);
        this.ctx.rotate(shake.angle);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // 1. Draw Arena & Platforms
        window.stageManager.draw(this.ctx, this.baseWidth, this.baseHeight);

        // 2. Draw Weapon Drops & Projectiles
        window.weaponManager.draw(this.ctx);

        // 3. Draw Players
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);

        // 4. Draw Particles & Damage Numbers
        window.particles.draw(this.ctx);

        this.ctx.restore();

        // 5. Draw Screen Overlays (Countdown, Announcer, Victory)
        this._drawOverlays();
    }

    _drawOverlays() {
        this.ctx.save();
        this.ctx.textAlign = 'center';

        if (this.state === 'COUNTDOWN') {
            const count = Math.ceil(this.countdownTimer / 35);
            this.ctx.font = '900 68px "Impact", "Segoe UI", sans-serif';
            this.ctx.fillStyle = count === 1 ? '#ffea00' : '#00e5ff';
            this.ctx.shadowColor = this.ctx.fillStyle;
            this.ctx.shadowBlur = 25;
            this.ctx.fillText(count === 1 ? 'READY ?' : (count === 2 ? 'ROUND ' + this.currentRound : 'PREPARE'), this.canvas.width / 2, this.canvas.height / 2);
        } else if (this.state === 'ROUND_END' || this.state === 'MATCH_END') {
            this.ctx.font = '900 76px "Impact", "Segoe UI", sans-serif';
            this.ctx.fillStyle = '#ff1744';
            this.ctx.shadowColor = '#ff0055';
            this.ctx.shadowBlur = 30;
            this.ctx.fillText('K. O. !', this.canvas.width / 2, this.canvas.height / 2 - 20);

            if (this.winner) {
                this.ctx.font = 'bold 32px "Segoe UI", sans-serif';
                this.ctx.fillStyle = this.winner.color;
                this.ctx.shadowColor = this.winner.color;
                this.ctx.shadowBlur = 15;
                this.ctx.fillText(`${this.winner.name} WINS!`, this.canvas.width / 2, this.canvas.height / 2 + 45);
            }
        }

        this.ctx.restore();
    }

    _updateHUD() {
        // Player 1
        const p1HealthBar = document.getElementById('p1-health');
        const p1HealthGhost = document.getElementById('p1-health-ghost');
        const p1EnergyBar = document.getElementById('p1-energy');
        const p1Name = document.getElementById('p1-name');
        const p1Rounds = document.getElementById('p1-rounds');

        if (p1HealthBar) p1HealthBar.style.width = `${(this.player1.health / this.player1.maxHealth) * 100}%`;
        if (p1HealthGhost) p1HealthGhost.style.width = `${(this.player1.displayHealth / this.player1.maxHealth) * 100}%`;
        if (p1EnergyBar) p1EnergyBar.style.width = `${(this.player1.energy / this.player1.maxEnergy) * 100}%`;
        if (p1Name) p1Name.textContent = this.player1.name;
        if (p1Rounds) p1Rounds.textContent = '★'.repeat(this.player1.roundsWon);

        // Player 2
        const p2HealthBar = document.getElementById('p2-health');
        const p2HealthGhost = document.getElementById('p2-health-ghost');
        const p2EnergyBar = document.getElementById('p2-energy');
        const p2Name = document.getElementById('p2-name');
        const p2Rounds = document.getElementById('p2-rounds');

        if (p2HealthBar) p2HealthBar.style.width = `${(this.player2.health / this.player2.maxHealth) * 100}%`;
        if (p2HealthGhost) p2HealthGhost.style.width = `${(this.player2.displayHealth / this.player2.maxHealth) * 100}%`;
        if (p2EnergyBar) p2EnergyBar.style.width = `${(this.player2.energy / this.player2.maxEnergy) * 100}%`;
        if (p2Name) p2Name.textContent = this.player2.name;
        if (p2Rounds) p2Rounds.textContent = '★'.repeat(this.player2.roundsWon);

        // Audio visualizer bars in HUD
        if (window.soundEngine && window.soundEngine.analyser) {
            window.soundEngine.analyser.getByteFrequencyData(this.analyserData);
            const vizBars = document.querySelectorAll('.viz-bar');
            for (let i = 0; i < vizBars.length; i++) {
                const val = this.analyserData[i * 2] || 0;
                vizBars[i].style.height = `${Math.max(4, (val / 255) * 28)}px`;
            }
        }
    }

    _bindUI() {
        // Mode buttons
        const btnPve = document.getElementById('btn-pve');
        const btnPvp = document.getElementById('btn-pvp');
        const btnSurvival = document.getElementById('btn-survival');
        const stageSelect = document.getElementById('stage-select');
        const diffSelect = document.getElementById('diff-select');
        const btnRestart = document.getElementById('btn-restart');
        const btnAudioToggle = document.getElementById('btn-audio-toggle');
        const sfxVol = document.getElementById('sfx-vol');
        const bgmVol = document.getElementById('bgm-vol');
        const trackSelect = document.getElementById('track-select');

        if (btnPve) {
            btnPve.addEventListener('click', () => {
                window.soundEngine.playMenuClick();
                this.startMatch('pve', parseInt(stageSelect.value), diffSelect.value);
            });
        }
        if (btnPvp) {
            btnPvp.addEventListener('click', () => {
                window.soundEngine.playMenuClick();
                this.startMatch('pvp', parseInt(stageSelect.value), diffSelect.value);
            });
        }
        if (btnSurvival) {
            btnSurvival.addEventListener('click', () => {
                window.soundEngine.playMenuClick();
                this.startMatch('survival', parseInt(stageSelect.value), 'normal');
            });
        }
        if (btnRestart) {
            btnRestart.addEventListener('click', () => {
                window.soundEngine.playMenuClick();
                this.startMatch(this.gameMode, parseInt(stageSelect.value), diffSelect.value);
            });
        }
        if (btnAudioToggle) {
            btnAudioToggle.addEventListener('click', () => {
                const isMuted = window.soundEngine.toggleMute();
                btnAudioToggle.textContent = isMuted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
            });
        }
        if (sfxVol) {
            sfxVol.addEventListener('input', (e) => {
                window.soundEngine.setSfxVolume(parseFloat(e.target.value));
            });
        }
        if (bgmVol) {
            bgmVol.addEventListener('input', (e) => {
                window.soundEngine.setBgmVolume(parseFloat(e.target.value));
            });
        }
        if (trackSelect) {
            trackSelect.addEventListener('change', (e) => {
                window.soundEngine.setTrack(parseInt(e.target.value));
            });
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new GameEngine();
    window.gameEngine.init();
    // Default auto-start in PVE mode
    window.gameEngine.startMatch('pve', 0, 'normal');
});
