/**
 * Meteor Surfing - Main Game Engine
 * Cyberpunk / Neon space surfer leaping across asteroids.
 */

// Canvas roundRect polyfill for older browser support
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'undefined') r = 0;
        if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
        this.beginPath();
        this.moveTo(x + (r.tl || 0), y);
        this.lineTo(x + w - (r.tr || 0), y);
        this.quadraticCurveTo(x + w, y, x + w, y + (r.tr || 0));
        this.lineTo(x + w, y + h - (r.br || 0));
        this.quadraticCurveTo(x + w, y + h, x + w - (r.br || 0), y + h);
        this.lineTo(x + (r.bl || 0), y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - (r.bl || 0));
        this.lineTo(x, y + (r.tl || 0));
        this.quadraticCurveTo(x, y, x + (r.tl || 0), y);
        this.closePath();
    };
}

// --- CONFIG & CONSTANTS ---
const GAME_CONFIG = {
    BASE_JUMP_MIN: 420,
    BASE_JUMP_MAX: 860,
    CHARGE_TIME: 0.85, // Seconds to reach full charge
    SURFER_SIZE: 16,
    GRAVITY_WELL_STRENGTH: 70000,
    UNSTABLE_FUSE: 2.3, // Seconds before unstable asteroid crumbles
    ICE_SLIDE_SPEED: 1.9,
    BOOSTER_MULTIPLIER: 1.55,
    SLOW_MO_SCALE: 0.45,
    COMBO_TIMEOUT: 4.5,
    VIEW_AHEAD: 1100,
    MAX_FLIGHT_TIME: 4.5 // Max seconds adrift before considered lost
};

const ASTEROID_TYPES = {
    NORMAL: { name: 'Zwykła', color: '#141c2e', stroke: '#00f3ff', glow: '#00f3ff' },
    BOOSTER: { name: 'Przyspieszająca', color: '#261e0b', stroke: '#ffd000', glow: '#ffd000' },
    CRYSTAL: { name: 'Kryształowa', color: '#220e29', stroke: '#ff00d4', glow: '#ff00d4' },
    UNSTABLE: { name: 'Niestabilna', color: '#2b100c', stroke: '#ff3700', glow: '#ff3700' },
    MAGNETIC: { name: 'Magnetyczna', color: '#131133', stroke: '#7928ca', glow: '#9d00ff' },
    ICE: { name: 'Lodowa', color: '#0d2233', stroke: '#90e0ef', glow: '#00b4d8' },
    DARK: { name: 'Ciemna', color: '#07070d', stroke: '#bd00ff', glow: '#bd00ff' }
};

const POWERUP_TYPES = {
    DOUBLE_JUMP: { id: 'double_jump', name: 'Podwójny skok', icon: '🦘', duration: 10, color: '#ffd000' },
    SHIELD: { id: 'shield', name: 'Tarcza', icon: '🛡️', duration: Infinity, color: '#00f3ff' },
    SLOW_MO: { id: 'slow_mo', name: 'Spowolnienie', icon: '⏱️', duration: 8, color: '#bd00ff' },
    MAGNET: { id: 'magnet', name: 'Magnes', icon: '🧲', duration: 10, color: '#ff007b' }
};

