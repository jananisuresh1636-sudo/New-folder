/**
 * Subway Surfers - Metro Runner
 * UI Controller, Shop System, Character Selector, Controls & State Persistence
 */

class GameUI {
    constructor() {
        this.game = null;

        // Persistent State
        this.highScore = parseInt(localStorage.getItem('subway_high_score') || '0', 10);
        this.totalCoins = parseInt(localStorage.getItem('subway_total_coins') || '150', 10); // starting bonus!
        this.hoverboardStock = parseInt(localStorage.getItem('subway_hoverboards') || '3', 10);
        this.selectedCharacter = localStorage.getItem('subway_character') || 'jake';
        this.unlockedCharacters = JSON.parse(localStorage.getItem('subway_unlocked_chars') || '["jake"]');

        this.upgradeLevels = JSON.parse(localStorage.getItem('subway_upgrades') || JSON.stringify({
            magnet: 1,
            jetpack: 1,
            sneakers: 1,
            multiplier: 1
        }));

        // Upgrade costs & stat scalings
        this.upgradeConfig = {
            magnet: { name: 'Coin Magnet', baseCost: 400, baseDuration: 8, perLevel: 2.5, icon: '🧲' },
            jetpack: { name: 'Jetpack', baseCost: 600, baseDuration: 6, perLevel: 2.0, icon: '🚀' },
            sneakers: { name: 'Super Sneakers', baseCost: 500, baseDuration: 10, perLevel: 2.5, icon: '👟' },
            multiplier: { name: '2x Multiplier', baseCost: 500, baseDuration: 12, perLevel: 3.0, icon: '⭐' }
        };

        this.characterData = {
            jake: { name: 'Jake', cost: 0, tag: 'The Classic Subway Legend', color: '#ef233c' },
            tricky: { name: 'Tricky', cost: 500, tag: 'Skate Queen of the Tracks', color: '#06d6a0' },
            fresh: { name: 'Fresh', cost: 1200, tag: 'Boombox Beat Maestro', color: '#fb8500' },
            cyber: { name: 'Cyber Ninja', cost: 2500, tag: 'Neon High-Tech Speeder', color: '#00f5d4' }
        };

        // Swipe & Double Tap tracker
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastTapTime = 0;
        this.lastSpaceTime = 0;
    }

    init(game) {
        this.game = game;

        // Apply saved upgrades to game engine
        this.syncGameUpgrades();
        this.game.hoverboardStock = this.hoverboardStock;

        // Bind DOM Elements
        this.cacheDOMElements();

        // Setup Controls (Keyboard + Touch Swipes + UI clicks)
        this.setupKeyboardControls();
        this.setupTouchAndMouseControls();
        this.setupButtonListeners();

        // Update initial UI counters
        this.refreshBankDisplays();
        this.updateHoverboardCount(this.hoverboardStock);

        // Open Menu Screen
        this.showScreen('menu-screen');
    }

    cacheDOMElements() {
        this.screens = {
            menu: document.getElementById('menu-screen'),
            hud: document.getElementById('hud-screen'),
            pause: document.getElementById('pause-screen'),
            gameOver: document.getElementById('game-over-screen'),
            shop: document.getElementById('shop-modal'),
            characters: document.getElementById('characters-modal')
        };

        // HUD Elements
        this.scoreDisplay = document.getElementById('hud-score');
        this.highScoreDisplay = document.getElementById('hud-high-score');
        this.coinsDisplay = document.getElementById('hud-coins');
        this.multiplierBadge = document.getElementById('hud-multiplier');
        this.powerupBarsContainer = document.getElementById('powerup-bars');
        this.hoverboardBadge = document.getElementById('hoverboard-count');

        // Banners
        this.toastBanner = document.getElementById('game-toast');
    }

    syncGameUpgrades() {
        if (!this.game) return;
        Object.keys(this.upgradeLevels).forEach(type => {
            const level = this.upgradeLevels[type];
            const cfg = this.upgradeConfig[type];
            this.game.upgradeDurations[type] = cfg.baseDuration + (level - 1) * cfg.perLevel;
        });
    }

