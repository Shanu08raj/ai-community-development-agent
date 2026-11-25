// Localized spoken instruction guides & non-sensitive templates for JanSetu AI's 8 primary languages.
// Never includes confidential tracking tokens, passwords, or admin internal notes.

const VOICE_GUIDES = {
  portalGuide: {
    en: 'Welcome to JanSetu AI. Connecting citizens, improving communities. You can report local civic problems using voice or typing in your preferred Indian language with no account required, receive a Reference ID and private tracking code, and track resolution progress safely.',
    hi: 'जनसेतु एआई में आपका स्वागत है। नागरिक और समुदाय को जोड़ने वाला मंच। आप बिना किसी खाते के अपनी पसंदीदा भाषा में बोलकर या लिखकर स्थानीय समस्याएं दर्ज कर सकते हैं, संदर्भ संख्या और गुप्त ट्रैकिंग कोड प्राप्त कर सकते हैं, और समाधान की प्रगति देख सकते हैं।',
    mr: 'जनसेतु एआयमध्ये आपले स्वागत आहे. खाते न उघडता तुम्ही तुमच्या पसंतीच्या भाषेत बोलून किंवा टाइप करून नागरी समस्या नोंदवू शकता, संदर्भ क्रमांक आणि खाजगी ट्रॅकिंग कोड मिळवू शकता आणि प्रगती तपासू शकता.',
    te: 'జనసేతు ఏఐకి స్వాగతం. ఖాతా అవసరం లేకుండానే మీకు నచ్చిన భాషలో మాట్లాడి లేదా టైప్ చేసి స్థానిక సమస్యలను నమోదు చేయవచ్చు, రిఫరెన్స్ ఐడి మరియు ప్రైవేట్ ట్రాకింగ్ కోడ్ పొంది పురోగతిని ట్రాక్ చేయవచ్చు.',
    kn: 'ಜನಸೇತು ಎಐಗೆ ಸ್ವಾಗತ. ಯಾವುದೇ ಖಾತೆ ಇಲ್ಲದೆ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ ಸ್ಥಳೀಯ ಸಮಸ್ಯೆಗಳನ್ನು ವರದಿ ಮಾಡಬಹುದು ಮತ್ತು ಟ್ರ್ಯಾಕಿಂಗ್ ಕೋಡ್ ಮೂಲಕ ಪ್ರಗತಿ ಪರಿಶೀಲಿಸಬಹುದು.',
    ta: 'ஜனசேது ஏஐ தளத்திற்கு வரவேற்கிறோம். கணக்கு இல்லாமல் உங்கள் மொழியில் பேசி அல்லது தட்டச்சு செய்து உள்ளூர் பிரச்சினைகளை பதிவு செய்யலாம் மற்றும் முன்னேற்றத்தை அறியலாம்.',
    as: 'জনসেতু এআইলৈ স্বাগতম। কোনো একাউণ্ট অবিহনেই আপুনি নিজৰ ভাষাত কৈ বা লিখি স্থানীয় সমস্যা দাখিল কৰিব পাৰে আৰু ট্ৰেকিং কʼডৰ জৰিয়তে অগ্ৰগতি চাব পাৰে।',
    mni: 'জনসেতু এআইদা তরাম্না ওকচরি। একাউন্ত লৈতনা নশাগী লোলদা ঙাংদুনা নত্ত্রগা ইদুনা সমস্যশিং পীশিনবা য়াই।',
  },
  workflowGuide: {
    en: 'How JanSetu AI works in 4 steps. Step 1: Report a problem without needing an account using voice or text and receive your Reference ID and confidential tracking code. Step 2: AI analyzes the language, category, priority severity, and recommends a local authority. Step 3: Related citizen reports in your ward are clustered together. Step 4: Citizens track real-time resolution progress.',
    hi: 'जनसेतु एआई 4 चरणों में काम करता है। चरण 1: बोलकर या लिखकर समस्या दर्ज करें और संदर्भ संख्या प्राप्त करें। चरण 2: एआई भाषा, श्रेणी और प्राथमिकता का विश्लेषण करता है। चरण 3: एक ही वार्ड की मिलती-जुलती शिकायतों को जोड़ा जाता है। चरण 4: नागरिक समाधान की स्थिति ट्रैक कर सकते हैं।',
    mr: 'जनसेतु एआय 4 टप्प्यांत कार्य करते. टप्पा 1: बोलून किंवा लिहून तक्रार नोंदवा. टप्पा 2: एआय भाषा, श्रेणी आणि प्राधान्य तपासते. टप्पा 3: एकाच प्रभागातील समान तक्रारी एकत्र केल्या जातात. टप्पा 4: नागरिक तक्रारीची स्थिती तपासू शकतात.',
    te: 'జనసేతు ఏఐ 4 దశల్లో పనిచేస్తుంది. దశ 1: మాట్లాడి లేదా టైప్ చేసి ఫిర్యాదు నమోదు చేయండి. దశ 2: ఏఐ భాష, వర్గం మరియు ప్రాధాన్యతను విశ్లేషిస్తుంది. దశ 3: ఒకే వార్డులోని సంబంధిత ఫిర్యాదులు జతచేయబడతాయి. దశ 4: పురోగతిని ట్రాక్ చేయవచ్చు.',
    kn: 'ಜನಸೇತು ಎಐ 4 ಹಂತಗಳಲ್ಲಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ. ಹಂತ 1: ಧ್ವನಿ ಅಥವಾ ಪಠ್ಯದ ಮೂಲಕ ದೂರು ನೀಡಿ. ಹಂತ 2: ಎಐ ಭಾಷೆ, ವರ್ಗ ಮತ್ತು ಆದ್ಯತೆಯನ್ನು ವಿಶ್ಲೇಷಿಸುತ್ತದೆ. ಹಂತ 3: ಒಂದೇ ವಾರ್ಡ್‌ನ ದೂರುಗಳನ್ನು ಗುಂಪು ಮಾಡುತ್ತದೆ. ಹಂತ 4: ಪ್ರಗತಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.',
    ta: 'ஜனசேது ஏஐ 4 படிகளில் செயல்படுகிறது. படி 1: குரல் அல்லது உரை மூலம் புகார் அளிக்கவும். படி 2: மொழி, வகை மற்றும் முன்னுரிமையை ஏஐ பகுப்பாய்வு செய்கிறது. படி 3: ஒரே வார்டின் புகார்கள் இணைக்கப்படுகின்றன. படி 4: தீர்வு நிலையை கண்காணிக்கலாம்.',
    as: 'জনসেতু এআই ৪টা স্তৰত কাম কৰে। ১ম স্তৰ: কৈ বা লিখি অভিযোগ দিয়ক। ২য় স্তৰ: এআই-য়ে ভাষা, শ্ৰেণী আৰু গুৰুত্ব বিশ্লেষণ কৰে। ৩য় স্তৰ: একেটা ৱাৰ্ডৰ অভিযোগ একত্ৰিত কৰা হয়। ৪ৰ্থ স্তৰ: নাগৰিকে অগ্ৰগতি চাব পাৰে।',
    mni: 'জনসেতু এআই ৪ স্টোপতা থবক তৌই। অহানবা তাংকক: ঙাংদুনা নত্ত্রগা ইদুনা কমপ্লেন পীশিনবা। অনীশুবা: এআইনা লোল অমসুং কাংলুপ খন্দোকপা। অহুমশুবা: ৱার্দ অমগী কমপ্লেনশিং পুনশিনবা। মরীশুবা: ফিবম য়েংবা।',
  },
  formGuide: {
    en: 'To submit a community issue, speak your complaint or enter a short title, choose the category, select your State and District, provide your ward or street, and review every field before submitting.',
    hi: 'शिकायत दर्ज करने के लिए अपनी समस्या बोलकर बताएं या शीर्षक लिखें, श्रेणी चुनें, अपना राज्य और जिला चुनें, वार्ड नंबर दर्ज करें और जमा करने से पहले सभी जानकारी जांच लें।',
    mr: 'तक्रार नोंदवण्यासाठी तुमची समस्या बोला किंवा शीर्षक लिहा, श्रेणी, राज्य, जिल्हा आणि प्रभाग क्रमांक निवडा आणि सबमिट करण्यापूर्वी सर्व माहिती तपासा.',
    te: 'ఫిర్యాదు నమోదు చేయడానికి మీ సమస్యను మాట్లాడండి లేదా శీర్షిక, వర్గం, రాష్ట్రం, జిల్లా మరియు వార్డు వివరాలను నమోదు చేసి, సమర్పించే ముందు సరిచూసుకోండి.',
    kn: 'ದೂರು ಸಲ್ಲಿಸಲು ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಮಾತನಾಡಿ ಅಥವಾ ಶೀರ್ಷಿಕೆ, ವರ್ಗ, ರಾಜ್ಯ, ಜಿಲ್ಲೆ ಮತ್ತು ವಾರ್ಡ್ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ, ಸಲ್ಲಿಸುವ ಮೊದಲು ಪರಿಶೀಲಿಸಿ.',
    ta: 'புகார் அளிக்க உங்கள் பிரச்சினையை பேசுங்கள் அல்லது தலைப்பு, வகை, மாநிலம், மாவட்டம் மற்றும் வார்டு விவரங்களை தேர்வு செய்து சரிபார்க்கவும்.',
    as: 'অভিযোগ দাখিল কৰিবলৈ আপোনাৰ সমস্যা কওক বা শিৰোনাম, শ্ৰেণী, ৰাজ্য, জিলা আৰু ৱাৰ্ড নম্বৰ লিখি জমা দিয়াৰ আগতে পৰীক্ষা কৰক।',
    mni: 'কমপ্লেন পীশিন্নবা নশাগী সমস্য ঙাংউ নত্ত্রগা হিরম, কাংলুপ, স্তেত, দিস্ত্রিক্ত অমসুং ৱার্দ মশিং ইদুনা থাদোকত্রিঙৈদা যেংশিল্লু।',
  },
};

