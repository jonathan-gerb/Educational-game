function InterPhaser(phaser, levelConfig, eventHandler) {
	this.phaser = phaser;
	this.levelConfig = levelConfig;
	this.eventHandler = eventHandler;

	this.levelConfig.objects = this.levelConfig.objects.concat(COMMON_OBJECTS);
	this.setLevel();
	this.setInteractions();
	if (!window.debug) {
		this.showIntro();
	}
};

InterPhaser.prototype.showIntro = function() {
	let instructionName = this.levelConfig.levelName.replace('level', 'instruction');
	window.showModal(instructionName);
}

InterPhaser.prototype.setLevel = function() {
	let phsr = this.phaser
	// let height = window.innerHeight
	// let width = window.innerHeight * WH_RATIO
	let height = BASE_SIZE_Y
	let width = BASE_SIZE_X
	let scalingfactor = width / SCALING_FACTOR_DIV
	this.height = height
	this.width = width
	this.scalingfactor = scalingfactor

	this.stepsize_horizontal = width * BOARD_STEPSIZE_X
	this.stepsize_vertical = height * BOARD_STEPSIZE_Y
	this.boardOffsetX = width * BOARD_OFFSET_X
	this.boardOffsetY = height * BOARD_OFFSET_Y

	// ================================================================
	// PREPARING ASSETS
	// ================================================================

	// Set static objects
	this.objects = {};
	let objects = this.objects;
	this.stackObjects = [];

	let backgroundName = 'background' + this.levelConfig.levelName.replace(/[A-Za-z]/g, '');
	this.objects.background = phsr.add.image(0, 0, backgroundName).setOrigin(0, 0);
	this.objects.background.name = 'background';
	this.objects.background.setDisplaySize(width, height);

	let maxCommands = this.levelConfig.maxCommands;
	OBJECT_CONF.stepcount_total.spriteID = maxCommands.toString();
	this.objects.stepcount_total = this.setGameObject(OBJECT_CONF.stepcount_total, 'stepcount_total');

	this.setDynamicObjects();
}

InterPhaser.prototype.setDynamicObjects = function() {
	let objects = this.objects;

	for (let objectName of INIT_OBJECTS) {
		if (!this.hasObject(objectName)) { continue; }
		let objConfig = OBJECT_CONF[objectName];

		// normal objects
		if (OBJECTS_MULTIPLE.indexOf(objectName) === -1) {
			objects[objectName] = this.setGameObject(objConfig, objectName);
			objects[objectName].name = objectName;

		} else { // draggable commands can have multiple versions
			objects[objectName] = {};
			let objectRef = objectName + '-' + 0;
			let object = this.setGameObject(objConfig, objectRef);
			object.setData('i', 0);
			objects[objectName][0] = object;
		}
	}

	if (this.levelConfig.spaceType === TYPE_SPACE_GRID) {
		if (this.hasObject('questionmark')) {
			let questionmarkCoords = Utils.strToCoord(this.levelConfig.goalPosition);
			objects.questionmark.x += this.boardOffsetX;
			objects.questionmark.y += this.boardOffsetY;
			objects.questionmark.x += this.stepsize_horizontal * questionmarkCoords.x;
			objects.questionmark.y += this.stepsize_vertical * questionmarkCoords.y;
		}
	// ELSE ??
	}

	let me = this;
	objects.execute.on('pointerdown', function (pointer) {
		this.setTint(0xff0000);
		if (me.stackObjects === undefined || me.stackObjects.length === 0) return;

		let repr = me.getStackRepresentation();
		me.eventHandler(PHASER_STACK_START, { stack: repr });
		me.running = true;
	});

	objects.reset.on('pointerdown', this.resetLevel.bind(this));

	objects.backButton.on('pointerdown', this.showIntro.bind(this));

	this.updateOssiePos(this.levelConfig.initPosition);
}

