const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const coinCountEl = document.getElementById('coin-count');
const hearts = document.querySelectorAll('.heart');
const popupContainer = document.getElementById('popup-container');
const loveLetter = document.getElementById('love-letter');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const retryBtn = document.getElementById('retry-btn');
const trialScreen = document.getElementById('trial-screen');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const collectedLettersEl = document.getElementById('collected-letters');
const bgMusic = document.getElementById('bg-music');

// Dialog Elements
const dialogScreen = document.getElementById('dialog-screen');
const dialogText = document.getElementById('dialog-text');
const btnAccept = document.getElementById('btn-accept');
const btnRefuse = document.getElementById('btn-refuse');

// Mobile Buttons
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnDown = document.getElementById('btn-down');
const btnJump = document.getElementById('btn-jump');

// Audio unlock
let audioUnlocked = false;
function unlockAudio() {
    if (!audioUnlocked) {
        bgMusic.volume = 0.5;
        bgMusic.play().catch(e => console.log('Audio autoplay blocked'));
        audioUnlocked = true;
    }
}
window.addEventListener('keydown', unlockAudio);
window.addEventListener('touchstart', unlockAudio);
window.addEventListener('mousedown', unlockAudio);

// Audio Context & Synth Sounds
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playJumpSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playKillSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playWinSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
        
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.3);
        
        osc.start(audioCtx.currentTime + i * 0.1);
        osc.stop(audioCtx.currentTime + i * 0.1 + 0.3);
    });
}

// Images
const princessHeadImg = new Image();
princessHeadImg.src = 'princess_head.png';
const heroHeadImg = new Image();
heroHeadImg.src = 'hero_head.png';

// Game State
let gameState = 'playing'; // playing, dialog, trial, crouching, win, gameover
let currentLevelIndex = 0; // 0, 1, 2, 3
let collectedLettersStr = "";
let coinsAtLevelStart = 0;
let lettersAtLevelStart = "";
let cameraX = 0;
let cameraY = 0;
const GRAVITY = 0.6;
const ZOOM = 1.1; 
const MAX_COINS = 20;

let keys = {
    left: false,
    right: false,
    down: false,
    jump: false
};

// Trial Logic
const trialQuestions = [
    { q: "What's my favorite color?", options: ["Blue", "Red", "White"], correct: "Blue" },
    { q: "What's my favorite song?", options: ["nemshy men hena", "matafetsh", "3alam kadaba"], correct: "nemshy men hena" },
    { q: "Who is the love of my life?", options: ["Ruby", "Ruby", "Ruby"], correct: "Ruby" },
    { q: "What's the magic word that you collected throughout the game?", options: ["hope", "love", "faith"], correct: "love" }
];
let currentQuestionIndex = 0;
let refuseCount = 0;

btnAccept.onclick = () => {
    dialogScreen.classList.add('hidden');
    startTrial();
};
btnRefuse.onclick = () => {
    refuseCount++;
    const insults = [
        "Are you too scared? Pathetic! Accept your fate.",
        "How humiliating... turning your back on him?",
        "Coward! I expected more from you.",
        "Keep refusing all you want, he stays locked up until you face me!"
    ];
    dialogText.innerText = insults[(refuseCount - 1) % insults.length];
    dialogText.classList.remove('shake');
    void dialogText.offsetWidth; // trigger reflow
    dialogText.classList.add('shake');
};

function startTrial() {
    gameState = 'trial';
    currentQuestionIndex = 0;
    trialScreen.classList.remove('hidden');
    loadQuestion();
}

function loadQuestion() {
    const qData = trialQuestions[currentQuestionIndex];
    questionText.innerText = qData.q;
    optionsContainer.innerHTML = '';
    
    qData.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(opt, btn);
        optionsContainer.appendChild(btn);
    });
}

