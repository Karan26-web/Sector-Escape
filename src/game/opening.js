// ---------------------------------------------------------------------------
// The opening (user 2026-10-27), after Play on a new game. The interaction is
// suspended (only Skip, and a tap to hurry a line on) until Karan reaches the
// first arena; then the scene hands him to the player.
//  1 KARAN IS STRANDED – on the islet at the causeway's west end, water all
//    round; he looks around.
//  2 KARAN NOTICES THE TEMPLE – the camera turns to the distant temple, a beam
//    of light rises from it, the camera closes in a little.
//  3 THE PATH IS BLOCKED – he sets off along the causeway; at the first arena
//    the camera rises over the chain of arenas between him and the temple, then
//    comes down behind him: exactly where the walk camera takes over.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { CHAIN } from './levels.js';
import { walkPose } from './roam.js';
import { delay } from '../engine/tween.js';
import { Ease, polar } from '../engine/util.js';
import { audio } from '../engine/audio.js';
import { ui } from '../ui/ui.js';

// The lines, each with its recorded voice-over (user 2026-11-05) and the caption shown with it, word for word what is said
// (scene 3's two lines follow the recording: "But the temple is guarded…" and "…fight my way through. With maths!").
// mood picks Karan's portrait: 0 worried · 1 surprised · 2 determined.
const LINES = {
  stranded: { who: 'narrator', line: 'open-lost', text: 'Karan has lost his way deep inside an ancient jungle island.' },
  noWayBack: { who: 'karan', line: 'k-no-way', mood: 0, text: 'There’s no way back… I need to find another way out.' },
  light: { who: 'karan', line: 'k-light', mood: 1, text: 'Wait… what’s that light?' },
  temple: { who: 'karan', line: 'k-temple', mood: 2, text: 'There’s a temple ahead. If there’s a way off this island, it must be there.' },
  guarded: { who: 'narrator', line: 'open-guarded', text: 'But the temple is guarded. Seven stone courts stand in his way.' },
  maths: { who: 'karan', line: 'k-maths', mood: 2, text: 'Looks like I’ll have to fight my way through. With maths!' },
};
const say = (k) => { const l = LINES[k]; return ui.cine.say(l.who, l.text, { mood: l.mood ?? 0, line: l.line }); };
const SKIP = Symbol('skip');

/** The walk to the gate's camera (low behind him, the gate ahead); the opening ends on it. */
export const CAUSEWAY_VIEW = { dist: 6.5, height: 4.6, ahead: 3.5, fov: 54 };
/** Where the opening hands Karan to the player: on the causeway, the first arena's gate 22 m ahead. */
export function handoverPoint() { const cw = CHAIN.causeway, p = polar(cw.dirDeg + 180, 22); return new THREE.Vector3(cw.gate.x + p.x, 0, cw.gate.z + p.z); }

/** Plays the three scenes inside arena 1's scene (scene.s() ends it if the player quits). Resolves with Karan at the
 *  hand-over point and the camera on the walk pose, whether it played through or was skipped. */
