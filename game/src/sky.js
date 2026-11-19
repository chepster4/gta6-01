// The sky: a gradient dome (never a flat colour), a sun disc by day, a moon
// disc by night, slow-drifting clouds and stars that only show after dark.
// All sky materials ignore fog so the horizon never turns to grey mush.
import * as THREE from '../vendor/three.min.js';

// Day runs 06:00–17:00, dusk 17:00–19:30, night 19:30–06:00.
function modeFor(minutes) {
  if (minutes >= 360 && minutes < 1020) return 'day';
  if (minutes >= 1020 && minutes < 1170) return 'dusk';
  return 'night';
}

function lerpColor(a, b, t, out) {
  out.copy(a).lerp(b, t);
  return out;
}

export function createSky(scene) {
  // Gradient dome: a big sphere whose vertex colours run horizon -> zenith.
  const domeGeo = new THREE.SphereGeometry(900, 24, 12);
  const colors = new Float32Array(domeGeo.attributes.position.count * 3);
  const top = new THREE.Color(0x3a7bd5);
  const horizon = new THREE.Color(0xbfe3f2);
  const pos = domeGeo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i) / 900;
    const t = Math.max(0, Math.min(1, y * 1.4 + 0.15));
    const c = new THREE.Color().copy(horizon).lerp(top, t);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  domeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  scene.add(dome);

  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(34, 24), sunMat);
  sun.position.set(420, 320, -700);
  sun.lookAt(0, 0, 0);
  scene.add(sun);

  const moonMat = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(22, 24), moonMat);
  moon.position.set(-380, 380, -680);
  moon.lookAt(0, 0, 0);
  scene.add(moon);

  // Stars: points on the upper dome, invisible by day.
  const starCount = 420;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const e = 0.15 + Math.random() * 1.2;
    const r = 880;
    starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    starPos[i * 3 + 1] = Math.sin(e) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, fog: false, transparent: true, opacity: 0 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Clouds: flat white puffs drifting slowly across the dome.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  const clouds = [];
  for (let i = 0; i < 14; i += 1) {
    const group = new THREE.Group();
    const puffs = 3 + (i % 3);
    for (let j = 0; j < puffs; j += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(14 + (j % 3) * 7, 8, 6), cloudMat);
      puff.position.set(j * 16 - 20, (j % 2) * 4, (j % 3) * 8 - 8);
      puff.scale.y = 0.45;
      group.add(puff);
    }
    group.position.set(-700 + (i * 137) % 1400, 190 + (i % 5) * 26, -600 + (i * 211) % 1100);
    scene.add(group);
    clouds.push(group);
  }

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a2f26, 0.9);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xfff2cc, 1.6);
  sunLight.position.set(180, 260, 120);
  scene.add(sunLight);
  const nightFill = new THREE.PointLight(0xffc880, 0, 90, 1.6);
  scene.add(nightFill);

  const dayTop = new THREE.Color(0x3a7bd5);
  const dayHorizon = new THREE.Color(0xbfe3f2);
  const duskTop = new THREE.Color(0x5a3a6e);
  const duskHorizon = new THREE.Color(0xff9a5c);
  const nightTop = new THREE.Color(0x050914);
  const nightHorizon = new THREE.Color(0x1a2440);
  const tmp = new THREE.Color();

  function paintDome(topC, horizonC) {
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i) / 900;
      const t = Math.max(0, Math.min(1, y * 1.4 + 0.15));
      lerpColor(horizonC, topC, t, tmp);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    domeGeo.attributes.color.needsUpdate = true;
  }

  let lastMode = '';
  return {
    mode: 'day',
    /** Set the sky for a clock time in minutes since midnight. */
    setTime(minutes) {
      const mode = modeFor(minutes);
      this.mode = mode;
      if (mode === lastMode) return;
      lastMode = mode;
      if (mode === 'day') {
        paintDome(dayTop, dayHorizon);
        sun.visible = true; moon.visible = false;
        starMat.opacity = 0;
        hemi.intensity = 0.9; sunLight.intensity = 1.6; sunLight.color.set(0xfff2cc);
        scene.fog = new THREE.Fog(0xa8d0e8, 320, 850);
        cloudMat.opacity = 0.85;
      } else if (mode === 'dusk') {
        paintDome(duskTop, duskHorizon);
        sun.visible = true; moon.visible = false;
        starMat.opacity = 0.25;
        hemi.intensity = 0.55; sunLight.intensity = 0.9; sunLight.color.set(0xffb070);
        scene.fog = new THREE.Fog(0xc07850, 300, 800);
        cloudMat.opacity = 0.7;
      } else {
        paintDome(nightTop, nightHorizon);
        sun.visible = false; moon.visible = true;
        starMat.opacity = 0.9;
        hemi.intensity = 0.28; sunLight.intensity = 0.35; sunLight.color.set(0x8fa8ff);
        scene.fog = new THREE.Fog(0x0a1026, 260, 780);
        cloudMat.opacity = 0.35;
      }
    },
    /** Drift the clouds and keep the night fill light over the player. */
    update(dt, playerX, playerZ) {
      for (const cloud of clouds) {
        cloud.position.x += dt * 2.2;
        if (cloud.position.x > 760) cloud.position.x = -760;
      }
      if (this.mode === 'night' || this.mode === 'dusk') {
        nightFill.intensity = this.mode === 'night' ? 60 : 25;
        nightFill.position.set(playerX, 26, playerZ + 8);
      } else {
        nightFill.intensity = 0;
      }
    },
  };
}
