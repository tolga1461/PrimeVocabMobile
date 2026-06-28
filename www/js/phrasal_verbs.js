// content/phrasal_verbs.js — En sık kullanılan 250+ İngilizce Deyimsel Fiil (Phrasal Verbs)
// Bu veri tabanı, altyazılarda phrasal verb'leri tespit etmek ve çevirmek için kullanılır.
const PHRASAL_VERBS_DB = {
    "act out": { "tr": "davranışlarıyla göstermek, rol yapmak" },
    "add up": { "tr": "akla yatkın gelmek, toplamak" },
    "adhere to": { "tr": "bağlı kalmak, uymak" },
    "aim at": { "tr": "hedeflemek, amaçlamak" },
    "allow for": { "tr": "hesaba katmak, göz önünde bulundurmak" },
    "allude to": { "tr": "ima etmek, dokundurmak" },
    "amount to": { "tr": "tutarına ulaşmak, anlamına gelmek" },
    "appeal to": { "tr": "hitap etmek, cazip gelmek" },
    "ask around": { "tr": "etrafa sormak, soruşturmak" },
    "ask out": { "tr": "çıkma teklif etmek" },
    "back down": { "tr": "geri adım atmak, vazgeçmek" },
    "back off": { "tr": "geri çekilmek, vazgeçmek" },
    "back up": { "tr": "yedeklemek, desteklemek, arkasında durmak" },
    "bank on": { "tr": "bel bağlamak, güvenmek" },
    "bargain for": { "tr": "beklemek, hesaba katmak" },
    "bawl out": { "tr": "azarlamak, çıkışmak" },
    "bear with": { "tr": "katlanmak, sabretmek" },
    "beat up": { "tr": "hırpalamak, dövmek" },
    "bend over": { "tr": "eğilmek, üstüne düşmek" },
    "bite off": { "tr": "ısırmak, dişlemek" },
    "black out": { "tr": "bayılmak, bilincini kaybetmek, karartmak" },
    "blow up": { "tr": "patlamak, patlatmak, öfkeden deliye dönmek" },
    "boil down to": { "tr": "özetlemek, -e indirgenmek" },
    "break down": { "tr": "bozulmak (makine), çökmek (psikolojik), parçalara ayırmak" },
    "break in": { "tr": "zorla girmek, lafa karışmak, alıştırmak" },
    "break off": { "tr": "ilişkiyi kesmek, koparmak" },
    "break out": { "tr": "patlak vermek (savaş/yangın), kaçmak (hapishaneden)" },
    "break up": { "tr": "ayrılmak (ilişki), parçalanmak, dağılmak" },
    "bring about": { "tr": "sebep olmak, yol açmak" },
    "bring along": { "tr": "yanında getirmek" },
    "bring back": { "tr": "geri getirmek, hatırlatmak" },
    "bring down": { "tr": "devirmek, indirmek, moralini bozmak" },
    "bring forward": { "tr": "öne sürmek, erken tarihe almak" },
    "bring in": { "tr": "kazandırmak, içeri almak, dahil etmek" },
    "bring off": { "tr": "başarıyla tamamlamak, kurtarmak" },
    "bring on": { "tr": "yol açmak, sebep olmak (hastalık vb.)" },
    "bring out": { "tr": "piyasaya sürmek, ortaya çıkarmak" },
    "bring up": { "tr": "büyütmek (çocuk), konuyu açmak, gündeme getirmek" },
    "brush up": { "tr": "bilgiyi tazelemek, geliştirmek" },
    "burn out": { "tr": "tükenmek, tamamen yanıp kül olmak" },
    "butt in": { "tr": "burnunu sokmak, lafa karışmak" },
    "buy out": { "tr": "hisselerini satın almak" },
    "call back": { "tr": "geri aramak" },
    "call for": { "tr": "gerektirmek, istemek, çağrıda bulunmak" },
    "call off": { "tr": "iptal etmek (etkinlik vb.)" },
    "call on": { "tr": "ziyaret etmek, görevlendirmek, başvurmak" },
    "call out": { "tr": "seslenmek, bağırmak, göreve çağırmak" },
    "calm down": { "tr": "sakinleşmek, yatışmak" },
    "care for": { "tr": "bakmak, ilgilenmek, hoşlanmak/sevmek" },
    "carry away": { "tr": "kendini kaptırmak, alıp götürmek" },
    "carry on": { "tr": "devam etmek, sürdürmek" },
    "carry out": { "tr": "yerine getirmek, uygulamak (deney vb.)" },
    "catch on": { "tr": "anlamak, popüler olmak, yaygınlaşmak" },
    "catch up": { "tr": "yakalamak, aynı seviyeye gelmek, dertleşmek" },
    "cater to": { "tr": "hitap etmek, ihtiyaçlarını karşılamak" },
    "cheat on": { "tr": "aldatmak (eşini/sevgilisini)" },
    "check in": { "tr": "kayıt yaptırmak (otel/havaalanı)" },
    "check out": { "tr": "kontrol etmek, incelemek, otelden ayrılmak" },
    "cheer up": { "tr": "neşelenmek, neşelendirmek" },
    "chicken out": { "tr": "korkup vazgeçmek" },
    "chip in": { "tr": "para katkısında bulunmak, lafa karışmak" },
    "clam up": { "tr": "susup kalmak, ağzını açmamak" },
    "clean up": { "tr": "temizlemek, çekidüzen vermek" },
    "clear up": { "tr": "açıklığa kavuşturmak, havanın açması" },
    "close down": { "tr": "kapatmak, faaliyetine son vermek" },
    "come about": { "tr": "meydana gelmek, olmak" },
    "come across": { "tr": "karşılaşmak, iyi izlenim bırakmak" },
    "come along": { "tr": "birlikte gelmek, gelişme göstermek" },
    "come apart": { "tr": "parçalara ayrılmak, dağılmak" },
    "come around": { "tr": "ziyaret etmek, fikrini değiştirmek, ayılmak" },
    "come back": { "tr": "geri dönmek, tekrar akla gelmek" },
    "come down to": { "tr": "-e dayanmak, indirgenmek" },
    "come down with": { "tr": "hastalanmak, yatağa düşmek" },
    "come forward": { "tr": "öne çıkmak, gönüllü olmak" },
    "come off": { "tr": "başarıyla sonuçlanmak, yerinden çıkmak" },
    "come on": { "tr": "hadi ama, başlamak (televizyon programı vb.)" },
    "come out": { "tr": "ortaya çıkmak, yayınlanmak" },
    "come up with": { "tr": "fikir bulmak, çözüm üretmek" },
    "count on": { "tr": "güvenmek, bel bağlamak" },
    "crack down": { "tr": "önlem almak, göz açtırmamak" },
    "cross out": { "tr": "üzerini çizmek (yazının)" },
    "cut back": { "tr": "kesinti yapmak, azaltmak" },
    "cut down": { "tr": "azaltmak, kısmak, kesmek (ağaç vb.)" },
    "cut in": { "tr": "sözünü kesmek, araya girmek" },
    "cut off": { "tr": "sözünü kesmek, bağlantıyı koparmak, kesip atmak" },
    "cut out": { "tr": "kesip çıkarmak, bırakmak (alışkanlığı)" },
    "dawn on": { "tr": "kafasında şimşek çakmak, jetonu düşmek" },
    "deal with": { "tr": "ilgilenmek, başa çıkmak, ele almak" },
    "die down": { "tr": "yavaş yavaş azalmak, hafiflemek" },
    "die out": { "tr": "nesli tükenmek, yok olmak" },
    "do away with": { "tr": "yürürlükten kaldırmak, kurtulmak" },
    "do over": { "tr": "baştan yapmak, yenilemek" },
    "do without": { "tr": "olmadan idare etmek" },
    "drag on": { "tr": "uzadıkça uzamak, sıkıcı olmak" },
    "draw up": { "tr": "hazırlamak, düzenlemek (sözleşme vb.)" },
    "dress up": { "tr": "şık giyinmek, kostüm giymek" },
    "drift apart": { "tr": "birbirinden uzaklaşmak (ilişki)" },
    "drop by": { "tr": "habersiz uğramak, ziyaret etmek" },
    "drop off": { "tr": "bırakmak (arabayla vb.), uyuyakalmak" },
    "drop out": { "tr": "okulu/üyeliği bırakmak, yarıda kesmek" },
    "eat out": { "tr": "dışarıda yemek yemek" },
    "end up": { "tr": "kendini bir durumda/yerde bulmak, sonuçlanmak" },
    "face up to": { "tr": "kabullenmek, göğüs germek" },
    "fall apart": { "tr": "parçalanmak, çökmek" },
    "fall behind": { "tr": "geride kalmak, gerisinde kalmak" },
    "fall for": { "tr": "aşık olmak, kanmak (yalanına)" },
    "fall out": { "tr": "bozuşmak, kavga etmek" },
    "fall through": { "tr": "suya düşmek, başarısız olmak (plan)" },
    "feel up to": { "tr": "yapacak gücü kendinde bulmak" },
    "fight off": { "tr": "mücadele etmek, defetmek" },
    "figure out": { "tr": "anlamak, çözmek, halletmek" },
    "fill in": { "tr": "doldurmak (form vb.), geçici olarak yerine bakmak" },
    "fill out": { "tr": "doldurmak (form)" },
    "fill up": { "tr": "tamamen doldurmak" },
    "find out": { "tr": "öğrenmek, bulup çıkarmak" },
    "fit in": { "tr": "uyum sağlamak, vakit ayırmak" },
    "follow through": { "tr": "sonuna kadar götürmek, tamamlamak" },
    "follow up": { "tr": "arkasını bırakmamak, takip etmek" },
    "get across": { "tr": "anlatmak, anlaşılmasını sağlamak" },
    "get along": { "tr": "iyi geçinmek, idare etmek" },
    "get around": { "tr": "gezinmek, yayılmak (haber), kaçınmak" },
    "get at": { "tr": "ima etmek, ulaşmak, eleştirmek" },
    "get away": { "tr": "kaçmak, uzaklaşmak, tatil yapmak" },
    "get away with": { "tr": "yanına kar kalmak, sıyrılmak" },
    "get by": { "tr": "kıt kanaat geçinmek, idare etmek" },
    "get down": { "tr": "yazmak, moralini bozmak, aşağı inmek" },
    "get down to": { "tr": "işe koyulmak, ciddi şekilde başlamak" },
    "get in": { "tr": "içeri girmek, kabul edilmek, binmek (araba)" },
    "get off": { "tr": "inmek (otobüs vb.), paçayı kurtarmak" },
    "get on": { "tr": "binmek (tren vb.), iyi geçinmek, devam etmek" },
    "get out": { "tr": "dışarı çıkmak, sızmak (sır)" },
    "get over": { "tr": "atlatmak, iyileşmek, üstesinden gelmek" },
    "get rid of": { "tr": "kurtulmak, başından atmak" },
    "get through": { "tr": "tüketmek, ulaşmak (telefonda), sınavı geçmek" },
    "get up": { "tr": "ayağa kalkmak, yataktan kalkmak" },
    "give away": { "tr": "ele vermek, hediye etmek, bedava vermek" },
    "give in": { "tr": "boyun eğmek, teslim etmek (ödev vb.)" },
    "give out": { "tr": "dağıtmak, tükenmek, bozulmak" },
    "give up": { "tr": "vazgeçmek, pes etmek, bırakmak (alışkanlığı)" },
    "go ahead": { "tr": "devam etmek, başlamak" },
    "go along with": { "tr": "anlaşmak, onaylamak" },
    "go around": { "tr": "herkese yetmek, dönmek, yayılmak" },
    "go back": { "tr": "geri dönmek, geçmişe dayanmak" },
    "go by": { "tr": "zamanın geçmesi, -e göre davranmak" },
    "go down": { "tr": "inmek, azalmak, batmak" },
    "go for": { "tr": "hedeflemek, tercih etmek, saldırmak" },
    "go off": { "tr": "patlamak, çalmak (alarm), bozulmak (yiyecek)" },
    "go on": { "tr": "devam etmek, meydana gelmek" },
    "go out": { "tr": "dışarı çıkmak, flört etmek, sönmek (ışık)" },
    "go over": { "tr": "incelemek, gözden geçirmek, tekrarlamak" },
    "go through": { "tr": "zor bir süreçten geçmek, incelemek" },
    "go under": { "tr": "iflas etmek, batmak" },
    "go without": { "tr": "olmadan idare etmek, mahrum kalmak" },
    "grow apart": { "tr": "birbirinden uzaklaşmak" },
    "grow up": { "tr": "büyümek, olgunlaşmak" },
    "hand down": { "tr": "kuşaktan kuşağa devretmek" },
    "hand in": { "tr": "teslim etmek (ödev/istifa)" },
    "hand out": { "tr": "dağıtmak, vermek" },
    "hand over": { "tr": "teslim etmek, devretmek" },
    "hang out": { "tr": "takılmak, vakit geçirmek" },
    "hang up": { "tr": "telefonu kapatmak, asmak" },
    "head for": { "tr": "-e doğru yönelmek" },
    "hear from": { "tr": "haber almak, mektup/arama almak" },
    "hold back": { "tr": "tutmak, engellemek, gizlemek" },
    "hold on": { "tr": "beklemek (telefonda vb.), sıkı sıkı tutunmak" },
    "hold up": { "tr": "geciktirmek, desteklemek, soygun yapmak" },
    "keep away": { "tr": "uzak tutmak, uzak durmak" },
    "keep on": { "tr": "devam etmek" },
    "keep up": { "tr": "ayak uydurmak, sürdürmek" },
    "kick off": { "tr": "başlatmak (maç/etkinlik)" },
    "lay off": { "tr": "işten çıkarmak, rahat bırakmak" },
    "lead to": { "tr": "yol açmak, sebep olmak" },
    "leave out": { "tr": "dışarıda bırakmak, dahil etmemek" },
    "let down": { "tr": "hayal kırıklığına uğratmak" },
    "let in": { "tr": "içeri almak" },
    "let off": { "tr": "serbest bırakmak, cezalandırmamak" },
    "let out": { "tr": "salıvermek, ses çıkarmak, genişletmek" },
    "log in": { "tr": "giriş yapmak (hesaba)" },
    "log out": { "tr": "çıkış yapmak" },
    "look after": { "tr": "bakmak, ilgilenmek" },
    "look down on": { "tr": "tepeden bakmak, küçümsemek" },
    "look forward to": { "tr": "dört gözle beklemek" },
    "look into": { "tr": "araştırmak, incelemek" },
    "look out": { "tr": "dikkat etmek, gözetlemek" },
    "look up": { "tr": "aramak (sözlükte vb.), düzelmek/gelişmek" },
    "look up to": { "tr": "hayranlık duymak, saygı duymak" },
    "make out": { "tr": "anlamak, seçebilmek (görmek/duymak)" },
    "make up": { "tr": "uydurmak, oluşturmak, barışmak, makyaj yapmak" },
    "make up for": { "tr": "telafi etmek, açığı kapatmak" },
    "mix up": { "tr": "karıştırmak (birini diğeriyle)" },
    "nod off": { "tr": "uyuklamak, içi geçmek" },
    "own up to": { "tr": "itiraf etmek, üstlenmek" },
    "pass away": { "tr": "vefat etmek, ölmek" },
    "pass out": { "tr": "bayılmak, dağıtmak" },
    "pay back": { "tr": "geri ödemek, intikam almak" },
    "pay off": { "tr": "borcunu kapatmak, karşılığını almak" },
    "pick on": { "tr": "sataşmak, uğraşmak" },
    "pick up": { "tr": "toplamak, almak (birini/bir şeyi), öğrenmek (hızlıca)" },
    "point out": { "tr": "işaret etmek, belirtmek" },
    "pull off": { "tr": "başarmak, kenara çekmek (araba)" },
    "pull over": { "tr": "kenara çekmek (araba)" },
    "pull through": { "tr": "paçayı kurtarmak, iyileşmek" },
    "put away": { "tr": "yerine kaldırmak, para biriktirmek" },
    "put down": { "tr": "yere koymak, bastırmak, aşağılamak, kaydetmek" },
    "put off": { "tr": "ertelemek, tiksindirmek" },
    "put on": { "tr": "giymek, kilo almak, sahnelemek" },
    "put out": { "tr": "söndürmek (yangın vb.), dışarı koymak" },
    "put up with": { "tr": "katlanmak, sabretmek" },
    "rule out": { "tr": "elemek, hesaba katmamak" },
    "run away": { "tr": "kaçmak" },
    "run into": { "tr": "rastlamak, çarpmak" },
    "run out of": { "tr": "tükenmek, kalmamak" },
    "set up": { "tr": "kurmak, hazırlamak, tuzak kurmak" },
    "show off": { "tr": "hava atmak, gösteriş yapmak" },
    "show up": { "tr": "gelmek, ortaya çıkmak" },
    "sign up": { "tr": "kaydolmak, üye olmak" },
    "stand out": { "tr": "göze çarpmak, öne çıkmak" },
    "stand up for": { "tr": "savunmak, arkasında durmak" },
    "take after": { "tr": "benzemek (anneye/babaya)" },
    "take apart": { "tr": "parçalara ayırmak" },
    "take back": { "tr": "geri almak, sözünü geri almak" },
    "take down": { "tr": "not almak, indirmek" },
    "take in": { "tr": "anlamak, kandırmak, içeri almak" },
    "take off": { "tr": "havalanmak (uçak), çıkarmak (kıyafet), popüler olmak" },
    "take on": { "tr": "üstlenmek, işe almak" },
    "take over": { "tr": "devralmak, kontrolü ele geçirmek" },
    "take up": { "tr": "başlamak (hobiye vb.), yer kaplamak" },
    "talk back": { "tr": "karşılık vermek, laf yetiştirmek" },
    "tear down": { "tr": "yıkmak, yerle bir etmek" },
    "think over": { "tr": "enine boyuna düşünmek" },
    "throw away": { "tr": "çöpe atmak, boşa harcamak" },
    "try on": { "tr": "denemek (kıyafet)" },
    "try out": { "tr": "denemek, test etmek" },
    "turn down": { "tr": "reddetmek, sesini kısmak" },
    "turn into": { "tr": "-e dönüşmek" },
    "turn off": { "tr": "kapatmak (ışık/cihaz), soğutmak" },
    "turn on": { "tr": "açmak (ışık/cihaz), tahrik etmek" },
    "turn out": { "tr": "sonuçlanmak, ortaya çıkmak" },
    "turn up": { "tr": "gelmek (beklenmedik şekilde), sesini açmak" },
    "use up": { "tr": "tüketmek, harcamak" },
    "watch out": { "tr": "dikkat etmek" },
    "wear out": { "tr": "eskimek, yıpranmak, çok yorulmak" },
    "work out": { "tr": "egzersiz yapmak, çözmek, işe yaramak" },
    "write down": { "tr": "not almak, yazmak" }
};
// ── Shared Verb Base & Phrasal Verb Matching Logic ──
const IRREGULAR_VERBS = {
    "went": "go", "gone": "go",
    "brought": "bring",
    "fell": "fall", "fallen": "fall",
    "got": "get", "gotten": "get",
    "found": "find",
    "grew": "grow", "grown": "grow",
    "heard": "hear",
    "kept": "keep",
    "laid": "lay",
    "led": "lead",
    "ran": "run",
    "stood": "stand",
    "took": "take", "taken": "take",
    "tore": "tear", "torn": "tear",
    "thought": "think",
    "wore": "wear", "worn": "wear",
    "wrote": "write", "written": "write"
};
function getVerbBaseForm(word) {
    const w = word.toLowerCase();
    if (IRREGULAR_VERBS[w])
        return IRREGULAR_VERBS[w];
    if (w.endsWith('s')) {
        if (w.endsWith('ies'))
            return w.slice(0, -3) + 'y';
        if (w.endsWith('es')) {
            const base = w.slice(0, -2);
            if (['ch', 'sh', 'ss', 'x', 'z', 'o'].some(suffix => base.endsWith(suffix)))
                return base;
            return w.slice(0, -1);
        }
        return w.slice(0, -1);
    }
    if (w.endsWith('ing')) {
        const base = w.slice(0, -3);
        if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
            const vowel = 'aeiou';
            if (!vowel.includes(base[base.length - 1]) && vowel.includes(base[base.length - 2])) {
                return base.slice(0, -1);
            }
        }
        const eDropVerbs = ['tak', 'mak', 'hav', 'giv', 'com', 'us', 'writ', 'tear', 'clos', 'rul', 'befal', 'car', 'fac', 'bit'];
        if (eDropVerbs.includes(base))
            return base + 'e';
        return base;
    }
    if (w.endsWith('ed')) {
        const base = w.slice(0, -2);
        if (base.endsWith('i'))
            return base.slice(0, -1) + 'y';
        if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
            return base.slice(0, -1);
        }
        const eVerbs = ['lik', 'liv', 'clos', 'rul', 'us', 'car', 'fac', 'tim', 'bit', 'decid', 'adher', 'allud', 'chastis', 'declin', 'defin', 'despis'];
        if (eVerbs.includes(base))
            return base + 'e';
        return base;
    }
    return w;
}
function findPhrasalVerbMatches(tokens) {
    const words = [];
    tokens.forEach((t, idx) => {
        if (idx % 2 === 1) {
            words.push({
                text: t,
                base: getVerbBaseForm(t),
                tokenIdx: idx,
                wordIdx: words.length
            });
        }
    });
    const matches = [];
    const matchedTokenIndices = new Set();
    const db = typeof PHRASAL_VERBS_DB !== 'undefined' ? PHRASAL_VERBS_DB : {};
    for (let i = 0; i < words.length; i++) {
        const w1 = words[i];
        if (matchedTokenIndices.has(w1.tokenIdx))
            continue;
        // 1. Üç kelimelik yan yana (contiguous)
        if (i + 2 < words.length) {
            const w2 = words[i + 1];
            const w3 = words[i + 2];
            if (!matchedTokenIndices.has(w2.tokenIdx) && !matchedTokenIndices.has(w3.tokenIdx)) {
                const trip = `${w1.base} ${w2.base} ${w3.base}`;
                if (db[trip]) {
                    matches.push({
                        type: "contiguous",
                        base: trip,
                        startTokenIdx: w1.tokenIdx,
                        endTokenIdx: w3.tokenIdx
                    });
                    matchedTokenIndices.add(w1.tokenIdx);
                    matchedTokenIndices.add(w2.tokenIdx);
                    matchedTokenIndices.add(w3.tokenIdx);
                    continue;
                }
            }
        }
        // 2. İki kelimelik yan yana (contiguous)
        if (i + 1 < words.length) {
            const w2 = words[i + 1];
            if (!matchedTokenIndices.has(w2.tokenIdx)) {
                const bip = `${w1.base} ${w2.base}`;
                if (db[bip]) {
                    matches.push({
                        type: "contiguous",
                        base: bip,
                        startTokenIdx: w1.tokenIdx,
                        endTokenIdx: w2.tokenIdx
                    });
                    matchedTokenIndices.add(w1.tokenIdx);
                    matchedTokenIndices.add(w2.tokenIdx);
                    continue;
                }
            }
        }
        // 3. Üç kelimelik ayrık (separated)
        if (i + 2 < words.length) {
            const w2 = words[i + 1];
            const w3 = words[i + 2];
            if (!matchedTokenIndices.has(w3.tokenIdx)) {
                const bipSep = `${w1.base} ${w3.base}`;
                if (db[bipSep] && w2.text.length < 10 && !/^[.,\/#!$%\^&\*;:{}=\-_`~()?]$/.test(w2.text)) {
                    matches.push({
                        type: "separated",
                        base: bipSep,
                        verbTokenIdx: w1.tokenIdx,
                        prepTokenIdx: w3.tokenIdx,
                        verbText: w1.text,
                        prepText: w3.text
                    });
                    matchedTokenIndices.add(w1.tokenIdx);
                    matchedTokenIndices.add(w3.tokenIdx);
                    continue;
                }
            }
        }
    }
    return matches;
}
