import { ThreeRenderer } from './render-three.js';
import { createGame } from './game.js';
import * as MapMod from './map.js';

const canvas = document.getElementById('game');
const renderer = new ThreeRenderer(canvas);
await renderer.init();
const game = createGame(canvas, renderer);
window.__fps = { renderer, game };
window.__fpsMap = MapMod;