InterPhaser.prototype.setGameObject = function(config, id) {
	let scaling = (config.scaling || 1) * this.scalingfactor;
	let objectName = id.split('-')[0];

	let gameObject = this.phaser.add.sprite(0, 0, config.spriteID);
	gameObject.setDisplaySize(gameObject.width * scaling, gameObject.height * scaling);

	// we need to draw numbers for the amount of repeats for forX and degrees for turnDegrees
	if (objectName === 'for_x' || objectName === 'turndegrees') {
		// SO this is a bit weird, we're replacing the gameObject with a container containing the gameObject.
		// This is so that we can treat the container like an object, so it will take the number with it when dragging
		let container = this.phaser.add.container(0, 0, [gameObject]);
		container.setSize(gameObject.width, gameObject.height);
		gameObject = container;
	}
	gameObject.setData('objectRef', id);
	gameObject.name = objectName;


	if (config.command !== undefined) {
		let commandObject = Utils.deepCopy(config.command);
		// This is a command object, we need a reference to itself for when we pass it to the stack
		commandObject.objectRef = id;
		gameObject.setData('command', commandObject);
		gameObject.setData('commandID', config.command.commandID);
	}
	if (config.offsetX !== undefined) {
		gameObject.x = config.offsetX * this.width;
		gameObject.y = config.offsetY * this.height;
	}
	if (config.depth !== undefined) {
		gameObject.setDepth(config.depth);
	}
	if (config.interactive === true || config.draggable === true) {
		gameObject.setInteractive();
	}
	if (config.draggable === true) {
		this.phaser.input.setDraggable(gameObject);
	}

	return gameObject;
}

InterPhaser.prototype.resetLevel = function() {
	if (window.modalVisible) { return }

	console.log("restarting level")
	this.eventHandler(PHASER_STACK_RESET);
	this.activeCommand = undefined;
	this.stackIndex = undefined;
	this.running = false;
	this.maxedOut = false;

	// Lots of prior knowledge here: we are
	for (let objectName of INIT_OBJECTS) {
		if (this.objects[objectName] === undefined) { continue }
		console.log('resetting object', objectName);
		if (OBJECTS_MULTIPLE.indexOf(objectName) === -1) {
			let object = this.objects[objectName];
			if (object !== undefined) {
				if (Utils.isBracketObject(object) && this.stackObjects.indexOf(object) > -1) {
					this.clearBracketObject(object);
				}
				object.destroy();
			}
		} else {
			for (let objectKey in this.objects[objectName]) {
				let object = this.objects[objectName][objectKey];
				if (object === undefined || object.scene === undefined) { continue; }

				if (Utils.isBracketObject(object) && this.stackObjects.indexOf(object) > -1) {
					this.clearBracketObject(object);
				}

				object.destroy();
			}
		}
		this.objects[objectName] = undefined;
	}
	delete this.stackObjects;
	this.stackObjects = [];

	// Cleaned up old data, now we need to reinitialize. That's easy:
	this.setDynamicObjects();
	// this.setInteractions();
	// window.game.scene.stop(this.levelConfig.levelName);
	// window.game.scene.start(this.levelConfig.levelName);
}

