import Phaser from 'phaser'
import { COMMON_MODALS, COMMON_OBJECTS } from '~/constants/objects'
import OssieGame from '~/ossie_game'
import { PhaserLevel } from '~/types'
import { LevelConfigPixle, Space } from '~/types/game_config'
import { preloadLevel } from '~/utils/level_setup'

const LEVELNAME = 'level13'
export default class Level13 extends Phaser.Scene implements PhaserLevel {
	constructor() {
		super(LEVELNAME)
	}

	levelName = LEVELNAME

	objects = COMMON_OBJECTS.concat([
		'for_x',
		'turndegrees',
		'steppixles',
		'steppixles_back',
	])
	modals = COMMON_MODALS

	initialize() { Phaser.Scene.call(this, { key: this.levelName }) }

	preload() {
		preloadLevel(this)
	}

	create() {
		const goalPath = [
			'320,200',
			'220,200', // 1
			'291,271',
			'220,200', // 2
			'220,300',
			'220,200', // 3
			'149,271',
			'220,200', // 4
			'120,200',
			'220,200', // 5
			'149,129',
			'220,200', // 6
			'220,100',
			'220,200', // 7
			'291,129',
			'220,200', // 8
		]
		const levelConfig: LevelConfigPixle = {
			goalPath,
			initPosition: {
				orientation: 90,
				nodeLocation: '220,200',
			},
			maxCommands: 6,
			levelName: this.levelName,
			objects: this.objects,
			pixleSize: 0.135,
			spaceType: Space.pixles,
		}

		window.ossieGame = new OssieGame(levelConfig, this)
	}
}
