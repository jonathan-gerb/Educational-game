Level1 = new Phaser.Class({
	Extends: Phaser.Scene,

	levelName: 'level1',

	objects: COMMON_OBJECTS.concat([
		'questionmark',
		'step',
	]),
	modals: COMMON_MODALS.concat([
		'intro',
	]),

	initialize: function() { Utils.initializeLevel.bind(this)() },

	preload: function ()
	{
		Utils.preloadLevel(this);
	},

	create: function ()
	{
		const startLevel1 = function() {
			const gameboard = [
				[0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,1],
				[1,1,1,1,1,1,1,2,1]
			];
			const [nodes, goalPosition] = Utils.boardToNodes(gameboard);
			const levelConfig = {
				goalPosition: goalPosition,
				initPosition: {
					orientation: 'east',
					nodeLocation: '0,6',
				},
				maxCommands: 9,
				levelName: this.levelName,
				nodes: nodes,
				objects: this.objects,
				orientationType: TYPE_ORIENTATION_CARDINALS,
				spaceType: TYPE_SPACE_GRID,
			}

			window.ossieGame = new OssieGame(levelConfig, this);
		}
		let introModal = Object.create(Modals.EventModal);
		introModal.spawn(this, 'intro', 3000, startLevel1.bind(this));
	}
});
