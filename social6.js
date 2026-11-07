// Class 6 Social Science (English medium): "Awareness Social Sciences" for Class VI (S. Chand, Suman Gupta, NCF 2023).
// Question ids start with s6c<chapter>- so they never clash with other courses.
// `context` on a chapter or on a question is hidden from students and only sent to the AI (chapter notes, picture descriptions).
// Chapters with `locked: true` (and no sections) show a lock in the index until their questions are added.
const PIC_WAY = 'Picture "Help the man find the way" (textbook page 16, a small map with a north arrow at the top): a man stands in the middle. The temple is at the top right (north-east of the man), the church is at the top left (north-west of the man), the orchard (a group of trees) is at the bottom left (south-west of the man), and the village (settlement symbol) is at the bottom right (south-east of the man) with the post office (PO) marked just above (north of) the village and the police station (PS) marked just below (south of) the village. The church is almost directly north of the orchard.';
const PIC_DIST = 'Picture for "Measuring distances" (textbook page 16-17, scale 1 inch : 1 km) showing an airport, a metro station, a mobile tower, an orchard and a bus stop joined by lines. Labelled distances: airport to metro station = 6 km; orchard to mobile tower (route towards the metro station) = 5 km; mobile tower to bus stop = 2.5 km. Answers expected in the textbook: (a) 6 km, (b) 5 km, (c) 2.5 km.';
const PIC_GRID = 'Grid map (textbook page 17): columns are numbered 1 to 8 from left to right and rows are lettered A to H from bottom to top. Squares: house = 1B, windmill = 4C, school building = 6A, pine tree = 7D, fort = 5F, mobile/radio tower = 3G, lighthouse = 8H. A square is read as column number first, then row letter (for example 4C). So: 4C = windmill, house = 1B, school building = 6A, fort = 5F, 3G = tower.';

