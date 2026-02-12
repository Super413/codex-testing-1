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
    { id: 'gatling_sentry', name: 'A/G-16 Gatling Sentry', seq: ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'ArrowUp'], cooldown: 110000, delay: 2000, color: '#22c55e', type: 'sentry', variant: 'gatling' },
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
let missionState = { id: 'exterm', complete: false };
let missionFx = { launchFlash: 0 };
let objectiveInput = null;

const camera = { x: 0, y: 0 };
const player = {
    x: 200, y: 200, health: 100, ammo: 30, weaponType: 'liberator',
    isReloading: false, reloadProgress: 0,
    angle: 0, isDiving: false, diveTime: 0, diveDir: { x: 0, y: 0 },
    grenadeCooldown: 0
};

const cooldowns = {};

function bindMenuEventHandlers() {
    const missionGrid = document.querySelector('.mission-grid');
    missionGrid.addEventListener('click', (event) => {
        const card = event.target.closest('[data-mission]');
        if (!card) return;
        selectMission(card.dataset.mission);
    });

    document.getElementById('mission-next-btn').addEventListener('click', showLoadout);
    document.getElementById('deploy-btn').addEventListener('click', startDeployment);
}

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
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'selectable-card';
        card.innerHTML = `<div style="font-weight:bold; color:var(--ui-yellow); font-size:0.8rem;">${s.name}</div>`;
        card.addEventListener('click', () => toggleStratSelection(s.id, card));
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
    if (!selectedMissionId) return;
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
    
    const objectiveCodeLengths = {
        extraction: 4,
        terminalA: 3,
        terminalB: 4,
        arm: 3,
        launch: 6
    };

    missionState = {
        id: selectedMissionId,
        complete: false,
        extracted: false,
        objectiveCodeLengths,
        extraction: {
            x: 0, y: 0, radius: 120, stage: 'LOCKED', defendTimer: 0,
            code: generateRandomCode(objectiveCodeLengths.extraction)
        },
        icbm: selectedMissionId === 'icbm'
            ? {
                stage: 'ENABLE_TERMINALS',
                terminals: [],
                silo: null,
                openingTimer: 0,
                countdown: 0,
                armCode: generateRandomCode(objectiveCodeLengths.arm),
                launchCode: generateRandomCode(objectiveCodeLengths.launch)
            }
            : null
    };

    generateWorld();
    document.getElementById('loadout-screen').classList.add('hidden');
    gameState = 'PLAYING';
    startTime = Date.now();
    resize();
    requestAnimationFrame(gameLoop);
}

function getKeyChar(k) { return { 'ArrowUp':'↑', 'ArrowDown':'↓', 'ArrowLeft':'←', 'ArrowRight':'→' }[k] || k; }

function generateRandomCode(length) {
    const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const code = [];
    for (let i = 0; i < length; i++) code.push(dirs[Math.floor(Math.random() * dirs.length)]);
    return code;
}

