/* ===========================================
   Liggi - Spelmotor (Game Engine)

   Ett roligt peka-och-klicka-spel för barn
   med påsktema. Samla ägg, hjälp kycklingar
   och undvik den arga tuppen!

   Enheter:
   🥚 Ägg - samla dem för poäng
   🐤🐥 Snälla kycklingar - samla/hjälp dem
   🐓 Arg tupp - undvik! Game Over vid kontakt

   Variabler och funktioner är på engelska,
   men all text som visas för spelaren är på
   svenska.

   Struktur:
   1. Konfiguration & Konstanter
   2. Spelläge (State)
   3. Nivådata (Levels) & Generering
   4. Ritfunktioner (Drawing)
   5. Spelarlogik
   6. Ägg, Kycklingar & Tupp-logik
   7. Inmatning (klick, touch, tangentbord)
   8. Spelloop
   9. Chokladägg (Vinst)
  10. Skärmhantering
  11. Initiering
   =========================================== */

// ============================================
// 1. KONFIGURATION & KONSTANTER
// ============================================

/** Canvas-element och dess renderingskontext */
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

/** Spelkonfiguration - justera dessa för att ändra spelet */
const CONFIG = {
    tileSize: 48,
    playerSpeed: 3,
    startingLives: 3,
    chickenMoveIntervalMs: 1200,  // Hur ofta kycklingar rör sig
    roosterMoveIntervalMs: 800,   // Hur ofta tuppen rör sig
    chickenSpeedupPerLevel: 0.06,
    roosterSpeedupPerLevel: 0.08,
    minChickenMoveIntervalMs: 650,
    minRoosterMoveIntervalMs: 350,
    roosterChaseChanceBase: 0.15,
    roosterChaseChancePerLevel: 0.08,
    maxRoosterChaseChance: 0.75,
    clueDisplayMs: 3000,
    transformAnimationMs: 600,
    collisionRadius: 0.4,         // Kollisionsradie (andel av ruta)
    roosterCollisionRadius: 0.35, // Tuppens kollisionsradie (lite snävare)
};

/** Rutnätsstorlek (antal rutor) */
const GRID_COLS = 10;
const GRID_ROWS = 10;

/**
 * Påsk-ledtrådar om djur. Visas när spelaren
 * samlar ett ägg.
 */
const EASTER_CLUES = [
    '🐰 Påskharen gömmer ägg åt barnen!',
    '🐔 Hönan lägger ägg varje dag!',
    '🐣 Kycklingen kläcks ur ägget på våren!',
    '🐑 Lammet symboliserar påsken!',
    '🦊 Räven letar efter påskägg i skogen!',
    '🐤 Ankungen gillar att simma på påsken!',
    '🦉 Ugglan vaktar skogen medan alla sover!',
    '🐝 Biet samlar nektar från vårblommorna!',
    '🐸 Grodan hoppar bland påskliljorna!',
    '🦋 Fjärilen flyger bland blommorna på våren!',
];

// ============================================
// 2. SPELLÄGE (STATE)
// ============================================

/** Spelets aktuella tillstånd */
let gameState = {
    currentLevel: 0,
    isRunning: false,
    isGameOver: false,
    currentScreen: 'start-screen',
    gameOverAction: 'retry-level',
    animationFrameId: null,
    eggsCollected: 0,
    chickensCollected: 0,
    totalEggs: 0,
    totalChickens: 0,
    livesRemaining: CONFIG.startingLives,
    goalUnlocked: false,
    currentClue: '',
    clueStartTime: 0,
    clueTimer: 0,
    lastChickenMove: 0,
    lastRoosterMove: 0,
};

/** Spelarens data */
let player = {
    x: 0,
    y: 0,
    gridX: 0,
    gridY: 0,
    targetX: 0,
    targetY: 0,
    targetGridX: 0,
    targetGridY: 0,
    path: [],
    isMoving: false,
    showCollectEffect: false,
};

/** Ägg på spelplanen */
let eggs = [];

/** Snälla kycklingar (rör sig långsamt) */
let chickens = [];

/** Arga tuppar (rör sig, farliga) */
let roosters = [];

/** Målposition */
let goal = { x: 0, y: 0 };

/** Dekorativa element (blommor, stenar) */
let decorations = [];

/** Hinder i nivån */
let obstacles = [];

/** Index för nästa ledtråd att visa */
let nextClueIndex = 0;

// ============================================
// 3. NIVÅDATA (LEVELS) & GENERERING
// ============================================

/**
 * Handgjorda nivåer (1-3). Nivå 4+ genereras
 * procedurellt med generateLevel().
 */
