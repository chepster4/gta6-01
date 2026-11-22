// Police: wanted 1–5, ground pursuit cars, CONDOR-1 police helicopter
// (wanted 3+, night searchlight) and roadblocks (wanted 3+).
const THREE = window.THREE;

export class Police {
  constructor(scene, G) {
    this.scene = scene; this.G = G;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.cars = [];
    this.roadblock = null;
    this.rbTimer = 0;
    this._heli();
  }
  _heli() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 5.2), new THREE.MeshLambertMaterial({ color: 0x33507a }));
    g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2.2), new THREE.MeshLambertMaterial({ color: 0x9ad8f0 }));
    cabin.position.set(0, 0.2, -2.0); g.add(cabin);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 4.4), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
    tail.position.set(0, 0.3, 4.4); g.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 1.2), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
    fin.position.set(0, 1.2, 6.4); g.add(fin);
    const skidMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    for (const sx of [-1.2, 1.2]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 4), skidMat);
      skid.position.set(sx, -1.2, 0); g.add(skid);
    }
    this.rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    this.rotor.position.y = 1.4; g.add(this.rotor);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    tailRotor.position.set(0.6, 0.6, 6.4); g.add(tailRotor);
    this.tailRotor = tailRotor;
    // Searchlight: spotlight + visible cone.
    this.spot = new THREE.SpotLight(0xfff2b0, 0, 90, 0.32, 0.45, 1.2);
    this.spot.position.set(0, -0.8, -1);
    g.add(this.spot);
    this.spotTarget = new THREE.Object3D();
    this.spotTarget.position.set(0, -40, 0);
    g.add(this.spotTarget);
    this.spot.target = this.spotTarget;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(7, 42, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })
    );
    cone.rotation.x = Math.PI;
    cone.position.y = -21;
    g.add(cone);
    this.lightCone = cone;
    const decal = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.5, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    decal.position.set(0, -0.4, -1.4); g.add(decal);
    g.visible = false;
    this.heli = g;
    this.heliPos = { x: 0, z: 0, y: 55 };
    this.group.add(g);
  }
  _spawnCar() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.3), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
    body.position.y = 0.65; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2), new THREE.MeshLambertMaterial({ color: 0x9ad8f0 }));
    cab.position.y = 1.3; g.add(cab);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.y = 1.85; g.add(bar);
    this.lightBar = bar;
    this.group.add(g);
    const p = this.G.player.pos;
    const a = Math.random() * Math.PI * 2;
    const car = { mesh: g, x: p.x + Math.sin(a) * 60, z: p.z + Math.cos(a) * 60, angle: a, speed: 0, hp: 80 };
    this.cars.push(car);
    return car;
  }
  _spawnRoadblock(player) {
    this._clearRoadblock();
    const g = new THREE.Group();
    // Two police cars parked across the road ahead of the player.
    const aheadX = player.pos.x - Math.sin(player.angle) * 24;
    const aheadZ = player.pos.z - Math.cos(player.angle) * 24;
    const perp = player.angle + Math.PI / 2;
    for (const off of [-4.5, 4.5]) {
      const c = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.3), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
      body.position.y = 0.65; c.add(body);
      // White door stripe + red/blue light bar so the cars read at dusk.
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.4, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      stripe.position.y = 0.75; c.add(stripe);
      const lbR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      lbR.position.set(-0.35, 1.25, 0); c.add(lbR);
      const lbB = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      lbB.position.set(0.35, 1.25, 0); c.add(lbB);
      c.position.set(aheadX + Math.sin(perp) * off, 0, aheadZ + Math.cos(perp) * off);
      c.rotation.y = perp;
      g.add(c);
    }
    // Barricades + cones between them.
    const barMat = new THREE.MeshLambertMaterial({ color: 0xd84a2a });
    for (const off of [-1.5, 1.5]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 0.5), barMat);
      bar.position.set(aheadX + Math.sin(perp) * off, 0.55, aheadZ + Math.cos(perp) * off);
      bar.rotation.y = perp;
      g.add(bar);
    }
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xff7722 });
    for (const off of [-8, -6, 6, 8]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 8), coneMat);
      cone.position.set(aheadX + Math.sin(perp) * off, 0.55, aheadZ + Math.cos(perp) * off);
      g.add(cone);
    }
    this.group.add(g);
    this.roadblock = { group: g, x: aheadX, z: aheadZ };
    this.G.hud.flash('ROADBLOCK AHEAD — police barricade!');
  }
  _clearRoadblock() {
    if (!this.roadblock) return;
    this.group.remove(this.roadblock.group);
    this.roadblock = null;
  }
  update(dt, player) {
    const wanted = player.wanted;
    // Ground units: count = wanted (cap 4).
    const wantCars = Math.min(4, wanted);
    while (this.cars.length < wantCars) this._spawnCar();
    while (this.cars.length > wantCars) {
      const c = this.cars.pop();
      this.group.remove(c.mesh);
    }
    // Chase.
    for (const c of this.cars) {
      const dx = player.pos.x - c.x, dz = player.pos.z - c.z;
      const dist = Math.hypot(dx, dz) || 1;
      const targetAngle = Math.atan2(dx, dz);
      let da = targetAngle - c.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      c.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, da));
      const top = player.car ? 30 : 24;
      c.speed += (top - c.speed) * dt * 0.8;
      c.x += Math.sin(c.angle) * c.speed * dt;
      c.z += Math.cos(c.angle) * c.speed * dt;
      const hit = this.G.city.collide(c.x, c.z, 1.6);
      c.x = hit.x; c.z = hit.z;
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.angle;
      // Ram / bust the player.
      if (dist < 3.4) {
        if (player.car) this.G.vehicles.damageCar(player.car, 14 * dt);
        else { player.hp -= 9 * dt; this.G.audio.hurt(); }
      }
    }
    // Helicopter: wanted 3+.
    const heliOn = wanted >= 3;
    this.heli.visible = heliOn;
    if (heliOn) {
      const tx = player.pos.x, tz = player.pos.z;
      this.heliPos.x += (tx - this.heliPos.x) * dt * 0.7;
      this.heliPos.z += (tz - this.heliPos.z) * dt * 0.7;
      this.heliPos.y = 34 + Math.sin(performance.now() * 0.001) * 3;
      this.heli.position.set(this.heliPos.x, this.heliPos.y, this.heliPos.z);
      this.heli.rotation.y = Math.atan2(tx - this.heliPos.x, tz - this.heliPos.z) + Math.PI;
      this.rotor.rotation.y += dt * 22;
      this.tailRotor.rotation.x += dt * 30;
      const night = this.G.sky.mode === 'night' || this.G.sky.mode === 'dusk';
      this.spot.intensity = night ? 2.2 : 0;
      this.lightCone.visible = night;
      // Heli pins the player: wanted decays slower while it watches.
      this.G._heliWatch = true;
    } else this.G._heliWatch = false;
    // Roadblock: wanted 3+, refresh every 14 s.
    this.rbTimer -= dt;
    if (wanted >= 3 && !this.roadblock && this.rbTimer <= 0) {
      this._spawnRoadblock(player);
      this.rbTimer = 14;
    }
    if (wanted < 3 && this.roadblock) { this._clearRoadblock(); this.rbTimer = 6; }
    if (this.roadblock) {
      const dx = player.pos.x - this.roadblock.x, dz = player.pos.z - this.roadblock.z;
      if (dx * dx + dz * dz > 120 * 120) this._clearRoadblock();
    }
    this.G.audio.siren(wanted > 0);
  }
  nearestCop(px, pz, angle, range) {
    let best = null, bd = range * range;
    for (const c of this.cars) {
      const dx = c.x - px, dz = c.z - pz;
      const d = dx * dx + dz * dz;
      if (d > bd) continue;
      const facing = Math.atan2(dx, dz);
      let da = Math.abs(facing - angle);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da < 0.4) { bd = d; best = { kind: 'cop', ref: c, x: c.x, z: c.z, hp: c.hp }; }
    }
    return best;
  }
  damageCop(car, dmg) {
    car.hp -= dmg;
    if (car.hp <= 0) {
      car.hp = 80;
      const p = this.G.player.pos;
      const a = Math.random() * Math.PI * 2;
      car.x = p.x + Math.sin(a) * 70; car.z = p.z + Math.cos(a) * 70;
    }
  }
}
