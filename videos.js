// Recorded video lessons. The files live in a PRIVATE Backblaze B2 bucket; `key` is the file path inside the bucket.
// `chapter` = chapter number it shows under. `free: true` = every logged-in student can watch.
// Students never see `key`: the server turns an id into a short-lived link (see /api/video in server.js).
module.exports = [
  // { id: 'c1-v1', chapter: 1, title: 'Chemical reactions: part 1', key: 'class10/science/ch1-part1.mp4', free: true },
];