InterPhaser.prototype.setInteractions = function() {
	// ================================================================
	// PREPARING DEFAULT GAME INTERACTIONS
	// ================================================================
	let myself = this
	let phsr = this.phaser;
	let pOjs = this.objects;

	let height = this.height;
	let width = this.width;

	// this.renderDropZone();
	this.stackPos = { x: width * STACK_ZONE_POS_X, y: height * STACK_ZONE_POS_Y };

	// ================================================================
	// handle click events for different buttons
	// ================================================================
	let firstDrag = true;
	let newDrag = false

	let fastClickTimeout = null;
	let fastClick = false;
	phsr.input.on('gameobjectdown', function(pointer, gameObject) {
		if (myself.running === true) { return; }
		// Only allow command objects to be dragged
		if (gameObject.getData('commandID') === undefined) { return }
		fastClick = true;
		clearTimeout(fastClickTimeout);
		fastClickTimeout = setTimeout(function() {
			fastClick = false;
		}, 300);

		newDrag = true;
		firstDrag = true;
	});

	phsr.input.on('drag', function (pointer, gameObject, dragX, dragY) {
		if (myself.running === true) { return }
		if (firstDrag) {
			// First drag event doesn't count, as it fires on initial mouse click without any movement
			return firstDrag = false;
		}
		if (newDrag) {
			let canHaveMultiple = OBJECTS_MULTIPLE.indexOf(gameObject.name) > -1;
			// Drag/remove command from the command queue
			if (myself.inDropZone(pointer)) {
				myself.removeFromStack(gameObject);

			} else if (!myself.maxedOut && canHaveMultiple) {
				// Dragging from original position, so create another one under the hood
				myself.duplicateObject(gameObject);
			}
			newDrag = false;
			fastClick = false;
		}

		gameObject.setDepth(3);

		gameObject.x = dragX;
		gameObject.y = dragY;

		if (myself.inDropZone(pointer)) {
			myself.positionCommands(pointer);
		}
	});

	phsr.input.on('dragend', function (pointer, gameObject, dropped) {
		if (myself.running === true) { return }
		myself.clearHoverTexture(gameObject);
		gameObject.setDepth(2);
		newDrag = false;

		if (fastClick) {
			return myself.fastClick(pointer, gameObject);
		}

		let stackFull = myself.maxedOut && OBJECTS_WRAP.indexOf(gameObject.name) === -1;
		let shouldDrop = myself.inDropZone(pointer) && !pointer.isDown;
		if (!stackFull && shouldDrop) {
			return myself.dropObjectOnStack(gameObject);
		}

		myself.positionCommands();
		if (OBJECTS_MULTIPLE.indexOf(gameObject.name) > -1) {
			// Dragged outside of drop zone -> delete this object
			myself.objects[gameObject.name][gameObject.getData('i')] = undefined;
			gameObject.destroy();
		} else {
			// Don't delete object if there is only one (i.e. open/close)
			let conf = OBJECT_CONF[gameObject.name];
			gameObject.x = myself.width * conf.offsetX;
			gameObject.y = myself.height * conf.offsetY;
		}
	});

	phsr.input.on('pointerover', function (event, gameObjectList) {
		let object = gameObjectList[0];
		if (object !== undefined) {
			myself.setHoverTexture(object);
		}
	});

	phsr.input.on('pointerout', function (event, gameObjectList) {
		if (gameObjectList.length > 0) {
			myself.clearHoverTexture(gameObjectList[0]);
		}
	});
}

// Used to make a new command in the command area to replace the one that the user is dragging
InterPhaser.prototype.duplicateObject = function(gameObject) {
	let newObjectI = gameObject.getData('i') + 1;
	let newObjectRef = gameObject.name + '-' + newObjectI.toString();
	let newObject = this.setGameObject(OBJECT_CONF[gameObject.name], newObjectRef);
	newObject.setData('i', newObjectI);
	this.objects[gameObject.name][newObjectI] = newObject;
}

InterPhaser.prototype.setHoverTexture = function(gameObject) {
	if (gameObject.scene === undefined) { return }
	let objConfig = OBJECT_CONF[gameObject.name];
	if (objConfig === undefined || gameObject.getData('hover')) { return }

	let hoverTexture = gameObject.texture ? gameObject.texture.key + "-hover" : '';

	gameObject.setData('hover', true);
	if (SPRITE_PATHS[hoverTexture] === undefined) {
		let newScale = objConfig.scaling ? HOVER_SCALING * objConfig.scaling : HOVER_SCALING;
		gameObject.setScale(newScale);
		return;
	}

	gameObject.setTexture(hoverTexture);
}

