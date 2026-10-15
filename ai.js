/**
 * Dynamic Stickman Combat AI Engine
 * Provides reactive bot behaviors: spacing, combo execution, defensive blocking,
 * platform navigation, slide kicks, and weapon pickups across 4 difficulty tiers.
 */

class StickmanAI {
    constructor(stickman, difficulty = 'normal') {
        this.bot = stickman;
        this.difficulty = difficulty; // 'easy', 'normal', 'hard', 'demon'
        this.actionTimer = 0;
        this.decisionCooldown = 0;
        this.currentAction = 'idle';
        this.target = null;
    }

    setDifficulty(diff) {
        this.difficulty = diff;
    }

    update(target, platforms, weaponDrops) {
        if (!this.bot || this.bot.isDead || !target || target.isDead) return;
        this.target = target;

        // Difficulty modifiers
        const diffParams = {
            easy: { reactionFrames: 18, aggression: 0.45, blockChance: 0.15, comboSkill: 0.3 },
            normal: { reactionFrames: 10, aggression: 0.70, blockChance: 0.45, comboSkill: 0.6 },
            hard: { reactionFrames: 5, aggression: 0.88, blockChance: 0.75, comboSkill: 0.85 },
            demon: { reactionFrames: 2, aggression: 0.98, blockChance: 0.92, comboSkill: 0.98 }
        }[this.difficulty] || { reactionFrames: 10, aggression: 0.7, blockChance: 0.45, comboSkill: 0.6 };

        this.decisionCooldown--;
        if (this.decisionCooldown > 0) return;
        this.decisionCooldown = Math.floor(Math.random() * diffParams.reactionFrames) + 3;

        const dx = target.x - this.bot.x;
        const dy = target.y - this.bot.y;
        const dist = Math.hypot(dx, dy);
        const dir = Math.sign(dx);

        // Face the target
        this.bot.facing = dir !== 0 ? dir : this.bot.facing;

        // 1. Check if AI can use Super Move!
        if (this.bot.energy >= this.bot.maxEnergy && dist < 500 && Math.random() < 0.8) {
            this.bot.superAttack();
            return;
        }

        // 2. Reactive Defense: If player is actively attacking nearby, block or dash back!
        if (target.isAttacking && dist < 85 && Math.random() < diffParams.blockChance) {
            if (Math.random() < 0.65) {
                this.bot.block(true);
                setTimeout(() => { if (this.bot) this.bot.block(false); }, 350);
                return;
            } else {
                this.bot.facing = -dir;
                this.bot.dash();
                return;
            }
        } else {
            this.bot.block(false);
        }

        // 3. Weapon Pickup Desire
        if (!this.bot.weapon && weaponDrops && weaponDrops.length > 0 && Math.random() < 0.7) {
            // Find closest weapon
            let closest = null;
            let minDist = Infinity;
            for (const drop of weaponDrops) {
                const d = Math.hypot(drop.x - this.bot.x, drop.y - this.bot.y);
                if (d < minDist) {
                    minDist = d;
                    closest = drop;
                }
            }
            if (closest && minDist < 320) {
                const wDir = Math.sign(closest.x - this.bot.x);
                this.bot.move(wDir);
                if (minDist < 45) {
                    this.bot.pickupOrThrowWeapon();
                }
                if (closest.y < this.bot.y - 40 && this.bot.isGrounded) {
                    this.bot.jump();
                }
                return;
            }
        }

        // 4. Combat Range Actions
        if (dist < 65) {
            // In Melee Range!
            const roll = Math.random();
            if (roll < 0.45) {
                this.bot.attack(); // Combo punch
            } else if (roll < 0.70) {
                this.bot.kick(); // Heavy kick
            } else if (roll < 0.85 && this.bot.isGrounded) {
                this.bot.slide(); // Slide sweep kick!
            } else {
                // Short retreat / space
                this.bot.move(-dir);
            }
            return;
        }

        // 5. Mid-Range Tactics
        if (dist >= 65 && dist < 220) {
            // Approach target
            this.bot.move(dir);

            // Chance to slide kick into engagement
            if (dist < 140 && this.bot.isGrounded && Math.random() < 0.35) {
                this.bot.slide();
                setTimeout(() => { if (this.bot) this.bot.attack(); }, 120);
                return;
            }

            // Chance to dash forward
            if (dist > 110 && Math.random() < 0.25) {
                this.bot.dash();
                return;
            }

            // If opponent is above on a platform, jump!
            if (dy < -50 && this.bot.isGrounded && Math.random() < 0.6) {
                this.bot.jump();
            }

            // Weapon firing if equipped with ranged weapon
            if (this.bot.weapon && this.bot.weapon.type === 'ranged') {
                this.bot.attack();
            }
            return;
        }

        // 6. Long-Range Navigation
        if (dist >= 220) {
            this.bot.move(dir);

            // Jump over platform gaps or up to target level
            if (dy < -40 && this.bot.isGrounded && Math.random() < 0.5) {
                this.bot.jump();
            }
        }
    }
}

window.StickmanAI = StickmanAI;
