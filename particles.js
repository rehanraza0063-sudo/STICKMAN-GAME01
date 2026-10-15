/**
 * Particle Effects & Combat Visual Feedback Engine
 * Handles hit sparks, blood splatters, dust clouds, shockwaves, damage numbers & screen shake
 */

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.screenShakeTrauma = 0;
        this.screenShakeDecay = 0.92;
        this.maxShakeOffset = 18;
    }

    addShake(amount = 0.5) {
        this.screenShakeTrauma = Math.min(1.0, this.screenShakeTrauma + amount);
    }

    getShakeOffset() {
        if (this.screenShakeTrauma <= 0.01) {
            this.screenShakeTrauma = 0;
            return { x: 0, y: 0, angle: 0 };
        }
        const shake = this.screenShakeTrauma * this.screenShakeTrauma; // quadratic shake feel
        const x = (Math.random() * 2 - 1) * this.maxShakeOffset * shake;
        const y = (Math.random() * 2 - 1) * this.maxShakeOffset * shake;
        const angle = (Math.random() * 2 - 1) * 0.04 * shake;
        this.screenShakeTrauma *= this.screenShakeDecay;
        return { x, y, angle };
    }

    // Hit sparks / impact bursts
    spawnHitSparks(x, y, color = '#ffea00', count = 14, isCrit = false) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (isCrit ? 6 : 3.5) + Math.random() * 6;
            this.particles.push({
                type: 'spark',
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: (isCrit ? 4 : 2.5) + Math.random() * 2.5,
                color,
                alpha: 1.0,
                decay: 0.03 + Math.random() * 0.04,
                gravity: 0.15
            });
        }

        // Add small impact shockwave
        this.spawnShockwave(x, y, isCrit ? 50 : 30, color);
    }

    // Stylized blood / combat splatters
    spawnBlood(x, y, dirX = 0, count = 16) {
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 1.5;
            const speed = 2 + Math.random() * 6;
            const vx = dirX * speed + spread * 3;
            const vy = -1 - Math.random() * 4;
            this.particles.push({
                type: 'blood',
                x,
                y,
                vx,
                vy,
                size: 2 + Math.random() * 3,
                color: '#ff1744',
                alpha: 0.9,
                decay: 0.02 + Math.random() * 0.03,
                gravity: 0.35
            });
        }
    }

    // Dust puffs for jumps, landings, foot running
    spawnDust(x, y, count = 6, vxSpread = 2, color = 'rgba(210, 215, 225, 0.7)') {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                type: 'dust',
                x: x + (Math.random() - 0.5) * 12,
                y: y + (Math.random() - 0.5) * 4,
                vx: (Math.random() - 0.5) * vxSpread,
                vy: -Math.random() * 1.5 - 0.5,
                size: 3 + Math.random() * 4,
                grow: 0.2,
                color,
                alpha: 0.7,
                decay: 0.04 + Math.random() * 0.03,
                gravity: -0.02 // floats slightly
            });
        }
    }

    // Sliding friction dust & hot sparks
    spawnSlideFriction(x, y, dirX) {
        // Friction sparks flying backwards
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                type: 'spark',
                x: x + (Math.random() - 0.5) * 10,
                y: y,
                vx: -dirX * (3 + Math.random() * 4),
                vy: -Math.random() * 3 - 0.5,
                size: 2 + Math.random() * 2,
                color: Math.random() > 0.5 ? '#ff9100' : '#ffea00',
                alpha: 1.0,
                decay: 0.06,
                gravity: 0.2
            });
        }
        // Dust cloud trailing
        this.particles.push({
            type: 'dust',
            x: x - dirX * 10,
            y: y,
            vx: -dirX * (1 + Math.random() * 2),
            vy: -Math.random() * 1.2,
            size: 4 + Math.random() * 4,
            grow: 0.25,
            color: 'rgba(200, 200, 215, 0.6)',
            alpha: 0.6,
            decay: 0.05,
            gravity: -0.01
        });
    }

    // Expanding shockwave ring
    spawnShockwave(x, y, maxRadius = 45, color = '#ffffff') {
        this.shockwaves.push({
            x,
            y,
            radius: 5,
            maxRadius,
            growth: maxRadius / 10,
            alpha: 0.85,
            decay: 0.07,
            color,
            lineWidth: 3
        });
    }

    // Floating combat text / damage indicators
    spawnFloatingText(x, y, text, color = '#ffffff', isCrit = false) {
        this.floatingTexts.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y - 10,
            text,
            color,
            isCrit,
            vy: isCrit ? -4.5 : -3.0,
            vx: (Math.random() - 0.5) * 1.5,
            scale: isCrit ? 1.6 : 1.0,
            alpha: 1.0,
            decay: 0.025
        });
    }

    update() {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0;
            p.alpha -= p.decay;
            if (p.grow) p.size += p.grow;

            if (p.alpha <= 0 || p.size <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.growth;
            sw.alpha -= sw.decay;
            sw.lineWidth = Math.max(0.5, sw.lineWidth * 0.92);

            if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.x += ft.vx;
            ft.y += ft.vy;
            ft.vy *= 0.94; // decelerate upward
            ft.alpha -= ft.decay;

            if (ft.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // 1. Draw Shockwaves
        for (const sw of this.shockwaves) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, sw.alpha);
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = sw.lineWidth;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 2. Draw Particles
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;

            if (p.type === 'spark') {
                ctx.beginPath();
                // Spark elongated in direction of velocity
                const speed = Math.hypot(p.vx, p.vy);
                const angle = Math.atan2(p.vy, p.vx);
                ctx.translate(p.x, p.y);
                ctx.rotate(angle);
                ctx.fillRect(-p.size * 1.5, -p.size / 2, p.size * 3, p.size);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 3. Draw Floating Texts
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.font = `${ft.isCrit ? '900 24px' : 'bold 18px'} 'Segoe UI', Impact, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = ft.color;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 6;
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }

        ctx.restore();
    }
}

window.particles = new ParticleSystem();
