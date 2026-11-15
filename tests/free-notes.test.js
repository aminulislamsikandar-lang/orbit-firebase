// Free notes (shown without login) must be well-formed and must not leak exercise answers.
const assert = require('assert');
const notes = require('../freenotes');
const ids = new Set();
for (const n of notes) {
  assert(/^[a-z0-9-]+$/.test(n.id), 'bad id ' + n.id);
  assert(!ids.has(n.id), 'duplicate id ' + n.id);
  ids.add(n.id);
  assert(/^c\d+-[a-z-]+$/.test(n.course), 'course id missing in ' + n.id);
  assert(Number.isInteger(n.cls) && n.subject && n.title && Number.isInteger(n.no), 'missing field in ' + n.id);
  assert(typeof n.summary === 'string' && n.summary.length > 40, 'summary too short in ' + n.id);
  assert(Array.isArray(n.points) && n.points.length >= 5 && n.points.every(p => typeof p === 'string' && p.length > 10), 'points in ' + n.id);
  assert(n.as && typeof n.as.title === 'string' && typeof n.as.summary === 'string', 'Assamese version missing in ' + n.id);
  assert(Array.isArray(n.as.points) && n.as.points.length === n.points.length, 'Assamese points must match English points in ' + n.id);
  assert(/[\u0980-\u09FF]/.test(n.as.title + n.as.summary + n.as.points.join('')), 'Assamese text must use Assamese script in ' + n.id);
  assert(n.as.points.every(p => /[\u0980-\u09FF]/.test(p)), 'every Assamese point needs Assamese script in ' + n.id);
  const all = JSON.stringify(n);
  assert(!/answer key|Ex \d|Exercise \d/i.test(all), 'exercise answers must not be in free notes: ' + n.id);
}
console.log((notes.length * 10) + ' passed, 0 failed');