InterPhaser.prototype.clearHoverTexture = function(gameObject) {
	let objConfig = OBJECT_CONF[gameObject.name];
	if (objConfig === undefined || !gameObject.getData('hover')) { return }

	gameObject.setData('hover', false);
	if (!gameObject.texture || gameObject.texture.key.indexOf('hover') === -1) {
		let newScale = objConfig.scaling ? objConfig.scaling : (1 / HOVER_SCALING);
		gameObject.setScale(newScale);
		return;
	}
	let newTexture = gameObject.texture.key.replace('-hover', '');

	if (gameObject.scene === undefined) return; // is being deleted
	gameObject.setTexture(newTexture);

}
InterPhaser.prototype.fastClick = function(pointer, gameObject) {
	this.stackIndex = undefined;
	let inDropZone = this.inDropZone(pointer)
	let stackFull = this.maxedOut && OBJECTS_WRAP.indexOf(gameObject.name) === -1;

	// fastClick in DropZone to ask for new input for numbers
	if (inDropZone && OBJECTS_NUMBERCOMMAND.indexOf(gameObject.name) > -1) {
		return this.askCounts(gameObject);
	}
	if (inDropZone || stackFull) { return }

	// Add command to stack
	this.dropObjectOnStack(gameObject);
	if (OBJECTS_MULTIPLE.indexOf(gameObject.name) > -1) {
		this.duplicateObject(gameObject);
	}
}
//  Just a visual display of the drop zone
InterPhaser.prototype.renderDropZone = function() {
	if (this.graphics === undefined) {
		this.graphics = this.phaser.add.graphics();
		this.graphics.lineStyle(2, 0xffff00);
	}
	this.graphics.strokeRect(
		this.width * BOARD_OFFSET_X,
		this.height * BOARD_OFFSET_Y,
		this.width * BOARD_STEPSIZE_X * 8,
		this.height * BOARD_STEPSIZE_Y * 5
	);
	this.graphics.strokeRect(
		this.width * BOARD_OFFSET_X,
		this.height * BOARD_OFFSET_Y,
		this.width * BOARD_STEPSIZE_X,
		this.height * BOARD_STEPSIZE_Y
	);
}

InterPhaser.prototype.inDropZone = function(location) {
	return (
		location.x > this.width * STACK_ZONE_POS_X
		&& location.x < this.width * (STACK_ZONE_POS_X + STACK_ZONE_WIDTH)
		&& location.y > this.height * STACK_ZONE_POS_Y
		&& location.y < this.height * (STACK_ZONE_POS_Y + STACK_ZONE_HEIGHT)
	);
}

InterPhaser.prototype.dropObjectOnStack = function(gameObject) {
	console.log('Drop object', gameObject, 'stackIndex:', this.stackIndex, 'stackObjects', this.stackObjects);

	// First input the amount for commands that require it
	let command = gameObject.getData('command');
	let askForCounts = command.counts === null || command.degrees === null;
	if (askForCounts) {
		result = this.askCounts(gameObject);
		if (result === false) {
			// user cancelled input
			delete this.objects[command.objectRef];
			gameObject.destroy();
			return this.positionCommands();
		}
	}

	// Add object to internal InterPhaser stack
	this.stackIndex = this.stackIndex !== undefined ? this.stackIndex : this.stackObjects.length;
	this.stackObjects.splice(this.stackIndex, 0, gameObject);

	let isBracketObject = Utils.isBracketObject(gameObject);
	if (isBracketObject) {
		this.insertBrackets(gameObject);
	}

	this.positionCommands();
	this.updateStepcount();
}

InterPhaser.prototype.askCounts = function(gameObject) {
	let command = gameObject.getData('command');
	let askForX = command.counts !== undefined;
	let msg = askForX ? 'Hoe vaak herhalen?' : 'Hoeveel graden?';

	let promptForInput = function(wrongInput) {
		let question = wrongInput ? 'Er is iets fout gegaan. Heb je een getal ingevoerd? \n \n' + msg : msg;
		let result = window.prompt(question, 'Voer een getal in');
		if (result === null) { return false; } // Cancel

		let counts = parseInt(result, 10);
		if (!isNaN(counts) && counts < 1000 && counts > -1000) {
			return counts;
		}
		return promptForInput(true);
	}

	let result = promptForInput();
	if (result === false) { return false }

	let key = askForX ? 'counts' : 'degrees';
	command[key] = result;
	this.renderNumber(gameObject, result);
	return true;
}

