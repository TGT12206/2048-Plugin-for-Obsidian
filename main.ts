import { GAME_VIEW_TYPE, GameView } from 'game-logic/view';
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