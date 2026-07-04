import { Direction, GRID_SIZE, Index2D, PROBABILITY_OF_2 } from "game-logic/const";
import { ItemView, KeymapEventHandler, KeymapEventListener, Modifier, Scope } from "obsidian";
import { Tile } from "game-logic/tile";

export const GAME_VIEW_TYPE = 'game';
export class GameView extends ItemView {
	override scope: Scope;
	scopeEvents: KeymapEventHandler[] = [];
	getViewType(): string { return GAME_VIEW_TYPE }
	getDisplayText(): string { return '2048' }

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
	/** handle user input for sliding in the given direction */
	protected async slide(direction: Direction) {
		if (this.currently_calculating) return;
		this.currently_calculating = true;

		let changed = false;
		for (let line = 0; line < GRID_SIZE; line++) {
			this.edge = this.start_of_new_line(direction, line);
			this.curr_coords = this.coords_next_to(this.edge, direction);
			for (let cell = 1; cell < GRID_SIZE; cell++) {
				if (this.slide_tile(direction)) changed = true;
				this.curr_coords = this.coords_next_to(this.curr_coords, direction);
			}
		}
		if (changed) {
			await sleep(GRID_SIZE*GRID_SIZE/2);
			this.place_new_tile();
		}

		this.currently_calculating = false;
	}
	/** return coords adjacent to the given coords, in the OPPOSITE of the given direction */
	protected coords_next_to(coords: Index2D, direction: Direction): Index2D {
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
	/** place a new random tile onto the board */
	protected place_new_tile() {
		const coords: Index2D = [
			Math.floor(Math.random() * GRID_SIZE),
			Math.floor(Math.random() * GRID_SIZE)
		];
		while (this.get_tile(coords) !== null) {
			coords[0] = Math.floor(Math.random() * GRID_SIZE);
			coords[1] = Math.floor(Math.random() * GRID_SIZE);
		}
		this.set_tile(coords, this.generate_new_tile());
		this.get_tile(coords)?.moveDiv(coords);
	}
	/** create a new tile object, but it still needs to be moved to the right position */
	protected generate_new_tile() {
		const div = this.div.createDiv('game-tile-2048');
		const value = Math.random() < PROBABILITY_OF_2 ? 2 : 4;
		return new Tile(div, value);
	}
	/** retrieve the tile using the given coordinates */
	protected get_tile(coords: Index2D) {
		return this.tiles[coords[0]][coords[1]];
	}
	/** set the tile at the given coordinates to a new value */
	protected set_tile(coords: Index2D, tile: Tile | null) {
		this.tiles[coords[0]][coords[1]] = tile;
	}
	/** initialize the tiles to an empty grid */
	protected initialize_tiles() {
		this.tiles = [...new Array(GRID_SIZE)].map(e => [...new Array(GRID_SIZE)].fill(null));
	}
	/** start a new game by clearing the grid and placing 2 random tiles */
	protected reset_tiles() {
		this.div.empty();
		this.tiles.forEach(row => row.fill(null));
		this.place_new_tile();
		this.place_new_tile();
	}
	/** handle the sliding logic for a single tile */
	protected slide_tile = (direction: Direction) => {
		this.curr_tile = this.get_tile(this.curr_coords);

		if (this.curr_tile === null) return false;

		this.edge_tile = this.get_tile(this.edge);
		if (this.edge_tile === null) return this.hit_wall();

		const next_edge = this.coords_next_to(this.edge, direction);
		if (this.curr_tile.value !== this.edge_tile.value) return this.hit_tile(next_edge);
		return this.hit_and_merge(next_edge);
	}
	/** slide a tile to hit the wall */
	protected hit_wall() {
		this.set_tile(this.edge, this.curr_tile);
		this.set_tile(this.curr_coords, null);
		this.curr_tile?.moveDiv(this.edge);
		return true;
	}
	/** slide a tile to hit an existing tile but don't merge into it */
	protected hit_tile(next_edge: Index2D) {
		const alreadyAtEdge = this.curr_coords[0] === next_edge[0] && this.curr_coords[1] === next_edge[1];

		this.set_tile(next_edge, this.curr_tile);
		if (!alreadyAtEdge) this.set_tile(this.curr_coords, null);
		this.curr_tile?.moveDiv(next_edge);
		
		this.edge = next_edge;

		return !alreadyAtEdge;
	}
	/** slide a tile to hit an existing tile and merge into it */
	protected hit_and_merge(next_edge: Index2D) {
		this.edge_tile?.merge(<Tile> this.curr_tile, this.edge);

		this.curr_tile = null;
		this.set_tile(this.curr_coords, null);

		this.edge = next_edge;
		return true;
	}
	/**
	 * given a direction to slide and a line number,
	 * return the coordinates of that line's end
	 */
	protected start_of_new_line(dir: Direction, line: number): Index2D {
		switch (dir) {
			case 'up':
				return [line, GRID_SIZE - 1];
			case 'down':
				return [line, 0];
			case 'left':
				return [0, line];
			case 'right':
				return [GRID_SIZE - 1, line];
		}
	}
	/**
	 * print the tiles to the console.
	 * 
	 * the printed tiles follow a cartesian coordinate system,
	 * where the first index is x and the second coordinate is y.
	 * 
	 * x increases left to right.
	 * 
	 * y increases bottom to top.
	 */
	protected print_tiles() {
		let str = '';
		for (let row = GRID_SIZE - 1; row >= 0; row--) {
			for (let col = 0; col < GRID_SIZE; col++) {
				const tile = this.tiles[col][row];
				str += (tile ? tile.value : 0) + ' ';
			}
			str += '\n';
		}
		console.log(str);
	}
	/** register a function to be called when the given keys are pressed */
	registerScopeEvent(modifiers: Modifier[] | null, keys: string[], func: KeymapEventListener) {
		keys.forEach(key => this.scopeEvents.push(this.scope.register(null, key, func)));
	}
	/** unregister all key event handlers to avoid memory leaks */
	unregisterScope() {
		for (const handler of this.scopeEvents) {
			this.scope.unregister(handler);
		}
	}
	protected async onClose(): Promise<void> {
		this.unregisterScope();
	}
}