function generateWorld() {
    obstacles = []; outposts = []; bugHoles = []; enemies = []; objectives = [];
    sentries = []; pods = []; bullets = []; particles = []; activeMarkers = []; eagleShadows = [];
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * CONFIG.world.width;
        const y = Math.random() * CONFIG.world.height;
        if (Math.hypot(x-player.x, y-player.y) < 300) continue;
        obstacles.push({ x, y, radius: 30 + Math.random()*60 });
    }

    const numOutposts = missionState.id === 'icbm' ? 5 : 8;
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

    missionState.extraction.x = 500 + Math.random() * (CONFIG.world.width - 1000);
    missionState.extraction.y = 500 + Math.random() * (CONFIG.world.height - 1000);

    if (missionState.id === 'icbm' && missionState.icbm) {
        const silo = {
            x: CONFIG.world.width * 0.5 + (Math.random() - 0.5) * 500,
            y: CONFIG.world.height * 0.5 + (Math.random() - 0.5) * 500,
            radius: 130
        };
        missionState.icbm.silo = silo;
        objectives.push({ type: 'icbm_terminal', ...silo });

        for (let i = 0; i < 2; i++) {
            missionState.icbm.terminals.push({
                x: 500 + Math.random() * (CONFIG.world.width - 1000),
                y: 500 + Math.random() * (CONFIG.world.height - 1000),
                radius: 80,
                enabled: false,
                code: generateRandomCode(i === 0 ? missionState.objectiveCodeLengths.terminalA : missionState.objectiveCodeLengths.terminalB)
            });
        }
    }

    groundTexture = document.createElement('canvas');
    groundTexture.width = 512; groundTexture.height = 512;
    const gctx = groundTexture.getContext('2d');
    gctx.fillStyle = '#a29308'; gctx.fillRect(0,0,512,512);
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
                if (player.ammo > 0) {
                    fireWeapon(weapon);
                    player.ammo--;
                    lastFireTime = Date.now();
                    if (weapon.disposable) {
                        player.weaponType = 'liberator';
                        player.isReloading = false;
                        player.reloadProgress = 0;
                        player.ammo = CONFIG.weapons[player.weaponType].magSize;
                    }
                } 
                else startReload();
            }
        }
        if (player.isReloading) {
            player.reloadProgress += delta;
            if (player.reloadProgress >= weapon.reloadTime) { player.ammo = weapon.magSize; player.isReloading = false; }
        }
    }

    missionFx.launchFlash = Math.max(0, missionFx.launchFlash - delta / 1200);

    updateEnemies(delta);
    updateSentries(delta);
    updateProjectiles(delta);
    updatePods(delta);
    updateMission(delta);
    
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
    else if (s.type === 'eagle_strafe') {
        const spacing = 120;
        for (let i = 0; i < 14; i++) {
            setTimeout(() => {
                const spread = (Math.random() - 0.5) * 70;
                const x = m.x + Math.cos(m.angle) * i * spacing + Math.cos(m.angle + Math.PI / 2) * spread;
                const y = m.y + Math.sin(m.angle) * i * spacing + Math.sin(m.angle + Math.PI / 2) * spread;
                explode(x, y, 80, s.damage);
            }, i * 55);
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
                if (b.type === 'bullet' || b.type === 'flame') b.life = 0;
                e.state = 'CHASE';
            }
        });
    }
}

