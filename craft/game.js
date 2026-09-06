/**
 * Voxel Craft 3D - Full 3D Infinite Voxel Minecraft Engine
 * Three.js + WebGL + Pointer Lock + Infinite Chunks + Procedural Structures + Physics + Audio
 */

// --- BLOCK DEFINITIONS ---
const BLOCKS = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    BRICKS: 6,
    GLASS: 7,
    DIAMOND: 8,
    TNT: 9,
    SAND: 10
};

const BLOCK_DEFS = {
    [BLOCKS.GRASS]: { name: 'Trawa', sound: 'GRASS', transparent: false },
    [BLOCKS.DIRT]: { name: 'Ziemia', sound: 'DIRT', transparent: false },
    [BLOCKS.STONE]: { name: 'Kamień', sound: 'STONE', transparent: false },
    [BLOCKS.WOOD]: { name: 'Drewno', sound: 'WOOD', transparent: false },
    [BLOCKS.LEAVES]: { name: 'Liście', sound: 'GRASS', transparent: true, opacity: 0.88 },
    [BLOCKS.BRICKS]: { name: 'Cegły', sound: 'STONE', transparent: false },
    [BLOCKS.GLASS]: { name: 'Szkło', sound: 'STONE', transparent: true, opacity: 0.5 },
    [BLOCKS.DIAMOND]: { name: 'Diament', sound: 'STONE', transparent: false },
    [BLOCKS.TNT]: { name: 'TNT', sound: 'DIRT', transparent: false }
};

// 9 Hotbar items mapping
const HOTBAR_ITEMS = [
    BLOCKS.GRASS,
    BLOCKS.DIRT,
    BLOCKS.STONE,
    BLOCKS.WOOD,
    BLOCKS.LEAVES,
    BLOCKS.BRICKS,
    BLOCKS.GLASS,
    BLOCKS.DIAMOND,
    BLOCKS.TNT
];

