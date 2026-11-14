// Class 10 Social Science, SEBA, Assamese medium. Question ids start with s10c<chapter>- so they never clash with other courses.
// `context` on a chapter is hidden from students and only sent to the AI (chapter notes and model answers, in Assamese).
// Chapter 1 = History: Partition of Bengal and Swadeshi Movement (textbook exercise, pages 20-21).
// VERIFY against the textbook photos (textbook wording wins):
//  - Very short Q4 (Rakhi Bandhan): the wording was unclear in the photo; the answer used is Rabindranath Tagore.
//  - Very short Q5: year 1906 is sure; the exact day differs by source (11 March constituted, 14/15 August college opened).
//  - Very short Q8: reunification announced 12 Dec 1911 (Delhi Durbar), came into effect in 1912.
//  - Short Q1: wording partly unclear; answer = Dhaka, Chittagong and Rajshahi divisions (with Malda district).
const Q = (id, no, text, extra = {}) => ({ id, no, text, ...extra });
const sec = (title, video, qs) => ({ title, questions: qs.map(q => ({ video, ...q })) });

module.exports = {
  id: 'c10-social',
  subject: 'Social Science',
  class: 10,
  medium: 'Assamese',
  sourceLang: 'Assamese',   // answers are Assamese: the translate menu offers English / Hinglish / Bengali
  chapters: [
    {
      no: 1, title: 'বংগ বিভাজন আৰু স্বদেশী আন্দোলন (Partition of Bengal and Swadeshi Movement)', kind: 'ইতিহাস (History)',
      context: `Chapter notes (SEBA Class 10 Social Science, History, Chapter 1: Partition of Bengal and Swadeshi Movement; exercise on textbook pages 20-21). Write every answer in simple Assamese (Assamese script), exam-friendly: 1 mark = one line, 2 to 3 marks = 3 to 5 lines, 4 to 5 marks = short structured points. Do not add facts that are not listed here.
Key facts: Partition of Bengal was announced in July 1905 by Viceroy Lord Curzon and came into effect on 16 October 1905. It created Eastern Bengal and Assam (capital Dhaka; Dhaka, Chittagong and Rajshahi divisions with Malda district and Assam) and the rest of Bengal (capital Calcutta, with Bihar and Orissa). Official reason: Bengal was too big to administer. Real aim: weaken Bengali nationalism and divide Hindus and Muslims (divide and rule). The resolution to boycott foreign goods was passed on 7 August 1905 at a meeting in the Town Hall, Calcutta. On 16 October 1905 Rabindranath Tagore led Rakhi Bandhan to show Hindu-Muslim unity. The movement is called Swadeshi because it asked people to use goods made in their own country (swa = own, desh = country) and to boycott foreign goods. National Council of Education set up in 1906 (Bengal National College, Aurobindo Ghose first principal). Industry: Bengal Chemical and Pharmaceutical Works (Acharya Prafulla Chandra Ray), swadeshi cotton mills, handloom, soap and pottery works, swadeshi stores. Repression: Carlyle circular against students, bans on meetings and slogans, Seditious Meetings Act (1907), Newspapers (Incitement to Offences) Act (1908), Indian Press Act (1910), arrest and deportation of leaders. At the 1906 Calcutta session of the Indian National Congress, presided over by Dadabhai Naoroji, the goal of Swaraj was adopted; in 1907 at Surat the Congress split into Moderates and Extremists. Muslim League was founded at Dhaka in December 1906 with Nawab Salimullah's lead. Partition was annulled in 1911 (announced at the Delhi Durbar on 12 December 1911; capital moved from Calcutta to Delhi); Assam became a separate Chief Commissioner's province in 1912.
Model answers (Assamese):
Very short 1: বঙ্গ বিভাজন ভাইচৰয় লৰ্ড কাৰ্জনৰ শাসনকালত সংঘটিত হৈছিল।
Very short 2: ১৯০৫ খ্ৰীষ্টাব্দৰ ১৬ অক্টোবৰ তাৰিখে বঙ্গ বিভাজন কাৰ্যকৰী হৈছিল।
Very short 3: ১৯০৫ খ্ৰীষ্টাব্দৰ ৭ আগষ্ট তাৰিখে কলিকতাৰ টাউন হলত অনুষ্ঠিত সভাত বিদেশী পণ্য বৰ্জনৰ প্ৰস্তাৱ গ্ৰহণ কৰা হৈছিল।
Very short 4: ১৯০৫ খ্ৰীষ্টাব্দৰ ১৬ অক্টোবৰ তাৰিখে কবিগুৰু ৰবীন্দ্ৰনাথ ঠাকুৰে হিন্দু-মুছলমানৰ ঐক্যৰ প্ৰতীক হিচাপে 'ৰাখীবন্ধন' অনুষ্ঠান কৰিছিল।
Very short 5: ১৯০৬ খ্ৰীষ্টাব্দত জাতীয় শিক্ষা পৰিষদ গঠন কৰা হৈছিল।
Very short 6: আচাৰ্য প্ৰফুল্লচন্দ্ৰ ৰায় 'বেংগল কেমিকেল' প্ৰতিষ্ঠাৰ প্ৰধান উদ্যোক্তা আছিল।
Very short 7: দাদাভাই নৌৰজীৰ পৌৰোহিত্যত ১৯০৬ খ্ৰীষ্টাব্দৰ কলিকতা অধিবেশনত 'স্বৰাজ'ৰ প্ৰস্তাৱ গ্ৰহণ কৰা হৈছিল।
Very short 8: ১৯১১ খ্ৰীষ্টাব্দত বঙ্গ বিভাজন ৰদ কৰি বঙ্গদেশৰ একত্ৰীকৰণ কৰা হৈছিল।
Short 1: বঙ্গ বিভাজনৰ ফলত সৃষ্টি হোৱা 'পূৰ্ববংগ আৰু অসম' প্ৰদেশৰ লগত বঙ্গদেশৰ ঢাকা, চট্টগ্ৰাম আৰু ৰাজশাহী — এই তিনিটা প্ৰধান অংশ (বিভাগ) সংযুক্ত হৈছিল। ঢাকা আছিল নতুন প্ৰদেশৰ ৰাজধানী।
Short 2: বঙ্গ বিভাজনৰ প্ৰকাশ্য কাৰণ আছিল প্ৰশাসনিক সুবিধা, কাৰণ বংগ প্ৰদেশ অতি ডাঙৰ আছিল। কিন্তু ইয়াৰ অন্তৰ্নিহিত উদ্দেশ্য আছিল— (১) বংগদেশত গঢ় লৈ উঠা জাতীয়তাবাদী আন্দোলনক দুৰ্বল কৰা, (২) পূৱ বংগৰ মুছলমান আৰু পশ্চিম বংগৰ হিন্দুৰ মাজত বিভেদ সৃষ্টি কৰা, আৰু (৩) 'বিভাজন কৰা আৰু শাসন কৰা' নীতি প্ৰয়োগ কৰা।
Short 3: বঙ্গ বিভাজনৰ বিৰোধত বিদেশী (ব্ৰিটিছ) পণ্য বৰ্জন কৰি 'স্বদেশ'ত (নিজ দেশত) প্ৰস্তুত সামগ্ৰী ব্যৱহাৰৰ ওপৰত গুৰুত্ব দিয়া হৈছিল। 'স্ব' মানে নিজ আৰু 'দেশ' মানে দেশ। সেয়ে আন্দোলনটোৰ নাম 'স্বদেশী আন্দোলন' হৈছিল।
Short 4: (১) ব্ৰিটিছ শিক্ষা ব্যৱস্থাই কেৰাণী তৈয়াৰ কৰিছিল আৰু ভাৰতীয় ভাষা, সংস্কৃতিৰ স্থান নাছিল। (২) আন্দোলনত অংশ লোৱা ছাত্ৰক চৰকাৰী বিদ্যালয়ৰ পৰা বহিষ্কাৰ কৰা হৈছিল, সিহঁতৰ বাবে বিকল্প শিক্ষাৰ প্ৰয়োজন হৈছিল। (৩) ১৯০৬ খ্ৰীষ্টাব্দত জাতীয় শিক্ষা পৰিষদ গঠন কৰি জাতীয় নিয়ন্ত্ৰণত সাহিত্য, বিজ্ঞান আৰু কাৰিকৰী শিক্ষাৰ ব্যৱস্থা কৰা হ'ল; বংগীয় জাতীয় মহাবিদ্যালয়ৰ প্ৰথম অধ্যক্ষ আছিল অৰবিন্দ ঘোষ। (৪) এই শিক্ষাই দেশপ্ৰেম আৰু আত্মনিৰ্ভৰতা গঢ়ি তুলিছিল।
Short 5: (১) বিদেশী পণ্য বৰ্জনৰ ফলত দেশীয় সামগ্ৰীৰ চাহিদা বাঢ়িছিল। (২) আচাৰ্য প্ৰফুল্লচন্দ্ৰ ৰায়ে 'বেংগল কেমিকেল এণ্ড ফাৰ্মাচিউটিকেল ৱৰ্কছ' বিকশিত কৰিছিল। (৩) স্বদেশী কাপোৰ কল, তাঁত আৰু হস্তশিল্প, চাবোন আৰু ছিৰামিক কাৰখানা, স্বদেশী ভাণ্ডাৰ গঢ়ি উঠিছিল। (৪) মূলধনৰ অভাৱ আৰু ব্ৰিটিছ প্ৰতিযোগিতাৰ বাবে বহুতো প্ৰতিষ্ঠান বেছিদিন নটিকিল, তথাপি ই আত্মনিৰ্ভৰতাৰ ভেটি স্থাপন কৰিছিল।
Short 6: (১) আন্দোলনত অংশ লোৱা ছাত্ৰক শাস্তি দিয়া হৈছিল আৰু কাৰ্লাইল চাৰ্কুলাৰ জাৰি কৰা হৈছিল। (২) সভা-সমিতি আৰু 'বন্দেমাতৰম্' ধ্বনিত বাধা দিয়া হৈছিল। (৩) বিদ্ৰোহাত্মক সভা আইন (১৯০৭), সংবাদপত্ৰ আইন (১৯০৮) আৰু ভাৰতীয় মুদ্ৰণ আইন (১৯১০) প্ৰণয়ন কৰা হৈছিল। (৪) নেতাসকলক গ্ৰেপ্তাৰ আৰু নিৰ্বাসন দিয়া হৈছিল। (৫) মুছলমানক আন্দোলনৰ পৰা আঁতৰাবলৈ বিভেদৰ নীতি লোৱা হৈছিল।
Short 7: (১) জাতীয়তাবাদী চেতনাৰ বিকাশ হৈছিল আৰু ছাত্ৰ, মহিলাকে ধৰি সকলো শ্ৰেণীৰ মানুহে আন্দোলনত অংশ লৈছিল। (২) স্বদেশী শিল্প আৰু আত্মনিৰ্ভৰতাৰ বিকাশ হৈছিল। (৩) জাতীয় শিক্ষাৰ আৰম্ভণি হৈছিল। (বৰ্জন আৰু নিষ্ক্ৰিয় প্ৰতিৰোধৰ পদ্ধতি পাছৰ আন্দোলনৰ বাবে আদৰ্শ হৈছিল; ১৯১১ত বঙ্গ বিভাজন ৰদ হৈছিল।)
Note 1 (Rabindranath Tagore): ৰবীন্দ্ৰনাথ ঠাকুৰ (১৮৬১–১৯৪১) কবি, ঔপন্যাসিক, গীতিকাৰ আৰু শিক্ষাবিদ; 'কবিগুৰু' নামেৰে জনাজাত। ১৯১৩ চনত 'গীতাঞ্জলি'ৰ বাবে সাহিত্যত নোবেল বঁটা লাভ কৰে। স্বদেশী আন্দোলনত ১৬ অক্টোবৰ ১৯০৫ত ৰাখীবন্ধন অনুষ্ঠান কৰি হিন্দু-মুছলমানৰ ঐক্যৰ আহ্বান জনাইছিল আৰু 'আমাৰ সোণাৰ বাংলা'ৰ দৰে স্বদেশী গান ৰচনা কৰিছিল। তেওঁ শান্তিনিকেতনত বিশ্বভাৰতী প্ৰতিষ্ঠা কৰিছিল। ১৯১৯ চনত জালিয়ানৱালাবাগ হত্যাকাণ্ডৰ প্ৰতিবাদত নাইট উপাধি ত্যাগ কৰে।
Note 2 (Sister Nivedita): মাৰ্গাৰেট এলিজাবেথ নবেল (১৮৬৭–১৯১১)ৰ জন্ম আয়াৰলেণ্ডত। তেওঁ স্বামী বিবেকানন্দৰ শিষ্যা হৈ ১৮৯৮ চনত ভাৰতলৈ আহে আৰু 'ভগিনী নিবেদিতা' নাম পায়। কলিকতাত ছোৱালীৰ বাবে বিদ্যালয় স্থাপন কৰে। তেওঁ স্বদেশী আন্দোলন আৰু জাতীয় শিক্ষাক সমৰ্থন কৰিছিল আৰু ভাৰতীয় সংস্কৃতিৰ প্ৰচাৰ কৰিছিল।
Note 3 (Nawab Salimullah): ঢাকাৰ নৱাব খাজা ছলিমউল্লা (১৮৭১–১৯১৫) বঙ্গ বিভাজনৰ সমৰ্থক আছিল, কাৰণ ঢাকা নতুন প্ৰদেশৰ ৰাজধানী হ'ব বুলি তেওঁ ভাবিছিল। তেওঁ স্বদেশী আন্দোলনৰ বিৰোধিতা কৰিছিল। ১৯০৬ চনত ঢাকাত নিখিল ভাৰত মুছলিম লীগ প্ৰতিষ্ঠাত তেওঁ মুখ্য ভূমিকা লৈছিল।`,
      sections: [
        sec('অতি চুটি উত্তৰৰ প্ৰশ্ন (Very Short Answer Questions)', 'partition of bengal 1905 swadeshi movement class 10', [
          Q('s10c1-a1', 1, "বঙ্গ বিভাজন কোনগৰাকী ভাইচৰয়ৰ শাসনকালত সংঘটিত হৈছিল?"),
          Q('s10c1-a2', 2, "১৯০৫ খ্ৰীষ্টাব্দৰ কোন তাৰিখে বঙ্গ বিভাজন কাৰ্যকৰী হৈছিল?"),
          Q('s10c1-a3', 3, "বিদেশী পণ্য বৰ্জনৰ প্ৰস্তাৱ কোনখন সভাত গ্ৰহণ কৰা হৈছিল?"),
          Q('s10c1-a4', 4, "স্বদেশী আন্দোলনৰ সমৰ্থনত 'ৰাখীবন্ধন' নামৰ অনুষ্ঠান কোনে কৰিছিল?"),
          Q('s10c1-a5', 5, "বঙ্গদেশত 'জাতীয় শিক্ষা পৰিষদ' কেতিয়া গঠন কৰা হৈছিল?"),
          Q('s10c1-a6', 6, "'বেংগল কেমিকেল' প্ৰতিষ্ঠাৰ প্ৰধান উদ্যোক্তা কোন আছিল?"),
          Q('s10c1-a7', 7, "কাৰ পৌৰোহিত্যত অনুষ্ঠিত জাতীয় কংগ্ৰেছৰ অধিবেশনত 'স্বৰাজ' বিচাৰি প্ৰস্তাৱ গ্ৰহণ কৰা হৈছিল?"),
          Q('s10c1-a8', 8, "বঙ্গদেশৰ একত্ৰীকৰণ কেতিয়া হৈছিল?")
        ]),
        sec('চুটি উত্তৰৰ প্ৰশ্ন (Short Answer Questions)', 'swadeshi movement national education boycott class 10 history', [
          Q('s10c1-b1', 1, "বঙ্গ বিভাজনে সৃষ্টি কৰা 'পূৰ্ববংগ আৰু অসম' প্ৰদেশৰ সৈতে সংযুক্ত হোৱা বঙ্গদেশৰ প্ৰধান তিনিটা ভৌগোলিক অংশ উল্লেখ কৰা।"),
          Q('s10c1-b2', 2, "বঙ্গ বিভাজনৰ অন্তৰ্নিহিত উদ্দেশ্য কি আছিল? চমুকৈ লিখা।"),
          Q('s10c1-b3', 3, "বঙ্গ বিভাজনবিৰোধী আন্দোলনে 'স্বদেশী আন্দোলন' নাম কিয় পাইছিল? চমুকৈ লিখা।"),
          Q('s10c1-b4', 4, "স্বদেশী আন্দোলনত জাতীয় শিক্ষাৰ আৱশ্যকতাৰ বিষয়ে আলোচনা কৰা।"),
          Q('s10c1-b5', 5, "স্বদেশী আন্দোলনৰ সময়ছোৱাত বংগদেশৰ জাতীয় শিল্প বিকাশ কেনেদৰে ঘটিছিল?"),
          Q('s10c1-b6', 6, "স্বদেশী আন্দোলন দমন কৰাৰ উদ্দেশ্যে ব্ৰিটিছ চৰকাৰে কি কি আন্দোলনবিৰোধী কাৰ্যসূচী গ্ৰহণ কৰিছিল?"),
          Q('s10c1-b7', 7, "স্বদেশী আন্দোলনৰ তিনিটা অৱদান উল্লেখ কৰা।")
        ]),
        sec('টোকা লিখা (Write Short Notes)', 'rabindranath tagore sister nivedita nawab salimullah swadeshi', [
          Q('s10c1-c1', 1, "টোকা লিখা: কবিগুৰু ৰবীন্দ্ৰনাথ ঠাকুৰ"),
          Q('s10c1-c2', 2, "টোকা লিখা: মাৰ্গাৰেট এলিজাবেথ নবেল (ভগিনী নিবেদিতা)"),
          Q('s10c1-c3', 3, "টোকা লিখা: নৱাব ছলিমউল্লা")
        ])
      ]
    }
  ]
};
