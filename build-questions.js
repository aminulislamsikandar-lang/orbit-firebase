// Writes public/questions.json and public/videos.json so Firebase Hosting can serve them without the AI server.
// questions.json has no hidden `context` (poem text, notes for the AI); videos.json has no bucket file paths (keys).
const fs = require('fs');
const path = require('path');
const w = (f, d) => fs.writeFileSync(path.join(__dirname, 'public', f), JSON.stringify(d));
w('questions.json', require('./questions-public'));
w('videos.json', require('./videos').map(({ id, course, chapter, title, free }) => ({ id, course: course || 'c10-science', chapter, title, free: !!free })));
console.log('public/questions.json and public/videos.json written');