function handleAnswer(selected, btn) {
    const qData = trialQuestions[currentQuestionIndex];
    if (selected === qData.correct || qData.options.every(o => o === "Ruby")) {
        currentQuestionIndex++;
        if (currentQuestionIndex >= trialQuestions.length) {
            trialScreen.classList.add('hidden');
            gameState = 'playing';
            guardian.defeated = true; // Guardian steps aside
            showPopupMessage("The Guardian steps aside...");
        } else {
            loadQuestion();
        }
    } else {
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 400);
        const msgs = ["wtf", "really", "come on !!!!", "are you kidding me?", "seriously?"];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        showPopupMessage(msg, true); // Angry red text popup
    }
}


// Background Particles
let bgParticles = [];
function initBgParticles() {
    bgParticles = [];
    for (let i = 0; i < 60; i++) {
        bgParticles.push({
            x: Math.random() * 8000, 
            y: Math.random() * 1500, 
            size: Math.random() * 15 + 10,
            speed: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.3 + 0.1
        });
    }
}

// Pixel Art Palette & Sprites
const P = {
    'R': '#e52521', 
    'B': '#005bea', 
    'S': '#ffcc99', 
    'K': '#000000', 
    'W': '#ffffff', 
    'Y': '#ffd700', 
    'G': '#4caf50', 
    'P': '#ff69b4', 
    'C': '#8b4513', 
    'D': '#654321', 
    '0': null
};

// PRINCESS BODY (We will draw the princess_head.png over this)
const HERO_SPRITE = [
    "000000000000",
    "000000000000",
    "000000000000",
    "000000000000",
    "000000000000",
    "000000000000",
    "000PPPPPP000",
    "00PPPPPPPP00",
    "00PPWWWWPP00",
    "0PPPPPPPPPP0",
    "0PPPPPPPPPP0",
    "PPPPPPPPPPPP",
    "PPPPPPPPPPPP",
    "PPPPPPPPPPPP",
    "00WW0000WW00",
    "00WW0000WW00"
];

// HERO BODY (We will draw the hero_head.png over this)
const TRAPPED_SPRITE = [
    "000000000000",
    "000000000000",
    "000000000000",
    "000000000000",
    "000000000000",
    "000000000000",
    "000SSSS00000",
    "00RRBBRR0000",
    "0RRRBBBRRR00",
    "RRRRBBRRRR00",
    "SSRRBBRRSS00",
    "SSSBBBBSSS00",
    "SSBBBBBBSS00",
    "00BB00BB0000",
    "0CC0000CC000",
    "CCC0000CCC00"
];

const ENEMY_SPRITE = [
    "0000000000000000",
    "0000KKKKKK000000",
    "000KKKKKKKK00000",
    "00KKKSSSSKKK0000",
    "00KKSKKSKKSK0000",
    "00KKSSSSSSKK0000",
    "00KKKSSSSKKK0000",
    "00KK0RRRR0KK0000",
    "00KKRRRRRRKK0000",
    "00KRRRRRRRRK0000",
    "00KRRRRRRRRK0000",
    "000RRRRRRRR00000",
    "000RRRRRRRR00000",
    "0000SS00SS000000",
    "0000KK00KK000000",
    "0000000000000000"
];

const COIN_SPRITE = [
    "0000YYYY0000",
    "00YYYYYYYY00",
    "0YYWWWWWWYY0",
    "0YYWYYYYWYY0",
    "YYYYYWWYYYYY",
    "YYYYYWWYYYYY",
    "YYYYYWWYYYYY",
    "YYYYYWWYYYYY",
    "YYYYYWWYYYYY",
    "YYYYYWWYYYYY",
    "0YYWYYYYWYY0",
    "0YYWWWWWWYY0",
    "00YYYYYYYY00",
    "0000YYYY0000",
    "000000000000",
    "000000000000"
];

const GUARDIAN_SPRITE = [
    "0000000000000000",
    "000KKKKKKKK00000",
    "00KKKKKKKKKK0000",
    "0KKRRKKKKRRKK000",
    "0KKRRKKKKRRKK000",
    "0KKKKKKKKKKKK000",
    "00KKKDDDDDD00000",
    "00KDDDDDDDDD0000",
    "0KDDDDDDDDDDD000",
    "KDDDDDDDDDDDD000",
    "KDDDDDDDDDDDD000",
    "KDDDDDDDDDDDD000",
    "00DD0000DD000000",
    "00DD0000DD000000",
    "0000000000000000",
    "0000000000000000"
];