export function getVoiceGuideText(key, langCode = 'en') {
  const code = String(langCode || 'en').split('-')[0].toLowerCase();
  const group = VOICE_GUIDES[key];
  if (!group) return '';
  return group[code] || group.en;
}

export function buildConfirmationSpeechText({ referenceId, category, area }, langCode = 'en') {
  const code = String(langCode || 'en').split('-')[0].toLowerCase();
  const ref = referenceId || '';
  const cat = category || '';
  const loc = area || '';

  switch (code) {
    case 'hi':
      return `आपकी शिकायत सफलतापूर्वक दर्ज हो गई है। संदर्भ संख्या ${ref}। श्रेणी: ${cat}। क्षेत्र: ${loc}। कृपया स्क्रीन पर दिखाया गया गुप्त ट्रैकिंग कोड सुरक्षित रखें।`;
    case 'mr':
      return `तुमची तक्रार यशस्वीरित्या नोंदवली गेली आहे. संदर्भ क्रमांक ${ref}. श्रेणी: ${cat}. परिसर: ${loc}. कृपया स्क्रीनवरील खाजगी ट्रॅकिंग कोड सुरक्षित ठेवा.`;
    case 'te':
      return `మీ ఫిర్యాదు విజయవంతంగా నమోదైంది. రిఫరెన్స్ ఐడి ${ref}. వర్గం: ${cat}. ప్రాంతం: ${loc}. దయచేసి స్క్రీన్‌పై ఉన్న ప్రైవేట్ ట్రాకింగ్ కోడ్‌ను సురక్షితంగా దాచుకోండి.`;
    case 'kn':
      return `ನಿಮ್ಮ ದೂರು ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ. ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ ${ref}. ವರ್ಗ: ${cat}. ಪ್ರದೇಶ: ${loc}. ದಯವಿಟ್ಟು ಪರದೆಯ ಮೇಲಿರುವ ಟ್ರ್ಯಾಕಿಂಗ್ ಕೋಡ್ ಅನ್ನು ಸುರక్షితంగా ಇರಿಸಿ.`;
    case 'ta':
      return `உங்கள் புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டது. குறிப்பு எண் ${ref}. வகை: ${cat}. பகுதி: ${loc}. திரையில் உள்ள ரகசிய கண்காணிப்பு குறியீட்டை பாதுகாப்பாக சேமிக்கவும்.`;
    case 'as':
      return `আপোনাৰ অভিযোগ সফলতাৰে দাখিল কৰা হৈছে। ৰেফাৰেন্স নম্বৰ ${ref}। শ্ৰেণী: ${cat}। অঞ্চল: ${loc}। অনুগ্ৰহ কৰি গোপনীয় ট্ৰেকিং কʼডটো সুৰক্ষিতভাৱে ৰাখক।`;
    case 'mni':
      return `নখোয়গী কমপ্লেন মায় পাক্না পীশিনখ্রে। রিফরেন্স আই.দি ${ref}। কাংলুপ: ${cat}। মফম: ${loc}। ত্রোকিং কোদতু চেকশিন্না থম্মু।`;
    default:
      return `Your complaint has been registered successfully under Reference ID ${ref}. Category: ${cat}. Area: ${loc}. Please copy or download your private tracking code displayed on screen safely.`;
  }
}

