import type { ListingCondition, RulePreset } from '@yoyo/shared';
import type { Pictogram } from './pictograms';

/**
 * Example listings for Latvia (owner, 2026-11-16: full descriptions, several pictures each, marked as
 * examples on the live site). Prices in euros a day; the deposit in euros. Mostly Latvian, some English
 * and Russian, as real owners would write.
 */
export interface DemoListing {
  pictogram: Pictogram;
  category: string;
  locale: 'lv' | 'en' | 'ru';
  title: string;
  description: string;
  condition: ListingCondition;
  attributes: Record<string, string | number | boolean>;
  daily: number;
  weeklyDiscount: number;
  deposit: number;
  minDays: number;
  maxDays: number;
  city: string;
  district: string;
  lat: number;
  lng: number;
  rules: RulePreset[];
  custom?: string[];
}

export const DEMO_LISTINGS: DemoListing[] = [
  {
    pictogram: 'drill', category: 'drills-drivers', locale: 'lv',
    title: 'Bosch GSR 18V akumulatora urbjmašīna ar diviem akumulatoriem',
    description:
      'Uzticama 18 V urbjmašīna mājas darbiem: plauktu piestiprināšanai, mēbeļu salikšanai un caurumu urbšanai kokā vai metālā. Komplektā divi 2,0 Ah akumulatori, lādētājs un 30 uzgaļu komplekts koferī.\n\nDivi ātrumi, 20 griezes momenta pakāpes un LED gaisma. Akumulators pilns, kad saņemat. Betonam labāk izvēlieties perforatoru.\n\nSaņemšana Teikā, darba dienās pēc 18:00 vai brīvdienās. Lūdzu, atgrieziet tīru un koferī.',
    condition: 'LIKE_NEW', attributes: { brand: 'Bosch', model: 'GSR 18V-55' },
    daily: 6, weeklyDiscount: 25, deposit: 60, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Teika', lat: 56.9744, lng: 24.1792, rules: ['ID_AT_PICKUP', 'RETURN_CLEAN'],
  },
  {
    pictogram: 'tent', category: 'tents', locale: 'lv',
    title: 'Četrvietīga telts Coleman Darwin 4+ ar priekšnojumi',
    description:
      'Plaša četrvietīga telts ģimenes pārgājienam vai festivālam. Atsevišķa guļamtelpa un priekšnojume mantām, ūdensizturība 3000 mm, uzstādīšana ar diviem cilvēkiem aizņem ap 15 minūtēm.\n\nKomplektā mieti, atsaites un soma. Telts izmantota trīs reizes, bez caurumiem un smakām.\n\nPēc lietošanas lūdzu izžāvēt, pirms ieliekat somā. Saņemšana Imantā vai Zolitūdē.',
    condition: 'GOOD', attributes: { brand: 'Coleman', model: 'Darwin 4+' },
    daily: 9, weeklyDiscount: 30, deposit: 80, minDays: 2, maxDays: 21,
    city: 'Rīga', district: 'Imanta', lat: 56.9577, lng: 23.9907, rules: ['RETURN_CLEAN', 'CARE_INSTRUCTIONS'], custom: ['Atgriezt sausu'],
  },
  {
    pictogram: 'projector', category: 'projectors', locale: 'en',
    title: 'Full HD projector with 100" screen for movie nights',
    description:
      'An Epson Full HD projector with a 100-inch pull-up screen: garden cinema, a birthday, a presentation or the football final. 3000 lumens, HDMI and Bluetooth sound out, quiet fan.\n\nIncluded: the projector, the screen with its stand, a 5 m HDMI cable, a remote and a carry bag. Works with a laptop, a console or a streaming stick.\n\nPick-up in Āgenskalns. I show you how it works in two minutes.',
    condition: 'LIKE_NEW', attributes: { brand: 'Epson', model: 'EH-TW740' },
    daily: 15, weeklyDiscount: 20, deposit: 150, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Āgenskalns', lat: 56.9441, lng: 24.0805, rules: ['ID_AT_PICKUP', 'PICKUP_ONLY'],
  },
  {
    pictogram: 'camera', category: 'cameras', locale: 'lv',
    title: 'Sony A7 III bezspoguļa kamera ar 28–70 mm objektīvu',
    description:
      'Pilna kadra kamera kāzām, ceļojumam vai portretiem. Komplektā 28–70 mm objektīvs, divi akumulatori, lādētājs, 64 GB SD karte un siksna.\n\nKamerai ir aptuveni 18 000 kadru, sensors tīrs. Ja vajag, iedošu arī 50 mm f/1.8 par 5 € dienā.\n\nNododu personīgi Centrā, pārbaudām kopā. Lūdzu nefotografēt lietū bez aizsardzības.',
    condition: 'GOOD', attributes: { brand: 'Sony', model: 'A7 III' },
    daily: 35, weeklyDiscount: 20, deposit: 400, minDays: 1, maxDays: 10,
    city: 'Rīga', district: 'Centrs', lat: 56.9536, lng: 24.1180, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    pictogram: 'bike', category: 'cycling', locale: 'lv',
    title: 'Pilsētas velosipēds Trek FX 2 (M izmērs) ar slēdzeni',
    description:
      'Viegls hibrīdvelosipēds braucieniem pa pilsētu un Jūrmalas promenādi. 24 ātrumi, disku bremzes, M rāmis cilvēkiem no 170 līdz 185 cm.\n\nKomplektā U slēdzene, priekšējais un aizmugurējais lukturis un pudeles turētājs. Ķivere pēc pieprasījuma.\n\nSaņemšana Majoros. Lūdzu, neatstājiet nepieslēgtu.',
    condition: 'GOOD', attributes: { brand: 'Trek', model: 'FX 2' },
    daily: 10, weeklyDiscount: 30, deposit: 120, minDays: 1, maxDays: 30,
    city: 'Jūrmala', district: 'Majori', lat: 56.9705, lng: 23.7990, rules: ['ID_AT_PICKUP'],
  },
  {
    pictogram: 'kayak', category: 'kayaks-canoes', locale: 'lv',
    title: 'Divvietīgs piepūšamais kajaks Gumotex ar airiem un vestēm',
    description:
      'Stabils piepūšamais kajaks Gaujai, Abavai vai ezeram. Ietilpst automašīnas bagāžniekā, uzpūšana aizņem 10 minūtes ar komplektā esošo pumpi.\n\nKomplektā divi airi, divas glābšanas vestes, ūdensdroša soma un remonta komplekts.\n\nSaņemšana Siguldā pie stacijas. Pēc brauciena lūdzu noskalot un izžāvēt.',
    condition: 'GOOD', attributes: { brand: 'Gumotex', model: 'Twist 2' },
    daily: 25, weeklyDiscount: 25, deposit: 200, minDays: 1, maxDays: 14,
    city: 'Sigulda', district: 'Centrs', lat: 57.1537, lng: 24.8530, rules: ['ID_AT_PICKUP', 'RETURN_CLEAN'], custom: ['Atgriezt sausu'],
  },
  {
    pictogram: 'ladder', category: 'ladders-scaffolding', locale: 'ru',
    title: 'Алюминиевая лестница-трансформер 4×4, до 4,5 м',
    description:
      'Универсальная лестница: стремянка, приставная или подмости. Рабочая высота до 4,5 м, выдерживает 150 кг, весит 14 кг.\n\nПодходит для покраски потолка, замены ламп, работы с фасадом частного дома. Все фиксаторы исправны.\n\nЗабрать в Пурвциемсе, помогу погрузить. Нужна машина-универсал или багажник на крыше.',
    condition: 'GOOD', attributes: { brand: 'Krause', model: 'MultiMatic 4×4' },
    daily: 7, weeklyDiscount: 30, deposit: 70, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Purvciems', lat: 56.9603, lng: 24.1989, rules: ['PICKUP_ONLY'],
  },
  {
    pictogram: 'washer', category: 'pressure-washers', locale: 'lv',
    title: 'Kärcher K5 augstspiediena mazgātājs terasei un auto',
    description:
      'Jaudīgs mazgātājs bruģim, terasei, žogam un automašīnai. 145 bar, 10 m šļūtene, rotējošā sprausla un virsmu tīrītājs T 350 komplektā.\n\nNoder pavasara tīrīšanai: terases dēļi izskatās kā jauni pēc stundas darba.\n\nSaņemšana Jelgavā. Lūdzu, neatstājiet ūdeni sistēmā salā.',
    condition: 'LIKE_NEW', attributes: { brand: 'Kärcher', model: 'K5 Premium' },
    daily: 18, weeklyDiscount: 25, deposit: 120, minDays: 1, maxDays: 7,
    city: 'Jelgava', district: 'Centrs', lat: 56.6511, lng: 23.7213, rules: ['RETURN_CLEAN', 'CARE_INSTRUCTIONS'],
  },
  {
    pictogram: 'speaker', category: 'speakers-audio', locale: 'en',
    title: 'JBL PartyBox 310 speaker with two wireless microphones',
    description:
      'A loud, clean party speaker for a garden party, a wedding after-party or karaoke night. Up to 18 hours on battery, light show, Bluetooth and a guitar input.\n\nTwo wireless microphones included, plus a power cable. It rolls on wheels and has a handle.\n\nPick-up in Ziepniekkalns. Please keep it dry and away from the pool.',
    condition: 'LIKE_NEW', attributes: { brand: 'JBL', model: 'PartyBox 310' },
    daily: 25, weeklyDiscount: 20, deposit: 200, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Ziepniekkalns', lat: 56.9047, lng: 24.0990, rules: ['ID_AT_PICKUP'],
  },
  {
    pictogram: 'console', category: 'game-consoles', locale: 'lv',
    title: 'PlayStation 5 ar diviem pultiem un trim spēlēm',
    description:
      'PS5 ar disku dzini nedēļas nogalei ar draugiem. Komplektā divi DualSense pulti, HDMI un strāvas kabelis un trīs spēles: EA FC, Gran Turismo 7 un It Takes Two.\n\nKonsole tīra, jaunākā sistēmas versija. Jūsu kontu var pievienot un pēc tam izdzēst.\n\nSaņemšana Valmierā, centrā.',
    condition: 'LIKE_NEW', attributes: { brand: 'Sony', model: 'PlayStation 5' },
    daily: 14, weeklyDiscount: 30, deposit: 250, minDays: 1, maxDays: 14,
    city: 'Valmiera', district: 'Centrs', lat: 57.5384, lng: 25.4263, rules: ['ID_AT_PICKUP', 'NO_SMOKING'],
  },
  {
    pictogram: 'drone', category: 'drones', locale: 'lv',
    title: 'DJI Mini 4 Pro drons ar trim akumulatoriem',
    description:
      'Viegls drons (zem 250 g) video un fotogrāfijām no augšas: 4K/60, šķēršļu sensori visos virzienos, līdz 34 minūtēm lidojuma.\n\nKomplektā RC 2 pults ar ekrānu, trīs akumulatori, lādēšanas centrs un rezerves propelleri.\n\nLūdzu, ievērojiet CAA noteikumus: nelidot virs cilvēkiem un lidostu tuvumā. Saņemšana Ķengaragā.',
    condition: 'LIKE_NEW', attributes: { brand: 'DJI', model: 'Mini 4 Pro' },
    daily: 35, weeklyDiscount: 20, deposit: 300, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Ķengarags', lat: 56.9248, lng: 24.1788, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    pictogram: 'mower', category: 'lawn-mowers-trimmers', locale: 'lv',
    title: 'Akumulatora zāles pļāvējs Makita 46 cm ar savācēju',
    description:
      'Kluss akumulatora pļāvējs līdz 600 m² zālājam. Pļaušanas platums 46 cm, augstums regulējams septiņās pozīcijās, 50 l savācējs.\n\nKomplektā divi 18 V akumulatori un dubultais lādētājs. Nav jāmaisa benzīns un nav smakas.\n\nSaņemšana Ogrē. Pēc lietošanas lūdzu notīrīt zāli no apakšas.',
    condition: 'GOOD', attributes: { brand: 'Makita', model: 'DLM460' },
    daily: 16, weeklyDiscount: 25, deposit: 120, minDays: 1, maxDays: 7,
    city: 'Ogre', district: 'Centrs', lat: 56.8162, lng: 24.6140, rules: ['RETURN_CLEAN'],
  },
  {
    pictogram: 'sup', category: 'sup', locale: 'ru',
    title: 'SUP-доска Aqua Marina 10\'10" с веслом и насосом',
    description:
      'Устойчивая надувная SUP-доска для новичков и прогулок по морю или озеру. Длина 3,3 м, выдерживает до 120 кг.\n\nВ комплекте весло, насос, лиш, рюкзак для переноски и водонепроницаемый чехол для телефона.\n\nЗабрать в Лиепае, недалеко от пляжа. После катания, пожалуйста, ополосните доску пресной водой.',
    condition: 'GOOD', attributes: { brand: 'Aqua Marina', model: 'Beast 10\'10"' },
    daily: 20, weeklyDiscount: 30, deposit: 150, minDays: 1, maxDays: 14,
    city: 'Liepāja', district: 'Centrs', lat: 56.5047, lng: 21.0109, rules: ['RETURN_CLEAN'],
  },
  {
    pictogram: 'stroller', category: 'strollers', locale: 'lv',
    title: 'Ceļojuma ratiņi Babyzen YOYO² — salokās rokas bagāžā',
    description:
      'Viegli ceļojuma ratiņi bērnam no 6 mēnešiem līdz 22 kg. Salokās vienā kustībā un ietilpst lidmašīnas rokas bagāžā.\n\nKomplektā lietus pārvalks, saulessargs un soma. Mazgāti pēc katras nomas.\n\nSaņemšana Daugavpilī. Ideāli, ja atbrauc vecvecāki vai lidojat atvaļinājumā.',
    condition: 'LIKE_NEW', attributes: { brand: 'Babyzen', model: 'YOYO²' },
    daily: 8, weeklyDiscount: 35, deposit: 120, minDays: 2, maxDays: 30,
    city: 'Daugavpils', district: 'Centrs', lat: 55.8747, lng: 26.5362, rules: ['RETURN_CLEAN', 'NO_SMOKING'],
  },
  {
    pictogram: 'roofbox', category: 'roof-boxes-racks', locale: 'lv',
    title: 'Thule Motion XT L jumta kaste (450 l) ar stieņiem',
    description:
      'Liela jumta kaste atvaļinājumam vai slēpošanas braucienam: 450 litri, atveras no abām pusēm, slēdzama ar atslēgu.\n\nPēc vienošanās iedodu arī Thule WingBar stieņus jūsu automašīnai. Palīdzu uzstādīt, tas aizņem 15 minūtes.\n\nSaņemšana Ventspilī. Maksimālais ātrums ar kasti 130 km/h.',
    condition: 'GOOD', attributes: { brand: 'Thule', model: 'Motion XT L' },
    daily: 12, weeklyDiscount: 35, deposit: 150, minDays: 2, maxDays: 30,
    city: 'Ventspils', district: 'Centrs', lat: 57.3894, lng: 21.5606, rules: ['ID_AT_PICKUP', 'PICKUP_ONLY'],
  },
  {
    pictogram: 'partytent', category: 'event-tents', locale: 'lv',
    title: 'Svinību nojume 3×6 m ar sienām — dzimšanas dienai vai kāzām',
    description:
      'Balta svinību nojume līdz 30 viesiem. Izmērs 3×6 m, sešas noņemamas sienas ar logiem, tērauda karkass.\n\nUzstādīšana ar diviem cilvēkiem aizņem ap 40 minūtēm. Instrukcija un smilšu maisi stabilitātei komplektā.\n\nSaņemšana Cēsīs. Par piegādi un uzstādīšanu tuvumā var vienoties atsevišķi.',
    condition: 'GOOD', attributes: { brand: 'Gardebruk', model: 'Pavilion 3×6' },
    daily: 30, weeklyDiscount: 20, deposit: 150, minDays: 1, maxDays: 7,
    city: 'Cēsis', district: 'Centrs', lat: 57.3119, lng: 25.2706, rules: ['RETURN_CLEAN', 'CARE_INSTRUCTIONS'],
  },
  {
    pictogram: 'dj', category: 'dj-equipment', locale: 'en',
    title: 'Pioneer DDJ-FLX6 DJ controller with headphones',
    description:
      'A four-deck DJ controller for a house party or your first gig. Works with rekordbox and Serato (free versions are enough to start).\n\nIncluded: the controller, a USB cable, Pioneer HDJ-X5 headphones and an RCA cable for your speakers.\n\nPick-up in Grīziņkalns. Happy to show the basics if it is your first time.',
    condition: 'LIKE_NEW', attributes: { brand: 'Pioneer', model: 'DDJ-FLX6' },
    daily: 20, weeklyDiscount: 25, deposit: 200, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Grīziņkalns', lat: 56.9611, lng: 24.1497, rules: ['ID_AT_PICKUP', 'NO_SMOKING'],
  },
  {
    pictogram: 'guitar', category: 'instruments', locale: 'lv',
    title: 'Akustiskā ģitāra Yamaha FG800 ar somu un uztvērēju',
    description:
      'Laba skanējuma akustiskā ģitāra iesācējiem un ugunskura vakariem. Masīvā egles virsa, jaunas stīgas.\n\nKomplektā mīksta soma, siksna, kapodastrs un elektroniskais uztvērējs.\n\nSaņemšana Mežaparkā. Ja vēlaties iemēģināt, var atnākt un uzspēlēt pirms nomas.',
    condition: 'GOOD', attributes: { brand: 'Yamaha', model: 'FG800' },
    daily: 6, weeklyDiscount: 35, deposit: 80, minDays: 2, maxDays: 30,
    city: 'Rīga', district: 'Mežaparks', lat: 57.0006, lng: 24.1528, rules: ['CARE_INSTRUCTIONS'],
  },
  {
    pictogram: 'snowboard', category: 'snowboarding', locale: 'lv',
    title: 'Snovbords Burton 155 cm ar stiprinājumiem un zābakiem (43)',
    description:
      'Universāls snovbords iesācējiem un vidējam līmenim. Garums 155 cm, Burton stiprinājumi, zābaki 43. izmērā.\n\nPirms sezonas noslīpēts un ieziests. Komplektā arī ķivere M izmērā un soma.\n\nSaņemšana Siguldā, tieši pirms trases. Ideāli nedēļas nogalei Žagarkalnā.',
    condition: 'GOOD', attributes: { brand: 'Burton', model: 'Ripcord 155' },
    daily: 15, weeklyDiscount: 30, deposit: 150, minDays: 1, maxDays: 14,
    city: 'Sigulda', district: 'Centrs', lat: 57.1530, lng: 24.8590, rules: ['ID_AT_PICKUP'],
  },
  {
    pictogram: 'vacuum', category: 'cleaning-machines', locale: 'ru',
    title: 'Моющий пылесос Kärcher Puzzi 10/1 для диванов и ковров',
    description:
      'Профессиональный моющий пылесос: выводит пятна с дивана, ковра, автосидений. После чистки ткань сохнет за несколько часов.\n\nВ комплекте насадка для мебели, широкая насадка для ковров и бутылка средства RM 760 на 2–3 уборки.\n\nЗабрать в Плявниеках. Пожалуйста, верните с пустыми баками.',
    condition: 'GOOD', attributes: { brand: 'Kärcher', model: 'Puzzi 10/1' },
    daily: 20, weeklyDiscount: 20, deposit: 120, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Pļavnieki', lat: 56.9389, lng: 24.2133, rules: ['RETURN_CLEAN', 'CARE_INSTRUCTIONS'],
  },
  {
    pictogram: 'generator', category: 'generators', locale: 'lv',
    title: 'Invertora ģenerators Honda EU22i (2,2 kW), kluss',
    description:
      'Kluss un drošs ģenerators lauku mājai, pasākumam vai elektrības pārtraukumam. Invertora strāva der arī datoriem un telefoniem.\n\nLīdz 8 stundām darba ar vienu tvertni. Izsniedzu ar pilnu tvertni, lūdzu atgriezt arī pilnu.\n\nSaņemšana Jelgavā. Lietot tikai ārā.',
    condition: 'GOOD', attributes: { brand: 'Honda', model: 'EU22i' },
    daily: 25, weeklyDiscount: 25, deposit: 250, minDays: 1, maxDays: 14,
    city: 'Jelgava', district: 'Pārlielupe', lat: 56.6640, lng: 23.7560, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    pictogram: 'scooter', category: 'e-scooters', locale: 'en',
    title: 'Segway Ninebot Max G30 e-scooter, 65 km range',
    description:
      'A sturdy e-scooter for a week of commuting or a trip along the coast. Up to 65 km on a charge, 25 km/h, puncture-proof tyres.\n\nIncluded: the charger, a lock and a helmet (size M/L). It folds in seconds for the trunk.\n\nPick-up in Jūrmala, Dubulti. Please ride on bike paths and park considerately.',
    condition: 'GOOD', attributes: { brand: 'Segway', model: 'Ninebot Max G30' },
    daily: 15, weeklyDiscount: 30, deposit: 200, minDays: 1, maxDays: 14,
    city: 'Jūrmala', district: 'Dubulti', lat: 56.9727, lng: 23.7719, rules: ['ID_AT_PICKUP'],
  },
  {
    pictogram: 'binoculars', category: 'binoculars', locale: 'lv',
    title: 'Binoklis Nikon Monarch M7 10×42 putnu vērošanai',
    description:
      'Gaišs un ass binoklis putnu vērošanai Kemeros, medībām vai koncertiem. Ūdensizturīgs, ar slāpekli pildīts, neaizsvīst.\n\nKomplektā soma, siksna un tīrīšanas lupatiņa.\n\nSaņemšana Āgenskalnā. Ja dodaties uz Kemeru purvu, ieteikšu labākās vietas.',
    condition: 'LIKE_NEW', attributes: { brand: 'Nikon', magnification: '10×42' },
    daily: 6, weeklyDiscount: 35, deposit: 90, minDays: 1, maxDays: 30,
    city: 'Rīga', district: 'Āgenskalns', lat: 56.9450, lng: 24.0850, rules: ['CARE_INSTRUCTIONS'],
  },
  {
    pictogram: 'saw', category: 'saws', locale: 'lv',
    title: 'Ripzāģis Makita 190 mm ar vadotni un diviem asmeņiem',
    description:
      'Precīzs ripzāģis grīdas dēļiem, saplāksnim un terases remontam. Griešanas dziļums līdz 66 mm, slīpums līdz 45°.\n\nKomplektā 1,4 m vadotne taisniem griezumiem, asmens kokam un asmens laminātam, putekļu adapteris.\n\nSaņemšana Valmierā. Lūdzu, lietojiet aizsargbrilles.',
    condition: 'GOOD', attributes: { brand: 'Makita', model: 'HS7611' },
    daily: 10, weeklyDiscount: 25, deposit: 100, minDays: 1, maxDays: 14,
    city: 'Valmiera', district: 'Centrs', lat: 57.5410, lng: 25.4230, rules: ['ID_AT_PICKUP', 'RETURN_CLEAN'],
  },
];
