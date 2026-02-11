<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orbital Drop: Vanguard</title>
    <style>
        :root {
            --ui-yellow: #fde047;
            --ui-bg: rgba(10, 10, 10, 0.95);
            --ui-red: #ef4444;
            --ui-blue: #3b82f6;
            --ui-green: #4ade80;
            --ui-purple: #a855f7;
        }

        body, html {
            margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden;
            background-color: #050505; font-family: 'Segoe UI', Tahoma, sans-serif;
            color: white; user-select: none;
        }

        #game-container {
            position: relative; width: 100vw; height: 100vh;
            display: flex; justify-content: center; align-items: center; background: #0a0a0a;
        }

        canvas { display: block; cursor: crosshair; }

        #ui-layer {
            position: absolute; inset: 0; pointer-events: none;
            padding: 20px; display: flex; flex-direction: column; z-index: 10;
        }

        .stats-box {
            background: var(--ui-bg); padding: 10px 20px; border-left: 4px solid var(--ui-yellow);
            text-transform: uppercase; letter-spacing: 2px; font-size: 0.9rem; pointer-events: auto;
        }

        #stratagem-ui {
            background: var(--ui-bg); padding: 15px; border: 1px solid rgba(255, 255, 255, 0.1);
            width: 360px; backdrop-filter: blur(10px); opacity: 0; transform: translateY(20px);
            transition: all 0.2s ease-out; margin-top: auto;
        }

        #stratagem-ui.visible { opacity: 1; transform: translateY(0); }

        .stratagem-item { margin-bottom: 12px; font-size: 11px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; }
        .stratagem-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .key-box { width: 16px; height: 16px; border: 1px solid rgba(255,255,255,0.4); display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 9px; margin-left: 2px; }
        .key-box.hit { background: var(--ui-yellow); color: black; border-color: var(--ui-yellow); }

        .bar-container { width: 100%; height: 6px; background: #222; margin: 2px 0; border-radius: 1px; overflow: hidden; }
        .bar-fill { height: 100%; width: 100%; transition: width 0.1s linear; }

        #sequence-display {
            position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%);
            display: none; flex-direction: column; align-items: center; gap: 12px;
            background: rgba(0,0,0,0.85); padding: 20px; border: 2px solid var(--ui-yellow);
            box-shadow: 0 0 20px rgba(253, 224, 71, 0.3);
            pointer-events: none;
        }

        .overlay-screen {
            position: absolute; inset: 0; background: rgba(5, 5, 5, 0.98);
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            z-index: 100; text-align: center; padding: 40px;
        }

        #mission-screen { z-index: 110; }

        .mission-grid, .stratagem-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0; max-width: 800px; }
        .stratagem-grid { grid-template-columns: repeat(4, 1fr); }

        .selectable-card { background: #111; border: 2px solid #333; padding: 20px; cursor: pointer; transition: 0.2s; text-align: left; }
        .selectable-card h3 { margin-top: 0; color: var(--ui-yellow); }
        .selectable-card.selected { border-color: var(--ui-yellow); background: #2a2a10; }
        .selectable-card:hover { background: #1a1a1a; border-color: #555; }

        #objective-tracker {
            position: absolute; top: 80px; left: 20px; background: rgba(0,0,0,0.5); padding: 10px;
            border-left: 3px solid var(--ui-blue); font-size: 0.8rem;
        }

        #minimap-container {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 600px; height: 600px; background: rgba(5, 10, 5, 0.9);
            border: 3px solid var(--ui-yellow); display: none; pointer-events: none;
            box-shadow: 0 0 50px rgba(0,0,0,1); z-index: 50;
        }
        #minimap-container.active { display: block; }

        button { padding: 15px 45px; background: var(--ui-yellow); color: black; border: none; font-weight: bold; font-size: 1.1rem; cursor: pointer; text-transform: uppercase; }
        button:disabled { background: #444; cursor: not-allowed; }

        .hidden { display: none !important; }
    </style>
</head>
<body>

<div id="game-container">
    <canvas id="gameCanvas"></canvas>

    <!-- Mission Selection Screen -->
    <div id="mission-screen" class="overlay-screen">
        <h1 style="color: var(--ui-yellow); letter-spacing: 4px;">MISSION SELECT</h1>
        <div class="mission-grid">
            <div class="selectable-card" id="miss-exterm" onclick="selectMission('exterm')">
                <h3>EXTERMINATE</h3>
                <p>Destroy all Bug Holes. Use Grenades [G] to seal them from a distance.</p>
            </div>
            <div class="selectable-card" id="miss-icbm" onclick="selectMission('icbm')">
                <h3>ICBM LAUNCH</h3>
                <p>Secure the silo. Manual terminal input required.</p>
            </div>
        </div>
        <button id="mission-next-btn" disabled onclick="showLoadout()">CONFIRM MISSION</button>
    </div>

    <!-- Stratagem Loadout Screen -->
    <div id="loadout-screen" class="overlay-screen hidden">
        <h1 style="color: var(--ui-yellow); letter-spacing: 4px;">STRATAGEM LOADOUT</h1>
        <div class="stratagem-grid" id="loadout-grid"></div>
        <button id="deploy-btn" disabled onclick="startDeployment()">PREPARE FOR DROP</button>
    </div>

    <div id="ui-layer">
        <div style="display: flex; justify-content: space-between; pointer-events: none;">
            <div class="stats-box">
                <div>TIME: <span id="timer-val">00:00</span></div>
                <div>SCORE: <span id="score-val">0</span></div>
            </div>
            <div class="stats-box" style="border-left: none; border-right: 4px solid var(--ui-yellow);">
                <div id="weapon-name">LIBERATOR AR</div>
            </div>
        </div>

        <div id="objective-tracker">
            <div style="color: var(--ui-blue); font-weight: bold; margin-bottom: 5px;">OBJECTIVE</div>
            <div id="obj-text">N/A</div>
        </div>

        <!-- Fullscreen Map -->
        <div id="minimap-container">
            <div style="color:var(--ui-yellow); text-align:center; padding:10px; font-weight:bold; background:rgba(255,255,255,0.05)">TACTICAL MAP [TAB]</div>
            <canvas id="minimapCanvas" width="600" height="600"></canvas>
        </div>

        <div id="sequence-display">
            <div id="seq-title" style="color: var(--ui-yellow); font-size: 0.7rem; font-weight: bold; margin-bottom: 5px;">INPUTTING...</div>
            <div id="seq-keys" style="display: flex; gap: 8px;"></div>
        </div>

        <div class="hud-bottom" style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; pointer-events: none; margin-top: auto;">
            <div id="stratagem-ui">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--ui-yellow); font-size: 0.8rem;">STRATAGEM READOUT [CTRL]</div>
                <div id="active-stratagem-list"></div>
            </div>

            <div class="stats-box" style="width: 280px; pointer-events: auto;">
                <div style="display: flex; justify-content: space-between;"><span>HEALTH</span><span id="health-text">100/100</span></div>
                <div class="bar-container"><div id="health-fill" class="bar-fill" style="background: var(--ui-red);"></div></div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 8px;"><span>GRENADE [G]</span><span id="grenade-text">READY</span></div>
                <div class="bar-container"><div id="grenade-fill" class="bar-fill" style="background: var(--ui-green);"></div></div>

                <div style="display: flex; justify-content: space-between; margin-top: 8px;"><span>AMMO</span><span id="ammo-text">30/30</span></div>
                <div class="bar-container"><div id="ammo-fill" class="bar-fill" style="background: var(--ui-yellow);"></div></div>
                <div id="reload-indicator" style="color: var(--ui-red); font-size: 0.7rem; font-weight: bold; height: 1.2em;"></div>
            </div>
        </div>
    </div>
</div>

<script>
/**
 * ORBITAL DROP: VANGUARD - TACTICAL UPDATE
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mCanvas = document.getElementById('minimapCanvas');
const mCtx = mCanvas.getContext('2d');

const ALL_STRATAGEMS = [
    { id: 'orbital_precision', name: 'Orbital Precision Strike', seq: ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowDown'], cooldown: 15000, delay: 1000, radius: 220, damage: 2000, color: '#facc15', type: 'strike' },
    { id: 'eagle_airstrike', name: 'Eagle Airstrike', seq: ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowRight'], cooldown: 12000, delay: 1800, radius: 140, damage: 800, color: '#fb923c', type: 'eagle_strike' },
    { id: 'eagle_strafe', name: 'Eagle Strafing Run', seq: ['ArrowUp', 'ArrowRight', 'ArrowRight'], cooldown: 8000, delay: 1200, damage: 150, color: '#fb923c', type: 'eagle_strafe' },
    { id: 'eagle_500kg', name: 'Eagle 500kg Bomb', seq: ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown'], cooldown: 30000, delay: 2500, radius: 400, damage: 5000, color: '#ef4444', type: 'eagle_500' },
    { id: 'orbital_120mm', name: '120mm HE Barrage', seq: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowDown'], cooldown: 60000, delay: 1000, radius: 250, damage: 600, color: '#facc15', type: 'barrage' },
    { id: 'eat_17', name: 'EAT-17 Anti-Tank', seq: ['ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight'], cooldown: 45000, delay: 2000, color: '#3b82f6', type: 'support_pod', weapon: 'eat_17' },
    { id: 'machine_gun', name: 'MG-43 Machine Gun', seq: ['ArrowDown', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowUp'], cooldown: 40000, delay: 2000, color: '#3b82f6', type: 'support_pod', weapon: 'machinegun' },
    { id: 'flamethrower', name: 'FL-24 Flamethrower', seq: ['ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowUp'], cooldown: 45000, delay: 2000, color: '#3b82f6', type: 'support_pod', weapon: 'flamethrower' },
    { id: 'mg_sentry', name: 'A/MG-43 Sentry', seq: ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowUp'], cooldown: 90000, delay: 2000, color: '#4ade80', type: 'sentry', variant: 'mg' },
    { id: 'resupply', name: 'Resupply Pod', seq: ['ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowRight'], cooldown: 25000, delay: 2000, color: '#4ade80', type: 'supply' }
];

const CONFIG = {
    world: { width: 4000, height: 4000 },
    weapons: {
        'liberator': { fireRate: 150, magSize: 30, reloadTime: 1500, damage: 35, type: 'bullet', name: 'LIBERATOR AR' },
        'machinegun': { fireRate: 90, magSize: 150, reloadTime: 3500, damage: 45, type: 'bullet', name: 'MG-43 MACHINE GUN' },
        'flamethrower': { fireRate: 50, magSize: 200, reloadTime: 4000, damage: 15, type: 'flame', name: 'FL-24 FLAMETHROWER' },
        'eat_17': { fireRate: 500, magSize: 1, reloadTime: 100, damage: 3000, type: 'rocket', disposable: true, name: 'EAT-17 (ONE USE)' }
    }
};

let selectedMissionId = '';
let gameState = 'MENU';
let selectedIds = [];
let activeStratagems = [];
let score = 0;
let enemies = [];
let bullets = [];
let particles = [];
let activeMarkers = [];
let eagleShadows = [];
let pods = [];
let sentries = [];
let bugHoles = [];
let outposts = [];
let objectives = [];
let keys = {};
let mouse = { x: 0, y: 0, down: false, worldX: 0, worldY: 0 };
let currentSequence = [];
let sequenceTarget = null; 
let lastFireTime = 0;
let startTime = 0;
let obstacles = [];
let groundTexture = null;
let mapOpen = false;

const camera = { x: 0, y: 0 };
const player = {
    x: 200, y: 200, health: 100, ammo: 30, weaponType: 'liberator',
    isReloading: false, reloadProgress: 0,
    angle: 0, isDiving: false, diveTime: 0, diveDir: { x: 0, y: 0 },
    grenadeCooldown: 0
};

const cooldowns = {};

// UI Navigation
function selectMission(id) {
    selectedMissionId = id;
    document.querySelectorAll('.mission-grid .selectable-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`miss-${id}`).classList.add('selected');
    document.getElementById('mission-next-btn').disabled = false;
}

function showLoadout() {
    document.getElementById('mission-screen').classList.add('hidden');
    document.getElementById('loadout-screen').classList.remove('hidden');
    const grid = document.getElementById('loadout-grid');
    grid.innerHTML = '';
    ALL_STRATAGEMS.forEach(s => {
        const card = document.createElement('div');
        card.className = 'selectable-card';
        card.innerHTML = `<div style="font-weight:bold; color:var(--ui-yellow); font-size:0.8rem;">${s.name}</div>`;
        card.onclick = () => toggleStratSelection(s.id, card);
        grid.appendChild(card);
    });
}

function toggleStratSelection(id, el) {
    if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter(i => i !== id);
        el.classList.remove('selected');
    } else if (selectedIds.length < 4) {
        selectedIds.push(id);
        el.classList.add('selected');
    }
    document.getElementById('deploy-btn').disabled = selectedIds.length !== 4;
}

function startDeployment() {
    activeStratagems = ALL_STRATAGEMS.filter(s => selectedIds.includes(s.id));
    const list = document.getElementById('active-stratagem-list');
    list.innerHTML = '';
    activeStratagems.forEach(s => {
        cooldowns[s.id] = 0;
        const div = document.createElement('div');
        div.className = 'stratagem-item';
        div.id = `ui-strat-${s.id}`;
        div.innerHTML = `
            <div class="stratagem-header"><span>${s.name}</span><div>${s.seq.map(k => `<span class="key-box">${getKeyChar(k)}</span>`).join('')}</div></div>
            <div class="bar-container"><div class="bar-fill strat-cd-fill" style="background: var(--ui-yellow); width: 0%"></div></div>
        `;
        list.appendChild(div);
    });
    
    generateWorld();
    document.getElementById('loadout-screen').classList.add('hidden');
    gameState = 'PLAYING';
    startTime = Date.now();
    resize();
    requestAnimationFrame(gameLoop);
}

function getKeyChar(k) { return { 'ArrowUp':'↑', 'ArrowDown':'↓', 'ArrowLeft':'←', 'ArrowRight':'→' }[k] || k; }

function generateWorld() {
    obstacles = []; outposts = []; bugHoles = []; enemies = [];
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * CONFIG.world.width;
        const y = Math.random() * CONFIG.world.height;
        if (Math.hypot(x-player.x, y-player.y) < 300) continue;
        obstacles.push({ x, y, radius: 30 + Math.random()*60 });
    }

    const numOutposts = 8;
    for (let i = 0; i < numOutposts; i++) {
        const ox = 600 + Math.random() * (CONFIG.world.width - 1200);
        const oy = 600 + Math.random() * (CONFIG.world.height - 1200);
        const size = Math.random();
        let holeCount = size > 0.7 ? 5 : size > 0.3 ? 3 : 1;
        outposts.push({ x: ox, y: oy, radius: size > 0.7 ? 350 : 150 });
        for (let j = 0; j < holeCount; j++) {
            bugHoles.push({ x: ox + (Math.random()-0.5)*200, y: oy + (Math.random()-0.5)*200, health: 400, lastSpawn: 0 });
        }
    }

    groundTexture = document.createElement('canvas');
    groundTexture.width = 512; groundTexture.height = 512;
    const gctx = groundTexture.getContext('2d');
    gctx.fillStyle = '#A3623A'; gctx.fillRect(0,0,512,512);
    for(let i=0; i<3000; i++) {
        const s = Math.random()*20;
        gctx.fillStyle = `rgba(0,0,0,${Math.random()*0.1})`;
        gctx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
    }
}

function update(delta) {
    if (gameState !== 'PLAYING') return;

    camera.x = Math.max(0, Math.min(CONFIG.world.width - canvas.width, player.x - canvas.width/2));
    camera.y = Math.max(0, Math.min(CONFIG.world.height - canvas.height, player.y - canvas.height/2));
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;

    if (!mapOpen) {
        if (player.isDiving) {
            player.diveTime -= delta;
            movePlayer(player.diveDir.x * 6, player.diveDir.y * 6);
            if (player.diveTime <= 0) player.isDiving = false;
        } else {
            let dx = 0, dy = 0;
            if (keys['w']) dy--; if (keys['s']) dy++; if (keys['a']) dx--; if (keys['d']) dx++;
            if (dx || dy) {
                const mag = Math.sqrt(dx*dx + dy*dy);
                movePlayer((dx/mag) * 3.5, (dy/mag) * 3.5);
                if (keys['Alt']) { player.isDiving = true; player.diveTime = 500; player.diveDir = { x: dx/mag, y: dy/mag }; keys['Alt'] = false; }
            }
        }
        player.angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);

        player.grenadeCooldown = Math.max(0, player.grenadeCooldown - delta);
        if (keys['g'] && player.grenadeCooldown <= 0 && !player.isDiving) { throwGrenade(); }

        const weapon = CONFIG.weapons[player.weaponType];
        if (mouse.down && !player.isReloading && !keys['Control'] && !player.isDiving) {
            if (Date.now() - lastFireTime > weapon.fireRate) {
                if (player.ammo > 0) { fireWeapon(weapon); player.ammo--; lastFireTime = Date.now(); } 
                else startReload();
            }
        }
        if (player.isReloading) {
            player.reloadProgress += delta;
            if (player.reloadProgress >= weapon.reloadTime) { player.ammo = weapon.magSize; player.isReloading = false; }
        }
    }

    updateEnemies(delta);
    updateProjectiles(delta);
    updatePods(delta);
    
    // Update Eagle Shadows and Trigger Impacts
    for (let i = eagleShadows.length - 1; i >= 0; i--) {
        const sh = eagleShadows[i];
        sh.progress += delta / 2500;
        sh.x = sh.startX + (sh.endX - sh.startX) * sh.progress;
        sh.y = sh.startY + (sh.endY - sh.startY) * sh.progress;
        
        const markerIndex = activeMarkers.findIndex(m => m.id === sh.stratId && !m.impacted);
        if (markerIndex !== -1) {
            const marker = activeMarkers[markerIndex];
            const dist = Math.hypot(sh.x - marker.x, sh.y - marker.y);
            // Impact when shadow passes marker
            if (dist < 100 || (sh.progress > 0.5 && !marker.impacted)) {
                executeImpact(marker);
                marker.impacted = true;
            }
        }
        if (sh.progress >= 1) eagleShadows.splice(i, 1);
    }

    // Update active markers
    for (let i = activeMarkers.length - 1; i >= 0; i--) {
        const m = activeMarkers[i];
        if (!m.called) {
            m.timer -= delta;
            if (m.timer <= 0) {
                m.called = true;
                triggerEagleOrOrbital(m);
            }
        }
        if (m.impacted) activeMarkers.splice(i, 1);
    }

    // Cleanup particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.02;
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    activeStratagems.forEach(s => cooldowns[s.id] = Math.max(0, cooldowns[s.id] - delta));
    updateUI();
    if (mapOpen) drawMinimap();
}

function throwGrenade() {
    const targetX = mouse.worldX;
    const targetY = mouse.worldY;
    bullets.push({ 
        x: player.x, y: player.y, targetX, targetY,
        vx: 0, vy: 0, speed: 8, life: 500, dmg: 1000, type: 'grenade', radius: 180, 
        stopped: false, fuse: 1200
    });
    player.grenadeCooldown = 5000;
}

function fireWeapon(w) {
    const spread = (Math.random()-0.5)*0.1;
    if (w.type === 'bullet') bullets.push({ x: player.x, y: player.y, vx: Math.cos(player.angle+spread)*18, vy: Math.sin(player.angle+spread)*18, life: 60, dmg: w.damage, type: 'bullet' });
    if (w.type === 'flame') bullets.push({ x: player.x, y: player.y, vx: Math.cos(player.angle+spread*3)*9, vy: Math.sin(player.angle+spread*3)*9, life: 35, dmg: w.damage, type: 'flame' });
    if (w.type === 'rocket') bullets.push({ x: player.x, y: player.y, vx: Math.cos(player.angle)*20, vy: Math.sin(player.angle)*20, life: 140, dmg: w.damage, type: 'rocket', radius: 150 });
}

function triggerEagleOrOrbital(m) {
    const s = ALL_STRATAGEMS.find(st => st.id === m.id);
    if (s.type.startsWith('eagle')) {
        // Eagle always flies towards the marker based on player's throw angle
        const startX = m.x - Math.cos(m.angle) * 2000;
        const startY = m.y - Math.sin(m.angle) * 2000;
        const endX = m.x + Math.cos(m.angle) * 2000;
        const endY = m.y + Math.sin(m.angle) * 2000;
        
        eagleShadows.push({ 
            startX, startY, endX, endY, 
            x: startX, y: startY, 
            angle: m.angle, progress: 0, stratId: m.id 
        });
    } else {
        executeImpact(m);
        m.impacted = true;
    }
}

function executeImpact(m) {
    const s = ALL_STRATAGEMS.find(st => st.id === m.id);
    if (s.type === 'eagle_strike') {
        // Align bombing run along the flight path
        for(let i=-4; i<=4; i++) {
            setTimeout(() => explode(m.x + Math.cos(m.angle)*i*80, m.y + Math.sin(m.angle)*i*80, s.radius, s.damage), Math.abs(i)*40);
        }
    }
    else if (s.type === 'barrage') { for(let i=0; i<15; i++) setTimeout(() => explode(m.x + (Math.random()-0.5)*500, m.y + (Math.random()-0.5)*500, 200, s.damage), i*400); }
    else if (s.type === 'support_pod') pods.push({ x: m.x, y: m.y, weapon: s.weapon, color: s.color });
    else if (s.type === 'sentry') sentries.push({ x: m.x, y: m.y, variant: s.variant, health: 100, lastFire: 0, angle: 0 });
    else if (s.type === 'supply') { player.health = 100; player.ammo = CONFIG.weapons[player.weaponType].magSize; spawnParticles(player.x, player.y, '#4ade80', 20); }
    else explode(m.x, m.y, s.radius || 150, s.damage || 1000);
}

function updateProjectiles(delta) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (b.type === 'grenade') {
            if (!b.stopped) {
                const distToTarget = Math.hypot(b.targetX - b.x, b.targetY - b.y);
                const angle = Math.atan2(b.targetY - b.y, b.targetX - b.x);
                b.x += Math.cos(angle) * b.speed;
                b.y += Math.sin(angle) * b.speed;
                if (distToTarget < b.speed) { b.x = b.targetX; b.y = b.targetY; b.stopped = true; }
            } else {
                b.fuse -= delta;
                if (b.fuse <= 0) { explode(b.x, b.y, b.radius, b.dmg); bullets.splice(i, 1); continue; }
            }
        } else {
            b.x += b.vx; b.y += b.vy; b.life--;
            if (isColliding(b.x, b.y) || b.life <= 0) {
                if (b.type === 'rocket') explode(b.x, b.y, b.radius, b.dmg);
                bullets.splice(i, 1); continue;
            }
        }
        enemies.forEach(e => {
            if (Math.hypot(b.x-e.x, b.y-e.y) < 30) {
                e.health -= b.dmg;
                if (b.type === 'bullet') b.life = 0;
                e.state = 'CHASE';
            }
        });
    }
}

function updateEnemies(delta) {
    enemies.forEach((e, i) => {
        const dist = Math.hypot(e.x-player.x, e.y-player.y);
        if (e.state === 'IDLE') {
            if (dist < 450) { e.detectionMeter += delta * 0.002; if(e.detectionMeter >= 1) e.state = 'CHASE'; }
        } else {
            const angle = Math.atan2(player.y-e.y, player.x-e.x);
            e.angle = angle;
            if (dist > 35) { e.x += Math.cos(angle)*1.8; e.y += Math.sin(angle)*1.8; }
            else { player.health -= 0.3; }
        }
        if (e.health <= 0) { enemies.splice(i, 1); score += 50; spawnParticles(e.x, e.y, '#22c55e', 8); }
    });
    
    bugHoles.forEach(bh => {
        if (bh.health > 0) {
            if (Date.now() - bh.lastSpawn > 10000 && Math.hypot(bh.x-player.x, bh.y-player.y) < 1200) {
                enemies.push({ x: bh.x, y: bh.y, health: 100, state: 'IDLE', detectionMeter: 0, angle: 0 });
                bh.lastSpawn = Date.now();
            }
        }
    });
}

function updatePods(delta) {
    for (let i = pods.length - 1; i >= 0; i--) {
        const p = pods[i];
        if (Math.hypot(player.x - p.x, player.y - p.y) < 50) {
            player.weaponType = p.weapon;
            player.ammo = CONFIG.weapons[p.weapon].magSize;
            pods.splice(i, 1);
        }
    }
}

function explode(x, y, radius, damage) {
    spawnParticles(x, y, '#ff8800', 30);
    enemies.forEach(e => { if(Math.hypot(e.x-x, e.y-y) < radius) e.health -= damage; });
    bugHoles.forEach(bh => { if(bh.health > 0 && Math.hypot(bh.x-x, bh.y-y) < radius) { bh.health -= damage; if(bh.health <= 0) score += 500; } });
    if (Math.hypot(player.x-x, player.y-y) < radius) player.health -= damage * 0.05;
}

function movePlayer(mx, my) {
    if (!isColliding(player.x + mx, player.y)) player.x += mx;
    if (!isColliding(player.x, player.y + my)) player.y += my;
}

function isColliding(x, y) {
    if (x < 0 || x > CONFIG.world.width || y < 0 || y > CONFIG.world.height) return true;
    return obstacles.some(o => Math.hypot(x-o.x, y-o.y) < o.radius + 15);
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save(); ctx.translate(-camera.x, -camera.y);
    ctx.fillStyle = ctx.createPattern(groundTexture, 'repeat'); ctx.fillRect(0,0,CONFIG.world.width, CONFIG.world.height);

    bugHoles.forEach(bh => {
        ctx.fillStyle = bh.health > 0 ? '#1a0d00' : '#050505'; ctx.beginPath(); ctx.arc(bh.x, bh.y, 40, 0, Math.PI*2); ctx.fill();
        if(bh.health > 0) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke(); }
    });

    obstacles.forEach(o => { ctx.fillStyle = '#151515'; ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI*2); ctx.fill(); });
    
    pods.forEach(p => {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.rect(p.x-15, p.y-15, 30, 30); ctx.fill();
        ctx.fillStyle = 'white'; ctx.font = 'bold 10px monospace'; ctx.textAlign='center'; ctx.fillText('PICKUP', p.x, p.y+30);
    });

    bullets.forEach(b => {
        ctx.fillStyle = b.type === 'grenade' ? '#4ade80' : (b.type === 'flame' ? '#f59e0b' : '#fff');
        ctx.beginPath(); ctx.arc(b.x, b.y, b.type==='grenade'?6:3, 0, Math.PI*2); ctx.fill();
    });
    
    enemies.forEach(e => {
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
        ctx.fillStyle = e.state === 'CHASE' ? '#ef4444' : '#f59e0b';
        ctx.beginPath(); ctx.moveTo(15,0); ctx.lineTo(-10, 10); ctx.lineTo(-10, -10); ctx.closePath(); ctx.fill();
        ctx.restore();
    });

    eagleShadows.forEach(sh => {
        ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.angle);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(100, 0); ctx.lineTo(0, 60); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
    });

    activeMarkers.forEach(m => {
        ctx.strokeStyle = m.color; ctx.setLineDash([5,5]); ctx.beginPath(); ctx.arc(m.x, m.y, 50, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = m.color; ctx.font = '12px monospace'; ctx.fillText('INCOMING', m.x+60, m.y);
    });

    particles.forEach(p => { ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); });
    ctx.globalAlpha = 1;

    // Player
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.isDiving ? Math.atan2(player.diveDir.y, player.diveDir.x) : player.angle);
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.roundRect(-15,-10,30,20,4); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(-10, -8, 8, 16); ctx.restore();
    ctx.restore();
}

function drawMinimap() {
    mCtx.fillStyle = '#050805'; mCtx.fillRect(0,0,600,600);
    const s = 600 / CONFIG.world.width;
    outposts.forEach(o => { mCtx.fillStyle = 'rgba(239, 68, 68, 0.2)'; mCtx.beginPath(); mCtx.arc(o.x*s, o.y*s, o.radius*s, 0, Math.PI*2); mCtx.fill(); });
    bugHoles.forEach(bh => { if(bh.health > 0) { mCtx.fillStyle='#ef4444'; mCtx.fillRect(bh.x*s-2, bh.y*s-2, 4, 4); } });
    mCtx.fillStyle='#fde047'; mCtx.beginPath(); mCtx.arc(player.x*s, player.y*s, 5, 0, Math.PI*2); mCtx.fill();
}

function gameLoop() { update(16.6); if(!mapOpen) draw(); requestAnimationFrame(gameLoop); }

function spawnParticles(x, y, color, count) { for(let i=0; i<count; i++) particles.push({ x, y, color, alpha: 1, size: Math.random()*5+1, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8 }); }

function updateUI() {
    const weapon = CONFIG.weapons[player.weaponType];
    document.getElementById('health-fill').style.width = player.health + '%';
    document.getElementById('ammo-fill').style.width = (player.ammo / weapon.magSize) * 100 + '%';
    document.getElementById('grenade-fill').style.width = (1 - player.grenadeCooldown / 5000) * 100 + '%';
    document.getElementById('weapon-name').innerText = weapon.name;
    document.getElementById('score-val').innerText = score;
    document.getElementById('timer-val').innerText = new Date(Date.now() - startTime).toISOString().substr(14, 5);
    
    const alive = bugHoles.filter(h => h.health > 0).length;
    document.getElementById('obj-text').innerText = `BUG HOLES REMAINING: ${alive}`;

    if (keys['Control']) {
        document.getElementById('stratagem-ui').classList.add('visible');
        activeStratagems.forEach(s => {
            const bar = document.querySelector(`#ui-strat-${s.id} .strat-cd-fill`);
            if(bar) bar.style.width = (1 - cooldowns[s.id] / s.cooldown) * 100 + '%';
        });
    } else document.getElementById('stratagem-ui').classList.remove('visible');
}

function renderTerminalSequence() {
    const keysDiv = document.getElementById('seq-keys');
    keysDiv.innerHTML = currentSequence.map((k) => `<span class="key-box hit" style="width:30px;height:30px;font-size:1.2rem">${getKeyChar(k)}</span>`).join('');
}

function checkSequence(key) {
    if (sequenceTarget === 'STRATAGEM') {
        currentSequence.push(key);
        renderTerminalSequence();
        
        const possible = activeStratagems.filter(s => s.seq.slice(0, currentSequence.length).every((k, i) => k === currentSequence[i]));
        
        if (possible.length === 0) {
            currentSequence = []; 
            renderTerminalSequence();
            return;
        }
        
        const match = possible.find(s => s.seq.length === currentSequence.length);
        if (match && cooldowns[match.id] <= 0) {
            activeMarkers.push({ 
                x: mouse.worldX, y: mouse.worldY, 
                timer: match.delay, id: match.id, 
                color: match.color, angle: player.angle, 
                impacted: false, called: false 
            });
            cooldowns[match.id] = match.cooldown; 
            currentSequence = []; 
            document.getElementById('sequence-display').style.display = 'none'; 
            sequenceTarget = null;
        }
    }
}

function startReload() { if (!player.isReloading) { player.isReloading = true; player.reloadProgress = 0; } }

window.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); mapOpen = !mapOpen; document.getElementById('minimap-container').classList.toggle('active', mapOpen); }
    keys[e.key] = true;
    if (e.key === 'Control') { 
        sequenceTarget = 'STRATAGEM'; 
        currentSequence = [];
        document.getElementById('sequence-display').style.display = 'flex'; 
        renderTerminalSequence();
    }
    if (e.key.startsWith('Arrow') && sequenceTarget) { e.preventDefault(); checkSequence(e.key); }
    if (e.key === 'r') startReload();
});
window.addEventListener('keyup', e => {
    keys[e.key] = false;
    if (e.key === 'Control') { 
        document.getElementById('sequence-display').style.display = 'none'; 
        sequenceTarget = null; 
        currentSequence = []; 
    }
});
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);
window.addEventListener('resize', resize);
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resize();
</script>
</body>
</html>