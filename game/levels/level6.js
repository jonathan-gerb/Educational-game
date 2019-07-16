Level6 = new Phaser.Class({
	Extends: Phaser.Scene,

	levelName: 'level6',

	objects: COMMON_OBJECTS.concat([
		'for_x',
		'turnDegrees',
	]),

	initialize: function() { Utils.initializeLevel.bind(this)() },

	preload: function() { Utils.preloadLevel(this) },

	create: function ()
	{
		const gameboard = [
			[0,0,0,0,0,1,1,1,1],
			[0,0,0,0,1,0,0,1,2],
			[0,0,0,1,0,1,1,0,0],
			[0,0,0,1,1,0,0,1,0],
			[0,1,1,0,0,1,1,0,0],
			[1,0,0,0,0,0,0,0,0],
		];
		const nodes = Utils.boardToNodes(gameboard, TYPE_ORIENTATION_DEGREES);
		const levelConfig = {
			goalPosition: '8,1',
			initPosition: {
				orientation: '90',
				nodeLocation: '0,5',
			},
			maxCommands: 7,
			levelName: this.levelName,
			nodes: nodes,
			objects: this.objects,
			orientationType: TYPE_ORIENTATION_DEGREES,
			spaceType: TYPE_SPACE_GRID,
		}

		window.ossieGame = new OssieGame(levelConfig, this);
	}
});
