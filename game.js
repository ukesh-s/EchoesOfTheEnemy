// Echoes of the Enemy - Advanced Tactical Survival Engine
// Full Stealth Mechanics, Flanking Pack AI, Extraction Protocol, Laser Sight, NVG & Decals

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    
    this.width = 1280;
    this.height = 720;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Lighting canvas for dynamic flashlight, searchlights & muzzle flash
    this.lightCanvas = document.createElement("canvas");
    this.lightCanvas.width = this.width;
    this.lightCanvas.height = this.height;
    this.lightCtx = this.lightCanvas.getContext("2d");

    // ECG Canvas
    this.ecgCanvas = document.getElementById("ecgCanvas");
    this.ecgCtx = this.ecgCanvas ? this.ecgCanvas.getContext("2d") : null;
    this.ecgX = 0;

    this.keys = {};
    this.mouse = { x: 640, y: 360 };
    this.timeScale = 1.0;
    this.debugDraw = true; // Tab toggles sensor gizmos
    this.flashlightOn = true;
    this.nvgMode = false; // N toggles Night Vision Goggles
    this.survivalTime = 0.0;
    this.score = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.screenShake = 0;
    this.muzzleFlashTimer = 0;
    this.currentNoiseLevel = 8; // dB

    // Extraction Protocol
    this.extractionReady = false;
    this.extractionZone = { x: 1140, y: 360, radius: 45, holdTimer: 0.0, requiredHold: 2.0 };
    this.energyCellsCollected = 0;

    // Security Terminal
    this.securityTerminal = { x: 490, y: 325, radius: 36, isAlarmActive: false, alarmTimer: 0 };

    // Load High-Res Textures
    this.playerImg = new Image();
    this.playerImg.src = "assets/sprites/player_sprite.png";

    this.enemyImg = new Image();
    this.enemyImg.src = "assets/sprites/enemy_sprite.png";

    this.containerImg = new Image();
    this.containerImg.src = "assets/sprites/container.png";

    this.generatorImg = new Image();
    this.generatorImg.src = "assets/sprites/generator.png";

    this.floorTileImg = new Image();
    this.floorTileImg.src = "assets/sprites/floor_tile.png";
    this.floorPattern = null;
    this.floorTileImg.onload = () => {
      this.floorPattern = this.ctx.createPattern(this.floorTileImg, "repeat");
    };

    // Entities & Pools
    this.projectiles = [];
    this.decoys = [];
    this.pickups = [];
    this.floatingTexts = [];
    this.particles = [];
    this.decals = []; // Footprints & tread marks
    this.dustParticles = [];

    for (let i = 0; i < 45; i++) {
      this.dustParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        size: 1 + Math.random() * 2
      });
    }

    this.initArena();
    this.initPlayer();
    this.initEnemies();
    this.setupControls();
  }

  initArena() {
    this.walls = [
      { x: 0, y: 0, w: this.width, h: 26, isOuter: true },
      { x: 0, y: this.height - 26, w: this.width, h: 26, isOuter: true },
      { x: 0, y: 0, w: 26, h: this.height, isOuter: true },
      { x: this.width - 26, y: 0, w: 26, h: this.height, isOuter: true },
      // Tactical Cargo Containers & Power Generators
      { x: 380, y: 190, w: 100, h: 270, type: "container_v" },
      { x: 800, y: 280, w: 230, h: 105, type: "container_h" },
      { x: 620, y: 500, w: 110, h: 110, type: "generator" },
      { x: 620, y: 110, w: 110, h: 110, type: "generator" }
    ];

    this.spawnPickup("medkit", 240, 160);
    this.spawnPickup("decoy", 675, 360);
    this.spawnPickup("energy", 1080, 180);
    this.spawnPickup("energy", 1080, 540);
    this.spawnPickup("energy", 675, 230);
  }

  initPlayer() {
    this.player = {
      x: 180,
      y: 360,
      vx: 0,
      vy: 0,
      radius: 18,
      baseSpeed: 210.0,
      speed: 210.0,
      sprintMultiplier: 1.55,
      crouchMultiplier: 0.5,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      isSprinting: false,
      isCrouching: false,
      decoysLeft: 3,
      maxDecoys: 3,
      canTakeDamage: true,
      invulnTimer: 0.0,
      invulnDuration: 0.45,
      aimAngle: 0,
      walkAnimTime: 0,
      isMoving: false,
      shootCooldown: 0.0,
      decalTimer: 0.0
    };
  }

  initEnemies() {
    this.enemies = [
      new EnemySentinel("Sentinel-Alpha", 980, 240, [
        { x: 980, y: 160 },
        { x: 980, y: 560 }
      ], 95.0, 140.0, 260.0, 42.0),

      new EnemySentinel("Sentinel-Beta", 675, 560, [
        { x: 540, y: 560 },
        { x: 810, y: 560 }
      ], 85.0, 130.0, 240.0, 42.0)
    ];
  }

  spawnEnemies(count) {
    this.enemies = [];
    const positions = [
      { x: 980, y: 240, wp: [{ x: 980, y: 160 }, { x: 980, y: 560 }] },
      { x: 675, y: 560, wp: [{ x: 540, y: 560 }, { x: 810, y: 560 }] },
      { x: 720, y: 180, wp: [{ x: 580, y: 180 }, { x: 840, y: 180 }] },
      { x: 1080, y: 460, wp: [{ x: 1080, y: 380 }, { x: 1080, y: 580 }] },
      { x: 480, y: 220, wp: [{ x: 480, y: 140 }, { x: 480, y: 320 }] }
    ];
    for (let i = 0; i < count; i++) {
      const cfg = positions[i % positions.length];
      const name = `Sentinel-${String.fromCharCode(65 + i)}`;
      this.enemies.push(new EnemySentinel(name, cfg.x, cfg.y, cfg.wp, 90, 135, 250, 42));
    }
  }

  spawnPickup(type, x, y) {
    this.pickups.push({ type, x, y, radius: 14, bobOffset: Math.random() * Math.PI * 2 });
  }

  setupControls() {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;

      if (k === "shift") {
        this.player.isSprinting = true;
      }
      if (k === "control" || k === "c") {
        this.player.isCrouching = true;
      }
      if (k === " " || k === "q") {
        e.preventDefault();
        this.deployDecoy();
      }
      if (k === "e") {
        this.interactWithTerminal();
      }
      if (k === "n") {
        this.toggleNVG();
      }
      if (k === "tab" || k === "f1") {
        e.preventDefault();
        this.toggleTacticalOverlay();
      }
      if (k === "r" && (this.isGameOver || this.isVictory)) {
        this.restartGame();
      }
      if (k === "p") {
        this.isPaused = !this.isPaused;
      }
    });

    window.addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = false;
      if (k === "shift") {
        this.player.isSprinting = false;
      }
      if (k === "control" || k === "c") {
        this.player.isCrouching = false;
      }
    });

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.shootDart();
      } else if (e.button === 2) {
        e.preventDefault();
        this.deployDecoy();
      }
    });

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  start() {
    const loop = (currentTime) => {
      let delta = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;
      if (delta > 0.1) delta = 0.1;

      if (!this.isPaused) {
        this.update(delta * this.timeScale);
      }
      this.render();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(delta) {
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - delta * 20);
    }
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
    }

    if (!this.isGameOver && !this.isVictory) {
      this.survivalTime += delta;
      this.score += delta * 15;
      this.updatePlayer(delta);
      this.checkExtractionProtocol(delta);
    }

    // Security Terminal Alarm update
    if (this.securityTerminal.isAlarmActive) {
      this.securityTerminal.alarmTimer -= delta;
      if (this.securityTerminal.alarmTimer <= 0) {
        this.securityTerminal.isAlarmActive = false;
      }
    }

    // Acoustic Noise Signature Calculation
    let targetNoise = 8; // Silent baseline
    if (this.player.isCrouching && this.player.isMoving) targetNoise = 12; // Stealth crouch
    else if (this.player.isMoving && !this.player.isSprinting) targetNoise = 38; // Walking
    else if (this.player.isSprinting && this.player.isMoving) targetNoise = 75; // Sprinting
    if (this.muzzleFlashTimer > 0) targetNoise = 95; // Firing weapon
    this.currentNoiseLevel += (targetNoise - this.currentNoiseLevel) * 0.15;

    // Decals (Footprints & Tread marks fading)
    for (let i = this.decals.length - 1; i >= 0; i--) {
      this.decals[i].life -= delta;
      if (this.decals[i].life <= 0) this.decals.splice(i, 1);
    }

    // Dust particles
    for (const d of this.dustParticles) {
      d.x += d.vx * delta;
      d.y += d.vy * delta;
      if (d.x < 0) d.x = this.width;
      if (d.x > this.width) d.x = 0;
      if (d.y < 0) d.y = this.height;
      if (d.y > this.height) d.y = 0;
    }

    // Decoys
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const dec = this.decoys[i];
      dec.timer -= delta;
      dec.pingTimer -= delta;
      if (dec.pingTimer <= 0) {
        dec.pingTimer = 0.6;
        this.createShockwave(dec.x, dec.y, "#00e5ff", 65);
        if (window.soundSystem) window.soundSystem.playDecoy();
      }
      if (dec.timer <= 0) this.decoys.splice(i, 1);
    }

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;

      for (const enemy of this.enemies) {
        const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (d < enemy.radius + 6) {
          enemy.attackTimeLeft = 1.3;
          enemy.x += (p.vx / 300) * 22;
          enemy.y += (p.vy / 300) * 22;
          this.resolveCollisions(enemy);
          this.addFloatingText("DISRUPTED!", enemy.x, enemy.y - 25, "#00e5ff");
          this.createHitParticles(p.x, p.y, "#00e5ff");
          p.life = 0;
          break;
        }
      }

      for (const w of this.walls) {
        if (p.x >= w.x && p.x <= w.x + w.w && p.y >= w.y && p.y <= w.y + w.h) {
          this.createHitParticles(p.x, p.y, "#ffcc00");
          p.life = 0;
          break;
        }
      }
      if (p.life <= 0) this.projectiles.splice(i, 1);
    }

    // Update Enemies (FSM Agents)
    this.enemies.forEach(enemy => enemy.update(delta, this));

    // Update Pickups
    this.updatePickups(delta);

    // Floating text update
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 25 * delta;
      ft.life -= delta;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * delta;
      pt.y += pt.vy * delta;
      pt.life -= delta;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    this.updateHUD();
    this.updateECG();
  }

  updatePlayer(delta) {
    const p = this.player;
    p.aimAngle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);

    if (p.shootCooldown > 0) p.shootCooldown -= delta;
    if (!p.canTakeDamage) {
      p.invulnTimer -= delta;
      if (p.invulnTimer <= 0) p.canTakeDamage = true;
    }

    let dx = 0;
    let dy = 0;
    if (this.keys["w"] || this.keys["arrowup"]) dy -= 1;
    if (this.keys["s"] || this.keys["arrowdown"]) dy += 1;
    if (this.keys["a"] || this.keys["arrowleft"]) dx -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) dx += 1;

    p.isMoving = (dx !== 0 || dy !== 0);

    let currentSpeed = p.baseSpeed;
    if (p.isCrouching) {
      currentSpeed *= p.crouchMultiplier;
    } else if (p.isSprinting && p.isMoving && p.stamina > 5) {
      currentSpeed *= p.sprintMultiplier;
      p.stamina = Math.max(0, p.stamina - delta * 30);
    } else {
      p.isSprinting = false;
      p.stamina = Math.min(p.maxStamina, p.stamina + delta * 20);
    }

    if (p.isMoving) {
      const invLen = 1.0 / Math.hypot(dx, dy);
      dx *= invLen;
      dy *= invLen;
      p.walkAnimTime += delta * 12;

      // Spawn Footprint Decals
      p.decalTimer += delta;
      if (p.decalTimer > (p.isSprinting ? 0.2 : 0.35)) {
        p.decalTimer = 0;
        this.decals.push({
          x: p.x, y: p.y, angle: p.aimAngle, isTread: false, life: 3.5, maxLife: 3.5
        });
      }
    } else {
      p.walkAnimTime = 0;
    }

    p.vx = dx * currentSpeed;
    p.vy = dy * currentSpeed;
    p.x += p.vx * delta;
    p.y += p.vy * delta;

    this.resolveCollisions(p);
  }

  checkExtractionProtocol(delta) {
    // Unlock extraction if 3 cells collected OR survived > 60s
    if (!this.extractionReady && (this.energyCellsCollected >= 3 || this.survivalTime >= 60.0)) {
      this.extractionReady = true;
      this.addFloatingText("EXTRACTION PROTOCOL ACTIVE // EVAC ZONE OPEN", 640, 200, "#00e676");
      if (window.soundSystem) window.soundSystem.playAlert();
    }

    if (this.extractionReady) {
      const ez = this.extractionZone;
      const d = Math.hypot(this.player.x - ez.x, this.player.y - ez.y);
      if (d <= ez.radius) {
        ez.holdTimer += delta;
        this.addFloatingText(`EXTRACTING: ${Math.round((ez.holdTimer / ez.requiredHold) * 100)}%`, ez.x, ez.y - 30, "#00e676");
        if (ez.holdTimer >= ez.requiredHold) {
          this.triggerVictory();
        }
      } else {
        ez.holdTimer = Math.max(0, ez.holdTimer - delta * 2);
      }
    }
  }

  triggerVictory() {
    if (this.isVictory || this.isGameOver) return;
    this.isVictory = true;
    this.score += 5000; // Extraction bonus!
    if (window.soundSystem) window.soundSystem.playVictory();

    const modal = document.getElementById("victoryModal");
    if (modal) {
      modal.classList.remove("hidden");
      document.getElementById("victoryTime").textContent = this.formatTime(this.survivalTime);
      document.getElementById("victoryScore").textContent = Math.round(this.score).toString().padStart(6, "0");
    }
  }

  interactWithTerminal() {
    const term = this.securityTerminal;
    const d = Math.hypot(this.player.x - term.x, this.player.y - term.y);
    if (d <= term.radius + 20) {
      term.isAlarmActive = true;
      term.alarmTimer = 8.0;
      this.addFloatingText("FACILITY ALARM ACTIVATED // GUARDS DIVERTED", term.x, term.y - 30, "#ffd600");
      if (window.soundSystem) window.soundSystem.playAlarm();

      // Bait all sentinels to investigate the alarm
      this.enemies.forEach(enemy => {
        enemy.lastKnownPlayerPos = { x: term.x, y: term.y };
        enemy.searchTimeLeft = 6.0;
        enemy.changeState("SEARCH", "Alarm console breach detected", this);
      });
    }
  }

  toggleNVG() {
    this.nvgMode = !this.nvgMode;
    if (window.soundSystem) window.soundSystem.playNVG();
    const btn = document.getElementById("btnToggleNVG");
    if (btn) {
      btn.textContent = this.nvgMode ? "NVG: ACTIVE (N)" : "NVG: OFF (N)";
      btn.classList.toggle("active", this.nvgMode);
    }
  }

  broadcastPackAlert(callingEnemy, targetX, targetY) {
    // Coordinated radio pack calling
    this.enemies.forEach(ally => {
      if (ally !== callingEnemy && ally.state !== "ATTACK") {
        const d = Math.hypot(ally.x - callingEnemy.x, ally.y - callingEnemy.y);
        if (d <= 800) {
          // Calculate flanking vector
          const flankAngle = callingEnemy.facingAngle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
          ally.lastKnownPlayerPos = {
            x: targetX + Math.cos(flankAngle) * 90,
            y: targetY + Math.sin(flankAngle) * 90
          };
          ally.changeState("CHASE", `Radio call from ${callingEnemy.name} (Flanking)`, this);
          this.addFloatingText(`[PACK ALERT: ${ally.name} FLANKING]`, ally.x, ally.y - 25, "#ff9100");
        }
      }
    });
  }

  updatePickups(delta) {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const item = this.pickups[i];
      item.bobOffset += delta * 3;
      const dist = Math.hypot(p.x - item.x, p.y - item.y);
      if (dist < p.radius + item.radius) {
        if (item.type === "medkit" && p.health < p.maxHealth) {
          p.health = Math.min(p.maxHealth, p.health + 25);
          this.addFloatingText("+25 HP", p.x, p.y - 20, "#00e676");
          if (window.soundSystem) window.soundSystem.playPickup();
          this.pickups.splice(i, 1);
        } else if (item.type === "decoy" && p.decoysLeft < p.maxDecoys) {
          p.decoysLeft = Math.min(p.maxDecoys, p.decoysLeft + 1);
          this.addFloatingText("+1 DECOY", p.x, p.y - 20, "#00e5ff");
          if (window.soundSystem) window.soundSystem.playPickup();
          this.pickups.splice(i, 1);
        } else if (item.type === "energy") {
          this.energyCellsCollected++;
          this.score += 500;
          this.addFloatingText(`ENERGY CELL [${this.energyCellsCollected}/3]`, p.x, p.y - 20, "#ffd600");
          if (window.soundSystem) window.soundSystem.playPickup();
          this.pickups.splice(i, 1);
        }
      }
    }
  }

  shootDart() {
    const p = this.player;
    if (p.shootCooldown > 0 || this.isGameOver || this.isVictory) return;
    p.shootCooldown = 0.35;
    this.muzzleFlashTimer = 0.08; // Flash illuminator

    const angle = p.aimAngle;
    const speed = 520;
    this.projectiles.push({
      x: p.x + Math.cos(angle) * 22,
      y: p.y + Math.sin(angle) * 22,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.5
    });

    if (window.soundSystem) window.soundSystem.playShoot();
  }

  deployDecoy() {
    const p = this.player;
    if (p.decoysLeft <= 0 || this.isGameOver || this.isVictory) return;
    p.decoysLeft--;

    const decoy = { x: p.x, y: p.y, timer: 5.0, pingTimer: 0.1 };
    this.decoys.push(decoy);

    this.addFloatingText("ACOUSTIC DECOY DEPLOYED", p.x, p.y - 25, "#00e5ff");
    if (window.soundSystem) window.soundSystem.playDecoy();

    this.enemies.forEach(enemy => {
      const d = Math.hypot(enemy.x - decoy.x, enemy.y - decoy.y);
      if (d <= 380) {
        enemy.lastKnownPlayerPos = { x: decoy.x, y: decoy.y };
        enemy.searchTimeLeft = 3.5;
        enemy.changeState("SEARCH", `Acoustic decoy ping detected (${Math.round(d)}px)`, this);
      }
    });
  }

  damagePlayer(amount) {
    const p = this.player;
    if (!p.canTakeDamage || this.isGameOver || this.isVictory) return;

    p.health = Math.max(0, p.health - amount);
    p.canTakeDamage = false;
    p.invulnTimer = p.invulnDuration;
    this.screenShake = 14;

    if (window.soundSystem) window.soundSystem.playHurt();
    this.addFloatingText(`-${amount} HP`, p.x, p.y - 25, "#ff1744");
    this.createHitParticles(p.x, p.y, "#ff1744");

    if (p.health <= 0) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    if (this.isGameOver || this.isVictory) return;
    this.isGameOver = true;
    if (window.soundSystem) window.soundSystem.playGameOver();

    const modal = document.getElementById("gameOverModal");
    if (modal) {
      modal.classList.remove("hidden");
      document.getElementById("finalSurvivalTime").textContent = this.formatTime(this.survivalTime);
      document.getElementById("finalScore").textContent = Math.round(this.score).toString().padStart(6, "0");
    }
  }

  restartGame() {
    this.survivalTime = 0.0;
    this.score = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.extractionReady = false;
    this.energyCellsCollected = 0;
    this.securityTerminal.isAlarmActive = false;
    this.initPlayer();
    this.initEnemies();
    this.pickups = [];
    this.decoys = [];
    this.projectiles = [];
    this.decals = [];
    this.initArena();

    const goModal = document.getElementById("gameOverModal");
    if (goModal) goModal.classList.add("hidden");

    const vicModal = document.getElementById("victoryModal");
    if (vicModal) vicModal.classList.add("hidden");
  }

  resolveCollisions(entity) {
    const r = entity.radius;
    for (const w of this.walls) {
      const closestX = Math.max(w.x, Math.min(entity.x, w.x + w.w));
      const closestY = Math.max(w.y, Math.min(entity.y, w.y + w.h));
      const distX = entity.x - closestX;
      const distY = entity.y - closestY;
      const distanceSq = distX * distX + distY * distY;

      if (distanceSq < r * r) {
        const dist = Math.sqrt(distanceSq);
        if (dist === 0) {
          entity.x += r;
        } else {
          const overlap = r - dist;
          entity.x += (distX / dist) * overlap;
          entity.y += (distY / dist) * overlap;
        }
      }
    }
  }

  toggleTacticalOverlay() {
    this.debugDraw = !this.debugDraw;
  }

  formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    const ms = Math.floor((totalSec - Math.floor(totalSec)) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  }

  addFloatingText(text, x, y, color = "#ffffff") {
    this.floatingTexts.push({ text, x, y, color, life: 0.9 });
  }

  createHitParticles(x, y, color) {
    for (let i = 0; i < 9; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 90;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: 2 + Math.random() * 3,
        life: 0.35 + Math.random() * 0.2
      });
    }
  }

  createShockwave(x, y, color, maxRadius) {
    this.particles.push({
      x, y, vx: 0, vy: 0,
      isRing: true,
      currentRadius: 6,
      maxRadius,
      color,
      life: 0.5,
      maxLife: 0.5
    });
  }

  updateHUD() {
    const p = this.player;

    const timeEl = document.getElementById("hudSurvivalTimer");
    if (timeEl) timeEl.textContent = this.formatTime(this.survivalTime);

    const scoreEl = document.getElementById("hudScore");
    if (scoreEl) scoreEl.textContent = Math.round(this.score).toString().padStart(6, "0");

    const hpFill = document.getElementById("hudHpFill");
    const hpVal = document.getElementById("hudHpVal");
    if (hpFill) {
      const pct = Math.max(0, (p.health / p.maxHealth) * 100);
      hpFill.style.width = `${pct}%`;
      if (pct < 30) hpFill.style.backgroundColor = "#ff1744";
      else if (pct < 60) hpFill.style.backgroundColor = "#ff9100";
      else hpFill.style.backgroundColor = "#00e676";
    }
    if (hpVal) hpVal.textContent = `${p.health} / ${p.maxHealth}`;

    const stamFill = document.getElementById("hudStaminaFill");
    if (stamFill) {
      stamFill.style.width = `${(p.stamina / p.maxStamina) * 100}%`;
    }

    const decoyText = document.getElementById("hudDecoyCount");
    if (decoyText) {
      decoyText.textContent = `${p.decoysLeft} / ${p.maxDecoys}`;
    }

    // Threat level evaluation & adaptive tension audio
    let highestThreat = "PATROL";
    for (const e of this.enemies) {
      if (e.state === "ATTACK" || e.state === "CHASE") { highestThreat = "CHASE"; break; }
      if (e.state === "SEARCH") highestThreat = "SEARCH";
    }

    if (window.soundSystem) {
      window.soundSystem.setTension(highestThreat);
    }

    const tag = document.getElementById("hudThreatTag");
    const detail = document.getElementById("threatDetail");
    if (tag && detail) {
      if (highestThreat === "CHASE") {
        tag.className = "threat-tag threat-high";
        tag.textContent = "DEFCON 1 // COMBAT ENGAGED";
        detail.textContent = "Target in pursuit!";
      } else if (highestThreat === "SEARCH") {
        tag.className = "threat-tag threat-medium";
        tag.textContent = "DEFCON 3 // SUSPICION / SEARCH";
        detail.textContent = "Investigating acoustic signature";
      } else {
        tag.className = "threat-tag threat-low";
        tag.textContent = "DEFCON 5 // RECON";
        detail.textContent = "Perimeter clear; sentinels on patrol";
      }
    }

    // Noise meter update
    const db = Math.round(this.currentNoiseLevel);
    const dbLabel = document.getElementById("noiseDbLabel");
    if (dbLabel) {
      dbLabel.textContent = `${db} dB ${p.isCrouching ? "(STEALTH)" : db > 60 ? "(LOUD)" : db > 30 ? "(WALKING)" : "(QUIET)"}`;
    }

    const bars = document.querySelectorAll(".noise-bar-col");
    const activeCount = Math.min(10, Math.floor((this.currentNoiseLevel / 90) * 10));
    bars.forEach((b, idx) => {
      b.className = "noise-bar-col";
      if (idx < activeCount) {
        if (idx < 4) b.classList.add("active-low");
        else if (idx < 7) b.classList.add("active-med");
        else b.classList.add("active-high");
      }
    });

    // Extraction badge update
    const evacStatus = document.getElementById("hudEvacStatus");
    if (evacStatus) {
      if (this.extractionReady) {
        evacStatus.textContent = "EVAC: READY (ZONE OPEN)";
        evacStatus.style.color = "#00e676";
      } else {
        evacStatus.textContent = `CELLS: ${this.energyCellsCollected}/3 OR 60s`;
        evacStatus.style.color = "#657b9e";
      }
    }
  }

  updateECG() {
    if (!this.ecgCtx) return;
    const ctx = this.ecgCtx;
    const w = this.ecgCanvas.width;
    const h = this.ecgCanvas.height;

    const p = this.player;
    let targetBpm = 72;
    if (p.isSprinting) targetBpm += 45;
    if (p.health < 40) targetBpm += 40;
    const bpmVal = document.getElementById("bioBpmVal");
    if (bpmVal) bpmVal.textContent = `${Math.round(targetBpm)} BPM`;

    ctx.fillStyle = "rgba(10, 14, 20, 0.15)";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = p.health < 30 ? "#ff1744" : p.isSprinting ? "#ff9100" : "#00e676";
    ctx.lineWidth = 1.8;

    this.ecgX = (this.ecgX + 2.5) % w;
    const cycle = (this.ecgX % 70);
    let y = h / 2;
    if (cycle > 25 && cycle < 30) y -= 10;
    else if (cycle >= 30 && cycle < 35) y += 8;
    else if (cycle >= 35 && cycle < 38) y -= 4;

    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(this.ecgX, y - 1, 2, 2);
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.screenShake > 0) {
      const ox = (Math.random() - 0.5) * this.screenShake;
      const oy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(ox, oy);
    }

    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Metal Floor
    if (this.floorPattern) {
      ctx.fillStyle = this.floorPattern;
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = "#0c1017";
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Render Decals (Footprints & Tread Marks)
    this.renderDecals(ctx);

    // 3. Render Extraction Zone (If active)
    if (this.extractionReady) {
      this.renderExtractionZone(ctx);
    }

    // 4. Render Security Console Terminal
    this.renderSecurityTerminal(ctx);

    // 5. Render Obstacles
    for (const w of this.walls) {
      if (w.isOuter) {
        ctx.fillStyle = "#161d2a";
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "#ffab00";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      } else if (w.type === "container_v") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(w.x + 8, w.y + 10, w.w, w.h);
        if (this.containerImg.complete && this.containerImg.naturalWidth > 0) {
          ctx.save();
          ctx.translate(w.x + w.w / 2, w.y + w.h / 2);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(this.containerImg, -w.h / 2, -w.w / 2, w.h, w.w);
          ctx.restore();
        }
      } else if (w.type === "container_h") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(w.x + 8, w.y + 10, w.w, w.h);
        if (this.containerImg.complete && this.containerImg.naturalWidth > 0) {
          ctx.drawImage(this.containerImg, w.x, w.y, w.w, w.h);
        }
      } else if (w.type === "generator") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(w.x + 6, w.y + 8, w.w, w.h);
        if (this.generatorImg.complete && this.generatorImg.naturalWidth > 0) {
          ctx.drawImage(this.generatorImg, w.x, w.y, w.w, w.h);
        }
      }
    }

    // 6. Render Pickups & Decoys
    for (const item of this.pickups) this.renderPickup(ctx, item);
    for (const d of this.decoys) this.renderDecoy(ctx, d);

    // 7. Render Enemies
    this.enemies.forEach(enemy => enemy.render(ctx, this.debugDraw, this.enemyImg));

    // 8. Render Player & Tactical Laser Sight
    this.renderLaserSight(ctx);
    this.renderPlayer(ctx);

    // 9. Render Projectiles
    ctx.fillStyle = "#00e5ff";
    for (const p of this.projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 10. Render Particles
    for (const pt of this.particles) {
      if (pt.isRing) {
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 2 * (pt.life / pt.maxLife);
        ctx.beginPath();
        const r = pt.maxRadius * (1 - pt.life / pt.maxLife);
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 11. Volumetric Lighting & Atmospheric Shadows (With NVG & Muzzle Flash!)
    this.renderAtmosphericLighting(ctx);

    // 12. Floating Texts
    for (const ft of this.floatingTexts) {
      ctx.font = "bold 13px 'Share Tech Mono', monospace";
      ctx.fillStyle = ft.color;
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    ctx.restore();
  }

  renderLaserSight(ctx) {
    const p = this.player;
    ctx.save();
    ctx.strokeStyle = "rgba(0, 229, 255, 0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);

    const targetX = this.mouse.x;
    const targetY = this.mouse.y;

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing laser dot
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderDecals(ctx) {
    for (const d of this.decals) {
      const alpha = (d.life / d.maxLife) * 0.35;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      if (d.isTread) {
        ctx.fillStyle = `rgba(18, 24, 34, ${alpha * 1.5})`;
        ctx.fillRect(-10, -6, 20, 4);
        ctx.fillRect(-10, 2, 20, 4);
      } else {
        // Boot footprint
        ctx.fillStyle = `rgba(40, 60, 80, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  renderExtractionZone(ctx) {
    const ez = this.extractionZone;
    const time = performance.now() / 1000;
    ctx.save();
    ctx.translate(ez.x, ez.y);

    // Pulsing green extraction ring
    ctx.strokeStyle = `rgba(0, 230, 118, ${0.4 + 0.3 * Math.sin(time * 4)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ez.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating radar hatch arms
    ctx.rotate(time * 1.5);
    ctx.strokeStyle = "#00e676";
    ctx.lineWidth = 2;
    for (let a = 0; a < 4; a++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(ez.radius - 4, 0);
      ctx.stroke();
    }
    ctx.restore();

    ctx.font = "bold 11px 'Share Tech Mono', monospace";
    ctx.fillStyle = "#00e676";
    ctx.textAlign = "center";
    ctx.fillText("EVAC ZONE [HOLD]", ez.x, ez.y - ez.radius - 8);
  }

  renderSecurityTerminal(ctx) {
    const st = this.securityTerminal;
    ctx.save();
    ctx.translate(st.x, st.y);

    // Console box
    ctx.fillStyle = "#1e2838";
    ctx.strokeStyle = st.isAlarmActive ? "#ff1744" : "#ffd600";
    ctx.lineWidth = 2;
    ctx.fillRect(-14, -14, 28, 28);
    ctx.strokeRect(-14, -14, 28, 28);

    // Screen icon
    ctx.fillStyle = st.isAlarmActive ? "#ff1744" : "#00e5ff";
    ctx.fillRect(-8, -8, 16, 16);

    ctx.restore();

    const d = Math.hypot(this.player.x - st.x, this.player.y - st.y);
    if (d <= st.radius + 20) {
      ctx.font = "bold 11px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#ffd600";
      ctx.textAlign = "center";
      ctx.fillText("[E] TRIGGER FACILITY ALARM", st.x, st.y - 22);
    }
  }

  renderAtmosphericLighting(ctx) {
    const lCtx = this.lightCtx;
    const w = this.width;
    const h = this.height;

    lCtx.clearRect(0, 0, w, h);

    if (this.nvgMode) {
      // Night Vision Mode: Military Green Phosphor Wash
      lCtx.fillStyle = "rgba(6, 32, 14, 0.45)";
      lCtx.fillRect(0, 0, w, h);
    } else {
      // Realistic Moody Dark Warehouse Ambient
      lCtx.fillStyle = "rgba(4, 7, 12, 0.74)";
      lCtx.fillRect(0, 0, w, h);
    }

    lCtx.globalCompositeOperation = "destination-out";

    // Muzzle Flash
    if (this.muzzleFlashTimer > 0) {
      const p = this.player;
      const flashGrad = lCtx.createRadialGradient(p.x, p.y, 20, p.x, p.y, 450);
      flashGrad.addColorStop(0, "rgba(0, 0, 0, 1.0)");
      flashGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");
      lCtx.fillStyle = flashGrad;
      lCtx.beginPath();
      lCtx.arc(p.x, p.y, 450, 0, Math.PI * 2);
      lCtx.fill();
    }

    // Player Flashlight
    const p = this.player;
    if (this.flashlightOn) {
      const coneAngle = Math.PI / 4.2;
      const beamLength = 340;
      
      const grad = lCtx.createRadialGradient(p.x, p.y, 10, p.x, p.y, beamLength);
      grad.addColorStop(0, "rgba(0, 0, 0, 1.0)");
      grad.addColorStop(0.7, "rgba(0, 0, 0, 0.85)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0.0)");

      lCtx.fillStyle = grad;
      lCtx.beginPath();
      lCtx.moveTo(p.x, p.y);
      lCtx.arc(p.x, p.y, beamLength, p.aimAngle - coneAngle / 2, p.aimAngle + coneAngle / 2);
      lCtx.closePath();
      lCtx.fill();

      const pGlow = lCtx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 55);
      pGlow.addColorStop(0, "rgba(0, 0, 0, 0.9)");
      pGlow.addColorStop(1, "rgba(0, 0, 0, 0.0)");
      lCtx.fillStyle = pGlow;
      lCtx.beginPath();
      lCtx.arc(p.x, p.y, 55, 0, Math.PI * 2);
      lCtx.fill();
    }

    // Sentinel Headlights & Searchlights
    for (const e of this.enemies) {
      const eBeamLen = e.state === "CHASE" ? 290 : e.state === "SEARCH" ? 230 : 180;
      const eCone = e.state === "SEARCH" ? Math.PI / 2.4 : Math.PI / 4.5;
      
      const eGrad = lCtx.createRadialGradient(e.x, e.y, 8, e.x, e.y, eBeamLen);
      eGrad.addColorStop(0, "rgba(0, 0, 0, 0.95)");
      eGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");

      lCtx.fillStyle = eGrad;
      lCtx.beginPath();
      lCtx.moveTo(e.x, e.y);
      lCtx.arc(e.x, e.y, eBeamLen, e.facingAngle - eCone / 2, e.facingAngle + eCone / 2);
      lCtx.closePath();
      lCtx.fill();
    }

    lCtx.globalCompositeOperation = "source-over";
    ctx.drawImage(this.lightCanvas, 0, 0);

    // Dust particles inside beam
    ctx.fillStyle = this.nvgMode ? "rgba(100, 255, 120, 0.3)" : "rgba(220, 240, 255, 0.25)";
    for (const d of this.dustParticles) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderPlayer(ctx) {
    const p = this.player;

    if (!p.canTakeDamage && Math.sin(p.invulnTimer * 40) > 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 6, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.aimAngle + Math.PI / 2);

    if (this.playerImg.complete && this.playerImg.naturalWidth > 0) {
      const renderSize = p.isCrouching ? 40 : 48; // slightly smaller profile when crouched
      const bob = p.isMoving ? Math.sin(p.walkAnimTime) * 2 : 0;
      ctx.drawImage(this.playerImg, -renderSize / 2, -renderSize / 2 + bob, renderSize, renderSize);
    } else {
      ctx.fillStyle = "#0091ea";
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.globalAlpha = 1.0;
  }

  renderPickup(ctx, item) {
    const bob = Math.sin(item.bobOffset) * 3;
    ctx.save();
    ctx.translate(item.x, item.y + bob);

    if (item.type === "medkit") {
      ctx.fillStyle = "rgba(0, 230, 118, 0.35)";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-10, -7, 20, 14);
      ctx.fillStyle = "#00c853";
      ctx.fillRect(-3, -5, 6, 10);
      ctx.fillRect(-5, -3, 10, 6);
    } else if (item.type === "decoy") {
      ctx.fillStyle = "rgba(0, 229, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#00e5ff";
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(8, 6);
      ctx.lineTo(-8, 6);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255, 214, 0, 0.35)";
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd600";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderDecoy(ctx, d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.fillStyle = "#263238";
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = "#00e5ff";
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Enemy Sentinel Agent with Coordinated Flanking Pack AI & Expanding Search Sweep
class EnemySentinel {
  constructor(name, x, y, patrolWaypoints, patrolSpeed = 95, chaseSpeed = 140, detectionRange = 260, attackRange = 42) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 20;

    this.homePos = { x, y };
    this.patrolWaypoints = patrolWaypoints;
    this.currentWaypointIdx = 0;

    this.patrolSpeed = patrolSpeed;
    this.chaseSpeed = chaseSpeed;
    this.detectionRange = detectionRange;
    this.attackRange = attackRange;
    this.searchDuration = 3.0;
    this.attackCooldown = 1.0;
    this.damage = 15;

    this.state = "PATROL";
    this.lastKnownPlayerPos = { x, y };
    this.searchTimeLeft = 0.0;
    this.attackTimeLeft = 0.0;
    this.searchSweepAngle = 0.0;
    this.facingAngle = 0.0;
    this.treadTimer = 0.0;
  }

  update(delta, game) {
    this.attackTimeLeft = Math.max(0, this.attackTimeLeft - delta);

    const player = game.player;
    const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
    const hasSight = this.hasLineOfSight(player.x, player.y, game.walls);

    // Perception: Direct Vision Cone OR Sound Hearing
    const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
    let diffAngle = Math.abs(this.facingAngle - angleToPlayer);
    if (diffAngle > Math.PI) diffAngle = 2 * Math.PI - diffAngle;

    const inVisionCone = (diffAngle < Math.PI / 2.8) || (distToPlayer < 70); // 130 deg front vision or immediate proximity
    const inAudioRange = (distToPlayer < game.currentNoiseLevel * 3.5); // Loud noises heard through walls/angles

    const inDetection = (distToPlayer <= this.detectionRange && hasSight && (inVisionCone || inAudioRange));
    const inAttack = (distToPlayer <= this.attackRange);

    switch (this.state) {
      case "PATROL":
        if (inDetection) {
          this.lastKnownPlayerPos = { x: player.x, y: player.y };
          this.changeState("CHASE", "Target visual acquired", game);
          // Broadcast Pack Alert to ally sentinels!
          game.broadcastPackAlert(this, player.x, player.y);
        }
        break;

      case "CHASE":
        if (inDetection) {
          this.lastKnownPlayerPos = { x: player.x, y: player.y };
          if (inAttack) {
            this.changeState("ATTACK", "Target within strike radius", game);
          }
        } else {
          this.searchTimeLeft = this.searchDuration;
          this.changeState("SEARCH", "Line-of-sight broken; investigating coordinates", game);
        }
        break;

      case "SEARCH":
        if (inDetection) {
          this.lastKnownPlayerPos = { x: player.x, y: player.y };
          this.changeState("CHASE", "Visual re-engaged during radar sweep", game);
          game.broadcastPackAlert(this, player.x, player.y);
        } else {
          this.searchTimeLeft -= delta;
          if (this.searchTimeLeft <= 0) {
            this.changeState("RETURN", "Search cycle complete; returning to perimeter", game);
          }
        }
        break;

      case "RETURN":
        if (inDetection) {
          this.lastKnownPlayerPos = { x: player.x, y: player.y };
          this.changeState("CHASE", "Target re-acquired on transit", game);
          game.broadcastPackAlert(this, player.x, player.y);
        } else {
          const distHome = Math.hypot(this.x - this.homePos.x, this.y - this.homePos.y);
          if (distHome < 18) {
            this.changeState("PATROL", "Base anchor reached; resuming route", game);
          }
        }
        break;

      case "ATTACK":
        if (!inAttack) {
          if (inDetection) {
            this.changeState("CHASE", "Target broke melee radius", game);
          } else {
            this.searchTimeLeft = this.searchDuration;
            this.changeState("SEARCH", "Target fled outside vision zone", game);
          }
        }
        break;
    }

    switch (this.state) {
      case "PATROL":
        this.stepPatrol(delta);
        break;
      case "CHASE":
        this.moveToward(player.x, player.y, this.chaseSpeed, delta);
        break;
      case "SEARCH":
        this.stepSearch(delta);
        break;
      case "RETURN":
        this.moveToward(this.homePos.x, this.homePos.y, this.patrolSpeed, delta);
        break;
      case "ATTACK":
        this.vx = 0;
        this.vy = 0;
        this.facingAngle = Math.atan2(player.y - this.y, player.x - this.x);
        if (this.attackTimeLeft <= 0) {
          this.performAttack(game);
        }
        break;
    }

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    // Tread Mark Decals
    if (this.vx !== 0 || this.vy !== 0) {
      this.treadTimer += delta;
      if (this.treadTimer > 0.18) {
        this.treadTimer = 0;
        game.decals.push({
          x: this.x, y: this.y, angle: this.facingAngle, isTread: true, life: 4.5, maxLife: 4.5
        });
      }
    }

    game.resolveCollisions(this);
  }

  changeState(newState, reason, game) {
    if (this.state === newState) return;
    this.state = newState;

    if (newState === "CHASE" && window.soundSystem) {
      window.soundSystem.playAlert();
    } else if (newState === "SEARCH" && window.soundSystem) {
      window.soundSystem.playSearchLost();
    }
  }

  stepPatrol(delta) {
    if (!this.patrolWaypoints.length) return;
    const wp = this.patrolWaypoints[this.currentWaypointIdx];
    const dist = Math.hypot(this.x - wp.x, this.y - wp.y);

    if (dist < 18) {
      this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.patrolWaypoints.length;
    }
    const nextWp = this.patrolWaypoints[this.currentWaypointIdx];
    this.moveToward(nextWp.x, nextWp.y, this.patrolSpeed, delta);
  }

  stepSearch(delta) {
    const dist = Math.hypot(this.x - this.lastKnownPlayerPos.x, this.y - this.lastKnownPlayerPos.y);
    if (dist > 24) {
      this.moveToward(this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y, this.patrolSpeed * 0.95, delta);
    } else {
      // Reached coordinate: execute expanding search sweep
      this.vx = 0;
      this.vy = 0;
      this.searchSweepAngle += 3.8 * delta;
      this.facingAngle = this.searchSweepAngle;
    }
  }

  moveToward(tx, ty, speed, delta) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
      this.facingAngle = Math.atan2(dy, dx);
    } else {
      this.vx = 0;
      this.vy = 0;
    }
  }

  performAttack(game) {
    this.attackTimeLeft = this.attackCooldown;
    if (window.soundSystem) window.soundSystem.playAttack();
    game.damagePlayer(this.damage);
  }

  hasLineOfSight(tx, ty, walls) {
    const x1 = this.x, y1 = this.y;
    const x2 = tx, y2 = ty;

    for (const w of walls) {
      if (w.isOuter) continue;
      if (this.lineIntersectsRect(x1, y1, x2, y2, w)) {
        return false;
      }
    }
    return true;
  }

  lineIntersectsRect(x1, y1, x2, y2, rect) {
    const rx1 = rect.x, ry1 = rect.y;
    const rx2 = rect.x + rect.w, ry2 = rect.y + rect.h;

    return this.lineIntersectsLine(x1, y1, x2, y2, rx1, ry1, rx2, ry1) ||
           this.lineIntersectsLine(x1, y1, x2, y2, rx2, ry1, rx2, ry2) ||
           this.lineIntersectsLine(x1, y1, x2, y2, rx2, ry2, rx1, ry2) ||
           this.lineIntersectsLine(x1, y1, x2, y2, rx1, ry2, rx1, ry1);
  }

  lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  render(ctx, debugDraw, enemyImg) {
    const stateColors = {
      PATROL: "#00e5ff",
      CHASE: "#ff9100",
      SEARCH: "#ffd600",
      RETURN: "#d500f9",
      ATTACK: "#ff1744"
    };
    const mainColor = stateColors[this.state] || "#ff1744";

    if (debugDraw) {
      ctx.strokeStyle = this.state === "CHASE" ? "rgba(255, 145, 0, 0.4)" : "rgba(0, 229, 255, 0.2)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.detectionRange, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 23, 68, 0.5)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.attackRange, 0, Math.PI * 2);
      ctx.stroke();

      if (this.state === "SEARCH") {
        ctx.strokeStyle = "rgba(255, 214, 0, 0.6)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(255, 214, 0, 0.25)";
        ctx.strokeStyle = "#ffd600";
        ctx.beginPath();
        ctx.arc(this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 6, 24, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facingAngle + Math.PI / 2);

    if (enemyImg.complete && enemyImg.naturalWidth > 0) {
      const renderSize = 56;
      ctx.drawImage(enemyImg, -renderSize / 2, -renderSize / 2, renderSize, renderSize);

      ctx.fillStyle = mainColor;
      ctx.shadowColor = mainColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, -renderSize * 0.16, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "#263238";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.save();
    ctx.font = "bold 10px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    
    const stateText = `${this.name}: ${this.state}`;
    const textWidth = ctx.measureText(stateText).width + 12;
    ctx.fillStyle = "rgba(6, 9, 14, 0.9)";
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(this.x - textWidth / 2, this.y - 36, textWidth, 17, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = mainColor;
    ctx.fillText(stateText, this.x, this.y - 24);
    ctx.restore();
  }
}

window.Game = Game;