    refreshBankDisplays() {
        document.querySelectorAll('.bank-coins-text').forEach(el => {
            el.textContent = this.totalCoins.toLocaleString();
        });
        document.querySelectorAll('.high-score-text').forEach(el => {
            el.textContent = this.highScore.toLocaleString();
        });
    }

    showScreen(screenId) {
        Object.keys(this.screens).forEach(key => {
            const screen = this.screens[key];
            if (screen) {
                if (screen.id === screenId) {
                    screen.classList.add('active');
                } else if (!screen.classList.contains('modal')) {
                    screen.classList.remove('active');
                }
            }
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    // --- Input & Controls Binding ---

    setupKeyboardControls() {
        window.addEventListener('keydown', e => {
            if (e.repeat && e.code !== 'ArrowDown') return;

            // Pause toggle
            if (e.code === 'KeyP' || e.code === 'Escape') {
                this.togglePause();
                return;
            }

            // Audio Mute toggle
            if (e.code === 'KeyM') {
                this.toggleMute();
                return;
            }

            if (!this.game || this.game.state !== 'PLAYING') return;

            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    e.preventDefault();
                    this.game.moveLane(-1);
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    e.preventDefault();
                    this.game.moveLane(1);
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    e.preventDefault();
                    this.game.jump();
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    e.preventDefault();
                    this.game.roll();
                    break;
                case 'Space':
                    e.preventDefault();
                    const now = performance.now();
                    // Double space activates Hoverboard!
                    if (now - this.lastSpaceTime < 350) {
                        this.game.activateHoverboard();
                    } else {
                        this.game.jump();
                    }
                    this.lastSpaceTime = now;
                    break;
                case 'KeyH':
                    e.preventDefault();
                    this.game.activateHoverboard();
                    break;
            }
        });
    }

    setupTouchAndMouseControls() {
        const container = document.getElementById('game-container');

        // Pointer start (mouse or touch)
        const onStart = (x, y) => {
            this.touchStartX = x;
            this.touchStartY = y;

            const now = performance.now();
            if (now - this.lastTapTime < 320) {
                // Double tap triggers hoverboard!
                if (this.game && this.game.state === 'PLAYING') {
                    this.game.activateHoverboard();
                }
            }
            this.lastTapTime = now;
        };

        const onEnd = (endX, endY) => {
            const dx = endX - this.touchStartX;
            const dy = endY - this.touchStartY;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);

            const minSwipeDist = 28;

            if (absX > minSwipeDist || absY > minSwipeDist) {
                if (absX > absY) {
                    // Horizontal swipe
                    if (dx > 0) this.game.moveLane(1);
                    else this.game.moveLane(-1);
                } else {
                    // Vertical swipe
                    if (dy > 0) this.game.roll();
                    else this.game.jump();
                }
            }
        };

        // Touch event listeners
        window.addEventListener('touchstart', e => {
            if (e.touches.length > 0) {
                onStart(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        window.addEventListener('touchend', e => {
            if (e.changedTouches.length > 0) {
                onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
        }, { passive: true });

        // Mouse drag swipe for desktop
        let isMouseDown = false;
        container.addEventListener('mousedown', e => {
            isMouseDown = true;
            onStart(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', e => {
            if (isMouseDown) {
                isMouseDown = false;
                onEnd(e.clientX, e.clientY);
            }
        });
    }

    setupButtonListeners() {
        // Play Button
        document.getElementById('btn-play').addEventListener('click', () => {
            this.showScreen('hud-screen');
            this.game.startNewGame();
        });

        // Play Again Button (from Game Over screen)
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.showScreen('hud-screen');
            this.game.startNewGame();
        });

        // Pause / Resume Buttons
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-pause-restart').addEventListener('click', () => {
            this.showScreen('hud-screen');
            this.game.startNewGame();
        });
        document.getElementById('btn-pause-menu').addEventListener('click', () => {
            this.game.state = 'MENU';
            if (window.AudioEngine) window.AudioEngine.stopMusic();
            this.showScreen('menu-screen');
            this.refreshBankDisplays();
        });

        // Shop Buttons
        document.getElementById('btn-shop').addEventListener('click', () => {
            this.renderShopItems();
            this.openModal('shop-modal');
        });
        document.getElementById('btn-gameover-shop').addEventListener('click', () => {
            this.renderShopItems();
            this.openModal('shop-modal');
        });
        document.getElementById('btn-close-shop').addEventListener('click', () => {
            this.closeModal('shop-modal');
            this.refreshBankDisplays();
        });

        // Characters Buttons
        document.getElementById('btn-characters').addEventListener('click', () => {
            this.renderCharacterSelector();
            this.openModal('characters-modal');
        });
        document.getElementById('btn-close-characters').addEventListener('click', () => {
            this.closeModal('characters-modal');
        });

        // Audio Mute Toggle Button
        document.getElementById('btn-toggle-audio').addEventListener('click', () => {
            this.toggleMute();
        });

        // Hoverboard On-Screen Activation Button
        document.getElementById('btn-hud-hoverboard').addEventListener('click', () => {
            if (this.game) this.game.activateHoverboard();
        });

        // On-screen touch D-Pad controls for mobile/tablet players
        const btnL = document.getElementById('touch-left');
        const btnR = document.getElementById('touch-right');
        const btnU = document.getElementById('touch-jump');
        const btnD = document.getElementById('touch-roll');

        if (btnL) btnL.addEventListener('click', () => this.game.moveLane(-1));
        if (btnR) btnR.addEventListener('click', () => this.game.moveLane(1));
        if (btnU) btnU.addEventListener('click', () => this.game.jump());
        if (btnD) btnD.addEventListener('click', () => this.game.roll());
    }

    togglePause() {
        if (!this.game) return;
        if (this.game.state === 'PLAYING') {
            this.game.state = 'PAUSED';
            if (window.AudioEngine) window.AudioEngine.stopMusic();
            document.getElementById('pause-screen').classList.add('active');
        } else if (this.game.state === 'PAUSED') {
            this.game.state = 'PLAYING';
            if (window.AudioEngine) window.AudioEngine.startMusic();
            document.getElementById('pause-screen').classList.remove('active');
        }
    }

    toggleMute() {
        if (!window.AudioEngine) return;
        const isMuted = window.AudioEngine.toggleMute();
        const icon = isMuted ? '🔇' : '🔊';
        document.querySelectorAll('.audio-icon').forEach(el => (el.textContent = icon));
    }

    // --- In-Game Callbacks ---

    onGameStarted() {
        this.showScreen('hud-screen');
        this.updateHoverboardCount(this.game.hoverboardStock);
        this.multiplierBadge.textContent = 'x' + this.game.multiplier;
    }

    updateHUD(data) {
        if (this.scoreDisplay) this.scoreDisplay.textContent = data.score.toLocaleString();
        if (this.highScoreDisplay) this.highScoreDisplay.textContent = Math.max(this.highScore, data.score).toLocaleString();
        if (this.coinsDisplay) this.coinsDisplay.textContent = data.coins.toLocaleString();
        if (this.multiplierBadge) this.multiplierBadge.textContent = 'x' + data.multiplier;

        // Render Active Power-up Progress Rings / Bars
        this.renderPowerupBars(data.powerups);
    }

    renderPowerupBars(powerups) {
        if (!this.powerupBarsContainer) return;
        this.powerupBarsContainer.innerHTML = '';

        const powerupIcons = {
            magnet: '🧲',
            jetpack: '🚀',
            sneakers: '👟',
            multiplier: '⭐',
            hoverboard: '🛹'
        };

        Object.keys(powerups).forEach(type => {
            const remaining = powerups[type];
            if (remaining > 0) {
                const maxDur = type === 'hoverboard' ? 20 : (this.game.upgradeDurations[type] || 10);
                const pct = Math.max(0, Math.min(100, (remaining / maxDur) * 100));

                const barEl = document.createElement('div');
                barEl.className = 'powerup-card';
                barEl.innerHTML = `
                    <div class="powerup-icon-badge">${powerupIcons[type] || '⚡'}</div>
                    <div class="powerup-info">
                        <div class="powerup-name">${type.toUpperCase()}</div>
                        <div class="powerup-progress-bg">
                            <div class="powerup-progress-fill" style="width: ${pct}%;"></div>
                        </div>
                    </div>
                `;
                this.powerupBarsContainer.appendChild(barEl);
            }
        });
    }

    updateHoverboardCount(count) {
        this.hoverboardStock = count;
        localStorage.setItem('subway_hoverboards', count.toString());
        if (this.hoverboardBadge) {
            this.hoverboardBadge.textContent = count;
        }
    }

    showPowerupBanner(type, duration) {
        if (!this.toastBanner) return;
        const names = {
            magnet: '🧲 COIN MAGNET ACTIVATED!',
            jetpack: '🚀 JETPACK BLAST OFF!',
            sneakers: '👟 SUPER SNEAKERS ON!',
            multiplier: '⭐ 2X MULTIPLIER BOOST!',
            hoverboard: '🛹 HOVERBOARD SHIELD READY!'
        };

        this.toastBanner.textContent = names[type] || 'POWER-UP ACTIVATED!';
        this.toastBanner.classList.add('show');
        setTimeout(() => {
            this.toastBanner.classList.remove('show');
        }, 2200);
    }

    onGameOver(stats) {
        // Check for new High Score
        const isNewBest = stats.score > this.highScore;
        if (isNewBest) {
            this.highScore = stats.score;
            localStorage.setItem('subway_high_score', this.highScore.toString());
        }

        // Add coins to total bank
        this.totalCoins += stats.coins;
        localStorage.setItem('subway_total_coins', this.totalCoins.toString());

        // Update Game Over Modal Text
        document.getElementById('go-final-score').textContent = stats.score.toLocaleString();
        document.getElementById('go-best-score').textContent = this.highScore.toLocaleString();
        document.getElementById('go-run-coins').textContent = '+' + stats.coins.toLocaleString();
        document.getElementById('go-run-distance').textContent = stats.distance + ' m';

        const recordBadge = document.getElementById('go-record-banner');
        if (recordBadge) {
            recordBadge.style.display = isNewBest ? 'block' : 'none';
        }

        this.refreshBankDisplays();
        this.showScreen('game-over-screen');
    }

    // --- Shop System ---

    renderShopItems() {
        const list = document.getElementById('shop-items-container');
        if (!list) return;
        list.innerHTML = '';

        // 1. Hoverboard Item
        const hbItem = document.createElement('div');
        hbItem.className = 'shop-card';
        hbItem.innerHTML = `
            <div class="shop-card-icon">🛹</div>
            <div class="shop-card-content">
                <div class="shop-card-title">Hoverboard Shield</div>
                <div class="shop-card-desc">Protects against 1 crash! Owned: ${this.hoverboardStock}</div>
            </div>
            <button class="btn btn-buy" id="btn-buy-hoverboard">
                <span>300</span> <span class="coin-icon">🪙</span>
            </button>
        `;
        list.appendChild(hbItem);

        hbItem.querySelector('#btn-buy-hoverboard').addEventListener('click', () => {
            if (this.totalCoins >= 300) {
                this.totalCoins -= 300;
                this.hoverboardStock++;
                localStorage.setItem('subway_total_coins', this.totalCoins.toString());
                this.updateHoverboardCount(this.hoverboardStock);
                this.refreshBankDisplays();
                this.renderShopItems();
                if (window.AudioEngine) window.AudioEngine.playCoin();
            } else {
                alert('Not enough coins! Run more to collect coins.');
            }
        });

        // 2. Power-up Upgrades
        Object.keys(this.upgradeConfig).forEach(type => {
            const cfg = this.upgradeConfig[type];
            const currentLevel = this.upgradeLevels[type] || 1;
            const isMax = currentLevel >= 5;
            const cost = cfg.baseCost * currentLevel;

            const card = document.createElement('div');
            card.className = 'shop-card';
            card.innerHTML = `
                <div class="shop-card-icon">${cfg.icon}</div>
                <div class="shop-card-content">
                    <div class="shop-card-title">${cfg.name} (Lv. ${currentLevel}/5)</div>
                    <div class="shop-card-desc">Duration: ${(cfg.baseDuration + (currentLevel - 1) * cfg.perLevel).toFixed(1)}s</div>
                    <div class="level-dots">
                        ${[1, 2, 3, 4, 5].map(lv => `<span class="dot ${lv <= currentLevel ? 'filled' : ''}"></span>`).join('')}
                    </div>
                </div>
                <button class="btn btn-buy ${isMax ? 'disabled' : ''}" data-type="${type}">
                    ${isMax ? 'MAX' : `<span>${cost}</span> <span class="coin-icon">🪙</span>`}
                </button>
            `;
            list.appendChild(card);

            if (!isMax) {
                card.querySelector(`button[data-type="${type}"]`).addEventListener('click', () => {
                    if (this.totalCoins >= cost) {
                        this.totalCoins -= cost;
                        this.upgradeLevels[type]++;
                        localStorage.setItem('subway_total_coins', this.totalCoins.toString());
                        localStorage.setItem('subway_upgrades', JSON.stringify(this.upgradeLevels));
                        this.syncGameUpgrades();
                        this.refreshBankDisplays();
                        this.renderShopItems();
                        if (window.AudioEngine) window.AudioEngine.playPowerup();
                    } else {
                        alert('Not enough coins! Keep running to earn coins.');
                    }
                });
            }
        });
    }

    // --- Character Selector ---

    renderCharacterSelector() {
        const container = document.getElementById('characters-list');
        if (!container) return;
        container.innerHTML = '';

        Object.keys(this.characterData).forEach(id => {
            const char = this.characterData[id];
            const isUnlocked = this.unlockedCharacters.includes(id);
            const isSelected = this.selectedCharacter === id;

            const card = document.createElement('div');
            card.className = `character-card ${isSelected ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="char-avatar" style="border-color: ${char.color};">
                    <span class="char-icon">${id === 'jake' ? '🧢' : id === 'tricky' ? '🎀' : id === 'fresh' ? '📻' : '⚡'}</span>
                </div>
                <div class="char-name">${char.name}</div>
                <div class="char-tag">${char.tag}</div>
                <div class="char-action">
                    ${isSelected ? `<button class="btn btn-selected">SELECTED</button>` :
                      isUnlocked ? `<button class="btn btn-select" data-id="${id}">SELECT</button>` :
                      `<button class="btn btn-buy-char" data-id="${id}"><span>${char.cost}</span> <span class="coin-icon">🪙</span></button>`}
                </div>
            `;
            container.appendChild(card);

            if (!isSelected && isUnlocked) {
                card.querySelector(`button[data-id="${id}"]`).addEventListener('click', () => {
                    this.selectedCharacter = id;
                    localStorage.setItem('subway_character', id);
                    if (this.game) this.game.setupPlayer(id);
                    this.renderCharacterSelector();
                });
            } else if (!isUnlocked) {
                card.querySelector(`button[data-id="${id}"]`).addEventListener('click', () => {
                    if (this.totalCoins >= char.cost) {
                        this.totalCoins -= char.cost;
                        this.unlockedCharacters.push(id);
                        this.selectedCharacter = id;
                        localStorage.setItem('subway_total_coins', this.totalCoins.toString());
                        localStorage.setItem('subway_unlocked_chars', JSON.stringify(this.unlockedCharacters));
                        localStorage.setItem('subway_character', id);
                        if (this.game) this.game.setupPlayer(id);
                        this.refreshBankDisplays();
                        this.renderCharacterSelector();
                        if (window.AudioEngine) window.AudioEngine.playPowerup();
                    } else {
                        alert('Not enough coins to unlock this character!');
                    }
                });
            }
        });
    }
}

window.GameUI = new GameUI();
