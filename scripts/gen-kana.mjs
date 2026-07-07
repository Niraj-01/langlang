// Generates data/hiragana.json and data/katakana.json from the gojūon tables.
// Romaji is Hepburn (shi/chi/tsu/fu), long vowels use macrons where relevant.
// Run: node scripts/gen-kana.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
mkdirSync(dataDir, { recursive: true });

// [romaji, type, row, hiragana, katakana]
// type: basic | dakuten | handakuten | yoon    row: vowel column group
const TABLE = [
  // basic
  ["a", "basic", "a", "あ", "ア"], ["i", "basic", "a", "い", "イ"], ["u", "basic", "a", "う", "ウ"], ["e", "basic", "a", "え", "エ"], ["o", "basic", "a", "お", "オ"],
  ["ka", "basic", "k", "か", "カ"], ["ki", "basic", "k", "き", "キ"], ["ku", "basic", "k", "く", "ク"], ["ke", "basic", "k", "け", "ケ"], ["ko", "basic", "k", "こ", "コ"],
  ["sa", "basic", "s", "さ", "サ"], ["shi", "basic", "s", "し", "シ"], ["su", "basic", "s", "す", "ス"], ["se", "basic", "s", "せ", "セ"], ["so", "basic", "s", "そ", "ソ"],
  ["ta", "basic", "t", "た", "タ"], ["chi", "basic", "t", "ち", "チ"], ["tsu", "basic", "t", "つ", "ツ"], ["te", "basic", "t", "て", "テ"], ["to", "basic", "t", "と", "ト"],
  ["na", "basic", "n", "な", "ナ"], ["ni", "basic", "n", "に", "ニ"], ["nu", "basic", "n", "ぬ", "ヌ"], ["ne", "basic", "n", "ね", "ネ"], ["no", "basic", "n", "の", "ノ"],
  ["ha", "basic", "h", "は", "ハ"], ["hi", "basic", "h", "ひ", "ヒ"], ["fu", "basic", "h", "ふ", "フ"], ["he", "basic", "h", "へ", "ヘ"], ["ho", "basic", "h", "ほ", "ホ"],
  ["ma", "basic", "m", "ま", "マ"], ["mi", "basic", "m", "み", "ミ"], ["mu", "basic", "m", "む", "ム"], ["me", "basic", "m", "め", "メ"], ["mo", "basic", "m", "も", "モ"],
  ["ya", "basic", "y", "や", "ヤ"], ["yu", "basic", "y", "ゆ", "ユ"], ["yo", "basic", "y", "よ", "ヨ"],
  ["ra", "basic", "r", "ら", "ラ"], ["ri", "basic", "r", "り", "リ"], ["ru", "basic", "r", "る", "ル"], ["re", "basic", "r", "れ", "レ"], ["ro", "basic", "r", "ろ", "ロ"],
  ["wa", "basic", "w", "わ", "ワ"], ["wo", "basic", "w", "を", "ヲ"],
  ["n", "basic", "n2", "ん", "ン"],
  // dakuten
  ["ga", "dakuten", "g", "が", "ガ"], ["gi", "dakuten", "g", "ぎ", "ギ"], ["gu", "dakuten", "g", "ぐ", "グ"], ["ge", "dakuten", "g", "げ", "ゲ"], ["go", "dakuten", "g", "ご", "ゴ"],
  ["za", "dakuten", "z", "ざ", "ザ"], ["ji", "dakuten", "z", "じ", "ジ"], ["zu", "dakuten", "z", "ず", "ズ"], ["ze", "dakuten", "z", "ぜ", "ゼ"], ["zo", "dakuten", "z", "ぞ", "ゾ"],
  ["da", "dakuten", "d", "だ", "ダ"], ["ji ", "dakuten", "d", "ぢ", "ヂ"], ["zu ", "dakuten", "d", "づ", "ヅ"], ["de", "dakuten", "d", "で", "デ"], ["do", "dakuten", "d", "ど", "ド"],
  ["ba", "dakuten", "b", "ば", "バ"], ["bi", "dakuten", "b", "び", "ビ"], ["bu", "dakuten", "b", "ぶ", "ブ"], ["be", "dakuten", "b", "べ", "ベ"], ["bo", "dakuten", "b", "ぼ", "ボ"],
  // handakuten
  ["pa", "handakuten", "p", "ぱ", "パ"], ["pi", "handakuten", "p", "ぴ", "ピ"], ["pu", "handakuten", "p", "ぷ", "プ"], ["pe", "handakuten", "p", "ぺ", "ペ"], ["po", "handakuten", "p", "ぽ", "ポ"],
  // yōon
  ["kya", "yoon", "k", "きゃ", "キャ"], ["kyu", "yoon", "k", "きゅ", "キュ"], ["kyo", "yoon", "k", "きょ", "キョ"],
  ["sha", "yoon", "s", "しゃ", "シャ"], ["shu", "yoon", "s", "しゅ", "シュ"], ["sho", "yoon", "s", "しょ", "ショ"],
  ["cha", "yoon", "t", "ちゃ", "チャ"], ["chu", "yoon", "t", "ちゅ", "チュ"], ["cho", "yoon", "t", "ちょ", "チョ"],
  ["nya", "yoon", "n", "にゃ", "ニャ"], ["nyu", "yoon", "n", "にゅ", "ニュ"], ["nyo", "yoon", "n", "にょ", "ニョ"],
  ["hya", "yoon", "h", "ひゃ", "ヒャ"], ["hyu", "yoon", "h", "ひゅ", "ヒュ"], ["hyo", "yoon", "h", "ひょ", "ヒョ"],
  ["mya", "yoon", "m", "みゃ", "ミャ"], ["myu", "yoon", "m", "みゅ", "ミュ"], ["myo", "yoon", "m", "みょ", "ミョ"],
  ["rya", "yoon", "r", "りゃ", "リャ"], ["ryu", "yoon", "r", "りゅ", "リュ"], ["ryo", "yoon", "r", "りょ", "リョ"],
  ["gya", "yoon", "g", "ぎゃ", "ギャ"], ["gyu", "yoon", "g", "ぎゅ", "ギュ"], ["gyo", "yoon", "g", "ぎょ", "ギョ"],
  ["ja", "yoon", "z", "じゃ", "ジャ"], ["ju", "yoon", "z", "じゅ", "ジュ"], ["jo", "yoon", "z", "じょ", "ジョ"],
  ["bya", "yoon", "b", "びゃ", "ビャ"], ["byu", "yoon", "b", "びゅ", "ビュ"], ["byo", "yoon", "b", "びょ", "ビョ"],
  ["pya", "yoon", "p", "ぴゃ", "ピャ"], ["pyu", "yoon", "p", "ぴゅ", "ピュ"], ["pyo", "yoon", "p", "ぴょ", "ピョ"],
];

