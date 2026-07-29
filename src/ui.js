const CSS = `
.hud, .hud * { box-sizing: border-box; }
.hud {
  --team: #8fc0ff;
  position: fixed; inset: 0; pointer-events: none; user-select: none;
  font: 700 14px/1.1 "Trebuchet MS", "Segoe UI", system-ui, sans-serif;
  color: #f2e9d8; letter-spacing: .03em;
  text-shadow: 0 2px 4px rgba(0,0,0,.85), 0 0 2px rgba(0,0,0,.9);
}
.hud .cross { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
.hud .cross i {
  position: absolute; background: #9dff9d; width: 2px; height: 9px; margin-left: -1px;
  box-shadow: 0 0 2px rgba(0,0,0,.95); transition: transform .06s linear;
}
.hud .cross i:nth-child(1) { transform: translateY(calc(-9px - var(--gap))); }
.hud .cross i:nth-child(2) { transform: translateY(var(--gap)); }
.hud .cross i:nth-child(3) { width: 9px; height: 2px; margin: -1px 0 0 0; transform: translateX(calc(-9px - var(--gap))); }
.hud .cross i:nth-child(4) { width: 9px; height: 2px; margin: -1px 0 0 0; transform: translateX(var(--gap)); }
.hud .cross { --gap: 4px; }

.hud .hit { position: absolute; left: 50%; top: 50%; width: 24px; height: 24px; margin: -12px 0 0 -12px; opacity: 0; }
.hud .hit::before, .hud .hit::after {
  content: ""; position: absolute; left: 11px; top: 0; width: 2px; height: 24px; background: #fff;
  box-shadow: 0 0 3px rgba(0,0,0,.9);
}
.hud .hit::before { transform: rotate(45deg); }
.hud .hit::after { transform: rotate(-45deg); }
.hud .hit.on { animation: hitpop .25s ease-out; }
.hud .hit.kill::before, .hud .hit.kill::after { background: #ff4d4d; }
@keyframes hitpop { from { opacity: 1; transform: scale(.55); } to { opacity: 0; transform: scale(1.25); } }

.hud .top {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: stretch; gap: 2px; font-size: 13px;
}
.hud .top > * {
  background: rgba(14,16,20,.62); border: 1px solid rgba(226,205,160,.16);
  padding: 7px 15px; display: flex; align-items: center; gap: 8px;
}
.hud .top b { font-size: 21px; letter-spacing: 0; }
.hud .ct b { color: #7fb2ff; }
.hud .t b { color: #ffb04a; }
.hud .timer { font-size: 21px; font-variant-numeric: tabular-nums; min-width: 82px; justify-content: center; }
.hud .timer.low { color: #ff6b5e; animation: tick 1s steps(2) infinite; }
@keyframes tick { 50% { opacity: .45; } }

.hud .feed { position: absolute; top: 14px; right: 18px; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
.hud .feed div {
  background: rgba(14,16,20,.55); border-left: 3px solid #7fb2ff;
  padding: 5px 10px; font-size: 12.5px; animation: feedin .25s ease-out;
}
.hud .feed em { font-style: normal; color: #ffb04a; }
.hud .feed span { color: #9dff9d; margin: 0 6px; }
@keyframes feedin { from { opacity: 0; transform: translateX(14px); } }

.hud .bar {
  position: absolute; left: 0; right: 0; bottom: 0; height: 108px;
  display: flex; align-items: center; gap: 22px;
  padding: 0 42px 30px; font-variant-numeric: tabular-nums;
}
.hud .left { display: flex; align-items: flex-end; gap: 14px; }
.hud .armor { position: relative; width: 34px; height: 38px; opacity: .85; flex: none; }
.hud .armor svg { width: 100%; height: 100%; display: block; }
.hud .armor b {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 11px; padding-top: 3px; letter-spacing: 0;
}
.hud .hpblock { min-width: 190px; }
.hud .hpnum { font-size: 46px; line-height: 1; }
.hud .hpbar { height: 6px; margin-top: 8px; background: rgba(255,255,255,.13); }
.hud .hpbar i {
  display: block; height: 100%; width: 100%; background: var(--team);
  transition: width .18s ease-out, background .25s;
}
.hud .hp.hurt .hpnum { color: #ff6b5e; }
.hud .hp.hurt .hpbar i { background: #ff5147; }

.hud .mid { flex: 1; display: flex; align-items: center; gap: 16px; min-width: 0; }
.hud .mid .rule { flex: 1; height: 1px; background: rgba(242,233,216,.32); }
.hud .badge { width: 58px; height: 58px; flex: none; color: var(--team); opacity: .92; }
.hud .badge svg { width: 100%; height: 100%; display: block; }

.hud .right { text-align: right; }
.hud .wep { font-size: 13px; opacity: .7; margin-bottom: 5px; }
.hud .ammo { font-size: 44px; line-height: 1; }
.hud .ammo small { font-size: 19px; opacity: .5; margin-left: 4px; }
.hud .ammo.empty { color: #ff6b5e; }
.hud .reload { font-size: 12px; color: #ffd166; height: 14px; letter-spacing: .12em; margin-top: 3px; }

.hud .dmg {
  position: absolute; inset: 0; opacity: 0;
  background: radial-gradient(ellipse at center, rgba(120,0,0,0) 38%, rgba(150,10,10,.62) 100%);
  transition: opacity .4s ease-out;
}
.hud .dmg.on { opacity: 1; transition: opacity .03s; }
.hud .lowhp {
  position: absolute; inset: 0; opacity: 0; transition: opacity .5s;
  background: radial-gradient(ellipse at center, rgba(90,0,0,0) 45%, rgba(120,0,0,.45) 100%);
}
.hud .lowhp.on { opacity: 1; animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: .45; } }

.hud .scope { position: absolute; inset: 0; display: none; }
.hud .scope.on { display: block; }
.hud .scope .lens {
  position: absolute; left: 50%; top: 50%;
  width: 68vh; height: 68vh; margin: -34vh 0 0 -34vh;
  border-radius: 50%; box-shadow: 0 0 0 100vmax #000, inset 0 0 40px rgba(0,0,0,.9);
}
.hud .scope i {
  position: absolute; background: #0b0b0b;
}
.hud .scope i.h { left: 0; right: 0; top: 50%; height: 1.5px; margin-top: -0.75px; }
.hud .scope i.v { top: 0; bottom: 0; left: 50%; width: 1.5px; margin-left: -0.75px; }
.hud .scope i.tick { width: 9px; height: 1.5px; left: 50%; margin-left: -4.5px; }

.hud .msg { position: absolute; left: 50%; top: 60%; transform: translateX(-50%); font-size: 15px; opacity: 0; transition: opacity .3s; }
.hud .msg.on { opacity: .95; }


.hud .title {
  position: absolute; inset: 0; display: none; pointer-events: auto;
  opacity: 0; animation: titlein .9s ease-out forwards;
}
.hud .title.on { display: block; }
@keyframes titlein { to { opacity: 1; } }

.hud .title .grain {
  position: absolute; inset: -40%; pointer-events: none; opacity: .06;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: grain 1.2s steps(5) infinite;
}
@keyframes grain {
  0% { transform: translate(0,0); } 20% { transform: translate(-2%,1.5%); }
  40% { transform: translate(1.5%,-1%); } 60% { transform: translate(-1%,-2%); }
  80% { transform: translate(2%,1%); } 100% { transform: translate(0,0); }
}
.hud .title .vig {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 82% 72% at 68% 48%, transparent 22%, rgba(5,6,9,.82) 100%),
    linear-gradient(90deg, rgba(5,6,9,.94) 0%, rgba(5,6,9,.86) 26%, rgba(5,6,9,.55) 46%, rgba(5,6,9,.12) 68%, transparent 82%);
}
.hud .title .bars { position: absolute; inset: 0; pointer-events: none; }
.hud .title .bars::before, .hud .title .bars::after {
  content: ""; position: absolute; left: 0; right: 0; height: 8.5vh; background: #05060a;
}
.hud .title .bars::before { top: 0; } .hud .title .bars::after { bottom: 0; }

.hud .title .stage {
  position: absolute; left: clamp(40px, 7vw, 120px); top: 50%; transform: translateY(-50%);
  max-width: 46vw;
}
.hud .title .eyebrow {
  font-size: 11px; letter-spacing: .52em; opacity: .5; margin-bottom: 16px;
  animation: rise .7s .15s both;
}
.hud .title h1 {
  margin: 0; font-size: clamp(52px, 6.6vw, 96px); line-height: .92; font-weight: 800;
  letter-spacing: .1em; white-space: nowrap;
  background: linear-gradient(178deg, #fffdf6 4%, #f4d792 46%, #c79c4e 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: none;
  filter: drop-shadow(0 3px 3px rgba(0,0,0,.9)) drop-shadow(0 10px 34px rgba(0,0,0,.85));
  animation: rise .8s .25s both;
}
.hud .title h1 span { font-weight: 200; }
.hud .title .rule {
  height: 1px; margin: 24px 0 14px; width: 260px;
  background: linear-gradient(90deg, #e8c477, rgba(232,196,119,.05));
  animation: grow .9s .5s both;
}
@keyframes grow { from { width: 0; opacity: 0; } }
.hud .title .tagline {
  font-size: 13px; font-weight: 400; letter-spacing: .22em; opacity: .68;
  animation: rise .8s .55s both;
}
@keyframes rise { from { opacity: 0; transform: translateY(14px); } }

.hud .title nav { margin-top: 54px; display: flex; flex-direction: column; }
.hud .title nav button {
  position: relative; display: flex; align-items: baseline; gap: 18px;
  width: 100%; max-width: 420px; padding: 15px 24px 15px 0;
  background: none; border: 0; color: #ece5d6; font: inherit; text-align: left;
  cursor: pointer; letter-spacing: .04em;
  transition: transform .2s cubic-bezier(.2,.8,.3,1), color .2s;
  animation: rise .7s both;
}
.hud .title nav button:nth-child(1) { animation-delay: .68s; }
.hud .title nav button:nth-child(2) { animation-delay: .78s; }
.hud .title nav button::before {
  content: ""; position: absolute; inset: 0 -26px 0 -26px; opacity: 0;
  background: linear-gradient(90deg, rgba(232,196,119,.14), rgba(232,196,119,0) 62%);
  transition: opacity .2s;
}
.hud .title nav button::after {
  content: ""; position: absolute; left: -26px; top: 50%; width: 3px; height: 0;
  background: #e8c477; transform: translateY(-50%); transition: height .22s ease-out;
}
.hud .title nav button:hover { transform: translateX(10px); color: #fff6e2; }
.hud .title nav button:hover::before { opacity: 1; }
.hud .title nav button:hover::after { height: 62%; }
.hud .title nav i {
  font-style: normal; font-size: 11px; letter-spacing: .22em; opacity: .4; width: 24px; flex: none;
}
.hud .title nav b { font-size: 25px; font-weight: 700; letter-spacing: .18em; }
.hud .title nav em {
  font-style: normal; font-size: 10.5px; letter-spacing: .3em; opacity: .38; margin-left: auto;
}
.hud .title .note {
  margin-top: 20px; font-size: 12px; letter-spacing: .18em; color: #e8c477;
  opacity: 0; transition: opacity .3s; min-height: 16px;
}
.hud .title .note.on { opacity: .85; }

.hud .title .foot {
  position: absolute; left: 0; right: 0; bottom: calc(8.5vh + 18px);
  display: flex; justify-content: space-between;
  padding: 0 clamp(40px, 7vw, 120px);
  font-size: 10.5px; letter-spacing: .26em; opacity: .32;
  animation: rise .8s .9s both;
}

.hud.title-on .cross, .hud.title-on .bar, .hud.title-on .top,
.hud.title-on .feed, .hud.title-on .scope, .hud.title-on .lowhp,
.hud.lobby-on .cross, .hud.lobby-on .bar, .hud.lobby-on .top,
.hud.lobby-on .feed, .hud.lobby-on .scope, .hud.lobby-on .lowhp { display: none; }
.hud .browse h2 { margin: 0; font-size: 30px; letter-spacing: .22em; font-weight: 800; color: #e8c477; }
.hud .browse .lhead { display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; padding-top: clamp(28px, 5vh, 54px); }
.hud .browse .lhead p { margin: 8px 0 0; font-size: 11.5px; letter-spacing: .24em; opacity: .42; font-weight: 400; }
.hud .browse .lfoot { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: clamp(28px, 5vh, 54px); }
.hud .browse .hint { font-size: 11px; letter-spacing: .16em; opacity: .38; font-weight: 400; }
.hud .browse .acts button {
  font: 700 14px/1 inherit; letter-spacing: .16em; padding: 15px 32px;
  border: 1px solid rgba(232,196,119,.4); background: none; color: #e8c477; cursor: pointer;
  transition: background .16s;
}
.hud .browse .acts button:hover { background: rgba(232,196,119,.14); }


.hud .lobby {
  position: absolute; inset: 0; display: none; pointer-events: auto;
  background: rgba(5,6,9,.9); backdrop-filter: blur(3px);
  opacity: 0; animation: titlein .35s ease-out forwards;
}
.hud .lobby.on { display: flex; flex-direction: column; }
.hud .lobby .lhead {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 30px;
  padding: clamp(28px, 5vh, 54px) clamp(40px, 7vw, 110px) 0;
}
.hud .lobby h2 {
  margin: 0; font-size: 30px; letter-spacing: .22em; font-weight: 800; color: #e8c477;
}
.hud .lobby .lhead p { margin: 8px 0 0; font-size: 11.5px; letter-spacing: .24em; opacity: .42; font-weight: 400; }
.hud .netdot { font-weight: 700; letter-spacing: .12em; margin-left: 10px; }
.hud .netdot.on { color: #86e08a; }
.hud .netdot.off { color: #ffb04a; }
.hud .lobby .namefield { display: flex; align-items: center; gap: 12px; }
.hud .lobby .namefield span { font-size: 11px; letter-spacing: .26em; opacity: .5; }
.hud .lobby input {
  background: rgba(255,255,255,.05); border: 1px solid rgba(232,196,119,.28);
  color: #f4ecdb; font: 700 15px/1 inherit; letter-spacing: .14em;
  padding: 11px 14px; width: 200px; outline: none;
}
.hud .lobby input:focus { border-color: #e8c477; background: rgba(232,196,119,.09); }
.hud .lobby .maps { display: flex; gap: 6px; flex-wrap: wrap; max-width: 340px; }
.hud .lobby .maps button {
  font: 700 11px/1 inherit; letter-spacing: .14em; padding: 12px 14px; cursor: pointer;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14); color: #cfc7b6;
  transition: background .16s, border-color .16s, color .16s;
}
.hud .lobby .maps button:hover { background: rgba(255,255,255,.1); }
.hud .lobby .maps button.sel { border-color: #e8c477; color: #f4dda6; background: rgba(232,196,119,.14); }
.hud .lobby .maps button small { display: block; font-size: 9px; opacity: .5; margin-top: 4px; letter-spacing: .1em; }

.hud .lobby .teams {
  flex: 1; display: grid; grid-template-columns: 1fr auto 1fr; align-items: start;
  gap: clamp(20px, 3vw, 46px); padding: clamp(20px, 4vh, 40px) clamp(40px, 7vw, 110px);
  min-height: 0;
}
.hud .lobby .vs { align-self: center; font-size: 13px; letter-spacing: .3em; opacity: .3; }
.hud .lobby .team { border-top: 2px solid var(--c); padding-top: 16px; }
.hud .lobby .team.ct { --c: #6ea8ff; }
.hud .lobby .team.t { --c: #ff9d3d; }
.hud .lobby .team h3 {
  margin: 0 0 3px; font-size: 19px; letter-spacing: .2em; color: var(--c); font-weight: 700;
}
.hud .lobby .team .sub { font-size: 11px; letter-spacing: .22em; opacity: .38; margin-bottom: 16px; font-weight: 400; }

.hud .lobby .slot {
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 58px;
  padding: 12px 12px 12px 14px; margin-bottom: 8px;
  background: rgba(255,255,255,.035); border: 1px solid transparent;
  color: #ded7c8; transition: background .16s, border-color .16s;
}
.hud .lobby .slot:hover { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.12); }
.hud .lobby .slot .av {
  width: 30px; height: 30px; flex: none; border: 1px solid var(--c); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--c);
}
.hud .lobby .slot.free .av { border-style: dashed; border-color: rgba(255,255,255,.22); color: rgba(255,255,255,.3); }
.hud .lobby .slot .who { flex: 1; font-size: 15px; letter-spacing: .1em; }
.hud .lobby .slot .tag { font-size: 10px; letter-spacing: .22em; opacity: .45; }
.hud .lobby .slot.free .who { opacity: .34; font-weight: 400; }
.hud .lobby .slot.me { background: rgba(232,196,119,.13); border-color: rgba(232,196,119,.5); }
.hud .lobby .slot.me .who { color: #f6e2b4; }
.hud .lobby .slot .act {
  font: 700 10.5px/1 inherit; letter-spacing: .14em; padding: 8px 11px; cursor: pointer;
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); color: #ded7c8;
  opacity: 0; transition: opacity .16s, background .16s, border-color .16s, color .16s;
}
.hud .lobby .slot:hover .act, .hud .lobby .slot .act:focus-visible { opacity: 1; }
.hud .lobby .slot .act.add { color: #e8c477; border-color: rgba(232,196,119,.42); }
.hud .lobby .slot .act.add:hover { background: rgba(232,196,119,.2); }
.hud .lobby .slot .act.join:hover { background: rgba(255,255,255,.16); }
.hud .lobby .slot .act.del { color: #ff9a8c; border-color: rgba(255,120,100,.38); }
.hud .lobby .slot .act.del:hover { background: rgba(255,110,90,.2); }

.hud .lobby .lfoot {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 0 clamp(40px, 7vw, 110px) clamp(28px, 5vh, 54px);
}
.hud .lobby .hint { font-size: 11px; letter-spacing: .16em; opacity: .38; font-weight: 400; }
.hud .lobby .acts { display: flex; gap: 12px; }
.hud .lobby .acts button {
  font: 700 14px/1 inherit; letter-spacing: .16em; padding: 15px 32px;
  border: 1px solid rgba(232,196,119,.4); background: none; color: #e8c477; cursor: pointer;
  transition: background .16s, color .16s;
}
.hud .lobby .acts button:hover { background: rgba(232,196,119,.14); }
.hud .lobby .acts button.primary { background: #e8c477; color: #1a1408; border-color: #e8c477; }
.hud .lobby .acts button.primary:hover { background: #f7dc9c; }

.hud .plates { position: absolute; inset: 0; pointer-events: none; }
.hud .plates div {
  position: absolute; transform: translate(-50%, -100%); white-space: nowrap;
  font-size: 12px; font-weight: 700; letter-spacing: .1em;
  text-shadow: 0 1px 3px rgba(0,0,0,.95), 0 0 2px rgba(0,0,0,.9);
}
.hud.title-on .plates, .hud.lobby-on .plates { display: none; }


.hud .browse {
  position: absolute; inset: 0; display: none; pointer-events: auto;
  background: rgba(5,6,9,.9); backdrop-filter: blur(3px);
  opacity: 0; animation: titlein .35s ease-out forwards;
}
.hud .browse.on { display: flex; flex-direction: column; }
.hud .browse .lhead, .hud .browse .lfoot { padding-left: clamp(40px, 7vw, 110px); padding-right: clamp(40px, 7vw, 110px); }
.hud .browse .list {
  flex: 1; overflow-y: auto; min-height: 0;
  padding: clamp(18px, 3vh, 32px) clamp(40px, 7vw, 110px);
}
.hud .browse .cols, .hud .browse .row {
  display: grid; grid-template-columns: 2.2fr 1.2fr 1fr .8fr .9fr auto;
  align-items: center; gap: 16px;
}
.hud .browse .cols {
  font-size: 10.5px; letter-spacing: .24em; opacity: .38; font-weight: 400;
  padding: 0 14px 10px; border-bottom: 1px solid rgba(255,255,255,.12);
}
.hud .browse .row {
  padding: 15px 14px; margin-top: 8px; font-size: 14px; letter-spacing: .06em;
  background: rgba(255,255,255,.035); border: 1px solid transparent;
  transition: background .16s, border-color .16s;
}
.hud .browse .row:hover { background: rgba(255,255,255,.07); border-color: rgba(232,196,119,.28); }
.hud .browse .row .rname { font-weight: 700; }
.hud .browse .row .dim { opacity: .55; font-weight: 400; font-size: 12.5px; }
.hud .browse .row .st { font-size: 11px; letter-spacing: .16em; }
.hud .browse .row .st.playing { color: #ff9d3d; }
.hud .browse .row .st.open { color: #86e08a; }
.hud .browse .row button {
  font: 700 11px/1 inherit; letter-spacing: .18em; padding: 10px 18px; cursor: pointer;
  background: none; border: 1px solid rgba(232,196,119,.42); color: #e8c477;
  transition: background .16s;
}
.hud .browse .row button:hover:not(:disabled) { background: rgba(232,196,119,.18); }
.hud .browse .row button:disabled { opacity: .35; cursor: default; border-color: rgba(255,255,255,.18); color: #9a948a; }
.hud .browse .empty {
  padding: 60px 14px; text-align: center; font-weight: 400;
  font-size: 13px; letter-spacing: .16em; opacity: .35;
}

.hud .overlay {
  position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(8,9,12,.74); pointer-events: auto; backdrop-filter: blur(2px);
}
.hud .overlay.on { display: flex; }
.hud .card { text-align: center; max-width: 520px; padding: 36px 44px; }
.hud .card h1 { margin: 0 0 12px; font-size: 46px; letter-spacing: .08em; color: #e8d5a8; }
.hud .card p { margin: 0 0 24px; font-weight: 400; line-height: 1.8; opacity: .8; font-size: 14px; }
.hud .card button {
  pointer-events: auto; cursor: pointer; font: 700 15px/1 inherit; letter-spacing: .1em;
  color: #1a1408; background: #e8c477; border: 0; padding: 14px 34px; text-shadow: none;
}
.hud .card button:hover { background: #f5d894; }
`;