function drawSprite(ctx, sprite, x, y, scale = 4, flipX = false) {
    for (let row = 0; row < sprite.length; row++) {
        for (let col = 0; col < sprite[row].length; col++) {
            let colorCode = sprite[row][col];
            if (colorCode !== '0' && P[colorCode]) {
                ctx.fillStyle = P[colorCode];
                let drawX = flipX ? (sprite[row].length - 1 - col) * scale : col * scale;
                ctx.fillRect(x + drawX, y + row * scale, scale, scale);
            }
        }
    }
}

// Input Handling
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = false;
});

const addTouch = (btn, key) => {
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; btn.classList.add('active'); }, {passive: false});
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; btn.classList.remove('active'); }, {passive: false});
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); keys[key] = true; btn.classList.add('active'); });
    btn.addEventListener('mouseup', (e) => { e.preventDefault(); keys[key] = false; btn.classList.remove('active'); });
    btn.addEventListener('mouseleave', (e) => { e.preventDefault(); keys[key] = false; btn.classList.remove('active'); });
};

addTouch(btnLeft, 'left');
addTouch(btnRight, 'right');
addTouch(btnDown, 'down');
addTouch(btnJump, 'jump');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.w &&
           r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h &&
           r1.y + r1.h > r2.y;
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 48; 
        this.h = 64; 
        this.vx = 0;
        this.vy = 0;
        this.maxSpeed = 7;
        this.acceleration = 1.0;
        this.friction = 0.82;
        this.jumpPower = -15; 
        this.grounded = false;
        this.health = 3;
        this.coins = 0;
        this.invincibleTimer = 0;
        this.facingLeft = false;
        
        this.crouchingOffset = 0;
    }

    update() {
        if (gameState === 'crouching') {
            this.crouchingOffset += 1.5; // slowly sink down
            if (this.crouchingOffset > 70) {
                // Done crouching, next level
                currentLevelIndex++;
                coinsAtLevelStart = player.coins;
                lettersAtLevelStart = collectedLettersStr;
                initLevel();
            }
            return;
        }

        if (gameState !== 'playing') return;

        if (keys.left) {
            this.vx -= this.acceleration;
            this.facingLeft = true;
        } else if (keys.right) {
            this.vx += this.acceleration;
            this.facingLeft = false;
        } 
        
        this.vx *= this.friction;

        if (this.vx > this.maxSpeed) this.vx = this.maxSpeed;
        if (this.vx < -this.maxSpeed) this.vx = -this.maxSpeed;

        if (Math.abs(this.vx) < 0.1) this.vx = 0;

        if (keys.jump && this.grounded) {
            this.vy = this.jumpPower;
            this.grounded = false;
            playJumpSound();
        }

        this.vy += GRAVITY;

        let nextX = this.x + this.vx;
        let nextY = this.y + this.vy;

        this.grounded = false;
        for (let p of platforms) {
            if (p.type === 'block') {
                if (this.vy >= 0 && this.y + this.h - this.vy <= p.y + 0.1) {
                    if (checkCollision({x: nextX, y: nextY, w: this.w, h: this.h}, p)) {
                        nextY = p.y - this.h;
                        this.vy = 0;
                        this.grounded = true;
                    }
                }
            } else {
                if (checkCollision({x: nextX, y: this.y, w: this.w, h: this.h}, p)) {
                    if (this.vx > 0) { nextX = p.x - this.w; this.vx = 0; }
                    else if (this.vx < 0) { nextX = p.x + p.w; this.vx = 0; }
                }
                if (checkCollision({x: this.x, y: nextY, w: this.w, h: this.h}, p)) {
                    if (this.vy > 0) {
                        nextY = p.y - this.h; 
                        this.grounded = true;
                    } else if (this.vy < 0) {
                        nextY = p.y + p.h; 
                    }
                    this.vy = 0;
                }
            }
        }

        this.x = nextX;
        this.y = nextY;

        // Safe respawn mechanic: search for nearest ground platform
        if (this.y > cameraY + (canvas.height / ZOOM) + 200) {
            this.takeDamage(1);
            if (this.health > 0) {
                // Find nearest ground platform on X axis
                let nearest = platforms[0];
                let minDist = Infinity;
                platforms.forEach(p => {
                    if (p.type === 'ground') {
                        let cx = p.x + p.w/2;
                        let dist = Math.abs(cx - this.x);
                        if(dist < minDist) { minDist = dist; nearest = p; }
                    }
                });
                
                this.x = Math.max(nearest.x + 20, Math.min(this.x, nearest.x + nearest.w - 60));
                this.y = nearest.y - 150;
                this.vx = 0;
                this.vy = 0;
                this.invincibleTimer = 60;
            }
        }
        
        if (this.x < 0) {
            this.x = 0;
            this.vx = 0;
        }

        if (this.invincibleTimer > 0) this.invincibleTimer--;
    }

    takeDamage(amount) {
        if (this.invincibleTimer > 0 || gameState !== 'playing') return;
        
        this.health -= amount;
        this.invincibleTimer = 90; 
        
        hearts.forEach((heart, i) => {
            if (i >= this.health) heart.classList.add('lost');
        });

        if (this.health <= 0) {
            gameState = 'gameover';
            gameOverScreen.classList.remove('hidden');
        }
    }

    draw() {
        if (this.invincibleTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            return; 
        }
        ctx.save();
        // Crouching clip
        if (gameState === 'crouching') {
            ctx.beginPath();
            ctx.rect(this.x - 20, this.y + this.crouchingOffset, this.w + 40, this.h);
            ctx.clip();
            ctx.translate(0, this.crouchingOffset);
        }

        drawSprite(ctx, HERO_SPRITE, this.x, this.y, 4, this.facingLeft);
        
        // Draw the custom princess head PNG on top
        if (princessHeadImg.complete && princessHeadImg.naturalHeight !== 0) {
            ctx.save();
            if (this.facingLeft) {
                ctx.translate(this.x + this.w, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(princessHeadImg, 0, -10, 48, 48); // scale appropriately
            } else {
                ctx.drawImage(princessHeadImg, this.x, this.y - 10, 48, 48);
            }
            ctx.restore();
        }

        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, range) {
        this.startX = x;
        this.x = x;
        this.y = y;
        this.w = 64; 
        this.h = 64; 
        this.range = range;
        this.speed = 1.5;
        this.direction = 1;
        this.active = true;
    }

    update() {
        if (!this.active || gameState !== 'playing') return;
        
        this.x += this.speed * this.direction;
        if (this.x > this.startX + this.range || this.x < this.startX) {
            this.direction *= -1;
        }

        if (checkCollision(this, player)) {
            if (player.vy > 0 && player.y + player.h < this.y + this.h / 1.5) {
                this.active = false;
                player.vy = -12; 
                playKillSound();
                for (let i = 0; i < 30; i++) {
                    deathParticles.push(new DeathParticle(this.x + this.w / 2, this.y + this.h / 2));
                }
            } else {
                player.takeDamage(1);
            }
        }
    }

    draw() {
        if (!this.active) return;
        drawSprite(ctx, ENEMY_SPRITE, this.x, this.y, 4, this.direction > 0);
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 48;
        this.h = 64;
        this.baseY = y;
        this.active = true;
        this.time = Math.random() * 100;
    }

    update() {
        if (!this.active || gameState !== 'playing') return;
        
        this.time += 0.05;
        this.y = this.baseY + Math.sin(this.time) * 5;

        if (checkCollision(this, player)) {
            this.active = false;
            player.coins++;
            coinCountEl.innerText = `${player.coins} / ${MAX_COINS}`;
            showPopupMessage("I love you ❤️", false, this.x, this.y);
        }
    }

    draw() {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        ctx.scale(Math.sin(this.time * 2), 1);
        ctx.translate(-(this.x + this.w/2), -(this.y + this.h/2));
        drawSprite(ctx, COIN_SPRITE, this.x, this.y, 4);
        ctx.restore();
    }
}