InterPhaser.prototype.positionCommands = function(pointer) {
	this.stackIndex = undefined;
	let bracketIndent = STACK_BRACKET_INDENT * this.height;
	let bracketTopOffset = STACK_BRACKET_OFFSET * this.height;
	let bracketSpacing = STACK_BRACKET_SPACING * this.height;
	let commandSpacing = STACK_COMMAND_SPACING * this.height;
	let avgCommandSize = STACK_AVG_CMD_SIZE * this.height;
	let stackX = STACK_ZONE_POS_X * this.width;
	let stackY = (STACK_ZONE_POS_Y * this.height) + avgCommandSize;

	for (let i in this.stackObjects) {
		let object = this.stackObjects[i];

		object.y = object.name === 'bracketSide' ? stackY : stackY + object.height / 2;
		if (object.name === 'bracketBottom') {
			var bracketSide = this.objects['bracketSide-for:' + object.getData('blockRef')];
			let heightDiff = object.y - bracketSide.y;
			if (heightDiff < avgCommandSize) {
				object.y += avgCommandSize;
			}
		}
		if (object.name === 'bracketBottom' || object.name === 'close') {
			stackX -= bracketIndent;
		}
		object.x = stackX + (object.width / 2);

		// See if we should add temporary space around the pointer
		let bracketSideOrTop = object.name === 'bracketSide' || object.name === 'bracketTop';
		let tryTempSpace = this.stackIndex === undefined && pointer !== undefined && !bracketSideOrTop;
		if (tryTempSpace && pointer.y < object.y) {
			this.stackIndex = parseInt(i, 10); // WHY THE FFFFFFFF IS THIS A STRING???
			object.y += avgCommandSize;
		}

		switch (object.name) {
			case 'bracketTop':
				stackY = stackY + bracketTopOffset;
				break;
			case 'bracketSide':
				stackX += bracketIndent;
				stackY = object.y + bracketSpacing;
				break;
			case 'bracketBottom':
				// Scaling of bracket side
				heightDiff = (object.y + object.height / 2) - bracketSide.y;
				let newScale = heightDiff / bracketSide.height;
				bracketSide.scaleY = Math.max(0.2, newScale);
				bracketSide.scaleX = Math.max(0.5, Math.min(0.8, newScale));
				bracketSide.x = bracketSide.x - Math.min(10, 13 * newScale);
				bracketSide.y += heightDiff / 2;

				stackY = object.y + object.height / 2 + bracketSpacing;
				break;
			case 'for':
			case 'for_x':
			case 'for_till':
				stackY = (object.y + object.height / 2) - 0.002 * this.height;
				break;
			case 'open':
				stackX += bracketIndent;
			default:
				stackY = object.y + (object.height / 2) + commandSpacing;
		}
	}
}

/**
* Position the for command and the corresponding bracket in the commandzone
*/
InterPhaser.prototype.insertBrackets = function(gameObject) {
	let insertIn = this.stackIndex + 1;
	for (let objectName of ['bracketBottom', 'bracketSide', 'bracketTop']) {
		let objID = objectName + '-for:' + gameObject.getData('objectRef');
		let object = this.setGameObject(OBJECT_CONF[objectName], objID);
		this.objects[objID] = object;
		this.stackObjects.splice(insertIn, 0, object);

		if (objectName === 'bracketBottom') {
			object.setData('blockRef', gameObject.getData('objectRef'));
		}
	}
}

InterPhaser.prototype.clearBracketObject = function(bracketObject) {
	let commandRef = bracketObject.getData('objectRef');
	let deleteStart = this.stackObjects.indexOf(bracketObject) + 1;
	let bracketItems = ['bracketBottom', 'bracketSide', 'bracketTop'];
	let i;
	for (i=deleteStart; i < this.stackObjects.length; i++) {
		let object = this.stackObjects[i];
		let selfRef = object.getData('objectRef');
		let blockRef = object.getData('blockRef');

		let permDelete = bracketItems.indexOf(object.name) > -1 || OBJECTS_MULTIPLE.indexOf(object.name) > -1;
		if (object.scene !== undefined && permDelete) {
			object.destroy();
			delete this.objects[selfRef];
		}
		if (blockRef === commandRef) { break; }
	}
	this.stackObjects.splice(deleteStart, 1 + i - deleteStart);
}

