// Class 7 Science. Question ids start with s7c<chapter>- so they never clash with other courses.
// `context` (on a chapter or a question) is hidden from students and only sent to the AI.
// Chapters with `locked: true` (and no sections) show a lock in the index until their questions are added.
const Q = (id, no, label, text, extra = {}) => ({ id, no, label, text, ...extra });
const MCQ = (id, no, label, text, opts) => Q(id, no, label, text, { options: opts });

module.exports = {
  id: 'c7-science',
  subject: 'Science',
  class: 7,
  chapters: [
    {
      no: 1, title: 'Nutrition in Plants',
      context: `Chapter notes (Class 7, Nutrition in Plants), in our own words:
Nutrients are the chemical substances in food (carbohydrates, proteins, fats, vitamins, minerals) that the body uses for energy, growth and repair. Providing nutrients to the body is called nutrition.
Modes of nutrition: autotrophic (green plants and algae make their own food by photosynthesis; they contain chlorophyll) and heterotrophic (animals and non-green plants such as mushroom, yeast and bread mould, and certain bacteria depend on other organisms for food).
Photosynthesis: green plants make food from carbon dioxide and water in the presence of sunlight, using chlorophyll (a green pigment inside chloroplasts, mainly in leaves). Equation: 6CO₂ + 12H₂O + light energy → (chlorophyll) C₆H₁₂O₆ + 6O₂ + 6H₂O (glucose, oxygen, water). The simplest food made is glucose; in most plants it is converted to starch and stored in roots, stems, leaves. Conditions: sunlight, chlorophyll, carbon dioxide, water. Water comes from the soil through xylem vessels. Carbon dioxide enters through stomata (tiny pores on the underside of leaves) which are surrounded by guard cells that open and close them; oxygen and water vapour leave through stomata. Significance: solar energy is converted into the chemical energy of food, and oxygen is released into the air.
Starch test: boil the leaf, bleach it in alcohol kept in a water bath (decolourisation), wash it, add dilute iodine solution; blue-black colour shows starch.
Let's Try activities: (1) starch test on a green leaf: leaf turns blue-black. (2) CO₂ is necessary: half of a leaf kept in a bottle with potassium hydroxide (KOH absorbs CO₂) does not turn blue-black, the part outside does. (3) Chlorophyll is necessary: in a variegated (croton) leaf only the green part turns blue-black. (4) Light is necessary: a destarched plant with black paper strips on a leaf; only the exposed part turns blue-black. (5) Fungus grows on a moist bread slice kept in a warm place for 2-3 days (spores in the air).
Leaves of other colours (red, violet, brown) also have chlorophyll and photosynthesise; the other pigments mask the green colour. In cactus the leaves are tiny spines (reduce loss of water by transpiration) and the green fleshy stem and branches photosynthesise.
Other modes of nutrition in heterotrophic plants: parasites (Rafflesia, Cuscuta, Mistletoe; they get food from a host; Cuscuta is yellow, thread-like, has no chlorophyll; Mistletoe has green leaves, can photosynthesise, takes water and minerals from the host, so it is a partial parasite); saprophytes / saprotrophs (feed on dead and decaying organic matter: mushrooms, bread mould, yeast, some bacteria); symbionts (two organisms living together for mutual benefit, called symbiosis: lichen is an alga and a fungus, the fungus supplies water and minerals and the alga supplies food; Rhizobium bacteria in the root nodules of leguminous plants convert nitrogen gas of the air into water-soluble nitrogen compounds and the plant gives them food and shelter); insectivorous plants (pitcher plant, sundew, Venus flytrap, bladderwort: they can make food but grow in soil poor in nitrogen so they trap and digest insects; in a pitcher plant the leaf is modified into a pitcher with digestive fluid, downward pointing hairs on the inner wall and a lid).
Soil nutrients (nitrogen, phosphorus, potassium: mineral nutrients) decrease as crops absorb them and are replenished by fertilisers (for example NPK), manure (from decaying dead leaves and animal droppings) and by growing leguminous crops (peas, pulses, gram, beans) which enrich the soil with nitrogen, so farmers need not add nitrogen fertiliser.`,
      sections: [
        { title: "Let's Recall (page 7)", questions: [
          Q('s7c1-lr1', 1, 'LR1.', 'Carnivores like tigers, lions, wolves, etc. do not eat plants. Do you think these animals will survive if there are no plants on earth?')
        ] },
        { title: 'Quick Check (page 8)', questions: [
          Q('s7c1-qa', 1, 'QC1.', 'State whether the following statements are true or false.', { parts: ['1. The phenomenon of providing nutrients to the body is called nutrition.', '2. Green plants contain chlorophyll.', '3. Animals and non-green plants are heterotrophs.', '4. All plants can photosynthesise.'] })
        ] },
        { title: 'Brain Teasers (pages 12-13)', questions: [
          Q('s7c1-bt1', 1, 'BT1.', 'Why do leaves change colours during the autumn fall?', { context: 'Hint from the notes: leaves have chlorophyll (green) plus other pigments; when chlorophyll breaks down in autumn the other pigments (yellow, orange, red, brown) show.' }),
          Q('s7c1-bt2', 2, 'BT2.', 'What will happen to the leaf if its undersurface is covered with vaseline?')
        ] },
        { title: 'Quick Check (page 13)', questions: [
          Q('s7c1-qb', 1, 'QC1.', 'Fill in the blanks.', { parts: ['1. During photosynthesis, ........ energy is converted to ........ energy.', '2. The simplest food synthesised by plants by photosynthesis is ........ .', '3. The leaves of the plants have tiny pores called ........ on their underside.', '4. In cactus, photosynthesis process take place in ........ and ........ of the plant.', '5. Carbohydrates synthesised by plants during photosynthesis are made of ........, ........ and oxygen.'] })
        ] },
        { title: 'Quick Check (page 16)', questions: [
          Q('s7c1-qc', 1, 'QC1.', 'Give two examples for each of the following.', { parts: ['1. Parasite plants', '2. Insectivorous plants', '3. Symbionts', '4. Saprophytes'] })
        ] },
        { title: 'Practice Time: A. Choose the correct option (page 18)', questions: [
          MCQ('s7c1-pa1', 1, 'A1.', 'Which of the following show autotrophic mode of nutrition?', ['a. Green plants', 'b. Mushroom', 'c. Yeast', 'd. Both a and b']),
          MCQ('s7c1-pa2', 2, 'A2.', 'Which of the following is required in photosynthesis process?', ['a. Chlorophyll', 'b. Sunlight', 'c. Water', 'd. All of these']),
          MCQ('s7c1-pa3', 3, 'A3.', 'Which of the following is an example of partial parasite?', ['a. Lichen', 'b. Pitcher plant', 'c. Mistletoe', 'd. Mushroom']),
          MCQ('s7c1-pa4', 4, 'A4.', 'Sundew plant is a', ['a. Parasite plant', 'b. Saprophyte', 'c. Symbiont', 'd. Insectivorous plant']),
          MCQ('s7c1-pa5', 5, 'A5.', 'Lichens are', ['a. Parasites', 'b. Saprophytes', 'c. Insectivorous', 'd. Symbionts']),
          MCQ('s7c1-pa6', 6, 'A6.', 'Which of the following statements is not correct?', ['a. In the photosynthesis process, solar energy is converted into chemical energy.', 'b. In cactus photosynthesis takes place in stem.', 'c. Mushrooms are saprophyte.', 'd. All plants are autotrophs.']),
          MCQ('s7c1-pa7', 7, 'A7.', 'Which of the following is needed to make proteins?', ['a. Nitrogen', 'b. Carbon', 'c. Oxygen', 'd. All of these'])
        ] },
        { title: 'Practice Time: B. Fill in the blanks (page 18)', questions: [
          Q('s7c1-pb1', 1, 'B1.', 'Green plants make their own food through a process called ........ .'),
          Q('s7c1-pb2', 2, 'B2.', "Chlorophyll is located in a plant's ........ which are tiny structures in plant cells."),
          Q('s7c1-pb3', 3, 'B3.', 'The ........ control the opening and closing of the stomata.'),
          Q('s7c1-pb4', 4, 'B4.', 'Bread mould and yeast are some examples of fungi that are ........ .'),
          Q('s7c1-pb5', 5, 'B5.', 'The byproduct of photosynthesis process are ........ and ........ .')
        ] },
        { title: 'Practice Time: C. True or false (page 18)', questions: [
          Q('s7c1-pc1', 1, 'C1.', 'Heterotrophs are the organisms that cannot prepare their own food.'),
          Q('s7c1-pc2', 2, 'C2.', 'Light energy from sunlight is captured by the stomata in the leaf.'),
          Q('s7c1-pc3', 3, 'C3.', 'Photosynthesis occurs in the presence of sunlight, chlorophyll, carbon dioxide and water.'),
          Q('s7c1-pc4', 4, 'C4.', 'Rafflesia and Cuscuta are parasitic organisms.'),
          Q('s7c1-pc5', 5, 'C5.', 'When iodine is added to starch, it becomes pink in colour.')
        ] },
        { title: 'Practice Time: D. Match the following (page 19)', questions: [
          Q('s7c1-pd1', 1, 'D1.', 'Match the following.', { table: { head: ['Column A', 'Column B'], rows: [['1. Cuscuta', 'a. Nitrogen'], ['2. Yeast', 'b. Heterotrophic'], ['3. Sundew', 'c. Parasite'], ['4. Rhizobium', 'd. Insectivorous'], ['5. Animals', 'e. Saprophytes']] } })
        ] },
        { title: 'Practice Time: E. Give one word (page 19)', questions: [
          Q('s7c1-pe1', 1, 'E1.', 'Give one word for: Components of food that provide nutrition'),
          Q('s7c1-pe2', 2, 'E2.', 'Give one word for: Organisms which prepare their own food'),
          Q('s7c1-pe3', 3, 'E3.', 'Give one word for: Organisms which obtain their food from other organisms'),
          Q('s7c1-pe4', 4, 'E4.', 'Give one word for: The green substance in chloroplasts'),
          Q('s7c1-pe5', 5, 'E5.', 'Give one word for: Two organisms which live together for their mutual benefit'),
          Q('s7c1-pe6', 6, 'E6.', 'Give one word for: The pores through which leaves exchange gases')
        ] },
        { title: 'Practice Time: F. Picture based questions (page 19)', questions: [
          Q('s7c1-pf1', 1, 'F1.', 'Name the following organisms and write the mode of nutrition in them. (Picture 1: a large red flower with white spots growing on the forest floor. Picture 2: a tube-shaped, jug-like leaf hanging from a plant, with an insect near its opening. Picture 3: a crust of orange and grey-green patches growing on a tree branch.)', { context: 'The three pictures are Rafflesia (a parasite), a pitcher plant (insectivorous) and lichen (symbionts: an alga and a fungus living together).' })
        ] },
        { title: 'Practice Time: G. Answer the following questions in short (page 19)', questions: [
          Q('s7c1-pg1', 1, 'G1.', 'Why do organisms take food? (NCERT Book Question)'),
          Q('s7c1-pg2', 2, 'G2.', 'Green plants are autotrophs. Explain this statement.'),
          Q('s7c1-pg3', 3, 'G3.', 'What are heterotrophs? Give examples.'),
          Q('s7c1-pg4', 4, 'G4.', 'What factors are essential for photosynthesis to take place?'),
          Q('s7c1-pg5', 5, 'G5.', 'Distinguish between a parasite and a saprotroph. (NCERT Book Question)'),
          Q('s7c1-pg6', 6, 'G6.', 'Why are fertilisers and manure added to the soil?'),
          Q('s7c1-pg7', 7, 'G7.', 'Why do farmers not need to add nitrogen nutrient to the soil in which leguminous plants are grown?')
        ] },
        { title: 'Practice Time: H. Answer the following questions in detail (pages 19-20)', questions: [
          Q('s7c1-ph1', 1, 'H1.', 'How would you test the presence of starch in leaves? (NCERT Book Question)'),
          Q('s7c1-ph2', 2, 'H2.', 'Give a brief description of the process of synthesis of food in green plants. (NCERT Book Question)'),
          Q('s7c1-ph3', 3, 'H3.', 'What is symbiosis? Explain by giving examples.'),
          Q('s7c1-ph4', 4, 'H4.', 'Plants with red and brown colour leaves do not photosynthesise. Do you agree with the statement? Explain.'),
          Q('s7c1-ph5', 5, 'H5.', 'How does a pitcher plant take its food?'),
          Q('s7c1-ph6', 6, 'H6.', 'How will you test that chlorophyll is necessary for photosynthesis?')
        ] },
        { title: 'Competency Based Questions: A. Assertion-Reason (page 20)', questions: [
          Q('s7c1-ar1', 1, 'AR1.', 'In the following question, a statement of assertion (A) is followed by a statement of the reason (R). Mark the correct choice. Assertion (A): Life on earth is not possible without photosynthesis. Reason (R): The life of all organisms directly or indirectly depends upon the food made by plants.', { options: ['a. Both assertion (A) and reason (R) are true, and reason (R) is the correct explanation of the assertion (A).', 'b. Both assertion and reason are true, but reason (R) is not the correct explanation of the assertion.', 'c. Assertion (A) is true, but reason (R) is false.', 'd. Assertion (A) is false, but reason (R) is True.'] }),
          Q('s7c1-ar2', 2, 'AR2.', 'In the following question, a statement of assertion (A) is followed by a statement of the reason (R). Mark the correct choice. Assertion (A): Mushrooms are examples of symbiotic plants. Reason (R): Symbiotic plants live together and benefit each other.', { options: ['a. Both assertion (A) and reason (R) are true, and reason (R) is the correct explanation of the assertion (A).', 'b. Both assertion and reason are true, but reason (R) is not the correct explanation of the assertion.', 'c. Assertion (A) is true, but reason (R) is false.', 'd. Assertion (A) is false, but reason (R) is True.'] }),
          Q('s7c1-ar3', 3, 'AR3.', 'In the following question, a statement of assertion (A) is followed by a statement of the reason (R). Mark the correct choice. Assertion (A): Insectivorous plants are heterotrophic. Reason (R): Insectivorous plants do not have chlorophyll.', { options: ['a. Both assertion (A) and reason (R) are true, and reason (R) is the correct explanation of the assertion (A).', 'b. Both assertion and reason are true, but reason (R) is not the correct explanation of the assertion.', 'c. Assertion (A) is true, but reason (R) is false.', 'd. Assertion (A) is false, but reason (R) is True.'] })
        ] },
        { title: 'Competency Based Questions: B. Case Study (page 20)', questions: [
          Q('s7c1-cs1', 1, 'CS1.', 'A farmer noticed that certain plants in his field were growing unusually well, even in the absence of regular watering. Upon investigation, it was found that these plants had a special feature that allowed them to obtain nutrients from decaying organic matter in the soil. Explain the mode of nutrition these plants are using and give examples.', { context: 'Expected idea: saprophytic (saprotrophic) nutrition, with examples such as mushrooms, bread mould and yeast.' }),
          Q('s7c1-cs2', 2, 'CS2.', 'In a school garden, two plots were prepared for planting vegetables. In one plot, fertiliser was added to the soil, while in the other plot, no fertiliser was added. After a few weeks, it was observed that the plants in the fertilised plot grew taller and healthier.', { parts: ['a. Explain why plants in fertilised plot grew taller and healthier?', 'b. Suggest some other alternatives for increasing the fertility of the soil.'] })
        ] }
      ]
    },
    { no: 2, title: 'Nutrition in Animals', locked: true, sections: [] },
    { no: 3, title: 'Heat', locked: true, sections: [] },
    { no: 4, title: 'Acids, Bases and Salts', locked: true, sections: [] },
    { no: 5, title: 'Physical and Chemical Changes', locked: true, sections: [] },
    { no: 6, title: 'Respiration in Organisms', locked: true, sections: [] },
    { no: 7, title: 'Transportation in Animals and Plants', locked: true, sections: [] },
    { no: 8, title: 'Reproduction in Plants', locked: true, sections: [] },
    { no: 9, title: 'Motion and Time', locked: true, sections: [] },
    { no: 10, title: 'Electric Current and Its Effects', locked: true, sections: [] },
    { no: 11, title: 'Light', locked: true, sections: [] },
    { no: 12, title: 'Forests: Our Lifeline', locked: true, sections: [] },
    { no: 13, title: 'Wastewater Story', locked: true, sections: [] }
  ]
};