// --- PARTICLE SYSTEM ---
class Particle {
    constructor(x, y, vx, vy, color, size, life, shape = 'circle') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.shape = shape;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        const progress = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = progress;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        if (this.shape === 'square') {
            ctx.fillRect(this.x - this.size * progress / 2, this.y - this.size * progress / 2, this.size * progress, this.size * progress);
        } else {
            ctx.arc(this.x, this.y, Math.max(0.5, this.size * progress), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// --- ASTEROID CLASS ---
class Asteroid {
    constructor(x, y, radius, typeKey = 'NORMAL') {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.typeKey = typeKey;
        this.type = ASTEROID_TYPES[typeKey] || ASTEROID_TYPES.NORMAL;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.65 + Math.random() * 0.85);
        this.driftVx = (Math.random() - 0.5) * 20;
        this.driftVy = (Math.random() - 0.5) * 10;

        // Unstable state
        this.fuse = GAME_CONFIG.UNSTABLE_FUSE;
        this.isTriggered = false;
        this.isDestroyed = false;
        this.tickTimer = 0;

        // Crystals on crystal asteroid
        this.hasCrystalBonus = typeKey === 'CRYSTAL';
        this.crystals = [];
        if (typeKey === 'CRYSTAL') {
            const count = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                this.crystals.push({
                    angle: (i / count) * Math.PI * 2 + Math.random() * 0.4,
                    height: 8 + Math.random() * 8,
                    collected: false
                });
            }
        }

        // Generate craggy polygon points
        this.vertices = [];
        const numPoints = 12 + Math.floor(Math.random() * 6);
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const variance = radius * (0.85 + Math.random() * 0.3);
            this.vertices.push({
                cos: Math.cos(angle) * variance,
                sin: Math.sin(angle) * variance
            });
        }

        // Craters
        this.craters = [];
        const craterCount = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < craterCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (radius * 0.65);
            this.craters.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                r: 4 + Math.random() * (radius * 0.2)
            });
        }
    }

    update(dt, playerDist) {
        this.rotation += this.rotSpeed * dt;
        this.x += this.driftVx * dt;
        this.y += this.driftVy * dt;

        // Unstable fuse logic
        if (this.typeKey === 'UNSTABLE' && this.isTriggered && !this.isDestroyed) {
            this.fuse -= dt;
            this.tickTimer -= dt;
            if (this.tickTimer <= 0) {
                window.soundEngine.playUnstableTick();
                this.tickTimer = Math.max(0.08, this.fuse * 0.22);
            }
            if (this.fuse <= 0) {
                this.isDestroyed = true;
                window.soundEngine.playExplode();
            }
        }
    }

    draw(ctx, playerDist = 9999) {
        if (this.isDestroyed) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Cloaked / Dark asteroid glow reveal
        let opacity = 1;
        if (this.typeKey === 'DARK') {
            const revealDist = 280;
            opacity = Math.max(0.1, 1 - (playerDist / revealDist));
        }
        ctx.globalAlpha = opacity;

        // Draw magnetic pulse wave
        if (this.typeKey === 'MAGNETIC') {
            const time = Date.now() * 0.003;
            const pulseR = this.radius + 20 + Math.sin(time) * 16;
            ctx.strokeStyle = 'rgba(157, 0, 255, 0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(121, 40, 202, 0.18)';
            ctx.beginPath();
            ctx.arc(0, 0, pulseR + 25, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.rotate(this.rotation);

        // Asteroid craggy body
        ctx.beginPath();
        for (let i = 0; i < this.vertices.length; i++) {
            const v = this.vertices[i];
            if (i === 0) ctx.moveTo(v.cos, v.sin);
            else ctx.lineTo(v.cos, v.sin);
        }
        ctx.closePath();

        // Fill body
        ctx.fillStyle = this.type.color;
        ctx.fill();

        // Unstable cracks & pulse
        if (this.typeKey === 'UNSTABLE' && this.isTriggered) {
            const pulse = Math.sin(Date.now() * 0.035) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 55, 0, ${0.4 + pulse * 0.5})`;
            ctx.fill();
        }

        // Craters
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        for (const crater of this.craters) {
            ctx.beginPath();
            ctx.arc(crater.x, crater.y, crater.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Glowing rim stroke
        ctx.strokeStyle = this.type.stroke;
        ctx.lineWidth = (this.typeKey === 'UNSTABLE' && this.isTriggered) ? 4.5 : 2.5;
        ctx.shadowBlur = (this.typeKey === 'UNSTABLE' && this.isTriggered) ? 24 : 15;
        ctx.shadowColor = this.type.glow;
        ctx.stroke();

        // Crystals on crystal asteroid
        if (this.typeKey === 'CRYSTAL') {
            for (const c of this.crystals) {
                const cx = Math.cos(c.angle) * this.radius;
                const cy = Math.sin(c.angle) * this.radius;
                const tipX = Math.cos(c.angle) * (this.radius + c.height);
                const tipY = Math.sin(c.angle) * (this.radius + c.height);

                ctx.fillStyle = '#ff40c6';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#ff00d4';

                ctx.beginPath();
                ctx.moveTo(cx - 4, cy);
                ctx.lineTo(tipX, tipY);
                ctx.lineTo(cx + 4, cy);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        // Lightning arcs for Booster
        if (this.typeKey === 'BOOSTER' && Math.random() > 0.35) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffd000';
            const arcAngle = Math.random() * Math.PI * 2;
            const ax1 = Math.cos(arcAngle) * (this.radius + 2);
            const ay1 = Math.sin(arcAngle) * (this.radius + 2);
            const ax2 = Math.cos(arcAngle + 0.3) * (this.radius + 8);
            const ay2 = Math.sin(arcAngle + 0.3) * (this.radius + 8);
            ctx.beginPath();
            ctx.moveTo(ax1, ay1);
            ctx.lineTo((ax1 + ax2) / 2 + (Math.random() - 0.5) * 8, (ay1 + ay2) / 2 + (Math.random() - 0.5) * 8);
            ctx.lineTo(ax2, ay2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// --- FLOATING POWERUP CAPSULE ---
class PowerupCapsule {
    constructor(x, y, typeId) {
        this.x = x;
        this.y = y;
        this.typeId = typeId;
        this.type = POWERUP_TYPES[typeId] || POWERUP_TYPES.DOUBLE_JUMP;
        this.radius = 16;
        this.collected = false;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    update(dt, playerX, playerY, magnetActive) {
        if (this.collected) return;
        this.bobOffset += dt * 3;

        // Magnet attraction
        if (magnetActive) {
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 400 && dist > 1) {
                const speed = 420 * (1 - dist / 450);
                this.x += (dx / dist) * speed * dt;
                this.y += (dy / dist) * speed * dt;
            }
        }
    }

    draw(ctx) {
        if (this.collected) return;
        const currentY = this.y + Math.sin(this.bobOffset) * 5;

        ctx.save();
        ctx.translate(this.x, currentY);

        // Capsule Outer Glow Ring
        ctx.shadowBlur = 18;
        ctx.shadowColor = this.type.color;
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
        ctx.fill();

        // Icon inside
        ctx.shadowBlur = 0;
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, 0, 1);

        ctx.restore();
    }
}

// --- FLOATING SCORE FX ---
class FloatingText {
    constructor(x, y, text, color = '#00f3ff') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 0.9;
        this.maxLife = 0.9;
    }

    update(dt) {
        this.y -= 45 * dt;
        this.life -= dt;
    }

    draw(ctx) {
        const progress = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = progress;
        ctx.font = '900 16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// --- STAR BACKGROUND (PARALLAX) ---
class Starfield {
    constructor() {
        this.stars = [];
        this.nebulae = [];
    }

    init(width, height) {
        this.stars = [];
        for (let i = 0; i < 180; i++) {
            this.stars.push({
                x: Math.random() * width,
                y: Math.random() * height * 4,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.7 + 0.3,
                speed: Math.random() * 0.35 + 0.05,
                twinkleSpeed: Math.random() * 2 + 1
            });
        }

        // Nebulae clouds
        this.nebulae = [
            { x: width * 0.25, y: 0, r: 350, color: 'rgba(92, 0, 153, 0.12)' },
            { x: width * 0.8, y: -800, r: 420, color: 'rgba(0, 102, 255, 0.1)' },
            { x: width * 0.3, y: -1600, r: 400, color: 'rgba(255, 0, 128, 0.08)' },
            { x: width * 0.75, y: -2500, r: 450, color: 'rgba(0, 243, 255, 0.09)' },
            { x: width * 0.2, y: -3400, r: 500, color: 'rgba(128, 0, 255, 0.11)' }
        ];
    }

    draw(ctx, cameraY, width, height) {
        // Nebulae
        for (const neb of this.nebulae) {
            const screenY = neb.y - cameraY * 0.4;
            if (screenY > -neb.r && screenY < height + neb.r) {
                const grad = ctx.createRadialGradient(neb.x, screenY, 0, neb.x, screenY, neb.r);
                grad.addColorStop(0, neb.color);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(neb.x, screenY, neb.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Stars
        const time = Date.now() * 0.002;
        ctx.fillStyle = '#ffffff';
        for (const star of this.stars) {
            const screenY = ((star.y - cameraY * star.speed) % (height * 3) + (height * 3)) % (height * 3) - height;
            const flicker = Math.sin(time * star.twinkleSpeed) * 0.25 + 0.75;
            ctx.globalAlpha = star.alpha * flicker;
            ctx.fillRect(star.x, screenY, star.size, star.size);
        }
        ctx.globalAlpha = 1.0;
    }
}

// --- MAIN GAME CONTROLLER ---
class MeteorSurfingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // State machine
        this.STATE_INIT = 'INIT';
        this.STATE_ON_ASTEROID = 'ON_ASTEROID';
        this.STATE_FLYING = 'FLYING';
        this.STATE_GAME_OVER = 'GAME_OVER';
        this.state = this.STATE_INIT;

        // Player properties
        this.player = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            angle: -Math.PI / 2, // Angle on asteroid surface
            currentAsteroid: null,
            lastAsteroidId: null,
            facingAngle: 0,
            isCharging: false,
            chargeTime: 0,
            flightTime: 0,
            jumpCooldown: 0
        };

        // Camera
        this.camera = { y: 0, targetY: 0 };
        this.screenShake = 0;

        // Game Entities
        this.asteroids = [];
        this.powerups = [];
        this.particles = [];
        this.floatingTexts = [];
        this.starfield = new Starfield();

        // Keys
        this.keys = { left: false, right: false };

        // Game Stats & Score
        this.startY = 0;
        this.maxDistance = 0;
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.comboTimer = 0;
        this.asteroidsVisited = 0;
        this.bestScore = parseInt(localStorage.getItem('meteor_surf_best') || '0', 10);
        this.bestDistance = parseInt(localStorage.getItem('meteor_surf_best_dist') || '0', 10);

        // Active Power-ups
        this.activePowerups = {
            shield: false,
            double_jump: 0,
            slow_mo: 0,
            magnet: 0
        };
        this.doubleJumpUsed = false;

        // Time tracking
        this.lastTime = performance.now();

        // Bind DOM Elements
        this.dom = {
            distanceVal: document.getElementById('distanceVal'),
            scoreVal: document.getElementById('scoreVal'),
            comboBadge: document.getElementById('comboBadge'),
            comboTimerWrap: document.getElementById('comboTimerWrap'),
            comboTimerBar: document.getElementById('comboTimerBar'),
            powerupsTray: document.getElementById('powerupsTray'),
            chargeMeterWrap: document.getElementById('chargeMeterWrap'),
            chargeMeterFill: document.getElementById('chargeMeterFill'),
            tutorialHint: document.getElementById('tutorialHint'),
            gameOverModal: document.getElementById('gameOverModal'),
            finalDistanceVal: document.getElementById('finalDistanceVal'),
            bestDistanceVal: document.getElementById('bestDistanceVal'),
            finalScoreVal: document.getElementById('finalScoreVal'),
            maxComboVal: document.getElementById('maxComboVal'),
            asteroidsLandedVal: document.getElementById('asteroidsLandedVal'),
            newRecordBadge: document.getElementById('newRecordBadge'),
            restartBtn: document.getElementById('restartBtn'),
            soundBtn: document.getElementById('soundBtn')
        };

        this.initEvents();
        this.resize();
        this.resetGame();
        this.loop();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.starfield.init(this.width, this.height);
    }

    initEvents() {
        window.addEventListener('resize', () => this.resize());

        // Keyboard & Mouse controls
        const handleStartCharge = (e) => {
            if (this.state === this.STATE_GAME_OVER) return;
            if (e.target.closest && e.target.closest('#soundBtn')) return;
            window.soundEngine.ensureContext();
            this.startAction();
        };

        const handleReleaseJump = (e) => {
            if (this.state === this.STATE_GAME_OVER) return;
            if (e.target.closest && e.target.closest('#soundBtn')) return;
            this.releaseAction();
        };

        window.addEventListener('mousedown', handleStartCharge);
        window.addEventListener('mouseup', handleReleaseJump);

        // Touch support
        window.addEventListener('touchstart', (e) => {
            if (this.state === this.STATE_GAME_OVER) return;
            if (e.target.closest && e.target.closest('#soundBtn')) return;
            e.preventDefault();
            handleStartCharge(e);
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            if (this.state === this.STATE_GAME_OVER) return;
            if (e.target.closest && e.target.closest('#soundBtn')) return;
            e.preventDefault();
            handleReleaseJump(e);
        }, { passive: false });

        // Spacebar & Keys support
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                window.soundEngine.ensureContext();
                if (this.state === this.STATE_GAME_OVER) {
                    this.restartGame();
                } else if (!e.repeat) {
                    this.startAction();
                }
            } else if (e.code === 'KeyM') {
                this.toggleSound();
            } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = true;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.state !== this.STATE_GAME_OVER) {
                    this.releaseAction();
                }
            } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = false;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = false;
            }
        });

        // Restart button
        this.dom.restartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.restartGame();
        });

        // Sound mute toggle
        this.dom.soundBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSound();
        });
    }

    toggleSound() {
        const isMuted = window.soundEngine.toggleMute();
        this.dom.soundBtn.textContent = isMuted ? '🔇' : '🔊';
        this.dom.soundBtn.style.borderColor = isMuted ? '#ff007b' : 'rgba(0, 243, 255, 0.3)';
    }

    startAction() {
        if (this.state === this.STATE_ON_ASTEROID) {
            this.player.isCharging = true;
            this.player.chargeTime = 0;
            this.dom.chargeMeterWrap.classList.add('active');
            window.soundEngine.startCharge();
        } else if (this.state === this.STATE_FLYING && this.activePowerups.double_jump > 0 && !this.doubleJumpUsed) {
            // Execute Mid-Air Double Jump!
            this.executeDoubleJump();
        }
    }

    releaseAction() {
        if (this.state === this.STATE_ON_ASTEROID && this.player.isCharging) {
            this.executeJump();
        }
    }

    getLaunchVector(ast) {
        const normalX = Math.cos(this.player.angle);
        const normalY = Math.sin(this.player.angle);
        const tangX = -Math.sin(this.player.angle) * Math.sign(ast.rotSpeed || 1);
        const tangY = Math.cos(this.player.angle) * Math.sign(ast.rotSpeed || 1);
        const spinWeight = 0.25;

        let dirX = normalX + tangX * spinWeight;
        let dirY = normalY + tangY * spinWeight;
        const len = Math.hypot(dirX, dirY);
        return { x: dirX / len, y: dirY / len };
    }

    executeJump() {
        this.player.isCharging = false;
        window.soundEngine.stopCharge();
        this.dom.chargeMeterWrap.classList.remove('active');
        this.dom.chargeMeterFill.style.width = '0%';

        const ast = this.player.currentAsteroid;
        if (!ast) return;

        // Hide tutorial once jumped
        this.dom.tutorialHint.classList.add('hidden');

        // Calculate jump impulse
        const chargeRatio = Math.min(1.0, this.player.chargeTime / GAME_CONFIG.CHARGE_TIME);
        let jumpSpeed = GAME_CONFIG.BASE_JUMP_MIN + chargeRatio * (GAME_CONFIG.BASE_JUMP_MAX - GAME_CONFIG.BASE_JUMP_MIN);

        // Booster multiplier
        const isBooster = ast.typeKey === 'BOOSTER';
        if (isBooster) {
            jumpSpeed *= GAME_CONFIG.BOOSTER_MULTIPLIER;
        }

        const dir = this.getLaunchVector(ast);

        // Push player outside of asteroid capture zone to avoid instant re-landing
        this.player.x += dir.x * (GAME_CONFIG.SURFER_SIZE + 6);
        this.player.y += dir.y * (GAME_CONFIG.SURFER_SIZE + 6);

        this.player.vx = dir.x * jumpSpeed + ast.driftVx;
        this.player.vy = dir.y * jumpSpeed + ast.driftVy;

        this.player.lastAsteroidId = ast.id;
        this.player.jumpCooldown = 0.25; // 250ms cooldown before re-landing on same asteroid
        this.player.flightTime = 0;
        this.state = this.STATE_FLYING;
        this.player.currentAsteroid = null;
        this.doubleJumpUsed = false;

        // Audio & Particles
        window.soundEngine.playJump(isBooster);
        this.createJumpParticles(this.player.x, this.player.y, dir.x, dir.y, isBooster ? '#ffd000' : '#00f3ff');
    }

    executeDoubleJump() {
        this.doubleJumpUsed = true;
        const boostSpeed = 620;
        let dirX = this.player.vx;
        let dirY = this.player.vy;
        const len = Math.hypot(dirX, dirY);
        if (len > 0.1) {
            dirX /= len;
            dirY /= len;
        } else {
            dirX = 0;
            dirY = -1;
        }

        this.player.vx = dirX * boostSpeed;
        this.player.vy = dirY * boostSpeed;
        this.player.flightTime = Math.max(0, this.player.flightTime - 1.5); // Reset part of flight timer

        window.soundEngine.playJump(true);
        this.createJumpParticles(this.player.x, this.player.y, dirX, dirY, '#ffd000', 25);
        this.addFloatingText(this.player.x, this.player.y - 20, 'PODWÓJNY SKOK! 🦘', '#ffd000');
    }

    resetGame() {
        this.state = this.STATE_INIT;
        this.asteroids = [];
        this.powerups = [];
        this.particles = [];
        this.floatingTexts = [];
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.comboTimer = 0;
        this.asteroidsVisited = 0;
        this.maxDistance = 0;
        this.activePowerups = { shield: false, double_jump: 0, slow_mo: 0, magnet: 0 };
        this.doubleJumpUsed = false;

        // Hide Game Over Modal
        this.dom.gameOverModal.classList.remove('visible');
        this.dom.newRecordBadge.style.display = 'none';

        // Spawn starting asteroid in bottom center
        const startX = this.width / 2;
        const startY = this.height * 0.72;
        this.startY = startY;

        const homeAsteroid = new Asteroid(startX, startY, 55, 'NORMAL');
        homeAsteroid.driftVx = 0;
        homeAsteroid.driftVy = 0;
        this.asteroids.push(homeAsteroid);

        // Put surfer on top of starting asteroid
        this.player.currentAsteroid = homeAsteroid;
        this.player.lastAsteroidId = homeAsteroid.id;
        this.player.angle = -Math.PI / 2;
        this.player.x = homeAsteroid.x + Math.cos(this.player.angle) * (homeAsteroid.radius + GAME_CONFIG.SURFER_SIZE * 0.8);
        this.player.y = homeAsteroid.y + Math.sin(this.player.angle) * (homeAsteroid.radius + GAME_CONFIG.SURFER_SIZE * 0.8);
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.isCharging = false;
        this.player.chargeTime = 0;
        this.player.flightTime = 0;
        this.player.jumpCooldown = 0;

        this.camera.y = startY - this.height * 0.65;
        this.camera.targetY = this.camera.y;

        this.state = this.STATE_ON_ASTEROID;

        // Seed initial asteroid field ahead
        this.generateAsteroidsAhead();
        this.updateHUD();
    }

    restartGame() {
        window.soundEngine.ensureContext();
        this.resetGame();
    }

    generateAsteroidsAhead() {
        let topY = this.asteroids.length > 0 ? this.asteroids[this.asteroids.length - 1].y : this.startY;
        const targetTop = this.camera.targetY - GAME_CONFIG.VIEW_AHEAD;

        while (topY > targetTop) {
            // Next asteroid vertical distance: 160px - 260px
            const deltaY = 160 + Math.random() * 100;
            topY -= deltaY;

            // X coordinate within screen margins
            const margin = 90;
            const x = margin + Math.random() * (this.width - margin * 2);
            const radius = 35 + Math.random() * 36;

            // Determine asteroid type based on distance progression
            const distKm = Math.floor(Math.abs(topY - this.startY) / 10);
            const type = this.pickAsteroidType(distKm);

            const ast = new Asteroid(x, topY, radius, type);
            this.asteroids.push(ast);

            // Chance to spawn floating power-up between asteroids
            if (Math.random() < 0.24 && distKm > 30) {
                const pKeys = Object.keys(POWERUP_TYPES);
                const chosenKey = pKeys[Math.floor(Math.random() * pKeys.length)];
                const px = x + (Math.random() - 0.5) * 130;
                const py = topY + deltaY * 0.5 + (Math.random() - 0.5) * 40;
                this.powerups.push(new PowerupCapsule(px, py, chosenKey));
            }
        }
    }

    pickAsteroidType(distKm) {
        const rand = Math.random();
        if (distKm < 50) {
            if (rand < 0.55) return 'NORMAL';
            if (rand < 0.80) return 'CRYSTAL';
            return 'BOOSTER';
        } else if (distKm < 150) {
            if (rand < 0.35) return 'NORMAL';
            if (rand < 0.52) return 'CRYSTAL';
            if (rand < 0.68) return 'BOOSTER';
            if (rand < 0.84) return 'ICE';
            return 'MAGNETIC';
        } else {
            if (rand < 0.22) return 'NORMAL';
            if (rand < 0.38) return 'UNSTABLE';
            if (rand < 0.52) return 'CRYSTAL';
            if (rand < 0.66) return 'BOOSTER';
            if (rand < 0.78) return 'ICE';
            if (rand < 0.90) return 'MAGNETIC';
            return 'DARK';
        }
    }

    // --- MAIN GAME LOOP ---
    loop() {
        requestAnimationFrame(() => this.loop());

        const now = performance.now();
        let dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        if (dt > 0.1) dt = 0.1; // Cap delta time on lag spikes

        // Apply slow-motion powerup
        const timeScale = this.activePowerups.slow_mo > 0 ? GAME_CONFIG.SLOW_MO_SCALE : 1.0;
        const gameDt = dt * timeScale;

        this.update(gameDt, dt);
        this.render();
    }

    update(gameDt, realDt) {
        // Power-ups countdown
        if (this.activePowerups.double_jump > 0) this.activePowerups.double_jump -= realDt;
        if (this.activePowerups.slow_mo > 0) this.activePowerups.slow_mo -= realDt;
        if (this.activePowerups.magnet > 0) this.activePowerups.magnet -= realDt;

        // Combo timeout decay
        if (this.combo > 1) {
            this.comboTimer -= realDt;
            if (this.comboTimer <= 0) {
                this.combo = 1;
                this.dom.comboBadge.classList.remove('active');
                this.dom.comboTimerWrap.classList.remove('active');
            } else {
                const ratio = Math.max(0, this.comboTimer / GAME_CONFIG.COMBO_TIMEOUT);
                this.dom.comboTimerBar.style.transform = `scaleX(${ratio})`;
            }
        }

        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake -= realDt * 18;
            if (this.screenShake < 0) this.screenShake = 0;
        }

        // Jump cooldown decay
        if (this.player.jumpCooldown > 0) {
            this.player.jumpCooldown -= gameDt;
        }

        // Update Asteroids
        for (const ast of this.asteroids) {
            const pDist = Math.hypot(this.player.x - ast.x, this.player.y - ast.y);
            ast.update(gameDt, pDist);

            // If unstable destroyed while player is on it
            if (ast.isDestroyed && this.player.currentAsteroid === ast && this.state === this.STATE_ON_ASTEROID) {
                this.createExplosionParticles(ast.x, ast.y, ast.type.stroke, 40);
                this.triggerGameOver('Niestabilna asteroida wybuchła pod twoimi stopami!');
            }
        }

        // Update Powerup Capsules
        for (const p of this.powerups) {
            p.update(gameDt, this.player.x, this.player.y, this.activePowerups.magnet > 0);

            // Capsule pickup check
            if (!p.collected) {
                const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
                if (dist < p.radius + GAME_CONFIG.SURFER_SIZE + 6) {
                    this.collectPowerup(p);
                }
            }
        }

        // State-specific Player Update
        if (this.state === this.STATE_ON_ASTEROID) {
            this.updateOnAsteroid(gameDt);
        } else if (this.state === this.STATE_FLYING) {
            this.updateFlying(gameDt);
        }

        // Calculate Distance (10 pixels = 1 km)
        const currentDist = Math.max(0, Math.floor(Math.abs(this.player.y - this.startY) / 10));
        if (currentDist > this.maxDistance) {
            const addedDist = currentDist - this.maxDistance;
            this.maxDistance = currentDist;
            this.score += addedDist * this.combo;
        }

        // Smooth Camera Follow
        if (this.state !== this.STATE_GAME_OVER) {
            this.camera.targetY = this.player.y - this.height * 0.62;
        }
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;

        // Spawn new asteroids as player climbs
        this.generateAsteroidsAhead();

        // Clean up distant asteroids behind camera
        const cleanupThreshold = this.camera.y + this.height + 400;
        this.asteroids = this.asteroids.filter(a => a.y < cleanupThreshold);
        this.powerups = this.powerups.filter(p => p.y < cleanupThreshold && !p.collected);

        // Update Particles & Floating Text
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(gameDt);
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].update(realDt);
            if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
        }

        this.updateHUD();
    }

    updateOnAsteroid(dt) {
        const ast = this.player.currentAsteroid;
        if (!ast) return;

        // Optional manual surfing / rotation nudge with Arrow/A/D keys
        let manualNudge = 0;
        if (this.keys.left) manualNudge -= 1.8;
        if (this.keys.right) manualNudge += 1.8;

        // Ice slide extra spin
        let extraSpin = 0;
        if (ast.typeKey === 'ICE') {
            extraSpin = GAME_CONFIG.ICE_SLIDE_SPEED * Math.sign(ast.rotSpeed || 1);
        }

        this.player.angle += (ast.rotSpeed + extraSpin + manualNudge) * dt;

        // Player sticks to surface
        const surfaceR = ast.radius + GAME_CONFIG.SURFER_SIZE * 0.8;
        this.player.x = ast.x + Math.cos(this.player.angle) * surfaceR;
        this.player.y = ast.y + Math.sin(this.player.angle) * surfaceR;
        this.player.facingAngle = this.player.angle + Math.PI / 2;

        // Charging logic
        if (this.player.isCharging) {
            this.player.chargeTime += dt;
            const ratio = Math.min(1.0, this.player.chargeTime / GAME_CONFIG.CHARGE_TIME);
            this.dom.chargeMeterFill.style.width = `${ratio * 100}%`;

            // Charge sparks
            if (Math.random() > 0.3) {
                const sparkAngle = Math.random() * Math.PI * 2;
                this.particles.push(new Particle(
                    this.player.x, this.player.y,
                    Math.cos(sparkAngle) * 50, Math.sin(sparkAngle) * 50,
                    '#00f3ff', 2.5, 0.25
                ));
            }
        }
    }

    updateFlying(dt) {
        this.player.flightTime += dt;

        // Gravitational pull from nearby Magnetic Asteroids
        for (const ast of this.asteroids) {
            if (ast.typeKey === 'MAGNETIC' && !ast.isDestroyed) {
                const dx = ast.x - this.player.x;
                const dy = ast.y - this.player.y;
                const dist = Math.hypot(dx, dy);
                const magnetRange = ast.radius + 250;
                if (dist < magnetRange && dist > 10) {
                    const force = (GAME_CONFIG.GRAVITY_WELL_STRENGTH / (dist * dist)) * dt;
                    this.player.vx += (dx / dist) * force;
                    this.player.vy += (dy / dist) * force;
                }
            }
        }

        // Move Player
        this.player.x += this.player.vx * dt;
        this.player.y += this.player.vy * dt;

        // Jetpack thruster trail particles
        const speed = Math.hypot(this.player.vx, this.player.vy);
        this.player.facingAngle = Math.atan2(this.player.vy, this.player.vx);

        if (speed > 40) {
            const backX = this.player.x - Math.cos(this.player.facingAngle) * 12;
            const backY = this.player.y - Math.sin(this.player.facingAngle) * 12;
            this.particles.push(new Particle(
                backX, backY,
                -this.player.vx * 0.15 + (Math.random() - 0.5) * 35,
                -this.player.vy * 0.15 + (Math.random() - 0.5) * 35,
                this.activePowerups.double_jump > 0 ? '#ffd000' : '#00f3ff',
                3.5, 0.35
            ));
        }

        // Collision check with Asteroids
        for (const ast of this.asteroids) {
            if (ast.isDestroyed) continue;
            // Respect jump cooldown for the asteroid we just leaped from
            if (this.player.jumpCooldown > 0 && ast.id === this.player.lastAsteroidId) continue;

            const dist = Math.hypot(this.player.x - ast.x, this.player.y - ast.y);
            const captureRadius = ast.radius + GAME_CONFIG.SURFER_SIZE * 0.8;

            if (dist <= captureRadius) {
                this.landOnAsteroid(ast);
                return;
            }
        }

        // Check if player fell out of bounds / lost in deep space
        const deathThreshold = this.camera.y + this.height + 140;
        const sideThreshold = 240;
        const isOffScreen = this.player.y > deathThreshold ||
                            this.player.x < -sideThreshold ||
                            this.player.x > this.width + sideThreshold ||
                            this.player.flightTime > GAME_CONFIG.MAX_FLIGHT_TIME;

        if (isOffScreen) {
            if (this.activePowerups.shield) {
                // Shield saves the player!
                this.useShieldSave();
            } else {
                this.triggerGameOver('Zgubiłeś się w bezkresnej próżni kosmosu!');
            }
        }
    }

    landOnAsteroid(ast) {
        this.state = this.STATE_ON_ASTEROID;
        this.player.currentAsteroid = ast;
        this.player.lastAsteroidId = ast.id;
        this.player.angle = Math.atan2(this.player.y - ast.y, this.player.x - ast.x);
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.flightTime = 0;
        this.asteroidsVisited++;

        // Screen shake
        this.screenShake = 6;

        // Sound & Particles
        window.soundEngine.playLand(ast.typeKey);
        this.createLandingShockwave(this.player.x, this.player.y, ast.type.stroke);

        // Combo system
        this.combo++;
        this.comboTimer = GAME_CONFIG.COMBO_TIMEOUT;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        if (this.combo >= 2) {
            window.soundEngine.playCombo(this.combo);
            this.addFloatingText(this.player.x, this.player.y - 25, `COMBO x${this.combo}! 🔥`, '#ff007b');
            this.dom.comboBadge.textContent = `COMBO x${this.combo}`;
            this.dom.comboBadge.classList.add('active');
            this.dom.comboTimerWrap.classList.add('active');
        }

        // Trigger special asteroid events
        if (ast.typeKey === 'CRYSTAL' && ast.hasCrystalBonus) {
            ast.hasCrystalBonus = false;
            const bonus = 500 * this.combo;
            this.score += bonus;
            this.addFloatingText(this.player.x, this.player.y - 45, `+${bonus} KRYSZTAŁ! 💎`, '#ff00d4');
            this.createExplosionParticles(this.player.x, this.player.y, '#ff00d4', 20);
        } else if (ast.typeKey === 'UNSTABLE') {
            ast.isTriggered = true;
            this.addFloatingText(this.player.x, this.player.y - 40, 'NIESTABILNA! SKACZ! ⚠️', '#ff3700');
        } else if (ast.typeKey === 'BOOSTER') {
            this.addFloatingText(this.player.x, this.player.y - 35, 'DOŁADOWANIE! ⚡', '#ffd000');
        } else if (ast.typeKey === 'ICE') {
            this.addFloatingText(this.player.x, this.player.y - 35, 'POŚLIZG! ❄', '#90e0ef');
        }
    }

    useShieldSave() {
        this.activePowerups.shield = false;
        window.soundEngine.playShieldBreak();

        // Find nearest safe asteroid ahead
        let closest = null;
        let minDist = 999999;
        for (const ast of this.asteroids) {
            if (ast.isDestroyed) continue;
            const d = Math.hypot(this.player.x - ast.x, this.player.y - ast.y);
            if (d < minDist) {
                minDist = d;
                closest = ast;
            }
        }

        if (closest) {
            this.createExplosionParticles(this.player.x, this.player.y, '#00f3ff', 30);
            this.player.x = closest.x;
            this.player.y = closest.y - closest.radius - GAME_CONFIG.SURFER_SIZE;
            this.landOnAsteroid(closest);
            this.addFloatingText(this.player.x, this.player.y - 45, 'TARCZA OCALIŁA CIĘ! 🛡️', '#00f3ff');
        } else {
            this.triggerGameOver('Zgubiłeś się w próżni kosmosu!');
        }
    }

    collectPowerup(capsule) {
        capsule.collected = true;
        const type = capsule.type;
        window.soundEngine.playPowerup(type.name);

        if (type.id === 'shield') {
            this.activePowerups.shield = true;
        } else if (type.id === 'double_jump') {
            this.activePowerups.double_jump = type.duration;
        } else if (type.id === 'slow_mo') {
            this.activePowerups.slow_mo = type.duration;
        } else if (type.id === 'magnet') {
            this.activePowerups.magnet = type.duration;
        }

        this.addFloatingText(capsule.x, capsule.y - 20, `${type.name.toUpperCase()}! ${type.icon}`, type.color);
        this.createExplosionParticles(capsule.x, capsule.y, type.color, 25);
    }

    triggerGameOver(reason) {
        if (this.state === this.STATE_GAME_OVER) return;
        this.state = this.STATE_GAME_OVER;
        window.soundEngine.playDeath();

        this.screenShake = 15;
        this.createExplosionParticles(this.player.x, this.player.y, '#ff007b', 45);

        // Check Best Record
        let isNewRecord = false;
        if (this.maxDistance > this.bestDistance) {
            this.bestDistance = this.maxDistance;
            localStorage.setItem('meteor_surf_best_dist', this.bestDistance.toString());
            isNewRecord = true;
        }
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('meteor_surf_best', this.bestScore.toString());
        }

        // Populate Game Over Modal
        this.dom.finalDistanceVal.textContent = this.maxDistance.toLocaleString();
        this.dom.bestDistanceVal.textContent = `${this.bestDistance.toLocaleString()} km`;
        this.dom.finalScoreVal.textContent = this.score.toLocaleString();
        this.dom.maxComboVal.textContent = `x${this.maxCombo}`;
        this.dom.asteroidsLandedVal.textContent = this.asteroidsVisited;

        if (isNewRecord && this.maxDistance > 20) {
            this.dom.newRecordBadge.style.display = 'inline-block';
        }

        // Show Modal with rapid fade-in (< 100ms)
        setTimeout(() => {
            this.dom.gameOverModal.classList.add('visible');
        }, 120);
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push(new FloatingText(x, y, text, color));
    }

    createJumpParticles(x, y, dirX, dirY, color, count = 16) {
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 1.2;
            const pSpeed = 60 + Math.random() * 140;
            this.particles.push(new Particle(
                x, y,
                -dirX * pSpeed + spread * 40,
                -dirY * pSpeed + spread * 40,
                color, 3.5, 0.4
            ));
        }
    }

    createLandingShockwave(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const pSpeed = 40 + Math.random() * 60;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * pSpeed, Math.sin(angle) * pSpeed,
                color, 3, 0.35
            ));
        }
    }

    createExplosionParticles(x, y, color, count = 30) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 70 + Math.random() * 180;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                color, 4 + Math.random() * 3, 0.6, 'square'
            ));
        }
    }

    updateHUD() {
        this.dom.distanceVal.textContent = this.maxDistance.toLocaleString();
        this.dom.scoreVal.textContent = this.score.toLocaleString();

        // Update Powerups tray in HUD
        let trayHtml = '';
        if (this.activePowerups.shield) {
            trayHtml += `<div class="powerup-item shield">🛡️ TARCZA</div>`;
        }
        if (this.activePowerups.double_jump > 0) {
            trayHtml += `<div class="powerup-item double_jump">🦘 SKOK: ${Math.ceil(this.activePowerups.double_jump)}s</div>`;
        }
        if (this.activePowerups.slow_mo > 0) {
            trayHtml += `<div class="powerup-item slow_mo">⏱️ ZWOLNIENIE: ${Math.ceil(this.activePowerups.slow_mo)}s</div>`;
        }
        if (this.activePowerups.magnet > 0) {
            trayHtml += `<div class="powerup-item magnet">🧲 MAGNES: ${Math.ceil(this.activePowerups.magnet)}s</div>`;
        }
        this.dom.powerupsTray.innerHTML = trayHtml;
    }

    // --- RENDERING ---
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // Screen Shake offset
        let shakeX = 0;
        let shakeY = 0;
        if (this.screenShake > 0) {
            shakeX = (Math.random() - 0.5) * this.screenShake;
            shakeY = (Math.random() - 0.5) * this.screenShake;
        }

        // Draw Parallax Starfield & Nebulae
        this.starfield.draw(ctx, this.camera.y, this.width, this.height);

        // Apply World Transform (Camera + Shake)
        ctx.save();
        ctx.translate(shakeX, -this.camera.y + shakeY);

        // Render Asteroids
        for (const ast of this.asteroids) {
            if (ast.y - ast.radius > this.camera.y + this.height + 100 || ast.y + ast.radius < this.camera.y - 100) continue;
            const pDist = Math.hypot(this.player.x - ast.x, this.player.y - ast.y);
            ast.draw(ctx, pDist);
        }

        // Render Power-up Capsules
        for (const p of this.powerups) {
            p.draw(ctx);
        }

        // Render Trajectory Prediction Arc (When Charging)
        if (this.state === this.STATE_ON_ASTEROID && this.player.isCharging && this.player.currentAsteroid) {
            this.drawTrajectoryArc(ctx);
        }

        // Render Surfer / Astronaut
        if (this.state !== this.STATE_GAME_OVER) {
            this.drawSurfer(ctx);
        }

        // Render Particles
        for (const p of this.particles) {
            p.draw(ctx);
        }

        // Render Floating Score FX
        for (const ft of this.floatingTexts) {
            ft.draw(ctx);
        }

        ctx.restore();
    }

    drawTrajectoryArc(ctx) {
        const ast = this.player.currentAsteroid;
        const chargeRatio = Math.min(1.0, this.player.chargeTime / GAME_CONFIG.CHARGE_TIME);
        let jumpSpeed = GAME_CONFIG.BASE_JUMP_MIN + chargeRatio * (GAME_CONFIG.BASE_JUMP_MAX - GAME_CONFIG.BASE_JUMP_MIN);
        if (ast.typeKey === 'BOOSTER') jumpSpeed *= GAME_CONFIG.BOOSTER_MULTIPLIER;

        const dir = this.getLaunchVector(ast);

        let simX = this.player.x + dir.x * (GAME_CONFIG.SURFER_SIZE + 6);
        let simY = this.player.y + dir.y * (GAME_CONFIG.SURFER_SIZE + 6);
        let simVx = dir.x * jumpSpeed + ast.driftVx;
        let simVy = dir.y * jumpSpeed + ast.driftVy;
        const simDt = 0.035;
        const steps = 18;

        ctx.save();
        for (let i = 1; i <= steps; i++) {
            simX += simVx * simDt;
            simY += simVy * simDt;

            const alpha = 1 - (i / steps);
            ctx.fillStyle = `rgba(0, 243, 255, ${alpha * 0.8})`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00f3ff';
            ctx.beginPath();
            ctx.arc(simX, simY, 2.5 * alpha + 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawSurfer(ctx) {
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        ctx.rotate(this.player.facingAngle);

        // Hoverboard glow
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#00f3ff';

        // Hoverboard
        ctx.fillStyle = '#0a192f';
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-10, 6, 20, 5, 2);
        ctx.fill();
        ctx.stroke();

        // Neon board fins
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-12, 7, 3, 3);
        ctx.fillRect(9, 7, 3, 3);

        // Jetpack / Backpack (Bright Cyan/Blue)
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#0066ff';
        ctx.fillStyle = '#0066ff';
        ctx.beginPath();
        ctx.roundRect(-8, -4, 5, 10, 2);
        ctx.fill();

        // Astronaut Body (White / Slate)
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(-3, -6, 12, 12, 4);
        ctx.fill();

        // Astronaut Visor (Neon Gold Reflection)
        ctx.fillStyle = '#ffd000';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffd000';
        ctx.beginPath();
        ctx.arc(4, -1, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Active Shield Glow Ring
        if (this.activePowerups.shield) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00f3ff';
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.75)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(2, 0, 19, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new MeteorSurfingGame();
});

