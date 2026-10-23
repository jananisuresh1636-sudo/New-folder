/**
 * Subway Surfers - Metro Runner
 * Main Game Engine, Physics, Collision, Character Animation, & Particles
 */

class SubwayRunnerGame {
    constructor() {
        this.container = document.getElementById('game-container');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Three.js Core
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Subsystems
        this.world = null;
        this.player = null;
        this.chaser = null;
        this.particles = [];

        // Game State
        this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
        this.currentSpeed = 22.0;
        this.baseSpeed = 22.0;
        this.maxSpeed = 46.0;
        this.speedIncreaseRate = 0.45; // speed ramps up over time
        this.score = 0;
        this.coinsCollected = 0;
        this.multiplier = 1;
        this.baseMultiplier = 1;
        this.distanceTraveled = 0;

        // Player Rig & Physics
        this.currentLane = 1; // 0: Left (-3.2), 1: Center (0), 2: Right (3.2)
        this.targetX = 0;
        this.posX = 0;
        this.posY = 0;
        this.posZ = 0;
        this.velocityY = 0;
        this.gravity = -38.0;
        this.isGrounded = true;
        this.currentGroundY = 0; // can be 0 or train roof height (3.4)

        // Actions
        this.isRolling = false;
        this.rollTimer = 0;
        this.rollDuration = 0.75;
        this.jumpPower = 14.5;
        this.superSneakersJump = 21.0;

        // Active Power-ups state & timers
        this.activePowerups = {
            magnet: 0,
            jetpack: 0,
            sneakers: 0,
            multiplier: 0,
            hoverboard: 0
        };

        // Upgrades durations (in seconds, read from UI/localStorage)
        this.upgradeDurations = {
            magnet: 10,
            jetpack: 8,
            sneakers: 12,
            multiplier: 15
        };

        // Hoverboard & Shield
        this.hasHoverboardActive = false;
        this.hoverboardStock = 3;

        // Inspector Chaser mechanics
        this.chaserDistance = 7.5; // normal safe chase distance
        this.chaserTargetDistance = 7.5;
        this.stumbleCount = 0;
        this.lastStumbleTime = 0;

        // Animation timing
        this.runCycle = 0;
        this.selectedCharacter = 'jake';

        // Camera shake
        this.cameraShakeIntensity = 0;
    }

    init() {
        // 1. Setup Three.js Scene, Camera, & WebGL Renderer
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

        this.camera = new THREE.PerspectiveCamera(65, this.width / this.height, 0.1, 400);
        this.camera.position.set(0, 4.2, 5.5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 2. Lighting (Sunlight + Ambient subway rim lights)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.65);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfff3d6, 1.2);
        dirLight.position.set(15, 30, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 120;
        this.scene.add(dirLight);

        // 3. Initialize World
        this.world = new WorldManager(this.scene);
        this.world.init();

        // 4. Initialize Player Model
        this.setupPlayer(this.selectedCharacter);

        // 5. Initialize Chasing Inspector & Pitbull
        this.setupChaser();

        // 6. Window Resize Handler
        window.addEventListener('resize', () => this.onWindowResize());

        // 7. Start Render Loop
        this.animate();
    }

    setupPlayer(characterId) {
        if (this.player && this.player.root) {
            this.scene.remove(this.player.root);
        }
        this.selectedCharacter = characterId;
        this.player = GameModels.createPlayerCharacter(characterId);
        this.scene.add(this.player.root);
        this.player.root.position.set(0, 0, 0);
    }

    setupChaser() {
        if (this.chaser && this.chaser.group) {
            this.scene.remove(this.chaser.group);
        }
        this.chaser = GameModels.createInspectorAndDog();
        this.scene.add(this.chaser.group);
        this.chaser.group.position.set(0, 0, this.chaserDistance);
    }