class CollectibleLetter {
    constructor(x, y, char) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 40;
        this.baseY = y;
        this.char = char;
        this.active = true;
        this.time = 0;
    }

    update() {
        if (!this.active || gameState !== 'playing') return;
        this.time += 0.1;
        this.y = this.baseY + Math.sin(this.time) * 8;

        if (checkCollision(this, player)) {
            this.active = false;
            collectedLettersStr += this.char;
            let displayStr = collectedLettersStr.split('').join(' ');
            while(displayStr.length < 7) displayStr += " _";
            collectedLettersEl.innerText = displayStr;
            showPopupMessage(`Got '${this.char}'!`, false, this.x, this.y);
        }
    }

    draw() {
        if (!this.active) return;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 60px Outfit';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        ctx.fillText(this.char, this.x + 20, this.y + 40);
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 2;
        ctx.strokeText(this.char, this.x + 20, this.y + 40);
    }
}

class Pipe {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 80;
        this.h = 80;
        this.type = 'solid';
    }

    update() {
        if (gameState !== 'playing') return;

        // Check if player has letter for this level
        const requiredLength = currentLevelIndex + 1;
        if (collectedLettersStr.length >= requiredLength) {
            // Check if player is standing on pipe and pressing Down
            if (keys.down && Math.abs((player.x + player.w/2) - (this.x + this.w/2)) < 30 && player.grounded && player.y + player.h <= this.y + 10) {
                gameState = 'crouching';
                player.x = this.x + this.w/2 - player.w/2; // Center horizontally
                player.vx = 0;
            }
        }
    }

    draw() {
        // Draw Pipe (Green)
        ctx.fillStyle = '#228B22';
        ctx.fillRect(this.x + 5, this.y + 20, this.w - 10, this.h - 20);
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(this.x, this.y, this.w, 20);
        
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.x + 5, this.y + 20, this.w - 10, this.h - 20);
        ctx.strokeRect(this.x, this.y, this.w, 20);

        const requiredLength = currentLevelIndex + 1;
        if (collectedLettersStr.length >= requiredLength) {
            ctx.fillStyle = 'rgba(100, 255, 255, 0.9)';
            ctx.font = 'bold 24px Outfit';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 10;
            ctx.fillText("▼ Crouch", this.x + this.w/2, this.y - 30 + Math.sin(Date.now()/150)*5);
            ctx.shadowBlur = 0;
        }
    }
}

