/**
 * Cyber Snake - Modern Neon Snake Engine
 * Smooth interpolated movement, power-ups, audio synthesis, high-juice visual effects.
 */

// Canvas roundRect polyfill
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

const GRID_SIZE = 22; // 22x22 grid
const VIRTUAL_RES = 660; // Internal canvas resolution
const TILE_SIZE = VIRTUAL_RES / GRID_SIZE; // 30px per tile

// Directions
const DIRS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

// Power-up definitions
const PICKUP_TYPES = {
    FOOD: { id: 'food', name: 'Neon Core', color: '#39ff14', glow: '#39ff14', icon: '⚡' },
    CRYSTAL: { id: 'crystal', name: 'Kryształ Czasu', color: '#ff00d4', glow: '#ff00d4', icon: '💎', duration: 8 },
    GHOST: { id: 'ghost', name: 'Faza Ducha', color: '#00f3ff', glow: '#00f3ff', icon: '👻', duration: 6 },
    OVERCLOCK: { id: 'overclock', name: 'Doładowanie', color: '#ffd700', glow: '#ffd700', icon: '⚡', duration: 6 },
    SLOW_MO: { id: 'slow_mo', name: 'Spowolnienie', color: '#00d2ff', glow: '#00d2ff', icon: '❄', duration: 6 }
};

