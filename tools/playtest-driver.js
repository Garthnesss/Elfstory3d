// Playtest driver for ElfStory 3D (dev only; not part of the game build).
// Load in the dev server's page console (npm run dev, then in the browser):
//   eval(await (await fetch('/@fs' + '/Users/gerth/Projects/elfstory3d/tools/playtest-driver.js')).text())
// Reads React state from the App fiber (__S, __st, __logs), presses keys (__key),
// walks (__goto), fights (__fight), clears floors (__clearFloor) and runs a
// whole session with auto-gearing + point spending (__run, results in __R).
// It bump-attacks only: it never casts skills or shops. Hacky by design.

(() => {
const app = () => { const root=document.getElementById('root'); const k=Object.keys(root).find(k=>k.startsWith('__reactContainer$')); const st=[root[k]]; while(st.length){const x=st.pop(); if(!x) continue; const nm=x.type&&(x.type.displayName||x.type.name); if(nm==='App') return x; if(x.sibling) st.push(x.sibling); if(x.child) st.push(x.child);} };
window.__S = () => { let h=app().memoizedState; const o={}; while(h){const v=h.memoizedState; if(v&&typeof v==='object'&&!Array.isArray(v)){ if('hp' in v&&'maxHp' in v&&'level' in v) o.p=v; else if(v.oakhaven&&v.oakhaven.tiles) o.z=v; else if(v.shadows_beneath) o.q=v; } else if(Array.isArray(v)&&v.length>5&&v[0]&&typeof v[0]==='object'&&'text' in v[0]&&!('until' in v[0])) o.logs=v; else if(typeof v==='string'){ if(/^(oakhaven|overworld|dungeon_|thornwick|highspire|cinderwatch|barrow_|mire_|frost_)/.test(v)) o.zid=v; if(/^(TITLE|PLAYING|PAUSED|GAME_OVER|VICTORY)$/.test(v)) o.gs=v;} h=h.next;} o.zone=o.z&&o.z[o.zid]; return o; };
window.__st = () => { const o=__S(); const z=o.zone, p=o.p; const en=z?z.enemies.filter(e=>z.tiles[e.y][e.x].visible).map(e=>`${e.name} ${e.hp}/${e.maxHp} @${e.x},${e.y}`):[]; return {gs:o.gs, zone:o.zid, hp:`${p.hp}/${p.maxHp}`, mp:`${p.mana}/${p.maxMana}`, lv:p.level, xp:p.xp, gold:p.gold, pos:`${p.x},${p.y}`, turn:p.turnsElapsed, enemies:en}; };
window.__logs = (n=10) => (__S().logs||[]).slice(0,n).map(l=>`T${l.turn??'?'} ${l.text}`);
window.__key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', {key:k, bubbles:true}));
window.__sleep = (ms) => new Promise(r=>setTimeout(r,ms));
window.__fight = async (maxTurns=40) => { let minHp=1e9; for (let i=0;i<maxTurns;i++){ const s=__st(); if(s.gs!=='PLAYING') break; if(!s.enemies.length) break; const [px,py]=s.pos.split(',').map(Number); let best=null; for(const e of s.enemies){const m=e.match(/@(\d+),(\d+)/); const ex=+m[1],ey=+m[2]; const d=Math.abs(ex-px)+Math.abs(ey-py); if(!best||d<best.d) best={ex,ey,d};} const [hp,max]=s.hp.split('/').map(Number); minHp=Math.min(minHp,hp); if(hp<max*0.35){ __key('q'); await __sleep(250); const s3=__st(); if(s3.turn!==s.turn) continue; } const dx=best.ex-px, dy=best.ey-py; const k=(Math.abs(dx)>=Math.abs(dy)&&dx!==0)?(dx>0?'d':'a'):(dy>0?'s':'w'); __key(k); await __sleep(200); if(__st().turn===s.turn){ const k2=(k==='d'||k==='a')?(dy>0?'s':'w'):(dx>0?'d':'a'); __key(k2); await __sleep(200);} } return minHp; };
window.__clearFloor = async (rounds=20) => { const out=[]; let minHp=1e9; for(let r=0;r<rounds;r++){ const s=__st(); if(s.gs!=='PLAYING'){out.push('gs '+s.gs); break;} if(s.enemies.length){ minHp=Math.min(minHp, await __fight(60)); continue;} const t0=s.turn, z0=s.zone; __key('z'); await __sleep(3500); const s2=__st(); if(s2.zone!==z0){out.push('ZONE CHANGED '+s2.zone); break;} if(s2.turn===t0&&!s2.enemies.length){ out.push('stopped: '+__logs(1)[0]); break;} } const e=__st(); out.push(`end hp${e.hp} min${minHp} mp${e.mp} lv${e.lv} xp${e.xp} g${e.gold} T${e.turn} ${e.zone}`); return out; };
window.__goto = async (pred, maxSteps=150, stepOn=false) => { for(let i=0;i<maxSteps;i++){ const o=__S(); const z=o.zone, p=o.p; if(z.enemies.some(e=>z.tiles[e.y][e.x].visible)) return 'enemy'; let target=null; for(let y=0;y<z.height;y++) for(let x=0;x<z.width;x++) if(z.tiles[y][x].explored&&pred(z.tiles[y][x])) target={x,y}; if(!target) return 'no target'; const goal=(x,y)=>stepOn?(x===target.x&&y===target.y):Math.abs(x-target.x)+Math.abs(y-target.y)<=(stepOn?0:0); if(p.x===target.x&&p.y===target.y) return 'arrived'; const prev=new Map([[p.x+','+p.y,null]]); const q=[[p.x,p.y]]; while(q.length){const [x,y]=q.shift(); if(x===target.x&&y===target.y) break; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,t=z.tiles[ny]?.[nx],key=nx+','+ny; if(!t||prev.has(key)||!t.explored) continue; if(!t.walkable||z.npcs.some(n=>n.x===nx&&n.y===ny)) continue; if(t.kind.startsWith('stairs')&&!(nx===target.x&&ny===target.y)) continue; prev.set(key,[x,y]); q.push([nx,ny]);}} if(!prev.has(target.x+','+target.y)) return 'no path'; let cur=[target.x,target.y]; while(true){const pr=prev.get(cur[0]+','+cur[1]); if(pr[0]===p.x&&pr[1]===p.y) break; cur=pr;} const dx=cur[0]-p.x, dy=cur[1]-p.y; __key(dx>0?'d':dx<0?'a':dy>0?'s':'w'); await __sleep(170);} return 'max'; };
return 'helpers ok';
})()
;(() => {
const W = { atk: 2, def: 1.5, maxHp: 0.35, critChance: 0.8, dodgeChance: 0.8, lifesteal: 1, thorns: 0.5, spellPower: 0.2, maxMana: 0.05 };
const score = (it) => it ? Object.entries(it.stats || {}).reduce((a, [k, v]) => a + (W[k] ?? 0) * v, 0) : 0;
const btn = (re) => [...document.querySelectorAll('button')].find(b => re.test(b.innerText.trim()) && !b.disabled);
window.__gear = async () => {
  const p = __S().p; const out = [];
  const best = {};
  for (const it of p.inventory) { if (!it.slot || !it.stats) continue; if (!best[it.slot] || score(it) > score(best[it.slot])) best[it.slot] = it; }
  const todo = Object.values(best).filter(it => score(it) > score(p.equipped[it.slot]) + 0.5);
  if (!todo.length) return out;
  btn(/^Pack$/)?.click(); await __sleep(400);
  for (const it of todo) {
    const card = [...document.querySelectorAll('button, [role=button], div')].filter(el => el.children.length < 8 && el.innerText && el.innerText.startsWith(it.name.slice(0, 14))).pop();
    card?.click(); await __sleep(200);
    const eb = btn(/^(Equip|Swap)/); if (eb) { eb.click(); out.push(`${it.slot}:${it.name}[${it.rarity}]`); } await __sleep(200);
  }
  __key('Escape'); await __sleep(300); return out;
};
window.__spend = async () => {
  const p = __S().p; if (!p.attributePoints && !p.skillPoints) return '';
  __key('k'); await __sleep(400);
  for (let i = 0; i < p.attributePoints; i++) { const b = [...document.querySelectorAll('button')].filter(b => b.innerText.trim() === '+1' && !b.disabled); (i % 3 === 2 ? b[3] : b[0])?.click(); await __sleep(120); }
  for (let n = 0; n < p.skillPoints; n++) { const l = [...document.querySelectorAll('button')].filter(b => /^(Learn|Rank \+)/.test(b.innerText.trim()) && !b.disabled); if (!l.length) break; l[0].click(); await __sleep(150); }
  __key('Escape'); await __sleep(300); return `spent→ might${__S().p.attributes.might} res${__S().p.attributes.resolve}`;
};
window.__R = window.__R || { floors: {}, bosses: [], events: [] };
window.__run = async (budgetMs = 38000) => {
  const t0 = Date.now(); const R = window.__R;
  while (Date.now() - t0 < budgetMs) {
    const o = __S(); const s = __st();
    if (s.gs !== 'PLAYING') { R.events.push(`T${s.turn} gs ${s.gs}`); return 'stop: ' + s.gs; }
    const z = o.zone; const fl = R.floors[s.zone] ??= { enterTurn: s.turn, enterLv: s.lv, minHp: 1e9, potions: 0 };
    const [hp, max] = s.hp.split('/').map(Number); fl.minHp = Math.min(fl.minHp, Math.round(100 * hp / max));
    if (o.p.attributePoints || o.p.skillPoints) { await __spend(); continue; }
    const vis = z.enemies.filter(e => z.tiles[e.y][e.x].visible);
    const boss = vis.find(e => e.isBoss);
    if (boss) { let b = R.bosses.find(b => b.id === boss.id); if (!b) { b = { id: boss.id, name: boss.name, maxHp: boss.maxHp, startTurn: s.turn, startHpPct: Math.round(100 * hp / max), lv: s.lv, atk: null, minHpPct: 100, potions: 0 }; R.bosses.push(b); } b.lastTurn = s.turn; b.minHpPct = Math.min(b.minHpPct, Math.round(100 * hp / max)); b.bossHp = boss.hp; }
    if (vis.length) {
      if (hp < max * 0.4) { const pc = o.p.inventory.find(i => i.id && /Crimson/.test(i.name)); if (pc) { __key('q'); fl.potions++; if (boss) R.bosses.find(b => b.id === boss.id).potions++; await __sleep(220); if (__st().turn !== s.turn) continue; } }
      const step = window.__stepToward(z, o.p.x, o.p.y, vis);
      if (!step) { R.unreach = (R.unreach || 0) + 1; if (R.unreach < 6) { __key('.'); await __sleep(170); continue; } }
      else { R.unreach = 0; __key(step); await __sleep(170); if (__st().turn === s.turn) { __key('Enter'); await __sleep(250); __key('.'); await __sleep(170); } continue; }
    }
    for (const b of R.bosses) if (b.lastTurn && !b.done && !z.enemies.some(e => e.id === b.id)) { b.done = true; b.rounds = b.lastTurn - b.startTurn + 1; b.endHpPct = Math.round(100 * hp / max); }
    const g = await __gear(); if (g.length) { R.events.push(`T${s.turn} L${s.lv} ${s.zone} equip ${g.join(', ')}`); continue; }
    const tz = s.turn; __key('z'); await __sleep(2200);
    const s2 = __st();
    if (s2.turn !== tz) R.stalls = 0;
    if (s2.zone !== s.zone) continue;
    if (s2.turn === tz && !__st().enemies.length) {
      __key('Enter'); await __sleep(300);
      if (__st().turn !== tz) continue;
      const last = __logs(1)[0] || '';
      if (/explored|exploration complete/i.test(last) || /stairs/.test(last)) {
        const r = await __goto(t => t.kind === 'stairs_down', 200, true); await __sleep(900);
        if (__st().zone === s.zone) { __key(' '); await __sleep(900); }
        if (__st().zone === s.zone) { R.events.push(`T${s.turn} stuck at stairs: ${r} / ${__logs(1)[0]}`); return 'stuck'; }
        fl.leaveTurn = __st().turn; fl.leaveLv = __st().lv; continue;
      }
      R.stalls=(R.stalls||0)+1; if(R.stalls>4){ R.events.push(`T${s.turn} stall: ${last}`); R.stalls=0; return 'stall'; } await __sleep(500); continue;
    }
  }
  return 'budget';
};
return 'v2 ok';
})()

;window.__stepToward = (z, px, py, targets) => {
  const goal = new Set(targets.map(e => e.x + ',' + e.y));
  const prev = new Map([[px + ',' + py, null]]); const q = [[px, py]]; let hit = null;
  while (q.length && !hit) { const [x, y] = q.shift(); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (prev.has(k)) continue; if (goal.has(k)) { prev.set(k, [x, y]); hit = [nx, ny]; break; } const t = z.tiles[ny]?.[nx]; if (!t || !t.walkable || !t.explored || t.kind.startsWith('stairs') || z.enemies.some(e => e.x === nx && e.y === ny)) continue; prev.set(k, [x, y]); if (prev.size < 900) q.push([nx, ny]); } }
  if (!hit) return null; let cur = hit; while (true) { const pr = prev.get(cur[0] + ',' + cur[1]); if (pr[0] === px && pr[1] === py) break; cur = pr; }
  const dx = cur[0] - px, dy = cur[1] - py; return dx > 0 ? 'd' : dx < 0 ? 'a' : dy > 0 ? 's' : 'w';
};
