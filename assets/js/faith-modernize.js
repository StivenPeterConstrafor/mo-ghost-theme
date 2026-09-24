/* The English Modernizer: Early Modern English into modern English.
 *
 * Deterministic and client-side. It modernizes; it does not paraphrase.
 * Three layers, run on one token stream:
 *
 *   1. Grammar in context: thou/thee/thy/ye, the -eth and -est verbs,
 *      hath/doth/art, inverted questions ("Knowest thou" -> "Do you
 *      know"), imperatives ("Go ye" -> "Go"), 'tis, o'er, then-for-than,
 *      ye-for-the, lye/dye.
 *   2. A spelling map of Early Modern variants (archaic-map.txt), built
 *      offline by scripts/build-archaic-map.mjs and gated for precision.
 *   3. Spelling rules (u/v, i/j, -ie, -ick, doubled letters...), which
 *      only ever land on a word the library's own lexicon knows.
 *
 * WHY A TOKEN ENGINE, NOT A LIST OF REGEXES (rebuilt 2026-09-24). The
 * reader modernizes text NODES, and an Early Modern page is cut into
 * nodes at every italic: Owen prints "Ye; if <i>Ye Mortify.</i>", and an
 * early compositor's superscript "the" arrives as "y<i>e</i>". A rule
 * run node by node cannot see "if" beside "Ye", or that "y" and "e" are
 * one word. modernizeRuns() takes all the nodes of a block, decides on
 * the whole, and hands each node back its own share of the result.
 *
 * Sources. The spelling map draws on MorphAdorner's Early Modern English
 * spelling pairs and lexicon (Northwestern University, NCSA licence; see
 * the header of archaic-map.txt), filtered to forms that occur in this
 * library and checked against it. The rules began as a port of
 * cvs4bz49sb-oss/heidelberg/lib/modernize.ts.
 */
