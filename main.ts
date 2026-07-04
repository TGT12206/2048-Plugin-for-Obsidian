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

	protected grid_size = 4;

	protected tiles: (Tile | null)[][] = [];

	protected curr_coords: Index2D = [0, 0];
	protected edge: Index2D = [0, 0];

	protected curr_tile: Tile | null = null;
	protected edge_tile: Tile | null = null;

	protected currently_calculating: boolean = false;

	protected div: HTMLDivElement;

	protected override async onOpen() {
		this.scope = new Scope(this.app.scope);

		this.contentEl.empty();
		this.div = this.contentEl.createDiv();
		this.div.classList.add('game-grid-2048');

		this.initialize_tiles();
		this.reset_tiles();

		this.registerScopeEvent(null, ['ArrowUp', 'w'], () => this.slide('up'));
		this.registerScopeEvent(null, ['ArrowDown', 's'], () => this.slide('down'));
		this.registerScopeEvent(null, ['ArrowLeft', 'a'], () => this.slide('left'));
		this.registerScopeEvent(null, ['ArrowRight', 'd'], () => this.slide('right'));
		this.registerScopeEvent(null, ['R'], () => this.reset_tiles());
	}
	/** returns coords adjacent to the given coords, in the OPPOSITE of the given direction */
	protected next_coords(coords: Index2D, direction: Direction): Index2D {
		switch (direction) {
			case 'up':
				return [coords[0], coords[1] - 1];
			case 'down':
				return [coords[0], coords[1] + 1];
			case 'left':
				return [coords[0] + 1, coords[1]];
			case 'right':
				return [coords[0] - 1, coords[1]];
		}
	}
	protected place_new_tile() {
		const coords: Index2D = [
			Math.floor(Math.random() * gridSize),
			Math.floor(Math.random() * gridSize)
		];
		while (this.get_tile(coords) !== null) {
			coords[0] = Math.floor(Math.random() * gridSize);
			coords[1] = Math.floor(Math.random() * gridSize);
		}
		this.set_tile(coords, this.generate_new_tile());
		this.get_tile(coords)?.moveDiv(coords);
	}
	protected generate_new_tile() {
		const div = this.div.createDiv('game-tile-2048');
		const value = Math.random() < PROBABILITY_OF_2 ? 2 : 4;
		return new Tile(div, value);
	}
	protected get_tile(coords: Index2D) {
		return this.tiles[coords[0]][coords[1]];
	}
	protected set_tile(coords: Index2D, tile: Tile | null) {
		this.tiles[coords[0]][coords[1]] = tile;
	}
	protected initialize_tiles() {
		this.tiles = [...new Array(this.grid_size)].map(e => [...new Array(this.grid_size)].fill(null));
	}
	protected reset_tiles() {
		this.div.empty();
		this.tiles.forEach(row => row.fill(null));
		this.place_new_tile();
		this.place_new_tile();
	}
	protected slide_tile = (direction: Direction) => {
		this.curr_tile = this.get_tile(this.curr_coords);

		if (this.curr_tile === null) return false;

		this.edge_tile = this.get_tile(this.edge);
		if (this.edge_tile === null) return this.hit_wall();

		const next_edge = this.next_coords(this.edge, direction);
		if (this.curr_tile.value !== this.edge_tile.value) return this.hit_tile(next_edge);
		return this.hit_and_merge(next_edge);
	}
	protected hit_wall() {
		this.set_tile(this.edge, this.curr_tile);
		this.set_tile(this.curr_coords, null);
		this.curr_tile?.moveDiv(this.edge);
		return true;
	}
	protected hit_tile(next_edge: Index2D) {
		const alreadyAtEdge = this.curr_coords[0] === next_edge[0] && this.curr_coords[1] === next_edge[1];

		this.set_tile(next_edge, this.curr_tile);
		if (!alreadyAtEdge) this.set_tile(this.curr_coords, null);
		this.curr_tile?.moveDiv(next_edge);
		
		this.edge = next_edge;

		return !alreadyAtEdge;
	}
	protected hit_and_merge(next_edge: Index2D) {
		this.edge_tile?.merge(<Tile> this.curr_tile, this.edge);

		this.curr_tile = null;
		this.set_tile(this.curr_coords, null);

		this.edge = next_edge;
		return true;
	}
	protected start_of_new_line(dir: Direction, line: number): Index2D {
		switch (dir) {
			case 'up':
				return [line, gridSize - 1];
			case 'down':
				return [line, 0];
			case 'left':
				return [0, line];
			case 'right':
				return [gridSize - 1, line];
		}
	}
	protected print_tiles() {
		let str = '';
		for (let row = gridSize - 1; row >= 0; row--) {
			for (let col = 0; col < gridSize; col++) {
				const tile = this.tiles[col][row];
				str += (tile ? tile.value : 0) + ' ';
			}
			str += '\n';
		}
		console.log(str);
	}
	protected async slide(direction: Direction) {
		if (this.currently_calculating) return;
		this.currently_calculating = true;

		let changed = false;
		for (let line = 0; line < this.grid_size; line++) {
			this.edge = this.start_of_new_line(direction, line);
			this.curr_coords = this.next_coords(this.edge, direction);
			for (let cell = 0; cell < this.grid_size - 1; cell++) {
				if (this.slide_tile(direction)) changed = true;
				this.curr_coords = this.next_coords(this.curr_coords, direction);
			}
		}
		if (changed) {
			await sleep(gridSize*gridSize/2);
			this.place_new_tile();
		}

		this.currently_calculating = false;
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