import type { Locale } from '@yoyo/shared';

/** Every text of the rental contract PDF, in the three languages of Yoyo. `{x}` are filled in. */
export interface ContractTexts {
  title: string;
  number: string;
  intro: string;
  parties: string;
  owner: string;
  renter: string;
  item: string;
  condition: string;
  place: string;
  conditions: Record<'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR', string>;
  period: string;
  periodLine: string;
  days: string;
  timeZone: string;
  price: string;
  daily: string;
  base: string;
  discount: string;
  rent: string;
  fee: string;
  deposit: string;
  total: string;
  ownerGets: string;
  agreedPrice: string;
  depositRules: string;
  depositText: string[];
  handover: string;
  handoverText: string[];
  cancellation: string;
  cancellationText: string[];
  rules: string;
  noRules: string;
  presets: Record<'ID_AT_PICKUP' | 'RETURN_CLEAN' | 'NO_SMOKING' | 'PICKUP_ONLY' | 'PETS_OK' | 'CARE_INSTRUCTIONS', string>;
  care: string;
  careText: string[];
  data: string;
  dataText: string[];
  law: string;
  lawText: string[];
  electronic: string;
  electronicText: string[];
  signatures: string;
  signedAt: string;
  signatureLine: string;
  typedName: string;
  methods: Record<'SIMULATED' | 'LEGACY' | 'OTHER', string>;
  termsMatch: string;
  termsDiffer: string;
  testMode: string;
  notSigned: string;
  hash: string;
  generated: string;
}

