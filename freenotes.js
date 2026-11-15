// Free notes: shown to anyone WITHOUT login (button "Free contents" on the login page) and as static pages for Google (public/notes/<id>.html).
// Only what is written here becomes public. Write in our own words (never copy textbook text), and never put exercise answers here.
// Both English (below) and Assamese (freenotes-as.js) are required for every note.
// Fields: id (unique, letters/digits/-), course (course id in questions.js, e.g. c7-maths; with no it links the note to its chapter page), cls, subject, medium ('English' if not given), no (chapter number), title, summary, points[].
const NOTES = [
  {
    id: 'class-7-maths-integers', course: 'c7-maths',
    cls: 7, subject: 'Mathematics', medium: 'English', no: 1, title: 'Integers',
    summary: 'Integers are the whole numbers together with their negatives: ..., -3, -2, -1, 0, 1, 2, 3, ... This chapter shows how to compare integers, do the four operations with them, use their properties and simplify expressions with BODMAS.',
    points: [
      'Zero is an integer, but it is neither positive nor negative.',
      'On a number line the number on the right is always greater. Every positive integer is greater than 0, and 0 is greater than every negative integer. The greatest negative integer is -1.',
      'Absolute value |a| is the distance of a from 0, so it is never negative. For example |-7| = 7 and |7| = 7.',
      'Successor of a is a + 1 and predecessor of a is a - 1. For example the successor of 5 is 6 and the predecessor of 0 is -1.',
      'Addition: with the same signs, add the absolute values and keep the sign: (-8) + (-5) = -13. With different signs, subtract the smaller absolute value from the larger and keep the sign of the larger: (-8) + 5 = -3.',
      'Subtraction: a - b = a + (-b). Subtracting an integer means adding its opposite, so 5 - (-3) = 5 + 3 = 8.',
      'Multiplication and division: same signs give a positive result, different signs give a negative result. Any number times 0 is 0, 0 divided by a non-zero integer is 0, and division by 0 is not allowed.',
      'Closure: integers are closed under addition, subtraction and multiplication, but not under division (1 / 2 is not an integer).',
      'Addition and multiplication are commutative and associative. Subtraction and division are not.',
      'Identities: 0 for addition (a + 0 = a) and 1 for multiplication (a x 1 = a). The additive inverse of a is -a.',
      'Distributive property: a x (b + c) = a x b + a x c, and the same works with subtraction.',
      '(-1) raised to an even power is 1 and raised to an odd power is -1.',
      'BODMAS order: Brackets first (small ( ), then curly { }, then square [ ]), then Of, Division, Multiplication, Addition, Subtraction. "Of" means multiplication.'
    ]
  },
  {
    id: 'class-7-science-nutrition-in-plants', course: 'c7-science',
    cls: 7, subject: 'Science', medium: 'English', no: 1, title: 'Nutrition in Plants',
    summary: 'Nutrition is how a living thing gets and uses food for energy, growth and repair. Green plants make their own food by photosynthesis, while other plants depend on other living things or on dead matter.',
    points: [
      'Nutrients are the useful substances in food: carbohydrates, proteins, fats, vitamins and minerals.',
      'Autotrophs make their own food (green plants, algae). Heterotrophs depend on others for food (animals, mushrooms, yeast, bread mould and some bacteria).',
      'Photosynthesis: green plants make glucose from carbon dioxide and water in sunlight, using chlorophyll. Short form: carbon dioxide + water -> glucose + oxygen. Four things are needed: sunlight, chlorophyll, carbon dioxide and water.',
      'Chlorophyll is the green pigment inside chloroplasts, found mainly in leaves. Water reaches the leaves from the soil through xylem vessels.',
      'Carbon dioxide enters (and oxygen leaves) through stomata, tiny pores on the underside of leaves. Guard cells open and close each stoma.',
      'Extra glucose is changed into starch and stored in roots, stems and leaves.',
      'Starch test: boil the leaf, remove its colour in alcohol kept in a water bath, wash it and add iodine solution. A blue-black colour shows that starch is present.',
      'Why photosynthesis matters: it changes the energy of sunlight into the chemical energy of food, and it puts oxygen into the air.',
      'Red, violet or brown leaves also contain chlorophyll; the other pigments hide the green colour. In a cactus the leaves are tiny spines (they cut down water loss) and the green stem does the photosynthesis.',
      'Parasites take food from a living host: Cuscuta (yellow, thread-like, no chlorophyll) and Rafflesia. Mistletoe has green leaves, so it is a partial parasite and only takes water and minerals from its host.',
      'Saprotrophs feed on dead and rotting matter: mushrooms, bread mould, yeast and some bacteria.',
      'Symbiosis means two organisms living together and helping each other. A lichen is an alga plus a fungus (the fungus gives water and minerals, the alga gives food). Rhizobium bacteria live in the root nodules of pulses and change nitrogen from the air into a form the plant can use.',
      'Insectivorous plants (pitcher plant, sundew, Venus flytrap, bladderwort) grow in soil poor in nitrogen, so they trap and digest insects. They can still make their own food.',
      'Soil loses nitrogen, phosphorus and potassium as crops use them. Farmers replace them with fertilisers (for example NPK), manure, and by growing pulses, which add nitrogen to the soil.'
    ]
  },
  {
    id: 'class-6-maths-patterns-in-mathematics', course: 'c6-maths',
    cls: 6, subject: 'Mathematics', medium: 'English', no: 1, title: 'Patterns in Mathematics',
    summary: 'This chapter looks at number patterns and sequences, and at the rules whole numbers follow when we add, subtract, multiply and divide them. Spotting the rule in a pattern helps you find the next terms and do sums faster.',
    points: [
      'Natural numbers start from 1 (1, 2, 3, ...). Whole numbers start from 0 (0, 1, 2, 3, ...). Every natural number is a whole number, but 0 is a whole number that is not natural. There is no largest whole number.',
      'On the number line the number on the right is greater.',
      'Closure: whole numbers are closed under addition and multiplication, but not under subtraction (8 - 15) or division (8 / 3).',
      'Addition and multiplication are commutative (a + b = b + a, a x b = b x a) and associative. Subtraction and division are neither.',
      'Identities: 0 for addition (a + 0 = a) and 1 for multiplication (a x 1 = a). Also a x 0 = 0, and 0 / a = 0 when a is not 0. Division by 0 has no meaning.',
      'Distributive property: a x (b + c) = a x b + a x c, and a x (b - c) = a x b - a x c. Use it to split a big multiplication into easy parts.',
      'For quick sums, group numbers whose product is round, such as 4 x 25 = 100, 2 x 50 = 100 and 8 x 125 = 1000.',
      'Inverse operations undo each other: addition and subtraction, multiplication and division. Dividend = divisor x quotient + remainder.',
      'In an arithmetic sequence the same number is added every time. In a geometric sequence the same number is multiplied every time. Some patterns use two steps, for example multiply by 4 and then divide by 2.',
      'Special sequences: even, odd, prime and composite numbers; squares (1, 4, 9, 16, ...); cubes (1, 8, 27, 64, ...); triangular numbers (1, 3, 6, 10, 15, ...); Virahanka numbers (1, 2, 3, 5, 8, 13, ...), where each term is the sum of the two before it.',
      'Shortcut: adding 9, 99 or 999 is the same as adding 10, 100 or 1000 and then taking away 1. Multiplying by 99 means multiplying by (100 - 1).'
    ]
  },
  {
    id: 'class-6-science-the-wonderful-world-of-science', course: 'c6-science',
    cls: 6, subject: 'Science', medium: 'English', no: 1, title: 'The Wonderful World of Science',
    summary: 'Science is a way of thinking, observing and asking questions to understand the world around us. It starts with curiosity and it is found everywhere, from the kitchen to outer space.',
    points: [
      'Curiosity is the most important tool of science. Science always begins with asking questions such as why, how and what.',
      'Observation is what we notice with our senses. Inference is the conclusion or explanation we draw from what we observed.',
      'Science is not only a school subject or something done in a lab. It is a way of thinking that helps us solve problems and improve life.',
      'Science is everywhere. In cooking, yeast makes dough rise by producing carbon dioxide gas, and heat changes the taste and texture of food.',
      'Changes of state: heat makes ice melt, makes water boil into steam, and taking heat away freezes water into ice.',
      'Water cycle: evaporation (water rises as vapour), condensation (vapour cools and forms clouds), precipitation (rain or snow), then runoff and groundwater.',
      'Science is like a giant jigsaw puzzle: every discovery is one more piece and raises new questions, so science never ends.',
      'Sometimes new evidence changes what we believed. Pluto was once called the ninth planet and is now classed as a dwarf planet.',
      'Earth is the only planet we know that supports life. Living things adapt to where they live: a cactus has thick stems that store water and spines instead of leaves to lose less water.',
      'A butterfly passes through four stages: egg, caterpillar (larva), pupa and adult.',
      'All living things need food and water. Food gives nutrients for energy and growth, and a healthy diet depends on age, activity and needs.'
    ]
  },
  {
    id: 'class-6-social-science-locating-places-and-reading-maps', course: 'c6-social',
    cls: 6, subject: 'Social Science', medium: 'English', no: 1, title: 'Locating Places and Reading Maps',
    summary: 'Earth is too large to see all at once, so we use globes and maps. This chapter explains the shape of Earth, latitudes and longitudes, and how they help us fix the exact position of any place.',
    points: [
      'Earth is slightly flattened at the poles and bulges at the equator, so its shape is called an oblate spheroid. Its equatorial diameter (about 12,756 km) is a little more than its polar diameter (about 12,714 km).',
      'A globe is a small 3D model of Earth. It shows true shapes, directions, distances and areas, and also day and night and rotation.',
      'Limits of a globe: it is bulky and costly, it cannot be folded or carried easily, it cannot show small areas in detail and it cannot show the whole Earth at one glance.',
      'Earth spins on its axis, an imaginary line through its centre. The ends of the axis are the North Pole and the South Pole. The axis is tilted by 23.5 degrees from the vertical.',
      'Latitudes (parallels) are imaginary circles that run parallel to each other around the globe. They are measured in degrees from the Equator, which is 0 degrees and splits Earth into the Northern and Southern Hemispheres.',
      'Important latitudes: Equator (0), Tropic of Cancer (23.5 N), Tropic of Capricorn (23.5 S), Arctic Circle (66.5 N), Antarctic Circle (66.5 S), and the poles (90 N and 90 S).',
      'Latitudes help us divide Earth into heat zones.',
      'Longitudes (meridians) are imaginary lines running from the North Pole to the South Pole. They are all equal in length, they are not parallel, and they meet at the poles.',
      'The Prime Meridian is 0 degrees longitude and passes through the Royal Observatory at Greenwich near London. It splits Earth into the Eastern and Western Hemispheres.',
      'The International Date Line lies near 180 degrees, opposite the Prime Meridian, and marks where one calendar day changes to the next. Crossing it going west adds a day and going east takes away a day.',
      'Latitude and longitude together form the geographic coordinates that give the exact location of a place.'
    ]
  },
  {
    id: 'class-6-english-grammar-the-sentence', course: 'c6-grammar',
    cls: 6, subject: 'English Grammar', medium: 'English', no: 1, title: 'The Sentence',
    summary: 'A sentence is a group of words in a proper order that gives a complete meaning. This chapter covers sentences and phrases, the four types of sentences, how to make exclamatory sentences, and subject and predicate.',
    points: [
      'A sentence has a verb, gives a complete meaning, begins with a capital letter and ends with a full stop, question mark or exclamation mark.',
      'A phrase is a group of words that gives an incomplete meaning. It is only a part of a sentence and may have no verb. For example, "On the phone" is a phrase, while "I am on the phone." is a sentence.',
      'Declarative (assertive) sentences give information or state a fact and end with a full stop.',
      'Imperative sentences give a request, advice, instruction or command. They usually start with a verb, and the subject "you" is understood but not written.',
      'Interrogative sentences ask a question, often begin with who, what, where, when, how, which, whose or why, and end with a question mark.',
      'Exclamatory sentences show strong feeling and end with an exclamation mark.',
      'To change a statement into an exclamation, use "What" when there is a/an before the adjective: "She is a graceful dancer." becomes "What a graceful dancer she is!"',
      'Use "How" when there is no a/an, with an adjective or adverb: "She dances gracefully." becomes "How gracefully she dances!"',
      'Every sentence has two parts. The subject tells who or what the sentence is about. The predicate tells something about the subject and always contains the verb.',
      'Example: in "The brown jacket was very warm.", the subject is "The brown jacket" and the predicate is "was very warm".'
    ]
  },
  {
    id: 'class-10-maths-real-numbers', course: 'c10-maths',
    cls: 10, subject: 'Mathematics', medium: 'Assamese', no: 1, title: 'Real Numbers',
    summary: 'This chapter has two big ideas: the Fundamental Theorem of Arithmetic, which says every composite number breaks into primes in only one way, and the proofs that numbers like the square root of 2 are irrational.',
    points: [
      'Fundamental Theorem of Arithmetic: every composite number can be written as a product of primes, and this prime factorisation is unique except for the order of the factors.',
      'HCF is the product of the smallest power of each common prime factor. LCM is the product of the greatest power of every prime that appears in either number.',
      'For two positive integers a and b: HCF(a, b) x LCM(a, b) = a x b. This rule works for two numbers only, not for three.',
      'A number ending in 0 must have both 2 and 5 among its prime factors. So 6 raised to any power n can never end in 0, because 6 has only the prime factors 2 and 3.',
      'To show a number is composite, rewrite it as a product of two numbers that are both greater than 1 (take out a common factor).',
      'A rational number can be written as p/q with integers p and q (q not 0). An irrational number cannot.',
      'Key fact: if a prime p divides a squared, then p also divides a.',
      'Proof of irrationality is by contradiction. Assume the square root of p equals a/b in lowest terms, square both sides, show that p divides a and then that p divides b, which contradicts "a and b have no common factor".',
      'The sum or difference of a rational number and an irrational number is irrational.',
      'The product or quotient of a non-zero rational number and an irrational number is irrational.'
    ]
  },
  {
    id: 'class-10-social-science-partition-of-bengal-and-swadeshi-movement', course: 'c10-social',
    cls: 10, subject: 'Social Science (History)', medium: 'Assamese', no: 1, title: 'Partition of Bengal and Swadeshi Movement',
    summary: 'In 1905 the British divided Bengal, which led to a wide protest movement based on using Indian-made goods. The movement shaped later nationalism in India, and the partition was cancelled in 1911.',
    points: [
      'The partition of Bengal was announced in July 1905 by Viceroy Lord Curzon and took effect on 16 October 1905.',
      'It created Eastern Bengal and Assam (capital Dhaka) and a separate Bengal with Calcutta as its capital.',
      'The official reason was that Bengal was too large to govern well. The real aim was to weaken Bengali nationalism and divide Hindus and Muslims (divide and rule).',
      'On 7 August 1905 a meeting at the Town Hall, Calcutta, passed the resolution to boycott foreign goods.',
      'On 16 October 1905 Rabindranath Tagore led the Rakhi Bandhan programme as a sign of Hindu-Muslim unity.',
      'It is called the Swadeshi movement because people were asked to use goods made in their own country (swa = own, desh = country) and to boycott foreign goods.',
      'Education: the National Council of Education was set up in 1906, and Aurobindo Ghose became the first principal of the Bengal National College.',
      'Industry: Acharya Prafulla Chandra Ray founded the Bengal Chemical and Pharmaceutical Works. Swadeshi cotton mills, handloom, soap and pottery works and swadeshi stores were also started.',
      'The government tried to stop the movement with the Carlyle circular against students, bans on meetings and slogans, the Seditious Meetings Act (1907), the Newspapers (Incitement to Offences) Act (1908), the Indian Press Act (1910) and arrests of leaders.',
      'At the Calcutta session of the Indian National Congress in 1906, presided over by Dadabhai Naoroji, Swaraj was declared the goal. In 1907, at Surat, the Congress split into Moderates and Extremists.',
      'The Muslim League was founded at Dhaka in December 1906 under the lead of Nawab Salimullah.',
      'The partition was annulled in 1911, announced at the Delhi Durbar on 12 December 1911, and the capital was moved from Calcutta to Delhi. Assam became a separate Chief Commissioner\'s province in 1912.'
    ]
  }
  ,{
    id: 'class-10-science-chemical-reactions-and-equations', course: 'c10-science',
    cls: 10, subject: 'Science', medium: 'English', no: 1, title: 'Chemical Reactions and Equations',
    summary: 'In a chemical reaction, substances change into new substances with new properties. We write a reaction as a balanced chemical equation, and we sort reactions into types such as combination, decomposition, displacement, double displacement and redox.',
    points: [
      'Signs that a chemical reaction has happened: a change of state, a change of colour, a gas given off, a change of temperature, or a precipitate (an insoluble solid) forming.',
      'A chemical equation shows reactants on the left and products on the right with an arrow between them. An equation written without balancing is called a skeletal equation.',
      'Law of conservation of mass: the total mass of the reactants equals the total mass of the products. So each element must have the same number of atoms on both sides, and that is why equations are balanced.',
      'Balance an equation by changing the coefficients (the numbers in front of the formulas), never the formulas themselves. Example: 3Fe + 4H2O -> Fe3O4 + 4H2.',
      'State symbols: (s) solid, (l) liquid, (g) gas and (aq) dissolved in water. Conditions such as heat, light or a catalyst are written above or below the arrow.',
      'Combination reaction: two or more substances join to form one product. CaO + H2O -> Ca(OH)2 (slaking of lime) gives out heat. Reactions that give out heat are exothermic; burning of fuels and respiration are also exothermic.',
      'Decomposition reaction: one substance breaks into two or more. It can be done by heat (CaCO3 -> CaO + CO2), by electricity (2H2O -> 2H2 + O2) or by light (2AgCl -> 2Ag + Cl2). These reactions take in energy, so they are endothermic.',
      'Displacement reaction: a more reactive element pushes a less reactive element out of its compound. Fe + CuSO4 -> FeSO4 + Cu: the blue colour fades and brown copper settles on the iron.',
      'Double displacement reaction: two compounds swap their ions. Na2SO4 + BaCl2 -> BaSO4 + 2NaCl, where BaSO4 is a white precipitate, so this is also a precipitation reaction.',
      'Oxidation is the gain of oxygen or loss of hydrogen. Reduction is the loss of oxygen or gain of hydrogen. When both happen together it is a redox reaction: in CuO + H2 -> Cu + H2O, copper oxide is reduced and hydrogen is oxidised.',
      'Corrosion is the slow damage of a metal by air and moisture: iron rusts, silver turns black and copper gets a green coating. Painting, oiling, galvanising (a zinc coat) and alloying help prevent it.',
      'Rancidity is the bad smell and taste of oils and fats that have been oxidised. Antioxidants, airtight containers and flushing packets with nitrogen gas slow it down.'
    ]
  },
  {
    id: 'class-10-science-acids-bases-and-salts', course: 'c10-science',
    cls: 10, subject: 'Science', medium: 'English', no: 2, title: 'Acids, Bases and Salts',
    summary: 'Acids taste sour and turn blue litmus red, while bases taste bitter and feel soapy. An acid and a base react to make a salt and water. The pH scale tells how acidic or basic a solution is, and several important salts have everyday uses.',
    points: [
      'Acids turn blue litmus red and bases turn red litmus blue. Phenolphthalein is colourless in acid and pink in base. Methyl orange is red in acid and yellow in base.',
      'Acid + metal -> salt + hydrogen gas, which burns with a pop sound. Zn + H2SO4 -> ZnSO4 + H2.',
      'Acid + metal carbonate or hydrogencarbonate -> salt + carbon dioxide + water. Carbon dioxide turns lime water milky: Ca(OH)2 + CO2 -> CaCO3 + H2O.',
      'Neutralisation: acid + base -> salt + water, for example HCl + NaOH -> NaCl + H2O. Metal oxides are basic and non-metal oxides are acidic.',
      'In water an acid gives hydrogen ions (H+) and a base gives hydroxide ions (OH-). A base that dissolves in water is called an alkali.',
      'Dissolving an acid or a base in water gives out a lot of heat. Always add the acid slowly to water, never water to the acid.',
      'The pH scale runs from 0 to 14. pH 7 is neutral, below 7 is acidic and above 7 is basic. The lower the pH, the stronger the acid. It is measured with universal indicator or pH paper.',
      'pH in daily life: tooth decay starts when the pH of the mouth falls below 5.5, rain with pH below 5.6 is acid rain, and antacids (bases) cure acidity. The sting of an ant or nettle contains methanoic acid, and baking soda eases it.',
      'Common salt (NaCl) is the raw material for NaOH, chlorine, hydrogen, baking soda, washing soda and bleaching powder. Electrolysis of brine is the chlor-alkali process: 2NaCl + 2H2O -> 2NaOH + Cl2 + H2.',
      'Bleaching powder (CaOCl2) is made by passing chlorine over dry slaked lime. It is used for bleaching and for disinfecting drinking water.',
      'Baking soda (NaHCO3) is used as an antacid and in baking powder. On heating it gives sodium carbonate: 2NaHCO3 -> Na2CO3 + H2O + CO2.',
      'Washing soda (Na2CO3.10H2O) is made by recrystallising sodium carbonate. It is used in making glass, soap and paper and for removing the hardness of water.',
      'Water of crystallisation is the fixed number of water molecules in one formula unit of a salt. Blue copper sulphate (CuSO4.5H2O) turns white when heated because it loses this water.',
      'Plaster of Paris (CaSO4.1/2H2O) is made by heating gypsum (CaSO4.2H2O). When mixed with water it sets hard as gypsum again, so it is used for supporting fractured bones and making toys and smooth surfaces.'
    ]
  },
  {
    id: 'class-10-science-metals-and-non-metals', course: 'c10-science',
    cls: 10, subject: 'Science', medium: 'English', no: 3, title: 'Metals and Non-metals',
    summary: 'Metals and non-metals differ in their physical and chemical properties. The reactivity series shows which metals displace others, the way a metal is extracted depends on its reactivity, and corrosion can be prevented in several ways.',
    points: [
      'Metals are lustrous, hard (but sodium and potassium are soft), malleable, ductile, sonorous and good conductors of heat and electricity. Most are solid with high melting points; mercury is a liquid.',
      'Non-metals are usually dull, brittle and poor conductors. Exceptions: graphite (a form of carbon) conducts electricity, diamond is the hardest natural substance, and iodine is lustrous.',
      'Metals burn in oxygen to form metal oxides, which are basic. Aluminium oxide and zinc oxide react with both acids and bases, so they are called amphoteric oxides.',
      'Reaction with water: sodium and potassium react violently, magnesium reacts with hot water, aluminium, iron and zinc react with steam, while lead, copper, silver and gold do not react.',
      'Reactivity series, from most to least reactive: K, Na, Ca, Mg, Al, Zn, Fe, Pb, H, Cu, Hg, Ag, Au.',
      'Metals above hydrogen in the series react with dilute acids and give hydrogen gas. Copper does not react with dilute acids.',
      'Displacement: a more reactive metal displaces a less reactive metal from its salt solution, for example Zn + CuSO4 -> ZnSO4 + Cu.',
      'Ionic compounds form when a metal gives electrons to a non-metal, as in sodium chloride. They are hard, brittle solids with high melting and boiling points, they dissolve in water, and they conduct electricity when molten or dissolved but not as solids.',
      'An ore is a mineral from which a metal can be extracted profitably. The earthy impurities in it are called gangue.',
      'Extraction depends on reactivity. Very reactive metals (K to Al) are obtained by electrolysis of their molten compounds. Metals in the middle (Zn, Fe, Pb) are changed to oxides by roasting (for sulphides) or calcination (for carbonates) and then reduced with carbon. Metals low in the series (Hg, Cu) are got just by heating the ore.',
      'Thermit reaction: Fe2O3 + 2Al -> 2Fe + Al2O3 gives out so much heat that the iron is molten; it is used to join railway tracks.',
      'Electrolytic refining gives pure metal: the impure metal is the anode, a thin strip of pure metal is the cathode and a solution of the metal salt is the electrolyte.',
      'Rusting of iron needs both oxygen and moisture. Prevent it by painting, oiling, greasing, galvanising (zinc coat), chrome plating or making alloys.',
      'An alloy is a homogeneous mixture of a metal with other metals or non-metals. Brass is copper and zinc, bronze is copper and tin, and stainless steel is iron with nickel and chromium.'
    ]
  },
  {
    id: 'class-10-maths-pair-of-linear-equations-in-two-variables', course: 'c10-maths',
    cls: 10, subject: 'Mathematics', medium: 'Assamese', no: 3, title: 'Pair of Linear Equations in Two Variables',
    summary: 'A pair of linear equations in two variables can be solved by drawing graphs or by algebraic methods. The ratios of the coefficients tell us in advance whether the pair has one solution, many solutions or none.',
    points: [
      'The standard form of a pair is a1x + b1y + c1 = 0 and a2x + b2y + c2 = 0, where in each equation a and b are not both zero.',
      'The graph of each equation is a straight line. A solution of the pair is a point that lies on both lines.',
      'If a1/a2 is not equal to b1/b2, the lines intersect at one point, so there is exactly one solution. The pair is consistent.',
      'If a1/a2 = b1/b2 = c1/c2, the lines coincide, so there are infinitely many solutions. The pair is consistent (also called dependent).',
      'If a1/a2 = b1/b2 but c1/c2 is different, the lines are parallel, so there is no solution. The pair is inconsistent.',
      'Substitution method: write one variable in terms of the other from one equation, put it into the other equation, solve for one variable, then find the second.',
      'Elimination method: multiply the equations so that the coefficients of one variable become equal, add or subtract to remove that variable, solve, then back-substitute.',
      'Cross-multiplication method: x/(b1c2 - b2c1) = y/(c1a2 - c2a1) = 1/(a1b2 - a2b1), which works when a1b2 - a2b1 is not zero.',
      'For word problems, take two unknowns as x and y, turn the two conditions into two equations, solve them and check the answer against the story.'
    ]
  },
  {
    id: 'class-10-maths-quadratic-equations', course: 'c10-maths',
    cls: 10, subject: 'Mathematics', medium: 'Assamese', no: 4, title: 'Quadratic Equations',
    summary: 'A quadratic equation has the form ax^2 + bx + c = 0. We can find its roots by factorisation, by completing the square or by the quadratic formula, and the discriminant tells what kind of roots to expect.',
    points: [
      'The standard form is ax^2 + bx + c = 0 where a, b, c are real numbers and a is not 0. If a were 0 the equation would be linear.',
      'The roots (zeroes) of the equation are the values of x that satisfy it. A quadratic equation has at most two real roots.',
      'Factorisation: split the middle term using two numbers whose product is ac and whose sum is b, factorise by grouping, then put each factor equal to zero.',
      'Completing the square: divide by a, move the constant to the right side, add the square of half the coefficient of x to both sides, then take the square root.',
      'Quadratic formula: x = (-b +/- sqrt(b^2 - 4ac)) / 2a. It works for every quadratic equation that has real roots.',
      'Discriminant D = b^2 - 4ac. If D > 0 there are two distinct real roots, if D = 0 there are two equal real roots, and if D < 0 there are no real roots.',
      'In word problems, form the equation from the conditions, solve it, and reject any root that does not fit the situation, such as a negative length or age.'
    ]
  },
  {
    id: 'class-10-maths-arithmetic-progressions', course: 'c10-maths',
    cls: 10, subject: 'Mathematics', medium: 'Assamese', no: 5, title: 'Arithmetic Progressions',
    summary: 'An arithmetic progression (AP) is a list of numbers in which each term comes from the previous one by adding the same fixed number. This chapter gives formulas for the nth term and for the sum of the first n terms.',
    points: [
      'In an AP the difference between any term and the one before it is always the same. This fixed number is the common difference d, so d = a(n+1) - a(n).',
      'An AP with first term a and common difference d is a, a + d, a + 2d, a + 3d, and so on.',
      'If d is positive the AP increases, if d is negative it decreases, and if d is 0 all the terms are equal.',
      'The nth term is a(n) = a + (n - 1)d.',
      'A finite AP has a last term, usually written l. An infinite AP never ends.',
      'The sum of the first n terms is S(n) = n/2 x [2a + (n - 1)d]. When the last term l is known, S(n) = n/2 x (a + l).',
      'The nth term can also be found from sums: a(n) = S(n) - S(n - 1).',
      'Three numbers a, b, c are in AP exactly when 2b = a + c, that is, the middle term is the average of the other two.'
    ]
  }
];

// Each note also carries its Assamese version (freenotes-as.js): as = { title, summary, points[] }.
// Assamese-medium notes open in Assamese first in the app; every note has both languages.
const AS = require('./freenotes-as');
module.exports = NOTES.map(n => Object.assign({}, n, { as: AS[n.id] }));
