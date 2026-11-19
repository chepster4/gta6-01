// Keyboard and pointer input. Held keys give a steering direction; one-shot
// presses (steal, fight, radio, pause, mute) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.

export const ACTION_STEAL = 1;
export const ACTION_FIGHT = 2;
export const ACTION_RADIO = 4;
export const ACTION_PAUSE = 8;
export const ACTION_MUTE = 16;
export const ACTION_CONFIRM = 32;

const FORWARD = new Set(['ArrowUp', 'KeyW']);
const BACK = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const HANDBRAKE = new Set(['Space']);

export function createInput() {
  const held = new Set();
  let actions = 0;

  function press(code) {
    if (code === 'KeyE') actions |= ACTION_STEAL;
    else if (code === 'KeyF') actions |= ACTION_FIGHT;
    else if (code === 'KeyR') actions |= ACTION_RADIO;
    else if (code === 'KeyP' || code === 'Escape') actions |= ACTION_PAUSE;
    else if (code === 'KeyM') actions |= ACTION_MUTE;
    else if (code === 'Enter') actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', (event) => {
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code)
      || RIGHT.has(event.code) || RUN.has(event.code) || HANDBRAKE.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
    } else if (event.code === 'KeyE' || event.code === 'KeyF' || event.code === 'KeyR'
      || event.code === 'KeyP' || event.code === 'Escape' || event.code === 'KeyM'
      || event.code === 'Enter') {
      if (!event.repeat) press(event.code);
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => { held.delete(event.code); });
  window.addEventListener('blur', () => { held.clear(); });
  window.addEventListener('mousedown', (event) => {
    if (event.button === 0) actions |= ACTION_FIGHT;
  });

  const has = (set) => { for (const code of set) if (held.has(code)) return true; return false; };

  return {
    /** -1 back, 1 forward, 0 neither. */
    throttle() { return (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0); },
    /** -1 left, 1 right, 0 neither. */
    steer() { return (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0); },
    running() { return has(RUN); },
    handbrake() { return has(HANDBRAKE); },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