export function buildTrackingSpeechText(
  { id, title, status, priority, area, recommendedAuthority, latestStatus, latestNote },
  langCode = 'en'
) {
  const code = String(langCode || 'en').split('-')[0].toLowerCase();
  const authClause = recommendedAuthority || '';
  const updateClause = latestStatus ? `${latestStatus}. ${latestNote || ''}` : '';

  switch (code) {
    case 'hi':
      return `शिकायत संख्या ${id}: ${title}। वर्तमान स्थिति ${status} और प्राथमिकता ${priority} है। क्षेत्र: ${area}। ${authClause ? `अनुशंसित विभाग: ${authClause}। ` : ''}${updateClause ? `ताजा जानकारी: ${updateClause}` : ''}`;
    case 'mr':
      return `तक्रार क्रमांक ${id}: ${title}. सद्यस्थिती ${status} आणि प्राधान्य ${priority} आहे. परिसर: ${area}. ${authClause ? `शिफारस केलेला विभाग: ${authClause}. ` : ''}${updateClause ? `ताजी नोंद: ${updateClause}` : ''}`;
    case 'te':
      return `ఫిర్యాదు సంఖ్య ${id}: ${title}. ప్రస్తుత స్థితి ${status}, ప్రాధాన్యత ${priority}. ప్రాంతం: ${area}. ${authClause ? `సూచించిన విభాగం: ${authClause}. ` : ''}${updateClause ? `తాజా సమాచారం: ${updateClause}` : ''}`;
    case 'kn':
      return `ದೂರು ಸಂಖ್ಯೆ ${id}: ${title}. ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ ${status}, ಆದ್ಯತೆ ${priority}. ಪ್ರದೇಶ: ${area}. ${authClause ? `ಶಿಫಾರಸು ಮಾಡಿದ ಇಲಾಖೆ: ${authClause}. ` : ''}${updateClause ? `ಇತ್ತೀಚಿನ ಮಾಹಿತಿ: ${updateClause}` : ''}`;
    case 'ta':
      return `புகார் எண் ${id}: ${title}. தற்போதைய நிலை ${status}, முன்னுரிமை ${priority}. பகுதி: ${area}. ${authClause ? `பரிந்துரைக்கப்பட்ட துறை: ${authClause}. ` : ''}${updateClause ? `சமீபத்திய தகவல்: ${updateClause}` : ''}`;
    case 'as':
      return `অভিযোগ নম্বৰ ${id}: ${title}। বৰ্তমান অৱস্থা ${status} আৰু গুৰুত্ব ${priority}। অঞ্চল: ${area}। ${authClause ? `পৰামৰ্শিত বিভাগ: ${authClause}। ` : ''}${updateClause ? `শেহতীয়া তথ্য: ${updateClause}` : ''}`;
    case 'mni':
      return `কমপ্লেন নম্বর ${id}: ${title}। হৌজিক্কী ফিবম ${status}, মরু ওইবা ${priority}। মফম: ${area}।`;
    default:
      return `Complaint ${id}: ${title}. Current status is ${status} with ${priority} priority. Area: ${area}. ${authClause ? `Advisory authority: ${authClause}. ` : ''}${updateClause ? `Latest update: ${updateClause}` : ''}`;
  }
}

