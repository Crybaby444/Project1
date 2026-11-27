/**
 * Everyday words people type for what a category holds, beyond its own names and kinds (`vocabularyOf`):
 * colloquial words, brands that stand for the thing, and the other languages' common forms. Keyed by the
 * category's stable slug; words in their base form (a search matches them by stem, in any case and without
 * diacritics). Owner, 2026-11-27: Riga searches in Latvian, Russian and English for the same drill.
 *
 * Only words that point at one kind of thing: a word shared by many categories ("набор", "машина") would
 * only widen every search.
 */
export const SEARCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  // electronics
  'game-consoles': ['плейстейшн', 'плейстейшен', 'пс5', 'ps5', 'ps4', 'иксбокс', 'нинтендо', 'геймпад', 'джойстик', 'окулус', 'oculus', 'gamepad', 'joystick', 'džoistiks'],
  'laptops-tablets': ['ноут', 'макбук', 'macbook', 'айпад', 'ipad', 'компьютер', 'киндл', 'kindle', 'laptop', 'notebook', 'computer', 'e-reader', 'dators', 'klēpjdators'],
  'monitors-tvs': ['телик', 'телевизор', 'tv', 'display', 'televizors'],
  projectors: ['кинопроектор', 'beamer'],
  'speakers-audio': ['акустика', 'jbl', 'наушники', 'headphones', 'austiņas', 'mikrofons'],
  'walkie-talkies': ['радиостанция', 'radio'],
  drones: ['квадрокоптер', 'коптер', 'dji', 'kvadrokopters', 'quadcopter'],
  // photo and video
  cameras: ['фотоаппарат', 'фотик', 'зеркалка', 'фотокамера', 'canon', 'nikon', 'fujifilm', 'fotoaparāts', 'dslr'],
  'action-cameras': ['gopro', 'гопро', 'insta360', 'экшн камера'],
  'instant-cameras': ['полароид', 'polaroid', 'instax', 'инстакс'],
  'lenses-flashes': ['линза', 'lens', 'objektīvs'],
  'tripods-stabilizers': ['трипод', 'гимбал', 'стедикам', 'gimbal', 'tripod', 'statīvs'],
  'studio-video': ['софтбокс', 'хромакей', 'softbox', 'video camera'],
  binoculars: ['подзорная труба', 'telescope', 'teleskops'],
  // tools
  'drills-drivers': ['дрель', 'шуруповерт', 'drill', 'impact driver', 'urbis', 'skrūvgriezis'],
  'rotary-hammers': ['отбойник', 'долбежник', 'jackhammer', 'breaker', 'demolition hammer'],
  'grinders-sanders': ['ушм', 'шлифовалка', 'точило', 'angle grinder', 'flex', 'fleks', 'leņķa slīpmašīna'],
  saws: ['циркулярка', 'ножовка', 'electric saw', 'zāģis', 'figūrzāģis'],
  'routers-planers': ['фреза', 'электрорубанок', 'frēze'],
  'hand-tool-sets': ['ящик с инструментами', 'toolbox', 'tool set', 'instrumentu komplekts'],
  'measuring-tools': ['нивелир', 'рулетка', 'тепловизор', 'пирометр', 'laser level', 'thermal camera', 'līmeņrādis', 'nivelieris'],
  'cleaning-machines': ['керхер', 'кархер', 'karcher', 'химчистка', 'поломойка', 'carpet cleaner', 'wet vacuum', 'shop vac', 'mazgājamais putekļu sūcējs'],
  'compressors-pneumatic': ['пневмопистолет', 'нейлер', 'гайковерт', 'nail gun', 'paint sprayer', 'impact wrench', 'krāsu pulverizators'],
  welding: ['сварка', 'сварочный аппарат', 'инвертор', 'welder', 'metināšanas aparāts', 'metinātājs'],
  'bench-tools': ['торцовка', 'mitre saw', 'miter saw', 'table saw', 'zāģēšanas galds'],
  'plumbing-tools': ['сантехника', 'трубогиб', 'pipe', 'plumbing'],
  'work-lights-cables': ['прожектор', 'переноска', 'кабель', 'extension cord', 'floodlight', 'prožektors'],
  // construction
  'plate-compactors': ['трамбовка', 'вибротрамбовка', 'compactor', 'rammer', 'blietētājs'],
  'concrete-tile-tools': ['бетон', 'concrete mixer', 'tile cutter', 'betona maisītājs'],
  generators: ['электростанция', 'бензогенератор', 'дизельгенератор', 'ģenerators'],
  'heaters-dehumidifiers': ['тепловая пушка', 'калорифер', 'heat gun', 'space heater', 'siltuma lielgabals'],
  'ladders-scaffolding': ['вышка-тура', 'step ladder', 'trepes'],
  'pro-pressure-washers': ['керхер', 'кархер', 'karcher'],
  // garden
  'lawn-mowers-trimmers': ['мотокоса', 'аэратор', 'mower', 'pļāvējs', 'zāles pļāvējs'],
  'pressure-washers': ['керхер', 'кархер', 'karcher', 'минимойка', 'jet washer'],
  'snow-blowers': ['снегоуборочная машина', 'снегоочиститель'],
  'garden-furniture-canopies': ['беседка', 'качели', 'gazebo', 'parasol', 'šūpoles'],
  'lawn-tractors': ['райдер', 'минитрактор', 'садовый трактор', 'ride-on mower'],
  chainsaws: ['бензопила', 'электропила', 'цепная пила', 'chain saw', 'ķēdes zāģis'],
  'garden-power-tools': ['листодув', 'hedge trimmer', 'krūmgriezis'],
  'log-splitters': ['дробилка', 'щепорез', 'wood chipper', 'zaru smalcinātājs'],
  sweepers: ['мотоблок', 'tiller', 'motobloks', 'kultivators'],
  // home and kitchen
  'vacuum-cleaners': ['отпариватель', 'steam cleaner', 'tvaika tīrītājs'],
  'fans-heaters': ['кондиционер', 'увлажнитель', 'очиститель воздуха', 'air conditioner', 'humidifier', 'air purifier', 'kondicionieris', 'mitrinātājs'],
  'kitchen-appliances': ['мультиварка', 'аэрогриль', 'соковыжималка', 'фритюрница', 'вафельница', 'кофеварка', 'air fryer', 'juicer', 'kafijas automāts'],
  // sports
  cycling: ['велик', 'bmx', 'bicycle', 'ritenis'],
  'e-scooters': ['гироскутер', 'моноколесо', 'сигвей', 'segway', 'xiaomi', 'kick scooter', 'hoverboard'],
  'skates-skateboards': ['пенниборд', 'rollerblades', 'inline skates', 'skrituļdēlis'],
  'cross-country-skiing': ['лыжи', 'ski', 'skis', 'slēpes', 'distanču slēpes'],
  'downhill-skiing': ['горнолыжные ботинки', 'лыжные ботинки', 'ski', 'skis', 'kalnu slēpes'],
  'ice-skating': ['skates', 'slidas'],
  'snowshoes-sleds': ['ватрушка', 'ледянка', 'сани', 'sledge', 'toboggan', 'kamanas'],
  sup: ['сап', 'сапборд', 'paddle board', 'paddleboard', 'sup dēlis'],
  'kayaks-canoes': ['байдарка', 'лодка', 'laiva'],
  diving: ['акваланг', 'маска для плавания', 'wetsuit', 'snorkel', 'hidrotērps'],
  'kite-windsurf': ['серф', 'серфинг', 'surf', 'surfboard', 'sērfs'],
  'tennis-padel': ['сквош', 'squash', 'tenisa rakete'],
  'table-tennis-badminton': ['пинг-понг', 'пингпонг', 'ping pong', 'ping-pong'],
  'team-sports': ['мяч', 'футбольные ворота', 'ball', 'bumba'],
  fitness: ['гантели', 'штанга', 'беговая дорожка', 'велотренажер', 'гири', 'эллипсоид', 'степпер', 'treadmill', 'dumbbells', 'exercise bike', 'skrejceļš', 'hanteles'],
  'boxing-martial-arts': ['punching bag', 'boksa maiss'],
  // camping
  'sleeping-bags-mats': ['спальник', 'каремат', 'пенка', 'sleeping pad', 'air mattress', 'piepūšamais matracis'],
  'camping-furniture': ['складной стул', 'раскладушка', 'туристический стол', 'camping chair', 'camp bed', 'kempinga krēsls'],
  'stoves-coolers': ['газовая плитка', 'холодильник', 'мангал', 'термос', 'camping stove', 'grils'],
  backpacks: ['suitcase', 'čemodāns'],
  'boats-fishing': ['удочка', 'спиннинг', 'лодочный мотор', 'fishing rod', 'outboard motor', 'makšķere'],
  climbing: ['скалолазание', 'страховочная система', 'ледоруб', 'harness'],
  'gps-devices': ['навигатор', 'navigators'],
  // kids
  strollers: ['ratiņi', 'bērnu ratiņi', 'pram', 'buggy'],
  'car-seats-carriers': ['переноска', 'слинг', 'бустер', 'baby carrier', 'booster', 'bērnu sēdeklis'],
  'playhouses-slides': ['bouncy castle', 'piepūšamā pils'],
  'toys-board-games': ['настолки', 'конструктор', 'лего', 'lego', 'пазл', 'puzzle'],
  'kids-furniture': ['crib', 'cot', 'high chair', 'bērnu gultiņa'],
  // events and parties
  'event-tents': ['marquee', 'gazebo', 'pasākumu telts'],
  'sound-light': ['караоке', 'прожектор', 'karaoke', 'pa system', 'fog machine'],
  costumes: ['маскарад', 'masquerade'],
  'party-decor': ['шарики', 'гирлянда', 'balloons', 'baloni'],
  // music
  instruments: ['укулеле', 'саксофон', 'электрогитара', 'усилитель', 'комбик', 'keyboard', 'amplifier', 'ģitāra'],
  'dj-equipment': ['диджей', 'вертушки', 'turntables'],
  // car and travel
  'roof-boxes-racks': ['бокс на крышу', 'рейлинги', 'roof rack', 'roof box'],
  'bike-carriers': ['велобагажник', 'bike rack'],
  'battery-chargers': ['бустер', 'аккумулятор', 'jump starter', 'akumulators'],
};
