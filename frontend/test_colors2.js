import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import fs from 'fs';

const loader = new PLYLoader();
const buffer = fs.readFileSync('public/outputs/reconstructions/my_fixed_model.ply');
const geometry = loader.parse(buffer.buffer);
console.log('Positions:', geometry.attributes.position.array.slice(0, 6));
console.log('Normals:', geometry.attributes.normal.array.slice(0, 6));