module.exports = {
  id: 'c6-social',
  subject: 'Social Science',
  class: 6,
  chapters: [
    {
      no: 1, title: 'Locating Places and Reading Maps', kind: 'Geography',
      context: `Chapter 1 "Locating Places and Reading Maps" (Class 6 Social Science). Notes for the AI, summarised from the textbook:
- Shape of Earth: Earth is an oblate spheroid (bulging at the centre, flattened at the top and bottom). Equatorial diameter 12,756 km, polar diameter 12,714 km. Earth is so big we cannot see it all from one place, so we use a model (globe) and maps.
- Globe: a small 3D model of Earth. It shows where and how the landmasses, rivers and oceans are located and how Earth rotates on its axis. The axis is an imaginary line through the centre of Earth; its two end points are the North Pole and the South Pole. The axis is tilted (23.5 degrees from the vertical, i.e. 66.5 degrees to the orbital plane). "Globe" comes from the Latin word globus (sphere). Oldest surviving globe: the Erdapfel by Martin Behaim, 1492. Advantages: shows the true shape of Earth, true directions, areas and distances of the whole Earth, day and night, rotation. Limitations: cannot show small areas in detail, cannot be folded or carried easily, costly, bulky, cannot show the whole Earth at once, and cannot hold much information.
- Latitudes (parallels): imaginary lines running parallel to each other around the globe (concentric circles), measured in degrees (and minutes, 60 minutes = 1 degree) as angles from the centre of Earth. The Equator is 0 degrees latitude and divides Earth into the Northern and Southern Hemispheres (equal halves). Degrees increase from the Equator towards the poles (N or S). Seven important latitudes: Equator 0, North Pole 90 N, South Pole 90 S, Tropic of Cancer 23.5 N, Tropic of Capricorn 23.5 S, Arctic Circle 66.5 N, Antarctic Circle 66.5 S. The Equator is the widest part of Earth. Latitudes help divide Earth into heat zones.
- Longitudes (meridians): imaginary vertical lines from the North Pole to the South Pole, equal in length, NOT parallel (they curve and meet at the poles); measured in degrees and minutes; 360 lines (one per degree), or 36 lines if 10 degrees apart. Latitudes and longitudes together form geographic coordinates and give exact locations.
- Prime Meridian: 0 degrees longitude, passes through the Royal Observatory at Greenwich near London (UK); starting point for measuring east and west; divides Earth into the Eastern and Western Hemispheres. The International Date Line is opposite it at 180 degrees, runs north-south across the Pacific Ocean, is slightly irregular so that no land has two dates, and marks the boundary between one day and the next. Moving west across it you add a day; moving east you lose a day. Meridians east of the Prime Meridian are East meridians, those to the west are West meridians.
- Earth rotates west to east on its axis in 24 hours: 360 / 24 = 15 degrees in one hour, so 1 degree takes 4 minutes.
- Heat zones (Earth does not get equal heat because of its curved surface and tilted axis): (1) Torrid Zone, between the Tropic of Cancer (23.5 N) and the Tropic of Capricorn (23.5 S): vertical rays of the Sun throughout the year, hottest zone. (2) Temperate Zones, between the Tropic of Cancer and the Arctic Circle (66.5 N) in the north and between the Tropic of Capricorn and the Antarctic Circle (66.5 S) in the south: slanting rays, moderate climate. (3) Frigid Zones, between the Arctic Circle and the North Pole and between the Antarctic Circle and the South Pole: very slanting rays, the Sun hardly rises above the horizon, extremely cold. Heat zones decide climate, and therefore the crops, natural vegetation and way of life (agriculture) of a region: tropical crops (rice, tea, rubber, coconut) in the torrid zone, wheat, maize and apples in the temperate zones, hardly any farming in the frigid zones.
- Local time: time at a place based on the position of the Sun in the sky, i.e. on the local meridian passing through it. 24 meridians 15 degrees apart differ by 1 hour each; moving east of the Prime Meridian we add 1 hour for every 15 degrees, moving west we subtract 1 hour for every 15 degrees. For places between two meridians the fraction of a degree (minutes) is used.
- Standard time: a country chooses the local time of its central meridian for the whole country. Large countries may have several time zones (Russia has 11). India extends from 68 degrees 7 minutes E to 97 degrees 25 minutes E, so there would be about 29 local times; this would cause confusion in timetables and schedules. So the local time of the 82.5 degrees E meridian (near Allahabad / Prayagraj) is Indian Standard Time (IST) for the whole country, 5.5 hours ahead of Greenwich Mean Time (GMT). When East India sees sunrise, western Rajasthan is still dark, yet clocks show the same hour.
- Maps: diagrammatic representations of the whole or part of Earth's surface on a flat surface, drawn to scale. "Map" comes from the Latin mappa (napkin). Cartography is the art/process of making maps. An atlas is a collection of maps. Maps are preferred over globes because they are easy to carry, handle and store, can show small areas (a country, state, city) in detail, can show roads, railways, bridges, hospitals, waterbodies and much more information. The globe is useful to study Earth as a whole.
- Types of maps: (1) Physical map: natural features (mountains, plateaus, plains, deserts, lakes, oceans, rivers); colours: blue = waterbodies, brown = mountains, yellow = plateaus, green = plains. (2) Political map: boundaries between countries, states, districts, cities. (3) Thematic map: one topic or theme, for example road, rail, weather, rainfall, wind, industrial, agricultural, forest or vegetation maps.
- Components of a map: direction, symbols, distance (scale).
- Direction: a map usually has a compass rose or a north arrow; the map reader aligns it to north. Four cardinal directions (cardinal points): North, South, East, West. Four intermediate directions: North-East, South-East, South-West, North-West (exactly between two cardinal directions). A compass is an instrument for finding directions; it has a freely rotating magnetic needle with a north pole and a south pole that always points north-south; place it on the map and align the north pointer.
- Symbols: the actual shape and size of roads, bridges, trees, wells etc. cannot be drawn on a map, so standard conventional symbols are used, understood all over the world (railway, road, boundary, river, tank, bridge, well, canal, temple, church, mosque, post office PO, police station PS, settlement, tree). A symbol shows only presence and location, not actual size or number. Colours also signify features. The legend or key is the box on the map explaining the symbols.
- Distance and scale: a map is much smaller than the real place, so a scale is given. The scale is the ratio between the distance on the map and the actual distance on the ground. 1:100000 means 1 cm on the map = 100000 cm = 1 km on the ground. 1:150000 means 1 cm = 1.5 km. 1:1000000 means 1 cm = 10 km. Maps of small areas in great detail (a town or city) are large-scale maps; maps of large areas with less detail are small-scale maps. To measure a distance, use a string on the map, then use the scale to find the ground distance. Scale is necessary for a map; a sketch is not made to scale.
- Geographic coordinates and grid lines: maps have a network of vertical and horizontal lines (parallels of latitude and meridians of longitude) called grid lines; a place is located in the square where lines meet (read the column number then the row letter, e.g. 4C), and indexed in an atlas.
- Sketch: a rough drawing of an area, not to scale, giving broad guidelines to find a place (e.g. the way to a friend's house). A good sketch shows one cardinal direction, uses conventional symbols, gives a rough idea of distances and landmarks; more details make it better. Maps and compasses still matter where there is no internet.
- Key words: latitudes (parallels), longitudes (meridians), Prime Meridian, International Date Line, Indian Standard Time (82.5 degrees E, +5.5 hours from GMT), map, political map.
- Textbook exercise facts: Russia has 11 time zones; the Date Line passes through the Pacific Ocean; add one hour for every 15 degrees east of the Prime Meridian; India's standard meridian is 82.5 degrees E; North-South is not an intermediate direction; a scale is necessary for a map (a sketch has no scale); blue shows waterbodies on a map; the axis runs from the North Pole to the South Pole and is tilted at 23.5 degrees.
Answer style: Class 6 students; short, simple sentences, in the student's own words.`,
      sections: [
        { title: "Let's Check 1 (page 10)", questions: [
          { id: 's6c1-lc1', no: 1, text: 'What do two points, one at the top and another at the bottom, denote on the globe?' },
          { id: 's6c1-lc2', no: 2, text: "What do you understand about the 'axis of Earth'?" },
          { id: 's6c1-lc3', no: 3, text: 'Which latitude divides Earth into two hemispheres?' },
          { id: 's6c1-lc4', no: 4, text: 'Define longitude.' },
          { id: 's6c1-lc5', no: 5, text: 'Name some important latitudes.' },
          { id: 's6c1-lc6', no: 6, text: 'What is Equator?' }
        ] },
        { title: "Let's Find (page 11)", questions: [
          { id: 's6c1-lf1', no: 1, text: 'Find out what role heat zones play in determining the type of agriculture practised in different regions.' }
        ] },
        { title: 'Help the man find the way (page 16)', questions: [
          { id: 's6c1-hw1', no: 1, text: 'In which direction should the man move to reach the temple?', context: PIC_WAY },
          { id: 's6c1-hw2', no: 2, text: 'In which direction should the man move to reach the orchard?', context: PIC_WAY },
          { id: 's6c1-hw3', no: 3, text: 'The church is located to the ________ of the orchard.', context: PIC_WAY },
          { id: 's6c1-hw4', no: 4, text: 'The post office is located to the ________ of the village.', context: PIC_WAY },
          { id: 's6c1-hw5', no: 5, text: 'The police station is located to the ________ of the village.', context: PIC_WAY }
        ] },
        { title: 'Measuring Distances (page 17)', questions: [
          { id: 's6c1-md0', no: 1, label: 'a.', text: 'What is the distance between the airport and the metro station?', context: PIC_DIST },
          { id: 's6c1-md1', no: 2, label: 'b.', text: 'How far is the metro station from the orchard?', context: PIC_DIST },
          { id: 's6c1-md2', no: 3, label: 'c.', text: 'What is the distance between the mobile tower and the bus stand?', context: PIC_DIST },
          { id: 's6c1-md3', no: 4, text: 'If the scale on a map is mentioned as 1:1000000, 1 cm on the map will represent ________ km.' }
        ] },
        { title: 'Geographic Coordinates: grid map (page 17)', questions: [
          { id: 's6c1-gc1', no: 1, label: 'a.', text: 'Based on the grid map, what is the place located in square 4C?', context: PIC_GRID },
          { id: 's6c1-gc2', no: 2, label: 'b.', text: 'Based on the grid map, in which square is the house located?', context: PIC_GRID },
          { id: 's6c1-gc3', no: 3, label: 'c.', text: 'Based on the grid map, in which square is the school building located?', context: PIC_GRID },
          { id: 's6c1-gc4', no: 4, label: 'd.', text: 'Based on the grid map, in which square is the fort located?', context: PIC_GRID },
          { id: 's6c1-gc5', no: 5, label: 'e.', text: 'Based on the grid map, what is the place located in square 3G?', context: PIC_GRID }
        ] },
        { title: "Let's Check 2 (page 18)", questions: [
          { id: 's6c1-l21', no: 1, text: 'What is a book of maps called?' },
          { id: 's6c1-l22', no: 2, text: 'Which type of map shows different countries and states of the world?' },
          { id: 's6c1-l23', no: 3, text: 'Which type of map shows the distribution of crops, forests, weather, etc.?' },
          { id: 's6c1-l24', no: 4, text: 'What is a rough drawing without many details?' },
          { id: 's6c1-l25', no: 5, text: 'What is a network of horizontal and vertical lines called?' }
        ] },
        { title: 'Exercises A: Choose the correct option (page 19)', questions: [
          { id: 's6c1-xa1', no: 1, label: 'A1.', text: 'Which of the following lies between the Tropic of Cancer and the Arctic Circle in the northern hemisphere and the Tropic of Capricorn and the Antarctic Circle in the southern hemisphere?', options: ['Torrid Zone', 'Temperate Zone', 'Frigid Zone', 'None of these'] },
          { id: 's6c1-xa2', no: 2, label: 'A2.', text: 'Which ocean does the International Date Line pass through?', options: ['Pacific Ocean', 'Indian Ocean', 'Arctic Ocean', 'Antarctic Ocean'] },
          { id: 's6c1-xa3', no: 3, label: 'A3.', text: 'What should we add for each hour as we move east of the Prime Meridian?', options: ['10°', '15°', '20°', '30°'] },
          { id: 's6c1-xa4', no: 4, label: 'A4.', text: 'How many time zones are there in Russia?', options: ['9', '10', '11', '12'] },
          { id: 's6c1-xa5', no: 5, label: 'A5.', text: 'Where does the Standard Meridian of India pass through?', options: ['82½°E', '82½°W', '80½°W', '83½°E'] },
          { id: 's6c1-xa6', no: 6, label: 'A6.', text: 'Which of the following is not an intermediate direction?', options: ['Northeast', 'Northwest', 'Southeast', 'North-South'] },
          { id: 's6c1-xa7', no: 7, label: 'A7.', text: 'For what is scale necessary?', options: ['sketch', 'map', 'both i and ii', 'none of these'] },
          { id: 's6c1-xa8', no: 8, label: 'A8.', text: 'What does blue colour show on a map?', options: ['waterbodies', 'hills', 'deserts', 'plains'] }
        ] },
        { title: 'Exercises B: Fill in the blanks (page 19)', questions: [
          { id: 's6c1-xb1', no: 1, label: 'B1.', text: 'The axis is an imaginary line passing through the ________ to ________ pole.' },
          { id: 's6c1-xb2', no: 2, label: 'B2.', text: 'The axis is tilted at an angle of ________.' },
          { id: 's6c1-xb3', no: 3, label: 'B3.', text: 'Lines of ________ do not run parallel to each other.' },
          { id: 's6c1-xb4', no: 4, label: 'B4.', text: 'The ________ zone has a moderate climate.' },
          { id: 's6c1-xb5', no: 5, label: 'B5.', text: 'A ________ map depicts information on a particular topic or theme.' },
          { id: 's6c1-xb6', no: 6, label: 'B6.', text: 'The four principal directions are called ________ points.' },
          { id: 's6c1-xb7', no: 7, label: 'B7.', text: 'A ________ is the most common instrument used to locate directions.' },
          { id: 's6c1-xb8', no: 8, label: 'B8.', text: 'A ________ is a rough drawing of an area.' }
        ] },
        { title: 'Exercises C: Match the following (page 19)', questions: [
          { id: 's6c1-xc1', no: 1, label: 'C.', text: 'Match the following. Column B: (i) intermediate direction, (ii) physical map, (iii) blue, (iv) a book of maps, (v) used to find directions.',
            parts: ['1. waterbodies', '2. atlas', '3. southwest', '4. compass', '5. natural features of Earth'] }
        ] },
        { title: 'Exercises D: State whether true or false (page 20)', questions: [
          { id: 's6c1-xd1', no: 1, label: 'D1.', text: 'State whether true or false: The degrees of latitudes decrease as we move away from the Equator to the poles.', options: ['True', 'False'] },
          { id: 's6c1-xd2', no: 2, label: 'D2.', text: 'State whether true or false: The North and South Hemispheres are equal.', options: ['True', 'False'] },
          { id: 's6c1-xd3', no: 3, label: 'D3.', text: 'State whether true or false: The torrid zone has a moderate climate.', options: ['True', 'False'] },
          { id: 's6c1-xd4', no: 4, label: 'D4.', text: 'State whether true or false: The Equator is the widest part of Earth.', options: ['True', 'False'] },
          { id: 's6c1-xd5', no: 5, label: 'D5.', text: 'State whether true or false: Longitudes are horizontal lines starting from the North Pole and terminating at the South Pole.', options: ['True', 'False'] },
          { id: 's6c1-xd6', no: 6, label: 'D6.', text: 'State whether true or false: Details of Earth can easily be shown on a globe.', options: ['True', 'False'] },
          { id: 's6c1-xd7', no: 7, label: 'D7.', text: 'State whether true or false: We can show natural features as well as human-made structures on a map.', options: ['True', 'False'] },
          { id: 's6c1-xd8', no: 8, label: 'D8.', text: 'State whether true or false: Grey colour is used to show mountains on a map.', options: ['True', 'False'] }
        ] },
        { title: 'Exercises E: Answer the following questions briefly (page 20)', questions: [
          { id: 's6c1-xe1', no: 1, label: 'E1.', text: 'What is a globe? What does it show?' },
          { id: 's6c1-xe2', no: 2, label: 'E2.', text: 'Write a short note on the frigid zone.' },
          { id: 's6c1-xe3', no: 3, label: 'E3.', text: 'What is the Prime Meridian?' },
          { id: 's6c1-xe4', no: 4, label: 'E4.', text: 'What is local time?' },
          { id: 's6c1-xe5', no: 5, label: 'E5.', text: 'What is a map?' },
          { id: 's6c1-xe6', no: 6, label: 'E6.', text: 'Why are maps more useful than a globe?' },
          { id: 's6c1-xe7', no: 7, label: 'E7.', text: 'What is the significance of the arrow which points towards the north on a map?' },
          { id: 's6c1-xe8', no: 8, label: 'E8.', text: 'How does a compass help in finding directions?' },
          { id: 's6c1-xe9', no: 9, label: 'E9.', text: 'What are grid lines?' },
          { id: 's6c1-xe10', no: 10, label: 'E10.', text: 'Why is distance a very important aspect of a map?' }
        ] },
        { title: 'Exercises F: Answer the following questions in detail (page 20)', questions: [
          { id: 's6c1-xf1', no: 1, label: 'F1.', text: 'Explain the heat zones of Earth.' },
          { id: 's6c1-xf2', no: 2, label: 'F2.', text: 'How is time assigned to a place through the meridians?' },
          { id: 's6c1-xf3', no: 3, label: 'F3.', text: 'Why have countries fixed a Standard Time? Explain this considering India as an example.' },
          { id: 's6c1-xf4', no: 4, label: 'F4.', text: 'Write any three differences between latitudes and longitudes.' },
          { id: 's6c1-xf5', no: 5, label: 'F5.', text: 'Write the advantages and limitations of a globe.' },
          { id: 's6c1-xf6', no: 6, label: 'F6.', text: 'What do you understand by scale of a map? Mention its importance.' },
          { id: 's6c1-xf7', no: 7, label: 'F7.', text: 'Explain in detail the three different types of maps.' },
          { id: 's6c1-xf8', no: 8, label: 'F8.', text: 'How do symbols help in reading a map? Why are conventional symbols used in a map?' }
        ] },
        { title: 'HOTS (page 20)', questions: [
          { id: 's6c1-h1', no: 1, label: 'H1.', text: 'Google maps are useful tools in modern life. Do you think they can completely substitute the aspect of map-reading?' },
          { id: 's6c1-h2', no: 2, label: 'H2.', text: 'The temperature on Earth is increasing every year. This is due to human activities. How does this phenomenon impact the environment? Do you think there is a need for sensitising our family and friends about this issue?' }
        ] }
      ]
    },
    { no: 2, title: 'Realms of Earth: Continents and Oceans', kind: 'Geography', locked: true, sections: [] },
    { no: 3, title: 'Different Landforms and Life', kind: 'Geography', locked: true, sections: [] },
    { no: 4, title: 'Understanding Timelines and Sources of History', kind: 'History', locked: true, sections: [] },
    { no: 5, title: 'Bharat and its Ancient Civilisation', kind: 'History', locked: true, sections: [] },
    { no: 6, title: 'Our Traditions and Cultural Roots', kind: 'History', locked: true, sections: [] },
    { no: 7, title: 'Unity in Diversity', kind: 'Social Life', locked: true, sections: [] },
    { no: 8, title: 'Family and Community', kind: 'Social Life', locked: true, sections: [] },
    { no: 9, title: 'Elements of Democracy', kind: 'Civics', locked: true, sections: [] },
    { no: 10, title: 'Local Government in Rural Areas', kind: 'Civics', locked: true, sections: [] },
    { no: 11, title: 'Local Government in Urban Areas', kind: 'Civics', locked: true, sections: [] },
    { no: 12, title: 'The Value of Work', kind: 'Economics', locked: true, sections: [] },
    { no: 13, title: 'Economic Activities Around Us', kind: 'Economics', locked: true, sections: [] }
  ]
};
