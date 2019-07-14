Utils = {};

Utils.deepCopy = function(object) {
	if (object === null) { return null }

	let result = {};
	// array
	if (object.length !== undefined) {
		result = [];
		for (let item of object) {
			let newItem = (typeof item == 'object') ? Utils.deepCopy(item) : item;
			result.push(newItem)
		}
		return result;
	}

	for (let key in object) {
		let item = object[key];
		let newItem = (typeof item == 'object') ? Utils.deepCopy(item) : item;
		result[key] = newItem;
	}
	return result;
}

// WIDTH/COLUMNS FIRST, START AT 0,0
Utils.coordToStr = function(x, y) {
	return x.toString() + ',' + y.toString();
}

Utils.strToCoord = function(coordStr) {
	let coords = coordStr.split(',');
	return {
		x: parseInt(coords[0], 10),
		y: parseInt(coords[1], 10),
	}
}

Utils.boardToNodes = function(board) {
	let nodes = {};

	for (let y in board) {
		y = parseInt(y, 10);
		for (let x in board[y]) {
			x = parseInt(x, 10);
			if (board[y][x] == 0) {
				continue;
			}
			let nodeName = Utils.coordToStr(x, y);
			let node = {};

			if (y > 0 && board[y - 1][x] != 0) {
				node.north = Utils.coordToStr(x, y - 1);
			}
			if (y + 1 < board.length && board[y + 1][x] != 0) {
				node.south = Utils.coordToStr(x, y + 1);
			}
			if (x > 0 && board[y][x - 1] != 0) {
				node.west = Utils.coordToStr(x - 1, y);
			}
			if (x + 1 < board[y].length && board[y][x + 1] != 0) {
				node.east = Utils.coordToStr(x + 1, y);
			}
			if (board[y][x] == 2) {
				node.goal = true;
			}

			nodes[nodeName] = node;
		}
	}
	return nodes;
}

Utils.resizeBoard = function(board, minSize) {

	let size = {
		x: board[0].length - 1,
		y: board.length - 1
	};

	while (minSize[1] > size.y) {
		board.push[[]];
		size.y = size.y + 1;
		while (board[size.y].length < size.x) {
			board[size.y].push([0]);
		}
	}
	while (minSize[0] > size[0]) {
		size.x = size.x + 1;
		for (row in board) {
			board[row].push([0])
		}
	}

	return board;
}

Utils.nodesToBoard = function(nodes) {
	let board = [[0]];
	for (node of nodes) {
		let tile = Utils.strToCoord(node);
		// Resize board if necessary
		board = Utils.resizeBoard(board, tile);
		board[tile[1]][tile[0]] = 1;
	}
	return board;
}

Utils.cardinalToAngle = function(cardinal) {
	let cardinals = ['east', 'south', 'west', 'north'];
	let result = cardinals.indexOf(cardinal);
	if (result !== -1) {
		return result * 90;
	} else {
		console.error('Error trying to get degrees from', cardinal);
		return -1;
	}
}

// Turn the orientation clockwise if clockWise is true, otherwise counterclockwise. Should only be used with cardinals
Utils.turnClock = function(orientation, clockWise) {
	let cardinals = ['north', 'east', 'south', 'west'];
	let shift = clockWise ? 1 : cardinals.length - 1; // 3 = -1 when doing modulo operation

	let orientationIdx = cardinals.indexOf(orientation);
	let newOrientationIdx = (orientationIdx + shift) % (cardinals.length);

	return cardinals[newOrientationIdx];
}

Utils.isBracketObject = function(object) {
	return object.getData !== undefined && BRACKET_OBJECTS.indexOf(object.getData('commandID')) > -1;
}

// load sprites
Utils.loadSprites = function(phaser) {
	let spriteArray = [];
	let sprite404 = [];
	spriteArray = spriteArray.concat(COMMON_SPRITES);

	let levelID = phaser.levelName.replace('level', '');
	spriteArray.push('instruction' + levelID);
	spriteArray.push('background' + levelID.replace(/a|b|c/g, ''));

	for (let objName of phaser.objects) {
		let objConfig = OBJECT_CONF[objName];
		if (
			objConfig !== undefined
			&& objConfig.spriteID !== undefined
			&& spriteArray.indexOf(objConfig.spriteID) === -1
		) {

			spriteArray.push(objConfig.spriteID);
			if (objConfig.interactive === true || objConfig.draggable === true) {
				spriteArray.push(objConfig.spriteID + "-hover");
			}
			if (objConfig.command !== undefined && objConfig.command.commandID !== undefined) {
				spriteArray.push(objConfig.spriteID + "-crnt");
				spriteArray.push(objConfig.spriteID + "-crnt-hover");
			}

			// Brackets
			if (
				objConfig.command && Utils.isBracketObject(objConfig.command.commandID) > -1
				&& spriteArray.indexOf('bracket-bottom') === -1
			) {
				spriteArray = spriteArray.concat('bracket-bottom', 'bracket-middle', 'bracket-top');
			}

		} else if (SPRITE_PATHS[objName] !== undefined && spriteArray.indexOf(objName) === -1) {
			spriteArray.push(objName);
		}
	}

	let missingSprites = [];
	for (let spriteID of spriteArray) {
		let spriteLocation = SPRITE_PATHS[spriteID];
		if (spriteLocation !== undefined) {
			phaser.load.image(spriteID, spriteLocation);
		} else {
			missingSprites.push(spriteID);
		}
	}
	console.log('Could not find sprites with the following IDs:\n ', missingSprites.join('\n  '));
}

Utils.preloadLevel = function(phaser) {
	Utils.loadSprites(phaser);
}

Utils.initializeLevel = function() {
	Phaser.Scene.call(this, { key: this.levelName });
}
