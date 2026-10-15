/**
 * Dynamic Stickman Fighter Entity & Skeletal Animation Engine
 * Features responsive physics, multi-hit combos, weapons, acrobatic moves,
 * ragdoll defeat, and complete sound effect trigger integration.
 */

class Stickman {
    constructor(id, name, color, startX, startY, isAI = false) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.glowColor = color;
        this.isAI = isAI;

        // Position & Physics
        this.x = startX;
        this.y = startY;
        this.spawnX = startX;
        this.spawnY = startY;
        this.vx = 0;
        this.vy = 0;
        this.facing = startX < 500 ? 1 : -1; // 1 = right, -1 = left
        this.targetFacing = this.facing;
        this.height = 76;
        this.width = 30;

        // Stats
        this.maxHealth = 100;
        this.health = 100;
        this.displayHealth = 100;
        this.maxEnergy = 100;
        this.energy = 0;
        this.score = 0;
        this.roundsWon = 0;

        // Locomotion & State
        this.isGrounded = false;
        this.wasGrounded = false;
        this.jumpCount = 0;
        this.maxJumps = 2;
        this.isSliding = false;
        this.slideTimer = 0;
        this.maxSlideTime = 28;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.isBlocking = false;
        this.footstepTimer = 0;

        // Combat & Attacks
        this.isAttacking = false;
        this.attackType = null; // 'jab', 'cross', 'uppercut', 'kick', 'slide_kick', 'air_kick', 'weapon', 'super'
        this.attackFrame = 0;
        this.attackDuration = 0;
        this.hasHitChecked = false;
        this.comboIndex = 0;
        this.comboTimer = 0;
        this.attackCooldown = 0;

        // Damage & Reaction
        this.isHurt = false;
        this.hurtTimer = 0;
        this.invulnerableTimer = 0;
        this.isDead = false;

        // Weapon
        this.weapon = null; // object or null

        // Visual Skeletal Poses & Interpolation
        this.animTime = 0;
        this.limbs = {
            headY: -55,
            neckY: -42,
            chestY: -28,
            hipY: 0,
            leftShoulder: { x: -6, y: -40 },
            rightShoulder: { x: 6, y: -40 },
            leftElbow: { x: -14, y: -26 },
            rightElbow: { x: 14, y: -26 },
            leftHand: { x: -16, y: -12 },
            rightHand: { x: 16, y: -12 },
            leftHip: { x: -5, y: 0 },
            rightHip: { x: 5, y: 0 },
            leftKnee: { x: -8, y: 22 },
            rightKnee: { x: 8, y: 22 },
            leftFoot: { x: -10, y: 44 },
            rightFoot: { x: 10, y: 44 }
        };

