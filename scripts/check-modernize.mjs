#!/usr/bin/env node
/*
 * The Modernizer's regression gate: before -> after pairs taken from the
 * library itself (Owen, Perkins, Tyndale, More, the 1928 BCP, the ANF,
 * the Westminster standards), and negatives that must come through
 * untouched. Runs the engine exactly as the reader does: lexicon and
 * spelling map loaded, text given as its text nodes (runs) where the
 * page splits a word or a phrase across an italic.
 *
 *   node scripts/check-modernize.mjs
 *
 * Any failure exits 1 and names the case. Precision was measured on a
 * 300-token random sample of the corpus (see the commit that added this
 * file); these cases are the ones that sample, and the bugs it found,
 * must never regress.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const win = {};
new Function("window", fs.readFileSync(path.join(ROOT, "assets/js/faith-modernize.js"), "utf8"))(win);
const FM = win.FaithModernize;
const words = fs.readFileSync(path.join(ROOT, "assets/data/faith-received/modern-words.txt"), "utf8").split("\n---\n");
const common = words[0].split("\n").filter(Boolean);
const rest = (words[1] || "").split("\n").filter(Boolean);
FM.setLexicon(new Set(common), new Set(common.concat(rest)));
FM.setArchaicMap(fs.readFileSync(path.join(ROOT, "assets/data/faith-received/archaic-map.txt"), "utf8"));

// [input, expected]. An input given as an array is a list of text
// nodes; the expected output is then the joined result.
const CASES = [
  // ── Owen, Of the Mortification of Sin (eebo-32524): the report that
  //    started this. "Ye" inside an italic, beside "if" outside it.
  [["2. The Persons are denoted to ", "whom", " it is prescribed; ", "Ye", "; if ", "Ye Mortify."],
    "2. The Persons are denoted to whom it is prescribed; You; if You Mortify."],
  [["3. There is in them a ", "Promise", " annexed to that ", "Duty, Ye shall Live."],
    "3. There is in them a Promise annexed to that Duty, You will Live."],
  [["4. The ", "Cause", " or Means of this Duty, the ", "Spirit", "; If ye ", "through the Spirit."],
    "4. The Cause or Means of this Duty, the Spirit; If you through the Spirit."],
  [["are contained, ", "If ye, etc."], "are contained, If you, etc."],
  ["as they lye in the entire Proposition", "as they lie in the entire Proposition"],
  ["and what it is to dye, that being not my present aym", "and what it is to die, that being not my present aym"],
  ["Now the connexion and coherence of things", "Now the connection and coherence of things"],
  ["If ye live after the flesh, ye shall dye.", "If you live after the flesh, you will die."],
  ["ye Believers; ye to whom there is no Condemnation", "you Believers; you to whom there is no Condemnation"],
  ["it lyes in this Thesis", "it lies in this Thesis"],
  // ── superscript abbreviations cut across a node: y<i>e</i>, y<i>t</i>
  [["He y", "t", " loveth god kepeth al y", "e", " cōmaundementes."], "He that loves god keeps all the commandments."],
  [["w", "t", " the lorde"], "with the lord"],
  ["Is yt not a froward and perverse blindness", "Is it not a froward and perverse blindness"],
  ["tryall of ye treath", "trial of the treath"],
  ["ye same thing", "the same thing"],
  // ── thou, thee, thy and the verb that goes with them
  ["Thou openest thine hand, and satisfiest the desire of every living thing.",
    "You open your hand, and satisfy the desire of every living thing."],
  ["Thou art the fairest of ten thousand.", "You are the fairest of ten thousand."],
  ["Our Father, which art in heaven, Hallowed be thy Name.", "Our Father, who are in heaven, Hallowed be your Name."],
  ["For thine is the kingdom", "For yours is the kingdom"],
  ["Mine eyes have seen; mine own heart; the kingdom is mine; mine enemies.",
    "My eyes have seen; my own heart; the kingdom is mine; my enemies."],
  ["Thou shalt not steal.", "You will not steal."],
  ["where wast thou", "where were you"],
  ["thou hast", "you have"],
  ["as thou well knowest", "as you well know"],
  ["O thou that hearest prayer", "O you that hear prayer"],
  ["Know ye not that ye are the temple of God?", "Do you not know that you are the temple of God?"],
  ["Lovest thou me?", "Do you love me?"],
  ["What sayest thou of him?", "What do you say of him?"],
  ["Whither goest thou?", "Where do you go?"],
  ["Whence comest thou?", "From where do you come?"],
  ["wherefore hydest thou thy face?", "why do you hide your face?"],
  ["wherefore lyest thou thus upon thy face; Israel", "why do you lie thus upon your face; Israel"],
  ["Why art thou cast down, O my soul?", "Why are you cast down, O my soul?"],
  ["Praise ye the Lord.", "Praise the Lord."],
  ["Go ye therefore, and teach all nations.", "Go therefore, and teach all nations."],
  ["Be thou faithful unto death.", "Be faithful to death."],
  ["Get ye up; O ye of little faith.", "Get up; O you of little faith."],
  ["Come ye blessed of my father", "Come you blessed of my father"],
  // ── -eth and -est
  ["he commeth, he goeth, he loveth, he saith", "he comes, he goes, he loves, he says"],
  ["she flieth, he dieth, he beleeveth, he useth", "she flies, he dies, he believes, he uses"],
  ["he entreth, he suffreth, he remembreth", "he enters, he suffers, he remembers"],
  ["the Lord hath spoken, he doth not", "the Lord has spoken, he does not"],
  ["as Cornelius Tacitus maketh mention", "as Cornelius Tacitus makes mention"],
  ["he sheweth", "he shows"],
  ["It behoveth us", "It behoves us"],
  ["thou lovedst", "you loved"],
  ["know'st thou", "you know"],
  // ── then for than, and then that stays then
  ["It is more blessed to give then to receive", "It is more blessed to give than to receive"],
  ["better then gold, rather then silver", "better than gold, rather than silver"],
  ["Much more then, being now justified by his blood", "Much more then, being now justified by his blood"],
  ["and then he went", "and then he went"],
  // ── contractions and elisions
  ["'Tis so; 'twas said; o'er the hills; ne'er again", "It is so; it was said; over the hills; never again"],
  ["prais'd, belov'd, heav'n, whate'er", "praised, beloved, heaven, whatever"],
  ["tho' he slay me", "though he slay me"],
  ["th' Almighty", "the Almighty"],
  ["our selves, it self, them selves, thy self, my self, your selves",
    "ourselves, itself, themselves, yourself, myself, yourselves"],
  ["to morrow and to day; from day to day; any thing", "tomorrow and today; from day to day; anything"],
  // ── spelling
  ["the sonne of man; I doe beleeve; it may bee so; hee and shee", "the son of man; I do believe; it may be so; he and she"],
  ["Paule in his pistles", "Paul in his epistles"],
  ["the worlde jugeth us", "the world judges us"],
  ["he gaue hī the boke", "he gave him the book"],
  ["whē he came", "when he came"],
  ["gave thē bread", "gave them bread"],
  ["and thē he sayd", "and then he said"],
  ["no better thē a beast", "no better than a beast"],
  ["the darkenes and likenes and weakenesse", "the darkness and likeness and weakness"],
  ["the moneth of May", "the month of May"],
  ["in steede therof now", "instead of it now"],
  ["callynge the poore to the feast", "calling the poor to the feast"],
  ["reflexion, inflexion, genuflexion", "reflection, inflection, genuflection"],
  ["ſo ſhall the ſpirit", "so will the spirit"],
  ["& so cōmeth to forgevenes", "and so comes to forgevenes"],
  ["commā ded to vowe", "commanded to vow"],
  ["it be unpossyble", "it be impossible"],
  // ── lye and dye: lie and die, except the alkali and the colour
  ["as the fool dyeth", "as the fool dies"],
  ["he dyed in peace", "he died in peace"],
  ["the garments dyed in scarlet", "the garments dyed in scarlet"],
  ["the rams skins dyed red", "the rams skins dyed red"],
  // ── context words
  ["Wherefore, my beloved brethren, be ye stedfast.", "Therefore, my beloved brothers, be stedfast."],
  ["Wherefore art thou come?", "Why are you come?"],
  ["Whence this reason is also confirmed", "Hence this reason is also confirmed"],
  ["from whence he came; from thence he went", "from where he came; from there he went"],
  ["the Lord is faine to deale", "the Lord is glad to deal"],
  ["I would fain know", "I would gladly know"],
  ["to feed withal", "to feed with"],
  ["and withal a good man", "and besides a good man"],
  ["hid himself; yea, he would have made", "hid himself; indeed, he would have made"],
  ["Yea, Lord; thou knowest", "Yes, Lord; you know"],
  ["Yea, yea; Nay, nay", "Yes, yes; No, no"],
  ["the Reward promised thereupon; because", "the Reward promised upon it; because"],
  ["Thereupon he went", "Then he went"],
  // ── shall is will (Ian, 2026-09-24)
  ["Shall we continue in sin?", "Will we continue in sin?"],
  ["ye shalbe perfect", "you will be perfect"],

  // ── NEGATIVES: modern words that look archaic, and must not move
  ["The interest of the honest man is the earnest of the harvest", "The interest of the honest man is the earnest of the harvest"],
  ["he was the priest of the forest, the best of the rest", "he was the priest of the forest, the best of the rest"],
  ["Thou art Jesus Christ, the sonne of the living God", "You are Jesus Christ, the son of the living God"],
  ["the teeth, Nazareth, beneath, Elizabeth, Macbeth", "the teeth, Nazareth, beneath, Elizabeth, Macbeth"],
  ["Neither shall they learn war any more, lest they fall.", "Neither will they learn war any more, lest they fall."],
  ["the doe and the hart; a bee", "the doe and the hart; a bee"],
  ["born of Mary, and", "born of Mary, and"],
  ["said Doctor Donne, I have", "said Doctor Donne, I have"],
  ["it was donne", "it was done"],
  ["M. Moore said", "M. Moore said"],
  ["complexion, crucifixion, fluxion", "complexion, crucifixion, fluxion"],
  ["2. Sam. 16.21. Judg. 8. 16. Rom. 8.13 vers. 5", "2. Sam. 16.21. Judg. 8. 16. Rom. 8.13 vers. 5"],
  ["Lessius de Provid. p. 664", "Lessius de Provid. p. 664"],
  ["Omnia clara sunt & plana ex Scripturis", "Omnia clara sunt & plana ex Scripturis"],
  ["Tollit & omne malignum", "Tollit & omne malignum"],
  ["ut omnes ſanae mentis", "ut omnes ſanae mentis"],
  ["und alle Gesamtausgaben", "und alle Gesamtausgaben"],
  ["wie er oft ein si ohne", "wie er oft ein si ohne"],
  ["H postaia tēs selēnēs en tē triakadi", "H postaia tēs selēnēs en tē triakadi"],
  ["the constructor toString valueOf of the house", "the constructor toString valueOf of the house"],
  ["the Justyce of pease", "the Justyce of pease"],
  ["subdeacon of Saona, and", "subdeacon of Saona, and"],
  ["The Lord be with you. And with thy spirit. Lift up your hearts.", "The Lord be with you. And with your spirit. Lift up your hearts."],
  ["He came to the forest; he rested; the fairest of all; the latest news", "He came to the forest; he rested; the fairest of all; the latest news"],
  ["painting, art, and music; science and art", "painting, art, and music; science and art"],
  ["the Christ, the Antichrist, the cast, the trust, the list", "the Christ, the Antichrist, the cast, the trust, the list"],
];

let fail = 0;
for (const [input, want] of CASES) {
  const got = Array.isArray(input) ? FM.modernizeRuns(input).join("") : FM.modernizeText(input);
  if (got !== want) {
    fail += 1;
    console.error(`FAIL  ${JSON.stringify(input)}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got)}`);
  }
}

// Idempotence: modernizing modern text changes nothing, so a page that
// is modernized twice (a re-render, an old caller that also runs
// modernizeSpelling) reads the same.
for (const [input] of CASES) {
  const once = Array.isArray(input) ? FM.modernizeRuns(input).join("") : FM.modernizeText(input);
  const twice = FM.modernizeSpelling(FM.modernizeText(once));
  if (twice !== once) {
    fail += 1;
    console.error(`FAIL idempotence ${JSON.stringify(once)} -> ${JSON.stringify(twice)}`);
  }
}

// Runs keep their number and their boundaries: the reader writes each
// run back into its own text node.
const runs = ["If ", "ye", " live after the flesh, ", "ye shall dye", "."];
const out = FM.modernizeRuns(runs);
if (out.length !== runs.length || out[0] !== "If " || out[1] !== "you") {
  fail += 1;
  console.error(`FAIL runs ${JSON.stringify(out)}`);
}

if (fail) {
  console.error(`check-modernize: ${fail} failure(s) of ${CASES.length * 2 + 1}`);
  process.exit(1);
}
console.log(`check-modernize: ${CASES.length * 2 + 1} checks pass`);