const ARMOR_ICON = '<svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2 3 5.5v8c0 6 3.8 10.2 9 11.5 5.2-1.3 9-5.5 9-11.5v-8L12 2z"/></svg>';

const LAUREL = '<path d="M18 43c-4.4-5-4.6-12.6-1.4-18"/><path d="M46 43c4.4-5 4.6-12.6 1.4-18"/>';

// 隊伍徽章：CT 用盾牌加十字（警方），T 用骷髏（歹徒），外圈月桂
const BADGES = {
  ct: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round">
    <circle cx="32" cy="32" r="26"/>${LAUREL}
    <path d="M32 17.5l10.5 4.6v8.6c0 6.7-4.4 12-10.5 13.9C25.9 42.7 21.5 37.4 21.5 30.7v-8.6z"/>
    <path d="M32 24.5v12"/><path d="M26.6 30h10.8"/>
  </svg>`,
  t: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round">
    <circle cx="32" cy="32" r="26"/>${LAUREL}
    <path d="M32 18c-6.4 0-11.2 4.7-11.2 10.7 0 3.4 1.5 5.8 3.2 7.3V40h16V36c1.7-1.5 3.2-3.9 3.2-7.3C43.2 22.7 38.4 18 32 18z"/>
    <circle cx="27.4" cy="29.4" r="2.3" fill="currentColor" stroke="none"/>
    <circle cx="36.6" cy="29.4" r="2.3" fill="currentColor" stroke="none"/>
    <path d="M27 44.5h10"/>
  </svg>`,
};

