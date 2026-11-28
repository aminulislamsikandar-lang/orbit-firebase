// Class 7 General Science, Assamese medium (textbook used at Halimon Nessa Academy). Question ids start with s7ac<chapter>- so they never clash with other courses (the English Class 7 Science uses s7c<chapter>-).
// Question text is in Assamese, copied from the textbook exercises. `context` on a chapter is hidden from students and only sent to the AI (notes in English).
// Only the exercises of a chapter are added here (no theory page). Chapters 6-18 are listed by name only (locked: true, no sections) until their exercises are added.
// Chapter 1 exercise "প্ৰশ্নাৱলী": a sub-question is written as an item (i, ii, iii ...) in `parts`; for the choose-the-answer question the options a) to d) are written on the same line as the item.
const Q = (id, no, label, text, extra = {}) => ({ id, no, label, text, ...extra });

module.exports = {
  id: 'c7-science-as',
  subject: 'Science',
  class: 7,
  medium: 'Assamese',
  sourceLang: 'Assamese',   // answers are Assamese: the translate menu offers English / Hinglish / Bengali
  chapters: [
    {
      no: 1, title: 'উদ্ভিদৰ পৰিপুষ্টি (Nutrition in plant)', kind: 'Exercise (প্ৰশ্নাৱলী)',
      context: `Chapter notes (Class 7 General Science, Assamese-medium textbook, Chapter 1 "উদ্ভিদৰ পৰিপুষ্টি" = Nutrition in Plant; only the exercises (প্ৰশ্নাৱলী) are added, no theory page). Answer in simple Assamese, keep scientific words with the English word in brackets as the book does, and write short exam-style answers for the short-answer and descriptive questions.
Why food is needed: for growth, development (physical and mental), energy and repair; the useful parts of food are nutrients (carbohydrate, protein, fat, vitamins, minerals). Getting and using food is nutrition (পৰিপুষ্টি).
Two kinds of nutrition: autotrophic nutrition (স্বপোষী পৰিপুষ্টি): the living thing makes its own food, like green plants with chlorophyll (পত্ৰহৰিত) by photosynthesis (সালোকসংশ্লেষণ); such plants are autotrophs (স্বপোষী). Heterotrophic nutrition (পৰপোষিত পৰিপুষ্টি): the living thing cannot make its own food and depends on other living things: all animals, fungi (ভেঁকুৰ, such as mushroom) and non-green plants.
Photosynthesis: green plants (in the leaves, in the chloroplasts that hold chlorophyll) make food from carbon dioxide taken from the air and water taken from the soil, in sunlight. Equation: carbon dioxide + water --(sunlight, chlorophyll)--> glucose + oxygen (6CO2 + 6H2O --> C6H12O6 + 6O2). Glucose is the food made (a carbohydrate; the extra is stored as starch) and oxygen is the gas given out. Factors (কাৰক) needed: sunlight, chlorophyll, carbon dioxide and water. Leaves are called the kitchen (ৰান্ধনি ঘৰ) of the plant because the food is made in them.
Heterotrophic plants and their kinds: parasites (পৰজীৱী; live on a host and take food from it, for example Cuscuta, called আকাশীলতা in Assamese, a yellow thread-like plant without chlorophyll that grows over other plants), saprophytes (মৃতজীৱী; feed on dead and decaying matter, for example mushroom and other fungi, bacteria and Monotropa), insectivorous plants (পতংগভোজী; trap and digest insects to get nitrogen, for example pitcher plant and sundew), and symbionts (সহজীৱী; two living things live together and help each other, for example lichen). Saprotrophy (মৃতজীৱিতা) means getting food from dead and decaying organisms.
Animals cannot make their own food: they get food by eating plants or other animals; green plants make their own food.
Notes about the book: some words are spelt by the printer in an unusual way. In Q1 (ii) and Q2 (ii) the word printed as "বাক্লেছিয়া" means bacteria (বেক্টেৰিয়া); in Q1 (iii) "বেংছতা" is the mushroom; the spelling "ৰ'দ মুকুতা" in Q2 (i) is the book's name for an insect-eating plant (sundew type) and "ম'ন'ট্ৰপা" is Monotropa, a saprophyte. In Q2 (iii) the colour word is printed "ৰঙচুৱা" (reddish). Q5 asks for a list of the English words given in brackets in the lesson with their Assamese words; the lesson has, for example, nutrition, growth, development, mental development, food, nutrients, carbohydrate, protein, seedling, reproduction, autotrophic nutrition, synthesis, photosynthesis, chlorophyll, heterotrophic nutrition, animal, fungus, parasite, saprophyte, insectivorous plant, symbiosis, lichen, glucose.`,
      sections: [
        { title: 'প্ৰশ্নাৱলী', questions: [
          Q('s7ac1-1', 1, 'Q1.', 'খালী ঠাই পূৰ কৰা :', { parts: [
            'i) সালোকসংশ্লেষণ কৰা উদ্ভিদৰ পৰিপুষ্টিক ______ বোলে।',
            'ii) বাক্লেছিয়া এবিধ ______ পৰজীৱী।',
            'iii) বেংছতা এবিধ ______ ভেঁকুৰ।',
            'iv) সালোকসংশ্লেষণত ______ গেছ উৎপন্ন হয়।',
            'v) কলচী উদ্ভিদ এবিধ ______ উদ্ভিদ।'
          ] }),
          Q('s7ac1-2', 2, 'Q2.', 'শুদ্ধ উত্তৰটো বাছি উলিওৱা :', { parts: [
            "i) ৰ'দ মুকুতা এবিধ— a) স্বপোষী উদ্ভিদ  b) পৰজীৱী উদ্ভিদ  c) পতংগভোজী উদ্ভিদ  d) মৃতজীৱী উদ্ভিদ",
            "ii) মৃতজীৱী উদ্ভিদৰ উদাহৰণ হ'ল— a) কলচী উদ্ভিদ  b) ম'ন'ট্ৰপা  c) বাক্লেছিয়া  d) ৰ'দ মুকুতা",
            "iii) পত্ৰহৰিতৰ বৰণ— a) ৰঙচুৱা  b) সেউজীয়া  c) মটীয়া  d) ক'লা",
            "iv) সালোকসংশ্লেষণত উৎপন্ন হোৱা জৈৱ পদাৰ্থ হ'ল— a) প্ৰ'টিন  b) ভিটামিন  c) গ্লুক'জ  d) স্নেহপদাৰ্থ"
          ] }),
          Q('s7ac1-3', 3, 'Q3.', 'চমুকৈ উত্তৰ লিখা :', { parts: [
            'i) স্বপোষী আৰু পৰপোষী জীৱৰ পাৰ্থক্য লিখা।',
            'ii) পাতক গছৰ ৰান্ধনি ঘৰ বুলি কিয় কোৱা হয়?',
            'iii) মৃতজীৱিতা কি?',
            'iv) সালোকসংশ্লেষণৰ ৰাসায়নিক বিক্ৰিয়াটো লিখা।',
            'v) সালোকসংশ্লেষণৰ কাৰকসমূহ উল্লেখ কৰা।'
          ] }),
          Q('s7ac1-4', 4, 'Q4.', 'উত্তৰ লিখা :', { parts: [
            'i) প্ৰাণী আৰু উদ্ভিদে কেনেকৈ খাদ্য সংগ্ৰহ কৰে?',
            'ii) সালোকসংশ্লেষণ প্ৰক্ৰিয়াটো চমুকৈ ব্যাখ্যা কৰা।',
            'iii) জীৱৰ পৰিপুষ্টিৰ প্ৰকাৰসমূহ লিখা।',
            'iv) পৰজীৱী হিচাপে আকাশীলতা উদ্ভিদৰ বিষয়ে লিখা।',
            'v) পৰপোষী উদ্ভিদৰ প্ৰধান ভাগকেইটাৰ বিষয়ে চমুকৈ লিখা।'
          ] }),
          Q('s7ac1-5', 5, 'Q5.', 'পাঠটোত থকা ইংৰাজী প্ৰতিশব্দসমূহৰ এখন তালিকা প্ৰস্তুত কৰা।')
        ] }
      ]
    },
    {
      no: 2, title: 'শৰীৰত খাদ্যৰ ব্যৱহাৰ (Use of food in the body)', kind: 'Exercise (প্ৰশ্নাৱলী)',
      context: `Chapter notes (Class 7 General Science, Assamese-medium textbook, Chapter 2 "শৰীৰত খাদ্যৰ ব্যৱহাৰ" = Use of food in the body (nutrition in animals); only the exercises (প্ৰশ্নাৱলী) are added, no theory page). Answer in simple Assamese, keep scientific words with the English word in brackets as the book does, and write short exam-style answers for the short-answer and descriptive questions. Pictures are not shown in the app, so for "draw / describe with a figure" questions describe the parts in words.
Food and its use: food gives carbohydrate, protein, fat (lipid), vitamins and minerals. The body cannot use complex food directly; digestion (পাচন) breaks it into simple soluble parts that can be absorbed. Stages of animal nutrition: ingestion (খাদ্য গ্ৰহণ), digestion, absorption (অৱশোষণ), assimilation (সাঁচৰ / আত্মীকৰণ) and egestion (মল ত্যাগ). Digestive juices contain enzymes.
Human digestive system in order: mouth (teeth, tongue, salivary glands; saliva starts digestion of starch into sugar, which is why a chewed bit of rice tastes sweet), food pipe / oesophagus (গ্ৰাসননলী), stomach (পাকস্থলী; gastric juice acts on protein), small intestine (ক্ষুদ্ৰান্ত্ৰ; digestion is completed here by bile from the liver, pancreatic juice from the pancreas and intestinal juice; carbohydrate, protein and fat are all fully digested; its inner wall has many finger-like projections called villi (আঙুলিৰ নিচিনা প্ৰবৰ্দ্ধ) that absorb the digested food into the blood, which carries it to all parts of the body), large intestine (বৃহদান্ত্ৰ; absorbs water and some salts from the undigested food), rectum (মলভাণ্ড; undigested waste collects as faeces) and anus (মলদ্বাৰ; faeces are passed out from time to time). Fats are digested into fatty acids and glycerol; protein into amino acids; starch into glucose. The liver is the largest gland of the body, makes bile (পিত্তৰস) which helps in fat digestion, and stores it in the gall bladder. Organs that are not part of the digestive system: lungs (হাঁওফাঁও) belong to the respiratory system.
Teeth: a baby has milk teeth and an adult has 32 permanent teeth. Four kinds: incisors (কৃন্তক, in front, for cutting and biting), canines (ছেদক, pointed, for tearing flesh, large and sharp in carnivores), premolars (পুৰঃপেষক) and molars (পেষক), both for grinding and chewing. Tusks of an elephant are long pointed incisors that grow outside the mouth. The tongue has taste buds (স্বাদকলি) that tell the taste of food (sweet, sour, salty, bitter) and the tongue also moves food around while chewing and helps in speaking.
Ruminants (ৰোমন্থক প্ৰাণী, like cow, goat, buffalo and deer) swallow grass quickly, store it in the first part of the stomach, and later bring it back to the mouth in small lumps and chew it again; this is called chewing the cud (পাগুলি খোৱা, ৰোমন্থন). Their stomach has four chambers, and they can digest cellulose (a carbohydrate in grass), which humans cannot.
Amoeba: a single-celled animal that takes in food by false feet (pseudopodia, কূটপদ) which surround a food particle and form a food vacuole (খাদ্যৰিক্তিকা) inside the cell; digestive juices in the vacuole digest the food, the digested food is absorbed and used for energy and growth, and the undigested part is thrown out. Both amoeba and humans take in food, digest it, absorb and use it and egest the waste; humans have a long digestive tube with special organs and many cells, but amoeba does everything in one cell.
Notes about the book: Q2 (vi) prints the food vacuole as "খাদ্যবিক্তিকা". In Q3, ছেদক = canine, কৃন্তক = incisor. The matching question Q6 has two columns, shown as two items (স্তম্ভ 1 and স্তম্ভ 2): the answer is the pairs, for example pancreas / liver / saliva (লালটি ৰস) / rectum / intestinal juice / fat matched to the correct statement from column 2. Q7 asks for a list of the English words given in brackets in the lesson with their Assamese words.`,
      sections: [
        { title: 'প্ৰশ্নাৱলী', questions: [
          Q('s7ac2-1', 1, 'Q1.', 'খালী ঠাই পূৰ কৰা :', { parts: [
            'i) খাদ্যবস্তু গ্ৰহণ কৰা প্ৰক্ৰিয়াক ______ বোলা হয়।',
            'ii) এমিবাৰ খাদ্য গ্ৰহণ প্ৰণালীক ______ বোলা হয়।',
            'iii) পাচনৰ পিছত সবল উপাদানবোৰ ______ পদ্ধতিৰে তেজত সোমায়।',
            'iv) ক্ষুদ্ৰান্ত্ৰৰ ভিতৰৰ বেৰখনত বহুত আঙুলিৰ নিচিনা প্ৰবৰ্দ্ধ থাকে যাক ______ বোলে।',
            "v) মানুহৰ দেহত থকা আটাইতকৈ ডাঙৰ গ্ৰন্থিটো হ'ল ______।",
            'vi) এমিবাৰ খাদ্য ______ ত হজম হয়।'
          ] }),
          Q('s7ac2-2', 2, 'Q2.', 'তলত দিয়া বাক্যবোৰ শুদ্ধ নে ভুল উল্লেখ কৰা :', { parts: [
            'i) মানুহৰ প্ৰত্যেক হনুতে তিনিযোৰ পুৰঃপেষক দাঁত থাকে।',
            'ii) ৰোমন্থক প্ৰাণীৰ পাকস্থলীত চাৰিটা কোঠালি থাকে।',
            'iii) মাংসভোজী প্ৰাণীৰ ছেদক দাঁতবোৰ জোঙা হয়।',
            'iv) শৰ্কৰাৰ পাচন পাকস্থলীত আৰম্ভ হয়।',
            'v) খাদ্যৰ সম্পূৰ্ণ পাচন ক্ষুদ্ৰান্ত্ৰত সম্পন্ন হয়।',
            'vi) এমিবাৰ খাদ্য খাদ্যবিক্তিকাত হজম হয়।'
          ] }),
          Q('s7ac2-3', 3, 'Q3.', 'শুদ্ধ উত্তৰটো বাছি উলিওৱা :', { parts: [
            'i) তলত দিয়া কোনবিধ দাঁত মাংসভোজী প্ৰাণীয়ে মাংস ছিঙিবলৈ ব্যৱহাৰ কৰে? a) ছেদক  b) পুৰঃপেষক  c) পেষক  d) কৃন্তক',
            'ii) হাতীৰ কোনবিধ দাঁত জোঙা হৈ বাহিৰলৈ ওলাই যায়? a) ছেদক  b) পুৰঃপেষক  c) পেষক  d) কৃন্তক',
            'iii) তলত দিয়া কোনবিধ অংগৰ জৰিয়তে এমিবাই খাদ্য গ্ৰহণ কৰে? a) পাকস্থলী  b) কূটপদ  c) জিভা  d) স্পৰ্শক',
            'iv) পাচন নোহোৱা আহাৰৰ পৰা পানীত অৱশোষণ কোন অংশত হয়? a) পাকস্থলীত  b) ক্ষুদ্ৰান্ত্ৰত  c) বৃহদান্ত্ৰত  d) গ্ৰাসননলীত',
            'v) তলত দিয়া কোনবিধ অংগ পাচনতন্ত্ৰৰ অন্তৰ্গত নহয়? a) পাকস্থলী  b) যকৃত  c) হাঁওফাঁও  d) অগ্ন্যাশয়'
          ] }),
          Q('s7ac2-4', 4, 'Q4.', 'এটা বাক্যত উত্তৰ দিয়া :', { parts: [
            'a) কোনবিধ শৰ্কৰা ৰোমন্থক প্ৰাণীয়ে হজম কৰিব পাৰে?',
            'b) মানুহৰ পাচনতন্ত্ৰৰ লগত জড়িত আটাইতকৈ ডাঙৰ গ্ৰন্থিটো কি?',
            'c) পাচন নলীৰ কোনটো অংশত পাচন কাৰ্য্য সম্পূৰ্ণ হয়?',
            'd) মানুহৰ পাচন নলীৰ কোন অংশৰ পৰা খাদ্যৰ সবল উপাদানসমূহৰ অৱশোষণ হয়?',
            'e) মানুহৰ জিভাত থকা স্বাদকলিবোৰৰ কাৰ্য্য কি?'
          ] }),
          Q('s7ac2-5', 5, 'Q5.', 'তলত দিয়া প্ৰশ্নবোৰৰ উত্তৰ লিখা :', { parts: [
            'a) এমিবা আৰু মানুহৰ পৰিপুষ্টিৰ মাজত থকা সাদৃশ্য আৰু বৈসাদৃশ্যসমূহ কি কি?',
            'b) পাগুলি খোৱা মানে কি বুজা?',
            'c) এমিবাৰ খাদ্য গ্ৰহণ প্ৰণালী বৰ্ণনা কৰা।',
            'd) মানুহৰ ছেদক আৰু কৃন্তক দাঁতৰ কাৰ্য্য কি কি?',
            'e) প্ৰাণীৰ পৰিপুষ্টিৰ বিভিন্ন স্তৰ বৰ্ণনা কৰা।',
            'f) মানুহৰ পাচন প্ৰক্ৰিয়াৰ বিষয়ে বুজাই লিখা।',
            'g) মানুহৰ বিভিন্ন প্ৰকাৰৰ দাঁতৰ এটা বিৱৰণ লিখা।',
            'h) চিত্ৰৰ সহায়ত মানুহৰ পাচন তন্ত্ৰৰ এটা বৰ্ণনা দিয়া।'
          ] }),
          Q('s7ac2-6', 6, 'Q6.', 'স্তম্ভ 1ৰ বিষয়বোৰৰ লগত স্তম্ভ 2ৰ বিষয়বোৰ মিলোৱা :', { parts: [
            'স্তম্ভ 1 : (i) অগ্ন্যাশয়  (ii) লালটি ৰস  (iii) যকৃত  (iv) মলভাণ্ড  (v) আন্ত্ৰিক ৰস  (vi) স্নেহপদাৰ্থ',
            "স্তম্ভ 2 : (a) ফেটি এছিড আৰু গ্লিচাৰল  (b) পিত্তৰস নিঃসৰণ হয়  (c) খাদ্যৰ অৱশিষ্ট অংশ জমা হৈ থাকে  (d) শৰ্কৰা, প্ৰ'টিন আৰু স্নেহপদাৰ্থৰ সম্পূৰ্ণ পাচন  (e) মানুহৰ শৰীৰৰ পাতৰ আকৃতিৰ অংশ  (f) খাদ্যৰ সম্পূৰ্ণ শোষণ"
          ] }),
          Q('s7ac2-7', 7, 'Q7.', 'পাঠটোত থকা ইংৰাজী প্ৰতিশব্দসমূহৰ এখন তালিকা প্ৰস্তুত কৰা।')
        ] }
      ]
    },
    {
      no: 3, title: 'শ্বাস-প্ৰশ্বাস (The Breath of Life)', kind: 'Exercise (প্ৰশ্নাৱলী)',
      context: `Chapter notes (Class 7 General Science, Assamese-medium textbook, Chapter 3 "শ্বাস-প্ৰশ্বাস" = The Breath of Life (respiration); only the exercises (প্ৰশ্নাৱলী) are added, no theory page). Answer in simple Assamese, keep scientific words with the English word in brackets as the book does, and write short exam-style answers for the short-answer and descriptive questions. Pictures are not shown in the app, so describe the parts in words. For the long questions (Q5) give a clear answer in points.
Breathing and respiration: breathing (শ্বাস-প্ৰশ্বাস, উশাহ-নিশাহ) is taking in air (inhalation, উশাহ) and giving it out (exhalation, নিশাহ). Cellular respiration (কোষীয় শ্বসন) is the breaking down of food (glucose) in the cells to release energy. All living things respire all the time, because the cells need the energy for all body work. Aerobic respiration (সবাত শ্বসন) needs oxygen: glucose + oxygen -> carbon dioxide + water + energy, with a lot of energy released. Anaerobic respiration (অবাত শ্বসন) takes place without oxygen and releases much less energy: in yeast it gives alcohol and carbon dioxide (this is fermentation, ফাৰ্মেণ্টেচন, also used in making bread and wine); in muscle cells (when the oxygen supply is short, for example after heavy exercise) glucose is partly broken down into lactic acid (লেক্টিক এছিড), whose collection in the muscles gives cramps and body pain; in some bacteria and in the gut it also takes place. Differences between aerobic and anaerobic respiration: oxygen is needed or not, the place (cytoplasm and mitochondria / only cytoplasm), the end products (carbon dioxide and water / alcohol and carbon dioxide or lactic acid), and the amount of energy (large / small), and complete or incomplete breakdown of glucose.
Breathing rate (শ্বাস-প্ৰশ্বাসৰ হাৰ) is the number of times a person breathes in and out in one minute; for a resting adult it is about 15 to 18 times a minute. It goes up with exercise, running, hard work, fever, and at high places, and goes down when resting and sleeping. After hard work we pant because the body needs more oxygen to make more energy, and the muscles can get tired and ache because of lactic acid.
Human breathing system: nostrils (নাকৰ ফুটা), nasal cavity (hairs and mucus there trap dust and germs and warm the air), windpipe (শ্বাসনলী), lungs (হাঁওফাঁও) with air sacs (alveoli, বায়ুকোষ) where oxygen enters the blood and carbon dioxide leaves it, and the diaphragm (মধ্যচ্ছদা / ডায়াফ্ৰাম, the muscular sheet under the lungs, in the belly region) with the ribs (কামিহাড়). Inhalation: the ribs move up and out and the diaphragm moves down, so the chest cavity becomes bigger and air rushes in. Exhalation: the ribs move down and in and the diaphragm moves up, so the chest cavity becomes smaller and air is pushed out. Air we breathe in has about 21 percent oxygen and a very little carbon dioxide; air we breathe out has less oxygen (about 16 percent), more carbon dioxide (about 4 percent) and water vapour (জলীয় বাষ্প), with the nitrogen the same. Sneezing (হাঁচি) and coughing (কাহ) are quick pushes of air that throw out dust, smoke and germs that enter the nose and windpipe and irritate them.
Breathing organs of animals: earthworm (কেঁচু) breathes through its moist skin; cockroach, housefly (মাখি) and other insects have tiny holes on the body called spiracles (শ্বাসৰন্ধ্ৰ) joined to air tubes called trachea (শ্বাসনলিকা); fish, prawn and crab breathe by gills (জলক্লোম) that take dissolved oxygen from the water; frog breathes with lungs on land and through its moist skin (and in water mainly through the skin); whales and dolphins (শিহু, তিমি) are mammals that live in water but breathe with lungs, so they come up to the surface from time to time and take air through nostril(s) on the head (blowhole). Birds, reptiles and mammals (including humans) have lungs. Amoeba (a single cell) takes oxygen by diffusion through the cell surface; its false feet (কূটপদ) are for movement and food, not breathing.
Plants: leaves have tiny pores called stomata (পত্ৰৰন্ধ্ৰ) for exchange of gases; old woody stems have lenticels (small pores in the bark, বাকলিৰ ছিদ্ৰ); roots take air from the spaces between soil particles. If the roots stay under water for many days the plant dies because the roots cannot get oxygen. Mangrove plants on the sea shore grow in marshy salty soil, with little air in it, so some roots grow upwards out of the soil as breathing roots (শ্বাসমূল, pneumatophores) to take in air. At night plants respire but do not make food in photosynthesis.
Notes about the book: in the exercise some words are spelt in the printer's way, for example "পুৰঠ কাণ্ড" (an old stem), "জেঠী" in Q4 (a), "লালুকী" in Q3 (d) and "ইষ্ট" (yeast). Q7 asks for a list of the English words given in brackets in the lesson with their Assamese words.`,
      sections: [
        { title: 'প্ৰশ্নাৱলী', questions: [
          Q('s7ac3-1', 1, 'Q1.', 'খালী ঠাই পূৰ কৰা :', { parts: [
            'a) কোষীয় শ্বসনত খাদ্যৰ ______ অণু ভাঙি গৈ শক্তি উৎপন্ন হয়।',
            'b) ইষ্ট কোষত হোৱা অবাত শ্বসনক ______ ও বোলা হয়।',
            'c) পেটৰ ভিতৰত থকা ______ নামৰ, পেশীৰে গঠিত অংশটোৱে উশাহ-নিশাহত সহায় কৰে।',
            'd) উদ্ভিদৰ পুৰঠ কাণ্ডৰ বাকলিত থকা ______ নামৰ ছিদ্ৰৰ দ্বাৰা পৰিবেশৰ লগত বায়ুৰ বিনিময় হয়।',
            'e) সাগৰৰ পাৰৰ মেংগ্ৰভ গছৰ শিপা ______ ৰ বাবে মাটিৰ ওপৰলৈ ওলায়।'
          ] }),
          Q('s7ac3-2', 2, 'Q2.', 'শুদ্ধ উত্তৰটো বাছি উলিওৱা :', { parts: [
            "i) পেশীকোষত হোৱা অবাত শ্বসনত কোনবিধ পদাৰ্থ সৃষ্টি হয়? a) হাইড্ৰ'ক্ল'ৰিক এছিড  b) এছেটিক এছিড  c) কাৰ্ব'নিক এছিড  d) লেক্টিক এছিড",
            'ii) উশাহ লোৱাৰ সময়ত কামিহাড়বোৰ— a) ওপৰলৈ উঠে  b) তললৈ নামে  c) লৰচৰ নকৰে  d) উঠা-নমা কৰি থাকে',
            'iii) নিশাহত এৰি দিয়া বায়ুৰ উপাদানৰ ক্ষেত্ৰত কোনটো কথা শুদ্ধ? a) কেৱল অক্সিজেন থাকে  b) কেৱল কাৰ্বন ডাইঅক্সাইড থাকে  c) কেৱল জলীয় বাষ্প থাকে  d) আটাইবোৰ থাকে',
            'iv) কেঁচুৱে কোনটো অংগ ব্যৱহাৰ কৰি শ্বাস-প্ৰশ্বাস লয়? a) ক্ষুদ্ৰ হাঁওফাঁও  b) ছাল  c) ফুল  d) শ্বাসনলী',
            'v) তলৰ কোনটো অংগ প্ৰাণীৰ শ্বাস-প্ৰশ্বাসৰ লগত জড়িত নহয়? a) জলক্লোম  b) কূটপদ  c) ছাল  d) পত্ৰৰন্ধ্ৰ'
          ] }),
          Q('s7ac3-3', 3, 'Q3.', 'অতি চমুকৈ উত্তৰ দিয়া :', { parts: [
            "a) কি কি অৱস্থাত শ্বাস-প্ৰশ্বাসৰ হাৰ কম-বেছি হ'ব পাৰে?",
            'b) খাদ্যৰ কোনবিধ উপাদানে প্ৰধানকৈ শক্তিৰ উৎস হিচাপে কাম কৰে?',
            'c) উদ্ভিদদেহৰ কি কি অংগ পৰিবেশৰ লগত বায়ুৰ বিনিময়ত জড়িত থাকে?',
            'd) লালুকীয়ে শ্বাস-প্ৰশ্বাসত কি অংগ ব্যৱহাৰ কৰে?',
            'e) শ্বাস-প্ৰশ্বাসৰ বাবে ভেকুলীয়ে হাঁওফাঁওৰ উপৰি কি অংগ ব্যৱহাৰ কৰে?'
          ] }),
          Q('s7ac3-4', 4, 'Q4.', 'চমু উত্তৰ লিখা :', { parts: [
            'a) কেঁচু, মাখি, ভেকুলী, জেঠী আৰু তিমি মাছৰ শ্বসনাংগৰ নাম লিখা।',
            'b) উদ্ভিদৰ শিপাই কেনেদৰে শ্বাস-প্ৰশ্বাস লয় লিখা।',
            'c) অধিক সময় ধৰি কঠোৰ পৰিশ্ৰম কৰাৰ অন্তত গা বিযায় কিয়?',
            'd) আমি হাঁচি আৰু কাহ মাৰোঁ কিয়?',
            'e) শ্বাস-প্ৰশ্বাসৰ হাৰ মানে কি? প্ৰাপ্তবয়স্কসকলৰ এই হাৰৰ মান উল্লেখ কৰা।'
          ] }),
          Q('s7ac3-5', 5, 'Q5.', 'বৰ্ণনাত্মক প্ৰশ্ন :', { parts: [
            'a) মানুহৰ উশাহ-নিশাহ লোৱা পদ্ধতিটো ব্যাখ্যা কৰা।',
            'b) প্ৰাণীয়ে কিয় শ্বাস-প্ৰশ্বাস লয়? অবাত শ্বসন আৰু সবাত শ্বসনৰ মাজৰ অন্তত চাৰিটা প্ৰভেদ লিখা।',
            'c) উদ্ভিদে শৰীৰৰ বিভিন্ন অংগৰ দ্বাৰা পৰিবেশৰ লগত কেনেকৈ গেছৰ বিনিময় কৰে লিখা।',
            'd) হাঁওফাঁওৰ বাহিৰে অন্য কি কি অংগৰ দ্বাৰা বিভিন্ন প্ৰাণীয়ে উশাহ-নিশাহ লয় বৰ্ণনা কৰা।'
          ] }),
          Q('s7ac3-6', 6, 'Q6.', 'চিন্তা কৰি উত্তৰ লিখা :', { parts: [
            'a) মাটিত গজা উদ্ভিদৰ শিপা বহুদিন ধৰি পানীত বুৰ গৈ থাকিলে গছজোপা মৰিহ যায় কিয়?',
            'b) শিহু, তিমি আদিয়ে মাজে মাজে মূৰটো পানীৰ পৃষ্ঠৰ ওপৰলৈ উলিয়াই দিয়ে কিয়?'
          ] }),
          Q('s7ac3-7', 7, 'Q7.', 'পাঠটোত থকা ইংৰাজী প্ৰতিশব্দসমূহৰ এখন তালিকা প্ৰস্তুত কৰা।')
        ] }
      ]
    },
    {
      no: 4, title: 'প্ৰাণী আৰু উদ্ভিদত দ্ৰব্যৰ পৰিবহণ (Transportation in animals and plants)', kind: 'Exercise (প্ৰশ্নাৱলী)',
      context: `Chapter notes (Class 7 General Science, Assamese-medium textbook, Chapter 4 "প্ৰাণী আৰু উদ্ভিদত দ্ৰব্যৰ পৰিবহণ" = Transportation in animals and plants; only the exercises (প্ৰশ্নাৱলী) are added, no theory page). Answer in simple Assamese, keep scientific words with the English word in brackets as the book does, and write short exam-style answers for the short-answer and descriptive questions. Pictures are not shown in the app, so describe the parts in words.
Why transport is needed: every cell needs oxygen and food, and wastes made in the body must be carried to the excretory organs. A system that carries substances from one part of the living body to another is the transport (পৰিবহণ) or circulatory (সংবহন) system. Amoeba (single cell) needs no special system. The main parts of the circulatory system in animals and humans: blood (তেজ), blood vessels (ৰক্তবাহিকা) and the heart (হৃদযন্ত্ৰ).
Blood is a liquid connective tissue ("সংবহন কলা", the tissue that circulates). Plasma (প্লাজমা, ৰক্তৰস, the liquid part, mostly water) carries digested food, hormones, carbon dioxide, wastes and salts. Blood cells: red blood cells (RBC, লোহিত ৰক্তকণিকা) have the red pigment haemoglobin (হিম'গ্ল'বিন, an iron-containing protein) which joins with oxygen and carries it from the lungs to all the cells (and helps in carrying some carbon dioxide back); the red colour of blood is because of RBC. White blood cells (WBC, শ্বেত ৰক্তকণিকা) fight germs and protect the body from disease. Platelets (অনুচক্ৰিকা) help blood to clot (clotting, জমাট বন্ধা) at a cut and stop the bleeding.
Blood vessels: arteries (ধমনী) carry blood away from the heart to the body parts (oxygen-rich blood, except the pulmonary artery), they have thick elastic walls and the pulse can be felt in them; veins (শিৰা) carry blood from the body parts back to the heart (oxygen-poor blood), they have thin walls and valves that stop back flow; capillaries (কৈশিকানলী) are very thin vessels joining arteries and veins where exchange of substances between blood and cells takes place.
Heart (হৃদযন্ত্ৰ) is a muscular pumping organ, about the size of a fist, in the chest slightly to the left, with four chambers: two upper chambers called atria (অলিন্দ) which receive blood and two lower chambers called ventricles (নিলয়) which pump blood out; a wall (septum) keeps oxygen-rich and oxygen-poor blood apart. It beats (হৃদস্পন্দন) about 72 times a minute in a resting adult; the pulse is the same beat felt in an artery at the wrist. A stethoscope (ষ্টেথস্কোপ) is the instrument that makes the heart sound louder. The heart pumps blood to all parts of the body; the blood flows in a circle (circulation).
Excretion (বেচন) is the removal of the waste made in the body. Human excretory system: two kidneys (বৃক্ক), two ureters (মূত্ৰনলী), the urinary bladder (মূত্ৰাশয়) and the urethra (মূত্ৰদ্বাৰ). Kidneys filter the blood, remove urea and extra water and salts, and the liquid waste called urine (মূত্ৰ, about 95 percent water, with urea, salts and other wastes) is stored in the bladder and passed out. Urine mostly has urea. Dialysis (ডায়েলাইছিছ) is the artificial purification of blood by a machine (artificial kidney) for a person whose kidneys do not work. Sweat (ঘাম) carries water, salt and a little urea out through the skin.
Transport in plants: roots take in water and minerals (by root hairs) and this goes up through xylem (জাইলেম) vessels to the stem and leaves; phloem (ফ্ল'য়েম) carries the food made in the leaves to all parts of the plant, up and down; xylem and phloem together form the transport (conducting) system of the plant. Transpiration (প্ৰস্বেদন) is loss of water as vapour from the leaves through the tiny pores (stomata, পত্ৰৰন্ধ্ৰ, mostly on the underside of the leaf); it pulls water up through the xylem like a suction, cools the plant and helps to take minerals up, and it is more on a hot, dry, windy day. Diffusion (বিসৰণ) is the movement of a substance from the place where it is more crowded to the place where it is less crowded (high concentration to low concentration), and osmosis (অভিস্ৰৱণ) is a special kind of diffusion of water through a thin skin (membrane); root hairs take water this way.
Notes about the book: Q2 (i) uses the word "উদ্ভিদ কলা" for plant tissue and the options are written জাইলেম, ফ্ল'ৱেম, ক্লব'প্লাষ্ট (chloroplast) and পত্ৰৰন্ধ্ৰ. The book spells "মানৰ দেহত" in Q4 (b) and "হিম'গ্লবিন" in Q4 (e). The chapter title in the lesson is "প্ৰাণী আৰু উদ্ভিদত দ্ৰব্যৰ পৰিবহণ" and in the contents page "উদ্ভিদৰ". Q5 asks for a list of the English words given in brackets in the lesson with their Assamese words.`,
      sections: [
        { title: 'প্ৰশ্নাৱলী', questions: [
          Q('s7ac4-1', 1, 'Q1.', 'খালী ঠাই পূৰ কৰা :', { parts: [
            'a) তেজ প্ৰধানকৈ ______ অংশেৰে গঠিত।',
            'b) ______ সহায়ত হৃদস্পন্দনৰ শব্দ বৰ্ধিত ৰূপত শুনিব পাৰি।',
            "c) তেজৰ ৰঙা ৰঞ্জক পদাৰ্থবিধ হ'ল ______।",
            'd) ______ আৰু ______ লগলাগি উদ্ভিদৰ সংবহন তন্ত্ৰ গঠিত হৈছে।',
            'e) মানুহৰ হৃদযন্ত্ৰত ______ কোঠালি থাকে।'
          ] }),
          Q('s7ac4-2', 2, 'Q2.', 'শুদ্ধ উত্তৰটো বাছি উলিওৱা :', { parts: [
            "i) নিম্নলিখিত কোনবিধ উদ্ভিদ কলা পানী আৰু খনিজ লৱণ পৰিবহণৰ লগত জড়িত? a) জাইলেম  b) ফ্ল'ৱেম  c) ক্লব'প্লাষ্ট  d) পত্ৰৰন্ধ্ৰ",
            'ii) তেজৰ কোনবিধ কোষৰ উপস্থিতিৰ বাবে ইয়াৰ বৰণ ৰঙা হয়? a) শ্বেতৰক্ত  b) অনুচক্ৰিকা  c) লোহিত ৰক্তকণিকা  d) ওপৰৰ আটাইবোৰ',
            'iii) মানুহৰ হৃদযন্ত্ৰৰ কোঠালি কেইটা? a) এটা  b) দুটা  c) তিনিটা  d) চাৰিটা',
            'iv) প্ৰস্বেদন কোনবিধ অংগৰ দ্বাৰা সম্পাদন হয়? a) শিপা  b) পাত  c) জাইলেম  d) ফুল',
            "v) মানুহৰ মূত্ৰত প্ৰধানকৈ কি থাকে? a) কাৰ্বন ডাইঅক্সাইড  b) এম'নিয়া  c) ইউৰিয়া  d) শৰ্কৰা"
          ] }),
          Q('s7ac4-3', 3, 'Q3.', 'প্ৰক্ৰিয়াটোৰ নাম লিখা :', { parts: [
            'a) তেজৰ পৰা কৃত্ৰিম উপায়ে বৰ্জিত দ্ৰব্য আঁতৰোৱা প্ৰক্ৰিয়া।',
            'b) অধিক গাঢ়তাৰ পৰা কম গাঢ়তালৈ হোৱা দ্ৰব্যৰ গতি।',
            'c) পাতৰ তলৰ অংশত থকা ছিদ্ৰই অতিৰিক্ত পানীভাগ উলিয়াই পঠিওৱা পদ্ধতিটো।',
            'd) জাইলেমৰ মাজেৰে জাইলেম ৰসৰ ঊৰ্দ্ধমুখী গতি।',
            'e) কৃত্ৰিম উপায়ে যন্ত্ৰৰ সহায়ত তেজৰ পৰা বৰ্জিত দ্ৰব্য অপসাৰণ কৰি তেজ পৰিশোধন।'
          ] }),
          Q('s7ac4-4', 4, 'Q4.', 'উত্তৰ লিখা :', { parts: [
            'a) পৰিবহণ তন্ত্ৰ বুলিলে কি বুজা? ইয়াৰ প্ৰয়োজনীয়তা কি?',
            'b) মানৰ দেহত হৃদযন্ত্ৰৰ প্ৰয়োজনীয়তাৰ বিষয়ে চমুকৈ লিখা।',
            'c) তেজ কি? তেজক কিয় সংবহন কলা বুলি কোৱা হয়?',
            'd) তেজত থকা ৰক্তকণিকাবোৰৰ বিষয়ে চমুকৈ লিখা।',
            "e) হিম'গ্লবিন কি? ইয়াৰ কাম কি?",
            'f) ৰক্তবাহিকা কেই প্ৰকাৰৰ? প্ৰতিবিধৰ বিষয়ে চমুকৈ লিখা।',
            'g) মানুহৰ বেচন তন্ত্ৰ কিহৰ দ্বাৰা গঠিত?',
            'h) বৃক্কৰ কাৰ্য্যৰ বিষয়ে চমুকৈ লিখা।',
            'i) উদ্ভিদৰ পৰিবহণ তন্ত্ৰৰ বিষয়ে চমুকৈ লিখা।',
            'j) প্ৰস্বেদন কাক বোলে? ইয়াৰ গুৰুত্ব কি?'
          ] }),
          Q('s7ac4-5', 5, 'Q5.', 'পাঠটোত থকা ইংৰাজী প্ৰতিশব্দসমূহৰ এখন তালিকা প্ৰস্তুত কৰা।')
        ] }
      ]
    },
    {
      no: 5, title: 'উদ্ভিদৰ প্ৰজনন আৰু বংশবিস্তাৰ (Reproduction in plants)', kind: 'Exercise (প্ৰশ্নাৱলী)',
      context: `Chapter notes (Class 7 General Science, Assamese-medium textbook, Chapter 5 "উদ্ভিদৰ প্ৰজনন আৰু বংশবিস্তাৰ" = Reproduction in plants; only the exercises (প্ৰশ্নাৱলী) are added, no theory page). Answer in simple Assamese, keep scientific words with the English word in brackets as the book does, and write short exam-style answers for the short-answer and descriptive questions. Pictures are not shown in the app, so for "describe with a figure" questions describe the parts in words.
Reproduction (প্ৰজনন) is the making of new living things of the same kind by a living thing, so that the species (প্ৰজাতি) continues. The life span of a living thing has four stages: birth, growth, reproduction and death. Plants reproduce in two ways: asexual reproduction (অযৌন প্ৰজনন), in which a new plant is made from one parent without joining of male and female gametes, and sexual reproduction (যৌন প্ৰজনন), in which male and female reproductive cells (gametes, জননকোষ) join; in flowering plants it is done by flowers.
Vegetative propagation (অংগজ প্ৰজনন) is a kind of asexual reproduction in which a new plant grows from a part of the old plant (root, stem or leaf) without seed or fertilisation: by stem cutting (rose, sugarcane, money plant: the part with a node / গাঁঠি grows roots and shoots), by underground stems (potato tuber with eyes, ginger rhizome, onion bulb, banana sucker / গুৰি, which gives seedlings), by runners on the ground (grass, strawberry), by roots (sweet potato, dahlia), by leaf buds (Bryophyllum / pathorkuchi, new plants appear at the notches of the leaf), by budding in yeast, by fragmentation in Spirogyra (algae) and by spores in fern, moss and fungi (the book also mentions bamboo and fern growing in clumps). The new plant is a copy of the parent and the method is fast. Plants in the book that reproduce from the root, stem and leaf are used as examples.
Flower parts (a flower is the reproductive part of a flowering plant): four whorls, from outside to inside: calyx (বৃতি, sepals, green, protect the bud), corolla (পাহি / দলমণ্ডল, petals, coloured, attract insects), androecium or stamens (পুংস্তবক, male part; each stamen (পুংকেশৰ) has a filament and an anther (পৰাগধানী) which makes pollen grains (পৰাগৰেণু)) and gynoecium or pistil (স্ত্ৰীস্তবক, female part, formed by carpels: stigma (গৰ্ভমুণ্ড, sticky top), style (গৰ্ভদণ্ড) and ovary (গৰ্ভাশয়) with ovules (ডিম্বক) inside). Flowers that have both stamens and pistil are bisexual (উভলিংগী); flowers with only one are unisexual.
Pollination (পৰাগযোগ) is the transfer of pollen from the anther to the stigma. Self-pollination (স্বপৰাগযোগ): pollen goes to the stigma of the same flower (or another flower of the same plant). Cross-pollination (ইতৰ পৰাগযোগ): pollen goes to the stigma of a flower of another plant of the same kind. Agents of pollination (মাধ্যম): wind (light, dry, dusty pollen, feathery stigma, flowers small and without scent and colour, for example maize and grasses), insects such as bees and butterflies (bright, scented flowers with nectar, sticky or spiny pollen), water, birds and other animals. Differences: self-pollination needs one plant and no outside agent; cross-pollination needs two plants and an agent; self-pollination gives less variety, and cross-pollination gives a better, stronger new generation.
Fertilisation (নিষেচন): after pollination, the pollen grain on the stigma grows a pollen tube (পৰাগনলীকা) down the style into the ovary, and the male gamete joins with the female gamete (egg cell) in the ovule; the cell formed is the zygote (জাইগোট) which grows into the embryo (ভ্ৰূণ). After fertilisation the ovule becomes the seed (বীজ), the ovary becomes the fruit (ফল) and the other flower parts (petals, stamens, style) dry up and fall off. The ripe ovary makes the fruit; the seed has a baby plant and stored food (the embryo uses it in the seed; "ভ্ৰূণ পোষক"). 
Seed dispersal (বীজৰ বিস্তাৰণ) is the spread of seeds to far places so that new plants get space, light, water and minerals and do not crowd the parent: by wind (very light, small, winged or hairy seeds: drumstick, maple, sunflower and dandelion, "কপাহ" cotton), by water (seeds or fruits that float, with a light spongy or fibrous cover: coconut, lotus), by animals (fruits with hooks or spines that stick to the fur and cloth: xanthium, urena; or fleshy tasty fruits eaten by birds and animals whose seeds are dropped far away with their droppings: guava, mango), by bursting of the fruit (when a dry fruit dries and cracks suddenly the seeds are thrown out: castor, pea, balsam, lady's finger) and by humans (carrying seeds for sowing, farming, trade, planting and selling fruits and seeds).
Notes about the book: Q1 (iii) uses "মৃদগত কাণ্ড" (underground stem) and Q1 (iv) uses "পুৰঠ ডিম্বাশয়" (ripened ovary). Q4 (ii) says "মাধ্যমবিলাক" for the agents of pollination. Q5 asks for a list of the English words given in brackets in the lesson with their Assamese words (for example: reproduction, life span, species, seedling, bamboo, fern, asexual reproduction, sexual reproduction, vegetative propagation, bud, pollination, fertilisation, zygote, embryo, calyx, corolla, stamen, pistil, ovary, ovule).`,
      sections: [
        { title: 'প্ৰশ্নাৱলী', questions: [
          Q('s7ac5-1', 1, 'Q1.', 'শুদ্ধ উত্তৰটো বাছি উলিওৱা :', { parts: [
            "i) এজোপা উদ্ভিদৰ মুখ্য প্ৰজনন অংগ হ'ল— a) ডাল  b) পাত  c) মুকুল  d) ফুল",
            'ii) পুং আৰু স্ত্ৰী জননকোষৰ মিলনক কি বুলি জনা যায়? a) নিষেচন  b) পৰাগযোগ  c) বীজৰ গঠন  d) মুকুলন',
            'iii) মৃদগত কাণ্ডৰ কি অংগৰ পৰা নতুন উদ্ভিদৰ সৃষ্টি হয়? a) শুল্কপত্ৰ  b) গাঁঠি  c) মুকুল  d) শিপা',
            'iv) পুৰঠ ডিম্বাশয়ে গঠন কৰে— a) বীজ  b) জননকোষ  c) ভ্ৰূণ  d) ফল',
            'v) ফুলৰ কি অংশৰ পৰা ফলৰ সৃষ্টি হয়? a) বৃতি  b) গৰ্ভমুণ্ড  c) পৰাগধানী  d) গৰ্ভাশয়'
          ] }),
          Q('s7ac5-2', 2, 'Q2.', 'খালী ঠাই পূৰ কৰা :', { parts: [
            'i) পুংকেশৰৰ পৰাগৰেণু গৰ্ভমুণ্ডত থিতাপি লোৱাকে ______ বোলে।',
            'ii) পুং আৰু স্ত্ৰী জননকোষৰ মিলনক ______ বোলে।',
            'iii) উদ্ভিদদেহৰ অংশৰ পৰা নিষেচন নোহোৱাকৈ অন্য উদ্ভিদ সৃষ্টি হোৱা ক্ৰিয়াক ______ বোলে।'
          ] }),
          Q('s7ac5-3', 3, 'Q3.', 'চমু উত্তৰ দিয়া :', { parts: [
            'i) যৌন প্ৰজনন বুলিলে কি বুজা?',
            'ii) স্বপৰাগযোগ আৰু ইতৰ পৰাগযোগৰ পাৰ্থক্য লিখা।',
            'iii) বীজৰ কি কি গুণৰ বাবে বতাহে এঠাইৰ পৰা আনঠাইলৈ বিস্তাৰণ কৰাব পাৰে?',
            'iv) ফুলৰ নিষেচন বুলিলে কি বুজা?',
            'v) মানুহে কিদৰে বীজৰ বিস্তাৰণ ঘটাব পাৰে?'
          ] }),
          Q('s7ac5-4', 4, 'Q4.', 'বিৱৰণ দি উত্তৰ দিয়া :', { parts: [
            'i) উচ্চ পৰ্যায়ৰ উদ্ভিদৰ ক্ষেত্ৰত কি কি প্ৰকাৰে অংগজ প্ৰজনন সম্ভৱ হয় চিত্ৰ আৰু উদাহৰণ দি বৰ্ণনা কৰা।',
            'ii) ফুলৰ ইতৰ পৰাগযোগ সম্পন্ন কৰিবলৈ মাধ্যমবিলাকে কি কি সুবিধাৰে পৰাগযোগ সম্পন্ন কৰে উদাহৰণৰ সৈতে বৰ্ণনা কৰা।'
          ] }),
          Q('s7ac5-5', 5, 'Q5.', 'পাঠটোত থকা ইংৰাজী প্ৰতিশব্দসমূহৰ এখন তালিকা প্ৰস্তুত কৰা।')
        ] }
      ]
    },
    { no: 6, title: 'আমাৰ কাপোৰ', kind: 'Coming soon', locked: true, sections: [] },
    { no: 7, title: 'তাপ আৰু উষ্ণতা', kind: 'Coming soon', locked: true, sections: [] },
    { no: 8, title: 'এছিড, ক্ষাৰক আৰু লৱণ', kind: 'Coming soon', locked: true, sections: [] },
    { no: 9, title: 'ভৌতিক আৰু ৰাসায়নিক পৰিবৰ্তন', kind: 'Coming soon', locked: true, sections: [] },
    { no: 10, title: 'মাটি', kind: 'Coming soon', locked: true, sections: [] },
    { no: 11, title: 'গতি আৰু সময়', kind: 'Coming soon', locked: true, sections: [] },
    { no: 12, title: 'বিদ্যুৎ', kind: 'Coming soon', locked: true, sections: [] },
    { no: 13, title: 'পোহৰ', kind: 'Coming soon', locked: true, sections: [] },
    { no: 14, title: 'বতাহ, ধুমুহা আৰু ঘূৰ্ণীবতাহ', kind: 'Coming soon', locked: true, sections: [] },
    { no: 15, title: 'জলবায়ু আৰু প্ৰাণীৰ অভিযোজন', kind: 'Coming soon', locked: true, sections: [] },
    { no: 16, title: 'পানী : এক অমূল্য সম্পদ', kind: 'Coming soon', locked: true, sections: [] },
    { no: 17, title: 'অৰণ্যজাত সামগ্ৰী', kind: 'Coming soon', locked: true, sections: [] },
    { no: 18, title: 'বৰ্জিত পানীৰ ব্যৱস্থাপনা', kind: 'Coming soon', locked: true, sections: [] }
  ]
};