const LEVELS = [
    {
        // Nivå 1 - Bara ägg (enkel introduktion)
        playerStart: { x: 1, y: 8 },
        goal: { x: 8, y: 1 },
        eggs: [
            { gridX: 3, gridY: 6 },
            { gridX: 5, gridY: 4 },
            { gridX: 7, gridY: 7 },
            { gridX: 2, gridY: 3 },
            { gridX: 6, gridY: 2 },
        ],
        chickens: [],
        roosters: [],
        obstacles: [
            { x: 4, y: 3, w: 1, h: 2 },
            { x: 6, y: 5, w: 2, h: 1 },
        ],
    },
    {
        // Nivå 2 - Ägg + snälla kycklingar
        playerStart: { x: 0, y: 9 },
        goal: { x: 9, y: 0 },
        eggs: [
            { gridX: 2, gridY: 7 },
            { gridX: 5, gridY: 5 },
            { gridX: 7, gridY: 3 },
            { gridX: 4, gridY: 1 },
        ],
        chickens: [
            { gridX: 3, gridY: 4, emoji: '🐤' },
            { gridX: 6, gridY: 6, emoji: '🐥' },
        ],
        roosters: [],
        obstacles: [
            { x: 2, y: 4, w: 1, h: 2 },
            { x: 5, y: 2, w: 1, h: 2 },
            { x: 7, y: 6, w: 2, h: 1 },
        ],
    },
    {
        // Nivå 3 - Ägg + kycklingar + 1 tupp
        playerStart: { x: 0, y: 5 },
        goal: { x: 9, y: 5 },
        eggs: [
            { gridX: 2, gridY: 3 },
            { gridX: 4, gridY: 7 },
            { gridX: 6, gridY: 2 },
            { gridX: 8, gridY: 8 },
        ],
        chickens: [
            { gridX: 3, gridY: 6, emoji: '🐤' },
            { gridX: 7, gridY: 4, emoji: '🐥' },
            { gridX: 5, gridY: 8, emoji: '🐤' },
        ],
        roosters: [
            { gridX: 5, gridY: 3 },
        ],
        obstacles: [
            { x: 1, y: 2, w: 1, h: 2 },
            { x: 3, y: 4, w: 1, h: 1 },
            { x: 6, y: 6, w: 2, h: 1 },
            { x: 8, y: 2, w: 1, h: 2 },
        ],
    },
];

/**
 * Genererar en procedurellt skapad nivå för
 * nivå 4 och uppåt. Fler kycklingar, fler
 * ägg, och från nivå 6+ även 2 tuppar.
 * @param {number} levelIndex - Nivåindex (0-baserat)
 * @returns {Object} Nivådata
 */
function generateLevel(levelIndex) {
    const levelNum = levelIndex + 1;
    const numEggs = 4 + Math.min(levelNum - 3, 4);
    const numChickens = 2 + Math.floor((levelNum - 3) * 1.5);
    const numRoosters = levelNum >= 6 ? 2 : 1;
    const numObstacles = 3 + Math.min(levelNum - 3, 4);

    // Reservera start- och målpositioner
    const usedPositions = new Set();
    const startPos = { x: 0, y: GRID_ROWS - 1 };
    const goalPos = { x: GRID_COLS - 1, y: 0 };
    usedPositions.add(`${startPos.x},${startPos.y}`);
    usedPositions.add(`${goalPos.x},${goalPos.y}`);

    function getRandomFreePos() {
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.floor(Math.random() * GRID_COLS);
            const y = Math.floor(Math.random() * GRID_ROWS);
            const key = `${x},${y}`;
            if (!usedPositions.has(key)) {
                usedPositions.add(key);
                return { x, y };
            }
            attempts++;
        }
        return null;
    }

    // Generera hinder (1x1 block)
    const generatedObstacles = [];
    for (let i = 0; i < numObstacles; i++) {
        const pos = getRandomFreePos();
        if (pos) {
            generatedObstacles.push({ x: pos.x, y: pos.y, w: 1, h: 1 });
        }
    }

    // Generera ägg
    const generatedEggs = [];
    for (let i = 0; i < numEggs; i++) {
        const pos = getRandomFreePos();
        if (pos) {
            generatedEggs.push({ gridX: pos.x, gridY: pos.y });
        }
    }

    // Generera kycklingar
    const chickenEmojis = ['🐤', '🐥'];
    const generatedChickens = [];
    for (let i = 0; i < numChickens; i++) {
        const pos = getRandomFreePos();
        if (pos) {
            generatedChickens.push({
                gridX: pos.x,
                gridY: pos.y,
                emoji: chickenEmojis[i % 2],
            });
        }
    }

    // Generera tuppar
    const generatedRoosters = [];
    for (let i = 0; i < numRoosters; i++) {
        const pos = getRandomFreePos();
        if (pos) {
            generatedRoosters.push({ gridX: pos.x, gridY: pos.y });
        }
    }

    return {
        playerStart: startPos,
        goal: goalPos,
        eggs: generatedEggs,
        chickens: generatedChickens,
        roosters: generatedRoosters,
        obstacles: generatedObstacles,
    };
}

/**
 * Hämtar nivådata, antingen från LEVELS-arrayen
 * eller genererar en ny nivå procedurellt.
 * @param {number} levelIndex
 * @returns {Object} Nivådata
 */
function getLevelData(levelIndex) {
    if (levelIndex < LEVELS.length) {
        return LEVELS[levelIndex];
    }
    return generateLevel(levelIndex);
}

