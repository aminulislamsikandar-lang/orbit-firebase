// Class 6 Science ("General Science"), English medium. Question ids start with sc6c<chapter>- so they never clash with other courses.
// `context` on a chapter or on a question is hidden from students and only sent to the AI (chapter notes, hints).
// The 'Practice Questions' sections (by marks) are extra questions written for revision, not textbook exercises.
// Chapters with `locked: true` (and no sections) show a lock in the index until their questions are added.
const fs = require('fs');
const path = require('path');
// Lesson text lives in lessons/<name>.txt: one paragraph per block, blank line between paragraphs, lines starting with # are ignored.
// With lesson text, the chapter page shows a "Lesson text" button with Translate (Assamese / Hinglish / Bengali) for each paragraph.
const lessonText = name => {
  try {
    return fs.readFileSync(path.join(__dirname, 'lessons', name + '.txt'), 'utf8')
      .split(/\r?\n/).filter(l => !l.trim().startsWith('#')).join('\n')
      .split(/\n\s*\n/).map(x => x.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  } catch (e) { return []; }
};

module.exports = {
  id: 'c6-science',
  subject: 'Science',
  class: 6,
  chapters: [
    {
      no: 1, title: 'The Wonderful World of Science', kind: 'Introduction',
      lesson: lessonText('sc6c1'),
      words: [
        ['curiosity', 'the strong wish to know and learn about things; the most important tool of a scientist'],
        ['observation', 'noticing something carefully with our senses'],
        ['inference', 'a conclusion or explanation drawn from observations'],
        ['hypothesis', 'a guess or possible answer to a question that can be tested'],
        ['scientific method', 'the step-by-step way of asking a question, making a guess (hypothesis) and testing it'],
        ['melting', 'solid changing into liquid when heated, such as ice turning into water'],
        ['freezing', 'liquid changing into solid when cooled, such as water turning into ice'],
        ['boiling', 'liquid changing into gas (steam) quickly when heated'],
        ['life cycle', 'the stages through which a living thing grows and changes, from birth to adult'],
        ['adaptation', 'a special feature or habit that helps a plant or animal survive in its surroundings'],
        ['nutrients', 'the substances in food that give us energy and help us grow'],
        ['dwarf planet', 'a small round object that goes around the Sun but is different from the eight planets, like Pluto']
      ],
      context: `Chapter 1 "The Wonderful World of Science" (Class 6 Science). Notes for the AI, summarised from the textbook:
- Curiosity makes humans explore and understand the world; we ask questions from the moment we begin to speak (why is the sky blue? where does rain come from? how do plants grow?). In the Middle Stage we continue this journey of science.
- Observation = what we notice with our senses. Inference = the conclusion or explanation we draw from observations.
- What is science? More than a school subject: a way of thinking, observing and doing things to understand the world. The most important tool is curiosity. Science helps solve problems and improve life through knowledge and innovation, and it always starts with asking questions. Example: a soap bubble pops on a dry finger but not on a wet finger, because a dry surface disturbs the thin film of water in the bubble.
- Science is everywhere (not only in labs): in food, kitchen, playground, oceans, outer space. Cooking: yeast ferments the sugars in dough and produces carbon dioxide gas that makes the bread rise; heat changes the texture and flavour of food; boiling, frying and baking involve heat transfer. Rain: water droplets form and clouds develop. Ice melts when heat from the air transfers energy to it (melting); boiling turns liquid water into steam; freezing turns water into ice. The water cycle: evaporation (water from oceans and land rises as vapour), condensation (vapour cools to form clouds), precipitation (rain, snow), runoff and groundwater.
- The Science Puzzle: science is like a giant jigsaw puzzle; every discovery is a new piece; each discovery leads to more questions, so science never ends and keeps evolving. Sometimes what we believed is found wrong, which does not make earlier discoveries useless. Example: Pluto was once counted as the ninth planet but was reclassified as a dwarf planet after further research.
- Exploring planet Earth: Earth is the only planet we know that supports life, with a variety of life forms and regions with their own climate, plants and animals. Life cycle: seed grows into a plant; butterfly: egg, caterpillar (larva), pupa, adult butterfly. Adaptation: plants and animals adjust to their environment to survive, e.g. cactus has thick stems that store water and spines instead of leaves to reduce water loss.
- Food and water: all living things need food and water. Food contains nutrients: some give energy, others help us grow; the diet depends on age, activity and nutritional needs; science helps us keep a healthy diet. Cooking methods (boiling, steaming, frying, slow cooking) are based on science. Water is needed for drinking, bathing, cooking; the water cycle explains where water comes from and why it rains. Temperature: we like cool water in summer and warm water in winter because the body reacts to the environment (heating and cooling).
- Science of materials: pencil, eraser, bottle are made of materials such as wood, plastic, metal, rubber; materials have properties (hard/soft, smooth/rough, heavy/light, size, shape, texture, colour). Metals conduct heat better than plastic (metal gets hot in the sun, plastic does not). Mixtures can be separated by using properties: iron filings can be separated from a mixture with sulphur using a magnet because iron is magnetic and sulphur is not.
- Activity (classifying materials): mix materials (feathers, pebbles, marbles, soft toys, pencils, pens, erasers), form groups of 3-4, classify them by properties, record in a table, discuss and compare with other groups.
- The scientific method: a step-by-step process to answer questions and solve problems: 1 Observation (noticing something interesting or not understood), 2 Question, 3 Hypothesis (a possible answer or guess), 4 Experiment (testing the hypothesis), 5 Analysis (examining the results), 6 Conclusion (deciding whether the hypothesis was correct). Example: Observation: sugar dissolves faster in some drinks than others. Question: does sugar dissolve faster in hot or cold water? Hypothesis: sugar dissolves faster in hot water. Experiment: one teaspoon of sugar in a cup of hot water and one in cold water, stir, time it. Analysis: record the time for each. Conclusion: it dissolved faster in hot water, so the hypothesis is confirmed. Anyone can use the scientific method (a cook wondering why milk curdled, a mechanic finding why a car will not start), though not every question can be solved this way; when we ask questions and look for answers we are all scientists.
Answer style: Class 6 students; short, simple sentences, in the student's own words.`,
      sections: [
        { title: "Let's Recall (page 7)", questions: [
          { id: 'sc6c1-r1', no: 1, text: 'Write your inference for this observation: The sky is dark with clouds.',
            context: 'Expected inference: the sky is full of rain clouds, so it is likely to rain soon.' },
          { id: 'sc6c1-r2', no: 2, text: 'Write your inference for this observation: Stars appear to twinkle in the sky.',
            context: 'Expected inference: starlight passes through the moving, uneven layers of Earth\'s atmosphere (air), which bend the light slightly again and again, so the stars seem to twinkle. Stars are very far away and look like tiny points of light.' },
          { id: 'sc6c1-r3', no: 3, text: 'Write your inference for this observation: We wear cotton clothes in the summer season.',
            context: 'Expected inference: cotton absorbs sweat and lets air pass through, so the body stays cool; cotton is a poor absorber of heat compared with dark synthetic cloth.' },
          { id: 'sc6c1-r4', no: 4, text: 'Write your inference for this observation: A plant wilts if not watered regularly.',
            context: 'Expected inference: plants need water to stay firm and to make food; without water the cells lose water and the plant droops (wilts).' }
        ] },
        { title: 'Brain Teaser (page 10)', questions: [
          { id: 'sc6c1-b1', no: 1, text: 'Investigate why slow cooking is often preferred over cooking on a high flame. Discuss this with your elders or family members.',
            context: 'Hints: slow cooking heats food evenly, cooks it through and through without burning the outside, keeps more nutrients and flavour, makes tough food soft, saves fuel and avoids loss of water and burning/charring of food; high flame can burn the outside while the inside stays raw and can destroy some nutrients.' }
        ] },
        { title: 'Brain Teaser (page 12)', questions: [
          { id: 'sc6c1-b2', no: 1, text: 'Describe a daily life situation where you have followed a scientific method.',
            context: 'Give one simple everyday example (for example: the torch does not work -> observe, question, hypothesis that the battery is dead, test by changing the battery, analyse, conclude), written step by step with the six steps of the scientific method.' }
        ] },
        { title: 'Practice Questions: 1 Mark each (MCQ, fill in the blanks, true or false)', questions: [
          { id: 'sc6c1-m1-1', no: 1, label: '1M-1.', text: 'The most important tool for exploring the world through science is:', options: ['curiosity', 'a laboratory', 'a microscope', 'a calculator'] },
          { id: 'sc6c1-m1-2', no: 2, label: '1M-2.', text: 'Which gas produced by yeast makes bread rise?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'] },
          { id: 'sc6c1-m1-3', no: 3, label: '1M-3.', text: 'Pluto is now classified as a:', options: ['star', 'moon', 'dwarf planet', 'comet'] },
          { id: 'sc6c1-m1-4', no: 4, label: '1M-4.', text: 'What is the second step of the scientific method?', options: ['Hypothesis', 'Question', 'Experiment', 'Conclusion'] },
          { id: 'sc6c1-m1-5', no: 5, label: '1M-5.', text: 'Which of these is NOT a stage in the life cycle of a butterfly?', options: ['Egg', 'Caterpillar', 'Tadpole', 'Pupa'] },
          { id: 'sc6c1-m1-6', no: 6, label: '1M-6.', text: 'Which of these can be separated from sulphur using a magnet?', options: ['Iron filings', 'Sugar', 'Salt', 'Chalk powder'] },
          { id: 'sc6c1-m1-7', no: 7, label: '1M-7.', text: 'Fill in the blank: A guess about the possible answer to a question is called a ________.' },
          { id: 'sc6c1-m1-8', no: 8, label: '1M-8.', text: 'Fill in the blank: A cactus has ________ instead of leaves to reduce water loss.' },
          { id: 'sc6c1-m1-9', no: 9, label: '1M-9.', text: 'Fill in the blank: In the water cycle, water vapour cooling to form clouds is called ________.' },
          { id: 'sc6c1-m1-10', no: 10, label: '1M-10.', text: 'Fill in the blank: ________ conduct heat better than plastic.' },
          { id: 'sc6c1-m1-11', no: 11, label: '1M-11.', text: 'State whether true or false: Science is limited to laboratories and textbooks.', options: ['True', 'False'] },
          { id: 'sc6c1-m1-12', no: 12, label: '1M-12.', text: 'State whether true or false: Earth is the only planet we know that supports life.', options: ['True', 'False'] },
          { id: 'sc6c1-m1-13', no: 13, label: '1M-13.', text: 'State whether true or false: Sugar dissolves faster in cold water than in hot water.', options: ['True', 'False'] },
          { id: 'sc6c1-m1-14', no: 14, label: '1M-14.', text: 'State whether true or false: Science never ends because every discovery leads to more questions.', options: ['True', 'False'] }
        ] },
        { title: 'Practice Questions: 2 Marks each (short answer)', questions: [
          { id: 'sc6c1-m2-1', no: 1, label: '2M-1.', text: 'Define observation and inference. Give one example of each.' },
          { id: 'sc6c1-m2-2', no: 2, label: '2M-2.', text: 'What is a hypothesis? Give an example.' },
          { id: 'sc6c1-m2-3', no: 3, label: '2M-3.', text: 'Why does a soap bubble pop on a dry finger but not on a wet finger?' },
          { id: 'sc6c1-m2-4', no: 4, label: '2M-4.', text: 'What is adaptation? Give one example.' },
          { id: 'sc6c1-m2-5', no: 5, label: '2M-5.', text: 'Write the stages of the life cycle of a butterfly in order.' },
          { id: 'sc6c1-m2-6', no: 6, label: '2M-6.', text: 'What does the change in Pluto\'s status from a planet to a dwarf planet tell us about science?' },
          { id: 'sc6c1-m2-7', no: 7, label: '2M-7.', text: 'What happens when an ice cube is left in the open? Why does this happen?' },
          { id: 'sc6c1-m2-8', no: 8, label: '2M-8.', text: 'Why do we prefer cool water in summer and warm water in winter?' }
        ] },
        { title: 'Practice Questions: 3 Marks each (short explanation)', questions: [
          { id: 'sc6c1-m3-1', no: 1, label: '3M-1.', text: 'Write any three examples to show that science is everywhere in our daily life.' },
          { id: 'sc6c1-m3-2', no: 2, label: '3M-2.', text: 'How can iron filings be separated from a mixture of sulphur and iron filings? Why does this method work?' },
          { id: 'sc6c1-m3-3', no: 3, label: '3M-3.', text: 'Name the six steps of the scientific method in the correct order.' },
          { id: 'sc6c1-m3-4', no: 4, label: '3M-4.', text: 'Explain the water cycle in three steps.' },
          { id: 'sc6c1-m3-5', no: 5, label: '3M-5.', text: 'Why is science compared to a giant jigsaw puzzle? Explain.' }
        ] },
        { title: 'Practice Questions: 5 Marks each (long answer)', questions: [
          { id: 'sc6c1-m5-1', no: 1, label: '5M-1.', text: 'Explain the scientific method with the help of the example of sugar dissolving in hot water and cold water.' },
          { id: 'sc6c1-m5-2', no: 2, label: '5M-2.', text: 'How does cooking involve science? Explain with at least three examples from the chapter.' },
          { id: 'sc6c1-m5-3', no: 3, label: '5M-3.', text: '"Science is not just a subject; it is a way of thinking." Explain this statement with examples from the chapter.' }
        ] }
      ]
    },
    { no: 2, title: 'Diversity in the Living World', kind: 'Biology', locked: true, sections: [] },
    { no: 3, title: 'Mindful Eating: A Path to a Healthy Body', kind: 'Biology', locked: true, sections: [] },
    { no: 4, title: 'Exploring Magnets', kind: 'Physics', locked: true, sections: [] },
    { no: 5, title: 'Measurement of Length and Motion', kind: 'Physics', locked: true, sections: [] },
    { no: 6, title: 'Materials Around Us', kind: 'Chemistry', locked: true, sections: [] },
    { no: 7, title: 'Temperature and Its Measurement', kind: 'Physics', locked: true, sections: [] },
    { no: 8, title: 'A Journey through States of Water', kind: 'Chemistry', locked: true, sections: [] },
    { no: 9, title: 'Methods of Separation in Everyday Life', kind: 'Chemistry', locked: true, sections: [] },
    { no: 10, title: 'Living Creatures: Exploring their Characteristics', kind: 'Biology', locked: true, sections: [] },
    { no: 11, title: "Nature's Treasures", kind: 'Environment', locked: true, sections: [] },
    { no: 12, title: 'Beyond Earth', kind: 'Astronomy', locked: true, sections: [] }
  ]
};
