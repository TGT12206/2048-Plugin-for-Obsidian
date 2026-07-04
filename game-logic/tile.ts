import { GRID_SIZE, Index2D, TRANSITION_TIME } from "game-logic/const";

export class Tile {
	span: HTMLSpanElement;
	constructor (
		public div: HTMLDivElement,
		public value: number
	) {
		this.span = this.div.createEl('span');
		this.span.textContent = `${this.value}`;

		this.div.style.setProperty('--transition-time-for-2048', `${TRANSITION_TIME}ms`);
		this.span.style.setProperty('--transition-time-for-2048', `${TRANSITION_TIME}ms`);

		this.setColor();
		this.fadeIntoExistence();
	}
	moveDiv(coords: Index2D) {
		this.div.style.setProperty('--x', `${(100 / GRID_SIZE) * coords[0]}%`);
		this.div.style.setProperty('--y', `${(100 / GRID_SIZE) * coords[1]}%`);
	}
	async fadeIntoExistence() {
		this.div.style.setProperty('--game-tile-size', `${0}%`);
		this.div.style.setProperty('--num-2048-tiles', `${GRID_SIZE}`);
		
		await sleep(TRANSITION_TIME / 5);

		this.div.style.setProperty('--game-tile-size', `${100 / GRID_SIZE}%`);
	}
	async merge(otherTile: Tile, coords: Index2D) {
		otherTile.moveDiv(coords);
		this.value *= 2;

		await sleep(TRANSITION_TIME);

		this.span.textContent = `${this.value}`;
		this.setColor();

		otherTile.div.remove();
	}
	
	getColor() {
		switch(this.value) {
			case 2:
			case 4:
				return '#776e65';
			case 8:
			case 16:
			case 32:
			case 64:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			default:
				return '#ffffff';
		}
	}
	getBgColor() {
		switch(this.value) {
			case 2:
			default:
				return '#eee4db';
			case 4:
				return '#eee0cb';
			case 8:
				return '#f3b27a';
			case 16:
				return '#f69664';
			case 32:
				return '#f67c5f';
			case 64:
				return '#f7603c';
			case 128:
				return '#ecd072';
			case 256:
				return '#eecc62';
			case 512:
				return '#eec950';
			case 1024:
				return '#edc53f';
			case 2048:
				return '#edc12e';
			case 4096:
				return '#b586b4';
			case 8192:
				return '#a861ab';
			case 16384:
				return '#a048a3';
			case 32768:
				return '#800080';
			case 65536:
				return '#600046';
			case 131072:
				return '#8b86e3';
		}
	}
	setColor() {
		this.span.style.setProperty('--text-color-2048', this.getColor());
		this.div.style.setProperty('--bg-color-2048', this.getBgColor());
	}
}