export function buildCommunityIssueSpeechText(
  { title, category, area, priority, status, summary, recommendedAuthority },
  langCode = 'en'
) {
  const code = String(langCode || 'en').split('-')[0].toLowerCase();
  const auth = recommendedAuthority || '';

  switch (code) {
    case 'hi':
      return `सामुदायिक समस्या: ${title}। श्रेणी: ${category}। क्षेत्र: ${area}। प्राथमिकता: ${priority}। स्थिति: ${status}। ${summary || ''} ${auth ? `अनुशंसित विभाग: ${auth}।` : ''}`.trim();
    case 'mr':
      return `सामुदायिक समस्या: ${title}. श्रेणी: ${category}. परिसर: ${area}. प्राधान्य: ${priority}. स्थिती: ${status}. ${summary || ''} ${auth ? `शिफारस केलेला विभाग: ${auth}.` : ''}`.trim();
    case 'te':
      return `సామూహిక సమస్య: ${title}. వర్గం: ${category}. ప్రాంతం: ${area}. ప్రాధాన్యత: ${priority}. స్థితి: ${status}. ${summary || ''} ${auth ? `సూచించిన విభాగం: ${auth}.` : ''}`.trim();
    case 'kn':
      return `ಸಮುದಾಯ ಸಮಸ್ಯೆ: ${title}. ವರ್ಗ: ${category}. ಪ್ರದೇಶ: ${area}. ಆದ್ಯತೆ: ${priority}. ಸ್ಥಿತಿ: ${status}. ${summary || ''} ${auth ? `ಶಿಫಾರಸು ಇಲಾಖೆ: ${auth}.` : ''}`.trim();
    case 'ta':
      return `சமூக பிரச்சினை: ${title}. வகை: ${category}. பகுதி: ${area}. முன்னுரிமை: ${priority}. நிலை: ${status}. ${summary || ''} ${auth ? `பரிந்துரைக்கப்பட்ட துறை: ${auth}.` : ''}`.trim();
    case 'as':
      return `সমাজৰ সমস্যা: ${title}। শ্ৰেণী: ${category}। অঞ্চল: ${area}। গুৰুত্ব: ${priority}। অৱস্থা: ${status}। ${summary || ''}`.trim();
    case 'mni':
      return `খুনাইগী সমস্য: ${title}। কাংলুপ: ${category}। মফম: ${area}। ফিবম: ${status}। ${summary || ''}`.trim();
    default:
      return `Community Issue: ${title}. Category: ${category}. Area: ${area}. Priority: ${priority}. Status: ${status}. ${summary || ''}${auth ? ` Recommended authority advisory: ${auth}.` : ''}`.trim();
  }
}

