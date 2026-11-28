// Class 7 English Grammar, Assamese medium (the grammar, writing and vocabulary parts of the same textbook as english7as.js), a separate subject from the lessons.
// subject is 'English Grammar' so the Subjects page shows it as its own row; the AI uses the English tutor prompts for it.
// Question ids start with g7ac<lesson>- so they never clash with other courses (g7ac1 = the grammar of Lesson 1). One chapter per lesson that has grammar (the chapter number is the lesson number; Lesson 2, a poem, has none).
// `context` on a chapter is hidden from students and only sent to the AI (rules and examples, written in my own words).
// A section can have `rules: { kind: 'grammar' | 'writing', topic }`, which shows the "Rules (AI)" box.
module.exports = {
  id: 'c7-grammar-as',
  subject: 'English Grammar',
  class: 7,
  medium: 'Assamese',
  chapters: [
    {
      no: 1, title: 'Lesson 1: Pronouns, Tenses, Letter Writing and Vocabulary', kind: 'Grammar',
      context: `Lesson 1 (Class 7 English textbook, Assamese medium) grammar part, notes for the AI, written in my own words. The grammar of every lesson is kept in this subject, the lesson itself is in the subject "English". Answer in simple, correct English as a Class 7 student; for "choose / rewrite" items give the corrected sentence first, then a one-line reason.
A. Pronoun: a pronoun is a word used instead of a noun (Rita is a beautiful girl. She is also very intelligent: "she" stands in for "Rita"). Kinds: 1 personal, 2 reflexive, 3 emphatic, 4 demonstrative, 5 indefinite, 6 distributive, 7 reciprocal, 8 interrogative, 9 relative.
 1. Personal pronouns stand for the three persons: first person (I, we, me, us, my, mine, our, ours), second person (you, your, yours) and third person (he, she, it, they, him, her, them, his, hers, its, their, theirs). Examples: I am a player. Give me a red pen. This book is mine. That doll is hers.
 2. Reflexive pronouns are used when the subject and the object are the same person or thing: myself, yourself, himself, herself, itself (singular) and ourselves, yourselves, themselves (plural). Examples: He hurt himself. She spoke to herself.
 3. Emphatic pronouns are the same words (myself, himself, ...) used to give emphasis; they can be left out without changing the meaning. Examples: I myself did the work. The bridge itself fell down.
 4. Demonstrative pronouns point out the person or thing: this, that, these, those. Examples: This is my book. Those are her books. (The climate of Shillong is better than that of Guwahati.)
 5. Indefinite pronouns refer to people or things in a general way, not to a particular one: one, none, nobody, somebody, anybody, everybody, everyone, something, nothing, some, all, many, few, any. Examples: Nobody came to meet me. Everybody's business is nobody's business.
 6. Distributive pronouns refer to persons or things one at a time, so they are always singular: each, either, neither. Examples: Each of the boys received a prize. Neither of them was late.
 7. Reciprocal pronouns show a mutual relationship: each other (two persons or things) and one another (more than two). Examples: The two sisters quarrelled with each other. The two pilgrims helped one another is usually used for more than two.
 8. Interrogative pronouns are used to ask questions: who, whom, whose, which, what.
 9. Relative pronouns stand in place of a noun and also join sentences or clauses: who, whom, whose, which, that, what. Examples: The boy who was standing there is my brother. The man whom you met is my father. This is the bag which my father sent for me. I don't know what has happened.
 Note on manners: in a sentence the second person (you) stands first, the third person (he) second and the first person (I) last: You, he and I will attend the meeting. But after a preposition or as an object use "me": These gifts are for you and me. He is taller than I (am).
B. Revision on tense:
 - The present continuous tense is also used for an action that is planned or arranged for the near future. Examples: My father is leaving for Kolkata tonight. He is visiting the dentist this afternoon (an appointment is already arranged). The students are going to Chennai next week.
 - The simple future tense (will / shall + verb) is used (a) for things we cannot control (I shall be thirteen next month. It will be Durga Puja next week), (b) to say what we think or believe will happen (I think India will win the match. He will go to school every day), (c) for an instant decision made at the moment of speaking (It is raining. I will close the window. I am hungry. I will eat these bananas).
 - Future time with "going to" (be + going to + base verb): used when we have already decided to do something (He is going to buy a motorbike. Mr Saikia is going to resign from the job) and when there is something certain at present that tells us about the future (The child is going to cry; look at its trembling lips. It is going to rain; look at those clouds). We do not use "going to" for an instant decision; use will / shall for that.
 - Activity 2 (choose the correct verb form), the correct choices are: i) has lately become; ii) Have you ever been; iii) have been building; iv) has been doing; v) had finished; vi) had reached; vii) had done; viii) had left; ix) had already started; x) have not received. Reasons: present perfect (has/have + past participle) for something that began in the past and still matters now or for experience; present perfect continuous (has/have been + -ing) for an action going on from some time in the past till now ("for several months", "for the last two months"); past perfect (had + past participle) for the earlier of two past actions (I had finished my homework before I had dinner).
 - Activity 3: rewrite each present simple sentence once in the simple past and once in the simple future (will + base verb). Example: He goes to school every day. -> He went to school every day. -> He will go to school every day. Remember: "has" becomes "had" in the past and "will have" in the future; "is" becomes "was" and "will be"; for "sells / drives / runs / writes / delivers / cooks" use sold / drove / ran / wrote / delivered / cooked and will sell / drive / run / write / deliver / cook. Add the time words as they are (every Monday, every year, regularly).
C. Phrasal verbs (verb + preposition with a new meaning): abide by = follow (rules and regulations): The students should abide by the rules of the school. Break in (on) = interrupt: He broke in on the conversation of his sisters. Break into = enter by force: The robber broke into the house at midnight. Bring out = publish, introduce: They will bring out a new edition of this book.
D. Idioms (a fixed group of words with a meaning different from the meanings of its words): a feather in one's cap = an achievement to be proud of: This victory will add a feather in his cap. The ABC of something = the basics: He does not know the ABC of gardening. A jack of all trades, but master of none = a person who knows many things a little but none well.
E. Letter writing (informal letter to a friend or a relative): write the sender's address and the date at the top (for example Noonmati, Guwahati, 20-5-2019), then "Dear <name>,", an opening paragraph (ask about health, say why you are writing), the body in one or two short paragraphs, a closing paragraph and "Your loving friend" (or "Your loving nephew / niece") with your name; the envelope has "To", the name with C/o, the village or town, P.O., PIN and district. The textbook models are a letter about the Spoken English class library (35 students each gave one book, one library period a week, a short note and speech on the borrowed book) and a letter about a science fair (the National Science Day on 28 February, a scientist as chief guest, the model "Water Harvesting", praise from the chief guest). The activities ask for a letter to a cousin about a state-level debate competition and a letter to a paternal uncle about a visit to the Orang National Park; use simple, correct, friendly English and about 150 to 200 words.
F. Vocabulary (similes with "as ... as"): proud as a peacock, sweet as honey (or sugar), warm as wool, cunning as a fox, red as blood, white as snow, brave as a lion, busy as a bee, gentle as a lamb, green as grass, hard as stone (or iron), slow as a snail, innocent as a dove, silent as the grave, light as a feather, black as coal (or pitch), cool as a cucumber, clear as crystal.`,
      sections: [
        { title: 'A. Pronoun: Activity 1, find out the pronouns and write them separately (page 8)',
          rules: { kind: 'grammar', topic: 'Pronouns and their kinds: personal, reflexive, emphatic, demonstrative, indefinite, distributive, reciprocal, interrogative and relative pronouns, with examples' },
          questions: [
          { id: 'g7ac1-a1', no: 1, label: 'Activity 1.', text: 'Find out the pronouns and write them separately.',
            parts: [
              'i) We are sitting in their room and talking with them.',
              'ii) They will inform us about the matter.',
              'iii) It is a very beautiful flower.',
              'iv) Her frock is as colourful as theirs.',
              'v) That book is hers but this pen is his.',
              'vi) I myself saw him doing the work.',
              'vii) She is preparing her food herself.',
              'viii) These are my pencils.',
              'ix) Those are your pens.',
              'x) Each of the students will get a book.',
              'xi) Nobody came to meet you at your office.',
              'xii) Either of them will be selected.',
              'xiii) My daughters love each other very much.',
              'xiv) This is the man whom I met at the station.'
            ] }
          ] },
        { title: 'B. Revision on Tense: Activity 2, choose the correct verb form (page 10)',
          rules: { kind: 'grammar', topic: 'Present continuous for planned future, simple future (will / shall), going to form, present perfect, present perfect continuous and past perfect' },
          questions: [
          { id: 'g7ac1-a2', no: 2, label: 'Activity 2.', text: 'Choose the correct verb form from those given in brackets and rewrite the sentences.',
            parts: [
              'i) My friend (has lately become / became lately / is becoming lately) more serious about his studies.',
              'ii) (Have you ever been / Have you been going) to Mussoorie?',
              'iii) The workers (have been building / were building / are building) the bridge for several months.',
              'iv) Mrinmoy (has been doing / is doing / does) regular exercise for the last two months.',
              'v) I (finished / had finished) my homework before I had dinner.',
              'vi) She (reached / has reached / had reached) home before the guests arrived.',
              'vii) He thanked me for what I (am doing / have been doing / had done).',
              'viii) Uncle (is leaving / had left / has left) when I returned.',
              'ix) When they reached the theatre the play (started / was starting / had already started).',
              'x) I (have not received / do not receive / had not received) a letter from him yet.'
            ] }
          ] },
        { title: 'B. Revision on Tense: Activity 3, rewrite in the past and the future tense (page 11)',
          rules: { kind: 'grammar', topic: 'Changing simple present sentences into the simple past tense and the simple future tense' },
          questions: [
          { id: 'g7ac1-a3', no: 3, label: 'Activity 3.', text: 'Rewrite the following sentences once in the past tense and once in the future tense making the necessary changes wherever required.',
            parts: [
              'i) He goes to school every day.',
              'ii) She cooks delicious food.',
              'iii) That woman sells green, fresh leafy vegetables every Monday.',
              'iv) He drives a big truck.',
              'v) Mr Sen writes for newspapers and magazines regularly.',
              'vi) They go abroad every year.',
              'vii) Sarita has a collection of short stories.',
              'viii) Mousumi is an intelligent girl.',
              'ix) Mr Das delivers invaluable speeches in the meeting.',
              'x) Kanak runs fast.'
            ] }
          ] },
        { title: 'Writing Activity: Letter Writing (pages 12 to 14)',
          rules: { kind: 'writing', topic: 'Informal letter: address and date, salutation, opening, body, closing, subscription, envelope' },
          questions: [
          { id: 'g7ac1-w1', no: 1, label: 'Activity 1.', text: 'A state-level debate competition was held in your school recently. Write about it in a letter to your cousin.' },
          { id: 'g7ac1-w2', no: 2, label: 'Activity 2.', text: 'Recently you visited the Orang National Park with your parents. Write about it in a letter to your paternal uncle.' }
          ] },
        { title: 'Build Up Your Vocabulary: fill in the blanks (page 15)',
          rules: { kind: 'grammar', topic: 'Similes with "as ... as" (as proud as a peacock, as brave as a lion) and their meanings' },
          questions: [
          { id: 'g7ac1-v1', no: 1, label: 'Fill in the blanks.', text: 'Fill in the blanks with the right word from the brackets.',
            parts: [
              '1. The lady was as proud as a ____. (peacock/crow/dove)',
              '2. This mango is as sweet as ____. (sugar/honey)',
              '3. I wore a jacket which was as warm as ____. (wool/sun)',
              '4. The boy was as cunning as a ____. (wolf/jackal/fox)',
              '5. The colour of the car is as red as ____. (apple/blood/rose)',
              '6. She was wearing a gown as white as ____. (snow/milk/sky)',
              '7. My father was as brave as a ____. (lion/elephant/tiger)',
              '8. The child is as busy as a ____. (fly/ant/bee)',
              '9. The farmer was as gentle as a ____. (sheep/goat/lamb)',
              '10. The colour of the carpet was as green as ____. (leaves/grass/moss)',
              '11. The laddu has become as hard as ____. (stone/wood/iron)',
              '12. The progress of the work was as slow as a ____. (snail/earthworm/leech)',
              '13. The princess was as innocent as a ____. (dove/peacock/sparrow)',
              '14. After the incident the atmosphere became as silent as a ____. (statue/cemetery/grave)',
              '15. The weight of the small packet was as light as a ____. (feather/fur/cotton)',
              '16. His shirt was as black as ____. (coal/pitch)',
              '17. Rina was as cool as a ____ though under pressure. (cucumber/ice)',
              '18. The matter is as clear as ____ now. (crystal/whistle)'
            ] }
          ] }
      ]
    },
    {
      no: 3, title: 'Lesson 3: Adjectives and Direct and Indirect Speech', kind: 'Grammar',
      context: `Lesson 3 (Class 7 English textbook, Assamese medium) grammar part, notes for the AI, written in my own words. Answer in simple, correct English as a Class 7 student; for "change the narration" items give the full indirect (or direct) sentence first, then a one-line reason about the changes made.
A. Adjectives: an adjective is a word that describes a noun or a pronoun (She is a beautiful girl). Kinds:
 1. Adjectives of quality show the kind or quality of a person or thing: large, poor, rich, noble, hot, honest, cold, great (Guwahati is a large city. Raman is an honest man).
 2. Adjectives of quantity tell how much of a thing or idea there is: much, some, huge, little, any, enough, whole, sufficient (Give me a little water. There has not been sufficient rain this year). They go with uncountable nouns like water, salt, sugar and milk; "some" and "sufficient" can be used with both countable and uncountable nouns.
 3. Adjectives of number show how many persons or things, or in what order they stand: eight, first, all, many, several (Only eight students attended the meeting. She is the first girl of the class). They are of two groups: definite numeral adjectives, which are cardinals (one, two, three, four) and ordinals (first, second, third, fourth), and indefinite numeral adjectives (many, all, several), used with countable nouns like balls, pens and shirts.
 4. Proper adjectives are formed from a proper name: Asian, Chinese, French, English, African (I like Asian music. He likes French cars).
 5. Demonstrative adjectives point out which person or thing is meant: this, that, these, those, such (That volcano is active. These tributaries flow through the district of Barpeta). If the word stands alone in place of a noun it is a demonstrative pronoun; with a noun it is a demonstrative adjective.
 6. Distributive adjectives describe a person or thing separately, one at a time: each, every, either, neither (Each participant will get a certificate. Every athlete wore a blue cap).
 7. Interrogative adjectives come before a noun to ask a question: whose, which, what (Whose pen is this? What news did your father bring?).
 8. Possessive adjectives take a noun after them and show who owns it: my, our, your, his, her, their, its (This is our school. The dog wagged its tail). Used before nouns they are possessive adjectives (also called pronominal adjectives); mine, ours, yours, hers, theirs stand alone and are possessive pronouns.
 Activity 1 (page 24): "Identify the adjectives and write them separately." The items seen so far are: i) The night was warm yesterday (adjective: warm). ii) These dishes are prepared with fresh tomatoes (adjectives: These (demonstrative), fresh (quality)). For each sentence list every adjective and say its kind in brackets.
B. Direct and indirect speech: direct speech gives the exact words of the speaker in inverted commas; indirect (reported) speech tells what was said in the reporter's own words, without inverted commas and usually with "that". Rules when changing direct to indirect: (1) change in tense, (2) change of personal pronouns, (3) change of time and place words. "said to" becomes "told" (Monali said to her mother -> Monali told her mother).
 - If the reporting verb is in the present or future tense (says, will say) the tense of the speech does not change: Rohit says, "I am always busy." -> Rohit says that he is always busy.
 - If the reporting verb is in the past tense (said, told), the tense changes one step back: simple present -> simple past; present continuous -> past continuous; present perfect -> past perfect; present perfect continuous -> past perfect continuous; simple past -> past perfect; past continuous -> past perfect continuous; past perfect and past perfect continuous stay the same; will / shall -> would / should; may -> might; can -> could.
 - Change of time and place words: this -> that; these -> those; now -> then; thus -> so; today -> that day; tonight -> that night; yesterday -> the day before / the previous day; tomorrow -> the next day / the following day; last week -> the week before / the previous week; last year -> the year before / the previous year; ago -> before; next week -> the following week; next year -> the following year.
 - Pronouns change according to the speaker and the person spoken to: first person (I, we, my, our) follows the subject of "said"; second person (you, your) follows the person spoken to; third person usually stays the same.
 - Exception: the present tense of the reported speech does not change when it states a universal truth, a scientific fact, a proverb, a habitual action or something which still exists (He said, "Water boils at 100 degrees Celsius." -> He said that water boils at 100 degrees Celsius).
 - Activity 3 (page 28 to 29): change the narration of ten sentences, for example i) Sankar said to me, "I have lost my pen." -> Sankar told me that he had lost his pen. ii) Runa said, "My brother likes chocolates." -> Runa said that her brother liked chocolates (a habit is also acceptable as "likes"). iii) I said to her, "I visited Jaipur last year." -> I told her that I had visited Jaipur the year before. iv) Sristijeeta said, "I get up at 6 o'clock in the morning." -> Sristijeeta said that she got up at 6 o'clock in the morning. v) They said to us, "We will play a match today in the school playground." -> They told us that they would play a match that day in the school playground. vi) Mr. Bora said to me, "I have been learning the violin for two years." -> Mr. Bora told me that he had been learning the violin for two years. vii) My mother said, "You must do your homework." -> My mother said that I must do my homework (must stays as it is, or "had to"). viii) Rashmi said to me, "I shall meet Kangkana tomorrow." -> Rashmi told me that she would meet Kangkana the next day. ix) Joya said, "My mother cooks very well." -> Joya said that her mother cooks (or cooked) very well. x) The teacher said, "Water flows downward." -> The teacher said that water flows downward (a universal truth stays in the present tense).
 - Page 25 of the book (Activity 1 items iii onwards, the first part of "B. Direct and Indirect Speech" and Activity 2) has not been added yet.
C. Phrasal verbs: break up = (of a school) close for holidays or end: Our school breaks up at 3 p.m.; break down = fail or collapse (of health, a machine): His health broke down by hard work; carry on = continue: He will carry on his father's business; come about = happen: How did the accident come about?
D. Idioms: a red alert = a warning of serious danger: On the forecast of a cyclone, a red alert was notified on the coastal area; a square peg in a round hole = a person who does not fit in a place or job: The new student felt himself like a square peg in a round hole; all of a sudden = suddenly: All of a sudden they could see a deer coming out of the bush in the jungle.`,
      sections: [
        { title: 'A. Adjectives: Activity 1, identify the adjectives and write them separately (page 24, items i and ii; the rest is on page 25)',
          rules: { kind: 'grammar', topic: 'Adjectives and their kinds: quality, quantity, number, proper, demonstrative, distributive, interrogative and possessive adjectives' },
          questions: [
          { id: 'g7ac3-a1', no: 1, label: 'Activity 1.', text: 'Identify the adjectives and write them separately.',
            parts: [
              'i) The night was warm yesterday.',
              'ii) These dishes are prepared with fresh tomatoes.'
            ] }
          ] },
        { title: 'B. Direct and Indirect Speech: Activity 3, change the form of narration (pages 28 and 29)',
          rules: { kind: 'grammar', topic: 'Direct and indirect speech: changes in tense, personal pronouns, time and place words, and the exceptions (universal truth, scientific fact, proverb, habitual action)' },
          questions: [
          { id: 'g7ac3-a3', no: 3, label: 'Activity 3.', text: 'Change the form of narration of the following.',
            parts: [
              'i) Sankar said to me, "I have lost my pen."',
              'ii) Runa said, "My brother likes chocolates."',
              'iii) I said to her, "I visited Jaipur last year."',
              "iv) Sristijeeta said, \"I get up at 6 o'clock in the morning.\"",
              'v) They said to us, "We will play a match today in the school playground."',
              'vi) Mr. Bora said to me, "I have been learning the violin for two years."',
              'vii) My mother said, "You must do your homework."',
              'viii) Rashmi said to me, "I shall meet Kangkana tomorrow."',
              'ix) Joya said, "My mother cooks very well."',
              'x) The teacher said, "Water flows downward."'
            ] }
          ] }
      ]
    }
  ]
};