    startNewGame() {
        this.state = 'PLAYING';
        this.score = 0;
        this.coinsCollected = 0;
        this.multiplier = this.baseMultiplier;
        this.currentSpeed = this.baseSpeed;
        this.distanceTraveled = 0;

        this.currentLane = 1;
        this.targetX = 0;
        this.posX = 0;
        this.posY = 0;
        this.posZ = 0;
        this.velocityY = 0;
        this.isGrounded = true;
        this.currentGroundY = 0;
        this.isRolling = false;
        this.rollTimer = 0;

        // Reset powerups
        Object.keys(this.activePowerups).forEach(k => (this.activePowerups[k] = 0));
        this.hasHoverboardActive = false;
        if (this.player) {
            this.player.hoverboard.visible = false;
            this.player.jetpack.visible = false;
            this.player.leftSpring.visible = false;
            this.player.rightSpring.visible = false;
        }

        this.chaserDistance = 7.5;
        this.chaserTargetDistance = 7.5;
        this.stumbleCount = 0;
        this.cameraShakeIntensity = 0;

        // Reset world chunks
        this.world.reset();

        // Start background music
        if (window.AudioEngine) {
            window.AudioEngine.startMusic();
        }

        // Notify UI
        if (window.GameUI) {
            window.GameUI.onGameStarted();
        }
    }

    // --- Player Movement Controls ---

    moveLane(direction) {
        if (this.state !== 'PLAYING') return;
        const newLane = this.currentLane + direction;
        if (newLane >= 0 && newLane <= 2) {
            this.currentLane = newLane;
            this.targetX = this.world.LANES[this.currentLane];
            if (window.AudioEngine) window.AudioEngine.playLaneSwitch();
        }
    }

    jump() {
        if (this.state !== 'PLAYING') return;

        // Can jump if grounded or if on a train roof
        if (this.isGrounded || this.activePowerups.sneakers > 0) {
            const hasSneakers = this.activePowerups.sneakers > 0;
            this.velocityY = hasSneakers ? this.superSneakersJump : this.jumpPower;
            this.isGrounded = false;
            this.isRolling = false;

            if (window.AudioEngine) {
                if (hasSneakers) window.AudioEngine.playSuperJump();
                else window.AudioEngine.playJump();
            }

            // Jump dust particles
            this.createDustParticles(this.posX, this.posY + 0.1, this.posZ, 8, 0x94a3b8);
        }
    }

    roll() {
        if (this.state !== 'PLAYING') return;

        // Downward slam if mid-air
        if (!this.isGrounded && this.activePowerups.jetpack <= 0) {
            this.velocityY = -26.0; // quick slam down
        }

        this.isRolling = true;
        this.rollTimer = this.rollDuration;

        if (window.AudioEngine) window.AudioEngine.playRoll();
        this.createDustParticles(this.posX, this.posY + 0.1, this.posZ, 6, 0xcbd5e1);
    }

    activateHoverboard() {
        if (this.state !== 'PLAYING') return;
        if (this.hasHoverboardActive) return;

        if (this.hoverboardStock > 0) {
            this.hoverboardStock--;
            this.hasHoverboardActive = true;
            this.activePowerups.hoverboard = 20.0; // 20s or until 1 crash
            if (this.player) this.player.hoverboard.visible = true;
            if (window.AudioEngine) window.AudioEngine.playHoverboard();
            if (window.GameUI) window.GameUI.updateHoverboardCount(this.hoverboardStock);
        }
    }

    // --- Power-up Collection & Handlers ---

    triggerPowerup(type) {
        const duration = this.upgradeDurations[type] || 10;
        this.activePowerups[type] = duration;

        if (window.AudioEngine) window.AudioEngine.playPowerup();

        if (type === 'jetpack') {
            if (this.player) this.player.jetpack.visible = true;
            if (window.AudioEngine) window.AudioEngine.startJetpackLoop();
        } else if (type === 'sneakers') {
            if (this.player) {
                this.player.leftSpring.visible = true;
                this.player.rightSpring.visible = true;
            }
        }

        if (window.GameUI) window.GameUI.showPowerupBanner(type, duration);
    }

