import fs from 'fs';
const buffer = fs.readFileSync('public/outputs/reconstructions/room_final.ply');
const headerEnd = buffer.indexOf('end_header') + 11;
const header = buffer.toString('utf8', 0, headerEnd);
console.log(header);
