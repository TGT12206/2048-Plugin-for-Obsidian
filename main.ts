import { ItemView, KeymapEventHandler, KeymapEventListener, Modifier, Plugin, Scope } from 'obsidian';

export default class CopyOf2048 extends Plugin {
	async onload() {
		this.registerView(
			GAME_VIEW_TYPE,
			(leaf) => new GameView(leaf)
		);

		this.addRibbonIcon("gamepad-2", "Open 2048", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-2048",
			name: "Open 2048",
			callback: () => {
				this.activateView();
			},
		});
	}

	onunload() {
		const { workspace } = this.app;

		let leaves = workspace.getLeavesOfType(GAME_VIEW_TYPE);

		for (const leaf of leaves) {
			(<GameView> leaf.view).unregisterScope();
		}
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(GAME_VIEW_TYPE)[0];

		if (!leaf) {
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({ type: GAME_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf);
  	}
}

const GAME_VIEW_TYPE = 'game';
const TRANSITION_TIME = 250;
const PROBABILITY_OF_2 = 90 / 100;
const gridSize = 4;
type Direction = 'up' | 'down' | 'left' | 'right';
type Index2D = [number, number];
export class GameView extends ItemView {
	override scope: Scope;
	scopeEvents: KeymapEventHandler[] = [];
	getViewType(): string { return GAME_VIEW_TYPE }
	getDisplayText(): string { return '2048' }
	protected override async onOpen() {
		this.scope = new Scope(this.app.scope);

		const div = this.contentEl.createDiv();

		div.classList.add('game-grid-2048');

		const tiles: (Tile | null)[][] = [...Array(gridSize)].map(a => [...Array(gridSize)].fill(null));
		const resetTiles = () => {
			tiles.forEach(row => row.forEach(tile => {
				if (tile !== null) tile.div.remove();
			}));
			for (let i = 0; i < gridSize; i++) {
				for (let j = 0; j < gridSize; j++) {
					tiles[i][j] = null;
				}
			}
			// generateNewTile('right');
			generateNewTile();
		}

		let edge: Index2D = [0, 0];
		let tile: Tile | null = null;
		let edgeTile: Tile | null = null;
		let currentlyCalculating = false;

		const getTile = (coords: Index2D) => tiles[coords[0]][coords[1]];
		const setTile = (coords: Index2D, tile: Tile | null) => {
			tiles[coords[0]][coords[1]] = tile;
		}

		const getNextEdge: (dir: Direction) => Index2D = (dir: Direction) => {
			switch (dir) {
				case 'up':
					return [edge[0], edge[1] - 1];
				case 'down':
					return [edge[0], edge[1] + 1];
				case 'left':
					return [edge[0] + 1, edge[1]];
				case 'right':
					return [edge[0] - 1, edge[1]];
			}
		}

		const slideTile = (dir: Direction, coords: Index2D) => {
			tile = getTile(coords);

			if (tile === null) return false;

			edgeTile = getTile(edge);
			if (edgeTile === null) {
				// move the tile to the edge
				setTile(edge, tile);
				setTile(coords, null);
				tile.moveDiv(edge);
				return true;
			}

			const nextEdge = getNextEdge(dir);

			if (tile.value !== edgeTile.value) {
				// move the tile to the edge and then move the edge
				const alreadyAtEdge = coords[0] === nextEdge[0] && coords[1] === nextEdge[1];

				setTile(nextEdge, tile);
				if (!alreadyAtEdge) setTile(coords, null);
				tile.moveDiv(nextEdge);
				
				edge = nextEdge;

				return !alreadyAtEdge;
			}

			edgeTile.merge(tile, edge);

			tile = null;
			setTile(coords, null);

			edge = nextEdge;
			return true;
		}

		const resetEdge = (dir: Direction, line: number) => {
			switch (dir) {
				case 'up':
					return edge = [line, gridSize - 1];
				case 'down':
					return edge = [line, 0];
				case 'left':
					return edge = [0, line];
				case 'right':
					return edge = [gridSize - 1, line];
			}
		}
		const getCoordsToSlide = (slideDir: Direction) => {
			const coords: Index2D[][] = [];
			for (let dir1 = 0; dir1 < gridSize; dir1++) {
				coords.push([]);
				for (let dir2 = 1; dir2 < gridSize; dir2++) {
					switch (slideDir) {
						case 'up':
							coords[dir1].push([dir1, gridSize - dir2 - 1]);
							break;
						case 'down':
							coords[dir1].push([dir1, dir2]);
							break;
						case 'left':
							coords[dir1].push([dir2, dir1]);
							break;
						case 'right':
							coords[dir1].push([gridSize - dir2 - 1, dir1]);
							break;
					}
				}
			}
			return coords;
		}
		// const generateNewTile = (dir: Direction) => {
		const generateNewTile = () => {
			const coords: Index2D = [
				// dir === 'right' ? 0 : Math.floor(Math.random() * gridSize),
				// dir === 'up' ? 0 : Math.floor(Math.random() * gridSize)
				Math.floor(Math.random() * gridSize),
				Math.floor(Math.random() * gridSize)
			]
			while (getTile(coords)) {
				// coords[0] = dir === 'right' ? 0 : Math.floor(Math.random() * gridSize);
				// coords[1] = dir === 'up' ? 0 : Math.floor(Math.random() * gridSize);
				coords[0] = Math.floor(Math.random() * gridSize);
				coords[1] = Math.floor(Math.random() * gridSize);
			}
			setTile(coords, new Tile(div.createDiv('game-tile-2048'), Math.random() < PROBABILITY_OF_2 ? 2 : 4));
			getTile(coords)?.moveDiv(coords);
		}
		const printTiles = () => {
			let str = '';
			for (let row = gridSize - 1; row >= 0; row--) {
				for (let col = 0; col < gridSize; col++) {
					const tile = tiles[col][row];
					str += (tile ? tile.value : 0) + ' ';
				}
				str += '\n';
			}
			console.log(str);
		}
		const slide = async (dir: Direction) => {
			if (currentlyCalculating) return;
			currentlyCalculating = true;

			let changed = false;
			const coords = getCoordsToSlide(dir);
			for (let line = 0; line < coords.length; line++) {
				resetEdge(dir, line);
				coords[line].forEach(tileCoords => {
					if (slideTile(dir, tileCoords)) changed = true;
				});
			}
			if (changed) {
				await sleep(gridSize*gridSize/2);
				// generateNewTile(dir);
				generateNewTile();
			}

			currentlyCalculating = false;
		}

		this.registerScopeEvent(null, ['ArrowUp', 'w'], () => slide('up'));
		this.registerScopeEvent(null, ['ArrowDown', 's'], () => slide('down'));
		this.registerScopeEvent(null, ['ArrowLeft', 'a'], () => slide('left'));
		this.registerScopeEvent(null, ['ArrowRight', 'd'], () => slide('right'));
		this.registerScopeEvent(null, ['R'], () => resetTiles());

		// generateNewTile('right');
		generateNewTile();
	}
	registerScopeEvent(modifiers: Modifier[] | null, keys: string[], func: KeymapEventListener) {
		keys.forEach(key => this.scopeEvents.push(this.scope.register(null, key, func)));
	}
	unregisterScope() {
		for (const handler of this.scopeEvents) {
			this.scope.unregister(handler);
		}
	}
	protected async onClose(): Promise<void> {
		this.unregisterScope();
	}
}

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
		this.div.style.setProperty('--x', `${(100 / gridSize) * coords[0]}%`);
		this.div.style.setProperty('--y', `${(100 / gridSize) * coords[1]}%`);
	}
	async fadeIntoExistence() {
		this.div.style.setProperty('--game-tile-size', `${0}%`);
		this.div.style.setProperty('--num-2048-tiles', `${gridSize}`);
		
		await sleep(TRANSITION_TIME / 5);

		this.div.style.setProperty('--game-tile-size', `${100 / gridSize}%`);
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