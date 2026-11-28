// Assam Jatiya Bidyalay (AJB), Class 8 Social Science, Assamese medium. Built like the other Assamese-medium courses (Class 10 Social Science, Class 7 Maths):
// questions are shown in the app, the student taps AI Answer (or the 3-dot menu) and the AI answers from the hidden chapter `context`.
// The chapter names follow the AJB Class 8 Social Science contents list. The questions are written for practice (NOT copied from the textbook), and the `context` lists the facts the AI may use,
// so a teacher should read both against the AJB book before students rely on them. Question ids start with sj8c<chapter>- so they never clash with other courses.
// `medium` tells the app which Medium chip shows this course. `context` on a chapter is hidden from students and only sent to the AI.
const Q = (id, no, text, video) => ({ video, id, no, text });
const RULE = 'Write every answer in simple Assamese (Assamese script), exam-friendly: 1 mark = one line, 2 to 3 marks = 3 to 5 lines, calculation questions = show the steps. Do not add facts that are not listed here.';
const VSA = 'অতি চুটি উত্তৰৰ প্ৰশ্ন (Very Short Answer Questions)', SA = 'চুটি উত্তৰৰ প্ৰশ্ন (Short Answer Questions)';

module.exports = {
  id: 'c8-social-ajb',
  subject: 'Social Science',
  class: 8,
  medium: 'Assamese',
  sourceLang: 'Assamese',
  chapters: [
    {
      no: 1, title: 'মোগল প্ৰশাসন আৰু সমাজ', kind: 'ইতিহাস (History)',
      context: `Chapter notes (AJB Class 8 Social Science, History, Chapter 1: Mughal administration and society). ${RULE}
Key facts: The Mughal empire was founded by Babur. In 1526, in the First Battle of Panipat, Babur defeated Ibrahim Lodi, the Sultan of Delhi, and laid the foundation of Mughal rule in India. Akbar introduced the mansabdari system: soldiers and officers of the empire were given a mansab (rank); the bigger the mansab, the more soldiers the mansabdar had to keep and the higher his pay; a mansabdar was paid in cash or by a jagir. A province of the empire was called a subah and its governor a subahdar; Akbar first divided the empire into 12 subahs. Raja Todar Mal was Akbar's revenue minister (diwan): he had the farm land measured and fixed the revenue according to the produce, which made revenue collection orderly and reduced injustice to farmers. Akbar built Fatehpur Sikri near Agra; Buland Darwaza is a famous structure there. Shah Jahan built the Taj Mahal at Agra in memory of his wife Mumtaz Mahal, and the Red Fort (Lal Qila) at Delhi. The Mughal empire began to weaken in the later part of Aurangzeb's rule; he died in 1707, after which the rulers were weak and provinces began to become independent.`,
      sections: [
        { title: VSA, questions: [
          Q('sj8c1-a1', 1, 'মোগল সাম্ৰাজ্যৰ প্ৰতিষ্ঠাপক কোন আছিল? তেওঁ কোনখন যুদ্ধত জয়ী হৈ সাম্ৰাজ্য স্থাপন কৰিছিল?', 'babur first battle of panipat 1526 class 8'),
          Q('sj8c1-a2', 2, 'মোগল সাম্ৰাজ্যৰ প্ৰদেশক কি বোলা হৈছিল? প্ৰদেশৰ শাসনকৰ্তাক কি বোলা হৈছিল?', 'mughal empire subah subahdar akbar administration class 8'),
          Q('sj8c1-a3', 3, 'ফতেপুৰ চিক্ৰি কোনে নিৰ্মাণ কৰিছিল? ইয়াত থকা এটা বিখ্যাত নিৰ্মাণৰ নাম লিখা।', 'fatehpur sikri buland darwaza akbar'),
          Q('sj8c1-a4', 4, 'শ্বাহজাহানে নিৰ্মাণ কৰোৱা দুটা বিখ্যাত ঠাইৰ নাম লিখা।', 'shah jahan taj mahal red fort history'),
          Q('sj8c1-a5', 5, 'আওৰংজেবৰ মৃত্যু কেতিয়া হৈছিল? তাৰ পাছত মোগল সাম্ৰাজ্যৰ কি অৱস্থা হৈছিল?', 'aurangzeb death 1707 decline of mughal empire class 8')
        ] },
        { title: SA, questions: [
          Q('sj8c1-b1', 1, 'মনচবদাৰী প্ৰথা কি? এই প্ৰথা কোনে প্ৰৱৰ্তন কৰিছিল?', 'akbar mansabdari system class 8'),
          Q('sj8c1-b2', 2, 'ৰজা টোডৰমল কোন আছিল? তেওঁ কি কাম কৰিছিল?', 'raja todar mal land revenue system akbar')
        ] }
      ]
    },
    {
      no: 2, title: 'ইংৰাজ সাম্ৰাজ্যৰ সম্প্ৰসাৰণ', kind: 'ইতিহাস (History)',
      context: `Chapter notes (AJB Class 8 Social Science, History, Chapter 2: Expansion of the British empire). ${RULE}
Key facts: The East India Company was formed in England in 1600. The English came to India first to trade: Indian spices, cotton cloth and silk sold at high prices in Europe; later they interfered in Indian politics and took over kingdoms. Battle of Plassey, 1757: the English general Robert Clive defeated Siraj-ud-Daula, the Nawab of Bengal; the treachery of his commander Mir Jafar made the English victory easy. Battle of Buxar, 1764: the English defeated the joint army of Mir Qasim (Nawab of Bengal), the Nawab of Awadh and the Mughal emperor Shah Alam II; the English power grew greatly and their influence was established in Bengal, Bihar and Orissa. The Subsidiary Alliance was introduced by Lord Wellesley. Its conditions: the allied Indian ruler keeps English troops in his kingdom and pays for them; he cannot make war or treaty with another state without English permission; an English Resident stays at his court. The Doctrine of Lapse was introduced by Lord Dalhousie: if an Indian ruler had no son of his own, his kingdom was added to the English territory after his death; Satara, Jhansi and Nagpur were taken this way. The Treaty of Yandabo was signed in 1826 at the end of the First Anglo-Burmese War; the Burmese gave up their claim on Assam and Assam came under the English.`,
      sections: [
        { title: VSA, questions: [
          Q('sj8c2-a1', 1, 'ইষ্ট ইণ্ডিয়া কোম্পানী কেতিয়া গঠন হৈছিল?', 'east india company 1600 history class 8'),
          Q('sj8c2-a2', 2, 'পলাশীৰ যুদ্ধ কেতিয়া হৈছিল? এই যুদ্ধত কোনে কোনক পৰাজিত কৰিছিল?', 'battle of plassey 1757 robert clive siraj ud daula'),
          Q('sj8c2-a3', 3, 'সহায়ক মিত্ৰতা নীতি কোনে প্ৰৱৰ্তন কৰিছিল?', 'subsidiary alliance lord wellesley class 8'),
          Q('sj8c2-a4', 4, 'স্বত্ববিলোপ নীতি কোনে প্ৰৱৰ্তন কৰিছিল?', 'doctrine of lapse lord dalhousie class 8'),
          Q('sj8c2-a5', 5, 'ইয়াণ্ডাবু সন্ধি কেতিয়া হৈছিল?', 'treaty of yandabo 1826 assam')
        ] },
        { title: SA, questions: [
          Q('sj8c2-b1', 1, 'ইংৰাজসকল ভাৰতলৈ কিয় আহিছিল?', 'why did british come to india east india company'),
          Q('sj8c2-b2', 2, 'বক্সাৰৰ যুদ্ধ কেতিয়া হৈছিল? ইয়াৰ ফলাফল কি আছিল?', 'battle of buxar 1764 result class 8'),
          Q('sj8c2-b3', 3, 'সহায়ক মিত্ৰতা নীতিৰ চৰ্তবোৰ লিখা।', 'subsidiary alliance conditions wellesley'),
          Q('sj8c2-b4', 4, 'স্বত্ববিলোপ নীতি কি? ইয়াৰ দ্বাৰা কোনবোৰ ৰাজ্য ইংৰাজে দখল কৰিছিল?', 'doctrine of lapse jhansi satara nagpur'),
          Q('sj8c2-b5', 5, 'ইয়াণ্ডাবু সন্ধিৰ ফলত অসমৰ কি হৈছিল?', 'treaty of yandabo 1826 effect on assam')
        ] }
      ]
    },
    {
      no: 3, title: 'ভাৰতত প্ৰথম স্বাধীনতা সংগ্ৰাম (১৮৫৭-১৮৫৮)', kind: 'ইতিহাস (History)',
      context: `Chapter notes (AJB Class 8 Social Science, History, Chapter 3: The first freedom struggle of India, 1857-1858). ${RULE}
Key facts: The revolt of 1857 began on 10 May 1857 at Meerut (Uttar Pradesh), when the Indian sepoys of the English army rose; it then spread to Delhi, Kanpur, Lucknow, Jhansi and many other places. Immediate cause: the cartridges of the new Enfield rifle; a rumour spread that they were greased with cow and pig fat and had to be bitten with the teeth to open, and Hindu and Muslim sepoys both felt their religion was insulted. Mangal Pandey was a sepoy of the English army at Barrackpore (Bengal); on 29 March 1857 he attacked English officers and was later hanged; his act opened the way for the revolt. Leaders: Bahadur Shah Zafar at Delhi (the rebels declared him their leader), Nana Saheb at Kanpur, Rani Lakshmibai at Jhansi, Kunwar Singh in Bihar (Jagdishpur); Begum Hazrat Mahal led the revolt at Lucknow. In Assam, Maniram Dewan (Maniram Dutta Barua) and Piyoli Barua were hanged at Jorhat in 1858 on the charge of plotting against the English. Result: the rule of the East India Company ended; in 1858 the government of India passed to the Queen of England; the Governor-General began to be called Viceroy.`,
      sections: [
        { title: VSA, questions: [
          Q('sj8c3-a1', 1, '১৮৫৭ চনৰ বিদ্ৰোহ ক\'ত আৰু কেতিয়া আৰম্ভ হৈছিল?', 'revolt of 1857 meerut 10 may class 8'),
          Q('sj8c3-a2', 2, 'মংগল পাণ্ডে কোন আছিল?', 'mangal pandey barrackpore 1857'),
          Q('sj8c3-a3', 3, 'অসমত ১৮৫৭ চনৰ বিদ্ৰোহৰ লগত জড়িত দুজন বীৰৰ নাম লিখা।', 'maniram dewan piyoli barua 1857 assam')
        ] },
        { title: SA, questions: [
          Q('sj8c3-b1', 1, '১৮৫৭ চনৰ বিদ্ৰোহৰ তাৎক্ষণিক কাৰণ কি আছিল?', 'enfield rifle cartridge cause revolt 1857'),
          Q('sj8c3-b2', 2, '১৮৫৭ চনৰ বিদ্ৰোহৰ চাৰিজন নেতা বা নেত্ৰীৰ নাম আৰু তেওঁলোকৰ কৰ্মক্ষেত্ৰ লিখা।', 'leaders of 1857 revolt rani lakshmibai nana saheb kunwar singh'),
          Q('sj8c3-b3', 3, '১৮৫৭ চনৰ বিদ্ৰোহৰ পাছত ভাৰতৰ শাসনত কি পৰিৱৰ্তন আহিছিল?', 'results of revolt of 1857 viceroy queen victoria 1858')
        ] }
      ]
    },
    {
      no: 14, title: 'ভূ-আন্দোলন', kind: 'ভূগোল (Geography)',
      context: `Chapter notes (AJB Class 8 Social Science, Geography, Chapter 14: Earth movements). ${RULE}
Key facts: The changes taking place on the surface of the earth are called earth movements. They work through two kinds of forces: internal (endogenic) forces, which work inside the earth (earthquakes, volcanoes), and external (exogenic) forces, which work outside (wind, rivers, glaciers, sea waves). An earthquake is a sudden shaking of the earth's crust. The place inside the crust where the shaking starts is the focus; the place on the surface directly above the focus is the epicentre, where the damage is greatest. The strength of an earthquake is measured on the Richter scale. A volcano is an opening in the crust through which hot molten rock (lava), ash and gases come out from inside. Barren Island in the Andaman Islands has India's active volcano. The Himalaya is a young fold mountain: layers of rock folded upwards to form it; another example is the Alps of Europe. External forces work by erosion, transport and deposition: they wear down high land and lay the material in low land; two of them are rivers and wind. A plain is a wide flat low land that is usually fertile and good for farming (examples: the Ganga plain, the Brahmaputra valley). A plateau is a high land with a flat top, higher than the land around it (example: the Deccan plateau).`,
      sections: [
        { title: VSA, questions: [
          Q('sj8c14-a1', 1, 'হিমালয় কেনেধৰণৰ পৰ্বত? ইয়াৰ আন এটা উদাহৰণ দিয়া।', 'himalaya fold mountains class 8 geography'),
          Q('sj8c14-a2', 2, 'ভূমিকম্পৰ শক্তি কোনটো স্কেলেৰে জোখা হয়?', 'richter scale earthquake class 8'),
          Q('sj8c14-a3', 3, 'ভাৰতত থকা এটা সক্ৰিয় আগ্নেয়গিৰিৰ নাম লিখা।', 'barren island volcano andaman india')
        ] },
        { title: SA, questions: [
          Q('sj8c14-b1', 1, 'ভূ-আন্দোলন কাক বোলে? ইয়াৰ দুটা ভাগৰ নাম লিখা।', 'earth movements endogenic exogenic forces class 8'),
          Q('sj8c14-b2', 2, 'ভূমিকম্প কি? ইয়াৰ কেন্দ্ৰ আৰু উপকেন্দ্ৰ বুলিলে কি বুজা?', 'earthquake focus epicentre class 8'),
          Q('sj8c14-b3', 3, 'আগ্নেয়গিৰি কি?', 'volcano how it erupts class 8 geography'),
          Q('sj8c14-b4', 4, 'বাহ্যিক বলৰ কাম কি? দুটা বাহ্যিক বলৰ নাম লিখা।', 'exogenic forces erosion deposition class 8'),
          Q('sj8c14-b5', 5, 'সমভূমি আৰু মালভূমিৰ মাজৰ পাৰ্থক্য লিখা। প্ৰতিটোৰ এটাকৈ উদাহৰণ দিয়া।', 'plains and plateaus difference class 8')
        ] }
      ]
    },
    {
      no: 17, title: 'সময় গণনা — স্থানীয় সময়, মান সময় আৰু আন্তৰ্জাতিক তাৰিখ ৰেখা', kind: 'ভূগোল (Geography)',
      context: `Chapter notes (AJB Class 8 Social Science, Geography, Chapter 17: Time, local time, standard time and the International Date Line). ${RULE}
Key facts: The prime meridian is the line of longitude with value 0 degrees; it passes through Greenwich near London, so it is also called the Greenwich line. The earth turns 360 degrees in 24 hours, so it turns 15 degrees in 1 hour: 1 hour = 15 degrees of longitude, and 1 degree of longitude = 4 minutes of time. Local time of a place: the time counted by taking the moment the sun is exactly overhead as 12 noon; places further east have the sun earlier, so their local time is ahead of places to the west. Standard time: the local time of one chosen line of longitude passing through a country is used as the single time for the whole country. India's standard time is based on 82 degrees 30 minutes east (82.5 degrees E). Indian Standard Time is ahead of Greenwich time: 82.5 x 4 = 330 minutes = 5 hours 30 minutes. So when it is 12 noon at Greenwich it is 5:30 in the evening in India. For a place east of Greenwich, time = Greenwich time + (longitude x 4 minutes); a place at 90 degrees E is 90 x 4 = 360 minutes = 6 hours ahead, so when it is 12 noon at Greenwich it is 6 in the evening there. The International Date Line is an imaginary line along about 180 degrees longitude over the Pacific Ocean. Crossing it going east (west to east), count one day less (the earlier day); crossing it going west (east to west), count one day more (the later day).`,
      sections: [
        { title: VSA, questions: [
          Q('sj8c17-a1', 1, 'মূল দ্ৰাঘিমা ৰেখা (প্ৰাইম মেৰিডিয়ান) কাক বোলে? ই কোন ঠাইৰ ওপৰেদি পাৰ হৈছে?', 'prime meridian greenwich longitude class 8'),
          Q('sj8c17-a2', 2, 'এক ঘণ্টাত পৃথিৱীয়ে কিমান ডিগ্ৰী ঘূৰে? ১° দ্ৰাঘিমাত সময়ৰ পাৰ্থক্য কিমান?', 'longitude and time 15 degrees one hour class 8'),
          Q('sj8c17-a3', 3, 'ভাৰতৰ মান সময় কোনটো দ্ৰাঘিমাৰ ওপৰত আধাৰিত?', 'indian standard time 82.5 east mirzapur'),
          Q('sj8c17-a4', 4, 'গ্ৰীনিচত দুপৰীয়া ১২ বজা হ\'লে ভাৰতত কিমান বাজিব?', 'indian standard time and greenwich time difference')
        ] },
        { title: SA, questions: [
          Q('sj8c17-b1', 1, 'স্থানীয় সময় কাক বোলে?', 'local time and standard time class 8 geography'),
          Q('sj8c17-b2', 2, 'মান সময় (Standard Time) কাক বোলে? ইয়াৰ প্ৰয়োজনীয়তা কি?', 'standard time meaning class 8 geography'),
          Q('sj8c17-b3', 3, 'ভাৰতৰ মান সময় গ্ৰীনিচ সময়তকৈ কিমান আগত? হিচাপ কৰি দেখুওৱা।', 'how to calculate indian standard time from longitude'),
          Q('sj8c17-b4', 4, 'এটা ঠাইৰ দ্ৰাঘিমা ৯০° পূব। গ্ৰীনিচত দুপৰীয়া ১২ বজা হ\'লে সেই ঠাইত স্থানীয় সময় কিমান হ\'ব?', 'time calculation from longitude class 8 example'),
          Q('sj8c17-b5', 5, 'আন্তৰ্জাতিক তাৰিখ ৰেখা কি? ইয়াক পাৰ হ\'লে তাৰিখৰ কি পৰিৱৰ্তন হয়?', 'international date line explained class 8')
        ] }
      ]
    }
  ]
};
