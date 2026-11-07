// Class 6 Arabic (textbook "Adarsha Arabi Path - 6", Assamese medium book), taught here in English medium.
// Question ids start with a6c<lesson>- so they never clash with other courses. A course without `medium` is English medium.
// `context` (on a chapter or a question) is hidden from students and only sent to the AI.
// Lessons with `locked: true` (and no sections) show a lock in the index until their questions are added.
const Q = (id, no, label, text, extra = {}) => ({ id, no, label, text, ...extra });

module.exports = {
  id: 'c6-arabic',
  subject: 'Arabic',
  class: 6,
  chapters: [
    {
      no: 1, title: 'The Arabic Alphabet', kind: 'Page 1',
      context: `Lesson 1: Arabic alphabet (الحروف الهجائية). Arabic is written and read from right to left. The textbook says the Arabic alphabet has 28 letters (some books count 29 by adding hamza ء).
The letters in order (name, dots): ا Alif (no dot), ب Ba (1 dot below), ت Ta (2 dots above), ث Tha (3 dots above), ج Jim (1 dot below), ح Ha (no dot), خ Kha (1 dot above), د Dal (no dot), ذ Dhal (1 dot above), ر Ra (no dot), ز Zay (1 dot above), س Sin (no dot), ش Shin (3 dots above), ص Sad (no dot), ض Dad (1 dot above), ط Ta (no dot), ظ Za (1 dot above), ع Ayn (no dot), غ Ghayn (1 dot above), ف Fa (1 dot above), ق Qaf (2 dots above), ك Kaf (no dot), ل Lam (no dot), م Mim (no dot), ن Nun (1 dot above), و Waw (no dot), ه Ha (no dot), ء Hamza (no dot), ي Ya (2 dots below).
Letters WITH dots (nuqta): ب ت ث ج خ ذ ز ش ض ظ غ ف ق ن ي. Letters WITHOUT dots: ا ح د ر س ص ط ع ك ل م و ه ء.
Letters with exactly ONE dot: ب ج (dot below) and خ ذ ز ض ظ غ ف ن (dot above). Two dots: ت ق (above), ي (below). Three dots: ث ش (above).
Look-alike groups told apart only by dots: ب ت ث, ج ح خ, د ذ, ر ز, س ش, ص ض, ط ظ, ع غ, ف ق.
Sentence in the writing practice: اللَّهُ أَكْبَرُ (Allahu Akbar) means "Allah is the Greatest". Letters: ا ل ل ه (with shaddah on the second lam) then ا ك ب ر. Alif (ا) does not join to the letter after it, so "أكبر" is written أ + كـ + بـ + ر.`,
      sections: [
        { title: 'Exercise (page 2)', questions: [
          Q('a6c1-1', 1, '1.', 'Read the Arabic letters given in the exercise grid and recognise (name) each of them.', { context: 'The exact grid of letters is printed in the textbook and is not available to you. Explain how to recognise the letters by shape and by their dots, name the main look-alike groups, and show the names of the letters as examples.' }),
          Q('a6c1-2', 2, '2.', 'Using the chart of the Arabic alphabet (Exercise 1), write the Arabic letters in their proper order.'),
          Q('a6c1-3', 3, '3.', 'Write separately the Arabic letters that have dots (nuqta) and the Arabic letters that have no dots.'),
          Q('a6c1-4', 4, '4.', 'Name the letters that have one dot.'),
          Q('a6c1-5', 5, '5.', 'Write the following sentence three times in your own handwriting: اللَّهُ أَكْبَرُ')
        ] }
      ]
    },
    {
      no: 2, title: 'Different Forms of the Arabic Letters', kind: 'Page 3',
      context: `Lesson 2: Forms of the letters (أشكال الحروف). Most Arabic letters change shape by position in a word: alone (isolated), at the start (initial), in the middle (medial), at the end (final). The textbook table has these columns: name (pronunciation), original letter, initial form (first), middle form, final form (last).
Letter names and shapes (isolated, initial, middle, final): ا Alif: ا ا ـا ـا | ب Ba: ب بـ ـبـ ـب | ت Ta: ت تـ ـتـ ـت | ث Tha: ث ثـ ـثـ ـث | ج Jim: ج جـ ـجـ ـج | ح Ha: ح حـ ـحـ ـح | خ Kha: خ خـ ـخـ ـخ | د Dal: د د ـد ـد | ذ Dhal: ذ ذ ـذ ـذ | ر Ra: ر ر ـر ـر | ز Zay: ز ز ـز ـز | س Sin: س سـ ـسـ ـس | ش Shin: ش شـ ـشـ ـش | ص Sad: ص صـ ـصـ ـص | ض Dad: ض ضـ ـضـ ـض | ط Ta: ط طـ ـطـ ـط | ظ Za: ظ ظـ ـظـ ـظ | ع Ayn: ع عـ ـعـ ـع | غ Ghayn: غ غـ ـغـ ـغ | ف Fa: ف فـ ـفـ ـف | ق Qaf: ق قـ ـقـ ـق | ك Kaf: ك كـ ـكـ ـك | ل Lam: ل لـ ـلـ ـل | م Mim: م مـ ـمـ ـم | ن Nun: ن نـ ـنـ ـن | و Waw: و و ـو ـو | ه Ha: ه هـ ـهـ ـه | ء Hamza: written alone | لا Lam-Alif: لا, joins to the letter before it as ـلا | ي Ya: ي يـ ـيـ ـي.
Six letters (ا د ذ ر ز و) join to the letter before them but never to the letter after them, so the letter after them starts a fresh joined group. Lam-Alif (لا) is a ligature (lam joined with alif). Example of joining letters: ب + ن + ت = بنت (bint, girl).`,
      sections: [
        { title: 'Exercise (page 5)', questions: [
          Q('a6c2-1', 1, '1.', 'Show the different shapes (initial, middle and final forms) used in different positions for the letters listed in the textbook exercise.', { context: 'The exact list of letters is printed in the textbook and is not available to you. Explain the method in 2 to 4 steps and show the shapes for three example letters of your own (for example ب, ع, م).' }),
          Q('a6c2-2', 2, '2.', 'Mention the shapes of the given letters as they are used in the middle of a word, as shown in the example in the textbook.', { context: 'The exact letters and example are printed in the textbook and are not available to you. Explain the method and give two or three examples of your own, showing the middle shape of each letter.' }),
          Q('a6c2-3', 3, '3.', 'Join the following letters (written separately) to make words.', { context: 'The exact letter groups are printed in the textbook and are not available to you. Explain how to join separate letters into a word (remember the six non-joining letters ا د ذ ر ز و) and show two or three examples of your own.' }),
          Q('a6c2-4', 4, '4.', 'Break the following words into separate letters.', { context: 'The exact words are printed in the textbook and are not available to you. Explain how to break a word into letters and show two or three examples of your own, for example بنت = ب + ن + ت.' })
        ] }
      ]
    },
    { no: 3, title: 'Vowel Marks - 1', kind: 'Page 6', locked: true, sections: [] },
    { no: 4, title: 'Vowel Marks - 2', kind: 'Page 10', locked: true, sections: [] },
    { no: 5, title: 'Noun, Verb and Particle Words', kind: 'Page 12', locked: true, sections: [] },
    { no: 6, title: 'Use of Demonstrative Pronouns', kind: 'Page 17', locked: true, sections: [] },
    { no: 7, title: "Use of 'Al' (ال)", kind: 'Page 20', locked: true, sections: [] },
    { no: 8, title: 'Sentence Formation', kind: 'Page 22', locked: true, sections: [] },
    { no: 9, title: 'Pronouns (الضمير)', kind: 'Page 24', locked: true, sections: [] },
    { no: 10, title: 'A Dialogue Between Two Friends (حوار بين صديقان)', kind: 'Page 29', locked: true, sections: [] },
    { no: 11, title: 'A Prayer to Allah (دعاء إلى الله)', kind: 'Page 32', locked: true, sections: [] },
    { no: 12, title: 'Our School (مدرستنا)', kind: 'Page 35', locked: true, sections: [] },
    { no: 13, title: 'Lesson 13 (ملكي)', kind: 'Page 37', locked: true, sections: [] },
    { no: 14, title: 'Masnun Duas (Daily Supplications)', kind: 'Page 39', locked: true, sections: [] }
  ]
};