const TEAM_COLOR = { ct: '#8fc0ff', t: '#ffb257' };

export class UI {
  constructor() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.className = 'hud';
    root.innerHTML = `
      <div class="cross" data-cross><i></i><i></i><i></i><i></i></div>
      <div class="scope" data-scope>
        <div class="lens"></div>
        <i class="h"></i><i class="v"></i>
        <i class="tick" style="top:38%"></i><i class="tick" style="top:44%"></i>
        <i class="tick" style="top:56%"></i><i class="tick" style="top:62%"></i>
      </div>
      <div class="hit" data-hit></div>
      <div class="top">
        <span class="ct">CT <b data-ct>0</b></span>
        <span class="timer" data-time>2:00</span>
        <span class="t">T <b data-t>0</b></span>
      </div>
      <div class="feed" data-feed></div>
      <div class="bar">
        <div class="left hp" data-hpwrap>
          <div class="armor">${ARMOR_ICON}<b data-armor>0</b></div>
          <div class="hpblock">
            <div class="hpnum" data-hp>100</div>
            <div class="hpbar"><i data-hpfill></i></div>
          </div>
        </div>
        <div class="mid">
          <div class="rule"></div>
          <div class="badge" data-badge></div>
          <div class="rule"></div>
        </div>
        <div class="right">
          <div class="wep" data-wep>M4A1</div>
          <div class="ammo" data-ammo><span data-mag>30</span><small data-res>/30</small></div>
          <div class="reload" data-reload></div>
        </div>
      </div>
      <div class="msg" data-msg></div>
      <div class="lowhp" data-lowhp></div>
      <div class="dmg" data-dmg></div>
      <div class="title" data-title>
        <div class="grain"></div>
        <div class="vig"></div>
        <div class="bars"></div>
        <div class="stage">
          <div class="eyebrow">TACTICAL SHOOTER</div>
          <h1>DUST<span>STRIKE</span></h1>
          <div class="rule"></div>
          <div class="tagline">沙塵之下 · 只有槍聲說了算</div>
          <nav>
            <button data-new><i>01</i><b>新建遊戲</b><em>NEW GAME</em></button>
            <button data-find><i>02</i><b>尋找房間</b><em>FIND MATCH</em></button>
          </nav>
          <div class="note" data-note></div>
        </div>
        <div class="foot">
          <span>DUSTSTRIKE · BUILD 2026.07</span>
          <span>WEBGL · SINGLE PLAYER</span>
        </div>
      </div>
      <div class="plates" data-plates></div>
      <div class="lobby" data-lobby>
        <div class="lhead">
          <div>
            <h2>建立房間</h2>
            <p>DEATHMATCH · 120 秒 · 每邊最多 3 人 <b class="netdot" data-netdot></b></p>
          </div>
          <div style="display:flex;gap:20px">
            <label class="namefield">
              <span>房間名稱</span>
              <input data-roomname maxlength="18" spellcheck="false">
            </label>
            <label class="namefield">
              <span>玩家名稱</span>
              <input data-name maxlength="12" spellcheck="false">
            </label>
            <div class="namefield">
              <span>地圖</span>
              <div class="maps" data-maps></div>
            </div>
          </div>
        </div>
        <div class="teams">
          <div class="team ct">
            <h3>反恐部隊</h3>
            <div class="sub">COUNTER-TERRORIST · 警察</div>
            <div data-slots-ct></div>
          </div>
          <div class="vs">VS</div>
          <div class="team t">
            <h3>恐怖分子</h3>
            <div class="sub">TERRORIST · 歹徒</div>
            <div data-slots-t></div>
          </div>
        </div>
        <div class="lfoot">
          <div class="hint">空位可以「換到這裡」或「＋ 電腦」 · 電腦可移除 · 一個人也能開始</div>
          <div class="acts">
            <button data-back>返回</button>
            <button class="primary" data-start>開始遊戲</button>
          </div>
        </div>
      </div>
      <div class="browse" data-browse>
        <div class="lhead">
          <div>
            <h2>尋找房間</h2>
            <p data-browsesub>本機房間列表</p>
          </div>
          <div class="acts"><button data-refresh>重新整理</button></div>
        </div>
        <div class="list">
          <div class="cols">
            <span>房間名稱</span><span>主機</span><span>地圖</span>
            <span>人數</span><span>狀態</span><span></span>
          </div>
          <div data-rooms></div>
        </div>
        <div class="lfoot">
          <div class="hint">房間會在建立者離開後自動消失 · 同一個瀏覽器的其他分頁會即時同步</div>
          <div class="acts"><button data-bback>返回</button></div>
        </div>
      </div>
      <div class="overlay" data-ov>
        <div class="card"><h1 data-ovt></h1><p data-ovs></p><button data-ovb></button></div>
      </div>
    `;
    document.body.appendChild(root);

