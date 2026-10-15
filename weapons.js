/**
 * Weapon Spawning, Projectiles, and Combat Pickup System
 */

const WEAPON_TYPES = {
    KATANA: {
        id: 'katana',
        name: 'Shadow Katana',
        color: '#00e5ff',
        type: 'melee',
        durability: 8,
        damage: 18,
        knockback: 12,
        range: 65,
        attackCooldown: 18,
        weight: 1.0
    },
    BLASTER: {
        id: 'blaster',
        name: 'Plasma Blaster',
        color: '#ff0055',
        type: 'ranged',
        ammo: 10,
        damage: 12,
        knockback: 8,
        fireRate: 15,
        projectileSpeed: 22,
        weight: 0.8
    },
    STAFF: {
        id: 'staff',
        name: 'Dragon Staff',
        color: '#ffd600',
        type: 'melee',
        durability: 10,
        damage: 15,
        knockback: 16,
        range: 75,
        attackCooldown: 22,
        weight: 1.2
    },
    ROCKET: {
        id: 'rocket',
        name: 'RPG Cannon',
        color: '#ff3d00',
        type: 'ranged',
        ammo: 3,
        damage: 35,
        knockback: 25,
        fireRate: 40,
        projectileSpeed: 14,
        isExplosive: true,
        weight: 1.5
    }
};

class WeaponDrop {
    constructor(typeKey, x, y) {
        this.config = WEAPON_TYPES[typeKey];
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = -4; // popped up
        this.angle = 0;
        this.vAngle = (Math.random() - 0.5) * 0.15;
        this.ammo = this.config.ammo || this.config.durability;
        this.isGrounded = false;
        this.glowPhase = 0;
        this.parachute = y < 100; // falling crate with parachute if spawned high
    }

    update(platforms, gravity = 0.5) {
        this.glowPhase += 0.08;

        if (this.parachute) {
            this.vy = Math.min(this.vy + 0.1, 2.0); // slow descent
            this.vx *= 0.98;
        } else {
            this.vy += gravity;
        }

        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.vAngle;

        // Platform collisions
        this.isGrounded = false;
        for (const p of platforms) {
            if (this.x >= p.x && this.x <= p.x + p.w &&
                this.y >= p.y - 10 && this.y - this.vy <= p.y + 10 && this.vy >= 0) {
                this.y = p.y;
                this.vy = 0;
                this.vx *= 0.8;
                this.vAngle *= 0.5;
                this.isGrounded = true;
                this.parachute = false;
                break;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Parachute visual if descending
        if (this.parachute) {
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, -35, 22, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Strings
            ctx.beginPath();
            ctx.moveTo(-20, -35); ctx.lineTo(0, -10);
            ctx.moveTo(20, -35); ctx.lineTo(0, -10);
            ctx.stroke();
        }

        ctx.rotate(this.angle);

        // Floating pulsing halo
        const pulse = Math.sin(this.glowPhase) * 4;
        ctx.shadowColor = this.config.color;
        ctx.shadowBlur = 10 + pulse;

        // Render weapon icon based on type
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.config.color;
        ctx.fillStyle = this.config.color;

        if (this.config.id === 'katana') {
            // Katana blade & hilt
            ctx.beginPath();
            ctx.moveTo(-16, 4);
            ctx.lineTo(20, -6);
            ctx.stroke();
            // Hilt
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-16, 4);
            ctx.lineTo(-24, 8);
            ctx.stroke();
        } else if (this.config.id === 'blaster') {
            // Gun body
            ctx.fillRect(-10, -5, 20, 8);
            ctx.fillRect(-6, 3, 6, 8); // grip
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(6, -3, 6, 4); // muzzle
        } else if (this.config.id === 'staff') {
            // Staff rod with glowing tips
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-26, 0);
            ctx.lineTo(26, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-26, 0, 4, 0, Math.PI * 2);
            ctx.arc(26, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.config.id === 'rocket') {
            // Launcher cylinder
            ctx.fillRect(-14, -6, 28, 12);
            ctx.fillStyle = '#ff9100';
            ctx.beginPath();
            ctx.moveTo(14, -8); ctx.lineTo(22, 0); ctx.lineTo(14, 8);
            ctx.fill();
        }

        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, vx, vy, config, owner) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.config = config;
        this.owner = owner;
        this.radius = config.isExplosive ? 6 : 4;
        this.isDead = false;
        this.lifeTime = 120;
    }

    update(platforms) {
        this.x += this.vx;
        this.y += this.vy;
        this.lifeTime--;

        if (this.lifeTime <= 0) {
            this.isDead = true;
            return;
        }

        // Check platform collision
        for (const p of platforms) {
            if (this.x >= p.x && this.x <= p.x + p.w &&
                this.y >= p.y && this.y <= p.y + p.h) {
                this.explode();
                break;
            }
        }
    }

    explode() {
        this.isDead = true;
        if (this.config.isExplosive) {
            window.soundEngine.playExplosion();
            window.particles.addShake(0.65);
            window.particles.spawnShockwave(this.x, this.y, 75, '#ff3d00');
            window.particles.spawnHitSparks(this.x, this.y, '#ff9100', 30, true);
        } else {
            window.particles.spawnHitSparks(this.x, this.y, this.config.color, 8, false);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.shadowColor = this.config.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.config.color;

        if (this.config.isExplosive) {
            // Rocket shell
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            // Exhaust flame
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            const angle = Math.atan2(this.vy, this.vx);
            ctx.arc(-Math.cos(angle) * 8, -Math.sin(angle) * 8, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Plasma beam bolt
            const angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            ctx.fillRect(-10, -2, 20, 4);
        }
        ctx.restore();
    }
}

class WeaponManager {
    constructor() {
        this.drops = [];
        this.projectiles = [];
        this.spawnTimer = 0;
        this.spawnInterval = 500; // spawn weapon every ~8-10 seconds
    }

    reset() {
        this.drops = [];
        this.projectiles = [];
        this.spawnTimer = 200; // spawn first weapon quickly
    }

    update(platforms, stageBounds) {
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnInterval && this.drops.length < 3) {
            this.spawnTimer = 0;
            const keys = Object.keys(WEAPON_TYPES);
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            const spawnX = stageBounds.left + 80 + Math.random() * (stageBounds.width - 160);
            this.drops.push(new WeaponDrop(randomKey, spawnX, 30));
        }

        // Update drops
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const drop = this.drops[i];
            drop.update(platforms);
            // Drop fallen off screen
            if (drop.y > stageBounds.bottom + 100) {
                this.drops.splice(i, 1);
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update(platforms);
            if (proj.isDead || proj.x < stageBounds.left - 200 || proj.x > stageBounds.right + 200) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    fireProjectile(x, y, dirX, dirY, config, owner) {
        const speed = config.projectileSpeed || 20;
        const vx = dirX * speed;
        const vy = dirY * speed;
        this.projectiles.push(new Projectile(x, y, vx, vy, config, owner));
    }

    draw(ctx) {
        for (const drop of this.drops) {
            drop.draw(ctx);
        }
        for (const proj of this.projectiles) {
            proj.draw(ctx);
        }
    }
}

window.weaponManager = new WeaponManager();