// examples keyed by the kana character (unique). [word, romaji, meaning]
const HIRA_EX = {
  "あ": ["あさ", "asa", "morning"], "い": ["いぬ", "inu", "dog"], "う": ["うみ", "umi", "sea"], "え": ["えき", "eki", "station"], "お": ["おかね", "okane", "money"],
  "か": ["かさ", "kasa", "umbrella"], "き": ["きって", "kitte", "postage stamp"], "く": ["くつ", "kutsu", "shoes"], "け": ["けさ", "kesa", "this morning"], "こ": ["こども", "kodomo", "child"],
  "さ": ["さかな", "sakana", "fish"], "し": ["しま", "shima", "island"], "す": ["すし", "sushi", "sushi"], "せ": ["せかい", "sekai", "world"], "そ": ["そら", "sora", "sky"],
  "た": ["たまご", "tamago", "egg"], "ち": ["ちず", "chizu", "map"], "つ": ["つき", "tsuki", "moon"], "て": ["て", "te", "hand"], "と": ["とり", "tori", "bird"],
  "な": ["なつ", "natsu", "summer"], "に": ["にく", "niku", "meat"], "ぬ": ["ぬの", "nuno", "cloth"], "ね": ["ねこ", "neko", "cat"], "の": ["のり", "nori", "seaweed"],
  "は": ["はな", "hana", "flower"], "ひ": ["ひと", "hito", "person"], "ふ": ["ふゆ", "fuyu", "winter"], "へ": ["へや", "heya", "room"], "ほ": ["ほし", "hoshi", "star"],
  "ま": ["まど", "mado", "window"], "み": ["みず", "mizu", "water"], "む": ["むし", "mushi", "insect"], "め": ["め", "me", "eye"], "も": ["もり", "mori", "forest"],
  "や": ["やま", "yama", "mountain"], "ゆ": ["ゆき", "yuki", "snow"], "よ": ["よる", "yoru", "night"],
  "ら": ["さくら", "sakura", "cherry blossom"], "り": ["りんご", "ringo", "apple"], "る": ["くるま", "kuruma", "car"], "れ": ["れきし", "rekishi", "history"], "ろ": ["いろ", "iro", "color"],
  "わ": ["わたし", "watashi", "I, me"], "を": ["パンをたべる", "pan wo taberu", "eat bread (object particle)"],
  "ん": ["ほん", "hon", "book"],
  "が": ["がっこう", "gakkou", "school"], "ぎ": ["かぎ", "kagi", "key"], "ぐ": ["かぐ", "kagu", "furniture"], "げ": ["げんき", "genki", "healthy, energetic"], "ご": ["ごはん", "gohan", "rice, meal"],
  "ざ": ["ざっし", "zasshi", "magazine"], "じ": ["じかん", "jikan", "time"], "ず": ["ちず", "chizu", "map"], "ぜ": ["かぜ", "kaze", "wind, a cold"], "ぞ": ["ぞう", "zou", "elephant"],
  "だ": ["からだ", "karada", "body"], "ぢ": ["はなぢ", "hanaji", "nosebleed"], "づ": ["つづく", "tsuzuku", "to continue"], "で": ["でんわ", "denwa", "telephone"], "ど": ["こども", "kodomo", "child"],
  "ば": ["かばん", "kaban", "bag"], "び": ["へび", "hebi", "snake"], "ぶ": ["ぶた", "buta", "pig"], "べ": ["べんとう", "bentou", "lunch box"], "ぼ": ["ぼうし", "boushi", "hat"],
  "ぱ": ["いっぱい", "ippai", "full, a lot"], "ぴ": ["ぴかぴか", "pikapika", "sparkling"], "ぷ": ["てんぷら", "tenpura", "tempura"], "ぺ": ["ぺらぺら", "perapera", "fluently"], "ぽ": ["さんぽ", "sanpo", "a walk"],
  "きゃ": ["きゃく", "kyaku", "guest"], "きゅ": ["きゅう", "kyuu", "nine"], "きょ": ["きょう", "kyou", "today"],
  "しゃ": ["かいしゃ", "kaisha", "company"], "しゅ": ["しゅみ", "shumi", "hobby"], "しょ": ["じしょ", "jisho", "dictionary"],
  "ちゃ": ["おちゃ", "ocha", "tea"], "ちゅ": ["ちゅうい", "chuui", "caution"], "ちょ": ["ちょっと", "chotto", "a little"],
  "にゃ": ["こんにゃく", "konnyaku", "konjac"], "にゅ": ["にゅうがく", "nyuugaku", "school enrollment"], "にょ": ["にょろにょろ", "nyoronyoro", "wriggling"],
  "ひゃ": ["ひゃく", "hyaku", "hundred"], "ひゅ": ["ひゅうひゅう", "hyuuhyuu", "whistling (wind)"], "ひょ": ["ひょう", "hyou", "leopard"],
  "みゃ": ["みゃく", "myaku", "pulse"], "みょ": ["みょうじ", "myouji", "surname"],
  "りゃ": ["りゃく", "ryaku", "abbreviation"], "りゅ": ["りゅう", "ryuu", "dragon"], "りょ": ["りょこう", "ryokou", "travel"],
  "ぎゃ": ["ぎゃく", "gyaku", "opposite, reverse"], "ぎゅ": ["ぎゅうにゅう", "gyuunyuu", "milk"], "ぎょ": ["きんぎょ", "kingyo", "goldfish"],
  "じゃ": ["じゃがいも", "jagaimo", "potato"], "じゅ": ["じゅう", "juu", "ten"], "じょ": ["じょせい", "josei", "woman"],
  "びゃ": ["さんびゃく", "sanbyaku", "three hundred"], "びょ": ["びょういん", "byouin", "hospital"],
  "ぴゃ": ["ろっぴゃく", "roppyaku", "six hundred"], "ぴゅ": ["ぴゅうぴゅう", "pyuupyuu", "whistling (wind)"], "ぴょ": ["はっぴょう", "happyou", "presentation"],
};

