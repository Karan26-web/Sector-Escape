// ---------------------------------------------------------------------------
// DEV ONLY: temporary "Skip ring" button for playtesting. REMOVE BEFORE PUSHING:
//   1. delete this file (src/dev/skip-level.js)
//   2. delete its <script> line at the bottom of index.html
// (src/dev is also listed in .vercelignore, and the button only appears on localhost / 127.0.0.1 or with ?dev=1.)
//
// Skipping = the exact area is fired for you, so the normal win path plays (the charge, the barrier breaking, the reward
// path, progress save, walk into the next ring) and the game state stays consistent. Clicked before the question is up,
// it waits for it.
// ---------------------------------------------------------------------------
import { sectorArea } from '../game/levels.js';

const enabled = ['localhost', '127.0.0.1', ''].includes(location.hostname) || new URLSearchParams(location.search).has('dev');
const ARENA_PHASES = ['gate', 'inside', 'arrive', 'observe', 'tactical', 'scan', 'input', 'firing', 'result', 'cleared'];

if (enabled) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = 'DEV: answer this ring correctly and move on';
  Object.assign(btn.style, {
    position: 'fixed', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 9999, display: 'none',
    padding: '9px 14px', borderRadius: '10px', border: '2px dashed #f4bf55', background: 'rgba(20, 14, 4, 0.85)',
    color: '#f4bf55', font: '700 14px/1 "Barlow Condensed", "Arial Narrow", sans-serif', letterSpacing: '0.1em',
    textTransform: 'uppercase', cursor: 'pointer', pointerEvents: 'auto',
  });
  document.body.appendChild(btn);

  let queued = false, pressNext = false;
  const label = () => { btn.textContent = queued ? 'DEV · skipping…' : 'DEV · Skip ring ⏭'; };
  label();
  btn.addEventListener('click', () => { queued = true; label(); });

  setInterval(() => {
    const se = window.__se, scene = se && se.scene, phase = se && se.phase;
    const inArena = !!scene && ARENA_PHASES.includes(phase);
    btn.style.display = inArena || queued ? 'block' : 'none';
    if (pressNext && phase === 'cleared') { const b = document.getElementById('btn-ar-next'); if (b) { pressNext = false; b.click(); } }   // past the results card
    if (!queued || !scene) return;
    if (phase === 'input') {
      se.fire(String(sectorArea(scene.R, scene.A.theta)));
      queued = false; pressNext = true; label();
    }
    if (!inArena && phase !== 'exit') { queued = false; label(); }   // left the ring some other way (quit, game over)
  }, 200);
}