    // --- Main Physics & Game Update ---

    update(delta) {
        if (this.state !== 'PLAYING') {
            // Idle menu animation
            this.updateMenuAnimation(delta);
            return;
        }

        // Clamp delta to prevent huge jumps on tab switch
        delta = Math.min(delta, 0.1);

        // 1. Advance Speed & Distance
        this.currentSpeed = Math.min(this.currentSpeed + this.speedIncreaseRate * delta, this.maxSpeed);
        const forwardDistance = this.currentSpeed * delta;
        this.posZ -= forwardDistance;
        this.distanceTraveled += forwardDistance;

        // 2. Score calculation (distance + coin bonus)
        const multiFactor = (this.activePowerups.multiplier > 0 ? 2 : 1) * this.multiplier;
        this.score += Math.round(forwardDistance * 1.8 * multiFactor);

        // 3. Smooth Lane Transition (Lerping posX to targetX)
        const laneLerpSpeed = 16.0;
        this.posX += (this.targetX - this.posX) * Math.min(1.0, laneLerpSpeed * delta);

        // 4. Power-up Timers & Actions
        this.updatePowerupTimers(delta);

        // 5. Vertical Physics & Jump / Roll / Jetpack
        this.updateVerticalPhysics(delta);

        // 6. Update Player Rig Transforms & Animations
        this.updatePlayerAnimations(delta);

        // 7. Update Chasing Inspector & Pitbull
        this.updateChaser(delta);

        // 8. Update World Chunks & Obstacles
        const difficulty = 1.0 + (this.currentSpeed - this.baseSpeed) / 15.0;
        this.world.update(this.posZ, delta, difficulty);

        // 9. Collision Checks (Obstacles & Coins)
        this.checkCollisions();

        // 10. Coin Magnet Pull Logic
        if (this.activePowerups.magnet > 0) {
            this.applyMagnetPull(delta);
        }

        // 11. Update Active Particle Effects
        this.updateParticles(delta);

        // 12. Camera Positioning & Shake
        this.updateCamera(delta);

        // 13. UI Updates
        if (window.GameUI) {
            window.GameUI.updateHUD({
                score: this.score,
                coins: this.coinsCollected,
                multiplier: multiFactor,
                speed: Math.round(this.currentSpeed),
                powerups: this.activePowerups
            });
        }
    }

    updatePowerupTimers(delta) {
        // Decrease active powerups
        Object.keys(this.activePowerups).forEach(type => {
            if (this.activePowerups[type] > 0) {
                this.activePowerups[type] -= delta;
                if (this.activePowerups[type] <= 0) {
                    this.activePowerups[type] = 0;
                    this.onPowerupExpired(type);
                }
            }
        });

        // Roll timer
        if (this.isRolling) {
            this.rollTimer -= delta;
            if (this.rollTimer <= 0) {
                this.isRolling = false;
            }
        }
    }

    onPowerupExpired(type) {
        if (type === 'jetpack') {
            if (this.player) this.player.jetpack.visible = false;
            if (window.AudioEngine) window.AudioEngine.stopJetpackLoop();
        } else if (type === 'sneakers') {
            if (this.player) {
                this.player.leftSpring.visible = false;
                this.player.rightSpring.visible = false;
            }
        } else if (type === 'hoverboard') {
            this.hasHoverboardActive = false;
            if (this.player) this.player.hoverboard.visible = false;
        }
    }