const en: ContractTexts = {
  title: 'Rental agreement',
  number: 'Agreement No. {id}, accepted on {date}',
  intro:
    'The owner lends the item below to the renter for the rental period, through Yoyo. The renter signs first, then the owner countersigns; the renter pays only after both have signed.',
  parties: '1. Parties',
  owner: 'Owner',
  renter: 'Renter',
  item: '2. Item',
  condition: 'Condition',
  place: 'Handover area',
  conditions: { NEW: 'New', LIKE_NEW: 'Like new', GOOD: 'Good', FAIR: 'Fair' },
  period: '3. Rental period',
  periodLine: 'From {start} to {end}, both days included',
  days: '{days} days',
  timeZone: 'Dates are in the time zone {zone}.',
  price: '4. Price',
  daily: 'Price per day',
  base: 'Price for the period',
  discount: 'Discount for 7 days or more ({percent} %)',
  rent: 'Rent',
  fee: 'Yoyo service fee',
  deposit: 'Deposit',
  total: 'Paid by the renter',
  ownerGets: 'The owner receives the rent, {rent}, once the handover is confirmed.',
  agreedPrice: 'The daily price was agreed between the sides through a price offer.',
  depositRules: '5. Deposit',
  depositText: [
    'Yoyo holds the deposit from payment until the item has been returned and inspected.',
    'If the owner confirms that all is fine, or does not inspect the item within {inspection} hours of getting it back, the whole deposit goes back to the renter.',
    'If the owner reports damage with photos and the renter agrees, the whole deposit goes to the owner. If the renter disagrees, or does not answer within {reply} hours, a Yoyo administrator decides who receives it.',
  ],
  handover: '6. Handover and return',
  handoverText: [
    'The sides meet in person. The owner marks the handover in Yoyo; the renter confirms it or objects within {handover} hours.',
    'The renter marks the return in Yoyo; the owner confirms it or objects within {return} hours. If the item is not returned after the rental period, the owner may open a dispute.',
  ],
  cancellation: '7. Cancellation',
  cancellationText: [
    'Either side may cancel before the handover; the renter only before the first rental day. Everything paid, the fee included, goes back the way it was paid.',
    'After the handover the rental cannot be cancelled.',
  ],
  rules: "8. Owner's rules",
  noRules: 'No additional rules.',
  presets: {
    ID_AT_PICKUP: 'Show an ID at pickup',
    RETURN_CLEAN: 'Return the item clean',
    NO_SMOKING: 'No smoking near the item',
    PICKUP_ONLY: 'Pickup only, no delivery',
    PETS_OK: 'Pets are fine around the item',
    CARE_INSTRUCTIONS: 'Follow the care instructions',
  },
  care: '9. Care and liability',
  careText: [
    'The renter uses the item with care, only for its normal purpose, and does not hand it to anyone else without the owner\'s consent.',
    'The renter is liable for loss of or damage to the item during the rental period beyond normal wear; the deposit covers such a claim first. The owner is responsible for the item being safe to use and as described.',
    'Yoyo provides the platform, holds the payment and the deposit and runs the dispute process described above; it is not a party to this agreement.',
  ],
  data: '10. Personal data',
  dataText: [
    'Each side receives the other side\'s name and contact details only to perform this agreement and uses them for nothing else. Yoyo processes personal data under its privacy policy and the General Data Protection Regulation (EU) 2016/679.',
  ],
  law: '11. Consumer rights, applicable law and disputes',
  lawText: [
    'Nothing in this agreement limits the rights a side has as a consumer under the mandatory law of the country where they live.',
    'Unless mandatory law provides otherwise, the law of the country where the owner has their habitual residence applies (Regulation (EC) No 593/2008, Rome I). A disagreement the sides cannot settle themselves or through Yoyo goes to the competent court; for claims up to EUR 5,000 between sides in different EU countries the European Small Claims Procedure (Regulation (EC) No 861/2007) is available.',
  ],
  electronic: '12. Electronic form and signatures',
  electronicText: [
    'This agreement is concluded in electronic form and signed in Yoyo with electronic signatures: first by the renter, then by the owner. Under Article 25(1) of Regulation (EU) No 910/2014 (eIDAS), an electronic signature is not denied legal effect solely because it is electronic.',
    'Each signature is recorded with the name typed by the signer, the time, and the fingerprint of these terms below; any change to the terms changes the fingerprint. Payment is possible only when both signatures cover the same terms. Each side can download this agreement at any time in Yoyo.',
  ],
  signatures: '13. Signatures',
  signedAt: 'Signed in Yoyo on {date}',
  signatureLine: '{role}: {name} — signed on {date}',
  typedName: 'Typed signature: “{name}” · {method} · ID {id}',
  methods: { SIMULATED: 'simple electronic signature (test mode, simulated)', LEGACY: 'simple electronic signature', OTHER: 'electronic signature' },
  termsMatch: 'Signed the terms with this fingerprint.',
  termsDiffer: 'Signed different terms (fingerprint {hash}).',
  testMode: 'TEST MODE: signatures and payments in Yoyo are simulated; no signing service or real money was used.',
  notSigned: 'Not signed yet',
  hash: 'Fingerprint of the terms (SHA-256): {hash}',
  generated: 'Created by Yoyo on {date}.',
};