// --- TEXTURE GENERATOR (Procedural 16x16 Minecraft Textures) ---
class TextureGenerator {
    static createNoise(ctx, w, h, baseR, baseG, baseB, variance) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            const v = (Math.random() - 0.5) * variance;
            d[i] = Math.min(255, Math.max(0, baseR + v));
            d[i + 1] = Math.min(255, Math.max(0, baseG + v));
            d[i + 2] = Math.min(255, Math.max(0, baseB + v));
            d[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    static generateBlockTextures() {
        const textures = {};

        const makeCanvas = () => {
            const c = document.createElement('canvas');
            c.width = 16;
            c.height = 16;
            return c;
        };

        // 1. Dirt Texture
        const dirtC = makeCanvas();
        const dirtCtx = dirtC.getContext('2d');
        this.createNoise(dirtCtx, 16, 16, 120, 85, 55, 30);
        textures.dirt = new THREE.CanvasTexture(dirtC);
        textures.dirt.magFilter = THREE.NearestFilter;
        textures.dirt.minFilter = THREE.NearestFilter;

        // 2. Grass Top Texture
        const grassTopC = makeCanvas();
        const grassTopCtx = grassTopC.getContext('2d');
        this.createNoise(grassTopCtx, 16, 16, 90, 165, 55, 35);
        textures.grassTop = new THREE.CanvasTexture(grassTopC);
        textures.grassTop.magFilter = THREE.NearestFilter;
        textures.grassTop.minFilter = THREE.NearestFilter;

        // 3. Grass Side Texture
        const grassSideC = makeCanvas();
        const grassSideCtx = grassSideC.getContext('2d');
        this.createNoise(grassSideCtx, 16, 16, 120, 85, 55, 30);
        grassSideCtx.fillStyle = '#5aa437';
        for (let x = 0; x < 16; x++) {
            const h = 3 + Math.floor(Math.random() * 3);
            grassSideCtx.fillRect(x, 0, 1, h);
        }
        textures.grassSide = new THREE.CanvasTexture(grassSideC);
        textures.grassSide.magFilter = THREE.NearestFilter;
        textures.grassSide.minFilter = THREE.NearestFilter;

        // 4. Stone Texture
        const stoneC = makeCanvas();
        const stoneCtx = stoneC.getContext('2d');
        this.createNoise(stoneCtx, 16, 16, 130, 130, 130, 40);
        textures.stone = new THREE.CanvasTexture(stoneC);
        textures.stone.magFilter = THREE.NearestFilter;
        textures.stone.minFilter = THREE.NearestFilter;

        // 5. Wood Side Texture (Oak Log)
        const woodSideC = makeCanvas();
        const woodSideCtx = woodSideC.getContext('2d');
        this.createNoise(woodSideCtx, 16, 16, 105, 75, 45, 25);
        woodSideCtx.fillStyle = 'rgba(60, 40, 20, 0.4)';
        for (let x = 2; x < 16; x += 4) woodSideCtx.fillRect(x, 0, 1, 16);
        textures.woodSide = new THREE.CanvasTexture(woodSideC);
        textures.woodSide.magFilter = THREE.NearestFilter;
        textures.woodSide.minFilter = THREE.NearestFilter;

        // 6. Wood Top Texture (Rings)
        const woodTopC = makeCanvas();
        const woodTopCtx = woodTopC.getContext('2d');
        this.createNoise(woodTopCtx, 16, 16, 160, 130, 85, 20);
        woodTopCtx.strokeStyle = '#6a4a25';
        woodTopCtx.strokeRect(3, 3, 10, 10);
        woodTopCtx.strokeRect(6, 6, 4, 4);
        textures.woodTop = new THREE.CanvasTexture(woodTopC);
        textures.woodTop.magFilter = THREE.NearestFilter;
        textures.woodTop.minFilter = THREE.NearestFilter;

        // 7. Leaves Texture
        const leavesC = makeCanvas();
        const leavesCtx = leavesC.getContext('2d');
        this.createNoise(leavesCtx, 16, 16, 60, 140, 40, 45);
        textures.leaves = new THREE.CanvasTexture(leavesC);
        textures.leaves.magFilter = THREE.NearestFilter;
        textures.leaves.minFilter = THREE.NearestFilter;

        // 8. Bricks Texture
        const bricksC = makeCanvas();
        const bricksCtx = bricksC.getContext('2d');
        this.createNoise(bricksCtx, 16, 16, 165, 70, 55, 25);
        bricksCtx.fillStyle = '#d5d5d5';
        for (let y = 0; y < 16; y += 4) bricksCtx.fillRect(0, y, 16, 1);
        for (let y = 0; y < 16; y += 8) {
            bricksCtx.fillRect(0, y, 1, 4);
            bricksCtx.fillRect(8, y, 1, 4);
            bricksCtx.fillRect(4, y + 4, 1, 4);
            bricksCtx.fillRect(12, y + 4, 1, 4);
        }
        textures.bricks = new THREE.CanvasTexture(bricksC);
        textures.bricks.magFilter = THREE.NearestFilter;
        textures.bricks.minFilter = THREE.NearestFilter;

        // 9. Glass Texture
        const glassC = makeCanvas();
        const glassCtx = glassC.getContext('2d');
        glassCtx.fillStyle = 'rgba(180, 230, 255, 0.35)';
        glassCtx.fillRect(0, 0, 16, 16);
        glassCtx.fillStyle = '#ffffff';
        glassCtx.strokeRect(0, 0, 16, 16);
        glassCtx.fillRect(2, 2, 4, 1);
        glassCtx.fillRect(2, 3, 1, 3);
        textures.glass = new THREE.CanvasTexture(glassC);
        textures.glass.magFilter = THREE.NearestFilter;
        textures.glass.minFilter = THREE.NearestFilter;

        // 10. Diamond Ore Texture
        const diamondC = makeCanvas();
        const diamondCtx = diamondC.getContext('2d');
        this.createNoise(diamondCtx, 16, 16, 130, 130, 130, 40);
        diamondCtx.fillStyle = '#00f3ff';
        const gems = [[3, 4], [4, 4], [9, 11], [10, 11], [11, 4], [12, 5], [5, 9]];
        gems.forEach(([x, y]) => diamondCtx.fillRect(x, y, 2, 2));
        textures.diamond = new THREE.CanvasTexture(diamondC);
        textures.diamond.magFilter = THREE.NearestFilter;
        textures.diamond.minFilter = THREE.NearestFilter;

        // 11. TNT Side Texture
        const tntSideC = makeCanvas();
        const tntSideCtx = tntSideC.getContext('2d');
        tntSideCtx.fillStyle = '#cc2929';
        tntSideCtx.fillRect(0, 0, 16, 16);
        tntSideCtx.fillStyle = '#f0f0f0';
        tntSideCtx.fillRect(0, 5, 16, 6);
        tntSideCtx.fillStyle = '#000000';
        tntSideCtx.font = 'bold 5px sans-serif';
        tntSideCtx.fillText('TNT', 2, 10);
        textures.tntSide = new THREE.CanvasTexture(tntSideC);
        textures.tntSide.magFilter = THREE.NearestFilter;
        textures.tntSide.minFilter = THREE.NearestFilter;

        // 12. TNT Top Texture
        const tntTopC = makeCanvas();
        const tntTopCtx = tntTopC.getContext('2d');
        tntTopCtx.fillStyle = '#cc2929';
        tntTopCtx.fillRect(0, 0, 16, 16);
        tntTopCtx.fillStyle = '#333333';
        tntTopCtx.fillRect(7, 7, 2, 2);
        textures.tntTop = new THREE.CanvasTexture(tntTopC);
        textures.tntTop.magFilter = THREE.NearestFilter;
        textures.tntTop.minFilter = THREE.NearestFilter;

        return textures;
    }
}

// --- MAIN VOXEL CRAFT GAME ---
class VoxelCraftGame {
    constructor() {
        this.canvas = document.getElementById('webglCanvas');
        this.blocker = document.getElementById('blocker');
        this.startBtn = document.getElementById('startBtn');
        this.statusToast = document.getElementById('statusToast');
        this.coordsDisplay = document.getElementById('coordsDisplay');

        // Scene, Camera, Renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Sky & Fog
        this.skyColorDay = new THREE.Color(0x78a7ff);
        this.skyColorNight = new THREE.Color(0x060914);
        this.scene.background = this.skyColorDay.clone();
        this.scene.fog = new THREE.FogExp2(0x78a7ff, 0.016);

        // Lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfffaed, 0.85);
        this.sunLight.position.set(40, 70, 30);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 180;
        this.sunLight.shadow.camera.left = -45;
        this.sunLight.shadow.camera.right = 45;
        this.sunLight.shadow.camera.top = 45;
        this.sunLight.shadow.camera.bottom = -45;
        this.scene.add(this.sunLight);

        // --- INFINITE CHUNKS CONFIG ---
        this.CHUNK_SIZE = 16;
        this.CHUNK_HEIGHT = 24;
        this.RENDER_DISTANCE = 2; // 5x5 chunks around player (80x80 blocks area active)
        this.world = new Map(); // key "x,y,z" -> blockId
        this.generatedChunks = new Set(); // set of "cx,cz"
        this.activeChunks = new Map(); // "cx,cz" -> array of THREE.Mesh
        this.activeTntList = [];
        this.particles = [];

        // Materials cache
        this.textures = TextureGenerator.generateBlockTextures();
        this.materials = this.createMaterials();
        this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);

        // Highlight box for block targeting
        const wireframeGeom = new THREE.BoxGeometry(1.008, 1.008, 1.008);
        const wireframeMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
        this.highlightBox = new THREE.Mesh(wireframeGeom, wireframeMat);
        this.highlightBox.visible = false;
        this.scene.add(this.highlightBox);

        // Player state
        this.player = {
            x: 0.5,
            y: 14,
            z: 0.5,
            vx: 0,
            vy: 0,
            vz: 0,
            width: 0.6,
            height: 1.8,
            eyeHeight: 1.62,
            onGround: false,
            isFlying: false,
            yaw: 0,
            pitch: 0
        };

        // Controls
        this.keys = { forward: false, backward: false, left: false, right: false, jump: false, shift: false };
        this.isLocked = false;
        this.selectedSlot = 0; // 0 to 8
        this.raycaster = new THREE.Raycaster();
        this.targetedBlock = null;

        // Day/Night Cycle
        this.isNight = false;