export async function playOpening(scene) {
  const { world, hero, chain, rig } = scene, cw = CHAIN.causeway, I = chain.islet;
  const portrait = world.camera.aspect < 0.8, fov = (f) => (portrait ? Math.min(78, f * 1.4) : f);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), at = (p, x, y, z) => V(p.x + x, y, p.z + z);
  const ahead = scene.dirDeg(cw.dirDeg), side = V(-ahead.z, 0, ahead.x), start = V(I.x - 1.2, 0, I.z + 0.6), hand = handoverPoint();
  let skipped = false, onSkip = null; const skipP = new Promise((r) => { onSkip = r; });
  ui.skip.show(() => { skipped = true; ui.cine.cancel(); onSkip(); });
  ui.cine.start();
  chain.setTitleMode(true, { camPos: start });   // the lake mist, warm torch light on the causeway's first stones
  audio.music.setMode('calm');
  hero.stop(); hero.setPosition(start); hero.face(V(-1, 0, 0.4));

  const scenes = async () => {
    const go = async (p) => { const v = await scene.s(p); if (skipped) throw SKIP; return v; };
    // ---- 1 KARAN IS STRANDED: high over the water, closing in on the islet
    scene.setPhase('opening.stranded');
    rig.setPose({ pos: at(I, -12, 22, 26), target: at(I, 0, 0.5, 0), fov: fov(46) });
    rig.moveTo({ pos: at(start, -9, 9.5, 12), target: at(start, 0, 1.0, 0), fov: fov(44) }, 7, Ease.inOutSine);
    await go(delay(0.8));
    await go(say('stranded'));
    // he looks around (the camera circles him, low): water on every side
    const t0 = world.elapsed, a0 = 235, a1 = 112, T = 6;
    rig.follow((out) => {
      const k = Math.min(1, (world.elapsed - t0) / T), e = k * k * (3 - 2 * k), p = polar(a0 + (a1 - a0) * e, 6.4);
      out.pos.set(hero.pos.x + p.x, 2.2 + 0.5 * Math.sin(k * Math.PI), hero.pos.z + p.z); out.target.copy(hero.pos).setY(1.0); out.fov = fov(48); return out;
    }, 2.2);
    for (const [wait, dir] of [[0.5, V(0.3, 0, 1)], [1.7, V(-1, 0, -0.2)], [1.7, V(0.2, 0, -1)]]) { await go(delay(wait)); hero.face(dir); }
    await go(delay(1.6));
    // he faces us, the water behind him
    hero.face(V(0, 0, -1));
    await go(rig.moveTo({ pos: at(hero.pos, 0, 1.75, -4.4), target: at(hero.pos, 0, 1.2, 0), fov: fov(42) }, 1.4, Ease.inOutCubic));
    await go(say('noWayBack'));

    // ---- 2 KARAN NOTICES THE TEMPLE: over his shoulder toward it; a beam of light rises from it
    scene.setPhase('opening.temple');
    hero.face(ahead);
    await go(rig.moveTo({ pos: at(hero.pos, -4.4 * ahead.x + 2 * side.x, 2.0, -4.4 * ahead.z + 2 * side.z), target: V(cw.gate.x + ahead.x * 30, 9, cw.gate.z + ahead.z * 30), fov: fov(46) }, 1.8, Ease.inOutCubic));
    const beam = chain.riseBeam(2.6);
    await go(delay(0.8));
    await go(say('light'));
    // the camera closes in a little on the temple
    const peak = chain.templePeak();
    rig.moveTo({ pos: at(hero.pos, -3.2 * ahead.x + 1.4 * side.x, 2.2, -3.2 * ahead.z + 1.4 * side.z), target: peak.setY(peak.y - 26), fov: fov(24) }, 3.2, Ease.inOutSine);
    await go(delay(0.6));
    await go(say('temple'));
    await go(beam);

    // ---- 3 THE PATH IS BLOCKED: he sets off along the causeway…
    scene.setPhase('opening.path');
    audio.music.setMode('explore');
    rig.follow((out) => { out.pos.copy(hero.pos).addScaledVector(ahead, -6.5).addScaledVector(side, 2.4).setY(3.3); out.target.copy(hero.pos).addScaledVector(ahead, 7).setY(1.4); out.fov = fov(54); return out; }, 2.6);
    await go(hero.runTo(hand, 5.4));
    hero.face(ahead);
    // …reaches the first arena, and the camera rises over the chain of arenas between him and the temple
    // (the rings fill the middle of the frame, the temple and its beam close it at the top)
    rig.moveTo({ pos: at(hand, -10 * ahead.x + 26 * side.x, 30, -10 * ahead.z + 26 * side.z), target: V(cw.gate.x + ahead.x * 95 - side.x * 2, 6, cw.gate.z + ahead.z * 95 - side.z * 2), fov: fov(52) }, 6.5, Ease.inOutSine);
    await go(delay(0.9));
    await go(say('guarded'));
    // down behind him again: the pose the player's walk camera starts from
    await go(rig.moveTo(walkPose(hand, cw.dirDeg, CAUSEWAY_VIEW, world.camera.aspect), 2.2, Ease.inOutCubic));
    await go(say('maths'));
  };
  const played = scenes().catch((e) => { if (e !== SKIP) throw e; });
  await Promise.race([played, skipP]);
  ui.skip.hide();
  if (skipped) {   // straight to the hand-over, as if every scene had played
    hero.stop(); hero.setPosition(hand); hero.face(ahead); chain.setBeam(true); audio.music.setMode('explore');
    rig.setPose(walkPose(hand, cw.dirDeg, CAUSEWAY_VIEW, world.camera.aspect));   // (a cut)
  }
  ui.cine.end();
  chain.setTitleMode(false, { dur: 1.5 }); chain.setActiveArena(scene.index);   // (the torch lights go back to ring 1)
}