class Particle {
    constructor(x, y, vx, vy, color, size, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
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
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * progress, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class CyberSnakeGame {
    constructor() {
        this.canvas = document.getElementById('snakeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = VIRTUAL_RES;
        this.canvas.height = VIRTUAL_RES;

        // Modes: 'WRAP' (Screen wrap / edge pass) or 'CLASSIC' (Walls kill)
        this.mode = 'WRAP';

        // State: 'PLAYING', 'GAME_OVER'
        this.state = 'PLAYING';

        // Snake Data: array of {x, y, prevX, prevY}
        this.snake = [];
        this.dir = DIRS.RIGHT;
        this.nextDirs = []; // Input buffer
        this.growPending = 0;

        // Collectibles
        this.food = { x: 0, y: 0 };
        this.bonus = null; // { x, y, type, timer, maxTimer }

        // Active Power-ups
        this.activePowerups = {
            ghost: 0,
            overclock: 0,
            slow_mo: 0
        };

        // Score & Stats
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('cyber_snake_best') || '0', 10);
        this.combo = 1;
        this.foodEaten = 0;
        this.maxLength = 3;

        // Timing & Speed (Zrelaksowane, kontrolowane tempo)
        this.baseTickInterval = 0.22; // ~4.5 kroków na sekundę
        this.tickTimer = 0;
        this.lastFrameTime = performance.now();
        this.screenShake = 0;

        // Particles & Visual Waves
        this.particles = [];
        this.shockwaves = [];

        // DOM elements
        this.dom = {
            scoreVal: document.getElementById('scoreVal'),
            bestVal: document.getElementById('bestVal'),
            lengthVal: document.getElementById('lengthVal'),
            comboVal: document.getElementById('comboVal'),
            modeWrapBtn: document.getElementById('modeWrapBtn'),
            modeClassicBtn: document.getElementById('modeClassicBtn'),
            powerupPill: document.getElementById('powerupPill'),
            powerupIcon: document.getElementById('powerupIcon'),
            powerupText: document.getElementById('powerupText'),
            powerupTimer: document.getElementById('powerupTimer'),
            gameOverModal: document.getElementById('gameOverModal'),
            finalScoreVal: document.getElementById('finalScoreVal'),
            bestModalVal: document.getElementById('bestModalVal'),
            maxLengthVal: document.getElementById('maxLengthVal'),
            foodEatenVal: document.getElementById('foodEatenVal'),
            modeNameVal: document.getElementById('modeNameVal'),
            newRecordBadge: document.getElementById('newRecordBadge'),
            restartBtn: document.getElementById('restartBtn'),
            soundBtn: document.getElementById('soundBtn'),
            btnUp: document.getElementById('btnUp'),
            btnDown: document.getElementById('btnDown'),
            btnLeft: document.getElementById('btnLeft'),
            btnRight: document.getElementById('btnRight')
        };

        this.initEvents();
        this.resetGame();
        this.loop();
    }

    initEvents() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (e.target.closest && e.target.closest('#soundBtn')) return;

            window.snakeSound.ensureContext();

            if (this.state === 'GAME_OVER') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    this.resetGame();
                }
                return;
            }

            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    e.preventDefault();
                    this.queueDirection(DIRS.UP);
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    e.preventDefault();
                    this.queueDirection(DIRS.DOWN);
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    e.preventDefault();
                    this.queueDirection(DIRS.LEFT);
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    e.preventDefault();
                    this.queueDirection(DIRS.RIGHT);
                    break;
                case 'KeyM':
                    this.toggleSound();
                    break;
            }
        });

        // Touch D-Pad buttons
        const bindTouchBtn = (elem, dir) => {
            if (!elem) return;
            const trigger = (e) => {
                e.preventDefault();
                window.snakeSound.ensureContext();
                if (this.state === 'GAME_OVER') {
                    this.resetGame();
                } else {
                    this.queueDirection(dir);
                }
            };
            elem.addEventListener('mousedown', trigger);
            elem.addEventListener('touchstart', trigger, { passive: false });
        };

        bindTouchBtn(this.dom.btnUp, DIRS.UP);
        bindTouchBtn(this.dom.btnDown, DIRS.DOWN);
        bindTouchBtn(this.dom.btnLeft, DIRS.LEFT);
        bindTouchBtn(this.dom.btnRight, DIRS.RIGHT);

        // Swipe gestures on canvas
        let touchStartX = 0;
        let touchStartY = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.state === 'GAME_OVER') {
                this.resetGame();
                return;
            }
            if (e.changedTouches.length > 0) {
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                if (Math.hypot(dx, dy) > 25) {
                    if (Math.abs(dx) > Math.abs(dy)) {
                        this.queueDirection(dx > 0 ? DIRS.RIGHT : DIRS.LEFT);
                    } else {
                        this.queueDirection(dy > 0 ? DIRS.DOWN : DIRS.UP);
                    }
                }
            }
        }, { passive: true });

        // Mode tabs
        this.dom.modeWrapBtn.addEventListener('click', () => {
            this.setMode('WRAP');
        });
        this.dom.modeClassicBtn.addEventListener('click', () => {
            this.setMode('CLASSIC');
        });

        // Restart button
        this.dom.restartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetGame();
        });

        // Sound button
        this.dom.soundBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSound();
        });
    }

    setMode(newMode) {
        if (this.mode === newMode) return;
        this.mode = newMode;
        if (newMode === 'WRAP') {
            this.dom.modeWrapBtn.classList.add('active');
            this.dom.modeClassicBtn.classList.remove('active');
        } else {
            this.dom.modeClassicBtn.classList.add('active');
            this.dom.modeWrapBtn.classList.remove('active');
        }
        this.resetGame();
    }

    toggleSound() {
        const isMuted = window.snakeSound.toggleMute();
        this.dom.soundBtn.textContent = isMuted ? '🔇' : '🔊';
        this.dom.soundBtn.style.borderColor = isMuted ? '#ff007b' : 'rgba(255, 255, 255, 0.15)';
    }

    queueDirection(newDir) {
        const lastDir = this.nextDirs.length > 0 ? this.nextDirs[this.nextDirs.length - 1] : this.dir;
        // Prevent 180° reverse
        if (newDir.x !== -lastDir.x || newDir.y !== -lastDir.y) {
            if (this.nextDirs.length < 2) {
                this.nextDirs.push(newDir);
                window.snakeSound.playTurn();
            }
        }
    }

    resetGame() {
        this.state = 'PLAYING';
        this.snake = [
            { x: 10, y: 11, prevX: 9, prevY: 11 },
            { x: 9, y: 11, prevX: 8, prevY: 11 },
            { x: 8, y: 11, prevX: 7, prevY: 11 }
        ];
        this.dir = DIRS.RIGHT;
        this.nextDirs = [];
        this.growPending = 0;
        this.score = 0;
        this.combo = 1;
        this.foodEaten = 0;
        this.maxLength = 3;
        this.tickTimer = 0;
        this.bonus = null;
        this.particles = [];
        this.shockwaves = [];
        this.screenShake = 0;

        this.activePowerups = { ghost: 0, overclock: 0, slow_mo: 0 };

        this.dom.gameOverModal.classList.remove('visible');
        this.dom.newRecordBadge.style.display = 'none';
        this.dom.powerupPill.style.display = 'none';

        this.spawnFood();
        this.updateHUD();
    }

    spawnFood() {
        const freeSpots = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const onSnake = this.snake.some(s => s.x === x && s.y === y);
                const onBonus = this.bonus && this.bonus.x === x && this.bonus.y === y;
                if (!onSnake && !onBonus) {
                    freeSpots.push({ x, y });
                }
            }
        }
        if (freeSpots.length > 0) {
            const spot = freeSpots[Math.floor(Math.random() * freeSpots.length)];
            this.food = spot;
        }
    }

    spawnBonus() {
        if (this.bonus) return;
        const freeSpots = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const onSnake = this.snake.some(s => s.x === x && s.y === y);
                const onFood = this.food.x === x && this.food.y === y;
                if (!onSnake && !onFood) {
                    freeSpots.push({ x, y });
                }
            }
        }
        if (freeSpots.length === 0) return;

        const spot = freeSpots[Math.floor(Math.random() * freeSpots.length)];
        const types = [PICKUP_TYPES.CRYSTAL, PICKUP_TYPES.GHOST, PICKUP_TYPES.OVERCLOCK, PICKUP_TYPES.SLOW_MO];
        const chosen = types[Math.floor(Math.random() * types.length)];

        this.bonus = {
            x: spot.x,
            y: spot.y,
            type: chosen,
            timer: chosen.duration || 8,
            maxTimer: chosen.duration || 8
        };
    }

    // --- GAME LOOP ---
    loop() {
        requestAnimationFrame(() => this.loop());

        const now = performance.now();
        let dt = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        if (dt > 0.1) dt = 0.1;

        this.update(dt);
        this.render();
    }

    getTickInterval() {
        // Delikatne, kontrolowane przyspieszanie wraz z długością węża
        const speedBoost = Math.min(0.06, (this.snake.length - 3) * 0.001);
        let interval = this.baseTickInterval - speedBoost;
        if (this.activePowerups.slow_mo > 0) interval *= 1.5;
        if (this.activePowerups.overclock > 0) interval *= 0.85;
        return Math.max(0.12, interval);
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        // Power-ups countdown
        if (this.activePowerups.ghost > 0) this.activePowerups.ghost -= dt;
        if (this.activePowerups.overclock > 0) this.activePowerups.overclock -= dt;
        if (this.activePowerups.slow_mo > 0) this.activePowerups.slow_mo -= dt;

        // Bonus item countdown
        if (this.bonus) {
            this.bonus.timer -= dt;
            if (this.bonus.timer <= 0) {
                this.bonus = null;
            }
        }

        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake -= dt * 18;
            if (this.screenShake < 0) this.screenShake = 0;
        }

        // Particles & shockwaves
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            this.shockwaves[i].r += dt * 140;
            this.shockwaves[i].alpha -= dt * 2.2;
            if (this.shockwaves[i].alpha <= 0) this.shockwaves.splice(i, 1);
        }

        // Tick accumulation z nowym zrelaksowanym interwałem
        const interval = this.getTickInterval();
        this.tickTimer += dt;
        if (this.tickTimer >= interval) {
            this.tickTimer -= interval;
            this.tick();
        }

        this.updatePowerupBadge();
    }

    tick() {
        // Pop next buffered direction if any
        if (this.nextDirs.length > 0) {
            this.dir = this.nextDirs.shift();
        }

        const head = this.snake[0];
        let newX = head.x + this.dir.x;
        let newY = head.y + this.dir.y;

        // Edge handling
        if (this.mode === 'WRAP') {
            newX = (newX + GRID_SIZE) % GRID_SIZE;
            newY = (newY + GRID_SIZE) % GRID_SIZE;
        } else {
            // CLASSIC mode: walls are deadly
            if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) {
                this.triggerGameOver('Zderzenie ze ścianą laserową!');
                return;
            }
        }

        // Self-collision check (bypassed if Ghost Phase is active)
        const isGhost = this.activePowerups.ghost > 0;
        if (!isGhost) {
            // Check collision with all segments except tail tip if not growing
            const checkLimit = this.growPending > 0 ? this.snake.length : this.snake.length - 1;
            for (let i = 0; i < checkLimit; i++) {
                if (this.snake[i].x === newX && this.snake[i].y === newY) {
                    this.triggerGameOver('Ugryzienie własnego ogona!');
                    return;
                }
            }
        }

        // Record previous positions for smooth interpolation
        const newHead = { x: newX, y: newY, prevX: head.x, prevY: head.y };

        // Save prev for all existing segments
        for (let i = 0; i < this.snake.length; i++) {
            this.snake[i].prevX = this.snake[i].x;
            this.snake[i].prevY = this.snake[i].y;
        }

        this.snake.unshift(newHead);

        if (this.snake.length > this.maxLength) {
            this.maxLength = this.snake.length;
        }

        // Food consumption
        if (newX === this.food.x && newY === this.food.y) {
            this.consumeFood();
        } else if (this.bonus && newX === this.bonus.x && newY === this.bonus.y) {
            this.consumeBonus();
        } else if (this.growPending > 0) {
            this.growPending--;
        } else {
            this.snake.pop();
        }
    }

    consumeFood() {
        this.foodEaten++;
        const multiplier = this.activePowerups.overclock > 0 ? this.combo * 2 : this.combo;
        const pts = 100 * multiplier;
        this.score += pts;
        this.growPending++;

        window.snakeSound.playEat(this.combo);
        this.addEatParticles(this.food.x, this.food.y, '#39ff14');
        this.addShockwave(this.food.x, this.food.y, '#39ff14');

        // Chance to spawn special bonus item
        if (Math.random() < 0.22 && !this.bonus) {
            this.spawnBonus();
        }

        this.spawnFood();
        this.updateHUD();
    }

    consumeBonus() {
        const b = this.bonus;
        const type = b.type;
        window.snakeSound.playBonusEat();

        this.addEatParticles(b.x, b.y, type.color, 30);
        this.addShockwave(b.x, b.y, type.color);

        if (type.id === 'crystal') {
            const bonusPts = Math.floor(600 * (b.timer / b.maxTimer) + 200) * this.combo;
            this.score += bonusPts;
        } else if (type.id === 'ghost') {
            this.activePowerups.ghost = type.duration;
            window.snakeSound.playPowerup();
        } else if (type.id === 'overclock') {
            this.activePowerups.overclock = type.duration;
            window.snakeSound.playPowerup();
        } else if (type.id === 'slow_mo') {
            this.activePowerups.slow_mo = type.duration;
            window.snakeSound.playPowerup();
        }

        this.bonus = null;
        this.updateHUD();
    }

    triggerGameOver(reason) {
        if (this.state === 'GAME_OVER') return;
        this.state = 'GAME_OVER';
        window.snakeSound.playDie();

        this.screenShake = 14;
        const head = this.snake[0];
        this.addEatParticles(head.x, head.y, '#ff007b', 40);

        let isNewRecord = false;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('cyber_snake_best', this.bestScore.toString());
            isNewRecord = true;
        }

        this.dom.finalScoreVal.textContent = this.score.toLocaleString();
        this.dom.bestModalVal.textContent = this.bestScore.toLocaleString();
        this.dom.maxLengthVal.textContent = this.maxLength;
        this.dom.foodEatenVal.textContent = this.foodEaten;
        this.dom.modeNameVal.textContent = this.mode === 'WRAP' ? 'PRZENIKANIE' : 'ŚCIANY';

        if (isNewRecord && this.score > 0) {
            this.dom.newRecordBadge.style.display = 'inline-block';
        }

        setTimeout(() => {
            this.dom.gameOverModal.classList.add('visible');
        }, 120);
    }

    addEatParticles(gx, gy, color, count = 20) {
        const cx = gx * TILE_SIZE + TILE_SIZE / 2;
        const cy = gy * TILE_SIZE + TILE_SIZE / 2;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 120;
            this.particles.push(new Particle(
                cx, cy,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                color, 3.5 + Math.random() * 2, 0.45
            ));
        }
    }

    addShockwave(gx, gy, color) {
        const cx = gx * TILE_SIZE + TILE_SIZE / 2;
        const cy = gy * TILE_SIZE + TILE_SIZE / 2;
        this.shockwaves.push({ x: cx, y: cy, r: 8, color: color, alpha: 0.8 });
    }

    updatePowerupBadge() {
        let activeKey = null;
        let timeLeft = 0;

        if (this.activePowerups.ghost > 0) {
            activeKey = 'GHOST';
            timeLeft = this.activePowerups.ghost;
        } else if (this.activePowerups.overclock > 0) {
            activeKey = 'OVERCLOCK';
            timeLeft = this.activePowerups.overclock;
        } else if (this.activePowerups.slow_mo > 0) {
            activeKey = 'SLOW_MO';
            timeLeft = this.activePowerups.slow_mo;
        }

        if (activeKey) {
            const def = PICKUP_TYPES[activeKey];
            this.dom.powerupPill.style.display = 'flex';
            this.dom.powerupPill.style.borderColor = def.color;
            this.dom.powerupPill.style.color = def.color;
            this.dom.powerupIcon.textContent = def.icon;
            this.dom.powerupText.textContent = def.name.toUpperCase();
            this.dom.powerupTimer.textContent = `${Math.ceil(timeLeft)}s`;
        } else {
            this.dom.powerupPill.style.display = 'none';
        }
    }

    updateHUD() {
        this.dom.scoreVal.textContent = this.score.toLocaleString();
        this.dom.bestVal.textContent = this.bestScore.toLocaleString();
        this.dom.lengthVal.textContent = this.snake.length;
        const mult = this.activePowerups.overclock > 0 ? this.combo * 2 : this.combo;
        this.dom.comboVal.textContent = `x${mult}`;
    }

    // --- RENDERING ---
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, VIRTUAL_RES, VIRTUAL_RES);

        // Screen shake
        let sx = 0;
        let sy = 0;
        if (this.screenShake > 0) {
            sx = (Math.random() - 0.5) * this.screenShake;
            sy = (Math.random() - 0.5) * this.screenShake;
        }

        ctx.save();
        ctx.translate(sx, sy);

        // 1. Draw Cyber Grid
        this.drawGrid(ctx);

        // 2. Draw Shockwaves
        for (const sw of this.shockwaves) {
            ctx.save();
            ctx.globalAlpha = sw.alpha;
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = sw.color;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Draw Collectibles
        this.drawCollectibles(ctx);

        // 4. Draw Snake with smooth interpolation
        this.drawSnake(ctx);

        // 5. Draw Particles
        for (const p of this.particles) {
            p.draw(ctx);
        }

        // 6. Draw Danger Frame if CLASSIC mode
        if (this.mode === 'CLASSIC') {
            ctx.strokeStyle = 'rgba(255, 0, 123, 0.45)';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ff007b';
            ctx.strokeRect(2, 2, VIRTUAL_RES - 4, VIRTUAL_RES - 4);
        }

        ctx.restore();
    }

    drawGrid(ctx) {
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.045)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            const pos = i * TILE_SIZE;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, VIRTUAL_RES);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(VIRTUAL_RES, pos);
            ctx.stroke();
        }
    }

    drawCollectibles(ctx) {
        const time = Date.now() * 0.005;

        // Standard Neon Core
        const fx = this.food.x * TILE_SIZE + TILE_SIZE / 2;
        const fy = this.food.y * TILE_SIZE + TILE_SIZE / 2;
        const pulse = Math.sin(time) * 2.5 + 8;

        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#39ff14';
        ctx.fillStyle = '#39ff14';

        // Outer pulse ring
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fx, fy, pulse + 5, 0, Math.PI * 2);
        ctx.stroke();

        // Core orb
        ctx.beginPath();
        ctx.arc(fx, fy, pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fx, fy, pulse * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Rare Bonus Pickup
        if (this.bonus) {
            const b = this.bonus;
            const bx = b.x * TILE_SIZE + TILE_SIZE / 2;
            const by = b.y * TILE_SIZE + TILE_SIZE / 2;
            const bPulse = Math.sin(time * 1.5) * 3 + 10;

            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = b.type.glow;
            ctx.strokeStyle = b.type.color;
            ctx.lineWidth = 2.5;

            // Timer countdown arc around bonus
            const timerRatio = Math.max(0, b.timer / b.maxTimer);
            ctx.beginPath();
            ctx.arc(bx, by, bPulse + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerRatio);
            ctx.stroke();

            // Background pill
            ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
            ctx.beginPath();
            ctx.arc(bx, by, bPulse, 0, Math.PI * 2);
            ctx.fill();

            // Icon
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.type.icon, bx, by + 1);

            ctx.restore();
        }
    }

    drawSnake(ctx) {
        if (this.snake.length === 0) return;

        const interval = this.getTickInterval();
        const interp = Math.min(1.0, this.tickTimer / interval);
        const isGhost = this.activePowerups.ghost > 0;
        const isOverclock = this.activePowerups.overclock > 0;

        // Color theme
        let bodyColor = '#00f3ff';
        let spineColor = '#39ff14';
        let glowColor = '#00f3ff';

        if (isGhost) {
            bodyColor = 'rgba(189, 0, 255, 0.7)';
            spineColor = '#00f3ff';
            glowColor = '#bd00ff';
        } else if (isOverclock) {
            bodyColor = '#ffd700';
            spineColor = '#ffffff';
            glowColor = '#ffd700';
        }

        // Calculate visual pixel positions of each segment
        const visualPoints = [];
        for (let i = 0; i < this.snake.length; i++) {
            const seg = this.snake[i];
            let px = seg.prevX;
            let py = seg.prevY;
            let cx = seg.x;
            let cy = seg.y;

            // Prevent unnatural visual streaks across wrap edges
            if (Math.abs(cx - px) > 1) px = cx;
            if (Math.abs(cy - py) > 1) py = cy;

            const interpolatedX = px + (cx - px) * interp;
            const interpolatedY = py + (cy - py) * interp;

            visualPoints.push({
                x: interpolatedX * TILE_SIZE + TILE_SIZE / 2,
                y: interpolatedY * TILE_SIZE + TILE_SIZE / 2
            });
        }

        // 1. Draw Snake Body Segments (Back to front)
        for (let i = visualPoints.length - 1; i >= 0; i--) {
            const pt = visualPoints[i];
            const sizeProgress = 1 - (i / visualPoints.length) * 0.35; // Tapering tail
            const segRadius = (TILE_SIZE * 0.44) * sizeProgress;

            ctx.save();
            ctx.shadowBlur = i === 0 ? 22 : 12;
            ctx.shadowColor = glowColor;

            // Segment Circle/Capsule
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(3, segRadius), 0, Math.PI * 2);
            ctx.fill();

            // Inner Spine dot
            ctx.fillStyle = spineColor;
            ctx.shadowBlur = 6;
            ctx.shadowColor = spineColor;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(1.5, segRadius * 0.4), 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // 2. Draw Snake Head Optics / Sensors
        const headPt = visualPoints[0];
        ctx.save();
        ctx.translate(headPt.x, headPt.y);

        // Angle from current direction
        const headAngle = Math.atan2(this.dir.y, this.dir.x);
        ctx.rotate(headAngle);

        // Visor Cockpit
        ctx.fillStyle = '#0a1024';
        ctx.strokeStyle = spineColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = spineColor;
        ctx.beginPath();
        ctx.roundRect(-4, -6, 12, 12, 3);
        ctx.fill();
        ctx.stroke();

        // Twin Optic Sensors (Eyes)
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffffff';

        ctx.beginPath();
        ctx.arc(5, -3, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(5, 3, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.snakeGameInstance = new CyberSnakeGame();
});

