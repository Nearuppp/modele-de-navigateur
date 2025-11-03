// gamepad-controller.js
// Adds Xbox/controller support + vibration + interactive mapping UI for T-Rex Runner.
// Place this file in the same folder as index.html and index.js and include it AFTER index.js.
//
// Behaviour:
// - Polls navigator.getGamepads() each frame
// - Maps buttons to jump/duck by default (A=0 jump, B=1 duck, DPad up/down also supported)
// - Simulates keyboard events (Space / ArrowDown) so the original game works without modification
// - Vibrates controller on jump and on crash (if supported)
// - Shows a small UI overlay to display bindings and allows interactive remapping (saved to localStorage)

(() => {
  // --- Config / Defaults ---
  const LOCALSTORAGE_KEY = 'trex_gamepad_mapping_v1';
  const DEFAULT_MAPPING = { jump: 0, duck: 1, dpad_up: 12, dpad_down: 13 };
  const JUMP_HOLD_MS = 120;       // how long we hold Space keydown (ms)
  const VIBRATE_ON_JUMP = { duration: 100, strong: 0.8, weak: 0.3 };
  const VIBRATE_ON_CRASH = { duration: 400, strong: 1.0, weak: 0.6 };

  // --- State ---
  let mapping = loadMapping();
  let lastButtonStates = [];
  let jumpTimeoutId = null;
  let mappingMode = null; // null | 'jump' | 'duck'
  let currentGpIndex = null;
  let lastCrash = false;

  // --- Helpers: localStorage mapping ---
  function loadMapping() {
    try {
      const raw = localStorage.getItem(LOCALSTORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // fall back to defaults if incomplete
        return Object.assign({}, DEFAULT_MAPPING, parsed);
      }
    } catch (e) { /* ignore */ }
    return Object.assign({}, DEFAULT_MAPPING);
  }
  function saveMapping() {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(mapping));
    } catch (e) { console.warn('Failed to save mapping', e); }
  }

  // --- Helpers: synthetic keyboard events ---
  function simulateKeydown(key, keyCode) {
    const ev = new KeyboardEvent('keydown', {
      key,
      code: key === ' ' ? 'Space' : key,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(ev);
    document.dispatchEvent(ev);
    try { document.body.dispatchEvent(ev); } catch (e) {}
  }
  function simulateKeyup(key, keyCode) {
    const ev = new KeyboardEvent('keyup', {
      key,
      code: key === ' ' ? 'Space' : key,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(ev);
    document.dispatchEvent(ev);
    try { document.body.dispatchEvent(ev); } catch (e) {}
  }

  function simulateJump() {
    // dispatch keydown and schedule keyup
    simulateKeydown(' ', 32);
    if (jumpTimeoutId) clearTimeout(jumpTimeoutId);
    jumpTimeoutId = setTimeout(() => {
      simulateKeyup(' ', 32);
      jumpTimeoutId = null;
    }, JUMP_HOLD_MS);
    // vibration
    tryVibrate(VIBRATE_ON_JUMP);
  }

  function startDuck() { simulateKeydown('ArrowDown', 40); }
  function stopDuck() { simulateKeyup('ArrowDown', 40); }

  // --- Vibration ---
  function tryVibrate({ duration, strong, weak }) {
    // find a connected gamepad with vibration actuator
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gps.length; i++) {
      const gp = gps[i];
      if (!gp) continue;
      // standard actuator: gp.vibrationActuator.playEffect('dual-rumble', {...})
      try {
        const act = gp.vibrationActuator || gp.hapticActuators?.[0];
        if (act && typeof act.playEffect === 'function') {
          // Some implementations expect 'dual-rumble' + object with duration/strongMagnitude/weakMagnitude
          act.playEffect('dual-rumble', {
            duration: Math.max(10, duration),
            strongMagnitude: strong,
            weakMagnitude: weak
          }).catch(() => {});
          // vibrate first capable only
          return;
        }
      } catch (e) {
        // ignore and try next gamepad
      }
    }
  }

  // --- UI overlay for mapping + hints ---
  function createUI() {
    // top-left panel showing mapping & map buttons
    const panel = document.createElement('div');
    panel.id = 'gamepad-mapper';
    panel.style.position = 'absolute';
    panel.style.left = '12px';
    panel.style.top = '12px';
    panel.style.zIndex = 9999;
    panel.style.fontFamily = 'Arial, sans-serif';
    panel.style.fontSize = '12px';
    panel.style.background = 'rgba(0,0,0,0.45)';
    panel.style.color = '#fff';
    panel.style.padding = '8px';
    panel.style.borderRadius = '6px';
    panel.style.pointerEvents = 'auto';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = '6px';
    panel.style.minWidth = '170px';
    panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';

    function btn(label, onClick) {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.padding = '6px 8px';
      b.style.border = 'none';
      b.style.borderRadius = '4px';
      b.style.cursor = 'pointer';
      b.style.background = '#fff';
      b.style.color = '#222';
      b.addEventListener('click', onClick);
      return b;
    }

    const title = document.createElement('div');
    title.textContent = 'Controller';
    title.style.fontWeight = '700';
    title.style.marginBottom = '4px';
    panel.appendChild(title);

    const mappingRow = document.createElement('div');
    mappingRow.style.display = 'flex';
    mappingRow.style.flexDirection = 'column';
    mappingRow.style.gap = '4px';

    const jumpRow = document.createElement('div');
    jumpRow.style.display = 'flex';
    jumpRow.style.justifyContent = 'space-between';
    jumpRow.style.alignItems = 'center';
    const jumpLabel = document.createElement('div');
    jumpLabel.textContent = 'Jump:';
    const jumpVal = document.createElement('div');
    jumpVal.id = 'gamepad-mapping-jump';
    jumpVal.textContent = mapping.jump ?? '—';
    const jumpMapBtn = btn('Map Jump', () => startMapping('jump', jumpVal));
    jumpRow.appendChild(jumpLabel);
    jumpRow.appendChild(jumpVal);
    jumpRow.appendChild(jumpMapBtn);

    const duckRow = document.createElement('div');
    duckRow.style.display = 'flex';
    duckRow.style.justifyContent = 'space-between';
    duckRow.style.alignItems = 'center';
    const duckLabel = document.createElement('div');
    duckLabel.textContent = 'Duck:';
    const duckVal = document.createElement('div');
    duckVal.id = 'gamepad-mapping-duck';
    duckVal.textContent = mapping.duck ?? '—';
    const duckMapBtn = btn('Map Duck', () => startMapping('duck', duckVal));
    duckRow.appendChild(duckLabel);
    duckRow.appendChild(duckVal);
    duckRow.appendChild(duckMapBtn);

    mappingRow.appendChild(jumpRow);
    mappingRow.appendChild(duckRow);

    const extraRow = document.createElement('div');
    extraRow.style.display = 'flex';
    extraRow.style.gap = '6px';
    extraRow.style.marginTop = '6px';

    const resetBtn = btn('Reset', () => {
      mapping = Object.assign({}, DEFAULT_MAPPING);
      saveMapping();
      updateMappingUI();
    });
    const hintBtn = btn('Hide', () => {
      panel.style.display = 'none';
    });
    extraRow.appendChild(resetBtn);
    extraRow.appendChild(hintBtn);

    panel.appendChild(mappingRow);
    panel.appendChild(extraRow);

    // mapping overlay when waiting for button
    const mappingOverlay = document.createElement('div');
    mappingOverlay.id = 'gamepad-mapping-overlay';
    mappingOverlay.style.position = 'absolute';
    mappingOverlay.style.left = '50%';
    mappingOverlay.style.top = '50%';
    mappingOverlay.style.transform = 'translate(-50%,-50%)';
    mappingOverlay.style.zIndex = 10000;
    mappingOverlay.style.padding = '18px 22px';
    mappingOverlay.style.background = 'rgba(0,0,0,0.75)';
    mappingOverlay.style.color = '#fff';
    mappingOverlay.style.borderRadius = '8px';
    mappingOverlay.style.fontSize = '16px';
    mappingOverlay.style.display = 'none';
    mappingOverlay.style.pointerEvents = 'none';
    mappingOverlay.textContent = 'Press a controller button...';

    document.body.appendChild(panel);
    document.body.appendChild(mappingOverlay);

    // update displayed values from mapping
    function updateMappingUI() {
      const j = document.getElementById('gamepad-mapping-jump');
      const d = document.getElementById('gamepad-mapping-duck');
      if (j) j.textContent = mapping.jump !== undefined ? String(mapping.jump) : '—';
      if (d) d.textContent = mapping.duck !== undefined ? String(mapping.duck) : '—';
    }

    // show overlay while mapping
    function showMappingOverlay(show, text) {
      mappingOverlay.style.display = show ? 'block' : 'none';
      if (text) mappingOverlay.textContent = text;
    }

    // Expose functions
    return {
      updateMappingUI,
      showMappingOverlay,
      panel
    };
  }

  // create UI and cached update function
  let ui;
  function ensureUI() {
    if (!ui) {
      try { ui = createUI(); } catch (e) { console.warn('Failed to create mapping UI', e); }
    }
    ui && ui.updateMappingUI();
  }

  // Start a mapping operation
  function startMapping(action, valueDom) {
    mappingMode = action; // 'jump' or 'duck'
    ensureUI();
    ui.showMappingOverlay(true, `Press a controller button to map ${action.toUpperCase()}`);
    // The poll loop will capture the first justPressed button and assign it.
  }

  // --- Poll loop: detect gamepad input & mapping ---
  function pollGamepads() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    if (!gps) {
      requestAnimationFrame(pollGamepads);
      return;
    }

    // pick the first connected gamepad
    let gp = Array.from(gps).find(g => g && g.connected) || null;
    if (!gp) {
      // no gamepad; reset state
      lastButtonStates = [];
      currentGpIndex = null;
      requestAnimationFrame(pollGamepads);
      return;
    }

    // record current gamepad index for vibration fallback
    currentGpIndex = gp.index;

    // keep focus on window to ensure synthetic key events delivered
    try { window.focus(); } catch (e) {}

    const cur = gp.buttons.map(b => !!b.pressed);

    // init lastButtonStates if empty
    if (lastButtonStates.length === 0) lastButtonStates = cur.slice();

    function justPressed(idx) {
      return Boolean(cur[idx] && !lastButtonStates[idx]);
    }
    function justReleased(idx) {
      return Boolean(!cur[idx] && lastButtonStates[idx]);
    }

    // --- If mapping mode active, map the first justPressed button ---
    if (mappingMode) {
      // find first index that changed from false->true
      let assigned = null;
      for (let i = 0; i < cur.length; i++) {
        if (justPressed(i)) { assigned = i; break; }
      }
      // also check DPad axes mapping maybe reported as buttons in many controllers
      if (assigned === null) {
        // sometimes axes are used; check axes if they cross threshold (rare for mapping)
        const axes = gp.axes || [];
        for (let a = 0; a < axes.length; a++) {
          if (Math.abs(axes[a]) > 0.9) {
            // assign negative/positive axis as pseudo-button using index offset
            // but we don't support axes mapping to numeric index here - skip
          }
        }
      }
      if (assigned !== null) {
        mapping[mappingMode] = assigned;
        saveMapping();
        if (ui) {
          ui.updateMappingUI();
          ui.showMappingOverlay(false);
        }
        mappingMode = null;
      } else {
        // remain in mapping mode and wait
      }
      lastButtonStates = cur.slice();
      requestAnimationFrame(pollGamepads);
      return;
    }

    // --- Normal operation: handle jump/duck using mapping ---

    // Jump triggers: mapped button or dpad_up
    const jumpBtnIdx = mapping.jump;
    const dpadUpIdx = mapping.dpad_up;
    if ((jumpBtnIdx !== undefined && justPressed(jumpBtnIdx)) ||
        (dpadUpIdx !== undefined && justPressed(dpadUpIdx))) {
      simulateJump();
    }

    // Duck start/stop for mapping.duck and dpad_down
    const duckBtnIdx = mapping.duck;
    const dpadDownIdx = mapping.dpad_down;

    // duck by button
    if (duckBtnIdx !== undefined) {
      if (cur[duckBtnIdx] && !lastButtonStates[duckBtnIdx]) startDuck();
      if (!cur[duckBtnIdx] && lastButtonStates[duckBtnIdx]) stopDuck();
    }
    // duck by dpad down
    if (dpadDownIdx !== undefined) {
      if (cur[dpadDownIdx] && !lastButtonStates[dpadDownIdx]) startDuck();
      if (!cur[dpadDownIdx] && lastButtonStates[dpadDownIdx]) stopDuck();
    }

    // Axis-based duck (left stick vertical) if axes present
    if (gp.axes && gp.axes.length > 1) {
      const v = gp.axes[1];
      const DEAD = 0.4;
      if (v > DEAD) {
        startDuck();
      } else {
        stopDuck();
      }
    }

    // --- Crash detection (if T-Rex exposes Runner.instance_) ---
    try {
      const runner = window.Runner && window.Runner.instance_;
      if (runner) {
        const crashed = !!runner.crashed;
        if (crashed && !lastCrash) {
          // just crashed
          tryVibrate(VIBRATE_ON_CRASH);
        }
        lastCrash = crashed;
      }
    } catch (e) { /* ignore */ }

    lastButtonStates = cur.slice();
    requestAnimationFrame(pollGamepads);
  }

  // --- Connect / Disconnect handlers ---
  window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected', e.gamepad);
    ensureUI();
    if (ui) ui.updateMappingUI();
    // ensure we start polling immediately if necessary
  });
  window.addEventListener('gamepaddisconnected', (e) => {
    console.log('Gamepad disconnected', e.gamepad);
    lastButtonStates = [];
    // stop duck if it was active
    stopDuck();
  });

  // --- Initialize UI and start loop when DOM ready ---
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { ensureUI(); requestAnimationFrame(pollGamepads); });
  } else {
    ensureUI();
    requestAnimationFrame(pollGamepads);
  }

  // Small initial hint (disappear after few seconds)
  (function showHintOnce() {
    try {
      const id = 'gamepad-hint-001';
      if (document.getElementById(id)) return;
      const h = document.createElement('div');
      h.id = id;
      h.style.position = 'absolute';
      h.style.right = '12px';
      h.style.top = '12px';
      h.style.zIndex = 9998;
      h.style.fontFamily = 'Arial, sans-serif';
      h.style.fontSize = '12px';
      h.style.background = 'rgba(0,0,0,0.45)';
      h.style.color = '#fff';
      h.style.padding = '6px 10px';
      h.style.borderRadius = '6px';
      h.style.pointerEvents = 'none';
      h.textContent = 'Controller: Press "Map Jump" to bind buttons';
      document.body.appendChild(h);
      setTimeout(() => { h.style.display = 'none'; }, 4000);
    } catch (e) {}
  })();

})();