// ============================================
// 4. RITFUNKTIONER (DRAWING)
// ============================================

/**
 * Ritar spelets bakgrund med gräs och rutnät.
 */
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#4a8c3f');
    gradient.addColorStop(1, '#3a7a2f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    for (let x = 0; x <= GRID_COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileW, 0);
        ctx.lineTo(x * tileW, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileH);
        ctx.lineTo(canvas.width, y * tileH);
        ctx.stroke();
    }

    drawDecorations();
}

/**
 * Genererar slumpmässiga dekorationer för nivån.
 */
function initDecorations() {
    decorations = [];
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    const flowerEmojis = ['🌼', '🌸', '🌿', '🍀', '🌻'];

    for (let i = 0; i < 15; i++) {
        const gx = Math.floor(Math.random() * GRID_COLS);
        const gy = Math.floor(Math.random() * GRID_ROWS);

        if (!isObstacle(gx, gy)) {
            decorations.push({
                x: gx * tileW + tileW * 0.2 + Math.random() * tileW * 0.6,
                y: gy * tileH + tileH * 0.2 + Math.random() * tileH * 0.6,
                emoji: flowerEmojis[Math.floor(Math.random() * flowerEmojis.length)],
                size: 12 + Math.random() * 8,
            });
        }
    }
}

/**
 * Ritar dekorativa element på kartan.
 */
function drawDecorations() {
    ctx.fillStyle = '#000';
    decorations.forEach((deco) => {
        ctx.font = `${deco.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(deco.emoji, deco.x, deco.y);
    });
}

/**
 * Ritar hinder (buskar/träd) på kartan.
 */
function drawObstacles() {
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;

    obstacles.forEach((obs) => {
        for (let ox = 0; ox < obs.w; ox++) {
            for (let oy = 0; oy < obs.h; oy++) {
                const px = (obs.x + ox) * tileW;
                const py = (obs.y + oy) * tileH;

                ctx.fillStyle = '#2d5a27';
                ctx.fillRect(px + 2, py + 2, tileW - 4, tileH - 4);
                ctx.fillStyle = '#1a3d15';
                ctx.fillRect(px + 4, py + 4, tileW - 8, tileH - 8);

                ctx.fillStyle = '#000';
                ctx.font = `${Math.min(tileW, tileH) * 0.6}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🌳', px + tileW / 2, py + tileH / 2);
            }
        }
    });
}

/**
 * Ritar målet. Låst tills alla ägg och
 * kycklingar är samlade.
 */
function drawGoal() {
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    const gx = goal.x * tileW;
    const gy = goal.y * tileH;

    if (gameState.goalUnlocked) {
        const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 215, 0, ${0.3 * pulse})`;
        ctx.beginPath();
        ctx.arc(gx + tileW / 2, gy + tileH / 2, tileW * 0.6, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(gx + tileW / 2, gy + tileH / 2, tileW * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#000';
    ctx.font = `${Math.min(tileW, tileH) * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gameState.goalUnlocked ? '🏁' : '🔒', gx + tileW / 2, gy + tileH / 2);
}

/**
 * Ritar ägg på spelplanen med en pulserande effekt.
 */
function drawEggs() {
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    const bounce = Math.sin(Date.now() * 0.004) * 2;

    eggs.forEach((egg) => {
        const size = Math.min(tileW, tileH) * 0.6;
        const px = egg.gridX * tileW;
        const py = egg.gridY * tileH;

        // Glöd runt ägget
        ctx.fillStyle = 'rgba(255, 223, 100, 0.25)';
        ctx.beginPath();
        ctx.arc(px + tileW / 2, py + tileH / 2, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🥚', px + tileW / 2, py + tileH / 2 + bounce);
    });
}

/**
 * Ritar snälla kycklingar på spelplanen.
 */
function drawChickens() {
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;

    chickens.forEach((chick) => {
        const size = Math.min(tileW, tileH) * 0.7;

        ctx.fillStyle = 'rgba(100, 220, 120, 0.32)';
        ctx.beginPath();
        ctx.arc(
            chick.x + tileW / 2,
            chick.y + tileH * 0.8,
            Math.min(tileW, tileH) * 0.16,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(tileW, tileH) * 0.22}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', chick.x + tileW / 2, chick.y + tileH * 0.8);

        ctx.fillStyle = '#000';
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            chick.emoji,
            chick.x + tileW / 2,
            chick.y + tileH / 2
        );
    });
}

/**
 * Ritar arga tuppar med en varningseffekt.
 */
function drawRoosters() {
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;

    roosters.forEach((rooster) => {
        const size = Math.min(tileW, tileH) * 0.8;

        // Röd varningsglöd runt tuppen
        const pulse = Math.sin(Date.now() * 0.006) * 0.2 + 0.3;
        ctx.fillStyle = `rgba(255, 50, 50, ${pulse})`;
        ctx.beginPath();
        ctx.arc(
            rooster.x + tileW / 2,
            rooster.y + tileH / 2,
            size * 0.5,
            0, Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            '🐓',
            rooster.x + tileW / 2,
            rooster.y + tileH / 2
        );
    });
}