class Guardian {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 64; // 16x16 * 4
        this.h = 64; 
        this.defeated = false;
        this.talked = false;
    }

    update() {
        if (gameState !== 'playing') return;
        if (!this.defeated && checkCollision(this, player)) {
            // Stop player and talk
            player.vx = 0;
            if (!this.talked) {
                this.talked = true;
                gameState = 'dialog';
                refuseCount = 0;
                dialogText.innerText = "Halt! You must pass my wisdom trial to save your beloved. Will you accept my challenge?";
                dialogScreen.classList.remove('hidden');
            } else {
                // If they walk into him again after escaping dialog
                player.x = this.x - player.w - 5;
            }
        }
        if (this.defeated) {
            // Step aside
            this.x += 2; // move right out of the way
        }
    }

    draw() {
        drawSprite(ctx, GUARDIAN_SPRITE, this.x, this.y, 4, true);
    }
}

class TrappedHero { 
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 48;
        this.h = 64;
    }

    update() {
        if (gameState !== 'playing') return;
        if (guardian && guardian.defeated && checkCollision(this, player)) {
            if (gameState !== 'win') {
                gameState = 'win';
                playWinSound();
                loveLetter.classList.remove('hidden');
            }
        }
    }

    draw() {
        // Draw the trapped Prince/Hero Body
        drawSprite(ctx, TRAPPED_SPRITE, this.x, this.y, 4);

        if (heroHeadImg.complete && heroHeadImg.naturalHeight !== 0) {
            ctx.drawImage(heroHeadImg, this.x, this.y - 10, 48, 48);
        }

        if (guardian && !guardian.defeated) {
            ctx.fillStyle = 'rgba(30, 10, 20, 0.9)';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(this.x - 10 + (i * 20), this.y - 10, 8, this.h + 20);
            }
            ctx.fillRect(this.x - 15, this.y - 15, this.w + 30, 10);
            ctx.fillRect(this.x - 15, this.y + this.h, this.w + 30, 10);
        } else {
            ctx.fillStyle = '#ff3366';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('❤', this.x + this.w/2, this.y - 20 + Math.sin(Date.now()/200)*10);
        }
    }
}