        // Timing
        this.lastTime = performance.now();

        this.initUI();
        this.initEvents();

        // Generate initial chunks around spawn
        this.updateChunksAroundPlayer(true);

        // Position player on highest ground at spawn
        const startY = this.getHighestBlock(0, 0);
        this.player.y = Math.max(8, startY + 1.2);

        this.updateHotbarIcons();
        this.animate();
    }

    createMaterials() {
        const t = this.textures;
        return {
            [BLOCKS.GRASS]: [
                new THREE.MeshLambertMaterial({ map: t.grassSide }),
                new THREE.MeshLambertMaterial({ map: t.grassSide }),
                new THREE.MeshLambertMaterial({ map: t.grassTop }),
                new THREE.MeshLambertMaterial({ map: t.dirt }),
                new THREE.MeshLambertMaterial({ map: t.grassSide }),
                new THREE.MeshLambertMaterial({ map: t.grassSide })
            ],
            [BLOCKS.DIRT]: new THREE.MeshLambertMaterial({ map: t.dirt }),
            [BLOCKS.STONE]: new THREE.MeshLambertMaterial({ map: t.stone }),
            [BLOCKS.WOOD]: [
                new THREE.MeshLambertMaterial({ map: t.woodSide }),
                new THREE.MeshLambertMaterial({ map: t.woodSide }),
                new THREE.MeshLambertMaterial({ map: t.woodTop }),
                new THREE.MeshLambertMaterial({ map: t.woodTop }),
                new THREE.MeshLambertMaterial({ map: t.woodSide }),
                new THREE.MeshLambertMaterial({ map: t.woodSide })
            ],
            [BLOCKS.LEAVES]: new THREE.MeshLambertMaterial({ map: t.leaves, transparent: true, opacity: 0.9 }),
            [BLOCKS.BRICKS]: new THREE.MeshLambertMaterial({ map: t.bricks }),
            [BLOCKS.GLASS]: new THREE.MeshLambertMaterial({ map: t.glass, transparent: true, opacity: 0.5, depthWrite: false }),
            [BLOCKS.DIAMOND]: new THREE.MeshLambertMaterial({ map: t.diamond }),
            [BLOCKS.TNT]: [
                new THREE.MeshLambertMaterial({ map: t.tntSide }),
                new THREE.MeshLambertMaterial({ map: t.tntSide }),
                new THREE.MeshLambertMaterial({ map: t.tntTop }),
                new THREE.MeshLambertMaterial({ map: t.tntTop }),
                new THREE.MeshLambertMaterial({ map: t.tntSide }),
                new THREE.MeshLambertMaterial({ map: t.tntSide })
            ]
        };
    }

    // --- CONTINUOUS TERRAIN NOISE ---
    getTerrainHeight(x, z) {
        const h1 = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 4.2;
        const h2 = Math.sin(x * 0.18 + z * 0.12) * 2.2;
        const h3 = Math.cos(x * 0.04 - z * 0.04) * 2.8;
        return Math.max(3, Math.min(this.CHUNK_HEIGHT - 5, Math.floor(8 + h1 + h2 + h3)));
    }

    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    blockKey(x, y, z) {
        return `${x},${y},${z}`;
    }

    getBlock(x, y, z) {
        return this.world.get(this.blockKey(x, y, z)) || BLOCKS.AIR;
    }

    setBlockRaw(x, y, z, blockId) {
        const key = this.blockKey(x, y, z);
        if (blockId === BLOCKS.AIR) {
            this.world.delete(key);
        } else {
            this.world.set(key, blockId);
        }
    }

    // --- PROCEDURAL STRUCTURE GENERATION ---
    generateStructureInChunk(cx, cz) {
        // Pseudo-random deterministic hash based on chunk coordinates
        const hash = Math.sin(cx * 374761393 + cz * 668265263) * 43758.5453;
        const val = hash - Math.floor(hash);

        // Do not spawn structures right on top of spawn chunk (0,0)
        if (cx === 0 && cz === 0) return;

        // 14% chance to spawn a structure in this chunk!
        if (val < 0.14) {
            const startX = cx * this.CHUNK_SIZE + 4;
            const startZ = cz * this.CHUNK_SIZE + 4;
            const groundY = this.getTerrainHeight(startX + 2, startZ + 2);

            if (val < 0.05) {
                // 1. 🏰 Ancient Stone Tower (Wieża strażnicza ze skarbem)
                this.buildTower(startX, groundY, startZ);
            } else if (val < 0.10) {
                // 2. 🛖 Woodsman's Cabin (Chata drwala z kominkiem)
                this.buildCabin(startX, groundY, startZ);
            } else {
                // 3. 🏛️ Ancient Desert / Stone Shrine (Starożytna świątynia z ołtarzem)
                this.buildShrine(startX, groundY, startZ);
            }
        }
    }