        // Ragdoll joints on KO
        this.ragdollJoints = null;
        this.headbandWave = 0;
    }

    reset(x, y) {
        this.x = x || this.spawnX;
        this.y = y || this.spawnY;
        this.vx = 0;
        this.vy = 0;
        this.facing = this.x < 500 ? 1 : -1;
        this.health = this.maxHealth;
        this.displayHealth = this.maxHealth;
        this.energy = 0;
        this.isDead = false;
        this.isHurt = false;
        this.isAttacking = false;
        this.isSliding = false;
        this.isDashing = false;
        this.isBlocking = false;
        this.weapon = null;
        this.ragdollJoints = null;
        window.soundEngine.stopSlide(this.id);
    }

    // ==========================================
    // ACTION CONTROLS & SOUND HOOKS
    // ==========================================

    move(dir) {
        if (this.isDead || this.isHurt || this.isSliding) return;
        if (dir !== 0) {
            this.targetFacing = dir > 0 ? 1 : -1;
            this.facing = this.targetFacing;
        }

        const moveSpeed = this.isBlocking ? 1.5 : (this.weapon ? 4.8 : 5.8);
        this.vx = dir * moveSpeed;

        // Footstep sounds when running on ground
        if (this.isGrounded && dir !== 0) {
            this.footstepTimer++;
            if (this.footstepTimer >= 14) {
                this.footstepTimer = 0;
                window.soundEngine.playFootstep();
                window.particles.spawnDust(this.x, this.y + 44, 2, 1);
            }
        }
    }

    jump() {
        if (this.isDead || this.isHurt) return;

        if (this.isGrounded) {
            this.vy = -13.5;
            this.isGrounded = false;
            this.jumpCount = 1;

            // SOUND EFFECT: JUMP
            window.soundEngine.playJump();
            window.particles.spawnDust(this.x, this.y + 44, 8, 3);
        } else if (this.jumpCount < this.maxJumps) {
            // Double jump somersault
            this.vy = -12.0;
            this.jumpCount = 2;

            // SOUND EFFECT: DOUBLE JUMP
            window.soundEngine.playDoubleJump();
            window.particles.spawnDust(this.x, this.y, 6, 2, this.color);
            window.particles.spawnShockwave(this.x, this.y + 10, 25, this.color);
        }
    }

    slide() {
        if (this.isDead || this.isHurt || this.isSliding || !this.isGrounded) return;

        this.isSliding = true;
        this.slideTimer = this.maxSlideTime;
        const slidePower = 11.5;
        this.vx = this.facing * slidePower;

        // SOUND EFFECT: SLIDE (continuous looping friction sound)
        window.soundEngine.startSlide(this.id);
        window.particles.spawnSlideFriction(this.x, this.y + 44, this.facing);
    }

    dash() {
        if (this.isDead || this.isHurt || this.isDashing || this.dashCooldown > 0) return;

        this.isDashing = true;
        this.dashTimer = 12;
        this.dashCooldown = 35;
        this.vx = this.facing * 15.0;
        this.vy = 0;

        // SOUND EFFECT: DASH
        window.soundEngine.playDash();
        window.particles.spawnShockwave(this.x, this.y, 35, this.color);
        window.particles.spawnDust(this.x, this.y + 20, 8, 4);
    }

    block(isPressed) {
        if (this.isDead || this.isHurt || this.isSliding) {
            this.isBlocking = false;
            return;
        }
        this.isBlocking = isPressed;
    }

    // ==========================================
    // ATTACK SYSTEM & SOUND TRIGGERS
    // ==========================================

    attack() {
        if (this.isDead || this.isHurt || this.attackCooldown > 0) return;

        // If sliding -> Slide Sweep Kick!
        if (this.isSliding) {
            this._startAttack('slide_kick', 20);
            return;
        }

        // If in air and pressing down -> Aerial Dive Kick
        if (!this.isGrounded && this.vy > 0) {
            this._startAttack('air_kick', 24);
            this.vy = 14;
            this.vx = this.facing * 9;
            return;
        }

        // Weapon Attack
        if (this.weapon) {
            this._attackWithWeapon();
            return;
        }

        // Unarmed 3-Hit Combo: Jab -> Cross -> Launching Uppercut
        if (this.comboTimer > 0) {
            this.comboIndex = (this.comboIndex + 1) % 3;
        } else {
            this.comboIndex = 0;
        }

        const attackMoves = ['jab', 'cross', 'uppercut'];
        const selected = attackMoves[this.comboIndex];
        const durations = [14, 18, 26];

        this._startAttack(selected, durations[this.comboIndex]);
        this.comboTimer = 35; // combo window
    }

    kick() {
        if (this.isDead || this.isHurt || this.attackCooldown > 0) return;
        this._startAttack('kick', 22);
    }

    superAttack() {
        if (this.isDead || this.isHurt || this.energy < this.maxEnergy) return;

        this.energy = 0;
        this._startAttack('super', 50);

        // SOUND EFFECT: SUPER CHARGE + BLAST
        window.soundEngine.playSuperCharge();
        window.particles.addShake(0.8);
        window.particles.spawnShockwave(this.x, this.y, 80, this.color);
    }

    pickupOrThrowWeapon() {
        if (this.isDead || this.isHurt) return;

        if (this.weapon) {
            // Throw current weapon
            const throwVx = this.facing * 16;
            const throwVy = -4;
            window.weaponManager.drops.push(new WeaponDrop(
                Object.keys(WEAPON_TYPES).find(k => WEAPON_TYPES[k].id === this.weapon.id) || 'KATANA',
                this.x + this.facing * 20,
                this.y - 15
            ));
            const lastDrop = window.weaponManager.drops[window.weaponManager.drops.length - 1];
            lastDrop.vx = throwVx;
            lastDrop.vy = throwVy;
            lastDrop.ammo = this.weapon.ammo;

            this.weapon = null;
            window.soundEngine.playPunchWhoosh(1.4);
            return;
        }

        // Try picking up nearest weapon
        for (let i = 0; i < window.weaponManager.drops.length; i++) {
            const drop = window.weaponManager.drops[i];
            const dist = Math.hypot(this.x - drop.x, this.y - drop.y);
            if (dist < 45) {
                this.weapon = { ...drop.config, ammo: drop.ammo };
                window.weaponManager.drops.splice(i, 1);
                window.soundEngine.playWeaponPickup();
                window.particles.spawnShockwave(this.x, this.y, 30, drop.config.color);
                window.particles.spawnFloatingText(this.x, this.y - 40, drop.config.name, drop.config.color);
                break;
            }
        }
    }

    _startAttack(type, duration) {
        this.isAttacking = true;
        this.attackType = type;
        this.attackFrame = 0;
        this.attackDuration = duration;
        this.hasHitChecked = false;

        // SOUND EFFECT: ATTACK SOUND TRIGGER
        if (type === 'jab') {
            window.soundEngine.playPunchWhoosh(1.2);
            this.vx = this.facing * 2.5;
        } else if (type === 'cross') {
            window.soundEngine.playPunchWhoosh(0.95);
            this.vx = this.facing * 4.0;
        } else if (type === 'uppercut') {
            window.soundEngine.playUppercut();
            this.vx = this.facing * 3.0;
            this.vy = -6.0; // slight lift
        } else if (type === 'kick') {
            window.soundEngine.playPunchWhoosh(0.85);
            this.vx = this.facing * 3.5;
        } else if (type === 'slide_kick') {
            window.soundEngine.playPunchWhoosh(1.1);
        } else if (type === 'air_kick') {
            window.soundEngine.playPunchWhoosh(1.3);
        }
    }

    _attackWithWeapon() {
        if (!this.weapon) return;

        if (this.weapon.type === 'melee') {
            this._startAttack('weapon', this.weapon.attackCooldown);
            window.soundEngine.playSwordSlash();
        } else if (this.weapon.type === 'ranged') {
            if (this.weapon.ammo <= 0) {
                this.pickupOrThrowWeapon();
                return;
            }
            this.weapon.ammo--;
            this._startAttack('weapon', this.weapon.fireRate);

            // Fire projectile
            const muzzleX = this.x + this.facing * 28;
            const muzzleY = this.y - 25;
            window.weaponManager.fireProjectile(muzzleX, muzzleY, this.facing, 0, this.weapon, this);

            // Recoil
            this.vx = -this.facing * 4;
            window.soundEngine.playGunshot();
            window.particles.spawnHitSparks(muzzleX, muzzleY, this.weapon.color, 6);

            if (this.weapon.ammo <= 0) {
                setTimeout(() => { this.weapon = null; }, 300);
            }
        }
    }

    // ==========================================
    // HIT & DAMAGE CONSUMING SYSTEM
    // ==========================================

    takeDamage(damage, knockbackX, knockbackY, attacker, isHeavy = false) {
        if (this.isDead || this.invulnerableTimer > 0) return;

        // Blocking: Reduce damage significantly, play spark & deflection sound!
        if (this.isBlocking && Math.sign(knockbackX) !== this.facing) {
            damage *= 0.2;
            knockbackX *= 0.3;
            knockbackY = 0;
            window.soundEngine.playBlock();
            window.particles.spawnHitSparks(this.x + this.facing * 15, this.y - 20, '#00e5ff', 12);
            window.particles.spawnFloatingText(this.x, this.y - 30, 'BLOCKED!', '#00e5ff');
            this.vx = knockbackX;
            return;
        }

        // SOUND EFFECT: DAMAGE CONSUMING / HIT / HURT
        if (isHeavy) {
            window.soundEngine.playHeavyHit();
            window.soundEngine.playDamageHurt(true);
            window.particles.addShake(0.6);
        } else {
            window.soundEngine.playHit(1.0, false);
            window.soundEngine.playDamageHurt(false);
            window.particles.addShake(0.25);
        }

        this.health = Math.max(0, this.health - damage);
        this.isHurt = true;
        this.hurtTimer = isHeavy ? 18 : 10;
        this.isAttacking = false;
        this.isSliding = false;
        window.soundEngine.stopSlide(this.id);

        // Apply knockback
        this.vx = knockbackX;
        this.vy = knockbackY;

        // Build Super Energy for both dealing & taking damage
        if (attacker) {
            attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + damage * 0.8);
        }
        this.energy = Math.min(this.maxEnergy, this.energy + damage * 0.4);

        // Particle FX
        window.particles.spawnHitSparks(this.x, this.y - 25, isHeavy ? '#ffea00' : '#ffffff', isHeavy ? 16 : 8, isHeavy);
        window.particles.spawnBlood(this.x, this.y - 25, Math.sign(knockbackX), isHeavy ? 18 : 8);
        window.particles.spawnFloatingText(this.x, this.y - 40, `-${Math.round(damage)}`, isHeavy ? '#ff0055' : '#ffffff', isHeavy);

        // Check KO
        if (this.health <= 0) {
            this.die(knockbackX, knockbackY);
        }
    }

    die(knockbackX = 0, knockbackY = -8) {
        this.isDead = true;
        this.health = 0;
        window.soundEngine.stopSlide(this.id);
        window.soundEngine.playSlowMoSound();
        window.soundEngine.playKoAnnounce();
        window.particles.addShake(1.0);
        window.particles.spawnShockwave(this.x, this.y, 110, this.color);

        // Initialize ragdoll physics joints for dramatic stickman tumbling!
        this.ragdollJoints = {
            head: { x: this.x, y: this.y - 55, vx: knockbackX * 1.2, vy: knockbackY - 2, angle: 0, va: 0.2 },
            chest: { x: this.x, y: this.y - 28, vx: knockbackX, vy: knockbackY, angle: 0, va: 0.1 },
            hip: { x: this.x, y: this.y, vx: knockbackX * 0.9, vy: knockbackY, angle: 0, va: -0.1 },
            leftArm: { x: this.x - 12, y: this.y - 25, vx: knockbackX * 1.1 + Math.random() * 2, vy: knockbackY - 3 },
            rightArm: { x: this.x + 12, y: this.y - 25, vx: knockbackX * 1.1 - Math.random() * 2, vy: knockbackY - 3 },
            leftLeg: { x: this.x - 10, y: this.y + 30, vx: knockbackX * 0.8, vy: knockbackY + 1 },
            rightLeg: { x: this.x + 10, y: this.y + 30, vx: knockbackX * 0.8, vy: knockbackY + 1 }
        };
    }

    // ==========================================
    // UPDATE CYCLE
    // ==========================================

    update(platforms, opponent, stageBounds) {
        this.animTime += 0.2;
        this.headbandWave += 0.15;

        // Health bar catchup animation
        if (this.displayHealth > this.health) {
            this.displayHealth = Math.max(this.health, this.displayHealth - 0.7);
        }

        // Ragdoll update on defeat
        if (this.isDead && this.ragdollJoints) {
            this._updateRagdoll(platforms);
            return;
        }

        // Cool downs & Timers
        if (this.hurtTimer > 0) {
            this.hurtTimer--;
            if (this.hurtTimer === 0) this.isHurt = false;
        }

        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.comboTimer > 0) this.comboTimer--;
        if (this.attackCooldown > 0) this.attackCooldown--;

        // Slide State
        if (this.isSliding) {
            this.slideTimer--;
            window.particles.spawnSlideFriction(this.x, this.y + 44, this.facing);
            if (this.slideTimer <= 0 || Math.abs(this.vx) < 1.0 || !this.isGrounded) {
                this.isSliding = false;
                window.soundEngine.stopSlide(this.id);
            }
        }

        // Dash State
        if (this.isDashing) {
            this.dashTimer--;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
        }

        // Physics: Gravity & Friction
        const gravity = this.isDashing ? 0 : 0.65;
        this.vy += gravity;

        if (this.isGrounded) {
            const friction = this.isSliding ? 0.96 : (this.isAttacking ? 0.82 : 0.75);
            this.vx *= friction;
        } else {
            this.vx *= 0.94; // air drag
        }

        // Update attack execution & hit detection
        if (this.isAttacking) {
            this._updateAttack(opponent);
        }

        // Apply velocities
        this.x += this.vx;
        this.y += this.vy;

        // Platform collisions
        this.wasGrounded = this.isGrounded;
        this.isGrounded = false;

        const feetY = this.y + 44;
        for (const p of platforms) {
            if (this.x >= p.x - 15 && this.x <= p.x + p.w + 15 &&
                feetY >= p.y && feetY - this.vy <= p.y + 16 && this.vy >= 0) {
                this.y = p.y - 44;
                this.vy = 0;
                this.isGrounded = true;
                this.jumpCount = 0;

                // SOUND EFFECT: LANDING (if falling fast enough)
                if (!this.wasGrounded && this.vy >= 0) {
                    window.soundEngine.playLand();
                    window.particles.spawnDust(this.x, this.y + 44, 6, 2.5);
                }
                break;
            }
        }

        // Stage bounds (clamp sides)
        if (this.x < stageBounds.left + 20) {
            this.x = stageBounds.left + 20;
            this.vx = 0;
        } else if (this.x > stageBounds.right - 20) {
            this.x = stageBounds.right - 20;
            this.vx = 0;
        }

        // Pit fall death
        if (this.y > stageBounds.bottom + 50 && !this.isDead) {
            this.die(0, -10);
        }
    }

    _updateAttack(opponent) {
        this.attackFrame++;

        // Hit frame window check
        const activeHitFrame = Math.floor(this.attackDuration * 0.35);
        if (this.attackFrame >= activeHitFrame && !this.hasHitChecked && opponent && !opponent.isDead) {
            this.hasHitChecked = true;
            this._checkAttackHit(opponent);
        }

        if (this.attackFrame >= this.attackDuration) {
            this.isAttacking = false;
            this.attackType = null;
        }
    }

    _checkAttackHit(opponent) {
        const attackBox = this._getAttackBox();
        const opponentBox = {
            x: opponent.x - 18,
            y: opponent.y - 50,
            w: 36,
            h: 90
        };

        // Axis-Aligned Bounding Box (AABB) overlap
        const isHit = attackBox.x < opponentBox.x + opponentBox.w &&
                      attackBox.x + attackBox.w > opponentBox.x &&
                      attackBox.y < opponentBox.y + opponentBox.h &&
                      attackBox.y + attackBox.h > opponentBox.y;

        if (!isHit) return;

        // Calculate damage, knockback based on move
        let damage = 10;
        let kbX = this.facing * 8;
        let kbY = -4;
        let isHeavy = false;

        if (this.attackType === 'jab') {
            damage = 8;
            kbX = this.facing * 5;
            kbY = -2;
        } else if (this.attackType === 'cross') {
            damage = 14;
            kbX = this.facing * 10;
            kbY = -3;
        } else if (this.attackType === 'uppercut') {
            damage = 22;
            kbX = this.facing * 6;
            kbY = -14; // Launcher!
            isHeavy = true;
        } else if (this.attackType === 'kick') {
            damage = 16;
            kbX = this.facing * 12;
            kbY = -4;
            isHeavy = true;
        } else if (this.attackType === 'slide_kick') {
            damage = 15;
            kbX = this.facing * 9;
            kbY = -8; // trips opponent into air
        } else if (this.attackType === 'air_kick') {
            damage = 18;
            kbX = this.facing * 11;
            kbY = 10; // spikes down
            isHeavy = true;
        } else if (this.attackType === 'weapon' && this.weapon) {
            damage = this.weapon.damage;
            kbX = this.facing * this.weapon.knockback;
            kbY = -5;
            isHeavy = true;
            if (this.weapon.durability) {
                this.weapon.durability--;
                if (this.weapon.durability <= 0) {
                    this.weapon = null;
                }
            }
        } else if (this.attackType === 'super') {
            damage = 45;
            kbX = this.facing * 22;
            kbY = -9;
            isHeavy = true;
            window.soundEngine.playSuperBeam();
        }

        opponent.takeDamage(damage, kbX, kbY, this, isHeavy);
    }

    _getAttackBox() {
        const reach = (this.weapon && this.weapon.range) ? this.weapon.range : 45;
        const boxX = this.facing > 0 ? this.x : this.x - reach;
        let boxY = this.y - 45;
        let boxH = 40;

        if (this.attackType === 'slide_kick') {
            boxY = this.y + 10;
            boxH = 34;
        } else if (this.attackType === 'air_kick') {
            boxY = this.y;
            boxH = 45;
        } else if (this.attackType === 'super') {
            return {
                x: this.facing > 0 ? this.x : this.x - 700,
                y: this.y - 60,
                w: 700,
                h: 80
            };
        }

        return {
            x: boxX,
            y: boxY,
            w: reach,
            h: boxH
        };
    }

    _updateRagdoll(platforms) {
        const r = this.ragdollJoints;
        if (!r) return;

        ['head', 'chest', 'hip', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'].forEach(k => {
            const joint = r[k];
            joint.vy = (joint.vy || 0) + 0.6;
            joint.vx = (joint.vx || 0) * 0.95;
            joint.x += joint.vx;
            joint.y += joint.vy;
            if (joint.angle !== undefined) joint.angle += joint.va || 0;

            // Bounce on ground
            for (const p of platforms) {
                if (joint.x >= p.x && joint.x <= p.x + p.w &&
                    joint.y >= p.y - 5 && joint.y <= p.y + 15 && joint.vy > 0) {
                    joint.y = p.y;
                    joint.vy = -joint.vy * 0.45;
                    joint.vx *= 0.7;
                    if (joint.va) joint.va *= 0.5;
                }
            }
        });
    }

    // ==========================================
    // SKELETAL DRAWING & ANIMATION
    // ==========================================

    draw(ctx) {
        ctx.save();

        if (this.isDead && this.ragdollJoints) {
            this._drawRagdoll(ctx);
            ctx.restore();
            return;
        }

        // Invulnerability flicker
        if (this.hurtTimer > 0 && Math.floor(this.animTime * 10) % 2 === 0) {
            ctx.restore();
            return;
        }

        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1);

        // Super aura glow if full meter
        if (this.energy >= this.maxEnergy) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15 + Math.sin(this.animTime * 3) * 6;
        }

        // Stick stroke styling
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;

        // Afterimages on dash
        if (this.isDashing) {
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // Compute Skeletal Joint Positions based on State
        const skeleton = this._calculatePose();

        // 1. Draw Torso Spine
        ctx.beginPath();
        ctx.moveTo(skeleton.hip.x, skeleton.hip.y);
        ctx.lineTo(skeleton.chest.x, skeleton.chest.y);
        ctx.lineTo(skeleton.neck.x, skeleton.neck.y);
        ctx.stroke();

        // 2. Draw Legs
        // Back leg
        ctx.strokeStyle = this._darkenColor(this.color, 0.75);
        ctx.beginPath();
        ctx.moveTo(skeleton.hip.x, skeleton.hip.y);
        ctx.lineTo(skeleton.backKnee.x, skeleton.backKnee.y);
        ctx.lineTo(skeleton.backFoot.x, skeleton.backFoot.y);
        ctx.stroke();

        // Front leg
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(skeleton.hip.x, skeleton.hip.y);
        ctx.lineTo(skeleton.frontKnee.x, skeleton.frontKnee.y);
        ctx.lineTo(skeleton.frontFoot.x, skeleton.frontFoot.y);
        ctx.stroke();

        // 3. Draw Arms
        // Back Arm
        ctx.strokeStyle = this._darkenColor(this.color, 0.75);
        ctx.beginPath();
        ctx.moveTo(skeleton.chest.x, skeleton.chest.y);
        ctx.lineTo(skeleton.backElbow.x, skeleton.backElbow.y);
        ctx.lineTo(skeleton.backHand.x, skeleton.backHand.y);
        ctx.stroke();

        // Front Arm
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(skeleton.chest.x, skeleton.chest.y);
        ctx.lineTo(skeleton.frontElbow.x, skeleton.frontElbow.y);
        ctx.lineTo(skeleton.frontHand.x, skeleton.frontHand.y);
        ctx.stroke();

        // 4. Draw Weapon if equipped
        if (this.weapon) {
            this._drawEquippedWeapon(ctx, skeleton.frontHand);
        }

        // 5. Draw Head & Headband
        ctx.fillStyle = '#0f172a'; // solid dark head fill
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.arc(skeleton.head.x, skeleton.head.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye (Glares in facing direction)
        ctx.fillStyle = this.energy >= this.maxEnergy ? '#ffea00' : '#ffffff';
        const eyeX = skeleton.head.x + 5;
        const eyeY = skeleton.head.y - 2;
        if (this.isHurt) {
            // Wincing X eye
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(eyeX - 3, eyeY - 3); ctx.lineTo(eyeX + 3, eyeY + 3);
            ctx.moveTo(eyeX + 3, eyeY - 3); ctx.lineTo(eyeX - 3, eyeY + 3);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ninja Headband flowing in wind
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const hbX = skeleton.head.x - 12;
        const hbY = skeleton.head.y - 4;
        ctx.moveTo(hbX, hbY);
        const wave = Math.sin(this.headbandWave) * 6;
        ctx.quadraticCurveTo(hbX - 16, hbY + wave, hbX - 26, hbY + wave * 1.5);
        ctx.stroke();

        // 6. Super Beam FX Render
        if (this.isAttacking && this.attackType === 'super') {
            this._drawSuperBeam(ctx, skeleton.frontHand);
        }

        ctx.restore();
    }

    _calculatePose() {
        const p = {
            head: { x: 0, y: -54 },
            neck: { x: 0, y: -40 },
            chest: { x: 0, y: -24 },
            hip: { x: 0, y: 0 },
            frontKnee: { x: 8, y: 22 },
            frontFoot: { x: 10, y: 44 },
            backKnee: { x: -8, y: 22 },
            backFoot: { x: -10, y: 44 },
            frontElbow: { x: 12, y: -18 },
            frontHand: { x: 18, y: -10 },
            backElbow: { x: -12, y: -18 },
            backHand: { x: -18, y: -10 }
        };

        // Hurt Pose
        if (this.isHurt) {
            p.chest.x = -8;
            p.head.x = -14;
            p.frontHand.y = -35;
            p.backHand.y = -35;
            return p;
        }

        // Blocking Pose
        if (this.isBlocking) {
            p.chest.x = -4;
            p.frontHand = { x: 14, y: -38 };
            p.backHand = { x: 10, y: -30 };
            p.frontKnee = { x: 12, y: 24 };
            p.backKnee = { x: -10, y: 24 };
            return p;
        }

        // Sliding Pose
        if (this.isSliding) {
            p.hip.y = 20;
            p.chest = { x: -22, y: 10 };
            p.neck = { x: -28, y: 0 };
            p.head = { x: -32, y: -12 };
            p.frontKnee = { x: 26, y: 35 };
            p.frontFoot = { x: 44, y: 44 }; // extended sweep kick
            p.backKnee = { x: -8, y: 36 };
            p.backFoot = { x: -26, y: 42 };
            p.frontHand = { x: 22, y: 22 };
            p.backHand = { x: -28, y: 28 };
            return p;
        }

        // Attack Poses
        if (this.isAttacking) {
            const progress = this.attackFrame / this.attackDuration;
            if (this.attackType === 'jab') {
                const punchReach = Math.sin(progress * Math.PI) * 36;
                p.frontElbow = { x: 16 + punchReach * 0.4, y: -26 };
                p.frontHand = { x: 18 + punchReach, y: -26 };
                return p;
            } else if (this.attackType === 'cross') {
                const punchReach = Math.sin(progress * Math.PI) * 44;
                p.chest.x = 8;
                p.backElbow = { x: 14 + punchReach * 0.3, y: -24 };
                p.backHand = { x: 16 + punchReach, y: -24 };
                return p;
            } else if (this.attackType === 'uppercut') {
                const lift = Math.sin(progress * Math.PI) * 45;
                p.chest.x = 6;
                p.frontElbow = { x: 18, y: -20 - lift * 0.4 };
                p.frontHand = { x: 16, y: -15 - lift };
                return p;
            } else if (this.attackType === 'kick') {
                const kickExt = Math.sin(progress * Math.PI) * 42;
                p.chest.x = -8;
                p.frontKnee = { x: 22 + kickExt * 0.4, y: 6 };
                p.frontFoot = { x: 24 + kickExt, y: -2 };
                return p;
            } else if (this.attackType === 'air_kick') {
                p.chest.x = 10;
                p.frontKnee = { x: 25, y: 22 };
                p.frontFoot = { x: 40, y: 42 };
                return p;
            }
        }

        // Jumping / Somersault
        if (!this.isGrounded) {
            p.frontKnee = { x: 14, y: 15 };
            p.frontFoot = { x: 8, y: 25 };
            p.backKnee = { x: -14, y: 15 };
            p.backFoot = { x: -8, y: 25 };
            p.frontHand = { x: 18, y: -38 };
            p.backHand = { x: -18, y: -38 };
            return p;
        }

        // Running cycle
        if (Math.abs(this.vx) > 0.5) {
            const runPhase = this.animTime * 1.8;
            const legSwing = Math.sin(runPhase) * 22;
            const armSwing = Math.cos(runPhase) * 24;

            p.chest.x = 6; // forward lean
            p.frontKnee = { x: 8 + legSwing * 0.5, y: 22 };
            p.frontFoot = { x: 10 + legSwing, y: 44 - Math.abs(Math.sin(runPhase)) * 8 };
            p.backKnee = { x: -8 - legSwing * 0.5, y: 22 };
            p.backFoot = { x: -10 - legSwing, y: 44 - Math.abs(Math.cos(runPhase)) * 8 };

            p.frontElbow = { x: 8 - armSwing * 0.4, y: -18 };
            p.frontHand = { x: 14 - armSwing, y: -10 };
            p.backElbow = { x: -8 + armSwing * 0.4, y: -18 };
            p.backHand = { x: -14 + armSwing, y: -10 };
            return p;
        }

        // Idle bounce
        const breath = Math.sin(this.animTime) * 2.5;
        p.chest.y += breath;
        p.neck.y += breath;
        p.head.y += breath;
        p.frontHand.y += breath * 0.6;
        p.backHand.y += breath * 0.6;
        return p;
    }

    _drawEquippedWeapon(ctx, handPos) {
        ctx.save();
        ctx.translate(handPos.x, handPos.y);

        ctx.strokeStyle = this.weapon.color;
        ctx.fillStyle = this.weapon.color;
        ctx.shadowColor = this.weapon.color;
        ctx.shadowBlur = 8;

        if (this.weapon.id === 'katana') {
            ctx.rotate(this.isAttacking ? 0.3 : -0.7);
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(-6, 2);
            ctx.lineTo(44, -12);
            ctx.stroke();
            // Katana slash trail if swinging
            if (this.isAttacking) {
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
                ctx.lineWidth = 12;
                ctx.beginPath();
                ctx.arc(0, 0, 42, -0.6, 0.4);
                ctx.stroke();
            }
        } else if (this.weapon.id === 'blaster') {
            ctx.fillRect(0, -5, 18, 8);
            ctx.fillRect(2, 3, 5, 7);
        } else if (this.weapon.id === 'staff') {
            ctx.rotate(this.isAttacking ? this.animTime * 15 : -0.3);
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-35, 0); ctx.lineTo(35, 0);
            ctx.stroke();
        } else if (this.weapon.id === 'rocket') {
            ctx.fillRect(-5, -7, 26, 12);
        }

        ctx.restore();
    }

    _drawSuperBeam(ctx, handPos) {
        ctx.save();
        ctx.translate(handPos.x, handPos.y);

        // Immense laser beam
        const beamW = 700;
        const beamH = 50 + Math.sin(this.animTime * 20) * 12;

        const grad = ctx.createLinearGradient(0, -beamH / 2, 0, beamH / 2);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.2, this.color);
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(0.8, this.color);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, -beamH / 2, beamW, beamH);

        // Core line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(beamW, 0);
        ctx.stroke();

        ctx.restore();
    }

    _drawRagdoll(ctx) {
        const r = this.ragdollJoints;
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = this.color;
        ctx.fillStyle = '#0f172a';

        // Head
        ctx.beginPath();
        ctx.arc(r.head.x, r.head.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Limbs & Spine
        ctx.beginPath();
        ctx.moveTo(r.head.x, r.head.y);
        ctx.lineTo(r.chest.x, r.chest.y);
        ctx.lineTo(r.hip.x, r.hip.y);
        ctx.moveTo(r.chest.x, r.chest.y);
        ctx.lineTo(r.leftArm.x, r.leftArm.y);
        ctx.moveTo(r.chest.x, r.chest.y);
        ctx.lineTo(r.rightArm.x, r.rightArm.y);
        ctx.moveTo(r.hip.x, r.hip.y);
        ctx.lineTo(r.leftLeg.x, r.leftLeg.y);
        ctx.moveTo(r.hip.x, r.hip.y);
        ctx.lineTo(r.rightLeg.x, r.rightLeg.y);
        ctx.stroke();
    }

    _darkenColor(hex, factor = 0.7) {
        if (!hex.startsWith('#')) return hex;
        let c = hex.substring(1);
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        const r = Math.floor(((num >> 16) & 255) * factor);
        const g = Math.floor(((num >> 8) & 255) * factor);
        const b = Math.floor((num & 255) * factor);
        return `rgb(${r},${g},${b})`;
    }
}

window.Stickman = Stickman;
