/**
 * Subway Surfers - Metro Runner
 * World Generation, Track Chunks, Obstacles, and Collectibles
 */

class WorldManager {
    constructor(scene) {
        this.scene = scene;

        // Constants
        this.LANE_WIDTH = 3.2;
        this.LANES = [-this.LANE_WIDTH, 0, this.LANE_WIDTH]; // Left: -3.2, Mid: 0, Right: 3.2
        this.CHUNK_LENGTH = 60;
        this.ACTIVE_CHUNKS = 6;

        // Pools & Trackers
        this.chunks = [];
        this.nextChunkZ = 0;
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.movingTrains = [];

        // Track generation difficulty
        this.difficulty = 1.0;
        this.lastPowerupDist = 0;
    }

    init() {
        // Initialize GameModels materials
        GameModels.initMaterials();

        // Build Environment Scenery (Subway walls, tunnel arches, skybox)
        this.buildDistantEnvironment();

        // Initial Chunks (first 2 chunks are safe runway with coins)
        for (let i = 0; i < this.ACTIVE_CHUNKS; i++) {
            const isSafe = i < 2;
            this.spawnChunk(isSafe);
        }
    }

    buildDistantEnvironment() {
        // Distant City Skyline Silhouettes
        const cityGroup = new THREE.Group();
        const bldgMat = new THREE.MeshBasicMaterial({ color: 0x121722 });

        for (let i = 0; i < 40; i++) {
            const w = 8 + Math.random() * 12;
            const h = 25 + Math.random() * 45;
            const d = 8 + Math.random() * 12;
            const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bldgMat);

            const side = i % 2 === 0 ? -1 : 1;
            const x = side * (26 + Math.random() * 35);
            const z = -i * 30;
            bldg.position.set(x, h / 2 - 5, z);
            cityGroup.add(bldg);
        }
        this.cityGroup = cityGroup;
        this.scene.add(cityGroup);
    }

    /**
     * Spawn a 60-unit track chunk
     */
    spawnChunk(isSafe = false) {
        const chunkZ = this.nextChunkZ;
        this.nextChunkZ -= this.CHUNK_LENGTH;

        const chunkGroup = new THREE.Group();
        chunkGroup.position.z = chunkZ;

        // 1. Ballast Ground
        const groundGeo = new THREE.PlaneGeometry(16, this.CHUNK_LENGTH);
        groundGeo.rotateX(-Math.PI / 2);
        const ground = new THREE.Mesh(groundGeo, GameModels.materials.ballastGround);
        ground.position.set(0, -0.05, -this.CHUNK_LENGTH / 2);
        chunkGroup.add(ground);

        // 2. Rails & Sleepers for all 3 lanes
        this.LANES.forEach(laneX => {
            // Two steel rails per lane
            const railGeo = new THREE.BoxGeometry(0.08, 0.12, this.CHUNK_LENGTH);
            const railL = new THREE.Mesh(railGeo, GameModels.materials.railSteel);
            railL.position.set(laneX - 0.75, 0.05, -this.CHUNK_LENGTH / 2);
            const railR = new THREE.Mesh(railGeo, GameModels.materials.railSteel);
            railR.position.set(laneX + 0.75, 0.05, -this.CHUNK_LENGTH / 2);
            chunkGroup.add(railL);
            chunkGroup.add(railR);

            // Wooden sleepers every 1.5 units
            const sleeperGeo = new THREE.BoxGeometry(1.9, 0.08, 0.32);
            for (let z = 0; z < this.CHUNK_LENGTH; z += 1.6) {
                const sleeper = new THREE.Mesh(sleeperGeo, GameModels.materials.sleeperWood);
                sleeper.position.set(laneX, 0.02, -z);
                chunkGroup.add(sleeper);
            }
        });

        // 3. Sidewalls with Graffiti
        const wallGeo = new THREE.BoxGeometry(0.8, 5.5, this.CHUNK_LENGTH);
        const leftWall = new THREE.Mesh(wallGeo, GameModels.materials.wallBrick);
        leftWall.position.set(-7.5, 2.7, -this.CHUNK_LENGTH / 2);
        const rightWall = new THREE.Mesh(wallGeo, GameModels.materials.wallBrick);
        rightWall.position.set(7.5, 2.7, -this.CHUNK_LENGTH / 2);
        chunkGroup.add(leftWall);
        chunkGroup.add(rightWall);

        // 4. Overhead Gantry Arches
        const archInterval = 20;
        for (let z = 10; z < this.CHUNK_LENGTH; z += archInterval) {
            const archGroup = new THREE.Group();
            archGroup.position.set(0, 0, -z);

            // Top Crossbar
            const barGeo = new THREE.BoxGeometry(15.5, 0.4, 0.4);
            const barMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.position.y = 5.2;
            archGroup.add(bar);

            // Left & Right Support Posts
            const postGeo = new THREE.BoxGeometry(0.4, 5.4, 0.4);
            const pL = new THREE.Mesh(postGeo, barMat);
            pL.position.set(-7.2, 2.6, 0);
            const pR = new THREE.Mesh(postGeo, barMat);
            pR.position.set(7.2, 2.6, 0);
            archGroup.add(pL);
            archGroup.add(pR);

            // Hanging Track Signals (Red/Green lights)
            [-this.LANE_WIDTH, 0, this.LANE_WIDTH].forEach(x => {
                const sigGeo = new THREE.BoxGeometry(0.3, 0.6, 0.2);
                const sig = new THREE.Mesh(sigGeo, new THREE.MeshBasicMaterial({ color: 0x1e293b }));
                sig.position.set(x, 4.6, 0);
                const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
                bulb.position.set(x, 4.45, 0.12);
                archGroup.add(sig);
                archGroup.add(bulb);
            });

            chunkGroup.add(archGroup);
        }

        this.scene.add(chunkGroup);

        const chunkData = {
            group: chunkGroup,
            zStart: chunkZ,
            zEnd: chunkZ - this.CHUNK_LENGTH,
            obstacles: [],
            coins: [],
            powerups: []
        };

        // Populate chunk with obstacles and collectibles
        if (!isSafe) {
            this.populateChunk(chunkData);
        } else {
            // Just friendly introductory coin lines
            this.spawnCoinLine(0, chunkZ - 10, chunkZ - 50, 0.8, chunkData);
        }

        this.chunks.push(chunkData);
    }

    /**
     * Procedurally generate balanced, fair, and exciting obstacles per chunk
     */
    populateChunk(chunkData) {
        const zStart = chunkData.zStart;

        // Split chunk into 2 sections (~30 units each)
        for (let s = 0; s < 2; s++) {
            const sectionCenterZ = zStart - (15 + s * 30);
            const laneTypes = this.generateLanePattern();

            // Spawn obstacles for each lane
            laneTypes.forEach((type, laneIdx) => {
                const laneX = this.LANES[laneIdx];
                const obsZ = sectionCenterZ;

                if (type === 'train') {
                    // Decide if stationary with ramp, or moving
                    const hasRamp = Math.random() < 0.45;
                    const trainData = GameModels.createTrain(18, hasRamp, Math.random() > 0.5 ? 'red' : 'blue');
                    trainData.group.position.set(laneX, 0, obsZ);
                    this.scene.add(trainData.group);

                    const obsRecord = {
                        mesh: trainData.group,
                        type: 'train',
                        laneX,
                        z: obsZ,
                        width: trainData.width,
                        height: trainData.height,
                        length: trainData.length,
                        hasRamp,
                        rampZStart: obsZ + trainData.length / 2 + 3.0,
                        rampZEnd: obsZ + trainData.length / 2 - 0.5,
                        chunk: chunkData
                    };
                    this.obstacles.push(obsRecord);
                    chunkData.obstacles.push(obsRecord);

                    // Coins on top of train!
                    const trainCoinsZStart = obsZ + trainData.length / 2 - 2;
                    const trainCoinsZEnd = obsZ - trainData.length / 2 + 2;
                    this.spawnCoinLine(laneX, trainCoinsZStart, trainCoinsZEnd, trainData.height + 0.8, chunkData);

                    // Coins climbing the ramp if present
                    if (hasRamp) {
                        for (let rz = obsZ + trainData.length / 2 + 2.5; rz >= obsZ + trainData.length / 2; rz -= 1.4) {
                            const progress = 1 - (rz - (obsZ + trainData.length / 2)) / 2.5;
                            const ry = 0.8 + progress * (trainData.height - 0.8);
                            this.spawnSingleCoin(laneX, ry, rz, chunkData);
                        }
                    }

                } else if (type === 'movingTrain') {
                    const trainData = GameModels.createTrain(16, false, 'blue');
                    trainData.group.position.set(laneX, 0, obsZ - 15); // starts further ahead and moves towards runner!
                    this.scene.add(trainData.group);

                    const obsRecord = {
                        mesh: trainData.group,
                        type: 'movingTrain',
                        laneX,
                        z: obsZ - 15,
                        speed: 7.0 + this.difficulty * 2.0, // moving towards player
                        width: trainData.width,
                        height: trainData.height,
                        length: trainData.length,
                        hasRamp: false,
                        chunk: chunkData
                    };
                    this.obstacles.push(obsRecord);
                    this.movingTrains.push(obsRecord);
                    chunkData.obstacles.push(obsRecord);

                } else if (type === 'lowBarrier') {
                    const barData = GameModels.createLowBarrier();
                    barData.group.position.set(laneX, 0, obsZ);
                    this.scene.add(barData.group);

                    const obsRecord = {
                        mesh: barData.group,
                        type: 'lowBarrier',
                        laneX,
                        z: obsZ,
                        width: barData.width,
                        height: barData.height,
                        length: 0.8,
                        chunk: chunkData
                    };
                    this.obstacles.push(obsRecord);
                    chunkData.obstacles.push(obsRecord);

                    // Coin Arc over the hurdle! (Teaches player to jump)
                    this.spawnCoinArc(laneX, obsZ + 4, obsZ - 4, 3.2, chunkData);

                } else if (type === 'highBarrier') {
                    const barData = GameModels.createHighBarrier();
                    barData.group.position.set(laneX, 0, obsZ);
                    this.scene.add(barData.group);

                    const obsRecord = {
                        mesh: barData.group,
                        type: 'highBarrier',
                        laneX,
                        z: obsZ,
                        width: barData.width,
                        height: barData.height,
                        clearance: barData.clearance,
                        length: 0.8,
                        chunk: chunkData
                    };
                    this.obstacles.push(obsRecord);
                    chunkData.obstacles.push(obsRecord);

                    // Low coin line underneath (encourages rolling!)
                    this.spawnCoinLine(laneX, obsZ + 3, obsZ - 3, 0.45, chunkData);

                } else if (type === 'blockade') {
                    const blockData = GameModels.createFullBlockade();
                    blockData.group.position.set(laneX, 0, obsZ);
                    this.scene.add(blockData.group);

                    const obsRecord = {
                        mesh: blockData.group,
                        type: 'blockade',
                        laneX,
                        z: obsZ,
                        width: blockData.width,
                        height: blockData.height,
                        length: 1.2,
                        chunk: chunkData
                    };
                    this.obstacles.push(obsRecord);
                    chunkData.obstacles.push(obsRecord);

                } else if (type === 'empty') {
                    // Open lane: Spawn straight coin line or occasional power-up!
                    const shouldSpawnPowerup = Math.random() < 0.25 && (Math.abs(obsZ - this.lastPowerupDist) > 70);
                    if (shouldSpawnPowerup) {
                        this.lastPowerupDist = obsZ;
                        const pTypes = ['magnet', 'jetpack', 'sneakers', 'multiplier'];
                        const chosenP = pTypes[Math.floor(Math.random() * pTypes.length)];
                        this.spawnPowerup(laneX, 1.3, obsZ, chosenP, chunkData);
                    } else {
                        this.spawnCoinLine(laneX, obsZ + 8, obsZ - 8, 0.8, chunkData);
                    }
                }
            });
        }

        // Sky coins for Jetpack mode!
        if (Math.random() < 0.6) {
            const skyLane = this.LANES[Math.floor(Math.random() * 3)];
            this.spawnCoinLine(skyLane, zStart - 10, zStart - 50, 7.8, chunkData);
        }
    }

    /**
     * Lane pattern generator to ensure 100% fair and playable runs:
     * Never block all 3 lanes completely. At least 1 clear path or jump/roll solution!
     */
    generateLanePattern() {
        const patterns = [
            ['train', 'lowBarrier', 'empty'],
            ['empty', 'highBarrier', 'train'],
            ['lowBarrier', 'empty', 'movingTrain'],
            ['train', 'empty', 'highBarrier'],
            ['blockade', 'empty', 'lowBarrier'],
            ['empty', 'train', 'empty'],
            ['highBarrier', 'empty', 'lowBarrier'],
            ['lowBarrier', 'train', 'empty'],
            ['movingTrain', 'empty', 'train']
        ];

        // Shuffle lanes occasionally
        const chosen = patterns[Math.floor(Math.random() * patterns.length)].slice();
        for (let i = chosen.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
        }
        return chosen;
    }

    spawnSingleCoin(x, y, z, chunkData) {
        const coinObj = GameModels.createCoin();
        coinObj.group.position.set(x, y, z);
        this.scene.add(coinObj.group);

        const record = {
            mesh: coinObj.group,
            x,
            y,
            z,
            collected: false,
            chunk: chunkData
        };
        this.coins.push(record);
        chunkData.coins.push(record);
    }

    spawnCoinLine(x, zStart, zEnd, y, chunkData) {
        const step = 2.0;
        const count = Math.floor(Math.abs(zStart - zEnd) / step);
        const dir = zEnd < zStart ? -1 : 1;

        for (let i = 0; i <= count; i++) {
            const z = zStart + i * step * dir;
            this.spawnSingleCoin(x, y, z, chunkData);
        }
    }

    spawnCoinArc(x, zStart, zEnd, peakY, chunkData) {
        const count = 7;
        for (let i = 0; i <= count; i++) {
            const t = i / count;
            const z = zStart + (zEnd - zStart) * t;
            // Parabola: y = 0.8 + 4 * peak * t * (1 - t)
            const y = 0.8 + (peakY - 0.8) * 4 * t * (1 - t);
            this.spawnSingleCoin(x, y, z, chunkData);
        }
    }

    spawnPowerup(x, y, z, type, chunkData) {
        const pObj = GameModels.createPowerup(type);
        pObj.group.position.set(x, y, z);
        this.scene.add(pObj.group);

        const record = {
            mesh: pObj.group,
            type,
            x,
            y,
            z,
            collected: false,
            chunk: chunkData
        };
        this.powerups.push(record);
        chunkData.powerups.push(record);
    }

    /**
     * Update chunks relative to player position:
     * Recycle old chunks behind player and spawn new chunks ahead
     */
    update(playerZ, delta, difficulty) {
        this.difficulty = difficulty;

        // Update moving oncoming trains
        for (let i = this.movingTrains.length - 1; i >= 0; i--) {
            const train = this.movingTrains[i];
            train.z += train.speed * delta; // move towards +Z
            train.mesh.position.z = train.z;

            // Remove moving train if past behind player
            if (train.z > playerZ + 25) {
                this.movingTrains.splice(i, 1);
            }
        }

        // Animate coins (spin & gentle bob)
        const time = performance.now() * 0.003;
        this.coins.forEach(coin => {
            if (!coin.collected) {
                coin.mesh.rotation.y += 3.2 * delta;
            }
        });

        // Animate powerups (spin & vertical hover float)
        this.powerups.forEach(p => {
            if (!p.collected) {
                p.mesh.rotation.y += 2.5 * delta;
                p.mesh.position.y = p.y + Math.sin(time * 3 + p.z) * 0.18;
            }
        });

        // Track city background position with player
        if (this.cityGroup) {
            this.cityGroup.position.z = playerZ * 0.4; // parallax effect
        }

        // Chunk recycling: Check first chunk in queue
        if (this.chunks.length > 0) {
            const oldestChunk = this.chunks[0];
            // If player has moved past this chunk by 30 units
            if (playerZ < oldestChunk.zEnd - 20) {
                this.removeChunk(oldestChunk);
                this.chunks.shift();
                this.spawnChunk(false);
            }
        }
    }

    removeChunk(chunkData) {
        // Remove scene meshes
        this.scene.remove(chunkData.group);

        // Remove obstacles
        chunkData.obstacles.forEach(obs => {
            this.scene.remove(obs.mesh);
            const idx = this.obstacles.indexOf(obs);
            if (idx !== -1) this.obstacles.splice(idx, 1);
        });

        // Remove coins
        chunkData.coins.forEach(c => {
            this.scene.remove(c.mesh);
            const idx = this.coins.indexOf(c);
            if (idx !== -1) this.coins.splice(idx, 1);
        });

        // Remove powerups
        chunkData.powerups.forEach(p => {
            this.scene.remove(p.mesh);
            const idx = this.powerups.indexOf(p);
            if (idx !== -1) this.powerups.splice(idx, 1);
        });
    }

    reset() {
        // Clean up all active chunks & obstacles
        this.chunks.forEach(chunk => {
            this.scene.remove(chunk.group);
            chunk.obstacles.forEach(obs => this.scene.remove(obs.mesh));
            chunk.coins.forEach(c => this.scene.remove(c.mesh));
            chunk.powerups.forEach(p => this.scene.remove(p.mesh));
        });

        this.chunks = [];
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.movingTrains = [];
        this.nextChunkZ = 0;
        this.lastPowerupDist = 0;

        // Re-spawn safe starting runway
        for (let i = 0; i < this.ACTIVE_CHUNKS; i++) {
            const isSafe = i < 2;
            this.spawnChunk(isSafe);
        }
    }
}

window.WorldManager = WorldManager;
