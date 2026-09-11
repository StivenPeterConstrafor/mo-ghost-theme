// Auto-ported from cvs4bz49sb-oss/heidelberg/lib/modernize.ts.
(function (root) {
  "use strict";
/**
 * Archaic English → Modern English Modernization Engine
 *
 * A comprehensive, rule-based system for converting Early Modern / KJV-era English
 * into readable modern English. Uses dictionary lookups for known words and
 * pattern-based rules for verb conjugations (-eth, -est).
 *
 * Designed to be deterministic (no AI/LLM calls) so it can run client-side.
 */

// ─── Exception lists ────────────────────────────────────────────────────────

/** Words ending in -eth that are NOT archaic verb forms */
const ETH_EXCEPTIONS = new Set([
  "beneath",
  "underneath",
  "nazareth",
  "shibboleth",
  "elizabeth",
  "seth",
  "beth",
  "meth",
  "teeth",
  "hundredth",
  "thousandth",
  "breadth",
  "death",
  "heath",
  "sheath",
  "wreath",
  "breath",
  "stealth",
  "wealth",
  "health",
  "filth",
  "tilth",
  "growth",
  "sloth",
  "broth",
  "cloth",
  "froth",
  "goth",
  "moth",
  "both",
  "oath",
  "loath",
  "sabbath",
  "mammoth",
  "behemoth",
  "zenith",
  "faith",
  "smith",
  "kith",
  "pith",
  "with",
  "forthwith",
  "therewith",
  "wherewith",
  "width",
  "length",
  "strength",
  "youth",
  "truth",
  "ruth",
  "month",
  "earth",
  "hearth",
  "birth",
  "mirth",
  "worth",
  "north",
  "south",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
  "fourteenth",
  "fifteenth",
  "sixteenth",
  "seventeenth",
  "eighteenth",
  "nineteenth",
  "twentieth",
  "thirtieth",
  "fortieth",
  "fiftieth",
  "sixtieth",
  "seventieth",
  "eightieth",
  "ninetieth",
  "path",
  "math",
  "bath",
  "wrath",
  "aftermath",
  "aftermath",
  "bloodbath",
  "footpath",
  "warpath",
  "psychopath",
  "sociopath",
  "polymath",
  "monolith",
  "megalith",
  "azimuth",
  "mammoth",
  "labyrinth",
  "plinth",
  "hyacinth",
  "corinth",
  "sabbath",
  "judith",
  "edith",
  "meredith",
  "kenneth",
  "gareth",
  "macbeth",
  "method",
]);

/* Words that introduce a superlative. If one of these sits immediately
 * before a word ending in -est, that word is an adjective and not an
 * archaic second person verb, and Phase 4 leaves it alone. A closed
 * class, which is what makes it safe; EST_EXCEPTIONS below is an open
 * one and can only ever list the superlatives somebody thought of. */
const SUPERLATIVE_MARKERS = new Set([
  "the", "a", "an", "this", "that", "these", "those",
  "my", "your", "his", "her", "its", "our", "their", "thy", "thine",
  "mine", "whose", "one", "ones", "of", "in", "at", "by", "for", "with",
  "very", "most", "much", "far", "second", "third", "next", "last",
  "and", "or", "but", "is", "was", "are", "were", "be", "been", "being",
  "o", "oh", "god's", "christ's", "lord's", "man's",
]);

/** Words ending in -est that are NOT archaic verb forms */
const EST_EXCEPTIONS = new Set([
  "best",
  "rest",
  "test",
  "nest",
  "west",
  "east",
  "feast",
  "beast",
  "least",
  "yeast",
  "breast",
  "quest",
  "guest",
  "pest",
  "jest",
  "zest",
  "vest",
  "crest",
  "chest",
  "forest",
  "interest",
  "modest",
  "honest",
  "earnest",
  "harvest",
  "contest",
  "protest",
  "digest",
  "manifest",
  "request",
  "suggest",
  "arrest",
  "dearest",
  "nearest",
  "greatest",
  "smallest",
  "highest",
  "lowest",
  "oldest",
  "newest",
  "latest",
  "earliest",
  "largest",
  "smallest",
  "fastest",
  "slowest",
  "deepest",
  "widest",
  "longest",
  "shortest",
  "strongest",
  "weakest",
  "brightest",
  "darkest",
  "tallest",
  "finest",
  "purest",
  "worst",
  "first",
  "priest",
  "invest",
  "attest",
  "conquest",
  "tempest",
  "midwest",
  "northwest",
  "southeast",
  "southwest",
  "northeast",
  "outpost",
  "profoundest",
  "closest",
  "dishonest",
  "manifest",
]);

// ─── Known word-pair dictionary ─────────────────────────────────────────────

/**
 * Specific known archaic → modern replacements, applied in order.
 * Multi-word phrases come first to avoid partial matches.
 */
const KNOWN_PHRASES = [
  // Verb phrases with "thou" (must come before pronoun replacements)
  [/\bThou art\b/g, "You are"],
  [/\bthou art\b/g, "you are"],
  [/\bThou hast\b/g, "You have"],
  [/\bthou hast\b/g, "you have"],
  [/\bThou wast\b/g, "You were"],
  [/\bthou wast\b/g, "you were"],
  [/\bThou wert\b/g, "You were"],
  [/\bthou wert\b/g, "you were"],
  [/\bThou wilt\b/g, "You will"],
  [/\bthou wilt\b/g, "you will"],
  [/\bThou dost\b/g, "You do"],
  [/\bthou dost\b/g, "you do"],
  [/\bThou didst\b/g, "You did"],
  [/\bthou didst\b/g, "you did"],
  [/\bThou shalt\b/g, "You shall"],
  [/\bthou shalt\b/g, "you shall"],
  [/\bThou canst\b/g, "You can"],
  [/\bthou canst\b/g, "you can"],
  [/\bThou couldst\b/g, "You could"],
  [/\bthou couldst\b/g, "you could"],
  [/\bThou wouldst\b/g, "You would"],
  [/\bthou wouldst\b/g, "you would"],
  [/\bThou shouldst\b/g, "You should"],
  [/\bthou shouldst\b/g, "you should"],
  [/\bThou shouldest\b/g, "You should"],
  [/\bthou shouldest\b/g, "you should"],
  [/\bThou mayst\b/g, "You may"],
  [/\bthou mayst\b/g, "you may"],
  [/\bThou mightest\b/g, "You might"],
  [/\bthou mightest\b/g, "you might"],
  [/\bnor art Thou\b/g, "nor are You"],
  [/\bnor art thou\b/g, "nor are you"],
  // Inverted "art Thou" (e.g., "Great art Thou")
  [/\bart Thou\b/g, "are You"],
  [/\bart thou\b/g, "are you"],
  // Inverted "wilt thou"
  [/\bwilt Thou\b/g, "will You"],
  [/\bwilt thou\b/g, "will you"],
  [/\bWilt Thou\b/g, "Will You"],
  [/\bWilt thou\b/g, "Will you"],
];

/** Individual archaic words → modern equivalents */
const KNOWN_WORDS = [
  // Archaic auxiliary/common verbs
  [/\bhath\b/g, "has"],
  [/\bHath\b/g, "Has"],
  [/\bdoth\b/g, "does"],
  [/\bDoth\b/g, "Does"],
  [/\bdost\b/g, "do"],
  [/\bDost\b/g, "Do"],
  [/\bdidst\b/g, "did"],
  [/\bDidst\b/g, "Did"],
  [/\bsaith\b/g, "says"],
  [/\bSaith\b/g, "Says"],
  [/\bwast\b/g, "was"],
  [/\bWast\b/g, "Was"],
  [/\bwert\b/g, "were"],
  [/\bWert\b/g, "Were"],
  [/\bhast\b/g, "have"],
  [/\bHast\b/g, "Have"],
  [/\bhadst\b/g, "had"],
  [/\bHadst\b/g, "Had"],
  [/\bsaidst\b/g, "said"],
  [/\bSaidst\b/g, "Said"],
  [/\bshalt\b/g, "shall"],
  [/\bShalt\b/g, "Shall"],
  [/\bwilt\b/g, "will"],
  [/\bWilt\b/g, "Will"],
  [/\bcanst\b/g, "can"],
  [/\bCanst\b/g, "Can"],
  [/\bcouldst\b/g, "could"],
  [/\bCouldst\b/g, "Could"],
  [/\bwouldst\b/g, "would"],
  [/\bWouldst\b/g, "Would"],
  [/\bshouldst\b/g, "should"],
  [/\bShouldst\b/g, "Should"],
  [/\bshouldest\b/g, "should"],
  [/\bShouldest\b/g, "Should"],
  [/\bmayst\b/g, "may"],
  [/\bMayst\b/g, "May"],
  [/\bmightest\b/g, "might"],
  [/\bMightest\b/g, "Might"],

  // Archaic -est verbs with doubled consonants or silent 'e' stems
  [/\bweddest\b/g, "wed"],
  [/\bWeddest\b/g, "Wed"],
  [/\bchantest\b/g, "chant"],
  [/\bChangest\b/g, "Change"],
  [/\bchangest\b/g, "change"],
  [/\bderidest\b/g, "deride"],
  [/\bDeridest\b/g, "Deride"],
  [/\brejoicest\b/g, "rejoice"],
  [/\bRejoicest\b/g, "Rejoice"],
  [/\blosest\b/g, "lose"],
  [/\bLosest\b/g, "Lose"],
  [/\bforgivest\b/g, "forgive"],
  [/\bForgivest\b/g, "Forgive"],
  [/\bpraisest\b/g, "praise"],
  [/\bPraisest\b/g, "Praise"],
  [/\bnoticest\b/g, "notice"],
  [/\bNoticest\b/g, "Notice"],
  [/\bchargest\b/g, "charge"],
  [/\bChargist\b/g, "Charge"],
  [/\bjudgest\b/g, "judge"],
  [/\bJudgest\b/g, "Judge"],
  [/\bclosest\b/g, "close"],
  [/\bClosest\b/g, "Close"],
  [/\bservest\b/g, "serve"],
  [/\bServest\b/g, "Serve"],
  [/\bplacest\b/g, "place"],
  [/\bPlacest\b/g, "Place"],

  // Archaic -eth verbs with doubled consonants (putteth → puts, not putts)
  [/\bputteth\b/g, "puts"],
  [/\bPutteth\b/g, "Puts"],
  [/\bgetteth\b/g, "gets"],
  [/\bGetteth\b/g, "Gets"],
  [/\bsetteth\b/g, "sets"],
  [/\bSetteth\b/g, "Sets"],
  [/\bletteth\b/g, "lets"],
  [/\bLetteth\b/g, "Lets"],
  [/\bcutteth\b/g, "cuts"],
  [/\bCutteth\b/g, "Cuts"],

  // Archaic -eth verbs with silent 'e' stems
  [/\bcometh\b/g, "comes"],
  [/\bCometh\b/g, "Comes"],
  [/\bchangeth\b/g, "changes"],
  [/\bChangeth\b/g, "Changes"],
  [/\bjudgeth\b/g, "judges"],
  [/\bJudgeth\b/g, "Judges"],
  [/\bloseth\b/g, "loses"],
  [/\bLoseth\b/g, "Loses"],
  [/\bloveth\b/g, "loves"],
  [/\bLoveth\b/g, "Loves"],
  [/\bmoveth\b/g, "moves"],
  [/\bMoveth\b/g, "Moves"],
  [/\bserveth\b/g, "serves"],
  [/\bServeth\b/g, "Serves"],
  [/\bchargeth\b/g, "charges"],
  [/\bChargeth\b/g, "Charges"],
  [/\bpraiseth\b/g, "praises"],
  [/\bPraiseth\b/g, "Praises"],
  [/\briseth\b/g, "rises"],
  [/\bRiseth\b/g, "Rises"],
  [/\bliveth\b/g, "lives"],
  [/\bLiveth\b/g, "Lives"],

  // Archaic past-tense verb forms (stem ends in silent 'e')
  [/\bmadest\b/g, "made"],
  [/\bMadest\b/g, "Made"],
  [/\bgavest\b/g, "gave"],
  [/\bGavest\b/g, "Gave"],
  [/\bsawest\b/g, "saw"],
  [/\bSawest\b/g, "Saw"],
  [/\bcamest\b/g, "came"],
  [/\bCamest\b/g, "Came"],
  [/\bworest\b/g, "wore"],
  [/\bWorest\b/g, "Wore"],
  [/\bborest\b/g, "bore"],
  [/\bBorest\b/g, "Bore"],
  [/\btorest\b/g, "tore"],
  [/\bTorest\b/g, "Tore"],
  [/\bwrotest\b/g, "wrote"],
  [/\bWrotest\b/g, "Wrote"],
  [/\bdrovest\b/g, "drove"],
  [/\bDrovest\b/g, "Drove"],
  [/\bnamest\b/g, "name"],
  [/\bNamest\b/g, "Name"],
  [/\btakest\b/g, "take"],
  [/\bTakest\b/g, "Take"],
  [/\bmakest\b/g, "make"],
  [/\bMakest\b/g, "Make"],

  // Pronouns — "Thine" before a word = "Your"; standalone = "Yours"
  [/\bThine(?=\s+[a-zA-Z])/g, "Your"],
  [/\bthine(?=\s+[a-zA-Z])/g, "your"],
  [/\bThine\b/g, "Yours"],
  [/\bthine\b/g, "yours"],
  [/\bThyself\b/g, "Yourself"],
  [/\bthyself\b/g, "yourself"],
  [/\bThy\b/g, "Your"],
  [/\bthy\b/g, "your"],
  [/\bThee\b/g, "You"],
  [/\bthee\b/g, "you"],
  [/\bThou\b/g, "You"],
  [/\bthou\b/g, "you"],

  // Archaic prepositions, conjunctions, adverbs
  [/\bunto\b/g, "to"],
  [/\bUnto\b/g, "To"],
  [/\bnought\b/g, "nothing"],
  [/\bNought\b/g, "Nothing"],
  [/\baught\b/g, "anything"],
  [/\bAught\b/g, "Anything"],
  [/\bwhence\b/g, "from where"],
  [/\bWhence\b/g, "From where"],
  [/\bwherefore\b/g, "why"],
  [/\bWherefore\b/g, "Why"],
  [/\bhither\b/g, "here"],
  [/\bHither\b/g, "Here"],
  [/\bthither\b/g, "there"],
  [/\bThither\b/g, "There"],
  [/\bwhither\b/g, "where"],
  [/\bWhither\b/g, "Where"],
  [/\bbetwixt\b/g, "between"],
  [/\bBetwixt\b/g, "Between"],
  [/\bamongst\b/g, "among"],
  [/\bAmongst\b/g, "Among"],
  [/\bwhilst\b/g, "while"],
  [/\bWhilst\b/g, "While"],
  [/\btherein\b/g, "in it"],
  [/\bTherein\b/g, "In it"],
  [/\bthereof\b/g, "of it"],
  [/\bThereof\b/g, "Of it"],
  [/\bthereby\b/g, "by that"],
  [/\bThereby\b/g, "By that"],
  [/\bwherein\b/g, "in which"],
  [/\bWherein\b/g, "In which"],
  [/\bwhereby\b/g, "by which"],
  [/\bWhereby\b/g, "By which"],
  [/\bwhereof\b/g, "of which"],
  [/\bWhereof\b/g, "Of which"],
  [/\bherein\b/g, "in this"],
  [/\bHerein\b/g, "In this"],
  [/\bhereby\b/g, "by this"],
  [/\bHereby\b/g, "By this"],
  [/\bhereof\b/g, "of this"],
  [/\bHereof\b/g, "Of this"],
  [/\bhitherto\b/g, "until now"],
  [/\bHitherto\b/g, "Until now"],
  [/\bthenceforth\b/g, "from then on"],
  [/\bThenceforth\b/g, "From then on"],
  [/\bhenceforth\b/g, "from now on"],
  [/\bHenceforth\b/g, "From now on"],
  [/\bforasmuch\b/g, "since"],
  [/\bForasmuch\b/g, "Since"],
  [/\binasmuch\b/g, "since"],
  [/\bInasmuch\b/g, "Since"],
  [/\binsomuch\b/g, "so much so"],
  [/\bInsomuch\b/g, "So much so"],
  [/\bperadventure\b/g, "perhaps"],
  [/\bPeradventure\b/g, "Perhaps"],
  [/\bperchance\b/g, "perhaps"],
  [/\bPerchance\b/g, "Perhaps"],
  [/\blest\b/g, "unless"],
  [/\bLest\b/g, "Unless"],
  [/\bverily\b/g, "truly"],
  [/\bVerily\b/g, "Truly"],
  [/\byea\b/g, "yes"],
  [/\bYea\b/g, "Yes"],
  [/\bnay\b/g, "no"],
  [/\bNay\b/g, "No"],
  [/\blo\b/g, "look"],
  [/\bLo\b/g, "Look"],

  // Common archaic nouns/adjectives
  [/\bbrethren\b/g, "brothers"],
  [/\bBrethren\b/g, "Brothers"],
  [/\bsundry\b/g, "various"],
  [/\bSundry\b/g, "Various"],
  [/\bdivers\b(?!\s*(ity|e|ion|ified))/g, "various"],
  [/\bDivers\b(?!\s*(ity|e|ion|ified))/g, "Various"],

  // Archaic verbs
  [/\bbeseech\b/g, "implore"],
  [/\bBeseech\b/g, "Implore"],
  [/\bbesought\b/g, "implored"],
  [/\bBesought\b/g, "Implored"],
  [/\bvouchsafe\b/g, "grant"],
  [/\bVouchsafe\b/g, "Grant"],
  [/\bvouchsafed\b/g, "granted"],
  [/\bVouchsafed\b/g, "Granted"],
  [/\bhearken\b/g, "listen"],
  [/\bHearken\b/g, "Listen"],
  [/\bsupplications?\b/g, "prayers"],
  [/\bSupplications?\b/g, "Prayers"],

  // Archaic conjunctions/adverbs/prepositions (additional)
  [/\bwhatsoever\b/g, "whatever"],
  [/\bWhatsoever\b/g, "Whatever"],
  [/\bwhosoever\b/g, "whoever"],
  [/\bWhosoever\b/g, "Whoever"],
  [/\bwheresoever\b/g, "wherever"],
  [/\bWheresoever\b/g, "Wherever"],
  [/\bwhensoever\b/g, "whenever"],
  [/\bWhensoever\b/g, "Whenever"],
  [/\bhowsoever\b/g, "however"],
  [/\bHowsoever\b/g, "However"],
  [/\bwhoso\b/g, "whoever"],
  [/\bWhoso\b/g, "Whoever"],
  [/\bhowbeit\b/g, "however"],
  [/\bHowbeit\b/g, "However"],
  [/\bwithal\b/g, "as well"],
  [/\bWithal\b/g, "As well"],
  [/\bthereupon\b/g, "then"],
  [/\bThereupon\b/g, "Then"],
  [/\bwhereupon\b/g, "at which point"],
  [/\bWhereupon\b/g, "At which point"],
  [/\bheretofore\b/g, "previously"],
  [/\bHeretofore\b/g, "Previously"],
  [/\baforetime\b/g, "previously"],
  [/\bAforetime\b/g, "Previously"],
  [/\bforthwith\b/g, "immediately"],
  [/\bForthwith\b/g, "Immediately"],
  [/\bnotwithstanding\b/g, "nevertheless"],
  [/\bNotwithstanding\b/g, "Nevertheless"],
  [/\bfain\b/g, "gladly"],
  [/\bFain\b/g, "Gladly"],
  [/\bere\b/g, "before"],
  [/\bEre\b/g, "Before"],
  [/\banon\b/g, "soon"],
  [/\bAnon\b/g, "Soon"],
  [/\balbeit\b/g, "although"],
  [/\bAlbeit\b/g, "Although"],
  [/\b'tis\b/g, "it is"],
  [/\b'Tis\b/g, "It is"],
  [/\bsore\b(?=\s+(afraid|displeased|troubled|grieved|distressed|vexed|amazed))/g, "very"],
  [/\bSore\b(?=\s+(afraid|displeased|troubled|grieved|distressed|vexed|amazed))/g, "Very"],
];

// ─── Pattern-based verb conjugation handlers ────────────────────────────────

/**
 * Converts an archaic -eth verb to modern 3rd person singular (-s/-es).
 * e.g., "bringeth" → "brings", "cometh" → "comes", "goeth" → "goes"
 */
function modernizeEthVerb(word) {
  const lower = word.toLowerCase();

  // Check exception list
  if (ETH_EXCEPTIONS.has(lower)) return word;

  // Must end in "eth" and have a stem of at least 2 chars
  if (!lower.endsWith("eth") || lower.length < 5) return word;

  const isCapitalized = word[0] === word[0].toUpperCase();

  // Try removing -eth (consonant-ending stems: bring+eth)
  const stemFromEth = lower.slice(0, -3);
  // Try removing -th (vowel/e-ending stems: come+th, give+th)
  const stemFromTh = lower.slice(0, -2);

  let modernStem;
  let suffix;

  // Ask the dictionary before guessing. "abideth" and "becometh" both
  // end in a consonant once -eth is removed, so the rule below took
  // "abid" and "becom" and produced "abids" and "becoms". The silent e
  // belongs to the stem in both, and the library's own word list knows
  // that "abides" and "becomes" are words while "abids" and "becoms"
  // are not. Only the -th stem is offered here: the -eth stem is what
  // the rules below already prefer, so this decides nothing it would
  // otherwise have got right. Skipped entirely when no lexicon is
  // loaded, which is the same condition the spelling pass uses.
  if (KNOWN && stemFromTh.endsWith("e") && stemFromTh.length >= 3) {
    const viaE = `${stemFromTh}s`;
    const viaConsonant = `${stemFromEth}s`;
    if (KNOWN.has(viaE) && !KNOWN.has(viaConsonant)) {
      const out = viaE;
      return isCapitalized ? out.charAt(0).toUpperCase() + out.slice(1) : out;
    }
  }

  // Prefer consonant-ending stem from removing -eth (e.g., bringeth → bring)
  // UNLESS the stem ends in 'v' which virtually always needs a silent 'e' (giveth → give)
  if (stemFromEth.length >= 2 && /[^aeiouv]$/.test(stemFromEth)) {
    // bringeth → bring+s, filleth → fills, remaineth → remains
    modernStem = stemFromEth;
    if (/(?:s|sh|ch|x|z)$/.test(modernStem)) {
      suffix = "es";
    } else if (modernStem.endsWith("y") && !/[aeiou]y$/.test(modernStem)) {
      modernStem = modernStem.slice(0, -1);
      suffix = "ies";
    } else {
      suffix = "s";
    }
  } else if (stemFromTh.endsWith("e") && stemFromTh.length >= 2) {
    // cometh → come+s, giveth → gives, maketh → makes, moveth → moves
    modernStem = stemFromTh;
    suffix = "s";
  } else if (stemFromEth.length >= 2) {
    // Fallback for vowel-ending stems
    modernStem = stemFromEth;
    suffix = "s";
  } else {
    return word;
  }

  const result = modernStem + suffix;
  return isCapitalized ? result.charAt(0).toUpperCase() + result.slice(1) : result;
}

/**
 * Converts an archaic -est verb (2nd person singular) to base form.
 * e.g., "movest" → "move", "fillest" → "fill", "knowest" → "know"
 */
function modernizeEstVerb(word) {
  const lower = word.toLowerCase();

  // Check exception list (includes superlatives and non-verb words)
  if (EST_EXCEPTIONS.has(lower)) return word;

  // Must end in "est" and have a stem of at least 2 chars
  if (!lower.endsWith("est") || lower.length < 5) return word;

  const isCapitalized = word[0] === word[0].toUpperCase();

  // Try removing -est (consonant-ending stems: fill+est)
  const stemFromEst = lower.slice(0, -3);
  // Try removing -st (vowel/e-ending stems: move+st, love+st)
  const stemFromSt = lower.slice(0, -2);

  let result;

  // Prefer consonant-ending stem from removing -est (e.g., resistest → resist)
  // UNLESS the stem ends in 'v' which needs a silent 'e' (movest → move, lovest → love)
  if (stemFromEst.length >= 2 && /[^aeiouv]$/.test(stemFromEst)) {
    // fillest → fill, containest → contain, resistest → resist
    result = stemFromEst;
  } else if (stemFromSt.endsWith("e") && stemFromSt.length >= 2) {
    // movest → move, lovest → love, desirest → desire, givest → give
    result = stemFromSt;
  } else if (stemFromEst.length >= 2) {
    // Vowel-ending stems: doest → do
    result = stemFromEst;
  } else {
    return word;
  }

  return isCapitalized ? result.charAt(0).toUpperCase() + result.slice(1) : result;
}

// ─── Main modernize function ────────────────────────────────────────────────

/**
 * Modernizes a single string of archaic English text.
 * Applies dictionary replacements, then pattern-based verb conjugation rules.
 */
function modernizeText(text) {
  let result = text;

  // Phase 1: Multi-word phrases (must come first)
  for (const [pattern, replacement] of KNOWN_PHRASES) {
    result = result.replace(pattern, replacement);
  }

  // Phase 2: Known individual word replacements
  for (const [pattern, replacement] of KNOWN_WORDS) {
    result = result.replace(pattern, replacement);
  }

  // Phase 3: Pattern-based -eth verb modernization (3rd person)
  // {2,} = at least 2 chars before "eth", so minimum 5-char words
  result = result.replace(/\b[A-Za-z]{2,}eth\b/g, (match) => {
    return modernizeEthVerb(match);
  });

  // Phase 4: Pattern-based -est verb modernization (2nd person)
  //
  // -est is TWO endings wearing one spelling: the archaic second person
  // ("thou hearest") and the ordinary English superlative ("the
  // fairest"). Until this pass the phase rewrote every word ending in
  // -est and relied on EST_EXCEPTIONS to spare the superlatives, which
  // is a list of 74 against an open class. Everything it missed was
  // quietly destroyed: fairest -> fair, hardest -> hard, easiest ->
  // easy, eldest -> eld, choicest -> choic, almagest -> almag. In a
  // library that quotes the Song of Songs, "the fairest of ten
  // thousand" was rendering as "the fair of ten thousand".
  //
  // The discriminator is the word in front. A superlative is introduced
  // by a determiner, a possessive or an intensifier; a second person
  // verb is not. That is a closed class and it is checked here rather
  // than in the verb function, because only the caller can see context.
  //
  // Checking for "thou" instead would not work: Phase 2 has already
  // turned thou into you by the time this runs.
  result = result.replace(/([A-Za-z']+\s+)?\b([A-Za-z]{2,}est)\b/g, (match, before, word) => {
    const prev = (before || "").trim().toLowerCase().replace(/[^a-z']/g, "");
    if (SUPERLATIVE_MARKERS.has(prev)) return match;
    return (before || "") + modernizeEstVerb(word);
  });

  // Phase 5: Standalone "art" → "are" (the verb "to be" in archaic 2nd person)
  // Only in contexts where it clearly means "are", not "art" (fine arts)
  result = result.replace(/\bart You\b/g, "are You");
  result = result.replace(/\bart you\b/g, "are you");
  result = result.replace(/\bwho art\b/g, "who are");
  result = result.replace(/\bWho art\b/g, "Who are");
  result = result.replace(/; art\b/g, "; are");
  result = result.replace(/, art\b/g, ", are");
  result = result.replace(/\band art\b/g, "and are");
  result = result.replace(/\bAnd art\b/g, "And are");
  // "You art" / "Yourself art" → "You are" / "Yourself are"
  result = result.replace(/\bYou art\b/g, "You are");
  result = result.replace(/\byou art\b/g, "you are");
  result = result.replace(/\bYourself art\b/g, "Yourself are");
  result = result.replace(/\byourself art\b/g, "yourself are");

  // Phase 6: Past tense + "st" pattern (e.g., "sustainedst" → "sustained")
  result = result.replace(/\b([A-Za-z]{3,}ed)st\b/g, "$1");

  return result;
}

/**
 * Modernizes an array of paragraphs.
 */
function modernizeParagraphs(paragraphs) {
  return paragraphs.map(modernizeText);
}

/**
 * Quick check: does the text contain archaic English patterns?
 * Useful for auto-detecting whether to show the modernize toggle.
 */
function hasArchaicLanguage(text) {
  return /\b(Thou|thou|Thee|thee|Thy|thy|Thine|thine|hath|doth|dost|saith|art Thou|art thou)\b/.test(
    text
  );
}

/* ── Spelling ─────────────────────────────────────────────────────
 *
 * The rules above modernise grammar: hath to has, saith to says. They
 * leave the spelling alone, and in a book printed in 1550 the spelling
 * is most of what stands between the reader and the sentence:
 *
 *   "mooste deare brothers in Christ, & most faythful seruauntes"
 *
 * The old approach was a hand-written list of about forty words. It
 * knew "haue" and not "writinges", and a list can only ever know the
 * words someone thought to add. So these are rules instead: u and v
 * exchanged, i for j, y for i, the plural -es, the silent -e, the
 * macron that stands in for a following n or m.
 *
 * Rules alone would be worse than the list. "wyth" to "with" and
 * "type" to "tipe" are the same rule; what separates them is that
 * "with" is a word and "tipe" is not. So nothing is rewritten unless
 * the result is a word the library itself uses and the original is
 * not. The dictionary is harvested from the modern English
 * translations that ship beside the Latin (scripts/build-modern-
 * lexicon.mjs), which means it knows "Sabellianism" and "propitiation"
 * as well as "type", where a general word list would know neither.
 *
 * With no dictionary loaded only the macrons are expanded, since those
 * are unreadable either way and cannot be mistaken for modern text.
 */

// Two tiers, because the two questions are different.
//
// KNOWN answers "is this already modern, leave it alone?" and is
// generous: a rare word wrongly taken for archaic gets rewritten into
// something else, which is the worst outcome available.
//
// COMMON answers "may a rewrite produce this?" and is strict. Held to
// one tier, "menne" became "mene" and "sute" became "sut" — both real
// entries harvested from a few quoted passages, and both beat the
// right answer by sitting one step nearer.
let KNOWN = null;
let COMMON = null;

function setLexicon(common, known) {
  COMMON = common instanceof Set ? common : new Set(common);
  KNOWN = known ? (known instanceof Set ? known : new Set(known)) : COMMON;
  // Archaic forms quoted often enough in the translations to be
  // harvested as modern. They are not.
  ["hym", "hem", "ony", "seyd", "thei", "wol", "nat", "mene", "sut"]
    .forEach((w) => { COMMON.delete(w); KNOWN.delete(w); });
}

const MACRON = { "ā": "a", "ē": "e", "ī": "i", "ō": "o", "ū": "u" };
const MACRON_RE = /[āēīōū]/g;

// Each is a single step. The search below composes them, so "soche"
// reaches "such" through "suche" without anyone writing that down.
//
// The third column ranks the rule. Depth decides first — fewest
// changes wins — but a word can reach two real words in the same one
// step, and then the rank decides which. Three kinds, in order:
//
//   0  putting back a letter that was one letter then and is two now:
//      u for v, i for j, y for i, the -ie that is now -y. This is
//      recovering what was written, and it is nearly always right.
//   1  taking away what the compositor added: the silent terminal e,
//      the doubled letter, the plural -es. A reasonable guess.
//   2  changing a vowel outright. The last resort.
//
// Without the ranking the array order decided, and a vowel swap sat
// above every deletion, so "hee" reached "hie" before it reached "he",
// "wee" reached "wie", "soe" reached "sue" and "Paule" reached "pale".
// All four are real words, so nothing downstream could catch them,
// and they are among the commonest words in the corpus.
//
// Restoring has to outrank taking away, or the correction lands one
// letter short: "vse" is "use" and not "vs", "prayse" is "praise" and
// not "prays", "glorie" is "glory" and not "glori".
const RESTORE = 0;
const TAKE = 1;
const SHIFT = 2;

const REWRITES = [
  [/([aeiou])u([aeiou])/g, "$1v$2", RESTORE], // haue, euery, deuil
  [/^v([bcdfghjklmnpqrstvwxz])/, "u$1", RESTORE], // vpon, vnto, vs
  [/^i([aeou])/, "j$1", RESTORE], // iudge, Iohn, ioy
  // The same i/j swap inside a word. The rule above only fired at the
  // start, so "iudge" modernised while "obiect", "subiect", "adioyned"
  // and "maiestie" did not, which is the commonest single class of
  // Early Modern spelling in this corpus after u/v. Safe for the same
  // reason every rule here is: bestSpelling() returns early for any
  // word already in the lexicon, and a candidate is only accepted if
  // it lands on a real word, so "biology" and friends are untouchable.
  [/([a-z])i([aeou])/g, "$1j$2", RESTORE], // obiect, adioyned, maiestie
  // -ick was entirely unhandled, so critick, cynick, musick, physick,
  // publick, logick and traffick all rendered as printed. Found from a
  // Thomas Brooks work, 2026-09-04. The lexicon already held the modern
  // forms; the search simply had no rule that could reach them.
  // Only three words in the lexicon collide (sick, lick, frederick) and
  // all three are already modern, so the early return covers them.
  [/ick$/, "ic", RESTORE], // critick, cynick, musick, publick
  [/(?!^)y(?!$)/g, "i", RESTORE], // wyth, hym, dyuyne
  [/ie$/, "y", RESTORE], // maiestie, fidelitie
  [/es$/, "s", TAKE], // writinges, thynges
  [/nes$/, "ness", TAKE], // goodnes
  [/oo/, "o", TAKE], // mooste
  [/ee/, "ie", SHIFT], // beleeue
  [/au/, "a", SHIFT], // seruaunt
  [/o/g, "u", SHIFT], // soche
  [/e$/, "", TAKE], // silent terminal e
  [/([bcdfgklmnprstvz])\1/, "$1", TAKE], // synne, allmighty
  // ── Added 2026-09-11, measured against 300 Early English Books works
  // (16.6M running words). Before this pass 2.01% of every word in that
  // corpus was left as printed. Each rule below was scored for what it
  // recovers and for what it breaks, and none of them alters a single
  // one of the 33,841 words the library itself uses.

  // u for v after a CONSONANT, which is most of them. The rule above
  // only fired between two vowels, so "haue" and "euery" modernised
  // while "selues", "serue", "siluer", "twelue" and "obserue" did not.
  // This is the largest single class of Early Modern spelling in the
  // corpus: 116 word types, 24,021 occurrences. q is excluded so that
  // "queen" is never considered.
  [/([a-pr-tv-z])u([aeiou])/g, "$1v$2", RESTORE],
  // -ely for -ly. "onely" alone is 12,124 occurrences across 224 of the
  // 300 works sampled, the commonest unmodernised word in the corpus.
  // Also truely, plainely, expressely, certainely, duely.
  [/ely$/, "ly", TAKE],
  // -our for -or: emperour, errour, governour, inferiour, authour,
  // superiour, terrour, mediatour. This does NOT touch honour, colour,
  // saviour, favour, labour or neighbour: the library's translations use
  // both spellings, so all of those are in the lexicon already and
  // bestSpelling returns early for anything it holds.
  [/our$/, "or", SHIFT],
  // -aies for -ays: alwaies, daies, waies, saies, laies, plaies.
  [/aies$/, "ays", RESTORE],
  // neere, yeere, beere. The doubled e is a long vowel the modern
  // spelling writes "ea".
  [/eere/, "ear", SHIFT],
  // therfore, therof, therby, wherfore: the compositor dropped the e.
  [/^ther/, "there", RESTORE],
  [/vv/g, "w", RESTORE],
];

const MAX_DEPTH = 4;
const MAX_FRONTIER = 400;
const spellCache = new Map();

// Two steps of taking away, which the search cannot reach in one and
// which land on a real word one step earlier if it tries. "sinne" is
// "sin", but dropping the e gives "sinn" and collapsing the n gives
// "sine" — both one step, and "sine" is in the dictionary. In a
// theological library that is not a spelling mistake, it is a
// different subject.
/* Early Modern spellings the rules cannot reach, and the modern word.
 *
 * Curated 2026-09-11 from a frequency count over 300 Early English Books
 * works (16.6M running words). Every entry below was seen at least 120
 * times; they are listed roughly in that order so the weight of the list
 * is visible. The rules in REWRITES handle the regular classes (u/v,
 * i/j, -ely, -our, -aies); what is left here is irregular and has to be
 * written down.
 *
 * Deliberately NOT in this list, and they show up high in the same
 * count, so this is a decision and not an oversight:
 *
 *   Law French and legal Latin. feoffment, feoffor, seisin, seisina,
 *   disseisin, disseisor, advowson, attornment, villein, homagium,
 *   warantum, querens, petens, assisa. These are terms of art in the
 *   year books and the abridgements, they are still spelled this way in
 *   legal history, and "modernising" them would be an error.
 *
 *   Proper nouns, except where the modern form is not in doubt. sathan
 *   and esay are here; glocester, paules, lewes, montaigu and pequin
 *   are not, because a place or a person is entitled to its own
 *   spelling and we would be guessing.
 *
 *   Scanning debris. dly, eing, upo, betw, cuph, duw, heic, euist,
 *   ghour. A word list cannot repair a bad transcription, and pretending
 *   to would hide the damage rather than show it.
 *
 *   Ambiguous forms. "powre" is power or pour and the page decides;
 *   "stile" is style or stile; "smart" and "amity" and "conceited" and
 *   "ordnance" are modern words already. Left as printed.
 */
const SETTLED = {
  sinne: "sin", synne: "sin", sinnes: "sins", synnes: "sins",

  // Doubled and dropped consonants
  councell: "council", councels: "councils", councel: "council",
  battel: "battle", battaile: "battle", battayle: "battle",
  cattell: "cattle", cattel: "cattle", wals: "walls", cals: "calls",
  litle: "little", littl: "little", shal: "shall",
  maner: "manner", mannor: "manner", colledge: "college",
  knowledg: "knowledge", bigness: "bigness",

  // e where the modern word has none, and the reverse
  vertue: "virtue", vertues: "virtues", vertuous: "virtuous",
  countrey: "country", countreys: "countries",
  sence: "sense", beeing: "being", seing: "seeing",
  wisedome: "wisdom", commandement: "commandment",
  commandements: "commandments", commaundement: "commandment",
  ministerie: "ministry", ministery: "ministry",
  governement: "government", falshood: "falsehood",
  houshold: "household", wholsome: "wholesome",
  extreame: "extreme", extream: "extreme", speach: "speech",
  boke: "book", kepe: "keep", dede: "deed", herte: "heart",
  eche: "each", geve: "give", geven: "given", quene: "queen",
  yere: "year", yeer: "year", yeers: "years", yeres: "years",
  moneths: "months", shoare: "shore", neer: "near",
  tast: "taste", sute: "suit", vail: "veil", hony: "honey",
  grete: "great", deth: "death", thow: "thou", theim: "them",

  // -ed and -ing the compositor contracted
  entred: "entered", entring: "entering",
  threatned: "threatened", threatning: "threatening",
  threatnings: "threatenings",
  remembred: "remembered", remembring: "remembering",
  rendred: "rendered", rendring: "rendering",
  administred: "administered", ministred: "ministered",
  numbred: "numbered", hindred: "hindered", hapned: "happened",
  quickned: "quickened", quickning: "quickening",
  hardned: "hardened", fastned: "fastened", enlightned: "enlightened",
  wandring: "wandering", setled: "settled", caried: "carried",
  stopt: "stopped", lookt: "looked", mixt: "mixed", fixt: "fixed",
  drawen: "drawn", knowen: "known", devided: "divided",

  // s and z, c and t, and the -tion spellings
  seised: "seized", suspition: "suspicion", ascention: "ascension",
  apostacy: "apostasy", subiection: "subjection", iniuries: "injuries",
  choise: "choice", pretious: "precious", gratious: "gracious",
  prophane: "profane", physitian: "physician",

  // per- and pre- that were written with a w or an i
  perswade: "persuade", perswaded: "persuaded",
  perswasion: "persuasion", perswasions: "persuasions",

  // in- and en-, im- and em-
  encrease: "increase", encreased: "increased",
  imployed: "employed", imploy: "employ", imployment: "employment",
  indure: "endure", indued: "endued", imbrace: "embrace",
  intreated: "entreated", intituled: "entitled", injoy: "enjoy",
  intire: "entire", injust: "unjust", uncapable: "incapable",
  unpossible: "impossible",

  // where-, there- and some- compounds
  wherof: "whereof", wherin: "wherein", wherby: "whereby",
  wheras: "whereas", wherfore: "wherefore", wherevpon: "whereupon",
  somtimes: "sometimes", somwhat: "somewhat", whenas: "when",

  // -ly
  expresly: "expressly", immediatly: "immediately", falsly: "falsely",
  meerly: "merely", wholy: "wholly", throughly: "thoroughly",
  publickly: "publicly", publikely: "publicly", fiftly: "fifthly",

  // -our and -ck plurals the single-word rules miss
  errours: "errors", authours: "authors", superiours: "superiors",
  ambassadours: "ambassadors", successours: "successors",
  hereticks: "heretics", heretikes: "heretics",
  heretiques: "heretics", heretickes: "heretics",

  // th for d, and other consonant swaps
  burthen: "burden", burthens: "burdens",
  murther: "murder", murthered: "murdered",

  // Long vowels spelled with a digraph
  bloud: "blood", bloude: "blood", bloudy: "bloody", floud: "flood",
  raigne: "reign", raigned: "reigned",
  soveraigne: "sovereign", soveraign: "sovereign",
  soveraignty: "sovereignty", supream: "supreme", compleat: "complete",
  cloath: "cloth", cloathed: "clothed", cloaths: "clothes",
  cloathing: "clothing", smoak: "smoke", aboord: "aboard",
  streight: "straight", waight: "weight", hainous: "heinous",
  apparant: "apparent", desart: "desert", margent: "margin",
  seaven: "seven", fourty: "forty", fift: "fifth",
  shepheard: "shepherd", schollers: "scholars", sheriffe: "sheriff",
  friers: "friars", frier: "friar", earles: "earls",
  reliques: "relics", tearmes: "terms", accompt: "account",
  woful: "woeful", wofull: "woeful", fearefull: "fearful",
  enimies: "enemies", sutable: "suitable", yong: "young",
  thorow: "through", togither: "together", antient: "ancient",
  ecclesiasticall: "ecclesiastical", apostolique: "apostolic",
  catholike: "catholic", alledge: "allege", alledged: "alleged",
  alleadged: "alleged", beleve: "believe", praier: "prayer",
  praiers: "prayers", toke: "took", iland: "island", ilands: "islands",
  divel: "devil", divels: "devils", maister: "master",
  mayster: "master", souldier: "soldier", souldiers: "soldiers",
  priviledge: "privilege", priviledges: "privileges",
  passeover: "Passover", sabboth: "Sabbath",

  // Spellings of the auxiliaries and function words
  shulde: "should", shuld: "should", shold: "should",
  sholde: "should", wolde: "would", wold: "would",
  bycause: "because", bicause: "because", whan: "when",
  yow: "you", sith: "since", whiles: "while", nother: "neither",

  // Names whose modern form is not in doubt
  sathan: "Satan", esay: "Isaiah", isay: "Isaiah", jerom: "Jerome",

  /* Forms the LEXICON was vouching for, so no rule could ever reach
   * them: bestSpelling returned early on anything the harvested word
   * list called modern. Found by counting the corpus a second time
   * WITHOUT excluding lexicon words, which is where they were hiding.
   * "bee" alone is 19,286 occurrences in 150 works.
   *
   * Only the unambiguous ones are taken. The same scan proposed
   * use -> us, note -> not, fore -> for, haste -> hast, fare -> far,
   * sine -> sin and diverse -> divers, every one of which would break a
   * common modern word to fix a rarer archaic one. A terminal -e is only
   * safe to drop when what is left is the obviously intended word and
   * the form itself is not modern English. */
  bee: "be", ende: "end", lande: "land", parte: "part", newe: "new",
  sorte: "sort", stande: "stand", regarde: "regard", seconde: "second",
  schisme: "schism", credite: "credit", arte: "art",
  christe: "Christ", neuer: "never",
};

// Fewest changes wins, so the search goes breadth first and stops at
// the first depth that lands on a real word. Anything else would let a
// four-step mangling beat a one-step correction. Within a depth the
// rank above decides, so a deletion is preferred to a vowel swap.
function bestSpelling(lower) {
  // SETTLED is consulted BEFORE the lexicon, because it is a decision
  // somebody made and the lexicon is a guess harvested from prose.
  //
  // The two disagree more often than you would hope. The lexicon is
  // built from the English lane of the Latin works, and that lane
  // carries archaic renderings, quoted Early Modern passages and some
  // untranslated Latin, so forms like "obiect", "doeth", "neuer",
  // "subiect" and "iohn" are all in it at five works or more. Any word
  // the lexicon wrongly believes is modern was previously returned
  // untouched here, which is why several of them survived every rule in
  // the table above.
  if (SETTLED[lower]) return SETTLED[lower];
  if (KNOWN.has(lower)) return null;
  let frontier = [lower];
  const seen = new Set([lower]);
  for (let d = 0; d < MAX_DEPTH; d += 1) {
    const next = [];
    let hit = null;
    let hitRank = Infinity;
    for (let i = 0; i < frontier.length; i += 1) {
      for (let r = 0; r < REWRITES.length; r += 1) {
        const t = frontier[i].replace(REWRITES[r][0], REWRITES[r][1]);
        if (t === frontier[i] || t.length < 2 || seen.has(t)) continue;
        seen.add(t);
        if (COMMON.has(t)) {
          if (REWRITES[r][2] < hitRank) { hit = t; hitRank = REWRITES[r][2]; }
          continue;
        }
        if (next.length < MAX_FRONTIER) next.push(t);
      }
    }
    // Every candidate at this depth has been seen before anything is
    // returned, or the rank cannot be compared against rules that
    // happen to sit later in the array.
    if (hit) return hit;
    if (!next.length) break;
    frontier = next;
  }
  return null;
}

function matchWordCase(src, repl) {
  if (src === src.toUpperCase() && src !== src.toLowerCase()) return repl.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return repl.charAt(0).toUpperCase() + repl.slice(1);
  return repl;
}

// A macron stands for a following n or m: "cā" is can, "Testamēt" is
// Testament, "cōpany" is company. Which of the two it is depends on
// the word, so both are offered to the dictionary and n is the
// fallback, being far the commoner.
function expandMacrons(word) {
  if (!MACRON_RE.test(word)) return null;
  MACRON_RE.lastIndex = 0;
  const withN = word.replace(MACRON_RE, (c) => `${MACRON[c]}n`);
  const withM = word.replace(MACRON_RE, (c) => `${MACRON[c]}m`);
  if (KNOWN) {
    if (KNOWN.has(withN.toLowerCase())) return withN;
    if (KNOWN.has(withM.toLowerCase())) return withM;
    const n = bestSpelling(withN.toLowerCase());
    if (n) return matchWordCase(withN, n);
    const m = bestSpelling(withM.toLowerCase());
    if (m) return matchWordCase(withM, m);
  }
  return withN;
}

const WORD_RE = /[A-Za-zÀ-ɏāēīōū]+/g;

function modernizeSpelling(text) {
  if (!text) return text;
  return String(text).replace(WORD_RE, (word) => {
    const macron = expandMacrons(word);
    const w = macron === null ? word : macron;
    if (!KNOWN) return w;
    const lower = w.toLowerCase();
    if (spellCache.has(lower)) {
      const hit = spellCache.get(lower);
      return hit ? matchWordCase(w, hit) : w;
    }
    const found = bestSpelling(lower);
    spellCache.set(lower, found);
    return found ? matchWordCase(w, found) : w;
  });
}

  root.FaithModernize = {
    modernizeText, modernizeParagraphs, hasArchaicLanguage,
    modernizeSpelling, setLexicon,
    get hasLexicon() { return !!KNOWN; },
  };
})(window);
