import type { ListingCondition, RulePreset } from '@yoyo/shared';

/**
 * Example listings for Latvia (owner, 2026-11-16: full descriptions, several pictures each, marked as
 * examples on the live site; 2026-11-28: fifty of them, with real photos). Prices in euros a day; the
 * deposit in euros. Mostly Latvian, some English and Russian, as real owners would write. Each item names
 * the attributes its category asks for, so its facts and filters work like a real listing's.
 *
 * `photos` are files in `apps/api/assets/demo/` (1200×900 JPEG), free photos from Wikimedia Commons in the
 * public domain or under CC0; `assets/demo/CREDITS.md` lists where each one comes from.
 */
export interface DemoListing {
  photos: string[];
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
    photos: ['drill-0'], category: 'drills-drivers', locale: 'lv',
    title: 'Metabo akumulatora urbjmašīna-skrūvgriezis ar diviem akumulatoriem',
    description:
      'Uzticama 14,4 V urbjmašīna mājas darbiem: plauktu piestiprināšanai, mēbeļu salikšanai un caurumu urbšanai kokā vai metālā. Komplektā divi akumulatori, lādētājs un 30 uzgaļu komplekts koferī.\n\nDivi ātrumi, 20 griezes momenta pakāpes un LED gaisma. Akumulators pilns, kad saņemat. Betonam labāk izvēlieties perforatoru.\n\nSaņemšana Teikā, darba dienās pēc 18:00 vai brīvdienās. Lūdzu, atgrieziet tīru un koferī.',
    condition: 'LIKE_NEW', attributes: { power: 'battery', brand: 'Metabo', model: 'BS 14,4 Li', included: '2 akumulatori, lādētājs, 30 uzgaļi, koferis' },
    daily: 6, weeklyDiscount: 25, deposit: 60, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Teika', lat: 56.9744, lng: 24.1792, rules: ['ID_AT_PICKUP', 'RETURN_CLEAN'],
  },
  {
    photos: ['tent-0', 'tent-1'], category: 'tents', locale: 'lv',
    title: 'Četrvietīga telts Coleman Darwin 4+ ar priekšnojumi',
    description:
      'Plaša četrvietīga telts ģimenes pārgājienam vai festivālam. Atsevišķa guļamtelpa un priekšnojume mantām, ūdensizturība 3000 mm, uzstādīšana ar diviem cilvēkiem aizņem ap 15 minūtēm.\n\nKomplektā mieti, atsaites un soma. Telts izmantota trīs reizes, bez caurumiem un smakām.\n\nPēc lietošanas lūdzu izžāvēt, pirms ieliekat somā. Saņemšana Imantā vai Zolitūdē.',
    condition: 'GOOD', attributes: { people: 4, weight: 9.5, brand: 'Coleman' },
    daily: 9, weeklyDiscount: 30, deposit: 80, minDays: 2, maxDays: 21,
    city: 'Rīga', district: 'Imanta', lat: 56.9577, lng: 23.9907, rules: ['RETURN_CLEAN', 'CARE_INSTRUCTIONS'], custom: ['Atgriezt sausu'],
  },
  {
    photos: ['projector-0', 'projector-1'], category: 'projectors', locale: 'en',
    title: 'Full HD projector with 100" screen for movie nights',
    description:
      'A Full HD projector with a 100-inch pull-up screen: garden cinema, a birthday, a presentation or the football final. 3000 lumens, HDMI and Bluetooth sound out, quiet fan.\n\nIncluded: the projector, the screen with its stand, a 5 m HDMI cable, a remote and a carry bag. Works with a laptop, a console or a streaming stick.\n\nPick-up in Āgenskalns. I show you how it works in two minutes.',
    condition: 'LIKE_NEW', attributes: { resolution: 'full-hd', brightness: 3000, screenIncluded: true },
    daily: 15, weeklyDiscount: 20, deposit: 150, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Āgenskalns', lat: 56.9441, lng: 24.0805, rules: ['ID_AT_PICKUP', 'PICKUP_ONLY'],
  },
  {
    photos: ['camera-0', 'camera-1'], category: 'cameras', locale: 'lv',
    title: 'Olympus OM-D bezspoguļa kamera ar 40–150 mm f/2.8 objektīvu',
    description:
      'Ātra un izturīga kamera sportam, putniem un ceļojumiem. Komplektā gaišs 40–150 mm f/2.8 teleobjektīvs, divi akumulatori, lādētājs, 64 GB SD karte un siksna.\n\nKorpuss aizsargāts pret lietu un putekļiem, stabilizācija pašā kamerā, tāpēc bildes ir asas arī no rokas.\n\nNododu personīgi Centrā, pārbaudām kopā. Ja vajag, iedošu arī 12–40 mm objektīvu par 5 € dienā.',
    condition: 'GOOD', attributes: { type: 'mirrorless', brand: 'Olympus', mount: 'Micro Four Thirds', included: '40–150 mm f/2.8, 2 akumulatori, 64 GB karte' },
    daily: 30, weeklyDiscount: 20, deposit: 400, minDays: 1, maxDays: 10,
    city: 'Rīga', district: 'Centrs', lat: 56.9536, lng: 24.1180, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['bike-0', 'bike-1'], category: 'cycling', locale: 'lv',
    title: 'Pilsētas hibrīdvelosipēds (M izmērs) ar slēdzeni un ķiveri',
    description:
      'Viegls hibrīdvelosipēds braucieniem pa pilsētu un Jūrmalas promenādi. 24 ātrumi, disku bremzes, M rāmis cilvēkiem no 170 līdz 185 cm.\n\nKomplektā U slēdzene, priekšējais un aizmugurējais lukturis, pudeles turētājs un ķivere.\n\nSaņemšana Majoros. Lūdzu, neatstājiet nepieslēgtu.',
    condition: 'GOOD', attributes: { type: 'city', frameSize: 'M', helmet: true },
    daily: 10, weeklyDiscount: 30, deposit: 120, minDays: 1, maxDays: 30,
    city: 'Jūrmala', district: 'Majori', lat: 56.9705, lng: 23.7990, rules: ['ID_AT_PICKUP'],
  },
  {
    photos: ['kayak-0', 'kayak-1'], category: 'kayaks-canoes', locale: 'lv',
    title: 'Divi kajaki ar airiem un vestēm — Gaujai un ezeriem',
    description:
      'Divi stabili vienvietīgi kajaki braucienam pa Gauju, Abavu vai ezeru. Viegli vadāmi arī tiem, kas airē pirmo reizi.\n\nKomplektā divi airi, divas glābšanas vestes un ūdensdroša soma telefonam. Transportēšanai der jumta stieņi; siksnas iedošu.\n\nSaņemšana Siguldā pie stacijas. Cena par abiem kajakiem kopā.',
    condition: 'GOOD', attributes: { type: 'kayak', seats: 1, paddles: true },
    daily: 30, weeklyDiscount: 25, deposit: 250, minDays: 1, maxDays: 14,
    city: 'Sigulda', district: 'Centrs', lat: 57.1537, lng: 24.8530, rules: ['ID_AT_PICKUP', 'RETURN_CLEAN'], custom: ['Atgriezt sausu'],
  },
  {
    photos: ['ladder-0', 'ladder-1'], category: 'ladders-scaffolding', locale: 'ru',
    title: 'Алюминиевая лестница-трансформер 4×4, до 4,5 м',
    description:
      'Универсальная лестница: стремянка, приставная или подмости. Рабочая высота до 4,5 м, выдерживает 150 кг, весит 14 кг.\n\nПодходит для покраски потолка, замены ламп, работы с фасадом частного дома. Все фиксаторы исправны.\n\nЗабрать в Пурвциемсе, помогу погрузить. Нужна машина-универсал или багажник на крыше.',
    condition: 'GOOD', attributes: { type: 'ladder', height: 4.5 },
    daily: 7, weeklyDiscount: 30, deposit: 70, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Purvciems', lat: 56.9603, lng: 24.1989, rules: ['PICKUP_ONLY'],
  },
  {
    photos: ['washer-0', 'washer-1'], category: 'pressure-washers', locale: 'lv',
    title: 'Augstspiediena mazgātājs terasei, bruģim un auto',
    description:
      'Jaudīgs mazgātājs bruģim, terasei, žogam un automašīnai. 145 bar, 10 m šļūtene, rotējošā sprausla un virsmu tīrītājs komplektā.\n\nNoder pavasara tīrīšanai: terases dēļi izskatās kā jauni pēc stundas darba.\n\nSaņemšana Jelgavā. Lūdzu, neatstājiet ūdeni sistēmā salā.',
    condition: 'LIKE_NEW', attributes: { brand: 'Kärcher', pressure: 145, watts: 2100, included: 'Virsmu tīrītājs, 10 m šļūtene, rotējošā sprausla' },
    daily: 18, weeklyDiscount: 25, deposit: 120, minDays: 1, maxDays: 7,
    city: 'Jelgava', district: 'Centrs', lat: 56.6511, lng: 23.7213, rules: ['RETURN_CLEAN', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['speaker2-0', 'speaker2-1'], category: 'speakers-audio', locale: 'en',
    title: 'JBL Boombox portable speaker, 24 hours on a charge',
    description:
      'A loud, clean portable speaker for a garden party, the beach or a boat trip. Up to 24 hours on battery, waterproof, Bluetooth for two phones at once.\n\nIncluded: the charger and a shoulder strap. It can charge your phone too.\n\nPick-up in Ziepniekkalns. Please keep it out of the sand and rinse it with fresh water after the sea.',
    condition: 'LIKE_NEW', attributes: { type: 'speaker', brand: 'JBL', wireless: true },
    daily: 15, weeklyDiscount: 25, deposit: 150, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Ziepniekkalns', lat: 56.9047, lng: 24.0990, rules: ['ID_AT_PICKUP'],
  },
  {
    photos: ['console2-0', 'console2-1'], category: 'game-consoles', locale: 'lv',
    title: 'PlayStation 4 Pro ar diviem pultiem un trim spēlēm',
    description:
      'PS4 Pro nedēļas nogalei ar draugiem. Komplektā divi DualShock pulti, HDMI un strāvas kabelis un trīs spēles: EA FC, Gran Turismo Sport un It Takes Two.\n\nKonsole tīra, jaunākā sistēmas versija. Jūsu kontu var pievienot un pēc tam izdzēst.\n\nSaņemšana Valmierā, centrā.',
    condition: 'GOOD', attributes: { model: 'ps4', controllers: 2, games: 'EA FC, Gran Turismo Sport, It Takes Two' },
    daily: 10, weeklyDiscount: 30, deposit: 150, minDays: 1, maxDays: 14,
    city: 'Valmiera', district: 'Centrs', lat: 57.5384, lng: 25.4263, rules: ['ID_AT_PICKUP', 'NO_SMOKING'],
  },
  {
    photos: ['drone-0', 'drone-1'], category: 'drones', locale: 'lv',
    title: 'DJI Mini drons ar trim akumulatoriem un pulti ar ekrānu',
    description:
      'Viegls drons (zem 250 g) video un fotogrāfijām no augšas: 4K, šķēršļu sensori, līdz 30 minūtēm lidojuma.\n\nKomplektā pults ar ekrānu, trīs akumulatori, lādēšanas centrs un rezerves propelleri.\n\nLūdzu, ievērojiet CAA noteikumus: nelidot virs cilvēkiem un lidostu tuvumā. Saņemšana Ķengaragā.',
    condition: 'LIKE_NEW', attributes: { brand: 'DJI', batteries: 3, camera: true, weight: 249 },
    daily: 30, weeklyDiscount: 20, deposit: 300, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Ķengarags', lat: 56.9248, lng: 24.1788, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['mower-0', 'mower-1'], category: 'lawn-mowers-trimmers', locale: 'lv',
    title: 'Benzīna zāles pļāvējs Honda 46 cm ar savācēju',
    description:
      'Uzticams benzīna pļāvējs zālājam līdz 1000 m². Pļaušanas platums 46 cm, augstums regulējams sešās pozīcijās, 55 l savācējs.\n\nIedarbojas ar pirmo raustienu. Izsniedzu ar pilnu bāku un pārbaudītu eļļu.\n\nSaņemšana Ogrē. Pēc lietošanas lūdzu notīrīt zāli no apakšas.',
    condition: 'GOOD', attributes: { type: 'lawn-mower', power: 'petrol', width: 46, included: '55 l savācējs' },
    daily: 16, weeklyDiscount: 25, deposit: 120, minDays: 1, maxDays: 7,
    city: 'Ogre', district: 'Centrs', lat: 56.8162, lng: 24.6140, rules: ['RETURN_CLEAN'],
  },
  {
    photos: ['sup-0', 'sup-1'], category: 'sup', locale: 'ru',
    title: 'Надувная SUP-доска 3,3 м с веслом и насосом',
    description:
      'Устойчивая надувная SUP-доска для новичков и прогулок по морю или озеру. Длина 3,3 м, выдерживает до 120 кг.\n\nВ комплекте весло, насос, лиш, рюкзак для переноски и водонепроницаемый чехол для телефона.\n\nЗабрать в Лиепае, недалеко от пляжа. После катания, пожалуйста, ополосните доску пресной водой.',
    condition: 'GOOD', attributes: { type: 'inflatable', length: 330, maxLoad: 120, paddle: true },
    daily: 20, weeklyDiscount: 30, deposit: 150, minDays: 1, maxDays: 14,
    city: 'Liepāja', district: 'Centrs', lat: 56.5047, lng: 21.0109, rules: ['RETURN_CLEAN'],
  },
  {
    photos: ['roofbox-0', 'roofbox-1'], category: 'roof-boxes-racks', locale: 'lv',
    title: 'Jumta kaste 450 l, atveras no abām pusēm',
    description:
      'Liela jumta kaste atvaļinājumam vai slēpošanas braucienam: 450 litri, atveras no abām pusēm, slēdzama ar atslēgu.\n\nPēc vienošanās iedodu arī stieņus jūsu automašīnai. Palīdzu uzstādīt, tas aizņem 15 minūtes.\n\nSaņemšana Ventspilī. Maksimālais ātrums ar kasti 130 km/h.',
    condition: 'GOOD', attributes: { type: 'roof-box', volume: 450, fits: 'Stieņiem ar T-skrūvēm vai skavām' },
    daily: 12, weeklyDiscount: 35, deposit: 150, minDays: 2, maxDays: 30,
    city: 'Ventspils', district: 'Centrs', lat: 57.3894, lng: 21.5606, rules: ['ID_AT_PICKUP', 'PICKUP_ONLY'],
  },
  {
    photos: ['partytent-0', 'partytent-1'], category: 'event-tents', locale: 'lv',
    title: 'Balta svinību telts 6×6 m — dzimšanas dienai vai kāzām',
    description:
      'Balta svinību telts ar augstu jumtu līdz 40 viesiem. Izmērs 6×6 m, noņemamas sienas ar logiem, tērauda karkass.\n\nUzstādīšana ar diviem cilvēkiem aizņem ap stundu. Instrukcija un smilšu maisi stabilitātei komplektā.\n\nSaņemšana Cēsīs. Par piegādi un uzstādīšanu tuvumā var vienoties atsevišķi.',
    condition: 'GOOD', attributes: { type: 'tent', capacity: 40, size: '6×6 m' },
    daily: 40, weeklyDiscount: 20, deposit: 200, minDays: 1, maxDays: 7,
    city: 'Cēsis', district: 'Centrs', lat: 57.3119, lng: 25.2706, rules: ['RETURN_CLEAN', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['dj2-0', 'dj2-1'], category: 'dj-equipment', locale: 'en',
    title: 'Pioneer DJ controller and mixer with headphones',
    description:
      'A four-deck DJ controller for a house party or your first gig, with a club-style mixer if you play from your own decks. Works with rekordbox and Serato (free versions are enough to start).\n\nIncluded: the controller, the mixer, USB and RCA cables and closed headphones.\n\nPick-up in Grīziņkalns. Happy to show the basics if it is your first time.',
    condition: 'LIKE_NEW', attributes: { type: 'controller', brand: 'Pioneer', included: 'Mixer, headphones, USB and RCA cables' },
    daily: 25, weeklyDiscount: 25, deposit: 250, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Grīziņkalns', lat: 56.9611, lng: 24.1497, rules: ['ID_AT_PICKUP', 'NO_SMOKING'],
  },
  {
    photos: ['guitar-0'], category: 'instruments', locale: 'lv',
    title: 'Akustiskā ģitāra Yamaha FG800 ar somu',
    description:
      'Laba skanējuma akustiskā ģitāra iesācējiem un ugunskura vakariem. Masīvā egles virsa, jaunas stīgas.\n\nKomplektā mīksta soma, siksna un kapodastrs.\n\nSaņemšana Mežaparkā. Ja vēlaties iemēģināt, var atnākt un uzspēlēt pirms nomas.',
    condition: 'GOOD', attributes: { type: 'guitar', brand: 'Yamaha', case: true },
    daily: 6, weeklyDiscount: 35, deposit: 80, minDays: 2, maxDays: 30,
    city: 'Rīga', district: 'Mežaparks', lat: 57.0006, lng: 24.1528, rules: ['CARE_INSTRUCTIONS'],
  },
  {
    photos: ['carpet-0'], category: 'vacuum-cleaners', locale: 'ru',
    title: 'Мощный циклонный пылесос без мешка — для уборки после ремонта',
    description:
      'Сильный пылесос без мешка для генеральной уборки, после ремонта или переезда. Циклонный фильтр не теряет тягу, контейнер легко вытряхнуть.\n\nВ комплекте щелевая насадка, щётка для мебели и турбощётка для шерсти животных. Фильтр промыт перед каждой арендой.\n\nЗабрать в Плявниеках. Пожалуйста, верните с пустым контейнером.',
    condition: 'GOOD', attributes: { type: 'vacuum', cordless: false },
    daily: 6, weeklyDiscount: 30, deposit: 60, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Pļavnieki', lat: 56.9389, lng: 24.2133, rules: ['RETURN_CLEAN', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['generator-0', 'generator-1'], category: 'generators', locale: 'lv',
    title: 'Benzīna ģenerators 5,5 kW uz riteņiem — lauku mājai un būvei',
    description:
      'Jaudīgs ģenerators būvlaukumam, lauku mājai vai ilgākam elektrības pārtraukumam. Velk betona maisītāju, metināšanas iekārtu un sildītāju vienlaikus.\n\nLīdz 9 stundām darba ar vienu tvertni. Jutīgai elektronikai (datoriem) iesaku stabilizatoru. Izsniedzu ar pilnu tvertni, lūdzu atgriezt arī pilnu.\n\nSaņemšana Jelgavā. Lietot tikai ārā.',
    condition: 'GOOD', attributes: { fuel: 'petrol', output: 5.5, threePhase: false },
    daily: 30, weeklyDiscount: 25, deposit: 300, minDays: 1, maxDays: 14,
    city: 'Jelgava', district: 'Pārlielupe', lat: 56.6640, lng: 23.7560, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['scooter-0', 'scooter-1'], category: 'e-scooters', locale: 'en',
    title: 'Segway Ninebot Max e-scooter, 65 km range',
    description:
      'A sturdy e-scooter for a week of commuting or a trip along the coast. Up to 65 km on a charge, 25 km/h, puncture-proof tyres.\n\nIncluded: the charger, a lock and a helmet (size M/L). It folds in seconds for the trunk.\n\nPick-up in Jūrmala, Dubulti. Please ride on bike paths and park considerately.',
    condition: 'GOOD', attributes: { brand: 'Segway', range: 65, maxSpeed: 25, helmet: true },
    daily: 15, weeklyDiscount: 30, deposit: 200, minDays: 1, maxDays: 14,
    city: 'Jūrmala', district: 'Dubulti', lat: 56.9727, lng: 23.7719, rules: ['ID_AT_PICKUP'],
  },
  {
    photos: ['binoculars-0'], category: 'binoculars', locale: 'lv',
    title: 'Binoklis 10×42 putnu vērošanai',
    description:
      'Gaišs un ass binoklis putnu vērošanai Ķemeros, medībām vai koncertiem. Ūdensizturīgs, ar slāpekli pildīts, neaizsvīst.\n\nKomplektā soma, siksna un tīrīšanas lupatiņa.\n\nSaņemšana Āgenskalnā. Ja dodaties uz Ķemeru purvu, ieteikšu labākās vietas.',
    condition: 'LIKE_NEW', attributes: { brand: 'Nikon', magnification: '10×42' },
    daily: 6, weeklyDiscount: 35, deposit: 90, minDays: 1, maxDays: 30,
    city: 'Rīga', district: 'Āgenskalns', lat: 56.9450, lng: 24.0850, rules: ['CARE_INSTRUCTIONS'],
  },
  {
    photos: ['saw-0'], category: 'saws', locale: 'lv',
    title: 'Ripzāģis 190 mm ar vadotni un diviem asmeņiem',
    description:
      'Precīzs ripzāģis grīdas dēļiem, saplāksnim un terases remontam. Griešanas dziļums līdz 66 mm, slīpums līdz 45°.\n\nKomplektā 1,4 m vadotne taisniem griezumiem, asmens kokam un asmens laminātam, putekļu adapteris.\n\nSaņemšana Valmierā. Lūdzu, lietojiet aizsargbrilles.',
    condition: 'GOOD', attributes: { type: 'circular', power: 'mains', watts: 1200, included: 'Vadotne 1,4 m, 2 asmeņi' },
    daily: 10, weeklyDiscount: 25, deposit: 100, minDays: 1, maxDays: 14,
    city: 'Valmiera', district: 'Centrs', lat: 57.5410, lng: 25.4230, rules: ['ID_AT_PICKUP', 'RETURN_CLEAN'],
  },
  {
    photos: ['hammer-0'], category: 'rotary-hammers', locale: 'lv',
    title: 'Perforators Milwaukee SDS-Plus ar urbjiem betonam',
    description:
      'Jaudīgs perforators caurumiem betonā un ķieģelī: plauktiem, virtuves skapjiem, kronšteinam televizoram. Triecienspēks 2,4 J, kalšanas režīms flīžu noņemšanai.\n\nKomplektā koferis, sānu rokturis, dziļuma ierobežotājs un pieci SDS-Plus urbji no 6 līdz 12 mm.\n\nSaņemšana Sarkandaugavā, vakaros pēc 18:00. Putekļiem iesaku paņemt līdzi putekļu sūcēju.',
    condition: 'GOOD', attributes: { power: 'mains', watts: 800, impact: 2.4, included: 'Koferis, 5 urbji, dziļuma ierobežotājs' },
    daily: 9, weeklyDiscount: 25, deposit: 100, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Sarkandaugava', lat: 56.9939, lng: 24.1261, rules: ['ID_AT_PICKUP', 'RETURN_CLEAN'],
  },
  {
    photos: ['grinder-0'], category: 'grinders-sanders', locale: 'lv',
    title: 'Leņķa slīpmašīna 125 mm ar griešanas un slīpēšanas diskiem',
    description:
      'Leņķa slīpmašīna metāla griešanai, rūsas noņemšanai un flīžu apgriešanai. 1200 W, regulējami apgriezieni, aizsargs un sānu rokturis.\n\nKomplektā pieci griešanas diski metālam, divi slīpēšanas diski un dimanta disks flīzēm.\n\nSaņemšana Salaspilī. Lūdzu, strādājiet ar aizsargbrillēm un cimdiem.',
    condition: 'GOOD', attributes: { type: 'angle-grinder', power: 'mains', watts: 1200, included: '5 griešanas diski, 2 slīpēšanas diski, dimanta disks' },
    daily: 7, weeklyDiscount: 25, deposit: 60, minDays: 1, maxDays: 14,
    city: 'Salaspils', district: 'Centrs', lat: 56.8614, lng: 24.3497, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['compactor-0'], category: 'plate-compactors', locale: 'lv',
    title: 'Vibroplāte ar Honda dzinēju bruģim un pamatiem, 90 kg',
    description:
      'Vibroplāte grunts un šķembu blīvēšanai pirms bruģa, terases vai pamatu liešanas. Honda benzīna dzinējs, plātne 50 cm, svars 90 kg.\n\nKomplektā gumijas paklājs bruģa blīvēšanai, lai neskrāpētu akmeni. Izsniedzu ar pilnu bāku.\n\nSaņemšana Tukumā. Iekraušanai vajag piekabi vai busiņu, palīdzu uzcelt.',
    condition: 'GOOD', attributes: { power: 'petrol', weight: 90, width: 50 },
    daily: 35, weeklyDiscount: 20, deposit: 300, minDays: 1, maxDays: 7,
    city: 'Tukums', district: 'Centrs', lat: 56.9675, lng: 23.1551, rules: ['ID_AT_PICKUP', 'PICKUP_ONLY'],
  },
  {
    photos: ['chainsaw-0', 'chainsaw-1'], category: 'chainsaws', locale: 'lv',
    title: 'Motorzāģis ar 45 cm sliedi malkai un kokiem',
    description:
      'Jaudīgs benzīna motorzāģis malkas sagatavošanai un vētras gāztu koku sazāģēšanai. 45 cm sliede, ķēdes bremze, viegla iedarbināšana.\n\nKomplektā ķēdes eļļa, rezerves ķēde, aizsargbikses (L) un ķivere ar sietu. Ķēde uzasināta.\n\nSaņemšana Kuldīgā. Izsniedzu tikai pieaugušajiem ar pieredzi; ātri parādīšu drošības pamatus.',
    condition: 'GOOD', attributes: { power: 'petrol', bar: 45, protection: true },
    daily: 25, weeklyDiscount: 25, deposit: 200, minDays: 1, maxDays: 7,
    city: 'Kuldīga', district: 'Centrs', lat: 56.9677, lng: 21.9686, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['hedgetrimmer-0', 'hedgetrimmer-1'], category: 'garden-power-tools', locale: 'lv',
    title: 'Elektriskās dzīvžoga šķēres 60 cm',
    description:
      'Vieglas dzīvžoga šķēres tūjām, lazdām un krūmiem. 60 cm asmens, griež zarus līdz 24 mm, svars tikai 3,5 kg.\n\nKomplektā 20 m pagarinātājs un asmens aizsargs. Asmeņi ieeļļoti pirms katras nomas.\n\nSaņemšana Bauskā. Pēc darba lūdzu notīrīt lapas no asmeņiem.',
    condition: 'GOOD', attributes: { type: 'hedge-trimmer', power: 'mains', included: '20 m pagarinātājs, asmens aizsargs' },
    daily: 8, weeklyDiscount: 30, deposit: 60, minDays: 1, maxDays: 14,
    city: 'Bauska', district: 'Centrs', lat: 56.4079, lng: 24.1875, rules: ['RETURN_CLEAN'],
  },
  {
    photos: ['trampoline-0', 'trampoline-1'], category: 'trampolines', locale: 'lv',
    title: 'Batuts 3,7 m ar drošības tīklu un kāpnītēm',
    description:
      'Liels dārza batuts bērnu ballītei vai vasaras nedēļai pie vecvecākiem. Diametrs 3,7 m, drošības tīkls, polsterēts rāmis un kāpnītes.\n\nPalīdzu izjaukt un salikt: tas aizņem ap stundu. Transportēšanai vajag busiņu vai piekabi.\n\nSaņemšana Bulduros. Maksimālā slodze 150 kg, lēkt pa vienam.',
    condition: 'GOOD', attributes: { diameter: 3.7, net: true },
    daily: 15, weeklyDiscount: 35, deposit: 150, minDays: 2, maxDays: 30,
    city: 'Jūrmala', district: 'Bulduri', lat: 56.9813, lng: 23.8606, rules: ['PICKUP_ONLY', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['standmixer-0'], category: 'kitchen-appliances', locale: 'en',
    title: 'KitchenAid stand mixer with three attachments',
    description:
      'A classic 4.8-litre stand mixer for a baking weekend, a birthday cake or Christmas gingerbread. Ten speeds and a steady planetary motion.\n\nIncluded: the bowl, a whisk, a flat beater, a dough hook and a pouring shield. Everything washed and ready.\n\nPick-up in Čiekurkalns. Please return the bowl and tools clean.',
    condition: 'GOOD', attributes: { type: 'mixer', brand: 'KitchenAid', watts: 300 },
    daily: 9, weeklyDiscount: 30, deposit: 120, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Čiekurkalns', lat: 56.9858, lng: 24.1617, rules: ['RETURN_CLEAN'],
  },
  {
    photos: ['tablet-0'], category: 'laptops-tablets', locale: 'lv',
    title: 'iPad 10,2" ar vāciņu — ceļojumam vai bērnu multfilmām',
    description:
      'iPad garam braucienam, lidojumam vai prezentācijai. 10,2 collu ekrāns, 64 GB, Wi-Fi. Ir trīs vienādi, ja vajag vairākiem bērniem.\n\nKomplektā vāciņš ar statīvu, lādētājs un bērnu austiņas. Pirms nomas ierīce atiestatīta, varat pieslēgt savu Apple ID.\n\nSaņemšana Torņakalnā. Pēc nomas atiestatīšu vēlreiz, jūsu dati nepaliks.',
    condition: 'GOOD', attributes: { type: 'tablet', brand: 'Apple', screen: 10.2, charger: true },
    daily: 6, weeklyDiscount: 35, deposit: 150, minDays: 2, maxDays: 30,
    city: 'Rīga', district: 'Torņakalns', lat: 56.9351, lng: 24.0901, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['gopro-0', 'gopro-1'], category: 'action-cameras', locale: 'ru',
    title: 'GoPro с креплениями для шлема, велосипеда и серфа',
    description:
      'Экшн-камера для велопоходов, катания на SUP и путешествий. Снимает 4K, водонепроницаема без бокса до 10 м.\n\nВ комплекте два аккумулятора, карта на 128 ГБ, крепления на шлем, руль и грудь, плавающая ручка.\n\nЗабрать в Лиепае. Перед возвратом, пожалуйста, скопируйте свои видео с карты.',
    condition: 'GOOD', attributes: { brand: 'GoPro', model: 'HERO', waterproof: true, included: '2 аккумулятора, карта 128 ГБ, крепления' },
    daily: 12, weeklyDiscount: 30, deposit: 150, minDays: 1, maxDays: 14,
    city: 'Liepāja', district: 'Centrs', lat: 56.5110, lng: 21.0140, rules: ['ID_AT_PICKUP'],
  },
  {
    photos: ['lens-0', 'lens-1'], category: 'lenses-flashes', locale: 'lv',
    title: 'Spoguļobjektīvs 500 mm putnu un Mēness fotografēšanai',
    description:
      'Kompakts spoguļobjektīvs garajam fokusam: putni, Mēness, sports no tālienes. Manuāla fokusēšana, ļoti viegls salīdzinājumā ar parastu 500 mm objektīvu.\n\nKomplektā T2 adapteri Nikon F un Canon EF stiprinājumam, saules aizsargs un futrālis.\n\nSaņemšana Centrā. Ja nav pieredzes ar manuālo fokusu, parādīšu, kā ar to strādāt.',
    condition: 'GOOD', attributes: { type: 'lens', mount: 'Nikon F / Canon EF (T2)', focal: '500 mm' },
    daily: 8, weeklyDiscount: 30, deposit: 120, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Centrs', lat: 56.9496, lng: 24.1052, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['tripod-0', 'tripod-1'], category: 'tripods-stabilizers', locale: 'en',
    title: 'Sturdy tripod with a gimbal head for long lenses',
    description:
      'A heavy-duty tripod for wildlife, astro or sports photography. It carries lenses up to 600 mm on its gimbal head and extends to 1.75 m.\n\nIncluded: the tripod, the gimbal head with an Arca plate, a ball head for landscapes and a carry bag.\n\nPick-up in Iļģuciems. Happy to set it up with your camera at hand-over.',
    condition: 'GOOD', attributes: { type: 'tripod', maxLoad: 12 },
    daily: 10, weeklyDiscount: 30, deposit: 120, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Iļģuciems', lat: 56.9632, lng: 24.0459, rules: ['ID_AT_PICKUP'],
  },
  {
    photos: ['instant-0', 'instant-1'], category: 'instant-cameras', locale: 'ru',
    title: 'Instax Mini — моментальные фото на свадьбу или день рождения',
    description:
      'Камера моментальной печати: гости сразу получают свои снимки. Простая, справится и ребёнок.\n\nВ комплекте 2 упаковки картриджей (20 снимков), батарейки и ремешок. Дополнительные картриджи можно купить у меня по себестоимости.\n\nЗабрать в Пурвциемсе. Верните, пожалуйста, без картриджа внутри.',
    condition: 'LIKE_NEW', attributes: { brand: 'Fujifilm', model: 'Instax Mini', films: 20 },
    daily: 7, weeklyDiscount: 30, deposit: 60, minDays: 1, maxDays: 7,
    city: 'Rīga', district: 'Purvciems', lat: 56.9563, lng: 24.1789, rules: ['CARE_INSTRUCTIONS'],
  },
  {
    photos: ['walkie-0'], category: 'walkie-talkies', locale: 'lv',
    title: 'Rācijas (2 gab.) līdz 5 km — pārgājienam vai pasākumam',
    description:
      'Divas rācijas saziņai pārgājienā, laivu braucienā vai lielā pasākumā. Darbības rādiuss līdz 5 km atklātā vietā.\n\nKomplektā lādētāji, siksnas jostai un uzlādējami akumulatori. Pirms nomas pārbaudu, ka abas ir pilnībā uzlādētas.\n\nSaņemšana Juglā.',
    condition: 'GOOD', attributes: { brand: 'Logicom', pieces: 2, range: 5 },
    daily: 5, weeklyDiscount: 35, deposit: 40, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Jugla', lat: 56.9714, lng: 24.2633, rules: ['ID_AT_PICKUP'],
  },
  {
    photos: ['xcski-0', 'xcski-1'], category: 'cross-country-skiing', locale: 'lv',
    title: 'Distanču slēpes ar zābakiem (42) un nūjām — klasiskais stils',
    description:
      'Klasiskā stila distanču slēpes pastaigām pa trasēm vai mežā pie mājām. Garums 195 cm, zābaki 42. izmērā, nūjas 160 cm.\n\nSlēpes ieziestas ar slīdes ziedi, apakšā zvīņas, tāpēc kāpšanas ziede nav vajadzīga.\n\nSaņemšana Madonā. Ja vajag citu izmēru, uzrakstiet: ir arī 190 cm slēpes un zābaki 39. izmērā.',
    condition: 'GOOD', attributes: { style: 'classic', length: 195, bootSize: '42', poles: true },
    daily: 8, weeklyDiscount: 35, deposit: 80, minDays: 1, maxDays: 14,
    city: 'Madona', district: 'Centrs', lat: 56.8536, lng: 26.2178, rules: ['RETURN_CLEAN'],
  },
  {
    photos: ['tennis-0'], category: 'tennis-padel', locale: 'en',
    title: 'Two padel rackets with balls for a weekend game',
    description:
      'Try padel before buying your own: two mid-weight rackets for beginners and intermediate players, plus a new tube of balls.\n\nIncluded: two rackets, three balls and a racket bag. Courts rent rackets by the hour; here you have them for the whole weekend.\n\nPick-up in Ķīpsala, near the courts.',
    condition: 'GOOD', attributes: { type: 'padel', pieces: 2, included: '3 balls, a bag' },
    daily: 6, weeklyDiscount: 35, deposit: 80, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Ķīpsala', lat: 56.9520, lng: 24.0830, rules: ['ID_AT_PICKUP'],
  },
  {
    photos: ['golf-0', 'golf-1'], category: 'golf', locale: 'lv',
    title: 'Golfa nūju komplekts ar somu iesācējam (labrocim)',
    description:
      'Pilns komplekts, lai iemēģinātu golfu laukumā vai treniņu zonā: draiveris, koka nūja, hibrīds, seši dzelži, vedža nūja un puteris.\n\nKomplektā soma ar statīvu, desmit bumbiņas un tees. Nūjas labrocim, piemērotas augumam no 170 līdz 190 cm.\n\nSaņemšana Mežaparkā.',
    condition: 'GOOD', attributes: { type: 'club-set', hand: 'right', included: 'Soma, 10 bumbiņas, tees' },
    daily: 15, weeklyDiscount: 30, deposit: 150, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Mežaparks', lat: 56.9990, lng: 24.1450, rules: ['ID_AT_PICKUP'],
  },
  {
    photos: ['sleepingbag-0'], category: 'sleeping-bags-mats', locale: 'lv',
    title: 'Guļammaiss līdz −5 °C ar kompresijas maisu',
    description:
      'Silts guļammaiss pārgājienam pavasarī un rudenī. Komforta temperatūra +2 °C, ekstrēmā −5 °C, sver 1,6 kg.\n\nKomplektā kompresijas maiss un ieliktnis, ko pēc katras nomas mazgāju atsevišķi. Pats guļammaiss tiek izvēdināts un iztīrīts.\n\nSaņemšana Imantā. Pieejams arī paklājiņš par 2 € dienā.',
    condition: 'GOOD', attributes: { type: 'sleeping-bag', comfortTemp: 2 },
    daily: 4, weeklyDiscount: 35, deposit: 50, minDays: 2, maxDays: 21,
    city: 'Rīga', district: 'Imanta', lat: 56.9600, lng: 23.9800, rules: ['RETURN_CLEAN'],
  },
  {
    photos: ['stove-0', 'stove-1'], category: 'stoves-coolers', locale: 'ru',
    title: 'Туристическая газовая горелка с котелком и сковородой',
    description:
      'Компактная горелка для похода, рыбалки или пикника: вода закипает за 3 минуты. Работает от резьбовых баллонов.\n\nВ комплекте котелок на 1,5 л, сковорода, ветрозащитный экран и один полный баллон. Новые баллоны продаются в туристических магазинах и на заправках.\n\nЗабрать в Даугавпилсе. Пожалуйста, верните посуду чистой.',
    condition: 'GOOD', attributes: { type: 'stove' },
    daily: 5, weeklyDiscount: 35, deposit: 40, minDays: 1, maxDays: 14,
    city: 'Daugavpils', district: 'Centrs', lat: 55.8747, lng: 26.5362, rules: ['RETURN_CLEAN', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['backpack-0'], category: 'backpacks', locale: 'en',
    title: 'Trekking backpack 65 l with a rain cover',
    description:
      'A comfortable 65-litre backpack for a multi-day hike along the Gauja or a trip to the mountains. Adjustable back, hip-belt pockets and a separate sleeping-bag compartment.\n\nIncluded: the rain cover and a 2-litre water bladder (a new mouthpiece for every rental).\n\nPick-up in Cēsis, five minutes from the station.',
    condition: 'GOOD', attributes: { type: 'hiking', volume: 65 },
    daily: 5, weeklyDiscount: 35, deposit: 60, minDays: 2, maxDays: 21,
    city: 'Cēsis', district: 'Centrs', lat: 57.3130, lng: 25.2740, rules: ['RETURN_CLEAN'],
  },
  {
    photos: ['boat-0', 'boat-1'], category: 'boats-fishing', locale: 'lv',
    title: 'Piepūšamā laiva ar motoru un piekabi — Latgales ezeriem',
    description:
      'Piepūšamā laiva makšķerēšanai un izbraucieniem pa ezeriem: 3,6 m, līdz četriem cilvēkiem, alumīnija grīda.\n\nKomplektā 9,9 ZS piekarināmais motors, airi, četras glābšanas vestes un reģistrēta piekabe. Vajadzīgs auto ar āķi.\n\nSaņemšana Rēzeknē. Izsniedzu ar pilnu degvielas tvertni un palīdzu nolaist laivu ūdenī.',
    condition: 'GOOD', attributes: { type: 'inflatable-boat', people: 4, paddles: true },
    daily: 45, weeklyDiscount: 25, deposit: 400, minDays: 1, maxDays: 14,
    city: 'Rēzekne', district: 'Centrs', lat: 56.5099, lng: 27.3332, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['carseat-0'], category: 'car-seats-carriers', locale: 'lv',
    title: 'Bērnu sēdeklīši-paaugstinājumi ar ISOFIX (ir četri)',
    description:
      'Paaugstinājumi bērniem no 4 līdz 12 gadiem (15–36 kg): kad atbrauc ciemiņi vai bērni jāaizved uz nometni. Ir četri, var ņemt vienu vai visus.\n\nAr ISOFIX stiprinājumiem un regulējamu galvas balstu. Pārvalki mazgāti pēc katras nomas.\n\nSaņemšana Dreiliņos. Cena norādīta par vienu sēdeklīti.',
    condition: 'GOOD', attributes: { type: 'car-seat', ageGroup: '4–12 gadi, 15–36 kg', isofix: true },
    daily: 4, weeklyDiscount: 35, deposit: 50, minDays: 1, maxDays: 30,
    city: 'Rīga', district: 'Dreiliņi', lat: 56.9488, lng: 24.2519, rules: ['RETURN_CLEAN', 'NO_SMOKING'],
  },
  {
    photos: ['bikerack-0'], category: 'bike-carriers', locale: 'lv',
    title: 'Jumta velosipēdu turētāji (2 gab.) ar slēdzenēm',
    description:
      'Divi jumta turētāji velosipēdiem atvaļinājumam vai braucienam uz Kurzemes piekrasti. Der rāmjiem līdz 80 mm un riteņiem līdz 29 collām.\n\nAbi slēdzami ar vienu atslēgu. Vajadzīgi jumta stieņi (ar T-skrūvēm vai skavām); uzstādīšana aizņem 10 minūtes.\n\nSaņemšana Talsos.',
    condition: 'GOOD', attributes: { type: 'roof', bikes: 2 },
    daily: 7, weeklyDiscount: 35, deposit: 80, minDays: 2, maxDays: 30,
    city: 'Talsi', district: 'Centrs', lat: 57.2447, lng: 22.5889, rules: ['ID_AT_PICKUP'],
  },
  {
    photos: ['boardgame-0', 'boardgame-1'], category: 'toys-board-games', locale: 'lv',
    title: 'Galda spēles vakaram: Catan un Azul (abas kopā)',
    description:
      'Divas iecienītas galda spēles draugu vakaram: Catan (3–4 spēlētāji, 75 min) un Azul (2–4 spēlētāji, 40 min). Abas pilnībā nokomplektētas, noteikumi latviski.\n\nIeteicamas no 10 gadiem, abas ātri apgūstamas. Ja kāda detaļa pazūd, sarunāsim: to var aizstāt.\n\nSaņemšana Grīziņkalnā.',
    condition: 'GOOD', attributes: { kind: 'Catan, Azul', ageFrom: 10, complete: true },
    daily: 4, weeklyDiscount: 35, deposit: 40, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Grīziņkalns', lat: 56.9590, lng: 24.1460, rules: ['CARE_INSTRUCTIONS'],
  },
  {
    photos: ['ebike-0', 'ebike-1'], category: 'cycling', locale: 'en',
    title: 'Electric cargo bike for the school run and shopping',
    description:
      'A front-box electric cargo bike for a week of school runs, shopping or moving small things. The box carries two children (seats and belts included) or up to 80 kg.\n\nUp to 60 km of assistance per charge. Included: the charger, a rain cover for the box and a lock.\n\nPick-up in Vecmīlgrāvis. A short test ride together first: it handles differently from a normal bike.',
    condition: 'GOOD', attributes: { type: 'electric', frameSize: 'One size (160–195 cm)', helmet: false },
    daily: 25, weeklyDiscount: 30, deposit: 400, minDays: 1, maxDays: 14,
    city: 'Rīga', district: 'Vecmīlgrāvis', lat: 57.0326, lng: 24.1094, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['kidsbike-0'], category: 'kids-scooters-bikes', locale: 'lv',
    title: 'Līdzsvara ritenis bērnam no 2 gadiem ar ķiveri',
    description:
      'Viegls līdzsvara ritenis, ar ko bērns iemācās noturēt līdzsvaru vēl pirms pedāļiem. Sēdekļa augstums regulējams no 30 līdz 41 cm, piepūšamas riepas.\n\nKomplektā bērnu ķivere (XS) un zvaniņš. Ideāli, lai pārbaudītu, vai bērnam patīk, pirms pirkt savu.\n\nSaņemšana Teikā.',
    condition: 'GOOD', attributes: { type: 'balance-bike', ageFrom: 2, helmet: true },
    daily: 3, weeklyDiscount: 40, deposit: 40, minDays: 2, maxDays: 30,
    city: 'Rīga', district: 'Teika', lat: 56.9760, lng: 24.1830, rules: ['RETURN_CLEAN'],
  },
  {
    photos: ['laptop-0'], category: 'laptops-tablets', locale: 'ru',
    title: 'MacBook Air 13" на время ремонта вашего ноутбука',
    description:
      'Лёгкий ноутбук, пока ваш в ремонте, или для поездки и учёбы. 13 дюймов, 8 ГБ памяти, 256 ГБ, хватает на целый рабочий день.\n\nВ комплекте зарядка и чехол. Перед выдачей ноутбук сброшен, можно войти со своим Apple ID; после возврата всё стираю.\n\nЗабрать в центре, у Верманского сада.',
    condition: 'LIKE_NEW', attributes: { type: 'laptop', brand: 'Apple', screen: 13.3, charger: true },
    daily: 12, weeklyDiscount: 30, deposit: 400, minDays: 2, maxDays: 30,
    city: 'Rīga', district: 'Centrs', lat: 56.9545, lng: 24.1180, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['coffee-0'], category: 'kitchen-appliances', locale: 'lv',
    title: 'Espresso automāts ar dzirnaviņām — pasākumam vai viesiem',
    description:
      'Pusautomātiskais espresso automāts ar iebūvētām dzirnaviņām: īsts kapučīno ballītē, birojā vai kad atbrauc viesi.\n\nKomplektā piena krūzīte, tamperis un 250 g svaigi grauzdētu kafijas pupiņu no vietējās grauzdētavas. Pirms nomas atkaļķots un iztīrīts.\n\nSaņemšana Majoros. Parādīšu, kā pagatavot labu espresso piecās minūtēs.',
    condition: 'GOOD', attributes: { type: 'coffee-machine', brand: 'Sage', watts: 1600 },
    daily: 12, weeklyDiscount: 30, deposit: 200, minDays: 1, maxDays: 14,
    city: 'Jūrmala', district: 'Majori', lat: 56.9690, lng: 23.7930, rules: ['RETURN_CLEAN', 'CARE_INSTRUCTIONS'],
  },
  {
    photos: ['telescope-0', 'telescope-1'], category: 'other', locale: 'en',
    title: 'Telescope 130 mm with a GoTo mount for stargazing',
    description:
      'A reflector telescope that finds planets and nebulae for you: pick Saturn on the handset and the mount turns to it. Good for a clear night at a summer house.\n\nIncluded: two eyepieces, a Barlow lens, a Moon filter and a red torch. It runs on AA batteries or a power bank.\n\nPick-up in Sigulda. On a clear evening I show you how to align it in ten minutes.',
    condition: 'GOOD', attributes: {},
    daily: 10, weeklyDiscount: 35, deposit: 150, minDays: 1, maxDays: 14,
    city: 'Sigulda', district: 'Centrs', lat: 57.1550, lng: 24.8600, rules: ['ID_AT_PICKUP', 'CARE_INSTRUCTIONS'],
  },
];
