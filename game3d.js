import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinnedModel } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js";

(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  if (!canvas) throw new Error("Missing #gameCanvas");
  const $ = (id) => document.getElementById(id);
  const ui = {
    intro: $("introScreen"), missions: $("missionScreen"), result: $("resultScreen"),
    start: $("startButton"), missionStart: $("missionStartButton"), missionBack: $("missionBack"),
    missionCards: Array.from(document.querySelectorAll(".mission-card")),
    missionProgress: $("missionProgress"), nextMission: $("nextMissionButton"),
    rematch: $("rematchButton"), menu: $("menuButton"), timer: $("timer"),
    playerHealth: $("playerHealth"), playerEnergy: $("playerEnergy"),
    enemyHealth: $("enemyHealth"), enemyEnergy: $("enemyEnergy"),
    playerName: $("playerName"), enemyName: $("enemyName"), enemyGrade: $("enemyGrade"),
    stageLabel: $("missionStageLabel"), hint: $("combatHint"), callout: $("fightCallout"),
    resultTitle: $("resultTitle"), resultMessage: $("resultMessage"), resultEyebrow: $("resultEyebrow")
  };

  const WORLD_SCALE = 120;
  const WIDTH = 1200;
  const FLOOR = 552;
  const GRAVITY = 1700;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#090815");
  scene.fog = new THREE.FogExp2("#171329", 0.025);

  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 90);
  camera.position.set(0, 4.15, 17.5);
  camera.lookAt(0, 1.45, 0);

  const clock = new THREE.Clock();
  const stageRoot = new THREE.Group();
  scene.add(stageRoot);
  const fighterRoot = new THREE.Group();
  scene.add(fighterRoot);
  const effectsRoot = new THREE.Group();
  scene.add(effectsRoot);

  const hemi = new THREE.HemisphereLight("#c9c4ff", "#17101f", 1.9);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight("#fff0e4", 3.1);
  keyLight.position.set(-4, 9, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -11;
  keyLight.shadow.camera.right = 11;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -7;
  scene.add(keyLight);
  const rimLight = new THREE.PointLight("#a58bff", 34, 16, 2);
  rimLight.position.set(0, 5.3, -3.5);
  scene.add(rimLight);
  const fillLight = new THREE.PointLight("#6bdcff", 14, 12, 2);
  fillLight.position.set(5, 3.2, 5);
  scene.add(fillLight);

  const materials = {
    skin: new THREE.MeshToonMaterial({ color: "#e6b7a9" }),
    skinShade: new THREE.MeshToonMaterial({ color: "#bd827a" }),
    black: new THREE.MeshToonMaterial({ color: "#171725" }),
    shoe: new THREE.MeshToonMaterial({ color: "#090a12" }),
    white: new THREE.MeshToonMaterial({ color: "#f0efff" }),
    eye: new THREE.MeshBasicMaterial({ color: "#171222" }),
    gold: new THREE.MeshStandardMaterial({ color: "#d4a34f", metalness: 0.68, roughness: 0.28 }),
    glowWhite: new THREE.MeshBasicMaterial({ color: "#e6faff" })
  };

  const characters = {
    yuji: {
      name: "YUJI ITADORI", hair: "#e99aac", outfit: "#202438",
      accent: "#ff789b", trim: "#f3d9e1", skin: "#e6b7a9", speed: 1,
      technique: "DIVERGENT FIST",
      special: { duration: .58, active: [.15, .4], damage: 30, range: 180, cost: 32, label: "DIVERGENT FIST" }
    },
    gojo: {
      name: "SATORU GOJO", hair: "#d9e9ff", outfit: "#101a30",
      accent: "#75ddff", trim: "#c9e6ff", skin: "#efd0c8", speed: .96,
      technique: "LIMITLESS",
      special: { duration: .72, active: [.2, .53], damage: 24, range: 390, cost: 42, label: "LIMITLESS" }
    },
    megumi: {
      name: "MEGUMI FUSHIGURO", hair: "#161c2c", outfit: "#1a263d",
      accent: "#8b9eff", trim: "#c5d0ff", skin: "#dfb5a8", speed: 1.04,
      technique: "SHADOW STYLE",
      special: { duration: .7, active: [.19, .5], damage: 28, range: 260, cost: 36, label: "SHADOW STYLE" }
    },
    nobara: {
      name: "NOBARA KUGISAKI", hair: "#a75f40", outfit: "#34293a",
      accent: "#ffb16d", trim: "#f6d1ad", skin: "#edc3b2", speed: 1.02,
      technique: "RESONANCE",
      special: { duration: .66, active: [.18, .48], damage: 23, range: 350, cost: 34, label: "RESONANCE" }
    }
  };

  const missions = [
    {
      title: "JUJUTSU HIGH", location: "TOKYO TRAINING GROUNDS", opponent: "CURSED WRAITH",
      description: "A controlled trial against a wandering cursed spirit.",
      enemyHealth: 100, enemySpeed: .88, enemyDamage: 1,
      palette: { sky: "#111020", fog: "#211936", floor: "#171329", accent: "#a77bff", glow: "#c5a5ff", tower: "#27203d" },
      config: { name: "CURSED WRAITH", hair: "#9c83bd", outfit: "#21182d", accent: "#c080ff", trim: "#f0ccff", skin: "#b7a0ca", speed: .88, technique: "VOID HOWL", special: { duration: .7, active: [.2, .48], damage: 22, range: 300, cost: 38, label: "VOID HOWL" } }
    },
    {
      title: "CURSED WOMB", location: "DETENTION CENTER", opponent: "CURSED WOMB",
      description: "A veil descends over an abandoned detention center. The curse is stronger this time.",
      enemyHealth: 128, enemySpeed: .98, enemyDamage: 1.12,
      palette: { sky: "#190d18", fog: "#351529", floor: "#21111e", accent: "#ff557f", glow: "#ff7d9f", tower: "#351727" },
      config: { name: "CURSED WOMB", hair: "#74334f", outfit: "#291321", accent: "#ff648d", trim: "#ffc2d3", skin: "#bb8293", speed: .98, technique: "WOMB PULSE", special: { duration: .72, active: [.2, .5], damage: 25, range: 305, cost: 38, label: "WOMB PULSE" } }
    },
    {
      title: "GETO'S PLAN", location: "NIGHT PARADE / TOKYO", opponent: "CURSE MANIPULATOR",
      description: "The Night Parade begins. Face the final opponent in this first story route.",
      enemyHealth: 160, enemySpeed: 1.08, enemyDamage: 1.22,
      palette: { sky: "#071521", fog: "#102b43", floor: "#0d1b2a", accent: "#57caff", glow: "#8ae2ff", tower: "#10283b" },
      config: { name: "CURSE MANIPULATOR", hair: "#253759", outfit: "#111b31", accent: "#70c4ff", trim: "#c4ebff", skin: "#d3b6ad", speed: 1.08, technique: "CURSE SWARM", special: { duration: .78, active: [.22, .56], damage: 30, range: 340, cost: 42, label: "CURSE SWARM" } }
    }
  ];

  let unlockedMission = 1;
  try {
    const saved = Number(localStorage.getItem("jjk-cursed-arena-progress"));
    if (Number.isFinite(saved) && saved >= 1) unlockedMission = Math.min(missions.length + 1, Math.floor(saved));
  } catch {}
  let selectedMission = 0;
  let missionIndex = 0;
  let selectedCharacter = "yuji";
  let mode = "intro";
  let player = null;
  let enemy = null;
  let roundTime = 90;
  let elapsed = 0;
  let shake = 0;
  let particles = [];
  let popups = [];
  let queued = new Set();
  const held = { left: false, right: false, jump: false, guard: false };
  const keyMap = {
    a: "left", d: "right", w: "jump", s: "guard",
    ArrowLeft: "left", ArrowRight: "right", ArrowUp: "jump", ArrowDown: "guard"
  };

  function toon(color) {
    return new THREE.MeshToonMaterial({ color: color });
  }
  function addMesh(parent, geometry, material, position, scale) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.set(position[0], position[1], position[2]);
    if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function capsule(radius, length, material, parent, position, scale) {
    return addMesh(parent, new THREE.CapsuleGeometry(radius, length, 7, 12), material, position, scale);
  }
  function makeMat(color, roughness = .72, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  function makeStage(index) {
    while (stageRoot.children.length) {
      const child = stageRoot.children.pop();
      stageRoot.remove(child);
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material && obj.material !== materials.eye) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    const p = missions[index].palette;
    scene.background = new THREE.Color(p.sky);
    scene.fog = new THREE.FogExp2(p.fog, .021);
    hemi.color.set(p.glow);
    rimLight.color.set(p.accent);
    fillLight.color.set(p.glow);
    const floor = addMesh(stageRoot, new THREE.CircleGeometry(16, 96), makeMat(p.floor, .42, .18), [0, -.08, 0]);
    floor.rotation.x = -Math.PI / 2;
    const platform = addMesh(stageRoot, new THREE.CylinderGeometry(7.8, 8.4, .22, 96), makeMat("#201a31", .34, .36), [0, -.16, 0]);
    platform.receiveShadow = true;

    const ringMat = new THREE.MeshBasicMaterial({ color: p.accent, transparent: true, opacity: .48 });
    for (let r = 2.8; r <= 7.2; r += 1.45) {
      const ring = addMesh(stageRoot, new THREE.TorusGeometry(r, .012, 8, 120), ringMat, [0, -.035, .02]);
      ring.rotation.x = Math.PI / 2;
    }
    const gridMat = new THREE.LineBasicMaterial({ color: p.accent, transparent: true, opacity: .18 });
    const gridPoints = [];
    for (let z = -7; z <= 7; z += 1.4) {
      gridPoints.push(new THREE.Vector3(-10, -.025, z), new THREE.Vector3(10, -.025, z));
    }
    for (let x = -10; x <= 10; x += 1.4) {
      gridPoints.push(new THREE.Vector3(x, -.025, -7), new THREE.Vector3(x, -.025, 7));
    }
    const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPoints);
    stageRoot.add(new THREE.LineSegments(gridGeo, gridMat));

    const pillarMat = makeMat(p.tower, .58, .22);
    const trimMat = new THREE.MeshStandardMaterial({ color: p.accent, emissive: p.accent, emissiveIntensity: .36, metalness: .3, roughness: .38 });
    for (let i = 0; i < 7; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (5.1 + Math.floor(i / 2) * 2.0);
      const height = 2.8 + (i % 3) * 1.15;
      const column = addMesh(stageRoot, new THREE.CylinderGeometry(.34, .5, height, 12, 1), pillarMat, [x, height / 2 - .02, -4.8]);
      column.rotation.z = side * .012;
      const cap = addMesh(stageRoot, new THREE.TorusGeometry(.42, .045, 8, 24), trimMat, [x, height - .1, -4.8]);
      cap.rotation.x = Math.PI / 2;
    }

    const gate = new THREE.Group();
    stageRoot.add(gate);
    const postGeo = new THREE.CylinderGeometry(.13, .19, 4.0, 16);
    const beamGeo = new THREE.CylinderGeometry(.15, .15, 11.4, 18);
    for (const x of [-4.35, 4.35]) addMesh(gate, postGeo, makeMat("#55466c", .42, .3), [x, 2, -5.2]);
    const beam = addMesh(gate, beamGeo, makeMat("#6e4b83", .4, .32), [0, 4.05, -5.2]);
    beam.rotation.z = Math.PI / 2;
    const lowerBeam = addMesh(gate, new THREE.CylinderGeometry(.075, .075, 9.1, 16), trimMat, [0, 3.58, -5.12]);
    lowerBeam.rotation.z = Math.PI / 2;

    const moon = addMesh(stageRoot, new THREE.SphereGeometry(1.05, 32, 24), new THREE.MeshBasicMaterial({ color: p.glow }), [5.8, 5.25, -7]);
    moon.scale.set(1.15, 1.15, .18);
    const moonHalo = addMesh(stageRoot, new THREE.TorusGeometry(1.38, .025, 8, 64), ringMat, [5.8, 5.25, -6.9]);
    moonHalo.rotation.y = .12;
    for (let i = 0; i < 32; i++) {
      const x = -10 + Math.random() * 20;
      const y = 1.2 + Math.random() * 5.6;
      const star = addMesh(stageRoot, new THREE.SphereGeometry(.018 + Math.random() * .022, 7, 6), new THREE.MeshBasicMaterial({ color: "#efe7ff" }), [x, y, -6.2 + Math.random() * 1.5]);
      star.userData.phase = Math.random() * Math.PI * 2;
    }
  }

  function addLimb(parent, side, y, radius, length, material) {
    const pivot = new THREE.Group();
    pivot.position.set(side, y, 0);
    parent.add(pivot);
    capsule(radius, length, material, pivot, [0, -length * .42, 0]);
    return pivot;
  }

  function buildHumanFighter(fighter) {
    const c = fighter.config;
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const skinMat = toon(c.skin || "#e6b7a9");
    const outfitMat = toon(c.outfit);
    const hairMat = toon(c.hair);
    const accentMat = toon(c.accent);
    const trimMat = toon(c.trim || "#eee4ff");
    const pantsMat = toon(c.outfit);
    const torso = capsule(.285, .52, outfitMat, body, [0, 1.22, 0], [1.02, 1.06, .72]);
    const pelvis = addMesh(body, new THREE.SphereGeometry(.255, 24, 20), pantsMat, [0, .84, 0], [1.04, .72, .82]);
    const collar = addMesh(body, new THREE.TorusGeometry(.185, .055, 9, 28), accentMat, [0, 1.68, 0]);
    collar.rotation.x = Math.PI / 2;
    const neck = addMesh(body, new THREE.CylinderGeometry(.105, .12, .2, 16), skinMat, [0, 1.69, 0]);
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.99, 0);
    body.add(headGroup);
    addMesh(headGroup, new THREE.SphereGeometry(.255, 32, 24), skinMat, [0, 0, 0], [.87, 1.12, .83]);
    addMesh(headGroup, new THREE.SphereGeometry(.12, 20, 16), skinMat, [0, -.11, .17], [.9, .55, .6]);
    for (const side of [-1, 1]) {
      addMesh(headGroup, new THREE.SphereGeometry(.025, 12, 10), materials.eye, [side * .085, .015, .211], [1, .82, .42]);
      const brow = addMesh(headGroup, new THREE.CapsuleGeometry(.014, .07, 4, 8), hairMat, [side * .085, .071, .205]);
      brow.rotation.z = side * -.12;
    }
    addMesh(headGroup, new THREE.SphereGeometry(.025, 12, 10), skinMat, [0, -.055, .226], [.7, .65, .5]);
    const hairCap = addMesh(headGroup, new THREE.SphereGeometry(.265, 24, 18), hairMat, [0, .135, -.005], [1.02, .72, .96]);
    const spikeCount = fighter.characterKey === "yuji" ? 9 : fighter.characterKey === "megumi" ? 10 : 7;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const spike = addMesh(headGroup, new THREE.ConeGeometry(.085 + (i % 3) * .012, .28 + (i % 2) * .08, 7), hairMat,
        [Math.cos(angle) * .17, .27 + (i % 3) * .025, Math.sin(angle) * .14 - .01]);
      spike.rotation.z = Math.cos(angle) * .42;
      spike.rotation.x = Math.sin(angle) * .42;
    }
    if (fighter.characterKey === "gojo") {
      const blindfold = addMesh(headGroup, new THREE.TorusGeometry(.205, .055, 8, 32), toon("#111827"), [0, .005, .02]);
      blindfold.scale.set(1.12, .42, .85);
      addMesh(headGroup, new THREE.SphereGeometry(.04, 12, 10), accentMat, [0, .012, .225]);
    } else if (fighter.characterKey === "nobara") {
      addMesh(headGroup, new THREE.SphereGeometry(.055, 14, 12), materials.gold, [.22, .035, .12]);
    }

    const leftLeg = addLimb(body, -.145, .83, .105, .54, pantsMat);
    const rightLeg = addLimb(body, .145, .83, .105, .54, pantsMat);
    for (const leg of [leftLeg, rightLeg]) {
      addMesh(leg, new THREE.SphereGeometry(.14, 18, 14), materials.shoe, [0, -.53, .08], [1.0, .62, 1.55]);
      addMesh(leg, new THREE.TorusGeometry(.09, .018, 6, 18), trimMat, [0, -.41, .01]);
    }
    const leftArm = addLimb(body, -.34, 1.47, .09, .42, outfitMat);
    const rightArm = addLimb(body, .34, 1.47, .09, .42, outfitMat);
    for (const arm of [leftArm, rightArm]) {
      capsule(.073, .28, skinMat, arm, [0, -.43, .015]);
      addMesh(arm, new THREE.SphereGeometry(.09, 16, 14), skinMat, [0, -.63, .04], [1, .9, .94]);
      addMesh(arm, new THREE.TorusGeometry(.08, .018, 6, 18), trimMat, [0, -.37, .02]);
    }
    const chestMark = addMesh(body, new THREE.TorusGeometry(.105, .018, 6, 20), trimMat, [0, 1.29, .235]);
    chestMark.scale.set(.8, 1.1, .7);
    const aura = new THREE.Group();
    body.add(aura);
    const auraMaterial = new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false });
    const auraRing = addMesh(aura, new THREE.TorusGeometry(.78, .022, 8, 64), auraMaterial, [0, 1.0, 0]);
    auraRing.rotation.x = Math.PI / 2;
    const attackGlow = new THREE.Group();
    body.add(attackGlow);
    attackGlow.position.set(0, 1.15, .72);
    const energyOrb = addMesh(attackGlow, new THREE.SphereGeometry(.22, 20, 16), new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, opacity: .82 }), [0, 0, 0]);
    const energyRing = addMesh(attackGlow, new THREE.TorusGeometry(.34, .025, 8, 36), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: .85 }), [0, 0, 0]);
    energyRing.rotation.x = .7;
    attackGlow.visible = false;

    return { root, body, torso, pelvis, headGroup, leftLeg, rightLeg, leftArm, rightArm, auraRing, attackGlow, energyOrb, energyRing };
  }

  function buildCurseFighter(fighter) {
    const c = fighter.config;
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const skin = toon(c.skin || "#a98ab7");
    const robe = toon(c.outfit);
    const glow = new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 1.25, roughness: .35 });
    const torso = capsule(.34, .65, robe, body, [0, 1.12, 0], [1.05, 1.3, .92]);
    addMesh(body, new THREE.SphereGeometry(.3, 22, 18), skin, [0, 1.9, 0], [.9, 1.1, .8]);
    for (const side of [-1, 1]) {
      addMesh(body, new THREE.SphereGeometry(.043, 12, 10), glow, [side * .105, 1.96, .226]);
      const horn = addMesh(body, new THREE.ConeGeometry(.105, .48, 8), skin, [side * .23, 2.22, -.01]);
      horn.rotation.z = side * -.45;
      horn.rotation.x = -.18;
    }
    const armA = addLimb(body, -.42, 1.47, .13, .62, robe);
    const armB = addLimb(body, .42, 1.47, .13, .62, robe);
    for (const arm of [armA, armB]) {
      addMesh(arm, new THREE.SphereGeometry(.12, 16, 14), skin, [0, -.7, .02], [1, 1.1, .8]);
      for (let i = 0; i < 3; i++) {
        const claw = addMesh(arm, new THREE.ConeGeometry(.035, .21, 7), glow, [((i - 1) * .07), -.84, .1]);
        claw.rotation.x = Math.PI;
      }
    }
    const skirt = capsule(.31, .34, robe, body, [0, .49, -.015], [1.25, 1.0, 1.0]);
    const leftLeg = addLimb(body, -.15, .35, .12, .42, skin);
    const rightLeg = addLimb(body, .15, .35, .12, .42, skin);
    const aura = addMesh(body, new THREE.TorusGeometry(.84, .025, 8, 64), new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, opacity: .55 }), [0, 1.05, 0]);
    aura.rotation.x = Math.PI / 2;
    const attackGlow = new THREE.Group();
    body.add(attackGlow);
    attackGlow.position.set(0, 1.2, .78);
    addMesh(attackGlow, new THREE.SphereGeometry(.3, 20, 16), new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, opacity: .86 }), [0, 0, 0]);
    const ring = addMesh(attackGlow, new THREE.TorusGeometry(.42, .03, 8, 36), materials.glowWhite, [0, 0, 0]);
    ring.rotation.x = .7;
    attackGlow.visible = false;
    return { root, body, torso, headGroup: body, leftLeg, rightLeg, leftArm: armA, rightArm: armB, auraRing: aura, attackGlow };
  }

  function buildFighterModel(fighter) {
    return fighter.isEnemy ? buildCurseFighter(fighter) : buildHumanFighter(fighter);
  }

  function makeFighter(x, isEnemy, characterKey, customConfig = null) {
    const config = customConfig || characters[characterKey] || characters.yuji;
    const fighter = {
      x, y: FLOOR, vx: 0, vy: 0, facing: isEnemy ? -1 : 1,
      health: 100, maxHealth: 100, energy: 100, damageMultiplier: 1,
      isEnemy, characterKey, config, attack: null, attackCooldown: .2,
      stun: 0, dashTime: 0, dashCooldown: 0, blocking: false,
      grounded: true, hitFlash: 0, defeated: false, aiWait: .3,
      walkPhase: Math.random() * Math.PI * 2, visual: null
    };
    fighter.visual = buildFighterModel(fighter);
    fighterRoot.add(fighter.visual.root);
    if (!isEnemy && characterKey === "yuji") attachYujiGLB(fighter);
    return fighter;
  }

  function makeEnemy(mission) {
    const fighter = makeFighter(855, true, "curse", mission.config);
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
    ui.missionProgress.textContent = "MISSIONS CLEARED " + Math.min(missions.length, unlockedMission - 1) + " / 03";
    ui.missionStart.disabled = selectedMission >= unlockedMission;
    ui.missionStart.style.opacity = ui.missionStart.disabled ? ".45" : "1";
  }

  function openMissions() {
    mode = "missions";
    ui.intro.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.missions.classList.remove("hidden");
    updateMissionMenu();
    resetMatch();
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

  function clearFighters() {
    while (fighterRoot.children.length) {
      const child = fighterRoot.children[0];
      fighterRoot.remove(child);
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material && obj.material !== materials.eye && obj.material !== materials.shoe && obj.material !== materials.gold) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  }

  function resetMatch() {
    const mission = missions[missionIndex];
    clearFighters();
    player = makeFighter(345, false, selectedCharacter);
    enemy = makeEnemy(mission);
    roundTime = 90;
    particles.forEach((p) => effectsRoot.remove(p.mesh));
    popups.forEach((p) => effectsRoot.remove(p.sprite));
    particles = [];
    popups = [];
    ui.playerName.textContent = player.config.name;
    ui.enemyName.textContent = mission.opponent;
    ui.enemyGrade.textContent = missionIndex === 2 ? "BOSS / SPECIAL GRADE" : missionIndex === 1 ? "CURSE / SPECIAL GRADE" : "CURSE / GRADE 2";
    ui.stageLabel.textContent = "MISSION 0" + (missionIndex + 1) + " / 03";
    ui.playerHealth.style.width = "100%";
    ui.playerEnergy.style.width = "100%";
    ui.enemyHealth.style.width = "100%";
    ui.enemyEnergy.style.width = "100%";
    ui.timer.textContent = "90";
    ui.hint.textContent = mission.location + " · " + mission.description.toUpperCase();
    makeStage(missionIndex);
    updateVisuals(0);
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
      ? (hasNext ? missions[missionIndex].title + " cleared. The next chapter is now unlocked." : "All three missions are complete. The first story route is cleared.")
      : "The curse overwhelmed you. Regroup and retry this mission.";
    ui.nextMission.classList.toggle("hidden", !hasNext);
    announce(won ? (hasNext ? "CHAPTER CLEAR" : "ROUTE CLEARED") : "CURSED");
  }

  function worldX(pixelX) {
    return (pixelX - 600) / WORLD_SCALE;
  }
  function worldY(pixelY) {
    return Math.max(0, (FLOOR - pixelY) / WORLD_SCALE);
  }

  function spawnBurst(x, y, color, count = 18, power = 2.5) {
    const base = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.SphereGeometry(.025 + Math.random() * .035, 8, 7);
      const material = new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: .95 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(worldX(x), worldY(y), .45 + (Math.random() - .5) * .8);
      effectsRoot.add(mesh);
      const direction = new THREE.Vector3(Math.random() - .5, Math.random() - .25, Math.random() - .5).normalize();
      const speed = .6 + Math.random() * power;
      particles.push({ mesh, velocity: direction.multiplyScalar(speed), life: .25 + Math.random() * .48, maxLife: .73 });
    }
  }

  function makeTextTexture(message, color) {
    const textCanvas = document.createElement("canvas");
    textCanvas.width = 256;
    textCanvas.height = 96;
    const context = textCanvas.getContext("2d");
    context.clearRect(0, 0, 256, 96);
    context.font = "900 54px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = 8;
    context.strokeStyle = "rgba(9,7,18,.88)";
    context.strokeText(message, 128, 48);
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 18;
    context.fillText(message, 128, 48);
    const texture = new THREE.CanvasTexture(textCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function popText(x, y, message, color) {
    const texture = makeTextTexture(message, color);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(worldX(x), worldY(y), 1.2);
    sprite.scale.set(1.15, .43, 1);
    effectsRoot.add(sprite);
    popups.push({ sprite, texture, life: .72, maxLife: .72 });
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
      spawnBurst(fighter.x + fighter.facing * 42, fighter.y - 104, fighter.config.accent, 28, 2.9);
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
    spawnBurst(target.x, target.y - 95, guarding ? "#a6dcff" : attacker.config.accent, guarding ? 9 : 22, guarding ? 1.4 : 2.8);
    popText(target.x, target.y - 145, guarding ? "GUARD" : String(damage), guarding ? "#a9e7ff" : "#ffe6f4");
    shake = guarding ? .08 : .18;
    ui.hint.textContent = guarding ? "IMPACT BLOCKED." : attack.kind === "special" ? "CURSED TECHNIQUE CONNECTED!" : "CLEAN HIT!";
    if (target.health <= 0) {
      target.defeated = true;
      finishMatch(target === enemy);
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
      const a = fighter.attack;
      if (!a.hit && a.time >= a.active[0] && a.time <= a.active[1]) applyHit(fighter, fighter === player ? enemy : player, a);
      if (a.time >= a.duration) fighter.attack = null;
    }
    fighter.energy = Math.min(100, fighter.energy + dt * (fighter.isEnemy ? 1.1 : 1.5));
  }

  function updatePlayer() {
    if (player.stun <= 0) {
      const direction = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      if (direction && !player.attack && player.dashTime <= 0) {
        player.vx = direction * 285 * player.config.speed;
        player.facing = direction;
      } else if (!direction && player.dashTime <= 0 && player.grounded) player.vx *= .8;
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
        spawnBurst(player.x, player.y - 55, "#b39aff", 12, 2.1);
      }
      if (queued.has("light")) startAttack(player, "light");
      if (queued.has("heavy")) startAttack(player, "heavy");
      if (queued.has("special")) startAttack(player, "special");
    } else player.blocking = false;
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
      if (distance > 175) enemy.vx = Math.sign(dx) * 185 * enemy.config.speed;
      else if (distance < 105 && Math.random() < .32) enemy.vx = -Math.sign(dx) * 105 * enemy.config.speed;
      else if (distance < 155) {
        const roll = Math.random();
        if (roll < .55) startAttack(enemy, "light");
        else if (roll < .91) startAttack(enemy, "heavy");
        else if (enemy.energy >= 38) startAttack(enemy, "special");
      } else if (distance < 285 && enemy.energy >= 55 && Math.random() < .24) startAttack(enemy, "special");
    }
    if (distance > 205 && !enemy.attack && enemy.stun <= 0) {
      enemy.vx += Math.sign(dx) * 360 * enemy.config.speed * dt;
      const maxSpeed = 210 * enemy.config.speed;
      enemy.vx = Math.max(-maxSpeed, Math.min(maxSpeed, enemy.vx));
    }
  }

  function update(dt) {
    elapsed += dt;
    if (mode === "fight") {
      roundTime = Math.max(0, roundTime - dt);
      updatePlayer();
      updateEnemy(dt);
      updateFighterPhysics(player, dt);
      updateFighterPhysics(enemy, dt);
      player.facing = enemy.x < player.x ? -1 : 1;
      enemy.facing = player.x < enemy.x ? -1 : 1;
      queued.clear();

      particles = particles.filter((p) => {
        p.life -= dt;
        if (p.life <= 0) {
          effectsRoot.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          return false;
        }
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.velocity.multiplyScalar(.985);
        p.velocity.y -= 1.4 * dt;
        p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
        return true;
      });
      popups = popups.filter((p) => {
        p.life -= dt;
        p.sprite.position.y += dt * .52;
        p.sprite.material.opacity = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0) {
          effectsRoot.remove(p.sprite);
          p.texture.dispose();
          p.sprite.material.dispose();
          return false;
        }
        return true;
      });
      ui.playerHealth.style.width = (player.health / player.maxHealth * 100) + "%";
      ui.playerEnergy.style.width = player.energy + "%";
      ui.enemyHealth.style.width = (enemy.health / enemy.maxHealth * 100) + "%";
      ui.enemyEnergy.style.width = enemy.energy + "%";
      ui.timer.textContent = String(Math.ceil(roundTime)).padStart(2, "0");
      if (roundTime <= 0) finishMatch(player.health / player.maxHealth >= enemy.health / enemy.maxHealth, true);
    }
    updateVisuals(dt);
    for (const star of stageRoot.children) {
      if (star.userData.phase !== undefined) star.material.opacity = .55 + Math.sin(elapsed * 2 + star.userData.phase) * .35;
    }
    if (shake > 0) {
      camera.position.x = (Math.random() - .5) * shake * .8;
      camera.position.y = 4.15 + (Math.random() - .5) * shake * .55;
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 8, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 4.15, 8, dt);
    }
  }

  function animateOne(fighter, dt) {
    if (!fighter || !fighter.visual) return;
    const v = fighter.visual;
    const moving = Math.abs(fighter.vx) > 18 && fighter.grounded && !fighter.attack;
    fighter.walkPhase += dt * (moving ? 11.5 : 3.3);
    const walk = moving ? Math.sin(fighter.walkPhase) : 0;
    const idle = Math.sin(elapsed * 2.6 + (fighter.isEnemy ? 1.6 : .2));
    const attackProgress = fighter.attack ? Math.min(1, fighter.attack.time / fighter.attack.duration) : 0;
    const attackSwing = fighter.attack ? Math.sin(attackProgress * Math.PI) : 0;
    const jump = fighter.grounded ? 0 : 1;

    v.root.position.set(worldX(fighter.x), worldY(fighter.y), fighter.isEnemy ? -.28 : .18);
    v.root.rotation.y = fighter.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    v.root.rotation.z = fighter.hitFlash > 0 ? Math.sin(elapsed * 75) * .12 : 0;
    v.body.position.y = Math.sin(elapsed * 7 + (fighter.isEnemy ? 1 : 0)) * (moving ? .018 : .027) + jump * .035;
    v.body.rotation.z = moving ? walk * .045 : idle * .012;
    v.torso.scale.y = 1 + Math.sin(elapsed * 3.5) * .018;
    v.leftLeg.rotation.x = walk * .48 + jump * .42;
    v.rightLeg.rotation.x = -walk * .48 + jump * .42;
    v.leftArm.rotation.x = moving ? -walk * .42 : idle * .045;
    v.rightArm.rotation.x = moving ? walk * .42 : -idle * .045;
    if (fighter.blocking) {
      v.leftArm.rotation.x = -.72;
      v.rightArm.rotation.x = -.72;
      v.leftArm.rotation.z = -.3;
      v.rightArm.rotation.z = .3;
    } else {
      v.leftArm.rotation.z = 0;
      v.rightArm.rotation.z = 0;
    }
    if (fighter.attack) {
      if (fighter.attack.kind === "light") v.rightArm.rotation.x = -.15 - attackSwing * 1.55;
      if (fighter.attack.kind === "heavy") {
        v.rightArm.rotation.x = -.15 - attackSwing * 1.05;
        v.rightLeg.rotation.x = -attackSwing * .9;
      }
      if (fighter.attack.kind === "special") {
        v.leftArm.rotation.x = -.45 - attackSwing * 1.0;
        v.rightArm.rotation.x = -.45 - attackSwing * 1.25;
        v.attackGlow.visible = attackProgress > .14 && attackProgress < .82;
        v.attackGlow.scale.setScalar(.75 + attackSwing * .55);
        if (v.energyRing) v.energyRing.rotation.z += dt * 6;
      }
    } else {
      v.attackGlow.visible = false;
      v.rightLeg.rotation.x = -walk * .48 + jump * .42;
    }
    if (fighter.hitFlash > 0) v.body.position.x = Math.sin(elapsed * 78) * .04;
    else v.body.position.x = 0;
    v.auraRing.rotation.z += dt * (fighter.isEnemy ? -1.1 : .75);
    v.auraRing.material.opacity = .13 + (Math.sin(elapsed * 3.2) + 1) * .06 + (fighter.attack && fighter.attack.kind === "special" ? .24 : 0);
    if (v.headGroup) v.headGroup.rotation.z = idle * .018;
    if (v.mixer) v.mixer.update(dt);
    if (fighter.isEnemy) {
      v.root.position.y += Math.sin(elapsed * 3.5) * .055;
      v.body.rotation.x = Math.sin(elapsed * 2.7) * .035;
    }
  }

  function updateVisuals(dt) {
    if (player) animateOne(player, dt);
    if (enemy) animateOne(enemy, dt);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || 1200));
    const height = Math.max(240, Math.floor(rect.height || width * 9 / 16));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 600 ? 38 : 34;
    camera.updateProjectionMatrix();
  }

  function frame() {
    const dt = Math.min(.033, clock.getDelta());
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function setHeld(action, value) {
    if (action in held) held[action] = value;
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if ([" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
    if (keyMap[key]) setHeld(keyMap[key], true);
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
    if (keyMap[key]) setHeld(keyMap[key], false);
  });
  window.addEventListener("blur", () => Object.keys(held).forEach((key) => { held[key] = false; }));
  window.addEventListener("resize", resize);

  document.querySelectorAll(".character-pick").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCharacter = button.dataset.character;
      document.querySelectorAll(".character-pick").forEach((item) => item.classList.toggle("selected", item === button));
      if (mode === "intro") {
        ui.playerName.textContent = characters[selectedCharacter].name;
        resetMatch();
      }
    });
  });

  ui.start.addEventListener("click", openMissions);
  ui.missionStart.addEventListener("click", () => startMission(selectedMission));
  ui.missionBack.addEventListener("click", () => {
    mode = "intro";
    ui.missions.classList.add("hidden");
    ui.intro.classList.remove("hidden");
  });
  ui.missionCards.forEach((card) => card.addEventListener("click", () => {
    const index = Number(card.dataset.mission);
    if (index >= unlockedMission) return;
    selectedMission = index;
    missionIndex = index;
    updateMissionMenu();
    resetMatch();
  }));
  ui.rematch.addEventListener("click", startMatch);
  ui.nextMission.addEventListener("click", () => startMission(missionIndex + 1));
  ui.menu.addEventListener("click", openMissions);

  document.querySelectorAll(".touch-button").forEach((button) => {
    const action = button.dataset.action;
    const isHeld = ["left", "right", "jump", "guard"].includes(action);
    const down = (event) => {
      event.preventDefault();
      button.classList.add("active");
      if (isHeld) setHeld(action, true);
      else if (action === "light") queued.add("light");
      else if (action === "heavy") queued.add("heavy");
      else if (action === "special") queued.add("special");
    };
    const up = (event) => {
      event.preventDefault();
      button.classList.remove("active");
      if (isHeld) setHeld(action, false);
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointerleave", up);
    button.addEventListener("pointercancel", up);
  });

  const loader = new GLTFLoader();
  const modelHint = document.createElement("div");
  modelHint.className = "model-status";
  modelHint.textContent = "3D CHARACTER SYSTEM · SMOOTH ANIME MODELS";
  document.querySelector(".arena-caption")?.appendChild(modelHint);
  let yujiGltf = null;
  let yujiLoadStarted = false;
  function attachYujiGLB(fighter) {
    const attach = (gltf) => {
      if (!fighter || fighter.isEnemy || fighter.characterKey !== "yuji") return;
      const model = cloneSkinnedModel(gltf.scene);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      bounds.getSize(size);
      if (!size.y || !Number.isFinite(size.y)) return;
      model.scale.setScalar(2.12 / size.y);
      const scaledBounds = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      scaledBounds.getCenter(center);
      model.position.set(-center.x, -scaledBounds.min.y, -center.z);
      model.traverse((object) => {
        if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
      });
      fighter.visual.body.visible = false;
      fighter.visual.root.add(model);
      fighter.visual.externalModel = model;
      if (gltf.animations && gltf.animations.length) {
        fighter.visual.mixer = new THREE.AnimationMixer(model);
        fighter.visual.mixer.clipAction(gltf.animations[0]).play();
      }
      modelHint.textContent = "YUJI GLB LOADED · 3D MODEL ACTIVE";
    };
    if (yujiGltf) { attach(yujiGltf); return; }
    if (yujiLoadStarted) return;
    yujiLoadStarted = true;
    const modelUrl = new URL("./assets/characters/test-anime-fighter.glb", import.meta.url).href;
    loader.load(modelUrl, (gltf) => {
      yujiGltf = gltf;
      attach(gltf);
    }, undefined, () => {
      modelHint.textContent = "3D ANIME MODEL · GLB ASSET NOT IN REPOSITORY YET";
    });
  }

  resetMatch();
  resize();
  requestAnimationFrame(frame);
})();