// ============================================
// 5. SPELARLOGIK
// ============================================

/**
 * Ritar spelaren.
 */
function drawPlayer() {
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    const size = Math.min(tileW, tileH) * 0.8;

    // Skugga under spelaren
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(
        player.x + tileW / 2,
        player.y + tileH - 4,
        size * 0.3,
        size * 0.12,
        0, 0, Math.PI * 2
    );
    ctx.fill();

    // Samlingseffekt
    if (player.showCollectEffect) {
        ctx.fillStyle = 'rgba(255, 255, 100, 0.4)';
        ctx.beginPath();
        ctx.arc(
            player.x + tileW / 2,
            player.y + tileH / 2,
            size * 0.7,
            0, Math.PI * 2
        );
        ctx.fill();
    }

    ctx.fillStyle = '#000';
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧍', player.x + tileW / 2, player.y + tileH / 2);
}

/**
 * Uppdaterar spelarens position mot målpunkten.
 */
function updatePlayer() {
    if (!player.isMoving && player.path.length > 0) {
        startNextPlayerStep();
    }

    if (!player.isMoving) return;

    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < CONFIG.playerSpeed) {
        player.x = player.targetX;
        player.y = player.targetY;
        player.gridX = player.targetGridX;
        player.gridY = player.targetGridY;
        player.isMoving = false;

        if (player.path.length > 0) {
            startNextPlayerStep();
        }
    } else {
        player.x += (dx / distance) * CONFIG.playerSpeed;
        player.y += (dy / distance) * CONFIG.playerSpeed;
    }
}

/**
 * Kontrollerar om en given rutnätsposition
 * är blockerad av ett hinder.
 */
function isObstacle(gridX, gridY) {
    return obstacles.some((obs) =>
        gridX >= obs.x && gridX < obs.x + obs.w &&
        gridY >= obs.y && gridY < obs.y + obs.h
    );
}

/**
 * Kontrollerar om en ruta ligger inom spelplanen.
 */
function isWithinGrid(gridX, gridY) {
    return gridX >= 0 && gridX < GRID_COLS && gridY >= 0 && gridY < GRID_ROWS;
}

/**
 * Hämtar alla giltiga grannrutor från en position.
 */
function getValidNeighborTiles(gridX, gridY) {
    const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
    ];

    return directions
        .map((direction) => ({
            x: gridX + direction.dx,
            y: gridY + direction.dy,
        }))
        .filter((tile) => isWithinGrid(tile.x, tile.y) && !isObstacle(tile.x, tile.y));
}

/**
 * Startar nästa steg i spelarens nuvarande väg.
 */
function startNextPlayerStep() {
    if (player.path.length === 0) return;

    const nextStep = player.path.shift();
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;

    player.targetGridX = nextStep.x;
    player.targetGridY = nextStep.y;
    player.targetX = nextStep.x * tileW;
    player.targetY = nextStep.y * tileH;
    player.isMoving = true;
}

/**
 * Hittar en gångbar väg mellan två rutor.
 */
function findPath(startX, startY, goalX, goalY) {
    if (!isWithinGrid(goalX, goalY) || isObstacle(goalX, goalY)) {
        return null;
    }

    if (startX === goalX && startY === goalY) {
        return [];
    }

    const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
    ];
    const queue = [{ x: startX, y: startY }];
    const visited = new Set([`${startX},${startY}`]);
    const previous = new Map();

    while (queue.length > 0) {
        const current = queue.shift();

        if (current.x === goalX && current.y === goalY) {
            const path = [];
            let stepKey = `${goalX},${goalY}`;

            while (previous.has(stepKey)) {
                const [x, y] = stepKey.split(',').map(Number);
                path.unshift({ x, y });
                stepKey = previous.get(stepKey);
            }

            return path;
        }

        directions.forEach((direction) => {
            const nextX = current.x + direction.dx;
            const nextY = current.y + direction.dy;
            const nextKey = `${nextX},${nextY}`;

            if (!isWithinGrid(nextX, nextY) || isObstacle(nextX, nextY) || visited.has(nextKey)) {
                return;
            }

            visited.add(nextKey);
            previous.set(nextKey, `${current.x},${current.y}`);
            queue.push({ x: nextX, y: nextY });
        });
    }

    return null;
}

/**
 * Försöker flytta spelaren till en specifik
 * rutnätsposition.
 */
function movePlayerTo(gridX, gridY) {
    gridX = Math.max(0, Math.min(GRID_COLS - 1, gridX));
    gridY = Math.max(0, Math.min(GRID_ROWS - 1, gridY));

    if (isObstacle(gridX, gridY)) return;

    const startGridX = player.isMoving ? player.targetGridX : player.gridX;
    const startGridY = player.isMoving ? player.targetGridY : player.gridY;
    const path = findPath(startGridX, startGridY, gridX, gridY);

    if (path === null) return;

    player.path = path;

    if (!player.isMoving) {
        startNextPlayerStep();
    }
}