    const q = (n) => root.querySelector(`[data-${n}]`);
    this.el = {
      cross: q('cross'), scope: q('scope'), hit: q('hit'), ct: q('ct'), t: q('t'), time: q('time'),
      feed: q('feed'), hpWrap: q('hpwrap'), hp: q('hp'), hpFill: q('hpfill'),
      armor: q('armor'), badge: q('badge'), root,
      wep: q('wep'), ammo: q('ammo'), mag: q('mag'), res: q('res'), reload: q('reload'),
      msg: q('msg'), dmg: q('dmg'), lowhp: q('lowhp'),
      ov: q('ov'), ovt: q('ovt'), ovs: q('ovs'), ovb: q('ovb'),
      title: q('title'), note: q('note'), plates: q('plates'),
      lobby: q('lobby'), name: q('name'), roomName: q('roomname'),
      browse: q('browse'), rooms: q('rooms'), browseSub: q('browsesub'),
      btnRefresh: root.querySelector('[data-refresh]'), btnBBack: root.querySelector('[data-bback]'),
      slots: { ct: q('slots-ct'), t: q('slots-t') }, maps: q('maps'), netdot: q('netdot'),
      btnStart: root.querySelector('[data-start]'), btnBack: root.querySelector('[data-back]'),
      btnNew: root.querySelector('[data-new]'), btnFind: root.querySelector('[data-find]'),
    };
    this.msgTimer = null;
  }

  setWeapon(label, cur, mag, reloading) {
    this.el.wep.textContent = label;
    this.el.mag.textContent = cur;
    this.el.res.textContent = `/${mag}`;
    this.el.ammo.classList.toggle('empty', cur === 0);
    this.el.reload.textContent = reloading ? 'RELOADING' : '';
  }

  setHP(hp) {
    this.el.hp.textContent = hp;
    this.el.hpFill.style.width = `${Math.max(0, Math.min(100, hp))}%`;
    this.el.hpWrap.classList.toggle('hurt', hp <= 35);
    this.el.lowhp.classList.toggle('on', hp > 0 && hp <= 30);
  }

  setTeam(team) {
    const key = BADGES[team] ? team : 'ct';
    this.el.badge.innerHTML = BADGES[key];
    this.el.root.style.setProperty('--team', TEAM_COLOR[key]);
  }

  setSpread(v) {
    this.el.cross.style.setProperty('--gap', `${(3 + v * 26).toFixed(1)}px`);
  }

  setScoped(on) {
    this.el.scope.classList.toggle('on', !!on);
    this.el.cross.style.display = on ? 'none' : '';
  }

  setScore(ct, t) {
    this.el.ct.textContent = ct;
    this.el.t.textContent = t;
  }

  setTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    this.el.time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    this.el.time.classList.toggle('low', s <= 15);
  }

  killfeed(left, right, weapon) {
    const d = document.createElement('div');
    d.innerHTML = `<em>${left}</em><span>${weapon}</span>${right}`;
    this.el.feed.appendChild(d);
    setTimeout(() => d.remove(), 4200);
    while (this.el.feed.childElementCount > 5) this.el.feed.firstChild.remove();
  }

  hitmarker(kill) {
    const el = this.el.hit;
    el.classList.remove('on');
    el.classList.toggle('kill', !!kill);
    void el.offsetWidth;
    el.classList.add('on');
  }

  flashDamage() {
    const el = this.el.dmg;
    el.classList.add('on');
    setTimeout(() => el.classList.remove('on'), 55);
  }

  message(text, ms = 1500) {
    this.el.msg.textContent = text;
    this.el.msg.classList.add('on');
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => this.el.msg.classList.remove('on'), ms);
  }

  clearFeed() {
    this.el.feed.innerHTML = '';
  }

  showTitle({ onNew, onFind }) {
    this.el.btnNew.onclick = onNew;
    this.el.btnFind.onclick = onFind;
    this.el.title.classList.add('on');
    this.el.root.classList.add('title-on');
  }

  hideTitle() {
    this.el.title.classList.remove('on');
    this.el.root.classList.remove('title-on');
  }

  titleNote(text) {
    this.el.note.textContent = text;
    this.el.note.classList.add('on');
    clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => this.el.note.classList.remove('on'), 2600);
  }

  showLobby(model, handlers) {
    this.lobbyHandlers = handlers;
    this.el.name.value = model.name;
    this.el.roomName.value = model.room;
    this.el.name.oninput = () => handlers.onName(this.el.name.value);
    this.el.roomName.oninput = () => handlers.onRoomName(this.el.roomName.value);
    this.el.maps.innerHTML = '';
    for (const m of model.maps) {
      const b = document.createElement('button');
      b.innerHTML = `${m.zh}<small>${m.label}</small>`;
      b.onclick = () => handlers.onMap(m.id);
      this.el.maps.appendChild(b);
    }
    this.el.btnStart.onclick = handlers.onStart;
    this.el.btnBack.onclick = handlers.onBack;
    this.el.lobby.classList.add('on');
    this.el.root.classList.add('lobby-on');
    this.renderLobby(model);
  }

  hideLobby() {
    this.el.lobby.classList.remove('on');
    this.el.root.classList.remove('lobby-on');
  }

  renderLobby(model) {
    this.el.netdot.textContent = model.online ? '● 已連線' : '● 離線模式（只能單機）';
    this.el.netdot.className = `netdot ${model.online ? 'on' : 'off'}`;
    [...this.el.maps.children].forEach((b, i) => {
      b.classList.toggle('sel', model.maps[i].id === model.map);
    });
    for (const team of ['ct', 't']) {
      const host = this.el.slots[team];
      host.innerHTML = '';
      model.roster[team].forEach((slot, i) => {
        const kind = slot ? slot.type : 'free';
        const mine = kind === 'human' && model.isMine(slot);
        const row = document.createElement('div');
        row.className = `slot ${kind === 'free' ? 'free' : ''} ${mine ? 'me' : ''}`;
        const who = kind === 'human' ? (slot.name || '玩家') : kind === 'bot' ? slot.name : '空位';
        const tag = mine ? '你' : kind === 'human' ? '玩家' : kind === 'bot' ? '電腦' : '';
        row.innerHTML =
          `<span class="av">${kind === 'free' ? '+' : who.slice(0, 1).toUpperCase()}</span>` +
          `<span class="who">${who}</span><span class="tag">${tag}</span>`;

        const act = (label, action, cls) => {
          const b = document.createElement('button');
          b.className = `act ${cls}`;
          b.textContent = label;
          b.onclick = () => this.lobbyHandlers.onSlot(team, i, action);
          row.appendChild(b);
        };
        if (kind === 'free') {
          act('換到這裡', 'join', 'join');
          act('＋ 電腦', 'bot', 'add');
        } else if (kind === 'bot') {
          act('移除', 'remove', 'del');
        }
        host.appendChild(row);
      });
    }
  }

  showBrowse(handlers) {
    this.el.btnRefresh.onclick = handlers.onRefresh;
    this.el.btnBBack.onclick = handlers.onBack;
    this.browseHandlers = handlers;
    this.el.browse.classList.add('on');
    this.el.root.classList.add('lobby-on');
  }

  hideBrowse() {
    this.el.browse.classList.remove('on');
    this.el.root.classList.remove('lobby-on');
  }

  setNetStatus(label) {
    this.netLabel = label;
  }

  renderRooms(rooms) {
    const host = this.el.rooms;
    host.innerHTML = '';
    this.el.browseSub.textContent = this.netLabel || `房間列表 · ${rooms.length} 間`;
    if (!rooms.length) {
      const d = document.createElement('div');
      d.className = 'empty';
      d.textContent = '目前沒有房間 · 回上一頁用「新建遊戲」開一間';
      host.appendChild(d);
      return;
    }
    for (const r of rooms) {
      const row = document.createElement('div');
      row.className = 'row';
      const open = r.status === 'open';
      row.innerHTML =
        `<span class="rname">${r.name}</span>` +
        `<span class="dim">${r.host}</span>` +
        `<span class="dim">${r.mapLabel || r.map || ''}</span>` +
        `<span class="dim">${r.filled} / ${r.max}</span>` +
        `<span class="st ${open ? 'open' : 'playing'}">${open ? '等待中' : '進行中'}</span>`;
      const b = document.createElement('button');
      b.textContent = open ? '加入' : '遊戲中';
      b.disabled = !open;
      if (open) b.onclick = () => this.browseHandlers.onJoin(r);
      row.appendChild(b);
      host.appendChild(row);
    }
  }

  // 名牌：由 renderer 算好螢幕座標後餵進來
  setPlates(list) {
    const host = this.el.plates;
    while (host.childElementCount < list.length) host.appendChild(document.createElement('div'));
    while (host.childElementCount > list.length) host.lastChild.remove();
    list.forEach((p, i) => {
      const el = host.children[i];
      el.textContent = p.name;
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.style.color = p.color;
      el.style.opacity = p.opacity;
    });
  }

  overlay(title, sub, button, onClick) {
    this.el.ovt.textContent = title;
    this.el.ovs.innerHTML = sub;
    this.el.ovb.textContent = button;
    this.el.ovb.onclick = onClick;
    this.el.ov.classList.add('on');
  }

  hideOverlay() {
    this.el.ov.classList.remove('on');
  }
}