InterPhaser.prototype.removeFromStack = function(object) {
	let objectIndex = this.stackObjects.indexOf(object);
	if (objectIndex !== -1) {
		if (Utils.isBracketObject(object)) {
			this.clearBracketObject(object);
		}
		this.stackObjects.splice(objectIndex, 1);
		this.positionCommands();
		this.updateStepcount();
	}
}

InterPhaser.prototype.updateStepcount = function() {
	let stepCounter = this.objects.stepcount;
	let lastStackObject = this.stackObjects.slice(-1)[0];
	let commandTotal = this.stackObjects.reduce(function(counter, stackObject) {
		let commandID = stackObject.getData('commandID');
		let isCommand = commandID !== undefined && ['open', 'close', 'blockend'].indexOf(commandID) === -1;
		return isCommand ? counter + 1 : counter;
	}, 0);

	let newTexture = commandTotal.toString();
	stepCounter.setTexture(newTexture);

	this.maxedOut = commandTotal >= this.levelConfig.maxCommands;
}

// Convert the InterPhaser stacklist to a representation that the ossiegame stack can work with nicely.
// startindex is optional.
InterPhaser.prototype.getStackRepresentation = function() {
	let stack = this.stackObjects;
	// Recursive inner function
	let stackRepresentationInner = function(startIndex) {
		startIndex = startIndex === undefined ? 0 : startIndex;
		let result = [];
		let ifObject = undefined;

		for (let i = startIndex; i < stack.length; i++) {
			let object = stack[i];
			let stackItem = object.getData('command');
			if (stackItem) {
				stackItem.stackIndex = i;
			}
			let commandID = object.getData('commandID');

			switch (commandID) {
				case undefined:
					// Bracketside/brackettop
					break;

				case 'blockend':
					// End of this part of the stack, return the results
					return [result, i];

				case 'if':
					ifObject = stackItem.stackIndex;
				case 'else':
					stackItem.blockRef = commandID === 'else' ? ifObject : undefined; // fallthrough of if case
				case 'for':
					let [newStack, newI] = stackRepresentationInner(i + 1); // RECURSION
					stackItem.do = newStack;
					i = newI;

				default:
					result.push(stackItem);
			}
		}

		return result;
	}.bind(this);
	// Init with 0 to start at the top of command stack
	return stackRepresentationInner(0);
}

InterPhaser.prototype.hasObject = function(objectName) {
	return this.levelConfig.objects.indexOf(objectName) >= 0
}

InterPhaser.prototype.fail = function() {
	this.running = false;
	// let loseImage = this.phaser.add.image(0, 0, 'fail');
	// Phaser.Display.Align.In.Center(loseImage, this.objects.background);
	// loseImage.setDepth(3);
	// let okButton = this.setGameObject(OBJECT_CONF['okButton'], 'okButton');
	//
	// let me = this;
	// okButton.on('pointerdown', function(pointer) {
	// 	loseImage.destroy();
	// 	okButton.destroy();
	// 	if (me.activeCommand !== undefined && !Utils.isBracketObject(me.activeCommand)) {
	// 		me.activeCommand.setTexture(me.activeCommand.texture.key.replace('-crnt', ''));
	// 	}
	// });
	window.showModal('fail');
	this.updateCurrentCommand();
}
/**
* displays a victory image on screen when victory event is fired
*/
InterPhaser.prototype.win = function() {
	let image = document.getElementById('fullscreenGif');
	image.style.display = 'block';
	image.setAttribute('src', SPRITE_PATHS['victory']);
	let nextButton = document.getElementById('nextButton');
	let prevButton = document.getElementById('prevButton');

	let me = this;
	setTimeout(function() {
		nextButton.style.display = 'block';
		prevButton.style.display = 'block';

		let onClick = function(e) {
			image.style.display = 'none';
			nextButton.style.display = 'none';
			prevButton.style.display = 'none';
			nextButton.removeEventListener('click', onClick);
			prevButton.removeEventListener('click', onClick);

			let btnName = e.target.id;
			if (btnName === 'nextButton') {
				let nextLevel = LEVELS[LEVELS.indexOf(me.levelConfig.levelName) + 1];
				if (nextLevel !== undefined) {
					window.game.scene.stop(me.levelConfig.levelName);
					return window.game.scene.start(nextLevel);
				}
			}
			me.resetLevel();
		}
		nextButton.addEventListener('click', onClick);
		prevButton.addEventListener('click', onClick);
	}, VICTORY_TIMEOUT);
}