function updateSentries(delta) {
    for (let i = sentries.length - 1; i >= 0; i--) {
        const s = sentries[i];
        const fireRate = s.variant === 'gatling' ? 70 : 170;
        const damage = s.variant === 'gatling' ? 22 : 40;
        const range = s.variant === 'gatling' ? 700 : 620;

        let target = null;
        let nearest = Infinity;
        enemies.forEach(e => {
            const dist = Math.hypot(e.x - s.x, e.y - s.y);
            if (dist < range && dist < nearest) {
                nearest = dist;
                target = e;
            }
        });

        if (target) {
            s.angle = Math.atan2(target.y - s.y, target.x - s.x);
            s.lastFire += delta;
            if (s.lastFire >= fireRate) {
                s.lastFire = 0;
                bullets.push({
                    x: s.x,
                    y: s.y,
                    vx: Math.cos(s.angle) * 15,
                    vy: Math.sin(s.angle) * 15,
                    life: 70,
                    dmg: damage,
                    type: 'bullet'
                });
            }
        }
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
            if (dist > 35) {
                const speed = e.speed || 1.8;
                e.x += Math.cos(angle) * speed;
                e.y += Math.sin(angle) * speed;
            }
            else { player.health -= e.damage || 0.3; }
        }
        if (e.health <= 0) { enemies.splice(i, 1); score += 50; spawnParticles(e.x, e.y, '#22c55e', 8); }
    });
    
    bugHoles.forEach(bh => {
        if (bh.health > 0) {
            if (Date.now() - bh.lastSpawn > 10000 && Math.hypot(bh.x-player.x, bh.y-player.y) < 1200) {
                const isBrood = Math.random() < 0.2;
                enemies.push({
                    x: bh.x,
                    y: bh.y,
                    health: isBrood ? 260 : 100,
                    speed: isBrood ? 1.15 : 1.8,
                    damage: isBrood ? 0.7 : 0.3,
                    kind: isBrood ? 'BROOD_BRUTE' : 'SCOUT',
                    state: 'IDLE',
                    detectionMeter: 0,
                    angle: 0
                });
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


function findNearestInteractable() {
    const options = [];
    if (missionState.id === 'icbm' && missionState.icbm) {
        const icbm = missionState.icbm;
        if (icbm.stage === 'ENABLE_TERMINALS') {
            icbm.terminals.forEach((t, idx) => {
                if (!t.enabled) {
                    options.push({
                        x: t.x, y: t.y, radius: t.radius + 30,
                        label: `TERMINAL ${idx + 1} OVERRIDE`,
                        code: t.code,
                        onComplete: () => { t.enabled = true; spawnParticles(t.x, t.y, '#22c55e', 40); }
                    });
                }
            });
        }
        if (icbm.stage === 'ARM_SILO_CODE') {
            options.push({
                x: icbm.silo.x, y: icbm.silo.y, radius: icbm.silo.radius + 35,
                label: 'ICBM ARM CODE',
                code: icbm.armCode,
                onComplete: () => { icbm.stage = 'OPENING_SILO'; icbm.openingTimer = 20000; spawnParticles(icbm.silo.x, icbm.silo.y, '#60a5fa', 60); }
            });
        }
        if (icbm.stage === 'LAUNCH_CODE') {
            options.push({
                x: icbm.silo.x, y: icbm.silo.y, radius: icbm.silo.radius + 35,
                label: 'ICBM LAUNCH AUTH',
                code: icbm.launchCode,
                onComplete: () => { icbm.stage = 'COUNTDOWN'; icbm.countdown = 10000; spawnParticles(icbm.silo.x, icbm.silo.y, '#facc15', 80); }
            });
        }
    }

    if (missionState.complete && !missionState.extracted && missionState.extraction.stage === 'AVAILABLE') {
        const ex = missionState.extraction;
        options.push({
            x: ex.x, y: ex.y, radius: ex.radius + 30,
            label: 'EXTRACTION BEACON',
            code: ex.code,
            onComplete: () => { ex.stage = 'DEFEND'; ex.defendTimer = 30000; spawnParticles(ex.x, ex.y, '#4ade80', 80); }
        });
    }

    let nearest = null;
    let best = Infinity;
    options.forEach(o => {
        const d = Math.hypot(player.x - o.x, player.y - o.y);
        if (d < o.radius && d < best) { best = d; nearest = o; }
    });
    return nearest;
}

function beginObjectiveInput(interactable) {
    sequenceTarget = 'OBJECTIVE';
    currentSequence = [];
    objectiveInput = interactable;
    document.getElementById('seq-title').innerText = `${interactable.label} [LEN ${interactable.code.length}]`;
    document.getElementById('sequence-display').style.display = 'flex';
    renderTerminalSequence();
}

function updateMission(delta) {
    if (!missionState.complete) {
        if (missionState.id === 'icbm' && missionState.icbm) {
            const icbm = missionState.icbm;
            if (icbm.stage === 'ENABLE_TERMINALS' && icbm.terminals.every(t => t.enabled)) {
                icbm.stage = 'ARM_SILO_CODE';
                spawnParticles(icbm.silo.x, icbm.silo.y, '#60a5fa', 50);
            }
            if (icbm.stage === 'OPENING_SILO') {
                icbm.openingTimer = Math.max(0, icbm.openingTimer - delta);
                if (Math.random() < 0.15) spawnParticles(icbm.silo.x, icbm.silo.y, '#93c5fd', 4);
                if (icbm.openingTimer <= 0) {
                    icbm.stage = 'LAUNCH_CODE';
                    spawnParticles(icbm.silo.x, icbm.silo.y, '#fbbf24', 40);
                }
            }
            if (icbm.stage === 'COUNTDOWN') {
                icbm.countdown = Math.max(0, icbm.countdown - delta);
                if (Math.random() < 0.18) spawnParticles(icbm.silo.x + (Math.random() - 0.5) * 120, icbm.silo.y + 70, '#f97316', 3);
                if (icbm.countdown <= 0) {
                    icbm.stage = 'LAUNCHED';
                    missionState.complete = true;
                    score += 3500;
                    missionFx.launchFlash = 1;
                    for (let i = 0; i < 5; i++) setTimeout(() => explode(icbm.silo.x, icbm.silo.y - i * 120, 180, 900), i * 120);
                    missionState.extraction.stage = 'AVAILABLE';
                }
            }
        } else {
            const alive = bugHoles.filter(h => h.health > 0).length;
            if (alive === 0) {
                missionState.complete = true;
                score += 1500;
                missionState.extraction.stage = 'AVAILABLE';
            }
        }
    }

    if (missionState.complete && !missionState.extracted) {
        const ex = missionState.extraction;
        if (ex.stage === 'DEFEND') {
            ex.defendTimer = Math.max(0, ex.defendTimer - delta);
            if (Math.random() < 0.15) spawnParticles(ex.x, ex.y, '#4ade80', 2);
            if (ex.defendTimer <= 0) ex.stage = 'READY';
        }
        if (ex.stage === 'READY' && Math.hypot(player.x - ex.x, player.y - ex.y) < ex.radius) {
            missionState.extracted = true;
            score += 2000;
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

    obstacles.forEach(o => {
    ctx.save();
    ctx.translate(o.x, o.y);

    // Base rock shape
    ctx.beginPath();
    ctx.moveTo(o.points[0].x, o.points[0].y);
    for (let i = 1; i < o.points.length; i++) {
        ctx.lineTo(o.points[i].x, o.points[i].y);
    }
    ctx.closePath();

    // Subtle gradient shading
    const gradient = ctx.createRadialGradient(
        -o.radius * 0.3, -o.radius * 0.3, o.radius * 0.2,
        0, 0, o.radius
    );
    gradient.addColorStop(0, '#6a6a6a');
    gradient.addColorStop(1, '#2f2f2f');

    ctx.fillStyle = gradient;
    ctx.fill();

    // Optional edge highlight
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
});


    if (missionState.id === 'icbm' && missionState.icbm) {
        missionState.icbm.terminals.forEach((t, idx) => {
            ctx.fillStyle = t.enabled ? '#16a34a' : '#1d4ed8';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius + 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`TERM ${idx + 1}`, t.x, t.y + 4);
        });
    }

    objectives.forEach(obj => {
        if (obj.type === 'icbm_terminal') {
            ctx.fillStyle = '#1d4ed8';
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#93c5fd';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.radius + 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('ICBM SILO', obj.x, obj.y - obj.radius - 28);
        }
    });
    
    const ex = missionState.extraction;
    if (missionState.complete && ex && !missionState.extracted) {
        ctx.strokeStyle = ex.stage === 'READY' ? '#22c55e' : '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('EXTRACT', ex.x, ex.y + 4);
    }

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
        ctx.fillStyle = e.kind === 'BROOD_BRUTE' ? '#991b1b' : (e.state === 'CHASE' ? '#ef4444' : '#f59e0b');
        const scale = e.kind === 'BROOD_BRUTE' ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(15 * scale,0); ctx.lineTo(-10 * scale, 10 * scale); ctx.lineTo(-10 * scale, -10 * scale); ctx.closePath(); ctx.fill();
        ctx.restore();
    });

    sentries.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.fillStyle = s.variant === 'gatling' ? '#16a34a' : '#22c55e';
        ctx.fillRect(-14, -14, 28, 28);
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, -4, 22, 8);
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

    if (missionFx.launchFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 * missionFx.launchFlash})`;
        ctx.fillRect(camera.x, camera.y, canvas.width, canvas.height);
    }

    ctx.restore();
}

function drawMinimap() {
    mCtx.fillStyle = '#050805';
    mCtx.fillRect(0, 0, 600, 600);
    const scale = 600 / CONFIG.world.width;

    outposts.forEach(o => {
        mCtx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        mCtx.beginPath();
        mCtx.arc(o.x * scale, o.y * scale, o.radius * scale, 0, Math.PI * 2);
        mCtx.fill();
    });

    bugHoles.forEach(bh => {
        if (bh.health > 0) {
            mCtx.fillStyle = '#ef4444';
            mCtx.fillRect(bh.x * scale - 2, bh.y * scale - 2, 4, 4);
        }
    });

    if (missionState.id === 'icbm' && missionState.icbm) {
        missionState.icbm.terminals.forEach(t => {
            mCtx.fillStyle = t.enabled ? '#22c55e' : '#60a5fa';
            mCtx.beginPath();
            mCtx.arc(t.x * scale, t.y * scale, 5, 0, Math.PI * 2);
            mCtx.fill();
        });

        const silo = missionState.icbm.silo;
        if (silo) {
            mCtx.strokeStyle = '#93c5fd';
            mCtx.lineWidth = 2;
            mCtx.beginPath();
            mCtx.arc(silo.x * scale, silo.y * scale, 9, 0, Math.PI * 2);
            mCtx.stroke();
            mCtx.lineWidth = 1;
        }
    }

    if (missionState.extraction) {
        mCtx.strokeStyle = '#4ade80';
        mCtx.setLineDash([4, 3]);
        mCtx.beginPath();
        mCtx.arc(missionState.extraction.x * scale, missionState.extraction.y * scale, 8, 0, Math.PI * 2);
        mCtx.stroke();
        mCtx.setLineDash([]);
    }

    mCtx.fillStyle = '#fde047';
    mCtx.beginPath();
    mCtx.arc(player.x * scale, player.y * scale, 5, 0, Math.PI * 2);
    mCtx.fill();
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
    
    if (missionState.extracted) {
        document.getElementById('obj-text').innerText = 'MISSION COMPLETE: EXTRACTION SUCCESSFUL';
    } else if (missionState.id === 'icbm' && missionState.icbm) {
        const icbm = missionState.icbm;
        if (missionState.complete) {
            const ex = missionState.extraction;
            if (ex.stage === 'AVAILABLE') document.getElementById('obj-text').innerText = 'OBJECTIVE COMPLETE: FIND EXTRACTION & INPUT BEACON CODE';
            else if (ex.stage === 'DEFEND') document.getElementById('obj-text').innerText = `EXTRACTION DEFENSE: ${Math.ceil(ex.defendTimer / 1000)}s`;
            else document.getElementById('obj-text').innerText = 'EXTRACTION READY: ENTER GREEN ZONE';
        } else if (icbm.stage === 'ENABLE_TERMINALS') {
            const enabled = icbm.terminals.filter(t => t.enabled).length;
            document.getElementById('obj-text').innerText = `ICBM PREP: ENABLE TERMINALS (${enabled}/2) [PRESS E NEAR TERMINAL]`;
        } else if (icbm.stage === 'ARM_SILO_CODE') {
            document.getElementById('obj-text').innerText = 'ICBM PREP: GO TO SILO AND INPUT ARM CODE [E]';
        } else if (icbm.stage === 'OPENING_SILO') {
            document.getElementById('obj-text').innerText = `SILO OPENING... ${Math.ceil(icbm.openingTimer / 1000)}s`;
        } else if (icbm.stage === 'LAUNCH_CODE') {
            document.getElementById('obj-text').innerText = 'INPUT FINAL LAUNCH AUTH CODE AT SILO [E]';
        } else if (icbm.stage === 'COUNTDOWN') {
            document.getElementById('obj-text').innerText = `ICBM LAUNCH COUNTDOWN: ${Math.ceil(icbm.countdown / 1000)}s`;
        }
    } else {
        const alive = bugHoles.filter(h => h.health > 0).length;
        if (!missionState.complete) document.getElementById('obj-text').innerText = `BUG HOLES REMAINING: ${alive}`;
        else {
            const ex = missionState.extraction;
            if (ex.stage === 'AVAILABLE') document.getElementById('obj-text').innerText = 'OBJECTIVE COMPLETE: FIND EXTRACTION & INPUT BEACON CODE';
            else if (ex.stage === 'DEFEND') document.getElementById('obj-text').innerText = `EXTRACTION DEFENSE: ${Math.ceil(ex.defendTimer / 1000)}s`;
            else document.getElementById('obj-text').innerText = 'EXTRACTION READY: ENTER GREEN ZONE';
        }
    }

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

    if (sequenceTarget === 'OBJECTIVE' && objectiveInput) {
        keysDiv.innerHTML = objectiveInput.code.map((k, i) => {
            const cls = i < currentSequence.length ? 'key-box hit' : 'key-box';
            return `<span class=\"${cls}\" style=\"width:30px;height:30px;font-size:1.2rem\">${getKeyChar(k)}</span>`;
        }).join('');
        return;
    }

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
            sequenceTarget = null;
            document.getElementById('seq-title').innerText = 'INPUTTING...';
            document.getElementById('sequence-display').style.display = 'none';
        }
        return;
    }

    if (sequenceTarget === 'OBJECTIVE' && objectiveInput) {
        currentSequence.push(key);
        renderTerminalSequence();
        const valid = objectiveInput.code.slice(0, currentSequence.length).every((k, i) => k === currentSequence[i]);
        if (!valid) {
            currentSequence = [];
            renderTerminalSequence();
            return;
        }

        if (currentSequence.length === objectiveInput.code.length) {
            objectiveInput.onComplete();
            objectiveInput = null;
            currentSequence = [];
            sequenceTarget = null;
            document.getElementById('seq-title').innerText = 'INPUTTING...';
            document.getElementById('sequence-display').style.display = 'none';
        }
    }
}

