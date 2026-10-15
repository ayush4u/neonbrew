import { Color } from 'three';
export const PALETTE = {
  // peach-gold → soft pink → light lavender (golden hour)
  skyTop: new Color('#b49cf0'), skyMid: new Color('#ff90b0'), skyHorizon: new Color('#ffb870'),
  // brighter friendly turquoise water + soft cream foam
  waterDeep: new Color('#1890b8'), waterShallow: new Color('#38d0c8'), foam: new Color('#fff5ee'),
  // saturated cheerful grass & warm sand
  sand: new Color('#f8d088'), grass: new Color('#4cc040'), shadow: new Color('#b07868'),
  palmTrunk: new Color('#c48858'), palmLeaf: new Color('#30a848'),
  lightWarm: new Color('#ffc878'), neonPink: new Color('#ff8ab8'), neonCyan: new Color('#7af0ff'),
  window: new Color('#ffc070'),
  // lighter warm wood, cream trim, pastel accents
  woodWall: new Color('#e8b07a'), woodDark: new Color('#c89868'), woodTrim: new Color('#f5ebe0'),
  awningA: new Color('#fff0e0'), awningB: new Color('#f06470'),
  coffee: new Color('#ffd090'),
  flowerA: new Color('#ff9ab8'), flowerB: new Color('#ffd878'), flowerC: new Color('#b8e890'),
  pot: new Color('#e89878'),
  pier: new Color('#e8c090'), stone: new Color('#d8c8b0'), rock: new Color('#c4b4a4'), plant: new Color('#5cc850'), pot: new Color('#e89070'), patio: new Color('#f4a088'), pierDark: new Color('#c89860'),
};
export const FOG_COLOR = new Color('#ffb898');
// sun low near horizon, slightly to the right for a sunset angle
export const SUN_DIR = [0.55, 0.22, 0.45];
