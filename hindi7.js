// Class 7 Hindi (textbook used at Halimon Nessa Academy, Assamese medium). Question ids start with h7c<chapter>- so they never clash with other courses.
// `sourceLang: 'Hindi'` tells the app that the lesson and the AI answers are in Hindi (translation goes to English / Assamese / Bengali).
// `context` on a chapter is hidden from students and only sent to the AI (a summary of the lesson in English with Hindi words; the lesson text itself is not stored here).
// Only the exercises अभ्यास-माला of a chapter are added (question numbers are the book's own). Chapters 3-16 are listed by name only (locked: true, no sections) until their exercises are added.
// A question with `parts` shows its items (i, ii, ...) one under another; the matching question (Chapter 2, Q4) has the two columns as two items.
module.exports = {
  id: 'c7-hindi',
  subject: 'Hindi',
  class: 7,
  medium: 'Assamese',
  sourceLang: 'Hindi',
  chapters: [
    {
      no: 1, title: 'हम प्रभात की नई किरण हैं', kind: 'Poem', author: "रामधारी सिंह 'दिनकर'",
      words: [
        ['आलोक', 'प्रकाश'],
        ['अचल', 'नहीं डिगनेवाला'],
        ['सुरभि', 'सुगंध'],
        ['वीर-प्रसू', 'वीरों को जन्म देनेवाली'],
        ['नवल', 'नया'],
        ['प्रहरी', 'पहरेदार'],
        ['धरणी', 'पृथ्वी'],
        ['जुल्मी', 'अत्याचारी']
      ],
      context: `Lesson 1 "हम प्रभात की नई किरण हैं" (Hum Prabhat ki Nai Kiran Hain), a poem by रामधारी सिंह 'दिनकर' (Ramdhari Singh Dinkar). Notes for the AI (a summary, not the poem text):
- The children of the country are the new rays of the morning, the fresh light of the day, the soldiers of new India: calm (dhir), brave (vir), serious (gambhir) and unshakeable (achal).
- They are the guards of the high Himalayas (himgiri) and breathe the fragrance of heaven (the pure, holy air of the mountain; "swarg ki surabhi" means the heavenly sweetness and honour of guarding the motherland).
- They are the messengers of peace (shantidoot) of the earth who give shade to all, the new light in the eyes of the mother who gives birth to heroes (veer-prasu maa), and the protectors of the Ganga, the Yamuna and the Indian Ocean (the whole country).
- Like Shivaji and (Maharana) Pratap they will eat dry grass rotis if they must, but they will never bow their heads before any tyrant (zulmi). Pratap = Maharana Pratap of Mewar, who fought the Mughals and lived in the forest eating grass rotis; Shiva = Chhatrapati Shivaji, the Maratha king, who built his own rule with courage and clever planning. From them we learn self-respect, courage, patriotism and never accepting injustice.
- Main purpose / message: to encourage the new generation (boys and girls) to become brave, disciplined and patriotic and to protect the honour (garima) of the country; the poet encourages the young children and soldiers.
- Poet: Ramdhari Singh Dinkar (1908 to 1974), a famous Hindi poet of Bihar, called Rashtrakavi (national poet); works include Rashmirathi, Kurukshetra, Urvashi and Parashuram ki Pratiksha. His poems are full of patriotism and heroism.
- Word meanings (textbook): alok = prakash; achal = nahin diganewala (unmoving); surabhi = sugandh; veer-prasu = veeron ko janm denewali; naval = naya; prahari = pahredar; dharani = prithvi; zulmi = atyachari.
Language study notes: adjectives (visheshan) such as navin, gambhir, veer, dhir tell the quality, fault or condition of a noun, so they are called visheshan. In Q5 the pairs of words sound alike but have different meanings: din (day) / deen (poor, humble); aviram (without a break, continuous) / abhiram (beautiful, pleasing); kamal (lotus) / kalam (pen); ank (number, also lap) / ang (part of the body, limb). Q7 asks synonyms: prabhat = savera, subah, bhor; dharani = prithvi, dharti, bhumi; himgiri = himalay, parvat; rakhwala = rakshak, pahredar; kiran = rashmi, prakash; prahari = pahredar, santri. Write full-sentence answers in simple Hindi in the Devanagari script.`,
      sections: [
        { title: 'পঠন-বোধ / Reading comprehension (Assamese summary)',
          questions: [
          { id: 'h7c1-r1', no: 1, label: 'পঠন-বোধ', text: 'নিচৰ সাৰাংশটো (অসমীয়াত) মন দি পঢ়া আৰু তলৰ প্ৰশ্নবোৰৰ উত্তৰ হিন্দীত লিখো :',
            parts: [
              "সাৰাংশ : এই কবিতাত কবিয়ে দেশৰ ল'ৰা-ছোৱালীবোৰক ভোৰৰ নতুন পোহৰৰ কিৰণ বুলি কৈছে। তেওঁৰ মতে আমি নতুন ভাৰতৰ সৈনিক—ধীৰ, সাহসী, গম্ভীৰ আৰু অটল। আমি হিমালয়ৰ পহৰীদাৰ, পৃথিৱীৰ শান্তিৰ দূত আৰু বীৰ-জননী মাকৰ চকুৰ নতুন পোহৰ। গংগা, যমুনা আৰু ভাৰত মহাসাগৰৰ ৰক্ষকো আমিয়েই। প্ৰতাপ আৰু শিৱাজীৰ দৰে আমি কষ্ট সহিব পাৰোঁ, কিন্তু কোনো অত্যাচাৰীৰ আগত কেতিয়াও মূৰ নোনোৱাওঁ। কবিতাটোৱে আমাক সাহস, দেশপ্ৰেম আৰু আত্মসন্মানৰ শিক্ষা দিয়ে।",
              '(i) कविता में देश के बालक-बालिकाओं की तुलना किससे की गयी है?',
              '(ii) कविता के अनुसार हम किन-किन के रखवाले हैं?',
              '(iii) प्रताप और शिवा की तरह हम क्या नहीं करेंगे?'
            ] }
          ] },
        { title: 'अभ्यास-माला / Exercise (pages 10-11)',
          questions: [
          { id: 'h7c1-q2', no: 2, label: 'Q2.', text: 'निम्नलिखित प्रश्नों के उत्तर लिखो :',
            parts: [
              '(i) प्रभात की नई किरण कौन हैं?',
              '(ii) प्रताप और शिवा कौन थे? इनसे हम कौन-सी प्रेरणा लेते हैं?',
              '(iii) प्रस्तुत कविता का मूल उद्देश्य क्या है?',
              '(iv) प्रस्तुत कविता से हमें क्या सीख मिलती है?'
            ] },
          { id: 'h7c1-q3', no: 3, label: 'Q3.', text: 'व्याख्यामूलक प्रश्न :',
            parts: [
              '(क) “हम प्रहरी ऊँचे हिमगिरि के। सुरभि स्वर्ग की लेते हैं।।”',
              '(i) यह पद्यांश किस कविता से उद्धृत है? इसके कवि कौन हैं?',
              '(ii) कवि ने देश के बालक-बालिकाओं को हिमगिरि के प्रहरी क्यों कहा है?',
              '(iii) यहाँ स्वर्ग की सुरभि से क्या मतलब है?',
              '(ख) “हम नवीन भारत के सैनिक धीर, वीर, गंभीर अचल।”',
              '(i) प्रस्तुत पद्यांश में कवि ने भारतीय सैनिकों की प्रशंसा किस तरह से की है?',
              '(ii) कवि ने यहाँ भारत की गरिमा की रक्षा हेतु किसे प्रोत्साहित किया है?',
              '(iii) प्रस्तुत पद्यांश में कवि ने सैनिकों को कौन-से गुण धारण करने के लिये कहा है?'
            ] },
          { id: 'h7c1-q4', no: 4, label: 'Q4.', text: 'कविता का मूलभाव सरल हिन्दी में लिखो।' }
          ] },
        { title: 'भाषा अध्ययन / Language study (page 11)',
          rules: { kind: 'grammar', topic: 'विशेषण (adjective): words that tell the quality, fault or condition of a noun; समानार्थक (synonym) words and words of similar sound with different meanings' },
          questions: [
          { id: 'h7c1-q5', no: 5, label: 'Q5.', text: 'निम्नलिखित शब्दों से अलग-अलग वाक्य बनाओ :',
            parts: [
              'दिन',
              'दीन',
              'अविराम',
              'अभिराम',
              'कमल',
              'कलम',
              'अंक',
              'अंग'
            ] },
          { id: 'h7c1-q7', no: 7, label: 'Q7.', text: 'निम्नलिखित शब्दों के समानार्थक शब्द लिखो :',
            parts: [
              'प्रभात',
              'धरणी',
              'हिमगिरि',
              'रखवाला',
              'किरण',
              'प्रहरी'
            ] }
          ] }
      ]
    },
    {
      no: 2, title: 'पंचतंत्र', kind: 'Story',
      words: [
        ['निरन्तर', 'लगातार'],
        ['नालायक', 'अयोग्य'],
        ['दिलचस्पी', 'रुचि, लगाव'],
        ['फ़र्ज', 'कर्तव्य'],
        ['तकलीफ', 'कष्ट'],
        ['इन्तजार', 'राह देखना'],
        ['तरकीब', 'उपाय']
      ],
      context: `Lesson 2 "पंचतंत्र" (Panchatantra), a story lesson (kahani) about how the Panchatantra came to be written. Notes for the AI (a summary, not the lesson text):
- Long ago, in the south of our country, there was a kingdom called Mahilaropya whose king was Amarshakti. He was very wise (gyani), kind (dayashil) and generous (dani).
- He had three sons, Basushakti, Ugrashakti and Anantashakti. They were big fools (mahamurkh), lazy, useless (nikamme, nalayak) and ran away from studies; when teachers were called they behaved badly and scared and threatened them into leaving. The king was always worried about who would rule the kingdom and look after the people after his death.
- He told his ministers that he had everything but was still sad because of his sons, and asked for a plan to make them capable. The ministers said the princes were grown up and there was little time, so they should be taught through the science of conduct (neetishastra) quickly, and suggested a famous pandit, Vishnusharma, skilled and popular as a teacher.
- Vishnusharma came to the royal court. When the king said he would give any wealth if he made the princes fit, Vishnusharma was angry but calmly said that he was not greedy and had no interest in such things at the age of 80; as a teacher it was his duty to build the students' lives, and he promised to make the princes learned in all the shastras within six months, or else he would give up his name.
- The king was surprised. Next day the princes waited, planning to scare him away as before, but Vishnusharma entered smiling, called them friends, and said he had not come to teach them in the usual way but only to talk, and took them to sit on the grass in the open under a tree. The princes were surprised at this friendly guru and listened with attention to the stories (kahaniyan) he told.
- The king came to see them and was astonished to find them listening absorbed. Vishnusharma made the princes wise in politics (rajneeti), social life (samajneeti) and economics (arthneeti) through the lessons of conduct (neeti) hidden in the stories, and in six months handed over the princes to the king, who was very happy; Vishnusharma's name spread everywhere.
- The stories are in five parts (as printed in the textbook): मित्रभेद, मित्रप्राप्ति, मित्रलाभ, काकोलुकीय and अपरीक्षित कारकम; the five shastras / tantras together are called Panchatantra (the answer to "how many parts" is 5). The author of Panchatantra is Vishnusharma. The Panchatantra has been translated into many languages of the world; its stories are sweet, full of moral lessons (neeti) and simple, so it is still popular.
- Word meanings (textbook): nirantar = lagatar; nalayak = ayogya; dilchaspi = ruchi, lagav; farz = kartavya; taklif = kasht; intazar = rah dekhna; tarkeeb = upay.
- Matching (Q4): Vishnusharma - Panchatantra; Lakshminath Bezbaruwa - Budhi Aair Sadhu; Valmiki - Ramayana; Srimanta Sankardev - Kirtanghosha.
Language study: Q5 opposites (viparitarthak): gun - dosh (avgun); ugra - shant; dhwans - nirman; mrityu - janm; aay - vyay; gyani - agyani; samarthan - virodh; tyag - grahan; mitra - shatru; grameen - shahri; kray - vikray; aazadi - gulami; nirakshar - sakshar; diwas - ratri; taral - thos. Q6 synonyms (paryayvachi, two each): aalsi = sust, kaahil; shikshak = adhyapak, guru; raja = nrip, naresh, maharaj; dhan = daulat, sampatti; kahani = katha, aakhyan; moorkh = nasamajh, buddhu; tarkeeb = upay, yukti; prasann = khush, harshit.
Verb forms (kriya-roop), from the table in the lesson: dhatu (root) खा: bhootkaal खाया, खाया है, खाया था, खा रहा था, खाया होगा, खाता था, खाता; vartaman kaal खाता है, खा रहा है, खाता होगा; bhavishya kaal खायेगा, खाए. dhatu पढ़: पढ़ा, पढ़ा है, पढ़ा था, पढ़ रहा था, पढ़ा होगा, पढ़ता था, पढ़ता; पढ़ता है, पढ़ रहा है, पढ़ता होगा; पढ़ेगा, पढ़े. dhatu जा: गया, गया है, गया था, जा रहा था, जा रहा होगा, जाता था, जाता; जाता है, जा रहा है, जाता होगा; जायेगा, जाए. In Q8 write one simple sentence for each tense (past, present, future) for each of the three dhatus. Write full-sentence answers in simple Hindi in the Devanagari script.`,
      sections: [
        { title: 'পঠন-বোধ / Reading comprehension (Assamese summary)',
          questions: [
          { id: 'h7c2-r9', no: 9, label: 'পঠন-বোধ', text: 'নিচৰ সাৰাংশটো (অসমীয়াত) মন দি পঢ়া আৰু তলৰ প্ৰশ্নবোৰৰ উত্তৰ হিন্দীত লিখো :',
            parts: [
              "সাৰাংশ : মহিলাৰোপ্য নামৰ ৰাজ্যৰ ৰজা অমৰশক্তি জ্ঞানী, দয়ালু আৰু দানশীল আছিল, কিন্তু তেওঁৰ তিনিজন পুত্ৰ—বসুশক্তি, উগ্ৰশক্তি আৰু অনন্তশক্তি—অতি মূৰ্খ আৰু অলস আছিল। পঢ়াবলৈ অহা শিক্ষকসকলক তেওঁলোকে ভয় দেখুৱাই খেদি পঠিয়াইছিল। ৰজাই মন্ত্ৰীসকলৰ পৰামৰ্শ লৈ পণ্ডিত বিষ্ণুশৰ্মাক মাতি আনিলে। ধন-সম্পত্তিত লোভ নথকা বিষ্ণুশৰ্মাই ছমাহৰ ভিতৰত ৰাজকুমাৰ তিনিজনক জ্ঞানী কৰি তোলাৰ প্ৰতিজ্ঞা কৰিলে। তেওঁ পুথি নপঢ়ুৱাকৈ গছৰ তলত বহি সাধুৰ মাজেৰে নীতিৰ শিক্ষা দিলে। ৰাজকুমাৰসকলে আগ্ৰহেৰে শুনিলে আৰু ছমাহত ৰাজনীতি, সমাজনীতি আৰু অৰ্থনীতিত পাকৈত হ'ল। সেই সাধুবোৰ পাঁচটা ভাগত ভাগ কৰা হৈছে আৰু একেলগে 'পঞ্চতন্ত্ৰ' নামেৰে জনা যায়।",
              '(i) राजा अमरशक्ति किस कारण दुःखी थे?',
              '(ii) विष्णुशर्मा ने राजकुमारों को किस तरह पढ़ाया?',
              '(iii) राजकुमार छः महीने में किन विषयों में निपुण हो गये?',
              '(iv) पंचतन्त्र किसे कहते हैं?'
            ] }
          ] },
        { title: 'अभ्यास-माला / Exercise (pages 16-17)',
          questions: [
          { id: 'h7c2-q1', no: 1, label: 'Q1.', text: 'निम्नलिखित प्रश्नों के उत्तर लिखो :',
            parts: [
              'i) राजा अमरशक्ति किस राज्य के राजा थे?',
              'ii) राजा अमरशक्ति के पुत्रों के नाम क्या-क्या थे?',
              'iii) राजकुमार कैसे थे?',
              'iv) राजकुमार गुरुओं के साथ कैसा बर्ताव करते थे?',
              'v) मन्त्रियों ने राजकुमारों को पढ़ाने के लिए किसके नाम का प्रस्ताव किया?',
              'vi) विष्णुशर्मा ने कितने दिनों के भीतर राजकुमारों को पंडित बनाने की प्रतिज्ञा की?',
              'vii) राजकुमार क्यों आश्चर्यचकित हुए?',
              'viii) विष्णुशर्मा ने किस तरह इतने कम दिनों के भीतर राजकुमारों को ज्ञानी बनाया?',
              'ix) विष्णुशर्मा द्वारा सुनायी गयी नीतिशिक्षा पर आधारित कहानियों को कितने भागों में विभक्त किया गया है?',
              'x) पंचतन्त्र की कहानियों के पाँचों भेदों के नाम लिखो।',
              'xi) पंचतन्त्र के लेखक कौन हैं?'
            ] },
          { id: 'h7c2-q2', no: 2, label: 'Q2.', text: 'संक्षिप्त उत्तर दो :',
            parts: [
              'i) राजा अमरशक्ति कैसे राजा थे? चर्चा करो।',
              'ii) राजा किस बात पर हमेशा चिन्तित रहते थे?',
              'iii) मन्त्रियों ने राजा को किस पंडित के बारे में बताया और क्यों?',
              'iv) राजा की बातों से विष्णुशर्मा को क्यों गुस्सा आया? उन्होंने राजा से क्या कहा?',
              'v) विष्णुशर्मा जी ने राजकुमारों को शिक्षा के प्रति किस तरह आकर्षित किया?'
            ] },
          { id: 'h7c2-q3', no: 3, label: 'Q3.', text: 'आशय स्पष्ट करो :',
            parts: [
              'i) महाराज मैं लोभी नहीं हूँ, और मुझे इन चीजों में कोई दिलचस्पी नहीं है। अस्सी साल की इस उम्र में इसकी जरूरत ही नहीं पड़ी।',
              'ii) मन्त्रियों, मैं इतने बड़े एक राज्य का राजा हूँ, मेरे राज्य में किसी की भी कमी नहीं है, राज्य में हर एक प्रजा सुख-चैन से जीवन बिता रहे हैं, फिर भी मैं दुःखी हूँ।'
            ] },
          { id: 'h7c2-q4', no: 4, label: 'Q4.', text: '‘क’ अंश के साथ ‘ख’ अंश को मिलाओ :',
            parts: [
              '‘क’-अंश : (i) विष्णुशर्मा  (ii) लक्ष्मीनाथ बेजबरुवा  (iii) बाल्मीकि  (iv) श्रीशंकरदेव',
              '‘ख’-अंश : (a) बुढ़ी आइर साधु  (b) पंचतन्त्र  (c) कीर्तनघोषा  (d) रामायण'
            ] }
          ] },
        { title: 'भाषा अध्ययन / Language study (page 18)',
          rules: { kind: 'grammar', topic: 'विपरीतार्थक (opposite) and पर्यायवाची (synonym) words' },
          questions: [
          { id: 'h7c2-q5', no: 5, label: 'Q5.', text: 'विपरीतार्थक शब्द लिखो :',
            parts: [
              'गुण',
              'उग्र',
              'ध्वंस',
              'मृत्यु',
              'आय',
              'ज्ञानी',
              'समर्थन',
              'त्याग',
              'मित्र',
              'ग्रामीण',
              'क्रय',
              'आजादी',
              'निरक्षर',
              'दिवस',
              'तरल'
            ] },
          { id: 'h7c2-q6', no: 6, label: 'Q6.', text: 'दो-दो पर्यायवाची शब्द लिखो :',
            parts: [
              'आलसी',
              'शिक्षक',
              'राजा',
              'धन',
              'कहानी',
              'मूर्ख',
              'तरकीब',
              'प्रसन्न'
            ] }
          ] },
        { title: 'अपनी ओर से / On your own (page 18)',
          questions: [
          { id: 'h7c2-q7', no: 7, label: 'Q7.', text: 'अपनी ओर से :',
            parts: [
              'i) गुरु के प्रति हमारा व्यवहार कैसा होना चाहिए? एक टिप्पणी लिखो।',
              'ii) क्या विष्णुशर्मा जैसे गुरु को तुम आदर्श गुरु मानते हो? कारण बताओ।',
              'iii) इसी तरह की अन्य कहानियों का संग्रह करते हुए कक्षा में सुनाओ।'
            ] }
          ] },
        { title: 'Grammar: क्रिया-रूप / verb forms (pages 18-19)',
          rules: { kind: 'grammar', topic: 'क्रिया (verb), धातु (root) and the forms of a verb in भूतकाल, वर्तमान काल and भविष्यत् काल (खा, पढ़, जा)' },
          questions: [
          { id: 'h7c2-q8', no: 8, label: 'Q8.', text: 'आओ, जानें : क्रिया शब्दों के विभिन्न रूप। नीचे दी गयी तालिका (धातु : खा, पढ़, जा; काल : भूतकाल, वर्तमान काल, भविष्यत् काल) को देखकर प्रत्येक काल के क्रिया-रूपों का प्रयोग कर एक-एक वाक्य बनाओ।',
            parts: [
              'धातु खा : भूतकाल का एक वाक्य, वर्तमान काल का एक वाक्य, भविष्यत् काल का एक वाक्य',
              'धातु पढ़ : भूतकाल का एक वाक्य, वर्तमान काल का एक वाक्य, भविष्यत् काल का एक वाक्य',
              'धातु जा : भूतकाल का एक वाक्य, वर्तमान काल का एक वाक्य, भविष्यत् काल का एक वाक्य'
            ] }
          ] }
      ]
    },
    { no: 3, title: 'असम का वृन्दावन', locked: true, sections: [] },
    { no: 4, title: 'हिन्दी के साधक', locked: true, sections: [] },
    { no: 5, title: 'मत बाँटो इन्सान को', locked: true, sections: [] },
    { no: 6, title: 'सूझ-बूझ', locked: true, sections: [] },
    { no: 7, title: 'योग और हम', locked: true, sections: [] },
    { no: 8, title: 'ओणम', locked: true, sections: [] },
    { no: 9, title: 'चलना हमारा काम है', locked: true, sections: [] },
    { no: 10, title: 'कल्पना चावला', locked: true, sections: [] },
    { no: 11, title: 'प्रतिशोध', locked: true, sections: [] },
    { no: 12, title: 'इनसे सीखो', locked: true, sections: [] },
    { no: 13, title: 'आओ बचायें धरती को', locked: true, sections: [] },
    { no: 14, title: 'संत-वाणी', locked: true, sections: [] },
    { no: 15, title: 'अपनी कमाई', locked: true, sections: [] },
    { no: 16, title: 'भारत का राष्ट्रीय खेल : हॉकी', locked: true, sections: [] }
  ]
};