function startReload() {
    const weapon = CONFIG.weapons[player.weaponType];
    if (weapon.disposable) return;
    if (!player.isReloading) {
        player.isReloading = true;
        player.reloadProgress = 0;
    }
}

window.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); mapOpen = !mapOpen; document.getElementById('minimap-container').classList.toggle('active', mapOpen); }
    keys[e.key] = true;
    if (e.key === 'Control' && !sequenceTarget) { 
        sequenceTarget = 'STRATAGEM'; 
        currentSequence = [];
        document.getElementById('seq-title').innerText = 'STRATAGEM INPUT';
        document.getElementById('sequence-display').style.display = 'flex'; 
        renderTerminalSequence();
    }
    if ((e.key === 'e' || e.key === 'E') && !sequenceTarget) {
        const interactable = findNearestInteractable();
        if (interactable) beginObjectiveInput(interactable);
    }
    if (e.key.startsWith('Arrow') && sequenceTarget) { e.preventDefault(); checkSequence(e.key); }
    if (e.key === 'r') startReload();
});
window.addEventListener('keyup', e => {
    keys[e.key] = false;
    if (e.key === 'Control') { 
        document.getElementById('sequence-display').style.display = 'none'; 
        sequenceTarget = null; 
        objectiveInput = null;
        currentSequence = []; 
        document.getElementById('seq-title').innerText = 'INPUTTING...';
    }
});
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);
window.addEventListener('resize', resize);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindMenuEventHandlers);
} else {
    bindMenuEventHandlers();
}

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resize();