class Platform {
    constructor(x, y, w, h, type = 'ground') {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.type = type; 
    }
    draw() {
        if (this.type === 'ground') {
            // Theme colors based on level
            let dirt = '#ffb3c6';
            let grass = '#ff4d6d';
            let highl = '#ff758c';
            
            if (currentLevelIndex === 1) { // Night
                dirt = '#1a1a3a'; grass = '#2a2a5a'; highl = '#3a3a6a';
            } else if (currentLevelIndex === 2) { // Clouds
                dirt = '#ffcca8'; grass = '#ffaa88'; highl = '#ffc3a0';
            } else if (currentLevelIndex === 3) { // Castle
                dirt = '#4a4a4a'; grass = '#2a2a2a'; highl = '#5a5a5a';
            }

            ctx.fillStyle = dirt; 
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillStyle = grass; 
            ctx.fillRect(this.x, this.y, this.w, 20);
            ctx.fillStyle = highl;
            ctx.fillRect(this.x, this.y, this.w, 5);

            if (currentLevelIndex !== 3) {
                ctx.fillStyle = 'rgba(255, 51, 102, 0.2)';
                ctx.font = '24px Arial';
                for(let i = this.x + 30; i < this.x + this.w - 30; i += 100) {
                    ctx.fillText('❤', i, this.y + 60);
                }
            } else {
                // Castle bricks
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                for(let i = this.x; i < this.x + this.w; i += 40) {
                    ctx.strokeRect(i, this.y + 20, 40, 20);
                    ctx.strokeRect(i - 20, this.y + 40, 40, 20);
                }
            }
        } else {
            ctx.fillStyle = (currentLevelIndex === 3) ? '#555' : '#ff4b72';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillStyle = (currentLevelIndex === 3) ? '#777' : '#ff8fa3';
            ctx.fillRect(this.x, this.y, this.w, 4);
        }
    }
}

