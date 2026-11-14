(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const ui = {
    intro: $("introScreen"), missions: $("missionScreen"), result: $("resultScreen"), start: $("startButton"),
    missionStart: $("missionStartButton"), missionBack: $("missionBack"),
    missionCards: Array.from(document.querySelectorAll(".mission-card")),
    missionProgress: $("missionProgress"), nextMission: $("nextMissionButton"),
    rematch: $("rematchButton"), menu: $("menuButton"), timer: $("timer"),
    playerHealth: $("playerHealth"), playerEnergy: $("playerEnergy"),
    enemyHealth: $("enemyHealth"), enemyEnergy: $("enemyEnergy"),
    playerName: $("playerName"), enemyName: $("enemyName"), enemyGrade: $("enemyGrade"),
    stageLabel: $("missionStageLabel"),
    hint: $("combatHint"), callout: $("fightCallout"),
    resultTitle: $("resultTitle"), resultMessage: $("resultMessage"),
    resultEyebrow: $("resultEyebrow")
  };

  const WIDTH = 1200;
  const HEIGHT = 675;
  const FLOOR = 552;
  const GRAVITY = 1700;
  const characters = {
    yuji: {
      name: "YUJI ITADORI", hair: "#ed9aaa", outfit: "#242538",
      accent: "#ff7598", trim: "#f0d3de", speed: 1,
      technique: "DIVERGENT FIST", glyph: "虎",
      special: { duration: .58, active: [.15, .4], damage: 30, range: 180, cost: 32, label: "DIVERGENT FIST" }
    },
    gojo: {
      name: "SATORU GOJO", hair: "#dcecff", outfit: "#111c31",
      accent: "#79dfff", trim: "#b3d5f5", speed: .96,
      technique: "LIMITLESS", glyph: "六",
      special: { duration: .72, active: [.2, .53], damage: 24, range: 390, cost: 42, label: "LIMITLESS" }
    },
    megumi: {
      name: "MEGUMI FUSHIGURO", hair: "#172033", outfit: "#1a263d",
      accent: "#879bff", trim: "#b1c2ff", speed: 1.04,
      technique: "SHADOW STYLE", glyph: "影",
      special: { duration: .7, active: [.19, .5], damage: 28, range: 260, cost: 36, label: "SHADOW STYLE" }
    },
    nobara: {
      name: "NOBARA KUGISAKI", hair: "#b66b43", outfit: "#34293a",
      accent: "#ffb16d", trim: "#f3c9a1", speed: 1.02,
      technique: "RESONANCE", glyph: "釘",
      special: { duration: .66, active: [.18, .48], damage: 23, range: 350, cost: 34, label: "RESONANCE" }
    }
  };

  const missions = [
    {
      title: "JUJUTSU HIGH", location: "TRAINING GROUNDS", opponent: "CURSED WRAITH",
      grade: "CURSE / GRADE 2", description: "A controlled trial against a wandering cursed spirit.",
      enemyHealth: 100, enemySpeed: .88, enemyDamage: 1,
      scene: { top: "#111020", mid: "#25203b", bottom: "#100e18", haze: "rgba(145,91,206,.24)", buildings: "#171424", floor: "rgba(101,70,143,.18)", grid: "rgba(180,147,236,.16)" },
      config: { name: "CURSED WRAITH", hair: "#b9a0dc", outfit: "#191326", accent: "#c080ff", trim: "#f0ccff", speed: .88, technique: "VOID HOWL", glyph: "呪", special: { duration: .7, active: [.2,.48], damage: 22, range: 300, cost: 38, label: "VOID HOWL" } }
    },
    {
      title: "CURSED WOMB", location: "DETENTION CENTER", opponent: "CURSED WOMB",
      grade: "CURSE / SPECIAL GRADE", description: "A veil descends over an abandoned detention center. The curse is stronger this time.",
      enemyHealth: 128, enemySpeed: .98, enemyDamage: 1.12,
      scene: { top: "#180c18", mid: "#3a182b", bottom: "#100b14", haze: "rgba(255,74,130,.18)", buildings: "#21101f", floor: "rgba(145,38,78,.2)", grid: "rgba(255,120,165,.14)" },
      config: { name: "CURSED WOMB", hair: "#79314e", outfit: "#281321", accent: "#ff648d", trim: "#ffc2d3", speed: .98, technique: "WOMB PULSE", glyph: "胎", special: { duration: .72, active: [.2,.5], damage: 25, range: 305, cost: 38, label: "WOMB PULSE" } }
    },
    {
      title: "GETO'S PLAN", location: "NIGHT PARADE / TOKYO", opponent: "CURSE MANIPULATOR",
      grade: "BOSS / SPECIAL GRADE", description: "The Night Parade begins. Face the final opponent in this first story route.",
      enemyHealth: 160, enemySpeed: 1.08, enemyDamage: 1.22,
      scene: { top: "#07131f", mid: "#122d46", bottom: "#080d18", haze: "rgba(60,168,255,.2)", buildings: "#0b1c2e", floor: "rgba(38,108,162,.2)", grid: "rgba(105,190,255,.16)" },
      config: { name: "CURSE MANIPULATOR", hair: "#253759", outfit: "#111b31", accent: "#70c4ff", trim: "#c4ebff", speed: 1.08, technique: "CURSE SWARM", glyph: "操", special: { duration: .78, active: [.22,.56], damage: 30, range: 340, cost: 42, label: "CURSE SWARM" } }
    }
  ];

  let unlockedMission = 1;
  try {
    const savedProgress = Number(localStorage.getItem("jjk-cursed-arena-progress"));
    if (Number.isFinite(savedProgress) && savedProgress >= 1) unlockedMission = Math.min(missions.length + 1, Math.floor(savedProgress));
  } catch {}
  let selectedMission = 0;
  let missionIndex = 0;
  let selectedCharacter = "yuji";
  let mode = "intro";
  let player;
  let enemy;
  let roundTime = 90;
  let lastTime = 0;
  let elapsed = 0;
  let shake = 0;
  let particles = [];
  let texts = [];
  let queued = new Set();
  const held = { left: false, right: false, jump: false, guard: false };
  const keys = {
    a: "left", d: "right", w: "jump", s: "guard",
    ArrowLeft: "left", ArrowRight: "right", ArrowUp: "jump", ArrowDown: "guard"
  };

  const stars = Array.from({ length: 65 }, (_, i) => ({
    x: (i * 197 + 31) % WIDTH,
    y: (i * 83 + 19) % 330,
    r: .5 + (i % 4) * .35,
    a: .2 + (i % 5) * .1
  }));
  const skyline = Array.from({ length: 22 }, (_, i) => ({
    x: i * 62 - 10,
    w: 36 + (i % 4) * 9,
    h: 95 + (i * 47 % 150)
  }));

  function makeFighter(x, isEnemy, characterKey) {
    const config = characters[characterKey] || characters.yuji;
    return {
      x, y: FLOOR, vx: 0, vy: 0, facing: isEnemy ? -1 : 1,
      health: 100, maxHealth: 100, energy: 100, damageMultiplier: 1, isEnemy, characterKey, config,
      attack: null, attackCooldown: .2, stun: 0, dashTime: 0,
      dashCooldown: 0, blocking: false, grounded: true,
      hitFlash: 0, defeated: false, aiWait: .3
    };
  }

  function makeEnemy(mission) {
    const fighter = makeFighter(855, true, "curse");
    fighter.config = mission.config;
    fighter.health = mission.enemyHealth;
    fighter.maxHealth = mission.enemyHealth;
    fighter.damageMultiplier = mission.enemyDamage;
    return fighter;
  }

  function updateMissionMenu() {
    ui.missionCards.forEach((card) => {
      const index = Number(card.dataset.mission);
      const available = index < unlockedMission;
      card.disabled = !available;
      card.classList.toggle("selected", index === selectedMission);
      const status = card.querySelector(".mission-lock");
      status.textContent = available ? (index < unlockedMission - 1 ? "CLEARED · REPLAY" : "AVAILABLE") : "LOCKED";
    });
    ui.missionProgress.textContent = `MISSIONS CLEARED ${Math.min(missions.length, unlockedMission - 1)} / 03`;
    ui.missionStart.disabled = selectedMission >= unlockedMission;
    ui.missionStart.style.opacity = ui.missionStart.disabled ? ".45" : "1";
  }

  function openMissions() {
    mode = "missions";
    ui.intro.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.missions.classList.remove("hidden");
    updateMissionMenu();
  }

  function startMission(index) {
    if (!Number.isInteger(index) || index < 0 || index >= missions.length || index >= unlockedMission) return;
    missionIndex = index;
    selectedMission = index;
    resetMatch();
    mode = "fight";
    ui.intro.classList.add("hidden");
    ui.missions.classList.add("hidden");
    ui.result.classList.add("hidden");
    announce("FIGHT!");
  }

  function resetMatch() {
    const mission = missions[missionIndex];
    player = makeFighter(345, false, selectedCharacter);
    enemy = makeEnemy(mission);
    roundTime = 90;
    particles = [];
    texts = [];
    shake = 0;
    ui.playerName.textContent = player.config.name;
    ui.enemyName.textContent = mission.opponent;
    ui.enemyGrade.textContent = mission.grade;
    ui.stageLabel.textContent = `MISSION 0${missionIndex + 1} / 03`;
    ui.playerHealth.style.width = "100%";
    ui.playerEnergy.style.width = "100%";
    ui.enemyHealth.style.width = "100%";
    ui.enemyEnergy.style.width = "100%";
    ui.timer.textContent = "90";
    ui.hint.textContent = mission.location + " · " + mission.description.toUpperCase();
  }

  function announce(message) {
    ui.callout.textContent = message;
    ui.callout.classList.remove("show");
    void ui.callout.offsetWidth;
    ui.callout.classList.add("show");
  }

  function startMatch() {
    startMission(missionIndex);
  }

  function finishMatch(won, timedOut = false) {
    if (mode !== "fight") return;
    mode = "result";
    if (won) {
      unlockedMission = Math.max(unlockedMission, Math.min(missions.length + 1, missionIndex + 2));
      try { localStorage.setItem("jjk-cursed-arena-progress", String(unlockedMission)); } catch {}
    }
    const hasNext = won && missionIndex < missions.length - 1;
    ui.result.classList.remove("hidden");
    ui.resultEyebrow.textContent = timedOut ? "TIME EXPIRED" : "STORY RESULT";
    ui.resultTitle.textContent = won && !hasNext ? "ROUTE CLEARED" : won ? "VICTORY" : "DEFEAT";
    ui.resultTitle.style.color = won ? "#d8c7ff" : "#ff9aad";
    ui.resultMessage.textContent = won
      ? (hasNext ? `${missions[missionIndex].title} cleared. The next chapter is now unlocked.` : "All three missions are complete. The first story route is cleared.")
      : "The curse overwhelmed you. Regroup and retry this mission.";
    ui.nextMission.classList.toggle("hidden", !hasNext);
    announce(won ? (hasNext ? "CHAPTER CLEAR" : "ROUTE CLEARED") : "CURSED");
  }

  function spawnBurst(x, y, color, count = 15, power = 240) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * power;
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: .28 + Math.random() * .45, maxLife: .73,
        size: 2 + Math.random() * 5, color
      });
    }
  }

  function popText(x, y, message, color) {
    texts.push({ x, y, message, color, life: .7, maxLife: .7 });
  }

  function startAttack(fighter, kind) {
    if (mode !== "fight" || fighter.attack || fighter.attackCooldown > 0 || fighter.stun > 0) return;
    const specs = {
      light: { duration: .32, active: [.09, .23], damage: 8, range: 126, cost: 0, label: "STRIKE" },
      heavy: { duration: .5, active: [.15, .34], damage: 16, range: 150, cost: 0, label: "BREAK" },
      special: { duration: .7, active: [.2, .48], damage: 25, range: 310, cost: 38, label: fighter.config.technique }
    };
    let spec = specs[kind];
    if (kind === "special" && fighter.config.special) spec = { ...spec, ...fighter.config.special };
    if (!spec || fighter.energy < spec.cost) {
      if (kind === "special") {
        ui.hint.textContent = "NOT ENOUGH CURSED ENERGY.";
        popText(fighter.x, fighter.y - 150, "ENERGY LOW", "#91ddff");
      }
      return;
    }
    fighter.energy -= spec.cost;
    fighter.attack = { kind, time: 0, hit: false, ...spec };
    fighter.attackCooldown = kind === "light" ? .28 : kind === "heavy" ? .48 : .9;
    fighter.blocking = false;
    if (kind === "special") {
      spawnBurst(fighter.x + fighter.facing * 42, fighter.y - 104, fighter.config.accent, 30, 310);
      ui.hint.textContent = fighter.config.technique + "!";
    }
  }

  function applyHit(attacker, target, attack) {
    if (attack.hit || !attacker.attack) return;
    const dx = target.x - attacker.x;
    if (dx * attacker.facing < 0 || Math.abs(dx) > attack.range || Math.abs(target.y - attacker.y) > 115) return;
    attack.hit = true;
    const guarding = target.blocking && target.grounded;
    const baseDamage = Math.round(attack.damage * (attacker.damageMultiplier || 1));
    const damage = guarding ? Math.max(2, Math.round(baseDamage * .22)) : baseDamage;
    target.health = Math.max(0, target.health - damage);
    target.hitFlash = .15;
    target.stun = guarding ? .08 : attack.kind === "heavy" || attack.kind === "special" ? .3 : .18;
    target.vx = attacker.facing * (guarding ? 95 : attack.kind === "special" ? 420 : attack.kind === "heavy" ? 300 : 190);
    if (!guarding) target.vy = attack.kind === "special" ? -175 : -85;
    attacker.energy = Math.min(100, attacker.energy + (guarding ? 3 : 9));
    spawnBurst(target.x, target.y - 95, guarding ? "#a6dcff" : attacker.config.accent, guarding ? 7 : 18, guarding ? 140 : 250);
    popText(target.x, target.y - 145, guarding ? "GUARD" : String(damage), guarding ? "#a9e7ff" : "#ffe6f4");
    shake = guarding ? .08 : .18;
    ui.hint.textContent = guarding ? "IMPACT BLOCKED." : attack.kind === "special" ? "CURSED TECHNIQUE CONNECTED!" : "CLEAN HIT!";
    if (target.health <= 0) {
      target.defeated = true;
      if (target === enemy) finishMatch(true);
      else finishMatch(false);
    }
  }

  function updateFighterPhysics(fighter, dt) {
    if (fighter.stun > 0) fighter.stun = Math.max(0, fighter.stun - dt);
    if (fighter.attackCooldown > 0) fighter.attackCooldown -= dt;
    if (fighter.dashCooldown > 0) fighter.dashCooldown -= dt;
    if (fighter.hitFlash > 0) fighter.hitFlash -= dt;
    if (fighter.dashTime > 0) fighter.dashTime -= dt;

    fighter.vy += GRAVITY * dt;
    fighter.x += fighter.vx * dt;
    fighter.y += fighter.vy * dt;
    if (fighter.y >= FLOOR) {
      fighter.y = FLOOR;
      fighter.vy = 0;
      fighter.grounded = true;
    } else {
      fighter.grounded = false;
    }
    fighter.x = Math.max(72, Math.min(WIDTH - 72, fighter.x));
    if (fighter.dashTime <= 0 && fighter.stun <= 0) fighter.vx *= Math.pow(fighter.grounded ? .001 : .13, dt);
    if (fighter.attack) {
      fighter.attack.time += dt;
      const attack = fighter.attack;
      if (!attack.hit && attack.time >= attack.active[0] && attack.time <= attack.active[1]) {
        applyHit(fighter, fighter === player ? enemy : player, attack);
      }
      if (attack.time >= attack.duration) fighter.attack = null;
    }
    if (!fighter.isEnemy) fighter.energy = Math.min(100, fighter.energy + dt * 1.5);
    else fighter.energy = Math.min(100, fighter.energy + dt * 1.1);
  }

  function updatePlayer() {
    if (player.stun <= 0) {
      const direction = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      if (direction && !player.attack && player.dashTime <= 0) {
        player.vx = direction * 285 * player.config.speed;
        player.facing = direction;
      } else if (!direction && player.dashTime <= 0 && player.grounded) {
        player.vx *= .8;
      }
      player.blocking = held.guard && player.grounded && !player.attack;
      if (held.jump && player.grounded && !player.blocking) {
        player.vy = -630;
        player.grounded = false;
      }
      if (queued.has("dash") && player.dashCooldown <= 0) {
        player.dashTime = .18;
        player.dashCooldown = .85;
        player.vx = player.facing * 650;
        player.blocking = false;
        spawnBurst(player.x, player.y - 55, "#b39aff", 8, 130);
      }
      if (queued.has("light")) startAttack(player, "light");
      if (queued.has("heavy")) startAttack(player, "heavy");
      if (queued.has("special")) startAttack(player, "special");
    } else {
      player.blocking = false;
    }
  }

  function updateEnemy(dt) {
    if (enemy.stun > 0 || enemy.defeated) {
      enemy.blocking = false;
      return;
    }
    const dx = player.x - enemy.x;
    const distance = Math.abs(dx);
    enemy.facing = dx < 0 ? -1 : 1;
    enemy.aiWait -= dt;
    enemy.blocking = distance < 145 && player.attack && Math.random() < .16;
    if (!enemy.attack && enemy.aiWait <= 0) {
      enemy.aiWait = .34 + Math.random() * .35;
      if (distance > 175) {
        enemy.vx = Math.sign(dx) * 185 * enemy.config.speed;
      } else if (distance < 105 && Math.random() < .32) {
        enemy.vx = -Math.sign(dx) * 105 * enemy.config.speed;
      } else if (distance < 155) {
        const roll = Math.random();
        if (roll < .55) startAttack(enemy, "light");
        else if (roll < .91) startAttack(enemy, "heavy");
        else if (enemy.energy >= 38) startAttack(enemy, "special");
      } else if (distance < 285 && enemy.energy >= 55 && Math.random() < .24) {
        startAttack(enemy, "special");
      }
    }
    if (distance > 205 && !enemy.attack && enemy.stun <= 0) {
      enemy.vx += Math.sign(dx) * 360 * enemy.config.speed * dt;
      const maxSpeed = 210 * enemy.config.speed;
      enemy.vx = Math.max(-maxSpeed, Math.min(maxSpeed, enemy.vx));
    }
  }

  function update(dt) {
    elapsed += dt;
    if (mode !== "fight") return;
    roundTime = Math.max(0, roundTime - dt);
    updatePlayer();
    updateEnemy(dt);
    updateFighterPhysics(player, dt);
    updateFighterPhysics(enemy, dt);
    player.facing = enemy.x < player.x ? -1 : 1;
    enemy.facing = player.x < enemy.x ? -1 : 1;
    queued.clear();

    particles = particles.filter(p => (p.life -= dt) > 0);
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= .985; p.vy = p.vy * .985 + 85 * dt;
    }
    texts = texts.filter(t => (t.life -= dt) > 0);
    for (const t of texts) t.y -= 38 * dt;
    shake = Math.max(0, shake - dt);

    ui.playerHealth.style.width = (player.health / player.maxHealth * 100) + "%";
    ui.playerEnergy.style.width = player.energy + "%";
    ui.enemyHealth.style.width = (enemy.health / enemy.maxHealth * 100) + "%";
    ui.enemyEnergy.style.width = enemy.energy + "%";
    ui.timer.textContent = String(Math.ceil(roundTime)).padStart(2, "0");
    if (roundTime <= 0) finishMatch(player.health / player.maxHealth >= enemy.health / enemy.maxHealth, true);
  }

  function drawBackground() {
    const scene = missions[mode === "intro" || mode === "missions" ? selectedMission : missionIndex].scene;
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, scene.top);
    sky.addColorStop(.48, scene.mid);
    sky.addColorStop(1, scene.bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const haze = ctx.createRadialGradient(630, 270, 20, 630, 270, 520);
    haze.addColorStop(0, scene.haze);
    haze.addColorStop(1, "rgba(145,91,206,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    for (const star of stars) {
      ctx.globalAlpha = star.a * (.7 + Math.sin(elapsed * 1.8 + star.x) * .25);
      ctx.fillStyle = "#e7d9ff";
      ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const moon = ctx.createRadialGradient(825, 168, 5, 825, 168, 112);
    moon.addColorStop(0, "rgba(226,211,255,.8)");
    moon.addColorStop(.28, "rgba(175,144,222,.27)");
    moon.addColorStop(1, "rgba(175,144,222,0)");
    ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(825, 168, 112, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(220,205,245,.72)"; ctx.beginPath(); ctx.arc(825, 168, 39, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = scene.buildings;
    for (const b of skyline) {
      ctx.fillRect(b.x, 370 - b.h, b.w, b.h + 100);
      ctx.fillStyle = "rgba(171,135,222,.13)";
      for (let row = 0; row < 4; row++) ctx.fillRect(b.x + 7, 385 - b.h + row * 22, 4, 7);
      ctx.fillStyle = "#171424";
    }

    ctx.save();
    ctx.globalAlpha = .5;
    ctx.strokeStyle = "#76618d"; ctx.lineWidth = 7;
    for (let i = 0; i < 3; i++) {
      const x = 160 + i * 420;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 300); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 52, 98); ctx.lineTo(x + 52, 98); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 39, 110); ctx.lineTo(x + 39, 110); ctx.stroke();
    }
    ctx.restore();

    const floorGlow = ctx.createLinearGradient(0, 430, 0, HEIGHT);
    floorGlow.addColorStop(0, scene.floor);
    floorGlow.addColorStop(.4, "rgba(24,20,35,.92)");
    floorGlow.addColorStop(1, "#0a0910");
    ctx.fillStyle = floorGlow; ctx.fillRect(0, 430, WIDTH, HEIGHT - 430);

    ctx.strokeStyle = scene.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i < 13; i++) {
      const y = 475 + i * i * 1.25;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }
    for (let i = 0; i < 17; i++) {
      const x = i * 75 - 90;
      ctx.beginPath(); ctx.moveTo(600, 455); ctx.lineTo(x, HEIGHT); ctx.stroke();
    }
    ctx.fillStyle = "rgba(198,164,255,.13)";
    ctx.fillRect(0, FLOOR + 2, WIDTH, 2);
    ctx.fillStyle = "rgba(8,7,13,.55)";
    ctx.fillRect(0, FLOOR + 4, WIDTH, HEIGHT - FLOOR - 4);
  }

  function drawFighter(fighter) {
    const config = fighter.config;
    const bob = fighter.grounded && !fighter.attack ? Math.sin(elapsed * 7 + fighter.x) * 2 : 0;
    const attacking = fighter.attack ? Math.sin(Math.min(1, fighter.attack.time / fighter.attack.duration) * Math.PI) : 0;
    ctx.save();
    ctx.globalAlpha = .5;
    ctx.fillStyle = "#05040a";
    ctx.beginPath(); ctx.ellipse(fighter.x, FLOOR + 5, fighter.isEnemy ? 62 : 49, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(fighter.x, fighter.y + bob);
    ctx.scale(fighter.facing, 1);
    if (fighter.isEnemy) {
      const aura = ctx.createRadialGradient(0, -95, 12, 0, -95, 105);
      aura.addColorStop(0, config.accent + "55");
      aura.addColorStop(1, config.accent + "00");
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, -95, 105, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = config.accent; ctx.lineWidth = 5; ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        const sway = Math.sin(elapsed * 3 + i * 2) * 12;
        ctx.beginPath(); ctx.moveTo(-24 + i * 19, -90); ctx.quadraticCurveTo(-65 + sway, -145, -48 + sway, -205 - i * 9); ctx.stroke();
      }
      ctx.fillStyle = config.outfit;
      ctx.strokeStyle = config.accent; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-34, -132); ctx.quadraticCurveTo(-55, -92, -35, -39);
      ctx.quadraticCurveTo(0, -17, 38, -42); ctx.lineTo(27, -130);
      ctx.quadraticCurveTo(0, -154, -34, -132); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = config.hair;
      ctx.beginPath(); ctx.ellipse(0, -160, 30, 34, -.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = config.trim;
      ctx.beginPath(); ctx.ellipse(-11, -162, 5, 3, -.1, 0, Math.PI * 2); ctx.ellipse(11, -162, 5, 3, .1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = config.accent; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-19, -180); ctx.lineTo(-31, -199); ctx.moveTo(18, -180); ctx.lineTo(31, -202); ctx.stroke();
      ctx.strokeStyle = config.outfit; ctx.lineWidth = 15;
      ctx.beginPath(); ctx.moveTo(-27, -121); ctx.lineTo(-51, -82); ctx.lineTo(-37, -62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(26, -121); ctx.lineTo(48, -82); ctx.lineTo(34, -62); ctx.stroke();
      ctx.fillStyle = config.trim; ctx.beginPath(); ctx.arc(34, -61, 9, 0, Math.PI * 2); ctx.fill();
    } else {
      const glow = ctx.createRadialGradient(0, -110, 5, 0, -110, fighter.attack && fighter.attack.kind === "special" ? 150 : 86);
      glow.addColorStop(0, fighter.attack && fighter.attack.kind === "special" ? config.accent + "55" : config.accent + "18");
      glow.addColorStop(1, config.accent + "00");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -110, 150, 0, Math.PI * 2); ctx.fill();

      const legPose = fighter.attack ? attacking * 9 : 0;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "#12121c"; ctx.lineWidth = 18;
      ctx.beginPath(); ctx.moveTo(-10, -65); ctx.lineTo(-19 - legPose, -27); ctx.lineTo(-28 - legPose, -10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -65); ctx.lineTo(22 + legPose, -27); ctx.lineTo(31 + legPose, -10); ctx.stroke();
      ctx.strokeStyle = config.trim; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-26 - legPose, -13); ctx.lineTo(-13 - legPose, -13); ctx.moveTo(25 + legPose, -13); ctx.lineTo(39 + legPose, -13); ctx.stroke();

      ctx.fillStyle = config.outfit; ctx.strokeStyle = "#090912"; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-26, -130); ctx.quadraticCurveTo(-42, -112, -33, -60);
      ctx.lineTo(-19, -48); ctx.lineTo(20, -48); ctx.lineTo(35, -64);
      ctx.quadraticCurveTo(39, -108, 24, -130); ctx.quadraticCurveTo(0, -147, -26, -130);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.strokeStyle = config.trim; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-25, -112); ctx.lineTo(0, -79); ctx.lineTo(23, -112); ctx.stroke();
      ctx.fillStyle = config.accent; ctx.fillRect(-23, -71, 46, 6);
      ctx.fillStyle = "#171521"; ctx.fillRect(-7, -127, 14, 47);

      const armSwing = fighter.attack ? attacking * (fighter.attack.kind === "special" ? 60 : 42) : 0;
      ctx.strokeStyle = config.outfit; ctx.lineWidth = 17; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-24, -121); ctx.lineTo(-42, -92); ctx.lineTo(-34, -73); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(23, -120); ctx.lineTo(43 + armSwing, -96 - armSwing * .45); ctx.lineTo(51 + armSwing, -83 - armSwing * .6); ctx.stroke();
      ctx.fillStyle = "#e6b6a8"; ctx.beginPath(); ctx.arc(-34, -71, 9, 0, Math.PI * 2); ctx.arc(51 + armSwing, -83 - armSwing * .6, 9, 0, Math.PI * 2); ctx.fill();
      if (fighter.attack && fighter.attack.kind === "special") {
        const pulse = Math.sin(elapsed * 24) * 7;
        ctx.globalAlpha = .88;
        if (fighter.characterKey === "gojo") {
          ctx.shadowColor = config.accent; ctx.shadowBlur = 25;
          ctx.fillStyle = config.accent + "66";
          ctx.beginPath(); ctx.arc(115, -100, 25 + pulse, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#e5fbff"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(115, -100, 38 + pulse, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = config.accent; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.moveTo(30, -100); ctx.lineTo(180, -100); ctx.stroke();
        } else if (fighter.characterKey === "megumi") {
          ctx.shadowColor = "#10101b"; ctx.shadowBlur = 16;
          ctx.fillStyle = "#10101b";
          for (let i = 0; i < 3; i++) {
            const x = 65 + i * 24;
            ctx.beginPath(); ctx.moveTo(x - 16, -12); ctx.quadraticCurveTo(x - 8, -100 - pulse, x + 4, -132); ctx.quadraticCurveTo(x + 30, -70, x + 20, -12); ctx.fill();
          }
          ctx.strokeStyle = config.accent; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(45, -15); ctx.quadraticCurveTo(105, -105, 175, -16); ctx.stroke();
        } else if (fighter.characterKey === "nobara") {
          ctx.shadowColor = config.accent; ctx.shadowBlur = 18;
          ctx.strokeStyle = "#ffd88a"; ctx.lineWidth = 4;
          for (let i = 0; i < 5; i++) {
            const angle = -.8 + i * .4;
            ctx.save(); ctx.translate(90, -94); ctx.rotate(angle);
            ctx.beginPath(); ctx.moveTo(0, -43 - pulse); ctx.lineTo(0, -12); ctx.stroke();
            ctx.fillStyle = "#fff0c3"; ctx.beginPath(); ctx.arc(0, -43 - pulse, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
          ctx.strokeStyle = config.accent; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(90, -94, 54 + pulse, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.shadowColor = config.accent; ctx.shadowBlur = 22;
          ctx.strokeStyle = config.accent; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.arc(76, -94, 35 + pulse, -.9, .9); ctx.stroke();
          ctx.strokeStyle = "#fff0fa"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(45, -110); ctx.lineTo(145, -74); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "#d9a895";
      ctx.beginPath(); ctx.ellipse(0, -157, 25, 29, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = config.hair;
      ctx.beginPath();
      if (fighter.characterKey === "gojo") {
        ctx.moveTo(-24, -164); ctx.quadraticCurveTo(-30, -196, -5, -194);
        ctx.quadraticCurveTo(20, -202, 26, -172); ctx.lineTo(17, -166);
        ctx.lineTo(10, -181); ctx.lineTo(1, -167); ctx.lineTo(-7, -183); ctx.lineTo(-17, -165); ctx.closePath();
      } else if (fighter.characterKey === "megumi") {
        ctx.moveTo(-25, -164); ctx.lineTo(-34, -188); ctx.lineTo(-17, -181);
        ctx.lineTo(-18, -204); ctx.lineTo(-3, -184); ctx.lineTo(8, -207);
        ctx.lineTo(13, -182); ctx.lineTo(30, -193); ctx.lineTo(20, -164); ctx.closePath();
      } else {
        ctx.moveTo(-25, -164); ctx.lineTo(-32, -187); ctx.lineTo(-16, -180);
        ctx.lineTo(-13, -201); ctx.lineTo(0, -184); ctx.lineTo(12, -198);
        ctx.lineTo(16, -179); ctx.lineTo(30, -186); ctx.lineTo(21, -161); ctx.closePath();
      }
      ctx.fill();
      ctx.fillStyle = "#211a2d";
      ctx.beginPath(); ctx.ellipse(-9, -155, 2.7, 2.2, 0, 0, Math.PI * 2); ctx.ellipse(9, -155, 2.7, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#8b5660"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-5, -143); ctx.quadraticCurveTo(0, -140, 5, -143); ctx.stroke();
      if (fighter.characterKey === "gojo") {
        ctx.fillStyle = "#111827"; ctx.fillRect(-24, -170, 48, 9);
        ctx.strokeStyle = config.accent; ctx.lineWidth = 2; ctx.strokeRect(-24, -170, 48, 9);
      }
      if (fighter.characterKey === "nobara") {
        ctx.fillStyle = "#d6a84d"; ctx.beginPath(); ctx.arc(22, -154, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    if (fighter.blocking) {
      ctx.strokeStyle = "rgba(126,222,255,.8)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, -100, 58, 88, 0, -1.35, 1.35); ctx.stroke();
    }
    if (fighter.hitFlash > 0) {
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255,245,255,.55)";
      ctx.beginPath(); ctx.ellipse(0, -112, 45, 85, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (fighter.attack && fighter.attack.kind === "heavy") {
      ctx.strokeStyle = config.accent; ctx.lineWidth = 5; ctx.globalAlpha = .65;
      ctx.beginPath(); ctx.arc(32, -108, 58, -.9, .8); ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const t of texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.font = "800 22px Rajdhani, sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = t.color; ctx.shadowBlur = 12;
      ctx.fillText(t.message, t.x, t.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  function drawArena() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - .5) * shake * 36, (Math.random() - .5) * shake * 28);
    drawBackground();
    if (mode === "intro" || mode === "missions") {
      const previewPlayer = makeFighter(430, false, selectedCharacter);
      const previewEnemy = makeEnemy(missions[selectedMission]);
      drawFighter(previewPlayer);
      drawFighter(previewEnemy);
    } else {
      drawFighter(player);
      drawFighter(enemy);
    }
    drawParticles();
    ctx.restore();
  }

  function frame(timestamp) {
    const dt = Math.min(.032, (timestamp - (lastTime || timestamp)) / 1000 || 0);
    lastTime = timestamp;
    update(dt);
    drawArena();
    requestAnimationFrame(frame);
  }

  function setHeld(action, value) {
    if (action in held) held[action] = value;
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if ([" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
    if (keys[key]) setHeld(keys[key], true);
    if (event.repeat) return;
    const actions = { j: "light", k: "heavy", l: "special", Shift: "dash", r: "restart" };
    if (actions[key]) {
      if (actions[key] === "restart") {
        if (mode === "result") startMatch();
      } else queued.add(actions[key]);
    }
  });
  window.addEventListener("keyup", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (keys[key]) setHeld(keys[key], false);
  });
  window.addEventListener("blur", () => {
    Object.keys(held).forEach(key => held[key] = false);
  });

  document.querySelectorAll(".character-pick").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCharacter = button.dataset.character;
      document.querySelectorAll(".character-pick").forEach(item => item.classList.toggle("selected", item === button));
      if (mode === "intro") ui.playerName.textContent = characters[selectedCharacter].name;
    });
  });

  ui.start.addEventListener("click", openMissions);
  ui.missionStart.addEventListener("click", () => startMission(selectedMission));
  ui.missionBack.addEventListener("click", () => {
    mode = "intro";
    ui.missions.classList.add("hidden");
    ui.intro.classList.remove("hidden");
  });
  ui.missionCards.forEach((card) => {
    card.addEventListener("click", () => {
      const index = Number(card.dataset.mission);
      if (index >= unlockedMission) return;
      selectedMission = index;
      updateMissionMenu();
    });
  });
  ui.rematch.addEventListener("click", startMatch);
  ui.nextMission.addEventListener("click", () => startMission(missionIndex + 1));
  ui.menu.addEventListener("click", openMissions);

  document.querySelectorAll(".touch-button").forEach((button) => {
    const action = button.dataset.action;
    const isHeld = ["left", "right", "jump", "guard"].includes(action);
    const down = (event) => {
      event.preventDefault();
      button.classList.add("active");
      if (isHeld) setHeld(action === "jump" ? "jump" : action === "guard" ? "guard" : action, true);
      else if (action === "light") queued.add("light");
      else if (action === "heavy") queued.add("heavy");
      else if (action === "special") queued.add("special");
    };
    const up = (event) => {
      event.preventDefault();
      button.classList.remove("active");
      if (isHeld) setHeld(action === "jump" ? "jump" : action === "guard" ? "guard" : action, false);
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointerleave", up);
    button.addEventListener("pointercancel", up);
  });

  resetMatch();
  requestAnimationFrame(frame);
})();