export function buildReportDetailSpeechText(
  { id, title, status, priority, area, district, state, description, recommendedAuthority, latestStatus, latestNote },
  langCode = 'en'
) {
  const code = String(langCode || 'en').split('-')[0].toLowerCase();
  const locationText = [area, district, state].filter(Boolean).join(', ');
  const updateClause = latestStatus ? `${latestStatus}. ${latestNote || ''}` : '';

  switch (code) {
    case 'hi':
      return `रिपोर्ट ${id}: ${title}। स्थिति: ${status}, प्राथमिकता: ${priority}। स्थान: ${locationText}। ${description || ''} ${recommendedAuthority ? `अनुशंसित विभाग: ${recommendedAuthority}। ` : ''}${updateClause ? `ताजा जानकारी: ${updateClause}` : ''}`.trim();
    case 'mr':
      return `तक्रार ${id}: ${title}. स्थिती: ${status}, प्राधान्य: ${priority}. ठिकाण: ${locationText}. ${description || ''} ${recommendedAuthority ? `शिफारस केलेला विभाग: ${recommendedAuthority}. ` : ''}${updateClause ? `ताजी नोंद: ${updateClause}` : ''}`.trim();
    case 'te':
      return `నివేదిక ${id}: ${title}. స్థితి: ${status}, ప్రాధాన్యత: ${priority}. ప్రాంతం: ${locationText}. ${description || ''} ${recommendedAuthority ? `సూచించిన విభాగం: ${recommendedAuthority}. ` : ''}${updateClause ? `తాజా సమాచారం: ${updateClause}` : ''}`.trim();
    case 'kn':
      return `ವರದಿ ${id}: ${title}. ಸ್ಥಿತಿ: ${status}, ಆದ್ಯತೆ: ${priority}. ಸ್ಥಳ: ${locationText}. ${description || ''}`.trim();
    case 'ta':
      return `அறிக்கை ${id}: ${title}. நிலை: ${status}, முன்னுரிமை: ${priority}. இடம்: ${locationText}. ${description || ''}`.trim();
    case 'as':
      return `প্ৰতিবেদন ${id}: ${title}। অৱস্থা: ${status}, গুৰুত্ব: ${priority}। স্থান: ${locationText}। ${description || ''}`.trim();
    case 'mni':
      return `রিপোর্ত ${id}: ${title}। ফিবম: ${status}, মরু ওইবা: ${priority}। মফম: ${locationText}। ${description || ''}`.trim();
    default:
      return `Report ${id}: ${title}. Status is ${status}, priority ${priority}. Area: ${locationText}. ${description || ''} ${recommendedAuthority ? `AI Advisory Authority: ${recommendedAuthority}. ` : ''}${updateClause ? `Latest update: ${updateClause}` : ''}`.trim();
  }
}