function showPopupMessage(msg, isWarning = false, wx = null, wy = null) {
    const el = document.createElement('div');
    el.className = 'love-popup';
    el.innerText = msg;
    if (isWarning) el.style.color = '#ff0000';
    
    if (wx !== null && wy !== null) {
        const screenX = (wx - cameraX) * ZOOM;
        const screenY = (wy - cameraY) * ZOOM;
        el.style.left = `${screenX}px`;
        el.style.top = `${screenY - 30}px`;
    } else {
        el.style.left = `50%`;
        el.style.top = `30%`;
        el.style.transform = `translateX(-50%)`;
    }
    
    popupContainer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

class DeathParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = (Math.random() - 0.5) * 15 - 5;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
        this.color = ['#e52521', '#ffcc99', '#ffffff', '#000000'][Math.floor(Math.random() * 4)];
        this.size = Math.random() * 8 + 4;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += GRAVITY * 0.8;
        this.life -= this.decay;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

// Game Objects
let platforms = [];
let enemies = [];
let coins = [];
let letters = [];
let deathParticles = [];
let pipe = null;
let guardian = null;
let trappedHero = null;
let gameLoopId = null;
let LEVEL_WIDTH = 3000;
let player = new Player(100, 500);

const LEVEL_LETTERS = ['L', 'O', 'V', 'E'];

function initLevel() {
    popupContainer.innerHTML = '';
    let groundY = 650;
    
    // Reset lists
    platforms = [];
    enemies = [];
    coins = [];
    letters = [];
    deathParticles = [];
    pipe = null;
    guardian = null;
    trappedHero = null;
    
    player.x = 100;
    player.y = groundY - 64;
    player.vx = 0;
    player.vy = 0;
    player.health = 3;
    player.crouchingOffset = 0;
    hearts.forEach(h => h.classList.remove('lost'));

    initBgParticles();

    if (currentLevelIndex === 0) {
        LEVEL_WIDTH = 3000;
        platforms = [
            new Platform(0, groundY, 800, 500), 
            new Platform(900, groundY, 600, 500),
            new Platform(1700, groundY, 1500, 500), 
            
            new Platform(400, groundY - 140, 150, 24, 'block'),
            new Platform(1100, groundY - 180, 150, 24, 'block'),
            new Platform(1300, groundY - 280, 100, 24, 'block'), 
        ];
        enemies = [
            new Enemy(500, groundY - 64, 200),
            new Enemy(1200, groundY - 64, 250),
            new Enemy(2000, groundY - 64, 300)
        ];
        for(let i=0; i<5; i++) coins.push(new Coin(300 + i*400, groundY - 120));
        letters.push(new CollectibleLetter(2500, groundY - 100, LEVEL_LETTERS[0]));
        pipe = new Pipe(2800, groundY - 80);
        platforms.push(pipe);

    } else if (currentLevelIndex === 1) {
        LEVEL_WIDTH = 4000;
        platforms = [
            new Platform(0, groundY, 500, 500), 
            new Platform(700, groundY, 400, 500),
            new Platform(1300, groundY, 400, 500),
            new Platform(1900, groundY, 800, 500),
            new Platform(2900, groundY, 1200, 500),
            
            new Platform(500, groundY - 150, 150, 24, 'block'),
            new Platform(1100, groundY - 250, 150, 24, 'block'),
        ];
        enemies = [
            new Enemy(800, groundY - 64, 200),
            new Enemy(2100, groundY - 64, 300),
            new Enemy(2500, groundY - 64, 200)
        ];
        for(let i=0; i<5; i++) coins.push(new Coin(500 + i*500, groundY - 150));
        letters.push(new CollectibleLetter(3400, groundY - 100, LEVEL_LETTERS[1]));
        pipe = new Pipe(3700, groundY - 80);
        platforms.push(pipe);

    } else if (currentLevelIndex === 2) {
        LEVEL_WIDTH = 4500;
        platforms = [
            new Platform(0, groundY, 400, 500), 
            new Platform(600, groundY, 300, 500),
            new Platform(1100, groundY, 300, 500),
            new Platform(1600, groundY, 1000, 500),
            new Platform(2800, groundY, 500, 500),
            new Platform(3500, groundY, 1200, 500),
        ];
        enemies = [
            new Enemy(700, groundY - 64, 150),
            new Enemy(1800, groundY - 64, 300),
            new Enemy(2900, groundY - 64, 200)
        ];
        for(let i=0; i<5; i++) coins.push(new Coin(600 + i*600, groundY - 180));
        letters.push(new CollectibleLetter(4000, groundY - 100, LEVEL_LETTERS[2]));
        pipe = new Pipe(4300, groundY - 80);
        platforms.push(pipe);

    } else if (currentLevelIndex === 3) {
        // Castle level
        LEVEL_WIDTH = 3500;
        platforms = [
            new Platform(0, groundY, 800, 500), 
            new Platform(1000, groundY, 800, 500),
            new Platform(2000, groundY, 1500, 500),
        ];
        enemies = [
            new Enemy(400, groundY - 64, 300),
            new Enemy(1200, groundY - 64, 400),
            new Enemy(2200, groundY - 64, 200)
        ];
        for(let i=0; i<5; i++) coins.push(new Coin(400 + i*450, groundY - 120));
        letters.push(new CollectibleLetter(2800, groundY - 100, LEVEL_LETTERS[3]));
        
        guardian = new Guardian(3000, groundY - 64);
        trappedHero = new TrappedHero(3300, groundY - 64);
    }

    gameState = 'playing';
    trialScreen.classList.add('hidden');
    dialogScreen.classList.add('hidden');
    loveLetter.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    keys = { left: false, right: false, down: false, jump: false };
    
    // Update theme background in CSS programmatically
    const root = document.documentElement;
    if (currentLevelIndex === 0) {
        root.style.setProperty('--bg-gradient-start', '#7597de');
        root.style.setProperty('--bg-gradient-end', '#ff7eb3');
    } else if (currentLevelIndex === 1) {
        root.style.setProperty('--bg-gradient-start', '#0f2027');
        root.style.setProperty('--bg-gradient-end', '#203a43');
    } else if (currentLevelIndex === 2) {
        root.style.setProperty('--bg-gradient-start', '#f12711');
        root.style.setProperty('--bg-gradient-end', '#f5af19');
    } else if (currentLevelIndex === 3) {
        root.style.setProperty('--bg-gradient-start', '#430000');
        root.style.setProperty('--bg-gradient-end', '#000000');
    }
}

function update() {
    if (gameState === 'playing' || gameState === 'crouching') {
        player.update();
        if (gameState === 'playing') {
            enemies.forEach(e => e.update());
            coins.forEach(c => c.update());
            letters.forEach(l => l.update());
            deathParticles.forEach(dp => dp.update());
            deathParticles = deathParticles.filter(dp => dp.life > 0);
            if (pipe) pipe.update();
            if (guardian) guardian.update();
            if (trappedHero) trappedHero.update();
        }
    }

    const targetCameraX = player.x - (canvas.width / ZOOM) / 2.5;
    const targetCameraY = player.y - (canvas.height / ZOOM) / 1.5;
    
    cameraX += (targetCameraX - cameraX) * 0.1;
    cameraY += (targetCameraY - cameraY) * 0.1;

    if (cameraX < 0) cameraX = 0;
    if (cameraX > LEVEL_WIDTH - (canvas.width / ZOOM)) cameraX = LEVEL_WIDTH - (canvas.width / ZOOM);
    if (cameraY > 650) cameraY = 650;

    bgParticles.forEach(h => {
        h.y += h.speed;
        if(h.y > cameraY + (canvas.height / ZOOM) + 50) h.y = cameraY - 50;
    });
}

function drawBackground() {
    ctx.clearRect(0, 0, canvas.width / ZOOM, canvas.height / ZOOM);
    
    ctx.fillStyle = (currentLevelIndex === 1) ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
    bgParticles.forEach(h => {
        ctx.globalAlpha = h.opacity;
        if (currentLevelIndex === 1) {
            // Stars for night
            ctx.beginPath();
            ctx.arc(h.x - (cameraX * 0.1) % 8000, h.y - (cameraY * 0.1), h.size/4, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.font = `${h.size}px Arial`;
            let parallaxX = h.x - (cameraX * 0.2) % 8000;
            if(parallaxX < -50) parallaxX += 8050;
            let parallaxY = h.y - (cameraY * 0.2);
            ctx.fillText('❤', parallaxX, parallaxY);
        }
    });
    ctx.globalAlpha = 1.0;
}

function draw() {
    ctx.save();
    ctx.scale(ZOOM, ZOOM); 
    
    drawBackground();

    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    platforms.forEach(p => p.draw());
    if (pipe) pipe.draw();
    coins.forEach(c => c.draw());
    letters.forEach(l => l.draw());
    enemies.forEach(e => e.draw());
    deathParticles.forEach(dp => dp.draw(ctx));
    if (guardian) guardian.draw();
    if (trappedHero) trappedHero.draw();
    player.draw();

    ctx.restore();
    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    gameLoopId = requestAnimationFrame(gameLoop);
}

function resetGame() {
    currentLevelIndex = 0; 
    coinsAtLevelStart = 0;
    lettersAtLevelStart = "";
    collectedLettersStr = ""; 
    collectedLettersEl.innerText = "_ _ _ _"; 
    player.coins = 0; 
    coinCountEl.innerText = `0 / ${MAX_COINS}`;
    initLevel();
}

function retryLevel() {
    player.coins = coinsAtLevelStart;
    collectedLettersStr = lettersAtLevelStart;
    
    let displayStr = collectedLettersStr.split('').join(' ');
    while(displayStr.length < 7) displayStr += " _";
    collectedLettersEl.innerText = displayStr;
    
    coinCountEl.innerText = `${player.coins} / ${MAX_COINS}`;
    
    initLevel();
}

initLevel();

restartBtn.addEventListener('click', resetGame);
retryBtn.addEventListener('click', retryLevel);

if (!gameLoopId) {
    gameLoopId = requestAnimationFrame(gameLoop);
}
