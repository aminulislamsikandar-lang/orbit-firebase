// Writes public/questions.json and public/videos.json so Firebase Hosting can serve them without the AI server.
// videos.json has no bucket file paths (keys); those stay on the server.
const fs = require('fs');
const path = require('path');
const w = (f, d) => fs.writeFileSync(path.join(__dirname, 'public', f), JSON.stringify(d));
w('questions.json', require('./questions'));
w('videos.json', require('./videos').map(({ id, chapter, title, free }) => ({ id, chapter, title, free: !!free })));
console.log('public/questions.json and public/videos.json written');
