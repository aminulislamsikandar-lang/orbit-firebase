// Class 6 Hindi, English medium. Question ids start with h6c<chapter>- so they never clash with other courses.
// `sourceLang: 'Hindi'` tells the app that the lesson and the AI answers are in Hindi (translation goes to English / Assamese / Bengali).
// `context` on a chapter is hidden from students and only sent to the AI. The lesson text (poem) is added to it from lessons/h6c1.txt.
const fs = require('fs');
const path = require('path');
// Lesson text lives in lessons/<name>.txt: one block per stanza or paragraph, blank line between blocks, lines starting with # are ignored.
// Line breaks inside a block are kept (a poem needs them).
const lessonBlocks = name => {
  try {
    return fs.readFileSync(path.join(__dirname, 'lessons', name + '.txt'), 'utf8')
      .split(/\r?\n/).filter(l => !l.trim().startsWith('#')).join('\n')
      .split(/\n\s*\n/).map(x => x.split('\n').map(l => l.trim()).filter(Boolean).join('\n')).filter(Boolean);
  } catch (e) { return []; }
};

const poem = lessonBlocks('h6c1');

const notes = `Lesson 1 "पुष्प की अभिलाषा" (Pushp ki Abhilasha, "A Flower's Wish"), a poem by माखनलाल चतुर्वेदी (Makhanlal Chaturvedi). Notes for the AI, summarised from the textbook:
- The poem is full of love for the country (deshbhakti). The speaker is a flower and the poem tells what the flower wishes for itself.
- The flower says it does not want to be strung into the jewellery of a beautiful woman (surbala), does not want to be pierced into a lover's garland to tempt the beloved, does not want to be thrown on the dead bodies of emperors, and does not want to be offered on the heads of gods to feel proud of its luck.
- It asks the vanmali (the gardener who tends the forest or garden) to pluck it and throw it on the path where many brave soldiers walk to give their heads for the motherland (matribhumi).
- Message: serving and sacrificing for the country is greater than luxury, love, wealth, power or pride. Soldiers who give their lives for the nation are the most honoured.
- Title meaning: abhilasha means a wish or a strong desire, so the title means the wish of the flower.
- Poet: Makhanlal Chaturvedi was a famous poet, writer and journalist, born 4 April 1889 at Babai in Hoshangabad district, Madhya Pradesh. He learnt Sanskrit, Bengali, English and Gujarati at home and became a teacher at 16. The Makhanlal Chaturvedi National University of Journalism is in Bhopal. He received the Sahitya Akademi Award in 1955 for the poetry collection Himtarangini. Famous poetry: Himkiritini, Himtarangini, Yugcharan, Samarpan. Prose collections: Krishnarjun Yuddh, Sahitya ke Devta, Samay ke Paanv. He died on 30 January 1968.
Word meanings (from the textbook): surbala = sundar mahila (beautiful woman); samrat = raja (king); bhagya = takdeer (destiny); ithlana = itrana (to flaunt, to show off); matribhumi = desh/rajya (country); path = rasta (path).
Grammar notes:
- Anunasik (nasal) vowels are pronounced with air coming mostly from the mouth and a little from the nose. They are written with chandrabindu (ँ) placed on the shirorekha (the line on top of the letter). Textbook examples: आँख, कुआँ, बाँसुरी, तितलियाँ, धुआँ, बूँद, चाँदी, गाड़ियाँ, झाँसी, अँगूठी. (Usual rule: when part of the vowel sign already goes above the line, a bindu (ं) is written instead of chandrabindu, for example में, हैं, नहीं.)
- Sangya (noun) = the name of a person, thing, place or living being, for example रेनू, पुस्तक, दिल्ली, सियार. Three kinds: vyaktivachak (proper noun: a particular person, thing, place or animal, for example सम्राट अशोक, ताजमहल, मैसूर, चेतक); jativachak (common noun: a whole class, for example सब्जी, चिड़िया, धर्मशाला); bhavvachak (abstract noun: quality, state or feeling, for example बचपन, मानवता, झूठ, हिंसा). Some language scholars add two more kinds: dravyavachak (material noun) and samuhvachak (collective noun).
- Vachan (number) shows whether a noun is one or more than one. Ekvachan (singular) is one, bahuvachan (plural) is more than one. Examples: लड़का भागता है / लड़के भागते हैं; लड़की गाना गा रही है / लड़कियाँ गाना गा रही हैं. Number can also be known from the verb (फूल खिल रहा है / फूल खिल रहे हैं) or the pronoun (वह आज कानपुर जा रहा है / वे आज कानपुर जा रहे हैं).`;