const lv: ContractTexts = {
  title: 'Nomas līgums',
  number: 'Līgums Nr. {id}, pieņemts {date}',
  intro:
    'Īpašnieks ar Yoyo starpniecību nodod nomniekam lietošanā zemāk norādīto lietu uz nomas laiku. Vispirms paraksta nomnieks, tad īpašnieks; nomnieks maksā tikai pēc tam, kad abi ir parakstījuši.',
  parties: '1. Puses',
  owner: 'Īpašnieks',
  renter: 'Nomnieks',
  item: '2. Lieta',
  condition: 'Stāvoklis',
  place: 'Nodošanas vieta',
  conditions: { NEW: 'Jauna', LIKE_NEW: 'Kā jauna', GOOD: 'Laba', FAIR: 'Apmierinoša' },
  period: '3. Nomas laiks',
  periodLine: 'No {start} līdz {end}, ieskaitot abas dienas',
  days: '{days} dienas',
  timeZone: 'Datumi norādīti laika joslā {zone}.',
  price: '4. Cena',
  daily: 'Cena dienā',
  base: 'Cena par visu laiku',
  discount: 'Atlaide no 7 dienām ({percent} %)',
  rent: 'Nomas maksa',
  fee: 'Yoyo servisa maksa',
  deposit: 'Drošības nauda',
  total: 'Nomnieks samaksā',
  ownerGets: 'Īpašnieks saņem nomas maksu, {rent}, kad nodošana ir apstiprināta.',
  agreedPrice: 'Cena dienā ir saskaņota starp pusēm ar cenas piedāvājumu.',
  depositRules: '5. Drošības nauda',
  depositText: [
    'Yoyo glabā drošības naudu no samaksas brīža līdz lietas atdošanai un pārbaudei.',
    'Ja īpašnieks apstiprina, ka viss ir kārtībā, vai {inspection} stundu laikā pēc atgūšanas lietu nepārbauda, visa drošības nauda atgriežas nomniekam.',
    'Ja īpašnieks ziņo par bojājumu ar fotoattēliem un nomnieks piekrīt, visa drošības nauda pienākas īpašniekam. Ja nomnieks nepiekrīt vai {reply} stundu laikā neatbild, to, kurš saņem drošības naudu, izlemj Yoyo administrators.',
  ],
  handover: '6. Nodošana un atdošana',
  handoverText: [
    'Puses tiekas klātienē. Īpašnieks atzīmē nodošanu Yoyo; nomnieks to apstiprina vai iebilst {handover} stundu laikā.',
    'Nomnieks atzīmē atdošanu Yoyo; īpašnieks to apstiprina vai iebilst {return} stundu laikā. Ja pēc nomas laika lieta nav atdota, īpašnieks var sākt strīdu.',
  ],
  cancellation: '7. Atcelšana',
  cancellationText: [
    'Jebkura puse var atcelt nomu līdz nodošanai; nomnieks tikai līdz pirmajai nomas dienai. Viss samaksātais, arī servisa maksa, tiek atmaksāts tādā pašā veidā, kā tika maksāts.',
    'Pēc nodošanas nomu atcelt nevar.',
  ],
  rules: '8. Īpašnieka noteikumi',
  noRules: 'Papildu noteikumu nav.',
  presets: {
    ID_AT_PICKUP: 'Saņemot uzrādīt personu apliecinošu dokumentu',
    RETURN_CLEAN: 'Atdot lietu tīru',
    NO_SMOKING: 'Nesmēķēt lietas tuvumā',
    PICKUP_ONLY: 'Tikai saņemšana uz vietas, bez piegādes',
    PETS_OK: 'Mājdzīvnieki lietas tuvumā atļauti',
    CARE_INSTRUCTIONS: 'Ievērot kopšanas norādījumus',
  },
  care: '9. Rūpība un atbildība',
  careText: [
    'Nomnieks lieto lietu rūpīgi, tikai tās parastajam mērķim, un bez īpašnieka piekrišanas nenodod to citiem.',
    'Nomnieks atbild par lietas zudumu vai bojājumu nomas laikā, kas pārsniedz parasto nolietojumu; šādu prasījumu vispirms sedz drošības nauda. Īpašnieks atbild par to, lai lieta būtu droša lietošanai un atbilstu aprakstam.',
    'Yoyo nodrošina platformu, glabā maksājumu un drošības naudu un vada iepriekš aprakstīto strīdu procesu; Yoyo nav šī līguma puse.',
  ],
  data: '10. Personas dati',
  dataText: [
    'Katra puse saņem otras puses vārdu un kontaktinformāciju tikai šī līguma izpildei un neizmanto tos citiem mērķiem. Yoyo apstrādā personas datus saskaņā ar savu privātuma politiku un Vispārīgo datu aizsardzības regulu (ES) 2016/679.',
  ],
  law: '11. Patērētāju tiesības, piemērojamie tiesību akti un strīdi',
  lawText: [
    'Nekas šajā līgumā neierobežo tiesības, kas pusei kā patērētājai ir saskaņā ar tās dzīvesvietas valsts obligātajām tiesību normām.',
    'Ja obligātās tiesību normas nenosaka citādi, piemēro tās valsts tiesības, kurā ir īpašnieka pastāvīgā dzīvesvieta (Regula (EK) Nr. 593/2008, “Roma I”). Domstarpības, ko puses nevar atrisināt pašas vai ar Yoyo palīdzību, izskata kompetentā tiesa; prasījumiem līdz 5000 EUR starp pusēm dažādās ES valstīs pieejama Eiropas maza apmēra prasību procedūra (Regula (EK) Nr. 861/2007).',
  ],
  electronic: '12. Elektroniskā forma un paraksti',
  electronicText: [
    'Šis līgums ir noslēgts elektroniskā formā un parakstīts Yoyo ar elektroniskiem parakstiem: vispirms nomnieks, tad īpašnieks. Saskaņā ar Regulas (ES) Nr. 910/2014 (eIDAS) 25. panta 1. punktu elektroniskam parakstam nevar liegt juridisku spēku tikai tāpēc, ka tas ir elektronisks.',
    'Katrs paraksts tiek reģistrēts ar parakstītāja ierakstīto vārdu, laiku un zemāk norādīto noteikumu nospiedumu; jebkuras izmaiņas noteikumos maina nospiedumu. Samaksa iespējama tikai tad, kad abi paraksti attiecas uz vieniem un tiem pašiem noteikumiem. Katra puse jebkurā laikā var lejupielādēt šo līgumu Yoyo.',
  ],
  signatures: '13. Paraksti',
  signedAt: 'Parakstīts Yoyo {date}',
  signatureLine: '{role}: {name} — parakstīts {date}',
  typedName: 'Ierakstītais paraksts: “{name}” · {method} · ID {id}',
  methods: { SIMULATED: 'vienkāršs elektroniskais paraksts (testa režīms, simulēts)', LEGACY: 'vienkāršs elektroniskais paraksts', OTHER: 'elektroniskais paraksts' },
  termsMatch: 'Parakstīti noteikumi ar šo nospiedumu.',
  termsDiffer: 'Parakstīti citi noteikumi (nospiedums {hash}).',
  testMode: 'TESTA REŽĪMS: paraksti un maksājumi Yoyo ir simulēti; netika izmantots parakstīšanas pakalpojums vai īsta nauda.',
  notSigned: 'Vēl nav parakstīts',
  hash: 'Noteikumu nospiedums (SHA-256): {hash}',
  generated: 'Izveidots Yoyo {date}.',
};

