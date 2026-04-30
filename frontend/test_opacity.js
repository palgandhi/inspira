import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import fs from 'fs';

const loader = new PLYLoader();
loader.setPropertyNameMapping({
  'f_dc_0': 'red',
  'f_dc_1': 'green',
  'f_dc_2': 'blue'
});
const buffer = fs.readFileSync('public/outputs/reconstructions/my_fixed_model.ply');
const geometry = loader.parse(buffer.buffer);
console.log(Object.keys(geometry.attributes));
