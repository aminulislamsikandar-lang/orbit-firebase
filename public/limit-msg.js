// public/limit-msg.js - the message a student sees when a daily limit is used up (server answers 429 with code "limit_reached").
// Pure text + one lookup, no DOM, so tests can run it. index.html api() puts the text into the error, so every screen shows it
// (AI Answer, Recall, photo read, videos) without its own code. Language = the student's default translation language (Settings).
(function (root) {
  'use strict';
  // kind: recall | ai | photos | video. Every language says: limit is finished today, come back tomorrow, or ask a parent to add their key.
  const MSG = {
    en: {
      recall: 'Today\'s free AI check is done. Come back tomorrow, or ask a parent to add their key.',
      ai: 'Today\'s AI limit is finished. Come back tomorrow, or ask a parent to add their key.',
      photos: 'Today\'s photo reading limit is finished. Come back tomorrow, or ask a parent to add their key.',
      video: 'Today\'s video limit is finished. Come back tomorrow, or ask a parent to add their key.'
    },
    hing: {
      recall: 'आज का free AI check हो गया। कल फिर आना, या parent की key लगवाओ।',
      ai: 'आज की AI limit खत्म हो गई। कल फिर आना, या parent की key लगवाओ।',
      photos: 'आज की photo पढ़ने की limit खत्म हो गई। कल फिर आना, या parent की key लगवाओ।',
      video: 'आज की video limit खत्म हो गई। कल फिर आना, या parent की key लगवाओ।'
    },
    as: {
      recall: 'আজিৰ বিনামূলীয়া AI check শেষ হ\'ল। কাইলৈ আকৌ আহিবা, নাইবা অভিভাৱকক তেওঁৰ key লগাবলৈ কোৱা।',
      ai: 'আজিৰ AI limit শেষ হ\'ল। কাইলৈ আকৌ আহিবা, নাইবা অভিভাৱকক তেওঁৰ key লগাবলৈ কোৱা।',
      photos: 'আজিৰ photo পঢ়াৰ limit শেষ হ\'ল। কাইলৈ আকৌ আহিবা, নাইবা অভিভাৱকক তেওঁৰ key লগাবলৈ কোৱা।',
      video: 'আজিৰ video limit শেষ হ\'ল। কাইলৈ আকৌ আহিবা, নাইবা অভিভাৱকক তেওঁৰ key লগাবলৈ কোৱা।'
    },
    bn: {
      recall: 'আজকের বিনামূল্যের AI check শেষ হয়ে গেছে। কাল আবার এসো, অথবা অভিভাবককে তাঁর key লাগাতে বলো।',
      ai: 'আজকের AI limit শেষ হয়ে গেছে। কাল আবার এসো, অথবা অভিভাবককে তাঁর key লাগাতে বলো।',
      photos: 'আজকের photo পড়ার limit শেষ হয়ে গেছে। কাল আবার এসো, অথবা অভিভাবককে তাঁর key লাগাতে বলো।',
      video: 'আজকের video limit শেষ হয়ে গেছে। কাল আবার এসো, অথবা অভিভাবককে তাঁর key লাগাতে বলো।'
    }
  };
  // lang = ST.tlang ('as' | 'bn' | 'hing' | 'en'); anything else falls back to Hindi. Unknown kind falls back to the general AI message.
  function limitMessage(lang, kind) {
    const L = MSG[lang] || MSG.hing;
    return L[kind] || L.ai;
  }
  root.LIMITMSG = { MSG, limitMessage };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LIMITMSG;
})(typeof window !== 'undefined' ? window : globalThis);
