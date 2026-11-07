// Class 6 Assamese (English medium, Nashib Ali Academy). Question ids start with as6c<chapter>- so they never clash with other courses.
// `context` on a chapter is hidden from students and only sent to the AI. It holds notes written in our own words, never the poem text.
// Chapters with `locked: true` (and no sections) show a lock in the index until their questions are added.
module.exports = {
  id: 'c6-assamese',
  subject: 'Assamese',
  class: 6,
  chapters: [
    {
      no: 1, title: 'বিহু আদৰণি', kind: 'পদ্য (Poem)', author: 'মিত্ৰদেৱ মহন্ত',
      context: `Lesson 1 "বিহু আদৰণি" (Bihu welcome), a poem by Mitradev Mahanta (মিত্ৰদেৱ মহন্ত). Notes for the AI, written in our own words. Do not recite the poem. Answer in simple Assamese.

Main idea: a speaker full of joy gets ready to welcome Rongali (Bohag) Bihu. He talks to the month Chot (চ'ত) as if it were a person and asks it to blow the pepa (buffalo-horn pipe) and bring Rongali Bihu along. He stands at the front gate, looks down the road and says he cannot wait much longer. Meanwhile everyone in the family is busy with their own preparation. At the end he begs Chot not to delay and to come with Bihu.

Stanza gist (reading of the poem, in our words; if a question asks for exact items, give the main ones below):
1. He calls Chot, asks it to blow the pepa and bring Bihu, and says he is looking at the road from the gate, waiting.
2. The speaker himself gathers the Bihu plants: jetuka, thereju and borhomothuri; leaves of makhiyoti; tora (used for ropes). He puts the aowla (front eave) in order. He also brings turmeric (হালধি), thekera and brinjal (বেঙেনা) and makes a bamboo item (চাট).
3. He tunes and readies the dhol, toka and pepa, and sweeps the courtyard and the path.
4. Mother weaves a gamosa (শালৰ গামোচা) with a flower border (ভমকা ফুল).
5. Elder sister gets a kopou flower (foxtail orchid) ready for her hair bun.
6. Father brings a branch with broad leaves.
7. Aunt (খুৰী) prepares sesame and jaggery for the Bihu pithas.
8. Grandmother (আইতা) cleans and puts vermilion at the front of the thapona (prayer corner).

Answer keys for the exercise:
- Q2: the poet calls the month Chot (চ'ত) as "Chotai".
- Q3: he asks Chot to blow the pepa and bring Rongali Bihu.
- Q4: he waits at the gate for Rongali Bihu (the Bihu festival) to come.
- Q5: use stanza gist above, one answer per person: (ক) the poet himself, (খ) mother, (গ) elder sister, (ঘ) father, (ঙ) aunt, (চ) grandmother.
- Q6 musical instruments used in Bihu: pepa, dhol, toka (the poem names these; gogona and taal are also Bihu instruments in general).
- Q7 and Q8 (why these plants and items are needed): general Assamese tradition, not stated in the poem lines. On Goru Bihu, the first day of Bohag, cattle are bathed and rubbed with turmeric and black gram paste, touched with plants like makhiyoti and dighalati, fed vegetables such as gourd and brinjal, and tied with new ropes made from stems like tora. People believe this keeps cattle healthy and protects them from biting insects. Jetuka is a plant known for dyeing hands and nails, used to decorate for Bihu. Say these in simple words and link to welcoming Bihu.

Word meanings (own words): চ'তাই = the month Chot (Assamese month before Bohag); থেৰেজু = a tall tree with an unfamiliar fruit that looks like a jujube; বৰ্হমথুৰি = a tall tree with bunches of long leaves; মাখিয়তী = a small wild plant, believed to keep gadflies and mosquitoes away from cattle; তৰা = a forest plant with long stems and leaves, used to make rope; আওলা = the part of a roof that sticks out in front of the house; ৰচঙ্গা = ৰঙচুৰা (a colourful flower); খোলা = a broken piece of an earthen pot; সুগৰ = tuned. The meaning of চাট is not clear in these notes: do not guess it.

Grammar note (our words): a word is a letter or group of letters with a meaning. Breaking a word into its vowel and consonant letters one by one is called বৰ্ণ-বিন্যাস. Book example: পৰিষ্কাৰ = প্ + অ + ৰ্ + ই + ষ্ + ক্ + আ + ৰ. Follow this style: write each consonant with a halant (্) unless a vowel sound follows it; write every pronounced vowel as its own letter (the inherent অ is written when it is pronounced); the last consonant is written without a halant. Show the answer in this form and check your breakdown by joining the letters back into the word.

About the poet: Mitradev Mahanta was born in 1894 at Jorhat. He was a writer, playwright and song-writer, worked as a teacher and later headmaster of Golaghat High School (retired 1950), and later became satradhikar of Letugram Satra. He wrote many books, some for school, and died in 1983.`,
      sections: [
        { title: 'ক্ৰিয়া-কলাপ (pages 4-5)', questions: [
          { id: 'as6c1-1', no: 1, label: '1.', text: 'কবিতাটিৰ সাৰাংশ লিখা।' },
          { id: 'as6c1-2', no: 2, label: '2.', text: "কবিয়ে চ'তাই বুলি কাক সম্বোধন কৰিছে?" },
          { id: 'as6c1-3', no: 3, label: '3.', text: "কবিয়ে চ'তাইক কি কৰিবলৈ অনুৰোধ কৰিছে?" },
          { id: 'as6c1-4', no: 4, label: '4.', text: 'কবিয়ে পদূলিমুখত কাৰ কাৰণে বাট চাই থকাৰ কথা কৈছে?' },
          { id: 'as6c1-5', no: 5, label: '5.', text: '(ক) বিহুক আদৰিবৰ কাৰণে কবিয়ে নিজে কি কি কৰিছে?',
            parts: ['(খ) কবিৰ মাকে কি কি কৰিছে?', '(গ) কবিৰ বায়েকে কি কি কৰিছে?', '(ঘ) কবিৰ দেউতাকে কি কি কৰিছে?', '(ঙ) কবিৰ খুৰীয়েকে কি কি কৰিছে?', '(চ) কবিৰ আইতাকে কি কি কৰিছে?'] },
          { id: 'as6c1-6', no: 6, label: '6.', text: 'বিহুত ব্যৱহাৰ কৰা কেইবিধমান বাদ্যযন্ত্ৰৰ নাম লিখা।' },
          { id: 'as6c1-7', no: 7, label: '7.', text: 'কবিয়ে জেতুকা, থেৰেজু আৰু বৰ্হমথুৰি যোগাৰ কৰাৰ কাৰণ কি?' },
          { id: 'as6c1-8', no: 8, label: '8.', text: 'বিহুত মাখিয়তী পাত, তৰা, হালধি, বেঙেনা, থেকেৰা আদি কিয় লাগে বাৰু?' }
        ] },
        { title: 'আখৰ-জোঁটনি (page 5)', questions: [
          { id: 'as6c1-g1', no: 1, label: '1.', text: 'তলৰ শব্দটোৰ বৰ্ণ-বিন্যাস কৰি দেখুওৱা: প্ৰকাশ' },
          { id: 'as6c1-g2', no: 2, label: '2.', text: 'তলৰ শব্দটোৰ বৰ্ণ-বিন্যাস কৰি দেখুওৱা: বিশ্বাস' },
          { id: 'as6c1-g3', no: 3, label: '3.', text: 'তলৰ শব্দটোৰ বৰ্ণ-বিন্যাস কৰি দেখুওৱা: আদৰ্শ' },
          { id: 'as6c1-g4', no: 4, label: '4.', text: 'তলৰ শব্দটোৰ বৰ্ণ-বিন্যাস কৰি দেখুওৱা: বিদ্যালয়' },
          { id: 'as6c1-g5', no: 5, label: '5.', text: 'তলৰ শব্দটোৰ বৰ্ণ-বিন্যাস কৰি দেখুওৱা: মহাশয়' },
          { id: 'as6c1-g6', no: 6, label: '6.', text: 'তলৰ শব্দটোৰ বৰ্ণ-বিন্যাস কৰি দেখুওৱা: কমণ্ডলু' }
        ] }
      ]
    },
    { no: 2, title: 'লংকাৰ সম্বাদ কি?', locked: true, sections: [] },
    { no: 3, title: 'মহৰ্ষি টলষ্টয়', locked: true, sections: [] },
    { no: 4, title: 'ভোলাৰ ভ্ৰমণ', kind: 'পদ্য (Poem)', locked: true, sections: [] },
    { no: 5, title: 'চোতাল', locked: true, sections: [] },
    { no: 6, title: 'মহোহো', locked: true, sections: [] },
    { no: 7, title: 'মঙলতিৰ মঙল', kind: 'পদ্য (Poem)', locked: true, sections: [] },
    { no: 8, title: 'ঢোঁৰা কাউৰী আৰু টিপচী চৰাই', locked: true, sections: [] },
    { no: 9, title: 'অসমৰ সত্ৰ অনুষ্ঠান', locked: true, sections: [] },
    { no: 10, title: 'ফলাফল', kind: 'পদ্য (Poem)', locked: true, sections: [] },
    { no: 11, title: 'বাথৌ', locked: true, sections: [] },
    { no: 12, title: 'বুদ্ধিয়ক টেটোন', locked: true, sections: [] },
    { no: 13, title: 'বৰপেটা', kind: 'পদ্য (Poem)', locked: true, sections: [] },
    { no: 14, title: 'পুখুৰীৰ কথা', locked: true, sections: [] },
    { no: 15, title: 'পুতলা নাচ', locked: true, sections: [] },
    { no: 16, title: 'ভীমৰ কাণ্ড', locked: true, sections: [] },
    { no: 17, title: 'দেউল', locked: true, sections: [] },
    { no: 18, title: 'পানী', locked: true, sections: [] },
    { no: 19, title: 'বৰগীত', kind: 'পদ্য (Poem)', locked: true, sections: [] }
  ]
};