// ============================================
// 6. ÄGG, KYCKLINGAR & TUPP-LOGIK
// ============================================

/**
 * Kontrollerar om spelaren plockar upp ägg.
 */
function checkEggCollection() {
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    const playerCenterX = player.x + tileW / 2;
    const playerCenterY = player.y + tileH / 2;
    const collisionRadius = tileW * CONFIG.collisionRadius;

    for (let i = eggs.length - 1; i >= 0; i--) {
        const egg = eggs[i];
        const eggCenterX = egg.gridX * tileW + tileW / 2;
        const eggCenterY = egg.gridY * tileH + tileH / 2;

        const dx = playerCenterX - eggCenterX;
        const dy = playerCenterY - eggCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < collisionRadius) {
            eggs.splice(i, 1);
            gameState.eggsCollected++;

            // Visa en påsk-ledtråd
            gameState.currentClue = EASTER_CLUES[nextClueIndex % EASTER_CLUES.length];
            gameState.clueStartTime = performance.now();
            gameState.clueTimer = CONFIG.clueDisplayMs;
            nextClueIndex++;

            showCollectEffect();
            checkWinCondition();
        }
    }
}

/**
 * Kontrollerar om spelaren fångar kycklingar.
 */
function checkChickenCollection() {
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    const playerCenterX = player.x + tileW / 2;
    const playerCenterY = player.y + tileH / 2;
    const collisionRadius = tileW * CONFIG.collisionRadius;

    for (let i = chickens.length - 1; i >= 0; i--) {
        const chick = chickens[i];
        const chickCenterX = chick.x + tileW / 2;
        const chickCenterY = chick.y + tileH / 2;

        const dx = playerCenterX - chickCenterX;
        const dy = playerCenterY - chickCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < collisionRadius) {
            chickens.splice(i, 1);
            gameState.chickensCollected++;

            showCollectEffect();
            checkWinCondition();
        }
    }
}

/**
 * Kontrollerar om spelaren kolliderar med
 * en tupp = Game Over.
 */
function checkRoosterCollision() {
    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    const playerCenterX = player.x + tileW / 2;
    const playerCenterY = player.y + tileH / 2;
    const collisionRadius = tileW * CONFIG.roosterCollisionRadius;

    for (const rooster of roosters) {
        const roosterCenterX = rooster.x + tileW / 2;
        const roosterCenterY = rooster.y + tileH / 2;

        const dx = playerCenterX - roosterCenterX;
        const dy = playerCenterY - roosterCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < collisionRadius) {
            triggerGameOver();
            return;
        }
    }
}

/**
 * Visar en kort samlingseffekt runt spelaren.
 */
function showCollectEffect() {
    player.showCollectEffect = true;
    setTimeout(() => {
        player.showCollectEffect = false;
    }, CONFIG.transformAnimationMs);
}

/**
 * Kontrollerar om alla ägg och kycklingar
 * samlats → lås upp målet.
 */
function checkWinCondition() {
    if (gameState.eggsCollected >= gameState.totalEggs &&
        gameState.chickensCollected >= gameState.totalChickens) {
        gameState.goalUnlocked = true;
    }
}

/**
 * Kontrollerar om spelaren nått målet.
 */
function checkGoalReached() {
    if (!gameState.goalUnlocked) return;

    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    const playerCenterX = player.x + tileW / 2;
    const playerCenterY = player.y + tileH / 2;
    const goalCenterX = goal.x * tileW + tileW / 2;
    const goalCenterY = goal.y * tileH + tileH / 2;

    const dx = playerCenterX - goalCenterX;
    const dy = playerCenterY - goalCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < tileW * CONFIG.collisionRadius) {
        winLevel();
    }
}

/**
 * Rör kycklingar slumpmässigt till intilliggande
 * lediga rutor.
 */
function updateChickens(now) {
    if (now - gameState.lastChickenMove < getChickenMoveInterval()) return;
    gameState.lastChickenMove = now;

    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;

    chickens.forEach((chick) => {
        const currentGX = Math.round(chick.x / tileW);
        const currentGY = Math.round(chick.y / tileH);

        // Välj en slumpmässig riktning
        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
        ];
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const newGX = currentGX + dir.dx;
        const newGY = currentGY + dir.dy;

        // Kolla gränser och hinder
        if (newGX >= 0 && newGX < GRID_COLS &&
            newGY >= 0 && newGY < GRID_ROWS &&
            !isObstacle(newGX, newGY)) {
            chick.x = newGX * tileW;
            chick.y = newGY * tileH;
        }
    });
}

/**
 * Rör tuppar slumpmässigt (snabbare än kycklingar).
 */
function updateRoosters(now) {
    if (now - gameState.lastRoosterMove < getRoosterMoveInterval()) return;
    gameState.lastRoosterMove = now;

    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;

    roosters.forEach((rooster) => {
        const currentGX = Math.round(rooster.x / tileW);
        const currentGY = Math.round(rooster.y / tileH);
        const nextTile = chooseRoosterMove(currentGX, currentGY);

        if (nextTile) {
            rooster.x = nextTile.x * tileW;
            rooster.y = nextTile.y * tileH;
        }
    });
}

