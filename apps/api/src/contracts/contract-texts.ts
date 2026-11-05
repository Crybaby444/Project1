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
  signatures: string;
  signedAt: string;
  notSigned: string;
  hash: string;
  generated: string;
}

const en: ContractTexts = {
  title: 'Rental agreement',
  number: 'Agreement No. {id}, accepted on {date}',
  intro:
    'The owner lends the item below to the renter for the rental period, through Yoyo. Both sides agree to these terms by signing in Yoyo before the renter pays.',
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
  signatures: '9. Signatures',
  signedAt: 'Signed in Yoyo on {date}',
  notSigned: 'Not signed yet',
  hash: 'Fingerprint of the terms (SHA-256): {hash}',
  generated: 'Created by Yoyo on {date}.',
};

const lv: ContractTexts = {
  title: 'Nomas līgums',
  number: 'Līgums Nr. {id}, pieņemts {date}',
  intro:
    'Īpašnieks ar Yoyo starpniecību nodod nomniekam lietošanā zemāk norādīto lietu uz nomas laiku. Abas puses piekrīt šiem noteikumiem, parakstot tos Yoyo pirms samaksas.',
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
  signatures: '9. Paraksti',
  signedAt: 'Parakstīts Yoyo {date}',
  notSigned: 'Vēl nav parakstīts',
  hash: 'Noteikumu nospiedums (SHA-256): {hash}',
  generated: 'Izveidots Yoyo {date}.',
};

const ru: ContractTexts = {
  title: 'Договор аренды',
  number: 'Договор № {id}, принят {date}',
  intro:
    'Владелец через Yoyo передаёт арендатору во временное пользование указанную ниже вещь на срок аренды. Обе стороны принимают эти условия, подписывая их в Yoyo до оплаты.',
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
  signatures: '9. Подписи',
  signedAt: 'Подписано в Yoyo {date}',
  notSigned: 'Ещё не подписано',
  hash: 'Отпечаток условий (SHA-256): {hash}',
  generated: 'Создано Yoyo {date}.',
};

export const CONTRACT_TEXTS: Record<Locale, ContractTexts> = { en, lv, ru };
