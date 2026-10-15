/**
 * Battle Stages and Environmental Arenas
 * Dynamic platforms, interactive hazards, background layers, and environmental particles
 */

const STAGES = [
    {
        id: 'rooftop',
        name: 'Neo Tokyo Rooftop',
        bgGradient: ['#090d16', '#121829', '#1e1b4b'],
        bounds: { left: 50, right: 950, top: 50, bottom: 580, width: 900 },
        platforms: [
            // Main stage platform
            { x: 120, y: 500, w: 760, h: 30, color: '#1e293b', border: '#00e5ff' },
            // Left AC elevated platform
            { x: 180, y: 380, w: 180, h: 16, color: '#334155', border: '#38bdf8' },
            // Right Billboard catwalk platform
            { x: 640, y: 380, w: 180, h: 16, color: '#334155', border: '#ec4899' },
            // Top central drone roost
            { x: 420, y: 260, w: 160, h: 16, color: '#334155', border: '#a855f7' }
        ],
        drawBg: function(ctx, time, width, height) {
            // City skyline silhouettes
            ctx.fillStyle = '#0f172a';
            for (let i = 0; i < 12; i++) {
                const bx = i * 85 - 20;
                const bh = 180 + Math.sin(i * 1.5) * 80;
                ctx.fillRect(bx, height - bh - 60, 75, bh + 60);

                // Window lights
                ctx.fillStyle = (i % 2 === 0) ? 'rgba(255, 234, 0, 0.25)' : 'rgba(0, 229, 255, 0.25)';
                for (let wy = height - bh - 40; wy < height - 70; wy += 22) {
                    ctx.fillRect(bx + 12, wy, 8, 12);
                    ctx.fillRect(bx + 35, wy, 8, 12);
                    ctx.fillRect(bx + 55, wy, 8, 12);
                }
                ctx.fillStyle = '#0f172a';
            }

            // Neon Japanese Billboard Glow
            ctx.save();
            ctx.shadowColor = '#ec4899';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 3;
            ctx.strokeRect(660, 310, 140, 60);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ FIGHT ⚡', 730, 348);
            ctx.restore();

            // Cyber Rain particles
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 40; i++) {
                const rx = ((i * 37 + time * 600) % width);
                const ry = ((i * 73 + time * 800) % height);
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx - 4, ry + 16);
                ctx.stroke();
            }
        }
    },
    {
        id: 'foundry',
        name: 'Molten Hazard Foundry',
        bgGradient: ['#1c0f0a', '#291207', '#451a03'],
        bounds: { left: 50, right: 950, top: 50, bottom: 580, width: 900 },
        platforms: [
            // Center main platform
            { x: 260, y: 480, w: 480, h: 26, color: '#27272a', border: '#f97316' },
            // Left floating platform
            { x: 100, y: 390, w: 160, h: 18, color: '#3f3f46', border: '#ea580c' },
            // Right floating platform
            { x: 740, y: 390, w: 160, h: 18, color: '#3f3f46', border: '#ea580c' },
            // High center gantry
            { x: 380, y: 290, w: 240, h: 18, color: '#3f3f46', border: '#fbbf24' }
        ],
        drawBg: function(ctx, time, width, height) {
            // Molten lava pool at bottom
            const lavaY = 540;
            const grad = ctx.createLinearGradient(0, lavaY, 0, height);
            grad.addColorStop(0, '#ff3d00');
            grad.addColorStop(0.4, '#ea580c');
            grad.addColorStop(1, '#7c2d12');
            ctx.fillStyle = grad;
            ctx.fillRect(0, lavaY, width, height - lavaY);

            // Lava wave bubbles
            ctx.fillStyle = '#ffea00';
            for (let i = 0; i < 15; i++) {
                const lx = (i * 70 + Math.sin(time * 3 + i) * 15) % width;
                const ly = lavaY + Math.sin(time * 4 + i) * 6;
                ctx.beginPath();
                ctx.arc(lx, ly, 4 + (i % 4), 0, Math.PI * 2);
                ctx.fill();
            }

            // Industrial chains hanging from ceiling
            ctx.strokeStyle = '#52525b';
            ctx.lineWidth = 4;
            [180, 500, 820].forEach(cx => {
                ctx.beginPath();
                ctx.moveTo(cx, 0);
                ctx.lineTo(cx, 390);
                ctx.stroke();
            });
        }
    },
    {
        id: 'dojo',
        name: 'Moonlight Cyber Shrine',
        bgGradient: ['#050b14', '#0d1929', '#1a2e40'],
        bounds: { left: 50, right: 950, top: 50, bottom: 580, width: 900 },
        platforms: [
            // Dojo wooden floor
            { x: 150, y: 490, w: 700, h: 28, color: '#1e293b', border: '#10b981' },
            // Left Pagoda roof
            { x: 120, y: 360, w: 200, h: 16, color: '#334155', border: '#34d399' },
            // Right Pagoda roof
            { x: 680, y: 360, w: 200, h: 16, color: '#334155', border: '#34d399' },
            // Shrine Torii arch top
            { x: 410, y: 250, w: 180, h: 18, color: '#334155', border: '#f43f5e' }
        ],
        drawBg: function(ctx, time, width, height) {
            // Giant glowing moon
            ctx.save();
            ctx.shadowColor = '#6ee7b7';
            ctx.shadowBlur = 40;
            ctx.fillStyle = '#f0fdf4';
            ctx.beginPath();
            ctx.arc(500, 160, 85, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Torii Gate Arch Silhouette
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(390, 250, 18, 240); // left pillar
            ctx.fillRect(592, 250, 18, 240); // right pillar
            ctx.fillRect(350, 235, 300, 22);  // crossbeam

            // Cherry Blossom Petals drifting
            ctx.fillStyle = 'rgba(244, 114, 182, 0.7)';
            for (let i = 0; i < 25; i++) {
                const px = ((i * 45 + time * 70) % (width + 50)) - 20;
                const py = ((i * 55 + time * 50) % (height + 50)) - 20;
                ctx.beginPath();
                ctx.ellipse(px, py, 5, 2.5, time + i, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
];

class StageManager {
    constructor() {
        this.currentStageIndex = 0;
        this.time = 0;
    }

    getStage() {
        return STAGES[this.currentStageIndex];
    }

    setStage(index) {
        this.currentStageIndex = (index + STAGES.length) % STAGES.length;
    }

    update() {
        this.time += 0.016;
    }

    draw(ctx, width, height) {
        const stage = this.getStage();

        // 1. Draw Background Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, stage.bgGradient[0]);
        grad.addColorStop(0.5, stage.bgGradient[1]);
        grad.addColorStop(1, stage.bgGradient[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Stage specific scenery
        stage.drawBg(ctx, this.time, width, height);

        // 3. Draw Platforms with glow borders
        for (const p of stage.platforms) {
            ctx.save();
            ctx.shadowColor = p.border;
            ctx.shadowBlur = 12;

            // Platform body
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.w, p.h);

            // Platform top rail border
            ctx.strokeStyle = p.border;
            ctx.lineWidth = 3;
            ctx.strokeRect(p.x, p.y, p.w, p.h);

            // Glowing surface line
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(p.x + 2, p.y + 1);
            ctx.lineTo(p.x + p.w - 2, p.y + 1);
            ctx.stroke();

            ctx.restore();
        }
    }
}

window.stageManager = new StageManager();