    buildTower(tx, ty, tz) {
        const h = 12;
        // Outer stone & brick tower
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < 5; dx++) {
                for (let dz = 0; dz < 5; dz++) {
                    const isWall = (dx === 0 || dx === 4 || dz === 0 || dz === 4);
                    const b = (dy % 3 === 0) ? BLOCKS.BRICKS : BLOCKS.STONE;
                    const wx = tx + dx;
                    const wy = ty + dy;
                    const wz = tz + dz;

                    if (isWall) {
                        // Window slits at mid-height
                        if (dy === 5 && ((dx === 2 && (dz === 0 || dz === 4)) || (dz === 2 && (dx === 0 || dx === 4)))) {
                            this.setBlockRaw(wx, wy, wz, BLOCKS.GLASS);
                        } else if (dy === 1 && dx === 2 && dz === 0) {
                            // Door entrance
                            this.setBlockRaw(wx, wy, wz, BLOCKS.AIR);
                        } else {
                            this.setBlockRaw(wx, wy, wz, b);
                        }
                    } else {
                        // Interior platforms
                        if (dy === 0 || dy === 4 || dy === 8 || dy === h - 1) {
                            this.setBlockRaw(wx, wy, wz, BLOCKS.WOOD);
                        } else {
                            this.setBlockRaw(wx, wy, wz, BLOCKS.AIR);
                        }
                    }
                }
            }
        }

        // Battlements (Crenellations) on top
        for (let dx = 0; dx < 5; dx++) {
            for (let dz = 0; dz < 5; dz++) {
                if ((dx === 0 || dx === 4 || dz === 0 || dz === 4) && (dx % 2 === 0 || dz % 2 === 0)) {
                    this.setBlockRaw(tx + dx, ty + h, tz + dz, BLOCKS.STONE);
                }
            }
        }

        // Treasure at top platform!
        this.setBlockRaw(tx + 2, ty + h, tz + 2, BLOCKS.DIAMOND);
    }

    buildCabin(tx, ty, tz) {
        // 6x5 Cabin
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 6; dx++) {
                for (let dz = 0; dz < 5; dz++) {
                    const isCorner = (dx === 0 || dx === 5) && (dz === 0 || dz === 4);
                    const isWall = (dx === 0 || dx === 5 || dz === 0 || dz === 4);
                    const wx = tx + dx;
                    const wy = ty + dy;
                    const wz = tz + dz;

                    if (isCorner) {
                        this.setBlockRaw(wx, wy, wz, BLOCKS.WOOD);
                    } else if (isWall) {
                        if (dy === 1 && dx === 2 && dz === 0) {
                            this.setBlockRaw(wx, wy, wz, BLOCKS.AIR); // Doorway
                        } else if (dy === 2 && ((dx === 4 && dz === 0) || (dx === 2 && dz === 4))) {
                            this.setBlockRaw(wx, wy, wz, BLOCKS.GLASS); // Windows
                        } else {
                            this.setBlockRaw(wx, wy, wz, BLOCKS.WOOD);
                        }
                    } else {
                        if (dy === 0) this.setBlockRaw(wx, wy, wz, BLOCKS.WOOD); // Floor
                        else this.setBlockRaw(wx, wy, wz, BLOCKS.AIR);
                    }
                }
            }
        }

        // Brick Chimney
        for (let dy = 0; dy < 6; dy++) {
            this.setBlockRaw(tx + 4, ty + dy, tz + 3, BLOCKS.BRICKS);
        }

        // Wood Roof
        for (let dx = -1; dx <= 6; dx++) {
            for (let dz = -1; dz <= 5; dz++) {
                this.setBlockRaw(tx + dx, ty + 4, tz + dz, BLOCKS.WOOD);
            }
        }
    }

    buildShrine(tx, ty, tz) {
        // 7x7 Stone Shrine with pillars & central altar
        for (let dx = 0; dx < 7; dx++) {
            for (let dz = 0; dz < 7; dz++) {
                // Stone base
                this.setBlockRaw(tx + dx, ty, tz + dz, BLOCKS.STONE);
                // Roof
                this.setBlockRaw(tx + dx, ty + 4, tz + dz, BLOCKS.STONE);

                // Four Corner Pillars
                const isPillar = (dx === 1 || dx === 5) && (dz === 1 || dz === 5);
                if (isPillar) {
                    for (let dy = 1; dy <= 3; dy++) {
                        this.setBlockRaw(tx + dx, ty + dy, tz + dz, BLOCKS.BRICKS);
                    }
                }
            }
        }

        // Central Altar with Diamond and hidden TNT trap!
        this.setBlockRaw(tx + 3, ty, tz + 3, BLOCKS.TNT);
        this.setBlockRaw(tx + 3, ty + 1, tz + 3, BLOCKS.DIAMOND);
    }

    // --- CHUNK GENERATION & LIFECYCLE ---
    generateChunkData(cx, cz) {
        const startX = cx * this.CHUNK_SIZE;
        const startZ = cz * this.CHUNK_SIZE;

        for (let x = 0; x < this.CHUNK_SIZE; x++) {
            for (let z = 0; z < this.CHUNK_SIZE; z++) {
                const wx = startX + x;
                const wz = startZ + z;
                const groundY = this.getTerrainHeight(wx, wz);

                // Bedrock base
                this.setBlockRaw(wx, 0, wz, BLOCKS.STONE);

                // Underground stone layer
                for (let y = 1; y < groundY - 2; y++) {
                    if (y < 4 && Math.random() < 0.04) {
                        this.setBlockRaw(wx, y, wz, BLOCKS.DIAMOND);
                    } else {
                        this.setBlockRaw(wx, y, wz, BLOCKS.STONE);
                    }
                }

                // Dirt sub-layer
                for (let y = Math.max(1, groundY - 2); y < groundY; y++) {
                    this.setBlockRaw(wx, y, wz, BLOCKS.DIRT);
                }

                // Grass top
                this.setBlockRaw(wx, groundY, wz, BLOCKS.GRASS);

                // Trees (scattered)
                if (Math.random() < 0.02 && groundY < this.CHUNK_HEIGHT - 6) {
                    this.buildTree(wx, groundY + 1, wz);
                }
            }
        }

        // Generate special structures in this chunk
        this.generateStructureInChunk(cx, cz);
        this.generatedChunks.add(this.getChunkKey(cx, cz));
    }

    buildTree(tx, ty, tz) {
        const trunkH = 4 + Math.floor(Math.random() * 2);
        for (let y = 0; y < trunkH; y++) {
            this.setBlockRaw(tx, ty + y, tz, BLOCKS.WOOD);
        }
        const crownBase = ty + trunkH - 2;
        for (let lx = -2; lx <= 2; lx++) {
            for (let lz = -2; lz <= 2; lz++) {
                for (let ly = 0; ly <= 2; ly++) {
                    if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly === 2) continue;
                    const bx = tx + lx;
                    const by = crownBase + ly;
                    const bz = tz + lz;
                    if (this.getBlock(bx, by, bz) === BLOCKS.AIR) {
                        this.setBlockRaw(bx, by, bz, BLOCKS.LEAVES);
                    }
                }
            }
        }
    }

    // --- CHUNK MESH BUILDING WITH VISIBILITY CULLING ---
    buildChunkMeshes(cx, cz) {
        const startX = cx * this.CHUNK_SIZE;
        const startZ = cz * this.CHUNK_SIZE;
        const meshes = [];

        for (let x = 0; x < this.CHUNK_SIZE; x++) {
            for (let z = 0; z < this.CHUNK_SIZE; z++) {
                for (let y = 0; y < this.CHUNK_HEIGHT; y++) {
                    const wx = startX + x;
                    const wz = startZ + z;
                    const b = this.getBlock(wx, y, wz);
                    if (b === BLOCKS.AIR) continue;

                    // Visibility culling: only render block if at least 1 neighbor is AIR or transparent
                    const hasAirNeighbor = (
                        this.isBlockTransparent(wx + 1, y, wz) ||
                        this.isBlockTransparent(wx - 1, y, wz) ||
                        this.isBlockTransparent(wx, y + 1, wz) ||
                        this.isBlockTransparent(wx, y - 1, wz) ||
                        this.isBlockTransparent(wx, y, wz + 1) ||
                        this.isBlockTransparent(wx, y, wz - 1)
                    );

                    if (hasAirNeighbor) {
                        const mat = this.materials[b];
                        if (mat) {
                            const mesh = new THREE.Mesh(this.boxGeometry, mat);
                            mesh.position.set(wx + 0.5, y + 0.5, wz + 0.5);
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                            mesh.userData = { x: wx, y: y, z: wz, blockId: b, cx, cz };
                            this.scene.add(mesh);
                            meshes.push(mesh);
                        }
                    }
                }
            }
        }

        this.activeChunks.set(this.getChunkKey(cx, cz), meshes);
    }

    isBlockTransparent(x, y, z) {
        const b = this.getBlock(x, y, z);
        if (b === BLOCKS.AIR || b === BLOCKS.GLASS || b === BLOCKS.LEAVES) return true;
        return false;
    }

    unloadChunk(cx, cz) {
        const key = this.getChunkKey(cx, cz);
        const meshes = this.activeChunks.get(key);
        if (meshes) {
            for (const m of meshes) {
                this.scene.remove(m);
            }
            this.activeChunks.delete(key);
        }
    }

    // --- DYNAMIC CHUNK MANAGER ---
    updateChunksAroundPlayer(force = false) {
        const pcx = Math.floor(this.player.x / this.CHUNK_SIZE);
        const pcz = Math.floor(this.player.z / this.CHUNK_SIZE);

        if (!force && this.lastPcx === pcx && this.lastPcz === pcz) return;
        this.lastPcx = pcx;
        this.lastPcz = pcz;

        const R = this.RENDER_DISTANCE;

        // 1. Ensure required chunks exist and are active
        for (let dx = -R; dx <= R; dx++) {
            for (let dz = -R; dz <= R; dz++) {
                const cx = pcx + dx;
                const cz = pcz + dz;
                const key = this.getChunkKey(cx, cz);

                // Generate raw data if not yet created
                if (!this.generatedChunks.has(key)) {
                    this.generateChunkData(cx, cz);
                }

                // Build meshes if not yet active
                if (!this.activeChunks.has(key)) {
                    this.buildChunkMeshes(cx, cz);
                }
            }
        }

        // 2. Unload chunks that are too far away
        const unloadDistance = R + 1;
        for (const [key, meshes] of this.activeChunks.entries()) {
            const [cxStr, czStr] = key.split(',');
            const cx = parseInt(cxStr, 10);
            const cz = parseInt(czStr, 10);

            if (Math.abs(cx - pcx) > unloadDistance || Math.abs(cz - pcz) > unloadDistance) {
                this.unloadChunk(cx, cz);
            }
        }
    }

    getHighestBlock(x, z) {
        for (let y = this.CHUNK_HEIGHT; y >= 0; y--) {
            if (this.getBlock(x, y, z) !== BLOCKS.AIR) return y;
        }
        return 0;
    }

    // Interactive modification of single blocks
    setBlock(x, y, z, blockId) {
        this.setBlockRaw(x, y, z, blockId);

        // Rebuild visual meshes for the chunk containing this block
        const cx = Math.floor(x / this.CHUNK_SIZE);
        const cz = Math.floor(z / this.CHUNK_SIZE);
        this.unloadChunk(cx, cz);
        this.buildChunkMeshes(cx, cz);

        // If on border, also refresh adjacent chunk
        const localX = (x % this.CHUNK_SIZE + this.CHUNK_SIZE) % this.CHUNK_SIZE;
        const localZ = (z % this.CHUNK_SIZE + this.CHUNK_SIZE) % this.CHUNK_SIZE;
        if (localX === 0) { this.unloadChunk(cx - 1, cz); this.buildChunkMeshes(cx - 1, cz); }
        if (localX === this.CHUNK_SIZE - 1) { this.unloadChunk(cx + 1, cz); this.buildChunkMeshes(cx + 1, cz); }
        if (localZ === 0) { this.unloadChunk(cx, cz - 1); this.buildChunkMeshes(cx, cz - 1); }
        if (localZ === this.CHUNK_SIZE - 1) { this.unloadChunk(cx, cz + 1); this.buildChunkMeshes(cx, cz + 1); }
    }

    // --- TNT EXPLOSION LOGIC ---
    spawnActiveTnt(x, y, z) {
        this.setBlock(x, y, z, BLOCKS.AIR);
        window.craftSound.playTntFuse();

        const mat = this.materials[BLOCKS.TNT];
        const tntMesh = new THREE.Mesh(this.boxGeometry, mat);
        tntMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
        this.scene.add(tntMesh);

        this.activeTntList.push({
            mesh: tntMesh,
            x: x + 0.5,
            y: y + 0.5,
            z: z + 0.5,
            fuse: 2.6,
            flashTimer: 0
        });
        this.showToast('💣 TNT UZBROJONE! UCIEKAJ!');
    }

    explodeTnt(tnt) {
        this.scene.remove(tnt.mesh);
        window.craftSound.playExplosion();

        const blastRadius = 3.5;
        const bx = Math.floor(tnt.x);
        const by = Math.floor(tnt.y);
        const bz = Math.floor(tnt.z);

        for (let dx = -4; dx <= 4; dx++) {
            for (let dy = -4; dy <= 4; dy++) {
                for (let dz = -4; dz <= 4; dz++) {
                    const dist = Math.hypot(dx, dy, dz);
                    if (dist <= blastRadius) {
                        const targetX = bx + dx;
                        const targetY = by + dy;
                        const targetZ = bz + dz;
                        const b = this.getBlock(targetX, targetY, targetZ);
                        if (b !== BLOCKS.AIR && targetY > 0) {
                            this.setBlockRaw(targetX, targetY, targetZ, BLOCKS.AIR);
                            this.createDebris(targetX + 0.5, targetY + 0.5, targetZ + 0.5, 0x888888, 2);
                        }
                    }
                }
            }
        }

        // Refresh affected chunks
        const cx = Math.floor(bx / this.CHUNK_SIZE);
        const cz = Math.floor(bz / this.CHUNK_SIZE);
        for (let dcx = -1; dcx <= 1; dcx++) {
            for (let dcz = -1; dcz <= 1; dcz++) {
                if (this.activeChunks.has(this.getChunkKey(cx + dcx, cz + dcz))) {
                    this.unloadChunk(cx + dcx, cz + dcz);
                    this.buildChunkMeshes(cx + dcx, cz + dcz);
                }
            }
        }

        // Push player
        const pDist = Math.hypot(this.player.x - tnt.x, this.player.y - tnt.y, this.player.z - tnt.z);
        if (pDist < 7) {
            const force = (7 - pDist) * 3.5;
            const dirX = (this.player.x - tnt.x) / (pDist || 1);
            const dirZ = (this.player.z - tnt.z) / (pDist || 1);
            this.player.vx += dirX * force;
            this.player.vy += 8;
            this.player.vz += dirZ * force;
        }

        this.createDebris(tnt.x, tnt.y, tnt.z, 0xff3300, 30);
    }

    createDebris(x, y, z, colorHex, count = 10) {
        const geom = new THREE.BoxGeometry(0.18, 0.18, 0.18);
        const mat = new THREE.MeshBasicMaterial({ color: colorHex });
        for (let i = 0; i < count; i++) {
            const m = new THREE.Mesh(geom, mat);
            m.position.set(x, y, z);
            this.scene.add(m);
            this.particles.push({
                mesh: m,
                vx: (Math.random() - 0.5) * 8,
                vy: Math.random() * 8 + 2,
                vz: (Math.random() - 0.5) * 8,
                life: 0.8 + Math.random() * 0.4
            });
        }
    }

    // --- PLAYER PHYSICS & COLLISION ---
    updatePhysics(dt) {
        const p = this.player;

        if (p.isFlying) {
            const flySpeed = 15;
            const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
            const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);

            let moveX = 0;
            let moveZ = 0;
            let moveY = 0;

            if (this.keys.forward) { moveX += forward.x; moveZ += forward.z; }
            if (this.keys.backward) { moveX -= forward.x; moveZ -= forward.z; }
            if (this.keys.right) { moveX += right.x; moveZ += right.z; }
            if (this.keys.left) { moveX -= right.x; moveZ -= right.z; }
            if (this.keys.jump) moveY += 1;
            if (this.keys.shift) moveY -= 1;

            const len = Math.hypot(moveX, moveZ);
            if (len > 0) {
                p.x += (moveX / len) * flySpeed * dt;
                p.z += (moveZ / len) * flySpeed * dt;
            }
            p.y += moveY * flySpeed * dt;
            p.vx = 0;
            p.vy = 0;
            p.vz = 0;

            this.updateChunksAroundPlayer();
            return;
        }

        // Walking physics
        const walkSpeed = 6.5;
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);

        let inputX = 0;
        let inputZ = 0;

        if (this.keys.forward) { inputX += forward.x; inputZ += forward.z; }
        if (this.keys.backward) { inputX -= forward.x; inputZ -= forward.z; }
        if (this.keys.right) { inputX += right.x; inputZ += right.z; }
        if (this.keys.left) { inputX -= right.x; inputZ -= right.z; }

        const inputLen = Math.hypot(inputX, inputZ);
        if (inputLen > 0) {
            p.vx = (inputX / inputLen) * walkSpeed;
            p.vz = (inputZ / inputLen) * walkSpeed;

            if (p.onGround && Math.random() < 0.05) {
                const bUnder = this.getBlock(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z));
                const def = BLOCK_DEFS[bUnder];
                window.craftSound.playStep(def ? def.sound : 'GRASS');
            }
        } else {
            p.vx *= 0.7;
            p.vz *= 0.7;
        }

        // Gravity
        p.vy -= 24 * dt;
        if (p.vy < -35) p.vy = -35;

        // Jump
        if (this.keys.jump && p.onGround) {
            p.vy = 8.8;
            p.onGround = false;
            window.craftSound.playStep('WOOD');
        }

        p.x += p.vx * dt;
        this.resolveCollision('x');

        p.z += p.vz * dt;
        this.resolveCollision('z');

        p.y += p.vy * dt;
        p.onGround = false;
        this.resolveCollision('y');

        // Check if chunks need to be loaded at new position
        this.updateChunksAroundPlayer();

        // Void safety
        if (p.y < -10) {
            p.y = this.getHighestBlock(Math.floor(p.x), Math.floor(p.z)) + 2;
            p.vy = 0;
        }
    }

    resolveCollision(axis) {
        const p = this.player;
        const halfW = p.width / 2;

        const minX = Math.floor(p.x - halfW);
        const maxX = Math.floor(p.x + halfW);
        const minY = Math.floor(p.y);
        const maxY = Math.floor(p.y + p.height);
        const minZ = Math.floor(p.z - halfW);
        const maxZ = Math.floor(p.z + halfW);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const block = this.getBlock(x, y, z);
                    if (block !== BLOCKS.AIR) {
                        if (axis === 'y') {
                            if (p.vy < 0) {
                                p.y = y + 1;
                                p.vy = 0;
                                p.onGround = true;
                            } else if (p.vy > 0) {
                                p.y = y - p.height;
                                p.vy = 0;
                            }
                        } else if (axis === 'x') {
                            const blockAbove = this.getBlock(x, y + 1, z);
                            if (p.onGround && blockAbove === BLOCKS.AIR && y === Math.floor(p.y)) {
                                p.y = y + 1;
                                return;
                            }
                            if (p.vx > 0) p.x = x - halfW - 0.001;
                            else if (p.vx < 0) p.x = x + 1 + halfW + 0.001;
                            p.vx = 0;
                        } else if (axis === 'z') {
                            const blockAbove = this.getBlock(x, y + 1, z);
                            if (p.onGround && blockAbove === BLOCKS.AIR && y === Math.floor(p.y)) {
                                p.y = y + 1;
                                return;
                            }
                            if (p.vz > 0) p.z = z - halfW - 0.001;
                            else if (p.vz < 0) p.z = z + 1 + halfW + 0.001;
                            p.vz = 0;
                        }
                    }
                }
            }
        }
    }

    // --- RAYCASTING & BLOCK INTERACTION ---
    updateTargeting() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        // Gather active meshes from current and adjacent chunks
        const candidateMeshes = [];
        const pcx = Math.floor(this.player.x / this.CHUNK_SIZE);
        const pcz = Math.floor(this.player.z / this.CHUNK_SIZE);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const meshes = this.activeChunks.get(this.getChunkKey(pcx + dx, pcz + dz));
                if (meshes) {
                    for (let i = 0; i < meshes.length; i++) candidateMeshes.push(meshes[i]);
                }
            }
        }

        const intersects = this.raycaster.intersectObjects(candidateMeshes, false);

        if (intersects.length > 0 && intersects[0].distance < 6.5) {
            const hit = intersects[0];
            const mesh = hit.object;
            const d = mesh.userData;

            this.targetedBlock = {
                x: d.x,
                y: d.y,
                z: d.z,
                blockId: d.blockId,
                faceNormal: hit.face.normal
            };

            this.highlightBox.position.set(d.x + 0.5, d.y + 0.5, d.z + 0.5);
            this.highlightBox.visible = true;
        } else {
            this.targetedBlock = null;
            this.highlightBox.visible = false;
        }
    }

    breakTargetedBlock() {
        if (!this.targetedBlock) return;
        const { x, y, z, blockId } = this.targetedBlock;

        if (blockId === BLOCKS.TNT) {
            this.spawnActiveTnt(x, y, z);
            return;
        }

        const def = BLOCK_DEFS[blockId];
        window.craftSound.playBreak(def ? def.sound : 'STONE');
        this.createDebris(x + 0.5, y + 0.5, z + 0.5, 0x88bb55, 12);
        this.setBlock(x, y, z, BLOCKS.AIR);
    }

    placeBlock() {
        if (!this.targetedBlock) return;
        const { x, y, z, faceNormal } = this.targetedBlock;
        const placeX = x + Math.round(faceNormal.x);
        const placeY = y + Math.round(faceNormal.y);
        const placeZ = z + Math.round(faceNormal.z);

        const p = this.player;
        const halfW = p.width / 2;
        const intersectsPlayer = (
            placeX >= Math.floor(p.x - halfW) &&
            placeX <= Math.floor(p.x + halfW) &&
            placeY >= Math.floor(p.y) &&
            placeY <= Math.floor(p.y + p.height) &&
            placeZ >= Math.floor(p.z - halfW) &&
            placeZ <= Math.floor(p.z + halfW)
        );

        if (intersectsPlayer) return;

        const blockToPlace = HOTBAR_ITEMS[this.selectedSlot];
        this.setBlock(placeX, placeY, placeZ, blockToPlace);
        window.craftSound.playPlace();
    }

    // --- DAY / NIGHT TOGGLE ---
    toggleDayNight() {
        this.isNight = !this.isNight;
        const timeBtn = document.getElementById('timeBtn');

        if (this.isNight) {
            timeBtn.textContent = '🌙 NOC';
            this.scene.background = this.skyColorNight.clone();
            this.scene.fog.color = this.skyColorNight.clone();
            this.ambientLight.intensity = 0.12;
            this.sunLight.intensity = 0.15;
            this.sunLight.color.setHex(0x3355aa);
            this.showToast('Noc zapadła w krainie Voxel Craft');
        } else {
            timeBtn.textContent = '☀️ DZIEŃ';
            this.scene.background = this.skyColorDay.clone();
            this.scene.fog.color = this.skyColorDay.clone();
            this.ambientLight.intensity = 0.45;
            this.sunLight.intensity = 0.85;
            this.sunLight.color.setHex(0xfffaed);
            this.showToast('Świt rozświetlił krainę!');
        }
    }

    toggleFlyMode() {
        this.player.isFlying = !this.player.isFlying;
        const flyBtn = document.getElementById('flyBtn');
        flyBtn.textContent = this.player.isFlying ? '🪽 LOT: WŁ' : '🪽 LOT: WYŁ';
        flyBtn.classList.toggle('active', this.player.isFlying);
        this.showToast(this.player.isFlying ? 'Tryb Latania WŁĄCZONY (WASD + Spacja/Shift)' : 'Tryb Latania WYŁĄCZONY');
    }

    showToast(msg) {
        this.statusToast.textContent = msg;
        this.statusToast.style.opacity = '1';
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.statusToast.style.opacity = '0';
        }, 2500);
    }

    selectSlot(idx) {
        if (idx < 0 || idx > 8) return;
        this.selectedSlot = idx;
        const slots = document.querySelectorAll('.hotbar-slot');
        slots.forEach((s, i) => s.classList.toggle('active', i === idx));
        window.craftSound.playSelect();
    }

    updateHotbarIcons() {
        const itemColors = {
            [BLOCKS.GRASS]: '#5aa437',
            [BLOCKS.DIRT]: '#855b35',
            [BLOCKS.STONE]: '#8c8c8c',
            [BLOCKS.WOOD]: '#6a4a25',
            [BLOCKS.LEAVES]: '#2d7a1f',
            [BLOCKS.BRICKS]: '#b84a39',
            [BLOCKS.GLASS]: '#aae4ff',
            [BLOCKS.DIAMOND]: '#00f3ff',
            [BLOCKS.TNT]: '#cc2929'
        };

        HOTBAR_ITEMS.forEach((blockId, i) => {
            const iconCanvas = document.getElementById(`icon${i}`);
            if (iconCanvas) {
                const ctx = iconCanvas.getContext('2d');
                iconCanvas.width = 28;
                iconCanvas.height = 28;

                ctx.fillStyle = itemColors[blockId] || '#ffffff';
                ctx.fillRect(0, 0, 28, 28);
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.strokeRect(0, 0, 28, 28);

                if (blockId === BLOCKS.GRASS) {
                    ctx.fillStyle = '#855b35';
                    ctx.fillRect(0, 14, 28, 14);
                } else if (blockId === BLOCKS.TNT) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 10, 28, 8);
                    ctx.fillStyle = '#000000';
                    ctx.font = 'bold 7px sans-serif';
                    ctx.fillText('TNT', 6, 17);
                }
            }
        });
    }

    // --- EVENTS & POINTER LOCK ---
    initEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        const lockPointer = () => {
            window.craftSound.ensureContext();
            this.canvas.requestPointerLock();
        };

        this.startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            lockPointer();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = (document.pointerLockElement === this.canvas);
            this.blocker.classList.toggle('hidden', this.isLocked);
        });

        // Mouse Look
        document.addEventListener('mousemove', (e) => {
            if (!this.isLocked) return;
            const sensitivity = 0.0022;
            this.player.yaw -= e.movementX * sensitivity;
            this.player.pitch -= e.movementY * sensitivity;

            const maxPitch = Math.PI / 2 - 0.05;
            this.player.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.player.pitch));
        });

        // Mouse Click (LPM: Dig, PPM: Place)
        window.addEventListener('mousedown', (e) => {
            if (!this.isLocked) return;
            if (e.button === 0) {
                this.breakTargetedBlock();
            } else if (e.button === 2) {
                this.placeBlock();
            }
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (e.target.closest && e.target.closest('.hud-btn')) return;
            window.craftSound.ensureContext();

            switch (e.code) {
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'Space':
                    e.preventDefault();
                    this.keys.jump = true;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys.shift = true;
                    break;
                case 'KeyF':
                    this.toggleFlyMode();
                    break;
                case 'KeyM':
                    this.toggleSound();
                    break;
                case 'KeyH':
                    this.blocker.classList.remove('hidden');
                    if (document.exitPointerLock) document.exitPointerLock();
                    break;
                case 'Digit1': this.selectSlot(0); break;
                case 'Digit2': this.selectSlot(1); break;
                case 'Digit3': this.selectSlot(2); break;
                case 'Digit4': this.selectSlot(3); break;
                case 'Digit5': this.selectSlot(4); break;
                case 'Digit6': this.selectSlot(5); break;
                case 'Digit7': this.selectSlot(6); break;
                case 'Digit8': this.selectSlot(7); break;
                case 'Digit9': this.selectSlot(8); break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
                case 'Space': this.keys.jump = false; break;
                case 'ShiftLeft':
                case 'ShiftRight': this.keys.shift = false; break;
            }
        });

        window.addEventListener('wheel', (e) => {
            if (e.deltaY > 0) {
                this.selectSlot((this.selectedSlot + 1) % 9);
            } else if (e.deltaY < 0) {
                this.selectSlot((this.selectedSlot - 1 + 9) % 9);
            }
        }, { passive: true });
    }

    initUI() {
        document.querySelectorAll('.hotbar-slot').forEach(slot => {
            slot.addEventListener('click', (e) => {
                const idx = parseInt(slot.getAttribute('data-slot'), 10);
                this.selectSlot(idx);
            });
        });

        document.getElementById('timeBtn').addEventListener('click', () => this.toggleDayNight());
        document.getElementById('flyBtn').addEventListener('click', () => this.toggleFlyMode());
        document.getElementById('soundBtn').addEventListener('click', () => this.toggleSound());
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.blocker.classList.remove('hidden');
            if (document.exitPointerLock) document.exitPointerLock();
        });
    }

    toggleSound() {
        const isMuted = window.craftSound.toggleMute();
        const btn = document.getElementById('soundBtn');
        btn.textContent = isMuted ? '🔇' : '🔊';
        btn.style.borderColor = isMuted ? '#ff007b' : 'rgba(255, 255, 255, 0.18)';
    }

    // --- MAIN ANIMATION LOOP ---
    animate() {
        requestAnimationFrame(() => this.animate());

        const now = performance.now();
        let dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        if (dt > 0.1) dt = 0.1;

        if (this.isLocked) {
            this.updatePhysics(dt);
            this.updateTargeting();
        }

        // Camera Position & Rotation
        const p = this.player;
        this.camera.position.set(p.x, p.y + p.eyeHeight, p.z);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = p.yaw;
        this.camera.rotation.x = p.pitch;

        // Update Sun & Shadow follow player
        this.sunLight.position.set(p.x + 40, p.y + 70, p.z + 30);
        this.sunLight.target.position.set(p.x, p.y, p.z);
        this.sunLight.target.updateMatrixWorld();

        // Update Coordinates HUD
        const pcx = Math.floor(p.x / this.CHUNK_SIZE);
        const pcz = Math.floor(p.z / this.CHUNK_SIZE);
        if (this.coordsDisplay) {
            this.coordsDisplay.textContent = `XYZ: ${Math.floor(p.x)} / ${Math.floor(p.y)} / ${Math.floor(p.z)} | Chunk: [${pcx}, ${pcz}] | Aktywne chunki: ${this.activeChunks.size}`;
        }

        // Update TNT items
        for (let i = this.activeTntList.length - 1; i >= 0; i--) {
            const tnt = this.activeTntList[i];
            tnt.fuse -= dt;
            tnt.flashTimer += dt * 10;
            tnt.mesh.scale.set(1 + Math.sin(tnt.flashTimer) * 0.08, 1 + Math.sin(tnt.flashTimer) * 0.08, 1 + Math.sin(tnt.flashTimer) * 0.08);

            if (tnt.fuse <= 0) {
                this.explodeTnt(tnt);
                this.activeTntList.splice(i, 1);
            }
        }

        // Update Debris Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.life -= dt;
            pt.mesh.position.x += pt.vx * dt;
            pt.mesh.position.y += pt.vy * dt;
            pt.mesh.position.z += pt.vz * dt;
            pt.vy -= 18 * dt;

            if (pt.life <= 0) {
                this.scene.remove(pt.mesh);
                this.particles.splice(i, 1);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Launch game when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.craftGameInstance = new VoxelCraftGame();
});