    updateVerticalPhysics(delta) {
        if (this.activePowerups.jetpack > 0) {
            // Jetpack smoothly ascends player to y = 7.8
            const targetJetY = 7.8;
            this.posY += (targetJetY - this.posY) * Math.min(1.0, 4.0 * delta);
            this.velocityY = 0;
            this.isGrounded = false;

            // Jetpack exhaust thruster particles
            this.createJetpackParticles();
            return;
        }

        // Determine ground level underneath player (Check if on train or ramp)
        let groundY = 0;
        for (let i = 0; i < this.world.obstacles.length; i++) {
            const obs = this.world.obstacles[i];
            if (obs.type === 'train') {
                const zDist = Math.abs(this.posZ - obs.z);
                const xDist = Math.abs(this.posX - obs.laneX);

                // Check ramp ascent
                if (obs.hasRamp && xDist < 1.3 && this.posZ <= obs.rampZStart && this.posZ >= obs.rampZEnd) {
                    const rampProgress = (obs.rampZStart - this.posZ) / (obs.rampZStart - obs.rampZEnd);
                    groundY = Math.max(groundY, rampProgress * obs.height);
                }
                // Check train roof
                else if (xDist < 1.3 && zDist < obs.length / 2 + 0.3) {
                    if (this.posY >= obs.height - 0.4) {
                        groundY = Math.max(groundY, obs.height);
                    }
                }
            }
        }
        this.currentGroundY = groundY;

        // Apply Gravity
        this.velocityY += this.gravity * delta;
        this.posY += this.velocityY * delta;

        // Ground collision
        if (this.posY <= this.currentGroundY) {
            this.posY = this.currentGroundY;
            this.velocityY = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
    }

    updatePlayerAnimations(delta) {
        if (!this.player) return;

        this.player.root.position.set(this.posX, this.posY, this.posZ);

        // Bank / lean into lane switches
        const laneDiff = this.targetX - this.posX;
        this.player.root.rotation.z = -laneDiff * 0.12;

        if (this.isRolling) {
            // Duck down into rolling tuck
            this.player.bodyPivot.position.y = 0.38;
            this.player.bodyPivot.rotation.x = -Math.PI / 2;
            this.player.leftLegPivot.rotation.x = -Math.PI / 4;
            this.player.rightLegPivot.rotation.x = -Math.PI / 4;
            this.player.leftArmPivot.rotation.x = Math.PI / 3;
            this.player.rightArmPivot.rotation.x = Math.PI / 3;
        } else if (!this.isGrounded) {
            // Jumping pose
            this.player.bodyPivot.position.y = 0.9;
            this.player.bodyPivot.rotation.x = 0.15;
            this.player.leftLegPivot.rotation.x = -0.6;
            this.player.rightLegPivot.rotation.x = 0.4;
            this.player.leftArmPivot.rotation.x = -1.2;
            this.player.rightArmPivot.rotation.x = -1.2;
        } else {
            // Running Cycle
            this.runCycle += delta * (this.currentSpeed * 0.75);
            this.player.bodyPivot.position.y = 0.9 + Math.abs(Math.sin(this.runCycle * 2)) * 0.08;
            this.player.bodyPivot.rotation.x = 0.1; // slight forward lean

            // Arms & Legs swing opposite to each other
            const swing = Math.sin(this.runCycle) * 0.9;
            this.player.leftLegPivot.rotation.x = swing;
            this.player.rightLegPivot.rotation.x = -swing;
            this.player.leftArmPivot.rotation.x = -swing * 0.9;
            this.player.rightArmPivot.rotation.x = swing * 0.9;

            // Hoverboard gentle tilt
            if (this.hasHoverboardActive) {
                this.player.hoverboard.rotation.y = Math.sin(this.runCycle) * 0.1;
            }
        }
    }

    updateChaser(delta) {
        if (!this.chaser) return;

        // Smoothly adjust inspector distance
        this.chaserDistance += (this.chaserTargetDistance - this.chaserDistance) * Math.min(1.0, 2.5 * delta);

        const chaserZ = this.posZ + this.chaserDistance;
        // Follow player's lane smoothly
        const chaserX = this.chaser.group.position.x + (this.posX - this.chaser.group.position.x) * Math.min(1.0, 8.0 * delta);
        this.chaser.group.position.set(chaserX, this.currentGroundY, chaserZ);

        // Animate inspector run
        const inspRun = performance.now() * 0.012;
        this.chaser.inspLeftLeg.rotation.x = Math.sin(inspRun) * 0.8;
        this.chaser.inspRightLeg.rotation.x = -Math.sin(inspRun) * 0.8;

        // Animate pitbull run
        this.chaser.dogFL.rotation.x = Math.sin(inspRun * 1.5) * 0.9;
        this.chaser.dogFR.rotation.x = -Math.sin(inspRun * 1.5) * 0.9;
        this.chaser.dogBL.rotation.x = -Math.sin(inspRun * 1.5) * 0.9;
        this.chaser.dogBR.rotation.x = Math.sin(inspRun * 1.5) * 0.9;

        // Slowly retreat inspector back to normal distance after stumble
        if (this.chaserTargetDistance < 7.5) {
            this.chaserTargetDistance += delta * 0.8;
        }
    }

    // --- Collision Detection ---

    checkCollisions() {
        const pRadius = 0.55;
        const pHeight = this.isRolling ? 0.75 : 1.7;
        const pMinY = this.posY;
        const pMaxY = this.posY + pHeight;

        // 1. Obstacle Collisions
        for (let i = 0; i < this.world.obstacles.length; i++) {
            const obs = this.world.obstacles[i];

            // Train collision
            if (obs.type === 'train' || obs.type === 'movingTrain') {
                const zDist = Math.abs(this.posZ - obs.z);
                const xDist = Math.abs(this.posX - obs.laneX);

                // If within bounding box
                if (xDist < (obs.width / 2 + pRadius * 0.75) && zDist < (obs.length / 2 + 0.5)) {
                    // Check if player climbed on ramp or is on roof safely
                    if (this.posY >= obs.height - 0.2) {
                        continue; // running on top of train!
                    }
                    if (obs.hasRamp && this.posZ <= obs.rampZStart && this.posZ >= obs.rampZEnd) {
                        continue; // ascending ramp safely!
                    }

                    // Direct frontal collision with train!
                    this.handleCrash(obs);
                    return;
                }
            }
            // Low Barrier (requires jump)
            else if (obs.type === 'lowBarrier') {
                const zDist = Math.abs(this.posZ - obs.z);
                const xDist = Math.abs(this.posX - obs.laneX);

                if (xDist < (obs.width / 2 + 0.2) && zDist < (obs.length / 2 + 0.4)) {
                    if (pMinY > obs.height - 0.2) {
                        continue; // jumped over hurdle safely!
                    }
                    // Glancing stumble or crash
                    this.handleStumbleOrCrash(obs);
                    return;
                }
            }
            // High Barrier (requires roll)
            else if (obs.type === 'highBarrier') {
                const zDist = Math.abs(this.posZ - obs.z);
                const xDist = Math.abs(this.posX - obs.laneX);

                if (xDist < (obs.width / 2 + 0.2) && zDist < (obs.length / 2 + 0.4)) {
                    if (this.isRolling && pMaxY <= obs.clearance + 0.1) {
                        continue; // cleanly slid underneath!
                    }
                    this.handleStumbleOrCrash(obs);
                    return;
                }
            }
            // Heavy Blockade
            else if (obs.type === 'blockade') {
                const zDist = Math.abs(this.posZ - obs.z);
                const xDist = Math.abs(this.posX - obs.laneX);

                if (xDist < (obs.width / 2 + 0.2) && zDist < (obs.length / 2 + 0.5)) {
                    this.handleCrash(obs);
                    return;
                }
            }
        }

        // 2. Coin Pickups
        for (let i = 0; i < this.world.coins.length; i++) {
            const coin = this.world.coins[i];
            if (coin.collected) continue;

            const distSq = (this.posX - coin.x) ** 2 + (this.posY + 0.8 - coin.y) ** 2 + (this.posZ - coin.z) ** 2;
            if (distSq < 1.8) {
                this.collectCoin(coin);
            }
        }

        // 3. Power-up Pickups
        for (let i = 0; i < this.world.powerups.length; i++) {
            const p = this.world.powerups[i];
            if (p.collected) continue;

            const distSq = (this.posX - p.x) ** 2 + (this.posY + 0.8 - p.y) ** 2 + (this.posZ - p.z) ** 2;
            if (distSq < 2.2) {
                p.collected = true;
                this.scene.remove(p.mesh);
                this.triggerPowerup(p.type);
            }
        }
    }

    collectCoin(coin) {
        coin.collected = true;
        this.scene.remove(coin.mesh);
        this.coinsCollected++;
        this.score += 50 * (this.activePowerups.multiplier > 0 ? 2 : 1) * this.multiplier;

        if (window.AudioEngine) window.AudioEngine.playCoin();
        this.createCoinSparkles(coin.x, coin.y, coin.z);
    }

    applyMagnetPull(delta) {
        const magnetRange = 14.0;
        const pullSpeed = 38.0;

        for (let i = 0; i < this.world.coins.length; i++) {
            const coin = this.world.coins[i];
            if (coin.collected) continue;

            const dz = coin.z - this.posZ;
            if (Math.abs(dz) < magnetRange) {
                // Smoothly pull towards player
                const dx = this.posX - coin.x;
                const dy = (this.posY + 0.9) - coin.y;

                coin.x += dx * Math.min(1.0, pullSpeed * delta * 0.3);
                coin.y += dy * Math.min(1.0, pullSpeed * delta * 0.3);
                coin.z += (this.posZ - coin.z) * Math.min(1.0, pullSpeed * delta * 0.3);

                coin.mesh.position.set(coin.x, coin.y, coin.z);

                // Collect if close enough
                const distSq = dx * dx + dy * dy + (coin.z - this.posZ) ** 2;
                if (distSq < 1.6) {
                    this.collectCoin(coin);
                }
            }
        }
    }

    // --- Crashes & Stumbles ---

    handleStumbleOrCrash(obstacle) {
        const now = performance.now();

        // If Hoverboard is active, protect player!
        if (this.hasHoverboardActive) {
            this.destroyHoverboard();
            // Remove obstacle to avoid double-hitting
            this.scene.remove(obstacle.mesh);
            obstacle.z = 9999;
            return;
        }

        // If player already stumbled recently and inspector is right behind -> BUSTED!
        if (this.chaserDistance < 4.0 || now - this.lastStumbleTime < 3500) {
            this.handleCrash(obstacle);
            return;
        }

        // First stumble: Inspector surges forward!
        this.lastStumbleTime = now;
        this.chaserTargetDistance = 2.4; // breathing down player's neck!
        this.cameraShakeIntensity = 0.35;
        this.currentSpeed = Math.max(this.baseSpeed, this.currentSpeed * 0.7); // speed penalty

        if (window.AudioEngine) window.AudioEngine.playStumble();
        this.createDustParticles(this.posX, this.posY + 0.5, this.posZ, 12, 0xffa500);

        // Remove obstacle so player doesn't get stuck in it
        this.scene.remove(obstacle.mesh);
        obstacle.z = 9999;
    }

    destroyHoverboard() {
        this.hasHoverboardActive = false;
        this.activePowerups.hoverboard = 0;
        if (this.player) this.player.hoverboard.visible = false;

        this.cameraShakeIntensity = 0.5;
        if (window.AudioEngine) window.AudioEngine.playCrash();

        // Hoverboard explosion particles
        this.createDustParticles(this.posX, this.posY + 0.2, this.posZ, 25, 0x00f5d4);
    }

    handleCrash(obstacle) {
        if (this.hasHoverboardActive) {
            this.destroyHoverboard();
            return;
        }

        this.state = 'GAMEOVER';
        this.cameraShakeIntensity = 0.7;

        if (window.AudioEngine) {
            window.AudioEngine.playCrash();
            window.AudioEngine.stopMusic();
            window.AudioEngine.stopJetpackLoop();
        }

        // Inspector rushes in for the tackle!
        this.chaser.group.position.set(this.posX, this.posY, this.posZ + 0.6);

        // Notify UI to display Game Over Screen
        if (window.GameUI) {
            window.GameUI.onGameOver({
                score: this.score,
                coins: this.coinsCollected,
                distance: Math.round(this.distanceTraveled)
            });
        }
    }

    // --- Particle Effects System ---

    createCoinSparkles(x, y, z) {
        for (let i = 0; i < 6; i++) {
            const pGeo = new THREE.SphereGeometry(0.08, 6, 6);
            const pMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(x, y, z);
            this.scene.add(p);

            this.particles.push({
                mesh: p,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 4 + 1.5,
                vz: (Math.random() - 0.5) * 4,
                life: 0.35,
                maxLife: 0.35
            });
        }
    }

    createDustParticles(x, y, z, count, colorHex) {
        for (let i = 0; i < count; i++) {
            const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
            const pMat = new THREE.MeshBasicMaterial({ color: colorHex });
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
            this.scene.add(p);

            this.particles.push({
                mesh: p,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 2.5 + 0.5,
                vz: (Math.random() - 0.5) * 3,
                life: 0.45,
                maxLife: 0.45
            });
        }
    }

    createJetpackParticles() {
        if (!this.player) return;
        [-0.16, 0.16].forEach(xOff => {
            const pGeo = new THREE.SphereGeometry(0.09, 6, 6);
            const pMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff4500 : 0xffd700 });
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(this.posX + xOff, this.posY + 1.2, this.posZ + 0.3);
            this.scene.add(p);

            this.particles.push({
                mesh: p,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -Math.random() * 5 - 2,
                vz: Math.random() * 2 + 1,
                life: 0.25,
                maxLife: 0.25
            });
        });
    }

    updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
                continue;
            }

            p.mesh.position.x += p.vx * delta;
            p.mesh.position.y += p.vy * delta;
            p.mesh.position.z += p.vz * delta;

            const scale = p.life / p.maxLife;
            p.mesh.scale.set(scale, scale, scale);
        }
    }

    // --- Camera Tracking & Effects ---

    updateCamera(delta) {
        // Camera smooth follow behind player
        const targetCamX = this.posX * 0.65;
        const targetCamY = Math.max(3.8, this.posY + 3.8);
        const targetCamZ = this.posZ + 6.8;

        this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1.0, 10.0 * delta);
        this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1.0, 8.0 * delta);
        this.camera.position.z = targetCamZ;

        // Dynamic FOV based on speed / jetpack
        const targetFov = this.activePowerups.jetpack > 0 ? 76 : 65 + (this.currentSpeed - this.baseSpeed) * 0.35;
        this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, 4.0 * delta);
        this.camera.updateProjectionMatrix();

        // Apply camera shake if any
        if (this.cameraShakeIntensity > 0) {
            this.camera.position.x += (Math.random() - 0.5) * this.cameraShakeIntensity;
            this.camera.position.y += (Math.random() - 0.5) * this.cameraShakeIntensity;
            this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - delta * 1.8);
        }

        this.camera.lookAt(this.posX * 0.5, this.posY + 1.8, this.posZ - 8.0);
    }

    updateMenuAnimation(delta) {
        // Cool rotating showcase camera in menu state
        const time = performance.now() * 0.001;
        this.camera.position.set(Math.sin(time * 0.4) * 4.5, 3.2, 5.0 + Math.cos(time * 0.4) * 1.5);
        this.camera.lookAt(0, 1.2, 0);

        if (this.player) {
            this.player.bodyPivot.position.y = 0.9 + Math.sin(time * 3) * 0.05;
            this.player.leftArmPivot.rotation.x = Math.sin(time * 2) * 0.3;
            this.player.rightArmPivot.rotation.x = -Math.sin(time * 2) * 0.3;
        }
    }

    onWindowResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    }
}

window.SubwayRunnerGame = SubwayRunnerGame;