module.exports = {
  id: 'c6-hindi',
  subject: 'Hindi',
  class: 6,
  sourceLang: 'Hindi',
  chapters: [
    {
      no: 1, title: 'पुष्प की अभिलाषा', kind: 'Poem', author: 'माखनलाल चतुर्वेदी',
      lesson: poem,
      words: [
        ['सुरबाला', 'सुंदर महिला (beautiful woman)'],
        ['सम्राट', 'राजा (king)'],
        ['भाग्य', 'तकदीर (destiny)'],
        ['इठलाना', 'इतराना (flaunt)'],
        ['मातृभूमि', 'देश/राज्य (country)'],
        ['पथ', 'रास्ता (path)']
      ],
      context: notes + (poem.length ? '\n\nPoem text from the textbook (stanzas):\n' + poem.join('\n\n') : ''),
      sections: [
        { title: 'Oral / मौखिक (page 8)', questions: [
          { id: 'h6c1-o1', no: 1, label: 'O1.', text: 'इस कविता के कवि का नाम बताइए।' },
          { id: 'h6c1-o2', no: 2, label: 'O2.', text: 'कविता के शीर्षक का अर्थ बताइए।' },
          { id: 'h6c1-o3', no: 3, label: 'O3.', text: 'कविता के अनुसार पुष्प क्या सोचता है?' }
        ] },
        { title: 'Written / लिखित (page 9)', questions: [
          { id: 'h6c1-w1', no: 1, label: 'W1.', text: 'पुष्प सम्राट के बारे में क्या भाव प्रकट करता है?' },
          { id: 'h6c1-w2', no: 2, label: 'W2.', text: "'पुष्प की अभिलाषा' कविता के द्वारा कवि क्या संदेश देना चाहते हैं?" },
          { id: 'h6c1-w3', no: 3, label: 'W3.', text: 'कविता की पहली चार पंक्तियों का अर्थ अपने शब्दों में लिखिए। (ये वे पंक्तियाँ हैं जिनमें पुष्प सुरबाला के गहनों में गूँथे जाने और प्रेमी-माला में बिंधने की चाह से इनकार करता है।)' },
          { id: 'h6c1-w4', no: 4, label: 'W4.', text: 'पुष्प ने कहाँ-कहाँ नहीं चढ़ने की इच्छा व्यक्त की है?' },
          { id: 'h6c1-w5', no: 5, label: 'W5.', text: 'रिक्त स्थान भरिए—',
            parts: [
              '(क) ______ की ______ है कि वह देश पर न्योछावर हो जाएगा। (पुष्प/कवि, वरदान/अभिलाषा)',
              '(ख) पुष्प की चाह नहीं है कि वह ______ के बालों में गूँथा जाए। (सुरबाला/राजबाला)',
              '(ग) पुष्प ______ के सामने अपनी इच्छा प्रकट कर रहा है। (वन अधिकारी/वनमाली)'
            ] }
        ] },
        { title: 'MCQ / बहुविकल्पीय प्रश्न (page 9)', questions: [
          { id: 'h6c1-m1', no: 1, label: 'M1.', text: 'सही विकल्प चुनिए—',
            parts: [
              '(क) कविता में कहा गया है कि—',
              '(i) फूल बहुत सुंदर होते हैं',
              '(ii) देश की सेवा सबसे पहले है',
              '(iii) फूल खुद पर इतराते हैं',
              '(iv) सुंदर महिला के बालों में फूल लगा है',
              '(ख) पुष्प वीरों के पथ पर बिछना चाहता है—',
              '(i) अपना सर्वस्व देश के वीरों पर न्योछावर करने के लिए',
              '(ii) वीरों के पैरों तले आकर गर्व महसूस करने के लिए',
              '(iii) अपनी देशभक्ति का परिचय देने के लिए',
              '(iv) उपर्युक्त सभी'
            ] }
        ] },
        { title: 'Value-based Questions / मूल्यपरक प्रश्न (page 10)', questions: [
          { id: 'h6c1-v1', no: 1, label: 'V1.', text: 'क्या जाति और धर्म की भावना देशप्रेम से बढ़कर होनी चाहिए? अपने विचार लिखिए।' },
          { id: 'h6c1-v2', no: 2, label: 'V2.', text: 'एक विद्यार्थी किस प्रकार अपने देश की सेवा कर सकता है? लिखिए।' }
        ] },
        { title: 'Reference to the Context / संदर्भगत प्रश्न (page 10)', questions: [
          { id: 'h6c1-c1', no: 1, label: 'C1.', text: 'दिए गए काव्यांश को ध्यान से पढ़कर प्रश्नों के उत्तर दीजिए। (काव्यांश कविता का दूसरा भाग है: जहाँ पुष्प सम्राटों के शवों पर चढ़ने से इनकार करता है, वहाँ से कविता की अंतिम पंक्ति तक।)',
            parts: [
              '(क) फूल किससे और किस प्रकार का आग्रह कर रहा है?',
              '(ख) फूल स्वयं को अर्पित करने के लिए वीरों को ही क्यों चुन रहा है?',
              '(ग) काव्यांश की अंतिम चार पंक्तियों में पुष्प कैसा महसूस कर रहा है? अपने शब्दों में लिखिए।'
            ] }
        ] },
        { title: 'Grammar: Anunasik / अनुनासिक, Exercise 1 (page 11)',
          rules: { kind: 'grammar', topic: 'अनुनासिक स्वर और चंद्रबिंदु (ँ), and when a bindu (ं) is used instead' },
          questions: [
            { id: 'h6c1-g1', no: 1, label: 'G1.', text: 'रिक्त स्थानों को उचित शब्द से पूरा कीजिए—',
              parts: [
                '(क) सुनीता ठंड से ______ रही थी। (कांप/काँप)',
                '(ख) कृष्णा ______ इनसान है। (हंसमुख/हँसमुख)',
                '(ग) माणिक दौड़ते-दौड़ते ______ लगा। (हाँफने/काँपने)',
                '(घ) टार्च जलाओ, यहाँ बहुत ______ हो रहा है। (आँधी/अँधेरा)',
                '(ङ) ______ किसी दूसरी दुनिया में रहती हैं। (तितलियाँ/पुतलियाँ)'
              ] }
          ] },
        { title: 'Grammar: Sangya / संज्ञा (Noun), Exercises 2 to 5 (pages 11-12)',
          rules: { kind: 'grammar', topic: 'संज्ञा (noun) and its kinds: व्यक्तिवाचक, जातिवाचक, भाववाचक (and द्रव्यवाचक, समूहवाचक)' },
          questions: [
            { id: 'h6c1-g2', no: 2, label: 'G2.', text: 'संज्ञा शब्द चुनकर अलग-अलग लिखिए— (शब्द: गहना, फूल, वीर, सम्राट, लालच, प्रेम, पथ, प्यार)',
              parts: ['जातिवाचक संज्ञा: ______', 'भाववाचक संज्ञा: ______'] },
            { id: 'h6c1-g3', no: 3, label: 'G3.', text: 'दिए गए वाक्यों में आए रंगीन शब्दों में प्रयुक्त संज्ञा के भेदों का नाम लिखिए—',
              parts: [
                '(क) दिल्ली भारत की राजधानी है। (रंगीन शब्द: दिल्ली)',
                '(ख) बगीचे में पेड़ और फूल खिले हैं। (रंगीन शब्द: बगीचे)',
                '(ग) मित्रता जीवन का अनमोल रत्न है। (रंगीन शब्द: मित्रता)',
                '(घ) पक्षी आसमान में उड़ रहे हैं। (रंगीन शब्द: पक्षी)'
              ] },
            { id: 'h6c1-g4', no: 4, label: 'G4.', text: 'दिए गए शब्दों से वाक्य बनाइए—',
              parts: ['(क) गाँव', '(ख) साँवला', '(ग) यामिनी', '(घ) डाँट', '(ङ) माँ'] },
            { id: 'h6c1-g5', no: 5, label: 'G5.', text: 'कविता में से तुकांत शब्द छाँटकर लिखिए।' }
          ] },
        { title: 'Grammar: Vachan / वचन (Number), Exercises 6 and 7 (pages 12-13)',
          rules: { kind: 'grammar', topic: 'वचन (number): एकवचन and बहुवचन, and how to know the number from the noun, the pronoun and the verb' },
          questions: [
            { id: 'h6c1-g6', no: 6, label: 'G6.', text: 'उचित बहुवचन चुनकर वाक्य पूरे कीजिए—',
              parts: [
                '(क) ये दोनों ______ कितनी ऊँची हैं! (पहाड़ी/पहाड़ियाँ)',
                '(ख) गंगा और यमुना दोनों प्रमुख ______ हैं। (नदी/नदियाँ)',
                '(ग) हमारे देश में अनेक ______ हैं। (झील/झीलें)',
                '(घ) ______ मीठा गाती है। (कोयल/कोयलें)',
                '(ङ) ______ सुंदर नक्काशी कर रहा है। (कारीगर/कारीगरों)'
              ] },
            { id: 'h6c1-g7', no: 7, label: 'G7.', text: 'इन वाक्यों में सर्वनाम और संज्ञा और क्रिया को बदलकर बहुवचन बनाइए—',
              parts: ['(क) मैं विद्यालय जाता हूँ।', '(ख) वह खेलता है।', '(ग) भैंस चारा खा रही है।'] }
          ] },
        { title: 'Listening and Speaking / बातचीत (page 13)', questions: [
          { id: 'h6c1-s1', no: 1, label: 'S1.', text: 'कक्षा में किसी एक शहीद के बारे में बताइए जिन्होंने देश की रक्षा के लिए अपने जीवन का बलिदान दे दिया।' },
          { id: 'h6c1-s2', no: 2, label: 'S2.', text: 'कल्पना कीजिए, आपने भीड़भाड़ वाली जगह में किसी को अपना बैग छोड़कर भागते हुए देख लिया। अपने विचार प्रकट करते हुए कक्षा में चर्चा कीजिए—',
            parts: [
              '• क्या आप बैग को खोलकर देखना चाहेंगे?',
              '• आप समय व्यर्थ किए बिना बैग की सूचना पुलिस को देंगे या अपने से बड़े किसी व्यक्ति को इसके बारे में बताएँगे?'
            ] }
        ] }
      ]
    },
    { no: 2, title: 'हीरों का सच', locked: true, sections: [] },
    { no: 3, title: 'मेरी डायरी', locked: true, sections: [] },
    { no: 4, title: 'मूर्ख ऊँट', locked: true, sections: [] },
    { no: 5, title: 'पेड़ की पुकार', locked: true, sections: [] },
    { no: 6, title: 'जादुई गधा', locked: true, sections: [] },
    { no: 7, title: 'दक्षिण की लक्ष्मीबाई रानी चेन्नम्मा', locked: true, sections: [] },
    { no: 8, title: 'कहे कबीरा सुन मेरे बंधु…', locked: true, sections: [] },
    { no: 9, title: 'दिव्य हैं दिव्यांग', locked: true, sections: [] },
    { no: 10, title: 'जहाँ चाह, वहाँ राह', locked: true, sections: [] },
    { no: 11, title: 'लहरों से डरकर नौका पार नहीं होती', locked: true, sections: [] }
  ]
};