/**
 * Ritar ledtrådstext på skärmen.
 */
function drawClue() {
    if (!gameState.currentClue || gameState.clueTimer <= 0) return;

    const elapsed = performance.now() - gameState.clueStartTime;
    const remaining = CONFIG.clueDisplayMs - elapsed;
    if (remaining <= 0) {
        gameState.clueTimer = 0;
        return;
    }

    const alpha = Math.min(1, remaining / 500);
    const boxY = canvas.height - 70;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * alpha})`;
    const padding = 16;
    ctx.fillRect(padding, boxY, canvas.width - padding * 2, 50);

    ctx.fillStyle = `rgba(255, 215, 0, ${0.8 * alpha})`;
    ctx.fillRect(padding, boxY, canvas.width - padding * 2, 3);

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gameState.currentClue, canvas.width / 2, boxY + 27);
}

/**
 * Hämtar kycklingarnas aktuella rörelseintervall
 * baserat på nuvarande nivå.
 */
function getChickenMoveInterval() {
    const levelsSinceIntroduction = Math.max(0, gameState.currentLevel - 1);
    const speedFactor = 1 - levelsSinceIntroduction * CONFIG.chickenSpeedupPerLevel;
    return Math.max(
        CONFIG.minChickenMoveIntervalMs,
        Math.round(CONFIG.chickenMoveIntervalMs * speedFactor)
    );
}

/**
 * Hämtar tuppens aktuella rörelseintervall
 * baserat på nuvarande nivå.
 */
function getRoosterMoveInterval() {
    const levelsSinceIntroduction = Math.max(0, gameState.currentLevel - 2);
    const speedFactor = 1 - levelsSinceIntroduction * CONFIG.roosterSpeedupPerLevel;
    return Math.max(
        CONFIG.minRoosterMoveIntervalMs,
        Math.round(CONFIG.roosterMoveIntervalMs * speedFactor)
    );
}

/**
 * Hur ofta tuppen väljer ett steg som tar den
 * närmare spelaren, baserat på nivå.
 */
function getRoosterChaseChance() {
    const levelsSinceIntroduction = Math.max(0, gameState.currentLevel - 2);
    return Math.min(
        CONFIG.maxRoosterChaseChance,
        CONFIG.roosterChaseChanceBase + levelsSinceIntroduction * CONFIG.roosterChaseChancePerLevel
    );
}

/**
 * Väljer nästa tuppsteg med en blandning av
 * slump och spelarfokuserad rörelse.
 */
function chooseRoosterMove(currentGX, currentGY) {
    const validTiles = getValidNeighborTiles(currentGX, currentGY);

    if (validTiles.length === 0) {
        return null;
    }

    const playerGridX = player.isMoving ? player.targetGridX : player.gridX;
    const playerGridY = player.isMoving ? player.targetGridY : player.gridY;
    const shouldChase = Math.random() < getRoosterChaseChance();

    if (!shouldChase) {
        return validTiles[Math.floor(Math.random() * validTiles.length)];
    }

    let bestDistance = Infinity;
    let bestTiles = [];

    validTiles.forEach((tile) => {
        const distance = Math.abs(tile.x - playerGridX) + Math.abs(tile.y - playerGridY);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestTiles = [tile];
            return;
        }

        if (distance === bestDistance) {
            bestTiles.push(tile);
        }
    });

    return bestTiles[Math.floor(Math.random() * bestTiles.length)];
}

// ============================================
// 7. INMATNING (KLICK, TOUCH, TANGENTBORD)
// ============================================

/**
 * Hanterar klick/touch på canvas.
 */
canvas.addEventListener('click', (event) => {
    if (!gameState.isRunning) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    const gridX = Math.floor(clickX / tileW);
    const gridY = Math.floor(clickY / tileH);

    movePlayerTo(gridX, gridY);
});

/** Touch-stöd för mobila enheter */
canvas.addEventListener('touchstart', (event) => {
    if (!gameState.isRunning) return;
    event.preventDefault();

    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touchX = (touch.clientX - rect.left) * scaleX;
    const touchY = (touch.clientY - rect.top) * scaleY;

    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;
    const gridX = Math.floor(touchX / tileW);
    const gridY = Math.floor(touchY / tileH);

    movePlayerTo(gridX, gridY);
}, { passive: false });

/** Tangentbordsinmatning (piltangenter & WASD) */
document.addEventListener('keydown', (event) => {
    const isConfirmKey = event.key === 'Enter' || event.key === ' ' || event.code === 'Space';

    if (!gameState.isRunning) {
        if (gameState.currentScreen === 'win-screen' && isConfirmKey) {
            event.preventDefault();
            nextLevel();
        }
        if (gameState.currentScreen === 'gameover-screen' && isConfirmKey) {
            event.preventDefault();
            handleGameOverAction();
        }
        return;
    }

    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;

    const currentGridX = Math.round(player.x / tileW);
    const currentGridY = Math.round(player.y / tileH);

    let newGridX = currentGridX;
    let newGridY = currentGridY;

    switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            newGridY--;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            newGridY++;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            newGridX--;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            newGridX++;
            break;
        default:
            return;
    }

    event.preventDefault();
    movePlayerTo(newGridX, newGridY);
});

// ============================================
// 8. SPELLOOP
// ============================================

/**
 * Huvudsaklig spelloop.
 */
function gameLoop() {
    if (!gameState.isRunning) return;

    const now = performance.now();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawObstacles();
    drawGoal();
    drawEggs();

    // Uppdatera rörliga enheter
    updateChickens(now);
    updateRoosters(now);

    drawChickens();
    drawRoosters();

    // Uppdatera spelarens position
    updatePlayer();

    // Kollisionskontroller
    checkEggCollection();
    checkChickenCollection();
    checkRoosterCollision();
    checkGoalReached();

    // Rita spelaren (sist, så den är överst)
    drawPlayer();

    // Rita ledtråd
    drawClue();

    // Uppdatera HUD
    updateHUD();

    gameState.animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * Uppdaterar HUD-elementen.
 */
function updateHUD() {
    const levelNum = gameState.currentLevel + 1;
    document.getElementById('level-display').textContent = `Nivå: ${levelNum}`;

    const parts = [];
    parts.push(`❤️ ${gameState.livesRemaining}/${CONFIG.startingLives}`);
    parts.push(`🥚 ${gameState.eggsCollected}/${gameState.totalEggs}`);
    if (gameState.totalChickens > 0) {
        parts.push(`🐤 ${gameState.chickensCollected}/${gameState.totalChickens}`);
    }
    if (roosters.length > 0) {
        parts.push('⚠️🐓');
    }
    document.getElementById('status-display').textContent = parts.join('  ');
}

// ============================================
// 9. CHOKLADÄGG (VINST-RENDERING)
// ============================================

/**
 * Ritar ett stort chokladägg med rutigt mönster.
 */
function drawChocolateEgg(canvasId) {
    const eggCanvas = document.getElementById(canvasId);
    if (!eggCanvas) return;
    const eggCtx = eggCanvas.getContext('2d');
    const w = eggCanvas.width;
    const h = eggCanvas.height;

    eggCtx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2 + 10;
    const radiusX = 75;
    const radiusY = 100;

    eggCtx.save();
    eggCtx.beginPath();
    eggCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    eggCtx.clip();

    eggCtx.fillStyle = '#8B4513';
    eggCtx.fillRect(0, 0, w, h);

    const squareSize = 20;
    for (let x = 0; x < w; x += squareSize) {
        for (let y = 0; y < h; y += squareSize) {
            const isEven = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
            eggCtx.fillStyle = isEven ? '#A0522D' : '#6B3410';
            eggCtx.fillRect(x, y, squareSize, squareSize);
        }
    }

    const gloss = eggCtx.createRadialGradient(
        centerX - 20, centerY - 40, 5,
        centerX, centerY, radiusY
    );
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    gloss.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
    gloss.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    eggCtx.fillStyle = gloss;
    eggCtx.fillRect(0, 0, w, h);

    eggCtx.restore();

    eggCtx.strokeStyle = '#5C2D0A';
    eggCtx.lineWidth = 3;
    eggCtx.beginPath();
    eggCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    eggCtx.stroke();

    eggCtx.fillStyle = '#FFD700';
    eggCtx.fillRect(centerX - radiusX, centerY - 6, radiusX * 2, 12);
    eggCtx.strokeStyle = '#DAA520';
    eggCtx.lineWidth = 1;
    eggCtx.strokeRect(centerX - radiusX, centerY - 6, radiusX * 2, 12);

    eggCtx.font = '24px Arial';
    eggCtx.textAlign = 'center';
    eggCtx.textBaseline = 'middle';
    eggCtx.fillText('🎀', centerX, centerY);
}

// ============================================
// 10. SKÄRMHANTERING
// ============================================

/**
 * Visar en specifik skärm och döljer de andra.
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach((screen) => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
    gameState.currentScreen = screenId;
}

/**
 * Laddar en nivå och startar spelet.
 */
function loadLevel() {
    const levelIndex = gameState.currentLevel;
    const level = getLevelData(levelIndex);

    showScreen('game-screen');

    // Ställ in canvas storlek
    resizeCanvas();

    const tileW = canvas.width / GRID_COLS;
    const tileH = canvas.height / GRID_ROWS;

    // Placera spelaren
    player.x = level.playerStart.x * tileW;
    player.y = level.playerStart.y * tileH;
    player.gridX = level.playerStart.x;
    player.gridY = level.playerStart.y;
    player.targetX = player.x;
    player.targetY = player.y;
    player.targetGridX = player.gridX;
    player.targetGridY = player.gridY;
    player.path = [];
    player.isMoving = false;
    player.showCollectEffect = false;

    // Sätt målet
    goal.x = level.goal.x;
    goal.y = level.goal.y;

    // Sätt hinder
    obstacles = level.obstacles.slice();

    // Skapa ägg
    eggs = level.eggs.map((e) => ({
        gridX: e.gridX,
        gridY: e.gridY,
    }));

    // Skapa kycklingar
    chickens = level.chickens.map((c) => ({
        emoji: c.emoji,
        x: c.gridX * tileW,
        y: c.gridY * tileH,
    }));

    // Skapa tuppar
    roosters = level.roosters.map((r) => ({
        x: r.gridX * tileW,
        y: r.gridY * tileH,
    }));

    // Initiera spelstate
    gameState.eggsCollected = 0;
    gameState.chickensCollected = 0;
    gameState.totalEggs = level.eggs.length;
    gameState.totalChickens = level.chickens.length;
    gameState.goalUnlocked = false;
    gameState.isGameOver = false;
    gameState.gameOverAction = 'retry-level';
    gameState.currentClue = '';
    gameState.clueTimer = 0;
    gameState.lastChickenMove = performance.now();
    gameState.lastRoosterMove = performance.now();

    // Skapa dekorationer
    initDecorations();

    // Starta
    gameState.isRunning = true;
    gameState.animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * Startar spelet från början.
 */
function startGame() {
    gameState.currentLevel = 0;
    gameState.livesRemaining = CONFIG.startingLives;
    loadLevel();
}

/**
 * Hanterar vinst av en nivå.
 */
function winLevel() {
    gameState.isRunning = false;

    if (gameState.animationFrameId) {
        cancelAnimationFrame(gameState.animationFrameId);
    }

    drawChocolateEgg('chocolate-egg-canvas');
    showScreen('win-screen');
}

/**
 * Går vidare till nästa nivå.
 */
function nextLevel() {
    gameState.currentLevel++;
    loadLevel();
}

/**
 * Hanterar Game Over (tuppen fångade spelaren).
 */
function triggerGameOver() {
    gameState.isRunning = false;
    gameState.isGameOver = true;
    gameState.livesRemaining = Math.max(0, gameState.livesRemaining - 1);

    if (gameState.animationFrameId) {
        cancelAnimationFrame(gameState.animationFrameId);
    }

    updateGameOverScreen();
    showScreen('gameover-screen');
}

/**
 * Uppdaterar Game Over-skärmen beroende på
 * om spelaren har liv kvar eller måste börja om.
 */
function updateGameOverScreen() {
    const message = document.getElementById('gameover-message');
    const button = document.getElementById('retry-button');
    const hint = document.getElementById('gameover-hint');

    if (gameState.livesRemaining > 0) {
        gameState.gameOverAction = 'retry-level';
        message.textContent = `Tuppen fångade dig. Liv kvar: ${gameState.livesRemaining}/${CONFIG.startingLives}.`;
        button.textContent = 'Försök igen';
        hint.textContent = 'Tryck Enter eller mellanslag för att försöka igen';
        return;
    }

    gameState.gameOverAction = 'restart-game';
    message.textContent = 'Alla liv är slut. Du får börja om från nivå 1.';
    button.textContent = 'Börja om';
    hint.textContent = 'Tryck Enter eller mellanslag för att börja om hela spelet';
}

/**
 * Utför rätt åtgärd från Game Over-skärmen.
 */
function handleGameOverAction() {
    if (gameState.gameOverAction === 'restart-game') {
        startGame();
        return;
    }

    retryLevel();
}

/**
 * Startar om aktuell nivå efter Game Over.
 */
function retryLevel() {
    loadLevel();
}

/**
 * Anpassar canvas storlek till sin container.
 */
function resizeCanvas() {
    const hud = document.getElementById('game-hud');
    canvas.width = canvas.clientWidth;
    canvas.height = document.getElementById('game-screen').clientHeight - hud.offsetHeight;
}

// ============================================
// 11. INITIERING
// ============================================

/** Koppla knappar till funktioner */
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('next-level-button').addEventListener('click', nextLevel);
document.getElementById('restart-button').addEventListener('click', startGame);
document.getElementById('retry-button').addEventListener('click', handleGameOverAction);

/** Lyssna på fönsterstorlek-ändring */
window.addEventListener('resize', () => {
    if (gameState.isRunning) {
        const oldWidth = canvas.width;
        const oldHeight = canvas.height;
        resizeCanvas();

        const scaleX = canvas.width / oldWidth;
        const scaleY = canvas.height / oldHeight;

        player.x *= scaleX;
        player.y *= scaleY;
        player.targetX *= scaleX;
        player.targetY *= scaleY;

        chickens.forEach((c) => {
            c.x *= scaleX;
            c.y *= scaleY;
        });

        roosters.forEach((r) => {
            r.x *= scaleX;
            r.y *= scaleY;
        });

        decorations.forEach((deco) => {
            deco.x *= scaleX;
            deco.y *= scaleY;
        });
    }
});

/** Visa startskärmen */
showScreen('start-screen');
