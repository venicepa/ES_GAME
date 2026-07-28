import { GLRenderer } from './render-gl.js';
import { createGame } from './game.js';

const canvas = document.getElementById('game');
const renderer = new GLRenderer(canvas);
createGame(canvas, renderer);
