// Keyboard + mouse input with edge detection (pressed / released).
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseDown = false;
    this.mousePressed = false;
    this.mouseX = 0; this.mouseY = 0;
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouseDown = true; this.mousePressed = true; }
      this.mouseX = e.clientX; this.mouseY = e.clientY;
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });
  }
  down(code) { return this.keys.has(code); }
  hit(code) { return this.pressed.has(code); }
  axis() {
    let x = 0, z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    return { x, z };
  }
  endFrame() { this.pressed.clear(); this.mousePressed = false; }
}
