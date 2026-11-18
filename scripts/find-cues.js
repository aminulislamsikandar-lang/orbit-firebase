// scripts/find-cues.js - finds the start time of every spoken part (letter, word, letter, word...) in a teacher recording, to paste as AS_CUES2 in public/bolo-core.js.
// Needs ffmpeg. Usage: node scripts/find-cues.js public/bolo-audio/assamese-vyanjan2.mp3 [silence_dB=-35] [min_gap_s=0.25]
const { spawnSync } = require('child_process');
const file = process.argv[2], db = process.argv[3] || '-35', gap = process.argv[4] || '0.25';
if (!file) { console.error('usage: node scripts/find-cues.js <audio file> [silence dB] [min gap s]'); process.exit(1); }
const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'silencedetect=noise=' + db + 'dB:d=' + gap, '-f', 'null', '-'], { encoding: 'utf8' });
if (r.error) { console.error('ffmpeg not found'); process.exit(1); }
const starts = [], ends = [];
for (const m of r.stderr.matchAll(/silence_(start|end): (-?[\d.]+)/g)) (m[1] === 'start' ? starts : ends).push(+m[2]);
// speech starts where a silence ends (plus the very first sound if the file does not begin with silence)
const dm = r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/), total = dm ? +dm[1] * 3600 + +dm[2] * 60 + +dm[3] : Infinity;
const cues = ends.filter(e => e < total - 0.3).map(e => Math.round(e * 100) / 100);   // a silence that runs to the end of the file is not a cue
if (starts.length && starts[0] > 0.05) cues.unshift(0);
console.log('found ' + cues.length + ' speech parts (46 expected for 23 items: letter + word each)');
console.log('const AS_CUES2 = [' + cues.join(', ') + '];');
if (cues.length !== 46) console.log('Not 46: try another silence level, e.g. node scripts/find-cues.js <file> -30 0.2  (or -40 0.3)');