InterPhaser.prototype.updateOssiePos = function(ossiePos) {
	let player = this.objects.player
	playerConfig = OBJECT_CONF.player

	if (this.levelConfig.spaceType === TYPE_SPACE_GRID) {
		let ossieCoords = Utils.strToCoord(ossiePos.nodeLocation);
		player.x = this.boardOffsetX + (this.stepsize_horizontal * ossieCoords.x);
		player.y = this.boardOffsetY + (this.stepsize_vertical * ossieCoords.y);
	} else {
		let coordX = ossieCoords.x * (this.width / BASE_SIZE_X);
		let coordY = ossieCoords.y * (this.height / BASE_SIZE_Y);
		player.x = this.boardOffsetX + coordX;
		player.y = this.boardOffsetY + coordY;
	}
	if (this.levelConfig.orientationType === TYPE_ORIENTATION_CARDINALS) {
		player.angle = Utils.cardinalToAngle(ossiePos.orientation);
	} else {
		player.angle = ossiePos.orientation - 90;
	}
}

InterPhaser.prototype.onCommandExecute = function(commandReference) {
	let [commandName, commandI] = commandReference.split('-');
	let isMultiple = OBJECTS_MULTIPLE.indexOf(commandName) !== -1;
	let commandObject = isMultiple ? this.objects[commandName][commandI] : this.objects[commandName];
	if (!Utils.isBracketObject(commandObject)) {
		this.updateCurrentCommand(commandObject);
	}
}

InterPhaser.prototype.updateCurrentCommand = function(commandObject) {
	let activeCommand = this.activeCommand;
	// Reset texture of previous activeCommand
	if (activeCommand && activeCommand.scene && !Utils.isBracketObject(activeCommand)) {
		let sprite = activeCommand.add !== undefined ? activeCommand.getAt(0) : activeCommand;
		sprite.setTexture(OBJECT_CONF[activeCommand.name].spriteID);
		this.positionCommands();
	}

	this.activeCommand = commandObject;

	if (commandObject === undefined) { return }

	// Show custom "current" sprite if applicable.
	// The command is a container if it has numbers (turnDegrees), so we need to get the sprite from it
	let sprite = commandObject.add !== undefined ? commandObject.getAt(0) : commandObject;
	let crntTexture = sprite.texture.key + '-crnt';
	if (SPRITE_PATHS[crntTexture] !== undefined) {
		sprite.setTexture(crntTexture);
		this.positionCommands(); // texture has different size, so realign the stack
	}
}

// Render number for commands that need it (forX, turnDegrees)
InterPhaser.prototype.renderNumber = function(object, num) {
	object.each(function(sprite) {
		if (sprite.name.indexOf('number') > -1) {
			object.remove(sprite, true, true);
		}
	})
	let config = OBJECT_CONF[object.name];
	let numX = config.numOffsetX * this.width;
	let numY = config.numOffsetY * this.height;
	let numSpacing = NUM_SPACING * this.width;
	// get array of decreasing order of magnitude (-123 > ['3','2','1','-'])
	let numParts = num.toString().split('').reverse();
	for (let numI in numParts) {
		let numberObj = this.phaser.add.sprite(numX - (numSpacing * numI), numY, numParts[numI]).setScale(NUM_SCALING);
		numberObj.name = 'number' + numI;
		object.add(numberObj);
	}
}