const KATA_EX = {
  "ア": ["アイス", "aisu", "ice cream"], "イ": ["イタリア", "Itaria", "Italy"], "ウ": ["ウール", "ūru", "wool"], "エ": ["エアコン", "eakon", "air conditioner"], "オ": ["オレンジ", "orenji", "orange"],
  "カ": ["カメラ", "kamera", "camera"], "キ": ["キロ", "kiro", "kilo"], "ク": ["クラス", "kurasu", "class"], "ケ": ["ケーキ", "kēki", "cake"], "コ": ["コーヒー", "kōhī", "coffee"],
  "サ": ["サラダ", "sarada", "salad"], "シ": ["システム", "shisutemu", "system"], "ス": ["スープ", "sūpu", "soup"], "セ": ["セーター", "sētā", "sweater"], "ソ": ["ソファ", "sofa", "sofa"],
  "タ": ["タクシー", "takushī", "taxi"], "チ": ["チーズ", "chīzu", "cheese"], "ツ": ["ツアー", "tsuā", "tour"], "テ": ["テレビ", "terebi", "TV"], "ト": ["トマト", "tomato", "tomato"],
  "ナ": ["ナイフ", "naifu", "knife"], "ニ": ["テニス", "tenisu", "tennis"], "ヌ": ["ヌードル", "nūdoru", "noodle"], "ネ": ["ネクタイ", "nekutai", "necktie"], "ノ": ["ノート", "nōto", "notebook"],
  "ハ": ["ハム", "hamu", "ham"], "ヒ": ["ヒーター", "hītā", "heater"], "フ": ["フォーク", "fōku", "fork"], "ヘ": ["ヘリコプター", "herikoputā", "helicopter"], "ホ": ["ホテル", "hoteru", "hotel"],
  "マ": ["マスク", "masuku", "mask"], "ミ": ["ミルク", "miruku", "milk"], "ム": ["ムード", "mūdo", "mood"], "メ": ["メール", "mēru", "email"], "モ": ["メモ", "memo", "memo"],
  "ヤ": ["タイヤ", "taiya", "tire"], "ユ": ["ユーモア", "yūmoa", "humor"], "ヨ": ["ヨーグルト", "yōguruto", "yogurt"],
  "ラ": ["ラジオ", "rajio", "radio"], "リ": ["リボン", "ribon", "ribbon"], "ル": ["ルール", "rūru", "rule"], "レ": ["レモン", "remon", "lemon"], "ロ": ["ロボット", "robotto", "robot"],
  "ワ": ["ワイン", "wain", "wine"],
  "ン": ["ペン", "pen", "pen"],
  "ガ": ["ガス", "gasu", "gas"], "ギ": ["ギター", "gitā", "guitar"], "グ": ["グラス", "gurasu", "glass"], "ゲ": ["ゲーム", "gēmu", "game"], "ゴ": ["ゴルフ", "gorufu", "golf"],
  "ザ": ["デザート", "dezāto", "dessert"], "ジ": ["ジーンズ", "jīnzu", "jeans"], "ズ": ["ズボン", "zubon", "trousers"], "ゼ": ["ゼロ", "zero", "zero"], "ゾ": ["ゾーン", "zōn", "zone"],
  "ダ": ["ダンス", "dansu", "dance"], "デ": ["デパート", "depāto", "department store"], "ド": ["ドア", "doa", "door"],
  "バ": ["バス", "basu", "bus"], "ビ": ["ビール", "bīru", "beer"], "ブ": ["ブラシ", "burashi", "brush"], "ベ": ["ベッド", "beddo", "bed"], "ボ": ["ボタン", "botan", "button"],
  "パ": ["パン", "pan", "bread"], "ピ": ["ピアノ", "piano", "piano"], "プ": ["プール", "pūru", "swimming pool"], "ペ": ["ペン", "pen", "pen"], "ポ": ["ポスト", "posuto", "mailbox"],
  "キャ": ["キャンプ", "kyanpu", "camp"], "キュ": ["キュート", "kyūto", "cute"],
  "シャ": ["シャツ", "shatsu", "shirt"], "シュ": ["シュート", "shūto", "shoot"], "ショ": ["ショップ", "shoppu", "shop"],
  "チャ": ["チャンス", "chansu", "chance"], "チュ": ["チューブ", "chūbu", "tube"], "チョ": ["チョコ", "choko", "chocolate"],
  "ニュ": ["ニュース", "nyūsu", "news"],
  "ヒュ": ["ヒューズ", "hyūzu", "fuse"],
  "ミュ": ["ミュージック", "myūjikku", "music"],
  "リュ": ["リュック", "ryukku", "backpack"],
  "ギャ": ["ギャラリー", "gyararī", "gallery"],
  "ジャ": ["ジャケット", "jaketto", "jacket"], "ジュ": ["ジュース", "jūsu", "juice"], "ジョ": ["ジョギング", "jogingu", "jogging"],
  "ビュ": ["インタビュー", "intabyū", "interview"],
  "ピュ": ["コンピューター", "konpyūtā", "computer"],
};

function build(kind) {
  return TABLE.map(([romaji, type, row, hira, kata]) => {
    const char = kind === "hiragana" ? hira : kata;
    const ex = (kind === "hiragana" ? HIRA_EX : KATA_EX)[char];
    const entry = { char, romaji: romaji.trim(), type, row };
    if (ex) entry.example = { word: ex[0], romaji: ex[1], meaning: ex[2] };
    return entry;
  });
}

writeFileSync(join(dataDir, "hiragana.json"), JSON.stringify(build("hiragana"), null, 2));
writeFileSync(join(dataDir, "katakana.json"), JSON.stringify(build("katakana"), null, 2));

const h = build("hiragana");
console.log(
  `hiragana: ${h.length} (basic ${h.filter((e) => e.type === "basic").length}, dakuten ${h.filter((e) => e.type === "dakuten").length}, handakuten ${h.filter((e) => e.type === "handakuten").length}, yoon ${h.filter((e) => e.type === "yoon").length})`
);