(function (root) {
  "use strict";

// ─── Lexicon state ──────────────────────────────────────────────────────

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
// variant -> modern, and variant -> flags ("n": the variant is also a
// modern noun, so it is left alone after a determiner: "a bee", "a doe").
let MAP = null;
let MAPFLAG = null;
const spellCache = new Map();

function setLexicon(common, known) {
  COMMON = common instanceof Set ? common : new Set(common);
  KNOWN = known ? (known instanceof Set ? known : new Set(known)) : COMMON;
  // Archaic forms quoted often enough in the translations to be
  // harvested as modern. They are not.
  ["hym", "hem", "ony", "seyd", "thei", "wol", "nat", "mene", "sut"]
    .forEach((w) => { COMMON.delete(w); KNOWN.delete(w); });
  spellCache.clear();
}

// archaic-map.txt: "#" comment lines, then "variant<TAB>modern[<TAB>flags]".
function setArchaicMap(text) {
  MAP = new Map();
  MAPFLAG = new Map();
  String(text || "").split("\n").forEach((line) => {
    if (!line || line.charCodeAt(0) === 35) return;
    const p = line.split("\t");
    if (p.length < 2 || !p[0] || !p[1]) return;
    MAP.set(p[0], p[1]);
    if (p[2]) MAPFLAG.set(p[0], p[2]);
  });
  spellCache.clear();
}

// ─── Grammar tables ─────────────────────────────────────────────────────

// Every lookup table is prototype-free: "constructor" and "toString" are
// words, and on a plain object they are also functions.
function dict(o) { return Object.assign(Object.create(null), o); }

/* Spellings of the grammar words, folded to one key before any rule
 * looks at them. "yee" and "yée" are ye; "sayth" is saith; the
 * apostrophe forms are the -est and -st forms written short. */
const ALIAS = dict({
  yee: "ye", "yée": "ye", "yé": "ye",
  thow: "thou", thowe: "thou", thoue: "thou",
  thyne: "thine", thyn: "thine",
  thyselfe: "thyself", thyselve: "thyself",
  hathe: "hath", haith: "hath", hath: "hath",
  dothe: "doth", dooth: "doth", doeth: "doeth", dooeth: "doeth",
  doest: "doest", dooest: "doest", doost: "doest", doste: "doest", "do'st": "doest", dost: "doest",
  didest: "didst", diddest: "didst", "did'st": "didst", dydst: "didst", diddst: "didst",
  hadest: "hadst", haddest: "hadst", "had'st": "hadst",
  wylt: "wilt", wilte: "wilt", wylte: "wilt",
  shalte: "shalt",
  canste: "canst", cannest: "canst", "can'st": "canst",
  sayth: "saith", saythe: "saith", saieth: "saith", sayeth: "saith", seith: "saith", saithe: "saith", seyth: "saith",
  arte: "art",
  werte: "wert",
  mayest: "mayst", maist: "mayst", "may'st": "mayst", maiest: "mayst", mayste: "mayst",
  mightest: "mightst", "might'st": "mightst",
  wouldest: "wouldst", woldest: "wouldst", "would'st": "wouldst", wouldste: "wouldst",
  couldest: "couldst", "could'st": "couldst", coudest: "couldst",
  shouldest: "shouldst", "should'st": "shouldst", shuldest: "shouldst", sholdest: "shouldst",
  "need'st": "needest", "dar'st": "darest", "wast": "wast",
  shal: "shall", shalbe: "shall be", schal: "shall",
});

/* Unconditional replacements, keyed on the folded form. Everything here
 * has one modern reading; anything that depends on its neighbours is
 * decided in modernWordAt() instead. */
const GRAMMAR = dict({
  nought: "nothing", naught: "nothing", aught: "anything", wot: "know",
  wotteth: "knows", harken: "listen", harkened: "listened", harkeneth: "listens",
  // pronouns
  thou: "you", thee: "you", thy: "your", thyself: "yourself",
  // auxiliaries, second and third person
  hath: "has", doth: "does", doeth: "does", hast: "have", hadst: "had",
  didst: "did", doest: "do", wast: "were", wert: "were",
  wilt: "will", shalt: "will", canst: "can", couldst: "could",
  wouldst: "would", shouldst: "should", mayst: "may", mightst: "might",
  oughtest: "ought", needest: "need", darest: "dare", durst: "dared",
  saith: "says", sayest: "say", quoth: "said",
  // "shall" reads as a legal term now; modern English says "will"
  // (Ian, 2026-09-24). "Shall we" becomes "Will we", which still reads.
  shall: "will", "shall be": "will be",
  // prepositions, conjunctions, adverbs
  unto: "to", whilst: "while", whilest: "while", amongst: "among",
  betwixt: "between", whence: "from where", thence: "from there",
  hither: "here", thither: "there", whither: "where",
  whereof: "of which", wherein: "in which", whereby: "by which",
  whereunto: "to which", wherewith: "with which",
  hereof: "of this", herein: "in this", hereby: "by this", hereunto: "to this",
  thereof: "of it", therein: "in it", thereby: "by that", thereunto: "to it",
  therewith: "with it", thereupon: "then",
  hitherto: "until now", thenceforth: "from then on", henceforth: "from now on",
  forasmuch: "since", inasmuch: "since", insomuch: "so much so",
  peradventure: "perhaps", perchance: "perhaps", verily: "truly",
  yea: "yes", nay: "no", lo: "look",
  whatsoever: "whatever", whosoever: "whoever", wheresoever: "wherever",
  whensoever: "whenever", howsoever: "however", whoso: "whoever",
  whomsoever: "whomever", whichsoever: "whichever",
  howbeit: "however", withal: "as well", heretofore: "previously",
  aforetime: "previously", forthwith: "immediately", fain: "gladly",
  ere: "before", anon: "soon", albeit: "although", methinks: "I think",
  forsooth: "indeed", oft: "often", ofttimes: "often", oftentimes: "often",
  twain: "two", sith: "since",
  // nouns and adjectives
  brethren: "brothers", sundry: "various", divers: "various",
  // verbs
  beseech: "implore", besought: "implored", vouchsafe: "grant",
  vouchsafed: "granted", vouchsafeth: "grants", hearken: "listen",
  hearkened: "listened", hearkeneth: "listens", hearkening: "listening",
  hearkenest: "listen",
  spake: "spoke", brake: "broke", sware: "swore", digged: "dug",
  holpen: "helped", builded: "built", wist: "knew",
  shew: "show", shewed: "showed", shewn: "shown", shewing: "showing",
  shews: "shows", sheweth: "shows", shewest: "show", shewbread: "showbread",
  // the contractions, once the apostrophe has been read
  tis: "it is", twas: "it was", twere: "it were", twill: "it will",
  twould: "it would", "o'er": "over", "e'er": "ever", "ne'er": "never",
  "e'en": "even", tho: "though", altho: "although", thro: "through",
  "'em": "them", gainst: "against", mongst: "among",
});

/* Words ending in -eth that are not verbs. The engine also refuses any
 * -eth rewrite that does not land on a word the lexicon knows, so this
 * list only has to hold the ones that would: "teeth" -> "tees",
 * "twentieth" -> "twenties". */
const ETH_EXCEPTIONS = new Set((
  "beneath underneath nazareth shibboleth elizabeth elisabeth seth beth " +
  "meth teeth hundredth thousandth death heath sheath wreath breath " +
  "twentieth thirtieth fortieth fiftieth sixtieth seventieth eightieth " +
  "ninetieth macbeth kenneth gareth japheth heth lameth asenath " +
  "ashtoreth gennesareth hazareth nebaioth"
).split(" "));

/* Words that introduce a superlative. If one of these sits immediately
 * before a word ending in -est, that word is an adjective and not an
 * archaic second person verb. A closed class. */
const SUPERLATIVE_MARKERS = new Set((
  "the a an this that these those my your his her its our their thy thine " +
  "mine whose one ones of in at by for with very most much far second " +
  "third next last and or but is was are were be been being art o oh " +
  "god's christ's lord's man's"
).split(" "));

const EST_EXCEPTIONS = new Set((
  "best rest test nest west east feast beast least yeast breast quest " +
  "guest pest jest zest vest crest chest forest interest modest honest " +
  "earnest harvest contest protest digest manifest request suggest " +
  "arrest priest invest attest conquest tempest midwest northwest " +
  "southeast southwest northeast outpost dishonest detest molest infest " +
  "divest unrest behest bequest incest wrest blest almagest lest " +
  "against amongst must just first most worst host post ghost cost lost " +
  "honest christ antichrist list mist fist twist wrist exist insist " +
  "resist persist assist consist subsist desist enlist amethyst whist " +
  "cast fast last past vast mast east least beast feast yeast boast " +
  "coast roast toast trust lust dust rust gust just bust thrust " +
  "august robust adjust entrust mistrust distrust unjust"
).split(" "));

// Determiners: "a bee", "the doe", "this art" are nouns.
const DETERMINERS = new Set((
  "a an the this that these those my your his her its our their thy " +
  "thine mine every each one no some any another whose such what which"
).split(" "));

// Prepositions after which a bare "ye" is the article: "of ye world".
const PREP_THE = new Set((
  "of in into to unto by for from with on upon at through over under " +
  "against among before after about betwixt between within without " +
  "towards toward concerning touching beyond above beneath behind " +
  "throughout"
).split(" "));

// Words that follow the PRONOUN ye rather than the article: "in ye all",
// "unto ye that", "to ye, and".
const YE_PRONOUN_NEXT = new Set((
  "all both selves self yourselves not that which who whom and or but " +
  "nor is are was were shall will have be may can might must should " +
  "would do did know see also therefore then to only alone too again " +
  "likewise first now so as if when because for whose ought need " +
  "being having yet even also shal wil wyll maye cannot hath doth " +
  "your you"
).split(" "));

// Auxiliaries that invert with their subject in a question: "Are ye",
// "Hast thou". Only the pronoun changes after these.
const AUX_INVERT = new Set((
  "art are is was were wast wert hast have has had hadst dost do does " +
  "did didst doest doth shalt shall will wilt canst can couldst could " +
  "wouldst would shouldst should mayst may mightst might must oughtest " +
  "ought needest darest durst"
).split(" "));

/* Verbs used in the imperative with a pronoun after them: "Go ye",
 * "Be thou faithful", "Praise ye the Lord". Modern English drops the
 * pronoun. Collected from the corpus (every "Verb ye/thou" at the head
 * of a clause), then read through by hand. */
const IMPERATIVE = new Set((
  "go come be bless take know praise sit say pray open hear behold " +
  "prepare seek see drink turn make put give return beware look fear " +
  "awake think enter rule remember stand depart judge receive restore " +
  "tell follow save call rejoice heal speak use tarry watch hold lift " +
  "command hearken continue get consider cease arise cast cover glorify " +
  "write repent believe wash sing love keep ask walk trust wait stay " +
  "flee gird lay bring draw cry shout serve remain abide learn mark " +
  "marvel mortify hope set run cleanse purge sanctify submit forgive " +
  "leave let buy eat fight fly hasten strive labour labor search " +
  "sow reap build plant shine rise seek suffer try prove teach thank " +
  "worship magnify exalt extol honour honor show shew declare publish " +
  "choose hide seal stir shake loose bind feed lead send stretch " +
  "reach touch taste smell listen harden humble return depart comfort " +
  "strengthen deliver redeem preserve defend help"
).split(" "));

// What may follow the pronoun of an imperative: an object, a place, an
// adverb. Anything else ("Come ye blessed") makes the pronoun a vocative.
const IMPERATIVE_NEXT = new Set((
  "the a an my his her our your their thy thine this that these those " +
  "to unto into in out up down forth away not therefore now first also " +
  "and me him them us it before after from with upon on over by for of " +
  "here there thither hither near nigh home again all every no one some " +
  "any god christ jesus lord him her yourselves ye you thee"
).split(" "));

// Words after which a verb begins its own clause.
const CLAUSE_LEAD = new Set((
  "and but o oh then therefore now wherefore yea nay lo behold " +
  "therfore wherfore"
).split(" "));

// Wh-words that front a question: "What think ye", "Whither goest thou".
const WH = new Set((
  "what why whom who which where whither whence how wherefore when " +
  "whose"
).split(" "));

// Past tenses whose present is needed for "did you ...".
const PAST_BASE = dict({
  saw: "see", knew: "know", heard: "hear", said: "say", came: "come",
  went: "go", gave: "give", took: "take", made: "make", found: "find",
  thought: "think", spoke: "speak", spake: "speak", told: "tell",
  wrote: "write", brought: "bring", sent: "send", sought: "seek",
  taught: "teach", left: "leave", kept: "keep", slew: "slay",
  did: "do", had: "have", was: "be", were: "be", ate: "eat",
  drank: "drink", stood: "stand", sat: "sit", fell: "fall",
  begat: "beget", bare: "bear", bore: "bear", forsook: "forsake",
  laid: "lay", ran: "run",
  rose: "rise", sang: "sing", spent: "spend", suffered: "suffer",
});

// Comparatives that "then" follows when it means "than".
const COMPARATIVE = new Set((
  "more less lesse rather better worse greater other otherwise else " +
  "sooner further farther higher lower larger longer fewer stronger " +
  "weaker elder older younger easier harder sweeter lesser mo moe " +
  "rathere bettre"
).split(" "));
const COMPARATIVE_FAR = new Set("more less lesse rather other otherwise else better worse greater".split(" "));

// A "then" that is followed by one of these is the adverb: "more then
// shall we", "better then let us".
const THEN_ADVERB_NEXT = new Set("shall will should would may might can could must doth hath did let shal".split(" "));

// Context for dye (colour) and lye (the alkali).
const DYE_CONTEXT = new Set((
  "scarlet purple crimson red colour colours color colors coloured " +
  "colored cloth cloths clothes wool woollen silk garment garments robe " +
  "robes vesture vestures raiment grain vat dyer dyers hue hues tincture " +
  "stained stain blue black yellow green violet vermilion skins skin " +
  "rams linen fleece fleeces tapestry dyeing"
).split(" "));
const LYE_CONTEXT = new Set("soap sope nitre ashes lixivium wash washing lees potash".split(" "));

// The lye and dye families.
const LYE = dict({ lye: "lie", lyes: "lies", lyeth: "lies", lyed: "lied", lyeing: "lying", lyen: "lain" });
const DYE = dict({ dye: "die", dyes: "dies", dyeth: "dies", dyed: "died", dyest: "die", dy: "die" });

// Abbreviations: a word printed with a full stop after it that is one of
// these is a reference ("Rom. 8.13", "Judg. 8. 16", "vers. 5", "chap. 3")
// and is never respelled.
const ABBREV = new Set((
  "gen exod exo ex lev levit num numb deut josh jos judg jud iudg ruth sam " +
  "kin kings kgs chron chr neh nehem esth est ps psal psalm prov pro eccl " +
  "eccles eccle cant isa esa esai jer jerem ier lam ezek ezech dan hos " +
  "obad jon mic nah hab zeph soph hag zech zach mal matt mat math mar marc " +
  "luk luc joh ioh act rom cor gal eph ephes phil philip col coloss thess " +
  "thes tim tit philem heb hebr jam iam jac pet jud rev apoc apocal macc " +
  "mac tob ecclus sirac wisd bar ch chap cap lib tom pag pp fol vers ver " +
  "vid cf ib ibid sect q qu resp answ ans obj sol viz serm cont dr mr st " +
  "sr ep epist hom serm tract disp dist lect art cor"
).split(" "));

// Latin that EEBO quotes inline. A word next to one of these is in a
// Latin sentence and its spelling is not ours to modernize.
const LATIN_FN = new Set((
  "et est non ut quod qui quae quam sed cum per sunt enim autem vel aut " +
  "nec esse hoc ita sic etiam tamen ergo igitur quia nisi atque ac eius " +
  "eorum ipse ipsa ipsum omnes omnia nobis vobis quo qua quibus sine sub " +
  "inter contra post ante apud propter secundum dominus domini deus dei " +
  "deo christi ecclesiae fidei gratiae spiritus sancti erat fuit sit " +
  "ab quoque neque nunc tunc ibi ubi unde " +
  // and German and French, which the modern collections quote
  "der das und ist nicht mit von dem ein eine einer auf für sich auch als " +
  "wie aus wir über nach bei oder wird sind wurde haben werden dass daß " +
  "noch nur schon diese dieser einem einen seine seiner ihre durch gegen " +
  "unter zwischen les des du une dans pour que sur avec cette pas par aux " +
  "leur nous vous elle ils sont été être"
).split(" "));

const EN_FN = new Set((
  "the and of to in a is that he it with as for his be not by this but " +
  "which are or from they we all have was will their him so shall them " +
  "may if no our you there were been has had her she its my me us who " +
  "what when then than your yt ye wt thy thee thou hath doth hys hym " +
  "theyr thei the whiche which whych also other every such into upon " +
  "unto vnto vpon great good god lord men man one two three"
).split(" "));

// "our selves" -> "ourselves".
const SELF_HEAD = dict({ yt: "it", my: "my", thy: "your", your: "your", our: "our", him: "him", her: "her", it: "it", them: "them", hym: "him", hyr: "her", oure: "our", youre: "your", theyr: "them", thē: "them" });
const SELF_TAIL = dict({ self: "self", selfe: "self", selves: "selves", selues: "selves", selfes: "selves", selfs: "selves" });

// Two-word spellings of one modern word.
const JOIN2 = dict({
  "to morrow": "tomorrow", "to day": "today", "any thing": "anything",
  "every thing": "everything", "can not": "cannot", "in stead": "instead",
  "no where": "nowhere", "every where": "everywhere",
  "any where": "anywhere", "some what": "somewhat", "well nigh": "nearly",
  "a nother": "another", "in steede": "instead", "in steed": "instead",
  "some times": null,
});

// ─── Spelling ───────────────────────────────────────────────────────────

const RESTORE = 0;
const TAKE = 1;
const SHIFT = 2;

const REWRITES = [
  // darkenes, weakenesse, likenes: the -nesse ending, before "es" -> "s"
  // can make a verb of it ("darkens")
  [/enes(se)?$/, "ness", RESTORE],
  [/enes(se)?$/, "eness", RESTORE],
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
const SETTLED = dict({
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
});

// Fewest changes wins, so the search goes breadth first and stops at
// the first depth that lands on a real word. Anything else would let a
// four-step mangling beat a one-step correction. Within a depth the
// rank above decides, so a deletion is preferred to a vowel swap.
const SHORT_TARGETS = new Set((
  "a i an as at be by do go he if in is it me my no of on or so to up us " +
  "we all and any are but can did for get god had has her him his how its " +
  "may men new nor not now one our out own put see set she sin son sun " +
  "the too two use was way who why yet you day end eye few law let man old " +
  "say sea lie die run sat saw ask add arm art bad bed bid big box boy buy " +
  "cry cut dog due ear eat egg era err far fed fee fit fly fox fur gap gas " +
  "gun hat hid hot ill joy key kin lay led leg lip lot low mad met mix net " +
  "nor oak odd oil owe pay pen pit pot raw red rid rob rod row sad sew shy " +
  "sit six sky son sow tax tea ten tie tin top toy try urn war wax web wet " +
  "win wit woe yea yes ye"
).split(" "));

function bestSpelling(lower, evenIfKnown) {
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
  if (KNOWN.has(lower) && !evenIfKnown) return null;
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
        // A rule may only land on a short word that is a word people
        // use: "hee" -> "he" and "vs" -> "us", never "hete" -> "het".
        if (COMMON.has(t) && (t.length > 3 || SHORT_TARGETS.has(t))) {
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


// Forms added 2026-09-24 that the rules cannot reach and the map should
// not have to carry: the -xion spellings (Ian: "Connexion" should be
// "Connection"; complexion, crucifixion, fluxion keep their x), and the
// Early Modern nouns that end in -eth and so look like verbs.
Object.assign(SETTLED, {
  connexion: "connection", connexions: "connections",
  inflexion: "inflection", inflexions: "inflections",
  reflexion: "reflection", reflexions: "reflections",
  deflexion: "deflection", deflexions: "deflections",
  genuflexion: "genuflection", genuflexions: "genuflections",
  trueth: "truth", truethe: "truth", treuth: "truth",
  onely: "only", selfe: "self", selves: "selves",
  moneth: "month", monethes: "months", moneths: "months", moo: "more",
  fulnesse: "fullness", fulnes: "fullness", fulness: "fullness",
  seinge: "seeing", seynge: "seeing", seyng: "seeing", seyinge: "seeing", seeinge: "seeing",
  aswel: "as well", aswell: "as well", asmuch: "as much", asmuche: "as much",
  longe: "long", lōge: "long", pyling: "piling", pyled: "piled", lifes: "lives", wifes: "wives", knifes: "knives", catcht: "caught",
  thorowe: "through", thorowly: "thoroughly", awne: "own",
  trouth: "truth", trouthe: "truth", darkenes: "darkness",
  darkenesse: "darkness", weakenes: "weakness", mannes: "man's",
  mennes: "men's", deades: "deeds", paules: "Paul's", warres: "wars",
  fayre: "fair", winne: "win", wynne: "win", cyte: "city", cytes: "cities",
  hundreth: "hundred", alwaye: "always", alway: "always", godes: "God's",
  feale: "feel", inne: "in", paule: "Paul", iohn: "John", iames: "James",
  perte: "part", numbre: "number", pistles: "epistles", pistle: "epistle",
  jugeth: "judges", juge: "judge", juges: "judges", myddes: "midst", spryte: "spirit",
  sprete: "spirit", deeth: "death", dampned: "damned", dampnacion: "damnation",
  dampnation: "damnation", dampne: "damn",
  goddys: "God's", goddes: "God's", goddis: "God's", godds: "God's",
});

function matchWordCase(src, repl) {
  const letters = src.replace(/[^A-Za-zÀ-ɏ]/g, "");
  if (letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) {
    return repl.toUpperCase();
  }
  const first = letters.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return repl.charAt(0).toUpperCase() + repl.slice(1);
  }
  return repl;
}

// ─── Abbreviation marks ─────────────────────────────────────────────────
//
// A macron stands for a following n or m: "cā" is can, "Testamēt" is
// Testament, "cōpany" is company. EEBO prints it as a COMBINING macron
// (U+0304) far more often than as a precomposed letter: 27,686 of them
// in a 6M-word sample, none of which the old engine could see, because
// its word pattern stopped at the combining mark and cut "cō|maundement"
// in two. Over a consonant the stroke is a whole syllable ("sacram̄t").
// ꝭ is the -es/-is ending ("ordꝭ", "imagꝭ"), ꝯ is con/com.
const MARKS_RE = /[̄̃āēīōūȳĀĒĪŌŪꝭꝯ]/;
const VOWEL_MACRON = dict({ "ā": "a", "ē": "e", "ī": "i", "ō": "o", "ū": "u", "ȳ": "y" });

function markOptions(w) {
  // Returns the word split into fixed text and option lists.
  const parts = [];
  let buf = "";
  const chars = Array.from(w.normalize("NFC"));
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars[i];
    const lc = c.toLowerCase();
    if (VOWEL_MACRON[lc]) {
      parts.push(buf); buf = "";
      const v = VOWEL_MACRON[lc];
      parts.push([`${v}n`, `${v}m`]);
    } else if ((c === "̄" || c === "̃") && buf) {
      const prev = buf.slice(-1);
      buf = buf.slice(0, -1);
      parts.push(buf); buf = "";
      if (/[aeiouy]/.test(prev)) parts.push([`${prev}n`, `${prev}m`]);
      else if (prev === "p") parts.push(["p", "pre", "per", "pro"]);
      else parts.push([prev, `${prev}${prev}`, `${prev}en`, `${prev}e`]);
    } else if (c === "ꝭ") {
      parts.push(buf); buf = "";
      parts.push(["es", "is", "s"]);
    } else if (c === "ꝯ") {
      parts.push(buf); buf = "";
      parts.push(buf.length || parts.length > 2 ? ["us", "con", "com"] : ["con", "com", "us"]);
    } else if (c === "̄" || c === "̃") {
      // a stray mark with nothing before it
    } else {
      buf += c;
    }
  }
  parts.push(buf);
  return parts;
}

function expandMarks(w) {
  const parts = markOptions(w);
  let combos = [""];
  let optionSets = 0;
  for (const p of parts) {
    if (typeof p === "string") { combos = combos.map((c) => c + p); continue; }
    optionSets += 1;
    const take = optionSets > 3 ? [p[0]] : p;
    const next = [];
    for (const c of combos) for (const o of take) next.push(c + o);
    combos = next.slice(0, 64);
  }
  if (KNOWN) {
    // a decided spelling first ("lōge" -> "longe" -> "long"), then the
    // common word ("cōmon" -> "common"), then any word the lexicon knows
    for (const c of combos) {
      if (SETTLED[c]) return SETTLED[c];
      const m = MAP && MAP.get(c);
      if (m && m !== "=" && !contextFlag(c)) return SETTLED[m] || m;
    }
    for (const c of combos) if (COMMON.has(c)) return c;
    for (const c of combos) {
      if (!KNOWN.has(c)) continue;
      // known but not common ("longe"): let the rules finish it ("long")
      const r = bestSpelling(c, true);
      return r || c;
    }
    for (const c of combos) { const s = spellPlain(c); if (s) return s; }
    // an -eth verb under a macron: "cōmeth" -> "commeth"
    for (const c of combos) if (/eth$/.test(c) && ethForm(c)) return c;
    MARK_MISS.add(w);
  }
  return combos[0];
}
// Marked words whose expansion lands on nothing (Greek transliteration,
// "selēnēs"): no evidence that the block is Early Modern English.
const MARK_MISS = new Set();

// Flags that need the sentence to decide: n (a modern noun too) and 2
// (a second-person verb). Flag c (sometimes a name) is decided later,
// from the token's own capital, and does not stop a respelling here.
function contextFlag(w) {
  const f = MAPFLAG && MAPFLAG.get(w);
  return !!f && /[n2]/.test(f);
}
const hasFlag = (w, c) => !!(MAPFLAG && (MAPFLAG.get(w) || "").indexOf(c) >= 0);

function MAP_OR_SETTLED(w) {
  return !!(SETTLED[w] || (MAP && MAP.has(w) && !contextFlag(w)));
}

// Spelling of a plain (mark-free, lowercase) word: the settled list, then
// the map, then the lexicon, then the rules. null means "leave it".
function spellPlain(lo, noRules) {
  if (SETTLED[lo]) return SETTLED[lo];
  if (MAP && MAP.has(lo)) {
    const m = MAP.get(lo);
    // "=": a form the rules would get wrong ("denise" -> "denis"); leave it
    if (m === "=") return null;
    // a respelling can land on a word someone has already settled:
    // "unpossyble" -> "unpossible" -> "impossible"
    if (!contextFlag(lo)) return SETTLED[m] || m;
  }
  if (!KNOWN) return null;
  if (KNOWN.has(lo) || noRules) return null;
  return bestSpelling(lo);
}

// Modern spelling of one lowercase word, or null when it is already
// modern or cannot be placed. Cached; the same few thousand words make
// up most of any book.
// Two- and three-letter words under a macron, where n and m both make a
// word and only one of them is meant.
const MACRON_SHORT = dict({
  "hī": "him", "frō": "from", "whō": "whom", "ī": "in", "cā": "can",
  "mā": "man", "ād": "and", "thā": "than", "whā": "when", "whē": "when",
  "evē": "even", "vpō": "upon", "upō": "upon",
});
// Under a macron and still two words; left as printed.
const MACRON_KEEP = new Set(["nō"]);

function spellWord(lo) {
  if (spellCache.has(lo)) return spellCache.get(lo);
  const nfc = lo.normalize("NFC");
  if (MACRON_SHORT[nfc]) { spellCache.set(lo, MACRON_SHORT[nfc]); return MACRON_SHORT[nfc]; }
  if (MACRON_KEEP.has(nfc)) { spellCache.set(lo, null); return null; }
  let w = lo;
  let changed = false;
  if (w.indexOf("ſ") >= 0) { w = w.replace(/ſ/g, "s"); changed = true; }
  if (MARKS_RE.test(w)) { w = expandMarks(w); changed = true; }
  const s = spellPlain(w);
  const out = s || (changed ? w : null);
  spellCache.set(lo, out);
  return out;
}

// The legacy entry point: spelling only, word by word, no context. Kept
// for callers that still run it after modernizeText(); on text that
// modernizeText() has already produced it changes nothing.
const WORD_RE = /[A-Za-zÀ-ÖØ-öø-ɏ̀-ͯꝭꝯ]+/g;
function modernizeSpelling(text) {
  if (!text) return text;
  // Since the token engine, modernizeText() does the spelling too, and in
  // context; the old context-free pass would undo its decisions ("a bee"
  // is a bee, "Donne" is a name). Kept as a no-op-safe alias.
  if (KNOWN) return modernizeText(text);
  return String(text).replace(WORD_RE, (word) => {
    const found = spellWord(word.toLowerCase());
    return found && found.indexOf(" ") < 0 ? matchWordCase(word, found) : word;
  });
}

// ─── Verb morphology ────────────────────────────────────────────────────

function isVowel(c) { return "aeiou".indexOf(c) >= 0; }

// hop -> CVC, so "hopeth" is hope+th. open is not (e+n after p... it is,
// but "opene" is no word, and the lexicon decides).
function cvc(s) {
  const n = s.length;
  if (n < 3) return false;
  const a = s[n - 3], b = s[n - 2], c = s[n - 1];
  return !isVowel(a) && isVowel(b) && !isVowel(c) && "wxy".indexOf(c) < 0;
}

function stemCandidates(s0) {
  const out = [];
  const push = (b) => { if (b && b.length >= 1 && out.indexOf(b) < 0) out.push(b); };
  const last = s0.slice(-1);
  if (/(.)\1$/.test(s0) && !/(ss|ll|ff|zz)$/.test(s0)) {
    push(s0); push(s0.slice(0, -1)); push(`${s0.slice(0, -1)}e`);
  } else if (last === "v" || (last === "u" && s0.length > 2 && isVowel(s0.slice(-2, -1)))) {
    push(`${s0.slice(0, -1)}ve`); push(`${s0}e`);
  } else if (isVowel(last) || last === "y") {
    push(`${s0}e`); push(s0);
    if (last === "i") push(`${s0.slice(0, -1)}y`);
  } else if (cvc(s0)) {
    push(`${s0}e`); push(s0);
  } else {
    push(s0); push(`${s0}e`);
  }
  // "entreth", "suffreth", "remembreth": the printer dropped the e of -er
  if (/[bcdfghklmnpstvw]r$/.test(s0)) push(`${s0.slice(0, -1)}er`);
  return out;
}

function thirdPerson(b) {
  if (/(s|sh|ch|x|z|o)$/.test(b)) return `${b}es`;
  if (/[^aeiou]y$/.test(b)) return `${b.slice(0, -1)}ies`;
  return `${b}s`;
}

const verbCache = new Map();

// "loveth" -> "loves", "commeth" -> "comes", "beleeueth" -> "believes".
// Returns null unless the answer is a word the lexicon knows.
/* Choose the verb a stem stands for. Each candidate base is tried as it
 * stands and, if the lexicon does not know it, respelled ("beleeue" ->
 * "believe"). A candidate is graded: 1 if the inflected form is a common
 * word, 2 if the base is, 3 if both are merely known. The best grade
 * wins, then the order of the candidates, except that where a stem and
 * the same stem with a silent e both qualify ("breath"/"breathe",
 * "writ"/"write", "pleas"/"please") the e wins: the -eth and -est endings
 * were added to the verb, and the verb is the one with the e. A doubled
 * consonant ("sitteth") marks the short vowel and is never given an e. */
function pickVerb(s0, inflect) {
  if (!KNOWN) {
    const c = stemCandidates(s0)[0];
    return c ? inflect(c) : null;
  }
  const doubled = /(.)\1$/.test(s0) && !/(ss|ll|ff|zz)$/.test(s0);
  let best = null;
  const cands = stemCandidates(s0);
  for (let i = 0; i < cands.length; i += 1) {
    const raw = cands[i];
    let bases = [raw];
    const decided = SETTLED[raw] || (MAP && MAP.has(raw) && MAP.get(raw) !== "=");
    if (!KNOWN.has(raw) || decided) {
      const sp = spellWord(raw);
      if (sp && sp.indexOf(" ") < 0 && /^[a-z]+$/.test(sp)) {
        // a decided respelling replaces the old form: "entre" is "enter"
        bases = decided ? [sp] : [raw, sp];
      }
    }
    for (const b of bases) {
      const f = inflect(b);
      const grade = COMMON.has(f) && COMMON.has(b) ? 1 : COMMON.has(f) || COMMON.has(b) ? 2 : KNOWN.has(f) && KNOWN.has(b) ? 3 : 0;
      if (!grade) continue;
      if (b.length < 3 && !/^(go|do|be|see|lie|die|say)$/.test(b)) continue;
      const archaic = !!SETTLED[b] || !!(MAP && MAP.has(b));
      if (!best || grade < best.grade ||
          (grade === best.grade && !doubled && !archaic && b === `${best.base}e`)) {
        best = { grade, base: b, form: f };
      }
    }
  }
  return best;
}

function ethForm(lo) {
  const key = `3:${lo}`;
  if (verbCache.has(key)) return verbCache.get(key);
  let out = null;
  let w = lo;
  if (/yth$/.test(w) && w.length >= 5) w = `${w.slice(0, -3)}eth`;
  if (w.length >= 5 && w.endsWith("eth") && !ETH_EXCEPTIONS.has(w)) {
    const best = pickVerb(w.slice(0, -3), thirdPerson);
    out = best ? (typeof best === "string" ? best : best.form) : null;
  }
  verbCache.set(key, out);
  return out;
}

// "knowest" -> "know", "lovest" -> "love", "saidst" -> "said".
function estBase(lo) {
  const key = `2:${lo}`;
  if (verbCache.has(key)) return verbCache.get(key);
  let out = null;
  let s0 = null;
  if (/[a-z]{2,}(e?d|t)st$/.test(lo)) {
    // lovedst, saidst, sentst: the past tense with -st added.
    const past = lo.slice(0, -2);
    if (!KNOWN || COMMON.has(past)) out = past;
    else { const sp = spellWord(past); if (sp && COMMON.has(sp)) out = sp; }
  }
  if (!out) {
    if (lo.length >= 5 && lo.endsWith("est")) s0 = lo.slice(0, -3);
    // -st without the e only after w or y: "knowst", "sayst". Never
    // after a vowel: "Christ" in a "thou" sentence became "Chry".
    else if (lo.length >= 4 && lo.endsWith("st") && /[wy]/.test(lo.slice(-3, -2))) s0 = lo.slice(0, -2);
    if (s0) {
      const best = pickVerb(s0, (b) => b);
      out = best ? (typeof best === "string" ? best : best.base) : null;
      // the base itself has to be a word people still use
      if (out && KNOWN && !COMMON.has(out)) out = null;
    }
  }
  if (out && GRAMMAR[out] && out !== "shall") out = GRAMMAR[out];
  if (out && (LYE[out] || DYE[out])) out = LYE[out] || DYE[out]; // "lyest" -> "lie"
  verbCache.set(key, out);
  return out;
}

// ─── Tokens ─────────────────────────────────────────────────────────────

const TOKEN_RE = /[A-Za-zÀ-ÖØ-öø-ɏ̀-ͯꝭꝯ]+(?:['’][A-Za-zÀ-ÖØ-öø-ɏ̀-ͯꝭꝯ]+)*|&c(?![A-Za-z])|&/g;
const APOS = /['’]/;

function tokenize(S, bounds) {
  const toks = [];
  TOKEN_RE.lastIndex = 0;
  let m;
  let bi = 0;
  while ((m = TOKEN_RE.exec(S))) {
    const s = m[0];
    const a = m.index;
    const b = a + s.length;
    let split = -1;
    while (bi < bounds.length && bounds[bi] <= a) bi += 1;
    if (bi < bounds.length && bounds[bi] < b) split = bounds[bi] - a;
    toks.push({ s, a, b, lo: s.toLowerCase().replace(/’/g, "'"), split, ea: a, eb: b });
  }
  return toks;
}

// Apostrophes the token regex could not include: the one in front of
// 'tis and 'em, the one behind tho' and th'.
function elide(t, S) {
  let lo = t.lo;
  const before = S.charAt(t.a - 1);
  const after = S.charAt(t.b);
  if (APOS.test(before) && /^(tis|twas|twere|twill|twould|em|gainst|mongst)$/.test(lo)) {
    t.ea = t.a - 1;
    return lo === "em" ? "'em" : lo;
  }
  if (APOS.test(after) && /^(tho|altho|thro|th)$/.test(lo) && !/[A-Za-z]/.test(S.charAt(t.b + 1))) {
    t.eb = t.b + 1;
    return lo === "th" ? "the" : lo;
  }
  if (lo.indexOf("'") < 0) return lo;
  // "th'Almighty", "t'other"
  let m = /^th'([a-z].*)$/.exec(lo);
  if (m) return `the ${m[1]}`;
  if (/^[a-z]*e'er$/.test(lo) && lo !== "e'er") return `${lo.slice(0, -4)}ever`;
  if (GRAMMAR[lo] || ALIAS[lo]) return lo;
  m = /^([a-z]+)'([a-z]+)$/.exec(lo);
  if (!m) return lo;
  const [, w1, w2] = m;
  if (/^(s|t|ll|ve|re|m)$/.test(w2)) return lo;
  if (w2 === "d" && /^(i|he|she|we|they|you|ye|thou|who|it|that|there)$/.test(w1)) return lo;
  if (w2 === "st") {
    // know'st, lov'st: the -est form written short, and only ever that.
    t.est2 = true;
    return `${w1}est`;
  }
  // lov'd, heav'n, wand'ring: an e was left out.
  const withE = `${w1}e${w2}`;
  if (!KNOWN || KNOWN.has(withE) || spellWord(withE)) return withE;
  if (w2 === "d") {
    // excel'd -> excelled, fathom'd -> fathomed, differenc'd -> differenced
    const doubled = `${w1}${w1.slice(-1)}ed`;
    if (KNOWN.has(doubled)) return doubled;
    if (KNOWN.has(w1) || KNOWN.has(`${w1}e`)) return `${w1}ed`;
  }
  return lo;
}

// ─── The engine ─────────────────────────────────────────────────────────

const CONTEXT_KEYS = new Set((
  "ye yt wt wc wch thine mine myne art then wherefore wherfore hast wast " +
  "quod lye lyes lyeth lyed dye dyes dyed dyeth"
).split(" "));
function grammarish(w) {
  return GRAMMAR[w] != null || !!ALIAS[w] || CONTEXT_KEYS.has(w) ||
    (w.length >= 5 && /(eth|est)$/.test(w)) || hasFlag(w, "2");
}

const SENT_END = /[.!?¶]/;
const CLAUSE_END = /[.!?¶,;:()[\]"“”]/;

function edits(S, bounds) {
  const toks = tokenize(S, bounds || []);
  const n = toks.length;
  const E = [];
  if (!n) return E;
  for (const t of toks) {
    t.key = elide(t, S);
    if (ALIAS[t.key]) t.key = ALIAS[t.key];
    // the long s first: "ſhall" is "shall"
    if (t.key.indexOf("ſ") >= 0) t.key = t.key.replace(/ſ/g, "s");
    // An old spelling of a grammar word is that grammar word: "Wherfor"
    // is "wherefore", "doeste" is "dost", "seeste" is "seest". Respell
    // first, so the rules below see the word they are written for.
    if (KNOWN && !grammarish(t.key) && /^[a-zà-ɏ\u0300-\u036f]+$/.test(t.key) && !MARKS_RE.test(t.key)) {
      const sp = spellWord(t.key);
      if (sp && sp.indexOf(" ") < 0 && grammarish(sp)) t.key = ALIAS[sp] || sp;
    }
  }
  const gap = (i) => S.slice(i > 0 ? toks[i - 1].eb : 0, toks[i].ea);
  const gapAfter = (i) => S.slice(toks[i].eb, i + 1 < n ? toks[i + 1].ea : S.length);
  const ws = (g) => /^[ \t ]*$/.test(g) || /^\s+$/.test(g);
  const joined = (i) => i > 0 && ws(gap(i)); // i is glued to i-1 by whitespace only
  // the canonical spelling of a neighbour, for decisions
  const norm = (i) => {
    const t = toks[i];
    if (!t) return "";
    if (t.norm == null) {
      const k = t.key;
      t.norm = GRAMMAR[k] || k;
      if (!GRAMMAR[k] && KNOWN) { const s = spellWord(k); if (s) t.norm = s; }
    }
    return t.norm;
  };
  // the next sentence mark after each token: "?" makes a question
  const term = new Array(n).fill("");
  for (let i = n - 1; i >= 0; i -= 1) {
    const g = gapAfter(i);
    const m = /[.!?]/.exec(g);
    term[i] = m ? m[0] : (i + 1 < n ? term[i + 1] : "");
  }
  // where the last "thou" of this sentence is
  const lastThou = new Array(n).fill(-1);
  let lt = -1;
  for (let i = 0; i < n; i += 1) {
    if (i > 0 && SENT_END.test(gap(i))) lt = -1;
    lastThou[i] = lt;
    const k = toks[i].key;
    if (k === "thou" || (k === "yu" && toks[i].split === 1)) lt = i;
    else if (lt >= 0 && /^(he|she|it|they|we|i|hee|shee|wee)$/.test(k)) lt = -1;
  }
  const inThou = (i) => lastThou[i] >= 0 && i - lastThou[i] <= 14;
  const nextIsThou = (i) => i + 1 < n && joined(i + 1) && (toks[i + 1].key === "thou");
  const clauseStart = (i) => i === 0 || CLAUSE_END.test(gap(i)) ||
    (CLAUSE_LEAD.has(norm(i - 1)) && (i - 1 === 0 || CLAUSE_END.test(gap(i - 1))));
  const done = new Uint8Array(n);
  // Is this block Early Modern at all? In a modern translation a capital
  // in mid-sentence is a name ("Saona", "Denise") and the spelling rules
  // leave it alone; in an Early Modern block it is as often a noun
  // printed with a capital ("Lorde", "Kingdome") and they do not.
  let oldBlock = false;
  if (KNOWN) {
    let hits = 0;
    for (let i = 0; i < n && !oldBlock; i += 1) {
      const k = toks[i].key;
      if (/^(hath|doth|thou|thee|thy|ye|saith|thine|hast|art|wilt|shalt|unto)$/.test(k)) oldBlock = true;
      else if (/^[a-z]+$/.test(toks[i].s) && k.length > 2 && !MARKS_RE.test(k) && spellWord(k)) hits += 1;
      // an abbreviation mark whose expansion is an English word ("whē",
      // "cōmeth", "cōmaundementes"); Greek under a macron is not
      else if (MARKS_RE.test(k) && (MACRON_SHORT[k.normalize("NFC")] || (k.length >= 5 && spellWord(k) && !MARK_MISS.has(k)))) hits += 2;
      if (hits >= 2) oldBlock = true;
    }
  }
  // Abbreviation marks, in an Early Modern block only: "cōmeth" is
  // "commeth". In a modern block a macron is a transliteration.
  if (oldBlock) {
    for (const t of toks) {
      if (!MARKS_RE.test(t.key) || /^th[eē]/.test(t.key.normalize("NFC"))) continue;
      const sp = spellWord(t.key);
      if (sp && /^[a-z]+$/.test(sp)) t.key = ALIAS[sp] || sp;
      t.norm = null;
    }
  }

  const put = (i, j, text) => { // replace tokens i..j (inclusive)
    E.push([toks[i].ea, toks[j].eb, text]);
    for (let k = i; k <= j; k += 1) done[k] = 1;
  };
  const drop = (j) => { // delete token j and the whitespace before it
    E.push([toks[j - 1].eb, toks[j].eb, ""]);
    done[j] = 1;
  };
  const cased = (i, text) => matchWordCase(toks[i].s, text);

  // What does this "ye" mean? "the", "you".
  const yeReading = (i) => {
    const t = toks[i];
    if (t.lo !== "ye" && t.lo !== "yͤ") return "you"; // yee, yée
    if (t.split === 1 || t.lo === "yͤ") return "the";
    const nx = i + 1 < n && joined(i + 1) ? norm(i + 1) : "";
    if (nx === "same" || nx === "selfsame") return "the";
    if (i > 0 && joined(i) && PREP_THE.has(norm(i - 1)) && nx &&
        !YE_PRONOUN_NEXT.has(nx) && !/(eth|est)$/.test(toks[i + 1].lo) &&
        !CLAUSE_END.test(gapAfter(i))) return "the";
    return "you";
  };
  const isYou = (i) => {
    const k = toks[i].key;
    if (k === "thou") return true;
    if (k === "ye") return yeReading(i) === "you";
    return false;
  };

  // Is the "then" at i a "than"? After a comparative ("better then",
  // "more precious then gold"), never before a comma ("much more then,
  // being justified") or a verb ("more then shall we").
  const isThan = (i) => {
    if (!(i > 0 && joined(i) && !CLAUSE_END.test(gapAfter(i)) && i + 1 < n && !THEN_ADVERB_NEXT.has(norm(i + 1)))) return false;
    const p = norm(i - 1);
    let cmp = COMPARATIVE.has(p);
    if (!cmp && KNOWN && /[a-z]{2,}er$/.test(p) && !/(ever|ther|ter|der|ner|wer|mer|ker|per|ger|ber|ver|zer)$/.test(p)) {
      const st = p.slice(0, -2);
      // "sweeter" has "sweetest"; "teacher" has "teachest" too, but also
      // "teacheth", which no adjective has
      cmp = (COMMON.has(`${st}est`) || COMMON.has(`${p.slice(0, -1)}st`) ||
        (/ier$/.test(p) && COMMON.has(`${p.slice(0, -3)}iest`))) &&
        !KNOWN.has(`${st}eth`) && !KNOWN.has(`${p.slice(0, -1)}th`);
    }
    if (!cmp && !YE_PRONOUN_NEXT.has(p) && !DETERMINERS.has(p)) {
      for (let b = i - 2; b >= Math.max(0, i - 4); b -= 1) {
        if (!joined(b + 1)) break;
        if (COMPARATIVE_FAR.has(norm(b))) { cmp = true; break; }
      }
    }
    return cmp;
  };

  // A respelling can land on a grammar word: "wherof" is "whereof",
  // "makyth" is "maketh". Those still have to be modernized.
  const regrammar = (sp, i) => {
    if (GRAMMAR[sp] != null) return GRAMMAR[sp];
    if (/eth$/.test(sp) && sp.length >= 5) return ethForm(sp) || sp;
    if (/est$/.test(sp) && sp.length >= 5 && (inThou(i) || nextIsThou(i))) return estBase(sp) || sp;
    return sp;
  };

  for (let i = 0; i < n; i += 1) {
    if (done[i]) continue;
    const t = toks[i];
    const k = t.key;

    // a word in a Latin, German or French sentence is not English, whatever
    // it looks like ("wie er oft ein" is German)
    if (!/^(thou|thee|thy|thine|ye|hath|doth|saith|unto)$/.test(k)) {
      let foreign = 0;
      for (let b = Math.max(0, i - 2); b <= Math.min(n - 1, i + 2); b += 1) {
        if (b !== i && LATIN_FN.has(toks[b].key)) foreign += 1;
      }
      // two such words beside it, or one beside a word that is not common
      // English, and it is left as printed
      if (foreign >= 2 || (foreign === 1 && (!(COMMON && COMMON.has(k)) || (MAP && MAP.has(k))))) continue;
    }
    // & and &c; an ampersand between Latin words is Latin's "et"
    if (k === "&") {
      // English is proven by a function word or an English inflection
      // within two words either side; "Tollit & omne malignum" has none.
      const english = (j) => {
        if (j < 0 || j >= n) return false;
        const w = toks[j].key;
        return EN_FN.has(w) || EN_FN.has(norm(j)) || GRAMMAR[w] != null || !!ALIAS[w] || /(eth|ing|ed|ly|ness|nesse|nes)$/.test(w);
      };
      let en = false;
      for (let j = i - 2; j <= i + 2 && !en; j += 1) if (j !== i && english(j)) en = true;
      if ((ws(gap(i)) || i === 0) && en) put(i, i, "and");
      continue;
    }
    // a reference ("Rom. 8.13", "Judg. 8") and a word beside an illegible
    // mark ("D • uell") are left exactly as printed
    const after = S.charAt(t.b);
    if (after === "." && (ABBREV.has(k) || (/^[A-Z]/.test(t.s) && /^\.\s*\d/.test(S.slice(t.b, t.b + 4)) && k.length <= 6))) continue;
    // a fragment beside an illegible mark ("D • uell", "tho • owe") keeps
    // its letters; a grammar word beside one is still a grammar word
    const fragment = /[•◊…]\s?$/.test(S.slice(Math.max(0, t.a - 2), t.a)) || /^\s?[•◊…]/.test(S.slice(t.b, t.b + 2));
    if (fragment && !/^(thou|thee|thy|thine|ye|hath|doth|saith|unto|art|hast|shall|shalt|wilt)$/.test(k)) continue;
    // half of a hyphenated name ("Lo-ammi") is not a word of its own
    if (/^[-‐]\S/.test(S.slice(t.b, t.b + 2)) && /^[A-Z]/.test(t.s) && t.s.length <= 3) continue;
    // two words the transcription glued together ("slepedActū")
    if (/[a-z][A-Z]/.test(t.s)) continue;
    if (k === "&c") { put(i, i, S.charAt(t.b) === "." ? "etc" : "etc."); continue; }

    // superscript abbreviations cut across a node: y<i>e</i>, y<i>t</i>
    if (t.split === 1 && t.lo.length <= 3) {
      const abbr = { ye: "the", yt: "that", wt: "with", yu: "you", wc: "which", wch: "which", ym: "them" }[t.lo];
      if (abbr) { put(i, i, cased(i, abbr)); continue; }
    }
    if (k === "yt") {
      // "al yt that maketh" is "all that which makes"
      const nx = i + 1 < n && joined(i + 1) ? toks[i + 1].key : "";
      put(i, i, cased(i, nx === "that" || nx === "which" ? "that" : "it"));
      continue;
    }
    if (k === "wt") { put(i, i, cased(i, "with")); continue; }
    if (k === "wch" || k === "wc") { put(i, i, cased(i, "which")); continue; }

    // our selves -> ourselves
    if (i + 1 < n && SELF_HEAD[k] && joined(i + 1) && SELF_TAIL[toks[i + 1].key] &&
        !/^[-‐]/.test(gapAfter(i + 1))) {
      const tail = SELF_TAIL[toks[i + 1].key];
      const head = SELF_HEAD[k];
      const plural = head === "them" || head === "our";
      const word = head === "your" && tail === "self" && k !== "thy" ? "yourself" : `${head}${plural ? "selves" : tail}`;
      put(i, i + 1, cased(i, word === "itselves" ? "itself" : word));
      continue;
    }
    // to morrow -> tomorrow
    if (i + 1 < n && joined(i + 1)) {
      const keyPair = `${k} ${toks[i + 1].key}`;
      const pair = JOIN2[keyPair] ? keyPair : `${norm(i)} ${norm(i + 1)}`;
      const j2 = JOIN2[pair];
      if (j2 && !(pair === "to day" && i > 0 && /^(day|days|from)$/.test(norm(i - 1))) &&
          !/^[-‐]/.test(gapAfter(i + 1))) {
        put(i, i + 1, cased(i, j2));
        continue;
      }
      if (pair === "never the" && i + 2 < n && joined(i + 2) && norm(i + 2) === "less") {
        put(i, i + 2, cased(i, "nevertheless"));
        continue;
      }
    }

    // A verb with its pronoun after it: questions and imperatives.
    if (i + 1 < n && joined(i + 1)) {
      const j = i + 1;
      const pk = toks[j].key;
      if ((pk === "thou" || pk === "ye") && isYou(j) && !AUX_INVERT.has(k) &&
          !AUX_INVERT.has(norm(i))) {
        let est = pk === "thou" && /(e?st)$/.test(k) && !EST_EXCEPTIONS.has(k) ? estBase(k) : null;
        if (est && (LYE[est] || DYE[est])) est = (LYE[est] || DYE[est]);
        const base = est || (/^[a-z]+$/.test(k) && !/(eth|est)$/.test(k) ? (spellWord(k) || k) : null);
        const lead = clauseStart(i) || (i > 0 && (WH.has(toks[i - 1].key) || WH.has(norm(i - 1))) && joined(i));
        // a question by its "?", or by the wh-word in front of it when the
        // printer used a semicolon ("wherefore lyest thou thus upon thy face;")
        const question = term[j] === "?" || (i > 0 && joined(i) && /^(why|wherefore|wherfore|where|whither|whence|how|what)$/.test(toks[i - 1].key));
        if (base && lead && question && (est || IMPERATIVE.has(base) || /^(think|suppose|say|seek|mean|look|believe|understand|know|see|hear|read|want|need|fear|doubt|expect|love|say|go|come|stand|sit|do)$/.test(base))) {
          let doWord = "do";
          let b = base;
          if (est && PAST_BASE[est]) { doWord = "did"; b = PAST_BASE[est]; }
          if (j + 1 < n && joined(j + 1) && toks[j + 1].key === "not") {
            put(i, j + 1, cased(i, `${doWord} you not ${b}`));
          } else {
            put(i, j, cased(i, `${doWord} you ${b}`));
          }
          continue;
        }
        // "Go ye therefore", "Praise ye the Lord": the pronoun goes. "Come
        // ye blessed of my Father" is a vocative, and it stays ("you").
        const after2 = j + 1 < n && joined(j + 1) ? norm(j + 1) : "";
        const objectNext = !after2 || CLAUSE_END.test(gapAfter(j)) || IMPERATIVE_NEXT.has(after2);
        if (base && !est && clauseStart(i) && !question && IMPERATIVE.has(base) && (objectNext || base === "be")) {
          put(i, i, cased(i, GRAMMAR[base] || base));
          drop(j);
          continue;
        }
        if (est) { // "then knowest thou" -> "then you know"
          put(i, j, cased(i, `you ${est}`));
          continue;
        }
      }
    }

    // ye: the article or the pronoun
    if (k === "ye") {
      put(i, i, cased(i, yeReading(i) === "the" ? "the" : "you"));
      continue;
    }

    // thine and mine: "your"/"my" before a noun, "yours"/"mine" alone
    if (k === "thine" || k === "mine" || k === "myne") {
      const nx = i + 1 < n && joined(i + 1) && !CLAUSE_END.test(gapAfter(i)) ? toks[i + 1] : null;
      const nw = nx ? norm(i + 1) : "";
      const nounNext = nx && nw && !YE_PRONOUN_NEXT.has(nw) && !/^(own|alone|also|even|ever|only|is|are|am|was|were|as|at|all|and|if|in|into|it|or|of|on|upon|unto|he|his|her|here|hath|has|had|have|how|i|eye)$/.test(nw) || nw === "own" || nw === "eye";
      if (k === "thine") put(i, i, cased(i, nounNext ? "your" : "yours"));
      else if (nounNext && /^[aeiouh]/.test(nw)) put(i, i, cased(i, "my"));
      else if (k === "myne") put(i, i, cased(i, "mine"));
      continue;
    }

    // art: the verb after thou, or before it
    if (k === "art") {
      const prev = i > 0 && joined(i) ? norm(i - 1) : "";
      const prev2 = i > 1 && joined(i - 1) ? norm(i - 2) : "";
      let verb = false;
      if (prev === "you" && toks[i - 1].key === "thou") verb = true;
      else if (nextIsThou(i)) verb = true;
      else if ((prev === "who" || prev === "which") && !PREP_THE.has(prev2)) {
        // "Our Father, which art in heaven": the person addressed is a who.
        put(i - 1, i, `${cased(i - 1, "who")} ${cased(i, "are")}`);
        continue;
      }
      else if (inThou(i) && (prev === "that" || prev === "and" || prev === "but" || prev === "yet" || prev === "nor" || prev === "not" || prev === "also" || prev === "still" || prev === "now" || prev === "even" || !prev)) verb = true;
      if (verb) put(i, i, cased(i, "are"));
      continue;
    }

    // thē is "them" or "then"
    if (t.lo.normalize("NFC") === "thē" || t.lo === "thẽ") {
      const p = i > 0 && joined(i) ? norm(i - 1) : "";
      const nx = i + 1 < n && joined(i + 1) ? norm(i + 1) : "";
      // "then" after "and", "but", a form of "be", or at the head of a
      // clause, and before a subject or an auxiliary ("thē he said",
      // "thē shall"); "them" after any other word ("gave thē", "learne
      // thē"), which is where the object of a verb or a preposition sits.
      const thenPrev = !p || clauseStart(i) || /^(and|but|even|so|if|not|or|was|were|is|are|be|been|&|yet|now|&c)$/.test(p);
      const thenNext = /^(i|he|she|it|we|they|ye|you|thou|shall|will|is|was|are|were|did|do|doth|hath|had|have|may|must|can|let|shal|wyll|there|the|a|an)$/.test(nx);
      const them = !thenPrev && !thenNext;
      const than = i > 0 && joined(i) && COMPARATIVE.has(norm(i - 1)) && isThan(i);
      put(i, i, cased(i, than ? "than" : them ? "them" : "then"));
      continue;
    }

    // then for than, after a comparative
    if (k === "then") {
      if (isThan(i)) put(i, i, cased(i, "than"));
      continue;
    }

    // wherefore: "why" in a question, "therefore" at the head of a clause
    if (k === "wherefore" || k === "wherfore") {
      // "Wherefore doest thou...": an inverted verb and pronoun make a
      // question even when the printer's "?" is missing
      const inverted = i + 2 < n && joined(i + 1) && joined(i + 2) &&
        (AUX_INVERT.has(toks[i + 1].key) || /(e?st)$/.test(toks[i + 1].key)) &&
        /^(thou|ye|you|he|she|they|we|it|i)$/.test(norm(i + 2));
      put(i, i, cased(i, term[i] !== "?" && !inverted && clauseStart(i) ? "therefore" : "why"));
      continue;
    }

    // lye and dye: lie and die, unless the page is about colour or soap
    if (LYE[k] || DYE[k]) {
      const table = LYE[k] ? LYE : DYE;
      const ctx = LYE[k] ? LYE_CONTEXT : DYE_CONTEXT;
      let keep = k === "dy"; // "dy" alone is too short to trust
      for (let b = i - 1; b >= Math.max(0, i - 6) && !keep; b -= 1) {
        if (ctx.has(norm(b))) keep = true;
        if (CLAUSE_END.test(gap(b))) break;
      }
      for (let b = i + 1; b <= Math.min(n - 1, i + 6) && !keep; b += 1) {
        if (CLAUSE_END.test(gap(b))) break;
        if (ctx.has(norm(b))) keep = true;
      }
      if (!keep && i > 0 && joined(i) && DETERMINERS.has(norm(i - 1)) && k === "dye") keep = true;
      if (!keep) put(i, i, cased(i, table[k]));
      continue;
    }

    // "quod he" is More's "said he"; "quod" alone is Latin.
    if (k === "quod") {
      if (i + 1 < n && joined(i + 1) && /^(i|he|she|they|we|you|ye|the|hee|shee|thou|this|that)$/.test(toks[i + 1].key)) put(i, i, cased(i, "said"));
      continue;
    }


    // a spelling someone decided outranks every rule below it
    if (SETTLED[k]) {
      // "a bee" is still a bee
      if (!(k === "bee" && i > 0 && joined(i) && DETERMINERS.has(norm(i - 1)))) put(i, i, cased(i, regrammar(SETTLED[k], i)));
      continue;
    }

    // hast and wast are also haste and waste: "make hast", "lay wast"
    if (k === "hast" || k === "wast") {
      const prev = i > 0 && joined(i) ? norm(i - 1) : "";
      const noun = !inThou(i) && !nextIsThou(i) && (DETERMINERS.has(prev) ||
        /^(make|made|makes|maketh|making|in|with|much|great|more|all|such|good|no|of|for|too|so|lay|laid|lie|lieth|layd|to)$/.test(prev));
      put(i, i, cased(i, noun ? (k === "hast" ? "haste" : "waste") : (k === "hast" ? "have" : "were")));
      continue;
    }

    // yea and nay: "yes"/"no" as answers; mid-sentence ("hid himself;
    // yea, he would have") they mean "indeed". "Yea, yea; Nay, nay" is
    // an answer.
    if (k === "yea" || k === "nay") {
      const mid = i > 0 && /[,;:]/.test(gap(i)) && !/[.!?]/.test(gap(i));
      const pair = (i > 0 && /^(yea|nay)$/.test(toks[i - 1].key)) || (i + 1 < n && /^(yea|nay)$/.test(toks[i + 1].key));
      // at the head of a sentence "Yea," answers ("Yea, Lord") and "Yea he
      // comes" affirms ("Indeed he comes")
      const headNoComma = k === "yea" && !mid && !/^\s*,/.test(gapAfter(i)) && !pair;
      put(i, i, cased(i, (mid && !pair) || headNoComma ? "indeed" : (k === "yea" ? "yes" : "no")));
      continue;
    }
    // naught: "nothing", but "it is naught" is "worthless"
    if (k === "naught" || k === "nought") {
      const prev = i > 0 && joined(i) ? norm(i - 1) : "";
      put(i, i, cased(i, /^(is|are|was|were|be|been|being|very|as|so|stark)$/.test(prev) ? "worthless" : "nothing"));
      continue;
    }

    // fain: "would fain" is "would gladly", "is fain to" is "is glad to"
    if (k === "fain" || k === "faine" || k === "fayne") {
      const prev = i > 0 && joined(i) ? norm(i - 1) : "";
      put(i, i, cased(i, /^(is|am|are|was|were|be|been|being)$/.test(prev) ? "glad" : "gladly"));
      continue;
    }

    // withal: "besides" after and/but, "with" at the end of a clause
    // ("to feed withal"), "as well" otherwise
    if (k === "withal" || k === "withall") {
      const prev = i > 0 && joined(i) ? norm(i - 1) : "";
      const end = i + 1 >= n || CLAUSE_END.test(gapAfter(i));
      // a stranded preposition closes an infinitive: "to feed withal",
      // "to beguile ourselves withal"; "gives strength withal" is "as well"
      let infinitive = false;
      for (let b = i - 1; b >= Math.max(0, i - 5) && !infinitive; b -= 1) {
        if (/^(to|wherewith)$/.test(norm(b)) || toks[b].key === "wherewith") infinitive = true;
        if (CLAUSE_END.test(gap(b))) break;
      }
      put(i, i, cased(i, /^(and|but|yet|or|nor)$/.test(prev) ? "besides" : end && infinitive ? "with" : "as well"));
      continue;
    }

    // whence: "from where" in a question or a place, "hence" when it
    // opens an inference ("Whence this reason is also confirmed")
    if (k === "whence") {
      if (i > 0 && joined(i) && norm(i - 1) === "from") { put(i, i, cased(i, "where")); continue; }
      put(i, i, cased(i, term[i] !== "?" && clauseStart(i) ? "hence" : "from where"));
      continue;
    }
    // "from thence" is "from there", not "from from there"; "note thence"
    // and "it follows thence" draw an inference: "hence"
    if (k === "thence" && i > 0 && joined(i) && norm(i - 1) === "from") { put(i, i, cased(i, "there")); continue; }
    if (k === "thence" && i > 0 && joined(i) && /^(note|learn|gather|infer|follows|follow|followeth|appears|conclude|see|observe|argue|collect|we|it)$/.test(norm(i - 1))) {
      put(i, i, cased(i, "hence"));
      continue;
    }

    // thereupon: "then" at the head of a clause, "upon it" after a verb
    if (k === "thereupon") {
      const nx = i + 1 < n && joined(i + 1) ? toks[i + 1].key : "";
      put(i, i, cased(i, clauseStart(i) || /ed$/.test(nx) || AUX_INVERT.has(nx) ? "then" : "upon it"));
      continue;
    }

    // the grammar words
    if (GRAMMAR[k] != null && !(k === "lo" && t.s === "LO")) {
      put(i, i, cased(i, GRAMMAR[k]));
      continue;
    }

    // -eth: third person
    if (k.length >= 5 && /(eth|yth)$/.test(k)) {
      // a noun that ends in -eth ("moneth") respelled by the map
      const mk = MAP && MAP.get(k);
      if (mk && mk !== "=" && !/(eth|s)$/.test(mk)) { put(i, i, cased(i, mk)); continue; }
      let f = ethForm(k) || (mk && /eth$/.test(mk) ? ethForm(mk) : null);
      if (f && GRAMMAR[f] != null) f = GRAMMAR[f]; // "sheweeth" -> "shews" -> "shows"
      if (f) { put(i, i, cased(i, f)); continue; }
    }

    // -est and -st: second person, only beside thou (or in the map)
    if (/(e?st)$/.test(k) && k.length >= 4 && !EST_EXCEPTIONS.has(k)) {
      const flag = hasFlag(k, "2") ? "2" : "";
      const prev = i > 0 && joined(i) ? norm(i - 1) : "";
      const marker = SUPERLATIVE_MARKERS.has(prev) && !(inThou(i) && /^(and|or|but|nor)$/.test(prev));
      if (flag === "2" || t.est2 || ((inThou(i) || nextIsThou(i)) && !marker)) {
        const b = flag === "2" ? MAP.get(k) : estBase(k);
        if (b) { put(i, i, cased(i, b)); continue; }
      }
    }

    // th'Almighty
    if (k.indexOf("the ") === 0) { put(i, i, `${cased(i, "the")} ${t.s.slice(3)}`); continue; }

    // a word the printer broke after an abbreviation mark: "mē cyonyd",
    // "commā ded", "seruaū tes"
    if (i + 1 < n && /[āēīōū\u0304]$/.test(t.s.normalize("NFC")) && gap(i + 1) === " " &&
        /^[a-z]/.test(toks[i + 1].s) && KNOWN && (toks[i + 1].lo.length <= 4 || !COMMON.has(toks[i + 1].key)) && !MACRON_SHORT[t.lo.normalize("NFC")]) {
      const glued = `${t.lo}${toks[i + 1].lo}`;
      const whole = KNOWN.has(glued) ? glued : spellWord(glued);
      if (whole && whole.indexOf(" ") < 0 && COMMON.has(whole) && whole.length >= 6) { put(i, i + 1, cased(i, regrammar(whole, i))); continue; }
    }
    // inside a Latin quotation, spelling is left alone
    if (KNOWN && !KNOWN.has(k)) {
      let latin = false;
      for (let b = Math.max(0, i - 2); b <= Math.min(n - 1, i + 2) && !latin; b += 1) {
        if (b !== i && LATIN_FN.has(toks[b].key)) latin = true;
      }
      if (latin) continue;
    }

    // A capital in mid-sentence is a name as often as an Early Modern
    // noun; names get the map and the settled list, never the rules
    // ("Saona" is not "Sana", "Denise" is not "Denis").
    const midCap = !oldBlock && /^[A-Z][a-z]/.test(t.s) && i > 0 && !SENT_END.test(gap(i));
    if (midCap && KNOWN && !SETTLED[k] && !(MAP && MAP.has(k)) && !MARKS_RE.test(k) && k.indexOf("ſ") < 0) continue;

    // a macron in a modern text is a transliteration ("tēs selēnēs"),
    // not an abbreviation
    if (!oldBlock && MARKS_RE.test(t.s)) continue;

    // spelling
    let sp = spellWord(k);
    if (sp === null && hasFlag(k, "n")) sp = MAP.get(k);
    if (sp === null && k !== t.lo) sp = k; // an elided form, restored
    // "a bee", "the doe": a word that is also a modern noun stays one
    // after a determiner.
    if (sp && i > 0 && joined(i) && DETERMINERS.has(norm(i - 1)) &&
        hasFlag(k, "n")) sp = null;
    // "Donne" in mid-sentence is John Donne, not "done"
    if (sp && hasFlag(k, "c") && /^[A-Z]/.test(t.s) && i > 0 && !SENT_END.test(gap(i))) sp = null;
    if (sp) sp = regrammar(sp, i);
    // "Provid." is an abbreviation, not a misspelling of "Provide"
    if (sp && after === "." && sp.length > k.length && sp.indexOf(k) === 0) sp = null;
    if (sp) {
      const out = cased(i, sp);
      if (out !== S.slice(t.ea, t.eb)) put(i, i, out);
    }
  }
  E.sort((x, y) => x[0] - y[0]);
  return E;
}

function applyEdits(S, E) {
  let out = "";
  let at = 0;
  for (const [a, b, text] of E) {
    if (a < at) continue;
    out += S.slice(at, a) + text;
    at = b;
  }
  return out + S.slice(at);
}

/* Modernize one block given as its text nodes, in order. Returns the
 * new text of each node. A null entry is an element the caller keeps
 * out of the text (a footnote mark); it separates words but is never
 * rewritten. */
const OPAQUE = "￼";
function modernizeRuns(runs) {
  const starts = [];
  let S = "";
  for (const r of runs) {
    starts.push(S.length);
    S += r == null ? OPAQUE : String(r);
  }
  const ends = runs.map((r, k) => (k + 1 < runs.length ? starts[k + 1] : S.length));
  const E = edits(S, starts.slice(1));
  if (!E.length) return runs.slice();
  const local = runs.map(() => []);
  for (const [a, b, text] of E) {
    let first = true;
    for (let k = 0; k < runs.length; k += 1) {
      const s = starts[k];
      const e = ends[k];
      if (runs[k] == null) continue;
      const overlaps = a === b ? a >= s && a < e : a < e && b > s;
      if (!overlaps) continue;
      local[k].push([Math.max(a, s) - s, Math.min(b, e) - s, first ? text : ""]);
      first = false;
    }
  }
  return runs.map((r, k) => (r == null ? r : applyEdits(String(r), local[k])));
}

function modernizeText(text) {
  if (!text) return text;
  const S = String(text);
  const E = edits(S, []);
  return E.length ? applyEdits(S, E) : S;
}

function modernizeParagraphs(paragraphs) {
  return paragraphs.map(modernizeText);
}

/* Does this text want the Modernizer? The pronouns and auxiliaries, the
 * -eth verbs, the superscript abbreviations and the printed spellings. */
const ARCHAIC_RE = /\b(thou|thee|thy|thine|ye|yee|hath|doth|dost|saith|art thou|unto|[a-z]{3,}eth|onely|selfe|haue|vpon|vnto)\b|&c|[̄ſ]/i;
function hasArchaicLanguage(text) {
  return ARCHAIC_RE.test(text);
}

/* Loads the lexicon and the spelling map once, for any page. */
let loading = null;
function loadData(assetUrl) {
  if (loading) return loading;
  const url = (p) => (assetUrl ? assetUrl(p) : (root.moAssetUrl ? root.moAssetUrl(p) : p));
  const get = (p) => fetch(url(p)).then((r) => (r.ok ? r.text() : "")).catch(() => "");
  loading = Promise.all([
    get("/assets/data/faith-received/modern-words.txt"),
    get("/assets/data/faith-received/archaic-map.txt"),
  ]).then(([words, map]) => {
    if (words) {
      const parts = words.split("\n---\n");
      const common = parts[0].split("\n").filter(Boolean);
      const rest = (parts[1] || "").split("\n").filter(Boolean);
      setLexicon(new Set(common), new Set(common.concat(rest)));
    }
    if (map) setArchaicMap(map);
    return !!words;
  });
  return loading;
}

/* The DOM side, shared by every reader. Walks the text nodes of an
 * element, groups them by the block that holds them (a paragraph, a list
 * item, a heading), and modernizes each block as one: "If <i>Ye</i>" and
 * "y<i>e</i>" are decided with their neighbours in view. The original of
 * every node is kept on the node (node.frRaw), so a second pass works
 * from the original and restoreElement() puts it back exactly. Nodes
 * under `skip` (a CSS selector: footnote marks, apparatus) are never
 * rewritten; they separate words and nothing else. */
const BLOCK_SEL = "p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,dd,dt,figcaption,div";
function modernizeElement(el, skip) {
  if (!el || typeof document === "undefined") return;
  const groups = new Map();
  const order = [];
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const p = n.parentNode;
    const skipped = !!(skip && p && p.closest && p.closest(skip));
    const block = (p && p.closest && p.closest(BLOCK_SEL)) || el;
    const key = el.contains(block) ? block : el;
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key).push(skipped ? null : n);
  }
  order.forEach((key) => {
    const nodes = groups.get(key);
    if (!nodes.some((n) => n && n.nodeValue.trim())) return;
    const runs = nodes.map((n) => {
      if (!n) return null;
      if (n.frRaw == null) n.frRaw = n.nodeValue;
      return n.frRaw;
    });
    const out = modernizeRuns(runs);
    nodes.forEach((n, k) => {
      if (n && out[k] !== n.nodeValue) n.nodeValue = out[k];
    });
  });
}
function restoreElement(el) {
  if (!el || typeof document === "undefined") return;
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.frRaw != null && n.nodeValue !== n.frRaw) n.nodeValue = n.frRaw;
  }
}

  root.FaithModernize = {
    modernizeElement, restoreElement,
    modernizeText, modernizeRuns, modernizeParagraphs, hasArchaicLanguage,
    modernizeSpelling, setLexicon, setArchaicMap, loadData,
    // for scripts/check-modernize.mjs: the edits behind a result
    editsFor: (text, bounds) => edits(String(text), bounds || []),
    get hasLexicon() { return !!KNOWN; },
  };
})(window);