const ru: ContractTexts = {
  title: 'Договор аренды',
  number: 'Договор № {id}, принят {date}',
  intro:
    'Владелец через Yoyo передаёт арендатору во временное пользование указанную ниже вещь на срок аренды. Сначала подписывает арендатор, затем владелец; арендатор платит только после того, как подписали оба.',
  parties: '1. Стороны',
  owner: 'Владелец',
  renter: 'Арендатор',
  item: '2. Вещь',
  condition: 'Состояние',
  place: 'Район передачи',
  conditions: { NEW: 'Новая', LIKE_NEW: 'Как новая', GOOD: 'Хорошее', FAIR: 'Удовлетворительное' },
  period: '3. Срок аренды',
  periodLine: 'С {start} по {end}, включая оба дня',
  days: 'Дней: {days}',
  timeZone: 'Даты указаны в часовом поясе {zone}.',
  price: '4. Цена',
  daily: 'Цена за день',
  base: 'Цена за весь срок',
  discount: 'Скидка от 7 дней ({percent} %)',
  rent: 'Арендная плата',
  fee: 'Сервисный сбор Yoyo',
  deposit: 'Залог',
  total: 'Арендатор платит',
  ownerGets: 'Владелец получает арендную плату, {rent}, после подтверждённой передачи.',
  agreedPrice: 'Цена за день согласована сторонами через предложение цены.',
  depositRules: '5. Залог',
  depositText: [
    'Yoyo хранит залог с момента оплаты до возврата и проверки вещи.',
    'Если владелец подтверждает, что всё в порядке, или не проверяет вещь в течение {inspection} часов после возврата, весь залог возвращается арендатору.',
    'Если владелец сообщает о повреждении с фотографиями и арендатор согласен, весь залог переходит владельцу. Если арендатор не согласен или не отвечает в течение {reply} часов, кому достанется залог, решает администратор Yoyo.',
  ],
  handover: '6. Передача и возврат',
  handoverText: [
    'Стороны встречаются лично. Владелец отмечает передачу в Yoyo; арендатор подтверждает её или возражает в течение {handover} часов.',
    'Арендатор отмечает возврат в Yoyo; владелец подтверждает его или возражает в течение {return} часов. Если после срока аренды вещь не вернули, владелец может открыть спор.',
  ],
  cancellation: '7. Отмена',
  cancellationText: [
    'Любая сторона может отменить аренду до передачи вещи; арендатор — только до первого дня аренды. Всё оплаченное, включая сбор, возвращается тем же способом, которым платили.',
    'После передачи аренду отменить нельзя.',
  ],
  rules: '8. Правила владельца',
  noRules: 'Дополнительных правил нет.',
  presets: {
    ID_AT_PICKUP: 'Показать документ при получении',
    RETURN_CLEAN: 'Вернуть вещь чистой',
    NO_SMOKING: 'Не курить рядом с вещью',
    PICKUP_ONLY: 'Только самовывоз, без доставки',
    PETS_OK: 'Домашние животные рядом с вещью допустимы',
    CARE_INSTRUCTIONS: 'Соблюдать инструкции по уходу',
  },
  care: '9. Бережное обращение и ответственность',
  careText: [
    'Арендатор пользуется вещью бережно, только по её обычному назначению, и не передаёт её другим без согласия владельца.',
    'Арендатор отвечает за утрату или повреждение вещи в период аренды сверх обычного износа; такое требование в первую очередь покрывается залогом. Владелец отвечает за то, чтобы вещь была безопасна в использовании и соответствовала описанию.',
    'Yoyo предоставляет платформу, хранит оплату и залог и ведёт описанный выше порядок споров; Yoyo не является стороной этого договора.',
  ],
  data: '10. Персональные данные',
  dataText: [
    'Каждая сторона получает имя и контакты другой стороны только для исполнения этого договора и не использует их ни для чего другого. Yoyo обрабатывает персональные данные согласно своей политике конфиденциальности и Общему регламенту по защите данных (ЕС) 2016/679.',
  ],
  law: '11. Права потребителей, применимое право и споры',
  lawText: [
    'Ничто в этом договоре не ограничивает права, которые есть у стороны как у потребителя по императивным нормам страны, где она живёт.',
    'Если императивные нормы не предусматривают иное, применяется право страны обычного места жительства владельца (Регламент (ЕС) № 593/2008, «Рим I»). Разногласия, которые стороны не урегулировали сами или через Yoyo, рассматривает компетентный суд; для требований до 5000 евро между сторонами из разных стран ЕС доступна Европейская процедура рассмотрения мелких исков (Регламент (ЕС) № 861/2007).',
  ],
  electronic: '12. Электронная форма и подписи',
  electronicText: [
    'Этот договор заключён в электронной форме и подписан в Yoyo электронными подписями: сначала арендатором, затем владельцем. Согласно ст. 25(1) Регламента (ЕС) № 910/2014 (eIDAS), электронной подписи не может быть отказано в юридической силе только потому, что она электронная.',
    'Каждая подпись фиксируется с именем, которое ввёл подписант, временем и отпечатком этих условий ниже; любое изменение условий меняет отпечаток. Оплата возможна, только когда обе подписи относятся к одним и тем же условиям. Каждая сторона может в любое время скачать этот договор в Yoyo.',
  ],
  signatures: '13. Подписи',
  signedAt: 'Подписано в Yoyo {date}',
  signatureLine: '{role}: {name} — подписано {date}',
  typedName: 'Введённая подпись: «{name}» · {method} · ID {id}',
  methods: { SIMULATED: 'простая электронная подпись (тестовый режим, симуляция)', LEGACY: 'простая электронная подпись', OTHER: 'электронная подпись' },
  termsMatch: 'Подписаны условия с этим отпечатком.',
  termsDiffer: 'Подписаны другие условия (отпечаток {hash}).',
  testMode: 'ТЕСТОВЫЙ РЕЖИМ: подписи и платежи в Yoyo симулируются; сервис подписи и настоящие деньги не использовались.',
  notSigned: 'Ещё не подписано',
  hash: 'Отпечаток условий (SHA-256): {hash}',
  generated: 'Создано Yoyo {date}.',
};

export const CONTRACT_TEXTS: Record<Locale, ContractTexts> = { en, lv, ru };
