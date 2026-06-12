import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { CampusScene } from './scenes/CampusScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  backgroundColor: '#0f0d1a',
  pixelArt: true,
  roundPixels: true,
  scene: [PreloadScene, CampusScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
