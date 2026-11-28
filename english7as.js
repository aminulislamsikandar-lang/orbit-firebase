// Class 7 English, Assamese medium (textbook used at Halimon Nessa Academy): the lessons (reading and literature). The grammar, writing and vocabulary parts of each lesson are in grammar7as.js (subject 'English Grammar').
// Question ids start with e7ac<lesson>- so they never clash with other courses (the other Class 7 English uses e7c<lesson>-).
// `context` on a chapter is hidden from students and only sent to the AI (a summary of the lesson in my own words; the lesson text itself is not stored here).
// Lessons 4-16 are listed by name only (locked: true, no sections) until their exercises are added.
module.exports = {
  id: 'c7-english-as',
  subject: 'English',
  class: 7,
  medium: 'Assamese',
  chapters: [
    {
      no: 1, title: 'Love for Animals', kind: 'Lesson',
      context: `Lesson 1 "Love for Animals" (Class 7 English, Assamese-medium textbook). Notes for the AI, a summary in my own words (the lesson text itself is not stored here). Answer in simple, correct English, in complete sentences, as a Class 7 student would.
- Barun is a well-known nature lover, only eighteen years old. Two years ago he formed an organization called "Animal Lovers" with the help of his father, who is a veterinary doctor. Its members are trained vets, animal activists, volunteers and children, all very caring people.
- Barun feels he can hear the cries of animals that cannot speak, and he understands the painful mewing of a motherless kitten. He is worried about the exhaustion of a donkey staggering under a heavy load. He is grief-stricken when he hears the whimpering of a lost puppy, and when he sees an animal hit by a car, because they are all skin and bone.
- Every member brings stray dogs in from the streets and takes care of their food, medicines and vaccination. In summer they keep many mud bowls of water at convenient places for stray animals, which quenches the thirst of the creatures (dogs, cats, birds, ants, wasps, bees and others), and they put out grains on rooftops or balconies for birds.
- Last year in July Assam had floods and rising flood water was a threat to the wild animals of Kaziranga: a large number of rhinos, deer and elephants were trapped. Rhino calves were separated from their mothers; the members rescued two such calves with the help of the village folk and sent them to the rehabilitation centre. They also rescued and treated four injured hog deer, and hog deer were among the worst sufferers (some were hit by vehicles while crossing the roads); they searched for safer places for them.
- Every year the members conduct pre-flood awareness campaigns in flood-affected areas of Assam. Their plan is to teach local communities correct handling techniques and how to manage and calm distressed animals on the spot, until the forest department's rescue team arrives, and to give first aid. They especially warn about "capture myopathy", a disease linked with capturing or handling a wild animal: if animals are caught and handled wrongly, they may die, so a training session is needed.
- The members have become famous and are known for their impressive animal rescue work; everybody praises them for being so passionate about animals. Till now they have adopted 45 wounded stray dogs, 15 rabbits, 20 kittens, 10 doves and 25 sparrows, and they have grown into a big family. The volunteers and activists cook for the dogs daily, clean the animals and their shelters, offer different types of grains for doves and sparrows, and provide milk for the kittens and fresh fruit and vegetables for the rabbits. Each member has created a caring environment for animals at home, and their family members also help to feed strays and keep bowls of water for animals and birds.
- "Animal Lovers" collects donations from charitable trusts and well-wishers, and the Animal Welfare Board of India (AWBI) has given financial assistance for building and maintaining animal shelters and water troughs, buying medicines and equipment and an animal ambulance. Animals suffer from road accidents, injuries, disease, floods and forest fires, so a large number of domestic and stray animals need care and protection. The organization sends its animal ambulance to such cases.
- Word notes (textbook): veterinary = relating to diseases, injuries and treatment of farm and domestic animals; volunteer = one who freely offers social service; vaccination = the act of vaccinating; rehabilitation = restoring someone to health or normal life; campaign = a connected series of operations to bring a result; capture myopathy = a disease linked with capturing or handling a wild animal; administer = to manage or control, to apply; trough = a long narrow open container for animals to eat or drink from.
- Q4 (animal cries, use the usual English verbs): bark = dog; chatter = monkey (also a magpie); coo = dove or pigeon; roar = lion or tiger; trumpet = elephant; neigh = horse; mew = cat (kitten); croak = frog; howl = wolf or dog; caw = crow.
- Q5 (antonyms): love - hate; old - new or young; heavy - light; wild - tame; correct - incorrect or wrong; worst - best; distressed - comforted, relieved or happy; inappropriately - appropriately; famous - unknown or obscure; impressive - unimpressive; praise - criticise or blame; big - small; clean - dirty; protect - harm, attack or neglect.
The grammar part of Lesson 1 (pronouns, tense revision, phrasal verbs, idioms, letter writing and vocabulary) is in the separate subject "English Grammar".`,
      sections: [
        { title: 'Before you read (page 1)',
          questions: [
          { id: 'e7ac1-b1', no: 1, label: 'Before you read.', text: 'Do you feel sympathy for any ailing animals?' },
          { id: 'e7ac1-b2', no: 2, label: 'Before you read.', text: 'Do you know any organization which is working for the welfare of animals?' }
          ] },
        { title: 'Comprehension (page 4)',
          questions: [
          { id: 'e7ac1-c1', no: 1, label: 'Q1.', text: 'Answer the following questions in complete sentences.',
            parts: [
              "a) Who formed 'Animal Lovers'?",
              "b) Who are the members of 'Animal Lovers'?",
              'c) When is Barun grief-stricken?',
              "d) How does every member of Barun's organization take care of street dogs?",
              'e) What do they do to quench the thirst of creatures during summer?',
              'f) Which animals were the sufferers during that flood?'
            ] },
          { id: 'e7ac1-c2', no: 2, label: 'Q2.', text: "What animals have the members of 'Animal Lovers' adopted till now?" },
          { id: 'e7ac1-c3', no: 3, label: 'Q3.', text: 'How do the volunteers and animal activists take care of the animals daily?' },
          { id: 'e7ac1-c4', no: 4, label: 'Q4.', text: 'Name the animals which have the following cries.',
            parts: [
              'bark',
              'chatter',
              'coo',
              'roar',
              'trumpet',
              'neigh',
              'mew',
              'croak',
              'howl',
              'caw'
            ] },
          { id: 'e7ac1-c5', no: 5, label: 'Q5.', text: 'Write the antonyms of the following.',
            parts: [
              'love',
              'old',
              'heavy',
              'wild',
              'correct',
              'worst',
              'distressed',
              'inappropriately',
              'famous',
              'impressive',
              'praise',
              'big',
              'clean',
              'protect'
            ] }
          ] }
      ]
    },
    {
      no: 2, title: 'The Quarrel', kind: 'Poem', author: 'Eleanor Farjeon',
      context: `Lesson 2 "The Quarrel" (Class 7 English, poem by Eleanor Farjeon). Notes for the AI, a summary in my own words (the poem text is not stored here). Answer in simple, correct English, in complete sentences.
- The poet: Eleanor Farjeon was born on 13 February 1881 in England; she wrote children's stories, plays and poetry, had poor eyesight and was often ill in childhood; her autobiography is "A Nursery in the Nineties" (1935); she died on 5 June 1965 in Hampstead, London.
- The poem is short and told in the first person by a sister. She quarrelled with her brother but does not even remember what it was about, so the reason for the quarrel is not known. One thing led to another and they fell out. The beginning was small and slight, but the end of the quarrel was strong and bitter. The brother said that he was right, but the sister knew he was wrong. They hated each other, and the afternoon "turned black" (it became gloomy and unhappy for both because of the quarrel and because they were not talking). Then suddenly the brother thumped her on the back (a friendly gesture), said "Come along! We can't go on all night" and admitted "I was in the wrong". The quarrel ended with the brother admitting his mistake, and that made him the one who was in the right. The lesson: say sorry and make peace, do not carry anger for long, and the one who admits a mistake is the bigger person.
- Rhyming words in the poem (words that end with the same sound): brother - another; about - out; black - back; strong - wrong - along; night - right (slight also rhymes with right and night).
- Word notes (textbook): fell out = quarrelled; slight = very small in amount; hated = strongly disliked; afternoon turned black = the afternoon became gloomy because of the quarrel; thump = to hit someone and make a loud deep sound (here a friendly gesture); come along = to tell somebody to hurry.
- Textbook summary (idea): a sister quarrelled with her brother, they shouted, both claimed to be right, stopped talking until the evening; suddenly the brother made up by patting her back and admitting his fault, so he did the right thing for a friendly relationship.`,
      sections: [
        { title: 'Answer the following questions (page 17)',
          questions: [
          { id: 'e7ac2-q1', no: 1, label: 'Q.', text: 'Answer the following questions.',
            parts: [
              "i) Who is the poet of the poem 'The Quarrel'?",
              'ii) Whom did the sister quarrel with?',
              'iii) What was the reason of the quarrel?',
              'iv) What did the brother say at first?',
              'v) Why did the brother say that the afternoon turned black?',
              'vi) How did the quarrel come to an end?',
              'vii) Find out some rhyming words from the poem.'
            ] }
          ] }
      ]
    },
    {
      no: 3, title: 'The Adventures of Tom Sawyer', kind: 'Story', author: 'Mark Twain',
      context: `Lesson 3 "The Adventures of Tom Sawyer" (Class 7 English, a story by Mark Twain). Notes for the AI, a summary in my own words (the story text is not stored here). Answer in simple, correct English, in complete sentences, as a Class 7 student would.
- Aunt Polly is searching for naughty Tom everywhere in the house. She is tired of his mischief. She catches hold of him just in time and finds jam in his mouth. Tom tricks her ("Oh, look behind you, Aunt") and runs away. But Aunt Polly loves him because he is the only son of her dead sister.
- Aunt Polly decides to keep Tom busy so that he cannot waste time idly, and orders him to whitewash the fence the next day, a Saturday.
- On Saturday morning Tom comes out with a bucket of whitewash and a long handled brush. He looks at the fence lazily, dips his brush and starts whitewashing the topmost plank. He does this several times, feels tired and bored, and knows that all his friends will be playing or swimming. He wanted to go out and enjoy like the other boys.
- Just then Tom sees Jim, who works for Aunt Polly. Jim comes with a tin pail to fetch water from the town pump. Tom hates his work and finds Jim's work better. He makes a plan and offers Jim to fetch water for him, but before Jim can agree he hears Aunt Polly's slippers and flies down the street with his pail. Poor Tom! He again starts whitewashing the fence.
- A few minutes later he sees Ben coming up the road, eating an apple. Tom pretends that he is absorbed in his work and does not pay attention. Ben comes near and teases him for working on a holiday, saying he is going for a swim. Tom says it is so enjoyable and he can't leave this chance. Ben is tempted and asks to whitewash a little; Tom refuses ("It has to be done very carefully"). Ben is more tempted and pleads, offering his apple in return. Tom is pleased at the success of his plan and agrees but asks him to be careful. Ben starts whitewashing with great enthusiasm while Tom sits comfortably in the shade eating the apple.
- After some time Billy Fisher comes and Tom lets him whitewash in return for a kite; then Johnny Miller takes the chance and gives a tin soldier and others; by the afternoon Tom has collected twelve marbles, a piece of chalk, a tin soldier, a couple of tadpoles, a kitten, the handle of a knife and six firecrackers. In return Tom got the fence whitewashed thrice. (So the fence had been whitewashed thrice, not twice; the one who came with a tin pail, not a bag, was Jim; the one who gave a kite was Billy Fisher.) The lesson: a clever plan can turn a boring job into something others want to do.
- About the writer: Mark Twain (30 November 1835 to 21 April 1910) was an American writer and humorist who captured a world audience with stories of his boyhood and adventure; popular books include The Adventures of Tom Sawyer, Adventures of Huckleberry Finn, Tom Sawyer Abroad and Tom Sawyer, Detective.
- Word notes (textbook): get hold of = grasp something; catch hold of = to seize something or someone; stern = expressing strong disapproval; whirled around = to turn around quickly; mischief = annoying behaviour; whitewash = to paint with whitewash; enthusiasm = strong excitement or feeling for something one enjoys; fence = a structure built with bamboo, wood etc. surrounding a house, garden etc.; tadpole = young one of a frog.
- Q5 (sentences of your own): write one short, correct sentence for each of get hold of, catch hold of, fly down, come up, search for (for example: The police caught hold of the thief. The birds flew down from the tree. The sun came up at six. She searched for her keys). The grammar part of Lesson 3 (adjectives, direct and indirect speech, phrasal verbs, idioms) is in the separate subject "English Grammar".`,
      sections: [
        { title: 'Before you read (page 18)',
          questions: [
          { id: 'e7ac3-b1', no: 1, label: 'Before you read.', text: 'Have you read any adventurous story?' },
          { id: 'e7ac3-b2', no: 2, label: 'Before you read.', text: 'Have you read any book of Mark Twain?' }
          ] },
        { title: 'Comprehension (page 21)',
          questions: [
          { id: 'e7ac3-c1', no: 1, label: 'Q1.', text: 'Answer the following questions in complete sentences.',
            parts: [
              'a) Who was searching for Tom?',
              'b) What was Tom ordered to do on that Saturday?',
              'c) Who worked for Aunt Polly?',
              'd) What was Ben doing when Tom saw him?',
              'e) How did Tom react on seeing Ben?',
              'f) What was Ben tempted for?',
              'g) What did he give Tom in return?'
            ] },
          { id: 'e7ac3-c2', no: 2, label: 'Q2.', text: 'How did Tom start his work?' },
          { id: 'e7ac3-c3', no: 3, label: 'Q3.', text: 'What did Tom collect at the end of the day?' },
          { id: 'e7ac3-c4', no: 4, label: 'Q4.', text: 'Write whether the following statements are true or false.',
            parts: [
              'a) Jim came with a bag.',
              'b) Tom said that it was very enjoyable to whitewash the fence.',
              'c) Billy Fisher gave Tom a kite.',
              'd) At the end of the day the fence had been whitewashed twice.'
            ] },
          { id: 'e7ac3-c5', no: 5, label: 'Q5.', text: 'Frame sentences of your own with the following.',
            parts: [
              'get hold of',
              'catch hold of',
              'fly down',
              'come up',
              'search for'
            ] }
          ] }
      ]
    },
    { no: 4, title: 'Revision Test 1', kind: 'Revision Test', locked: true, sections: [] },
    { no: 5, title: 'The Drum', kind: 'Lesson', locked: true, sections: [] },
    { no: 6, title: 'Stopping by Woods on a Snowy Evening', kind: 'Poem', locked: true, sections: [] },
    { no: 7, title: 'Marie Curie', kind: 'Lesson', locked: true, sections: [] },
    { no: 8, title: 'Antarctica', kind: 'Lesson', locked: true, sections: [] },
    { no: 9, title: 'Revision Test 2', kind: 'Revision Test', locked: true, sections: [] },
    { no: 10, title: 'A Visit to Nainital', kind: 'Lesson', locked: true, sections: [] },
    { no: 11, title: 'Children of the Rainbow', kind: 'Poem', locked: true, sections: [] },
    { no: 12, title: 'Leonardo da Vinci', kind: 'Lesson', locked: true, sections: [] },
    { no: 13, title: 'Revision Test 3', kind: 'Revision Test', locked: true, sections: [] },
    { no: 14, title: 'The Longest Train Journey', kind: 'Lesson', locked: true, sections: [] },
    { no: 15, title: 'Try Again', kind: 'Poem', locked: true, sections: [] },
    { no: 16, title: 'Revision Test 4', kind: 'Revision Test', locked: true, sections: [] }
  ]
};
