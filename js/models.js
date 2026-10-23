/**
 * Subway Surfers - Metro Runner
 * 3D Procedural Models & Rigged Character Generator using Three.js
 */

const GameModels = {
    // Shared materials & canvas textures
    textures: {},
    materials: {},

    initMaterials() {
        // 1. Graffiti Wall Texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Dark subway brick background
        ctx.fillStyle = '#22252a';
        ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = '#181a1e';
        ctx.lineWidth = 3;
        for (let y = 0; y < 256; y += 32) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
            const offset = (y / 32) % 2 === 0 ? 0 : 32;
            for (let x = offset; x < 512; x += 64) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + 32);
                ctx.stroke();
            }
        }

        // Vibrant street graffiti tags
        ctx.font = '900 48px "Impact", sans-serif';
        ctx.fillStyle = '#ff2a70';
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 12;
        ctx.fillText('SURF', 40, 90);
        ctx.fillStyle = '#fee440';
        ctx.fillText('METRO', 240, 110);
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = '#00bbf9';
        ctx.fillText('SUBWAY', 80, 190);
        ctx.fillStyle = '#f15bb5';
        ctx.fillText('RUN 2026', 310, 200);

        const graffitiTex = new THREE.CanvasTexture(canvas);
        graffitiTex.wrapS = THREE.RepeatWrapping;
        graffitiTex.wrapT = THREE.RepeatWrapping;

        // 2. Train Window Texture
        const winCanvas = document.createElement('canvas');
        winCanvas.width = 256;
        winCanvas.height = 64;
        const winCtx = winCanvas.getContext('2d');
        winCtx.fillStyle = '#3a4454';
        winCtx.fillRect(0, 0, 256, 64);
        winCtx.fillStyle = '#a9e5ff';
        winCtx.fillRect(10, 10, 60, 44);
        winCtx.fillRect(90, 10, 70, 44);
        winCtx.fillRect(180, 10, 65, 44);
        winCtx.fillStyle = 'rgba(255,255,255,0.4)';
        winCtx.fillRect(15, 15, 20, 34);
        winCtx.fillRect(95, 15, 25, 34);
        const winTex = new THREE.CanvasTexture(winCanvas);

        // 3. Hazard Stripe Texture
        const hazCanvas = document.createElement('canvas');
        hazCanvas.width = 128;
        hazCanvas.height = 128;
        const hazCtx = hazCanvas.getContext('2d');
        hazCtx.fillStyle = '#f4d03f';
        hazCtx.fillRect(0, 0, 128, 128);
        hazCtx.fillStyle = '#1c1c1c';
        for (let i = -128; i < 256; i += 32) {
            hazCtx.beginPath();
            hazCtx.moveTo(i, 0);
            hazCtx.lineTo(i + 32, 0);
            hazCtx.lineTo(i - 16, 128);
            hazCtx.lineTo(i - 48, 128);
            hazCtx.closePath();
            hazCtx.fill();
        }
        const hazardTex = new THREE.CanvasTexture(hazCanvas);
        hazardTex.wrapS = THREE.RepeatWrapping;
        hazardTex.wrapT = THREE.RepeatWrapping;

        this.textures = {
            graffiti: graffitiTex,
            windows: winTex,
            hazard: hazardTex
        };

        // Standard materials
        this.materials = {
            coinGold: new THREE.MeshStandardMaterial({
                color: 0xffd700,
                metalness: 0.85,
                roughness: 0.2,
                emissive: 0x554400,
                emissiveIntensity: 0.3
            }),
            railSteel: new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                metalness: 0.9,
                roughness: 0.3
            }),
            sleeperWood: new THREE.MeshStandardMaterial({
                color: 0x3d2817,
                roughness: 0.9
            }),
            ballastGround: new THREE.MeshStandardMaterial({
                color: 0x1f2229,
                roughness: 0.95
            }),
            wallBrick: new THREE.MeshStandardMaterial({
                map: graffitiTex,
                roughness: 0.8
            }),
            hazardStripe: new THREE.MeshStandardMaterial({
                map: hazardTex,
                roughness: 0.5
            }),
            trainRed: new THREE.MeshStandardMaterial({
                color: 0xd62828,
                metalness: 0.4,
                roughness: 0.35
            }),
            trainBlue: new THREE.MeshStandardMaterial({
                color: 0x0077b6,
                metalness: 0.4,
                roughness: 0.35
            }),
            trainSilver: new THREE.MeshStandardMaterial({
                color: 0xd0d5dd,
                metalness: 0.6,
                roughness: 0.3
            }),
            trainRoof: new THREE.MeshStandardMaterial({
                color: 0x475569,
                metalness: 0.5,
                roughness: 0.6
            }),
            trainLight: new THREE.MeshStandardMaterial({
                color: 0xfffae6,
                emissive: 0xffe680,
                emissiveIntensity: 1.5
            }),
            hoverboard: new THREE.MeshStandardMaterial({
                color: 0x06d6a0,
                emissive: 0x06d6a0,
                emissiveIntensity: 0.4,
                metalness: 0.8,
                roughness: 0.2
            })
        };
    },

    /**
     * Build Player Character (Jake / Custom Rig)
     * Returns an object containing the Three.js root Group and animation pivots.
     */
    createPlayerCharacter(characterId = 'jake') {
        if (!this.materials || !this.materials.hoverboard) {
            this.initMaterials();
        }
        const root = new THREE.Group();

        // Color palettes based on character
        const palettes = {
            jake: {
                skin: 0xf5cda2,
                hoodie: 0xef233c,
                hoodieTrim: 0xffffff,
                pants: 0x1e3a8a,
                cap: 0x2563eb,
                shoes: 0xffffff,
                hair: 0x582f0e
            },
            tricky: {
                skin: 0xf3c19d,
                hoodie: 0x06d6a0,
                hoodieTrim: 0xf72585,
                pants: 0x111827,
                cap: 0xf72585,
                shoes: 0x06d6a0,
                hair: 0xfbb034
            },
            cyber: {
                skin: 0xdad7cd,
                hoodie: 0x111827,
                hoodieTrim: 0x00f5d4,
                pants: 0x030712,
                cap: 0x00f5d4,
                shoes: 0x00f5d4,
                hair: 0x00f5d4
            },
            fresh: {
                skin: 0x8d5524,
                hoodie: 0xfb8500,
                hoodieTrim: 0xffb703,
                pants: 0x023047,
                cap: 0x023047,
                shoes: 0xffb703,
                hair: 0x1a1a1a
            }
        };

        const colors = palettes[characterId] || palettes.jake;

        const skinMat = new THREE.MeshStandardMaterial({ color: colors.skin, roughness: 0.6 });
        const hoodieMat = new THREE.MeshStandardMaterial({ color: colors.hoodie, roughness: 0.6 });
        const trimMat = new THREE.MeshStandardMaterial({ color: colors.hoodieTrim, roughness: 0.5 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: colors.pants, roughness: 0.7 });
        const capMat = new THREE.MeshStandardMaterial({ color: colors.cap, roughness: 0.5 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: colors.shoes, roughness: 0.4 });
        const hairMat = new THREE.MeshStandardMaterial({ color: colors.hair, roughness: 0.8 });

        // Character Rig Pivots
        const bodyPivot = new THREE.Group();
        bodyPivot.position.y = 0.9; // center of mass
        root.add(bodyPivot);

        // Pelvis / Hips
        const hipsGeo = new THREE.BoxGeometry(0.5, 0.25, 0.35);
        const hips = new THREE.Mesh(hipsGeo, pantsMat);
        bodyPivot.add(hips);

        // Torso / Jacket
        const torsoGeo = new THREE.BoxGeometry(0.56, 0.62, 0.4);
        const torso = new THREE.Mesh(torsoGeo, hoodieMat);
        torso.position.y = 0.4;
        bodyPivot.add(torso);

        // Torso hood / zipper stripe
        const zipGeo = new THREE.BoxGeometry(0.08, 0.6, 0.41);
        const zip = new THREE.Mesh(zipGeo, trimMat);
        zip.position.y = 0.4;
        bodyPivot.add(zip);

        // Head Group
        const headPivot = new THREE.Group();
        headPivot.position.y = 0.82;
        bodyPivot.add(headPivot);

        const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
        const head = new THREE.Mesh(headGeo, skinMat);
        headPivot.add(head);

        // Cap / Hat (turned backward like classic Jake!)
        const capGeo = new THREE.BoxGeometry(0.42, 0.16, 0.42);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 0.14;
        headPivot.add(cap);

        const capVisorGeo = new THREE.BoxGeometry(0.34, 0.04, 0.22);
        const capVisor = new THREE.Mesh(capVisorGeo, capMat);
        capVisor.position.set(0, 0.1, -0.28); // Visor facing backwards!
        headPivot.add(capVisor);

        // Stylized sunglasses / eyes
        const visorGeo = new THREE.BoxGeometry(0.3, 0.08, 0.06);
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2 });
        const shades = new THREE.Mesh(visorGeo, visorMat);
        shades.position.set(0, 0.02, 0.2);
        headPivot.add(shades);

        // Left Arm
        const leftArmPivot = new THREE.Group();
        leftArmPivot.position.set(-0.35, 0.62, 0);
        bodyPivot.add(leftArmPivot);

        const armGeo = new THREE.BoxGeometry(0.16, 0.54, 0.16);
        armGeo.translate(0, -0.22, 0);
        const leftArm = new THREE.Mesh(armGeo, hoodieMat);
        leftArmPivot.add(leftArm);

        // Right Arm
        const rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(0.35, 0.62, 0);
        bodyPivot.add(rightArmPivot);

        const rightArm = new THREE.Mesh(armGeo, hoodieMat);
        rightArmPivot.add(rightArm);

        // Left Leg
        const leftLegPivot = new THREE.Group();
        leftLegPivot.position.set(-0.16, -0.05, 0);
        bodyPivot.add(leftLegPivot);

        const legGeo = new THREE.BoxGeometry(0.18, 0.52, 0.18);
        legGeo.translate(0, -0.24, 0);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLegPivot.add(leftLeg);

        // Left Sneaker
        const shoeGeo = new THREE.BoxGeometry(0.2, 0.14, 0.32);
        const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
        leftShoe.position.set(0, -0.52, 0.05);
        leftLegPivot.add(leftShoe);

        // Right Leg
        const rightLegPivot = new THREE.Group();
        rightLegPivot.position.set(0.16, -0.05, 0);
        bodyPivot.add(rightLegPivot);

        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLegPivot.add(rightLeg);

        // Right Sneaker
        const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
        rightShoe.position.set(0, -0.52, 0.05);
        rightLegPivot.add(rightShoe);

        // Hoverboard model (hidden by default)
        const hoverboardGroup = new THREE.Group();
        hoverboardGroup.position.y = -0.58;
        const boardBodyGeo = new THREE.BoxGeometry(0.7, 0.08, 1.4);
        const boardBody = new THREE.Mesh(boardBodyGeo, this.materials.hoverboard);
        hoverboardGroup.add(boardBody);

        // Neon side thrusters
        const thrusterGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
        thrusterGeo.rotateX(Math.PI / 2);
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
        const leftThruster = new THREE.Mesh(thrusterGeo, neonMat);
        leftThruster.position.x = -0.38;
        const rightThruster = new THREE.Mesh(thrusterGeo, neonMat);
        rightThruster.position.x = 0.38;
        hoverboardGroup.add(leftThruster);
        hoverboardGroup.add(rightThruster);

        hoverboardGroup.visible = false;
        bodyPivot.add(hoverboardGroup);

        // Jetpack model (hidden by default)
        const jetpackGroup = new THREE.Group();
        jetpackGroup.position.set(0, 0.35, -0.28);

        const jetTankGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.55, 12);
        const jetMat = new THREE.MeshStandardMaterial({ color: 0xd90429, metalness: 0.7, roughness: 0.3 });
        const leftTank = new THREE.Mesh(jetTankGeo, jetMat);
        leftTank.position.x = -0.16;
        const rightTank = new THREE.Mesh(jetTankGeo, jetMat);
        rightTank.position.x = 0.16;

        const nozzleGeo = new THREE.ConeGeometry(0.12, 0.18, 12);
        const nozzleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const leftNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
        leftNozzle.position.set(-0.16, -0.32, 0);
        const rightNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
        rightNozzle.position.set(0.16, -0.32, 0);

        jetpackGroup.add(leftTank);
        jetpackGroup.add(rightTank);
        jetpackGroup.add(leftNozzle);
        jetpackGroup.add(rightNozzle);
        jetpackGroup.visible = false;
        bodyPivot.add(jetpackGroup);

        // Super Sneakers Springs (hidden by default)
        const springMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
        const springGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.18, 8);
        const leftSpring = new THREE.Mesh(springGeo, springMat);
        leftSpring.position.set(0, -0.62, 0.05);
        leftLegPivot.add(leftSpring);
        const rightSpring = new THREE.Mesh(springGeo, springMat);
        rightSpring.position.set(0, -0.62, 0.05);
        rightLegPivot.add(rightSpring);
        leftSpring.visible = false;
        rightSpring.visible = false;

        return {
            root,
            bodyPivot,
            headPivot,
            leftArmPivot,
            rightArmPivot,
            leftLegPivot,
            rightLegPivot,
            hoverboard: hoverboardGroup,
            jetpack: jetpackGroup,
            leftSpring,
            rightSpring
        };
    },

    /**
     * Build Inspector (Policeman) & Pitbull Chasing Character
     */
    createInspectorAndDog() {
        const group = new THREE.Group();

        // 1. Inspector
        const inspectorGroup = new THREE.Group();
        inspectorGroup.position.set(0, 0.95, 0);

        const policeBlue = new THREE.MeshStandardMaterial({ color: 0x0d2149, roughness: 0.6 });
        const badgeGold = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cda2 });

        // Heavy Torso
        const torsoGeo = new THREE.BoxGeometry(0.7, 0.7, 0.45);
        const torso = new THREE.Mesh(torsoGeo, policeBlue);
        inspectorGroup.add(torso);

        // Badge
        const badgeGeo = new THREE.BoxGeometry(0.12, 0.14, 0.05);
        const badge = new THREE.Mesh(badgeGeo, badgeGold);
        badge.position.set(-0.18, 0.16, 0.24);
        inspectorGroup.add(badge);

        // Inspector Head
        const headGeo = new THREE.BoxGeometry(0.42, 0.4, 0.4);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 0.55;
        inspectorGroup.add(head);

        // Police Cap
        const capGeo = new THREE.BoxGeometry(0.46, 0.16, 0.46);
        const cap = new THREE.Mesh(capGeo, policeBlue);
        cap.position.y = 0.74;
        inspectorGroup.add(cap);

        const visorGeo = new THREE.BoxGeometry(0.4, 0.03, 0.22);
        const visor = new THREE.Mesh(visorGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
        visor.position.set(0, 0.68, 0.28);
        inspectorGroup.add(visor);

        // Inspector Outstretched Running Arms
        const armGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
        armGeo.translate(0, -0.25, 0);
        const leftArmPivot = new THREE.Group();
        leftArmPivot.position.set(-0.45, 0.25, 0);
        leftArmPivot.rotation.x = -Math.PI / 3; // outstretched forward to catch!
        leftArmPivot.add(new THREE.Mesh(armGeo, policeBlue));
        inspectorGroup.add(leftArmPivot);

        const rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(0.45, 0.25, 0);
        rightArmPivot.rotation.x = -Math.PI / 3;
        rightArmPivot.add(new THREE.Mesh(armGeo, policeBlue));
        inspectorGroup.add(rightArmPivot);

        // Inspector Legs
        const legGeo = new THREE.BoxGeometry(0.22, 0.6, 0.22);
        legGeo.translate(0, -0.28, 0);
        const leftLegPivot = new THREE.Group();
        leftLegPivot.position.set(-0.2, -0.35, 0);
        leftLegPivot.add(new THREE.Mesh(legGeo, policeBlue));
        inspectorGroup.add(leftLegPivot);

        const rightLegPivot = new THREE.Group();
        rightLegPivot.position.set(0.2, -0.35, 0);
        rightLegPivot.add(new THREE.Mesh(legGeo, policeBlue));
        inspectorGroup.add(rightLegPivot);

        group.add(inspectorGroup);

        // 2. Chasing Dog (Pitbull)
        const dogGroup = new THREE.Group();
        dogGroup.position.set(1.2, 0.35, 0.3); // running on right flank

        const dogMat = new THREE.MeshStandardMaterial({ color: 0x6c4a30, roughness: 0.7 });
        const collarMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.4 });

        // Dog Body
        const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.7), dogMat);
        dogGroup.add(dogBody);

        // Dog Collar
        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.1), collarMat);
        collar.position.z = 0.28;
        dogGroup.add(collar);

        // Dog Head
        const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.35), dogMat);
        dogHead.position.set(0, 0.22, 0.42);
        dogGroup.add(dogHead);

        // Dog Legs
        const dogLegGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
        dogLegGeo.translate(0, -0.15, 0);

        const dogFL = new THREE.Group();
        dogFL.position.set(-0.14, -0.15, 0.24);
        dogFL.add(new THREE.Mesh(dogLegGeo, dogMat));
        dogGroup.add(dogFL);

        const dogFR = new THREE.Group();
        dogFR.position.set(0.14, -0.15, 0.24);
        dogFR.add(new THREE.Mesh(dogLegGeo, dogMat));
        dogGroup.add(dogFR);

        const dogBL = new THREE.Group();
        dogBL.position.set(-0.14, -0.15, -0.24);
        dogBL.add(new THREE.Mesh(dogLegGeo, dogMat));
        dogGroup.add(dogBL);

        const dogBR = new THREE.Group();
        dogBR.position.set(0.14, -0.15, -0.24);
        dogBR.add(new THREE.Mesh(dogLegGeo, dogMat));
        dogGroup.add(dogBR);

        group.add(dogGroup);

        return {
            group,
            inspector: inspectorGroup,
            dog: dogGroup,
            inspLeftArm: leftArmPivot,
            inspRightArm: rightArmPivot,
            inspLeftLeg: leftLegPivot,
            inspRightLeg: rightLegPivot,
            dogFL,
            dogFR,
            dogBL,
            dogBR
        };
    },

    /**
     * Build Subway Train Car
     * length: length of train (~15 to 25 units)
     * hasRamp: whether this stationary train has a front ramp to climb up!
     * colorType: 'red' or 'blue'
     */
    createTrain(length = 20, hasRamp = false, colorType = 'red') {
        const group = new THREE.Group();
        const width = 2.7;
        const height = 3.4;

        const bodyMat = colorType === 'blue' ? this.materials.trainBlue : this.materials.trainRed;

        // Main Car Body
        const bodyGeo = new THREE.BoxGeometry(width, height, length);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        group.add(body);

        // Silver metallic side panels & windows
        const panelGeo = new THREE.BoxGeometry(width + 0.05, height * 0.5, length * 0.94);
        const panel = new THREE.Mesh(panelGeo, this.materials.trainSilver);
        panel.position.y = height / 2;
        group.add(panel);

        // Train Roof (curved look or corrugated)
        const roofGeo = new THREE.BoxGeometry(width * 0.95, 0.2, length);
        const roof = new THREE.Mesh(roofGeo, this.materials.trainRoof);
        roof.position.y = height + 0.1;
        group.add(roof);

        // Roof Vents / AC units
        for (let z = -length * 0.35; z <= length * 0.35; z += 5) {
            const ventGeo = new THREE.BoxGeometry(1.4, 0.25, 2.2);
            const vent = new THREE.Mesh(ventGeo, this.materials.trainRoof);
            vent.position.set(0, height + 0.25, z);
            group.add(vent);
        }

        // Front Headlights
        const lightGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
        lightGeo.rotateX(Math.PI / 2);
        const leftLight = new THREE.Mesh(lightGeo, this.materials.trainLight);
        leftLight.position.set(-0.8, 1.2, length / 2 + 0.05);
        const rightLight = new THREE.Mesh(lightGeo, this.materials.trainLight);
        rightLight.position.set(0.8, 1.2, length / 2 + 0.05);
        group.add(leftLight);
        group.add(rightLight);

        // Front Windshield
        const winGeo = new THREE.BoxGeometry(2.1, 1.0, 0.1);
        const winMat = new THREE.MeshStandardMaterial({ color: 0x1a2634, roughness: 0.1, metalness: 0.8 });
        const windshield = new THREE.Mesh(winGeo, winMat);
        windshield.position.set(0, 2.2, length / 2 + 0.05);
        group.add(windshield);

        // Train Wheels / Under-bogies
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 });
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        [-length * 0.38, -length * 0.3, length * 0.3, length * 0.38].forEach(zPos => {
            const wL = new THREE.Mesh(wheelGeo, wheelMat);
            wL.position.set(-width / 2 + 0.1, 0.35, zPos);
            const wR = new THREE.Mesh(wheelGeo, wheelMat);
            wR.position.set(width / 2 - 0.1, 0.35, zPos);
            group.add(wL);
            group.add(wR);
        });

        // Climbable Front Ramp
        let rampMesh = null;
        if (hasRamp) {
            const rampLength = 7.0;
            const rampGeo = new THREE.BoxGeometry(width * 0.88, 0.2, rampLength);
            rampMesh = new THREE.Mesh(rampGeo, this.materials.hazardStripe);

            // Incline angle from ground y=0.1 to roof y=height
            const angle = Math.atan2(height, rampLength);
            rampMesh.rotation.x = angle;
            rampMesh.position.set(0, height / 2, length / 2 + rampLength / 2 - 0.4);
            group.add(rampMesh);

            // Ramp side safety barriers
            const railGeo = new THREE.BoxGeometry(0.08, 0.5, rampLength);
            const leftRail = new THREE.Mesh(railGeo, this.materials.hazardStripe);
            leftRail.rotation.x = angle;
            leftRail.position.set(-width * 0.44, height / 2 + 0.3, length / 2 + rampLength / 2 - 0.4);
            const rightRail = new THREE.Mesh(railGeo, this.materials.hazardStripe);
            rightRail.rotation.x = angle;
            rightRail.position.set(width * 0.44, height / 2 + 0.3, length / 2 + rampLength / 2 - 0.4);
            group.add(leftRail);
            group.add(rightRail);
        }

        return {
            group,
            width,
            height,
            length,
            hasRamp,
            rampMesh
        };
    },

    /**
     * Low Barrier (requires Jump)
     */
    createLowBarrier() {
        const group = new THREE.Group();
        const width = 2.4;
        const height = 1.1;

        // Wooden/Striped Crossbar
        const barGeo = new THREE.BoxGeometry(width, 0.28, 0.15);
        const bar = new THREE.Mesh(barGeo, this.materials.hazardStripe);
        bar.position.y = 0.8;
        group.add(bar);

        // Support Legs
        const legGeo = new THREE.BoxGeometry(0.14, 0.95, 0.14);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });

        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-width / 2 + 0.2, 0.47, 0);
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(width / 2 - 0.2, 0.47, 0);
        group.add(leftLeg);
        group.add(rightLeg);

        // Flashing Warning Light on Top
        const lightGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.18, 12);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(0, 1.05, 0);
        group.add(light);

        return { group, width, height: 1.1, type: 'lowBarrier' };
    },

    /**
     * High Barrier (requires Roll / Duck)
     */
    createHighBarrier() {
        const group = new THREE.Group();
        const width = 2.6;
        const clearance = 1.6; // player rolls underneath
        const topHeight = 2.7;

        // Tall Side Support Pillars
        const postGeo = new THREE.BoxGeometry(0.18, topHeight, 0.18);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });

        const leftPost = new THREE.Mesh(postGeo, postMat);
        leftPost.position.set(-width / 2 + 0.15, topHeight / 2, 0);
        const rightPost = new THREE.Mesh(postGeo, postMat);
        rightPost.position.set(width / 2 - 0.15, topHeight / 2, 0);
        group.add(leftPost);
        group.add(rightPost);

        // High Warning Sign Board
        const boardGeo = new THREE.BoxGeometry(width, 0.7, 0.18);
        const board = new THREE.Mesh(boardGeo, this.materials.hazardStripe);
        board.position.y = clearance + 0.35;
        group.add(board);

        // "CLEARANCE" text badge
        const badgeGeo = new THREE.BoxGeometry(1.6, 0.3, 0.2);
        const badgeMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.y = clearance + 0.35;
        group.add(badge);

        return { group, width, height: topHeight, clearance, type: 'highBarrier' };
    },

    /**
     * Roadwork Heavy Blockade (blocks entire lane, cannot jump or roll!)
     */
    createFullBlockade() {
        const group = new THREE.Group();
        const width = 2.6;
        const height = 2.4;

        // Heavy concrete base
        const baseGeo = new THREE.BoxGeometry(width, 0.6, 0.8);
        const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
        const base = new THREE.Mesh(baseGeo, concreteMat);
        base.position.y = 0.3;
        group.add(base);

        // Tall Warning Board with Chevron Arrows
        const signGeo = new THREE.BoxGeometry(width, 1.6, 0.18);
        const sign = new THREE.Mesh(signGeo, this.materials.hazardStripe);
        sign.position.y = 1.4;
        group.add(sign);

        // Flashing amber beacon
        const beaconGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(0, 2.3, 0);
        group.add(beacon);

        return { group, width, height: 2.4, type: 'blockade' };
    },

    /**
     * Spinning Gold Coin
     */
    createCoin() {
        const group = new THREE.Group();
        const radius = 0.42;
        const thickness = 0.12;

        const coinGeo = new THREE.CylinderGeometry(radius, radius, thickness, 20);
        coinGeo.rotateX(Math.PI / 2);
        const coin = new THREE.Mesh(coinGeo, this.materials.coinGold);
        group.add(coin);

        // Star / Rim detail
        const rimGeo = new THREE.TorusGeometry(radius * 0.78, 0.04, 8, 24);
        const rim = new THREE.Mesh(rimGeo, this.materials.coinGold);
        group.add(rim);

        return { group, radius };
    },

    /**
     * Power-Up Models: Magnet, Super Sneakers, Jetpack, 2x Multiplier
     */
    createPowerup(type) {
        const group = new THREE.Group();

        if (type === 'magnet') {
            // Horseshoe Magnet
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd90429, metalness: 0.6, roughness: 0.3 });
            const tipMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });

            const archGeo = new THREE.TorusGeometry(0.38, 0.12, 12, 24, Math.PI);
            archGeo.rotateZ(Math.PI);
            const arch = new THREE.Mesh(archGeo, bodyMat);
            group.add(arch);

            const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), tipMat);
            tipL.position.set(-0.38, -0.22, 0);
            const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), tipMat);
            tipR.position.set(0.38, -0.22, 0);
            group.add(tipL);
            group.add(tipR);
        } else if (type === 'jetpack') {
            // Mini Jetpack
            const tankMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.7, roughness: 0.3 });
            const flameMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

            const tankGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12);
            const t1 = new THREE.Mesh(tankGeo, tankMat);
            t1.position.x = -0.18;
            const t2 = new THREE.Mesh(tankGeo, tankMat);
            t2.position.x = 0.18;
            group.add(t1);
            group.add(t2);

            const flameGeo = new THREE.ConeGeometry(0.12, 0.3, 12);
            flameGeo.rotateX(Math.PI);
            const f1 = new THREE.Mesh(flameGeo, flameMat);
            f1.position.set(-0.18, -0.4, 0);
            const f2 = new THREE.Mesh(flameGeo, flameMat);
            f2.position.set(0.18, -0.4, 0);
            group.add(f1);
            group.add(f2);
        } else if (type === 'sneakers') {
            // Super Sneakers with Spring
            const shoeMat = new THREE.MeshStandardMaterial({ color: 0x06d6a0, roughness: 0.4 });
            const springMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });

            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.6), shoeMat);
            shoe.position.y = 0.15;
            group.add(shoe);

            const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12), springMat);
            spring.position.y = -0.15;
            group.add(spring);
        } else if (type === 'multiplier') {
            // 2X Golden Star Medallion
            const starMat = new THREE.MeshStandardMaterial({
                color: 0xffb703,
                emissive: 0xffb703,
                emissiveIntensity: 0.4,
                metalness: 0.8
            });
            const starGeo = new THREE.OctahedronGeometry(0.45, 0);
            const star = new THREE.Mesh(starGeo, starMat);
            group.add(star);

            const ringGeo = new THREE.TorusGeometry(0.55, 0.05, 8, 24);
            const ring = new THREE.Mesh(ringGeo, starMat);
            group.add(ring);
        }

        // Surrounding glowing halo
        const haloGeo = new THREE.SphereGeometry(0.65, 12, 12);
        const haloMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.25
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        group.add(halo);

        return { group, type };
    }
};

window.GameModels = GameModels;
