import type { AttributeType, LocalizedText, StickerColor } from '@yoyo/shared';

// A type alias, not an interface: Prisma accepts it as a JSON value.
export type CatalogOption = {
  value: string;
  labels: LocalizedText;
};

export interface CatalogAttribute {
  key: string;
  type: AttributeType;
  required?: boolean;
  unit?: string;
  labels: LocalizedText;
  options?: CatalogOption[];
}

export interface CatalogCategory {
  /** Stable key, and the English address: `/c/<slug>`. */
  slug: string;
  /**
   * Addresses on each language's site (`/c/<en>`, `/lv/c/<lv>`, `/ru/c/<ru>`), from the owner-approved
   * tree C02 (docs/hitexis/C02-categories.md). Once indexed they do not change; a change needs a 301.
   */
  slugs: LocalizedText;
  sticker: StickerColor;
  icon: string;
  names: LocalizedText;
  attributes?: CatalogAttribute[];
  children?: CatalogCategory[];
}

const l = (en: string, lv: string, ru: string): LocalizedText => ({ en, lv, ru });
const opt = (value: string, en: string, lv = en, ru = en): CatalogOption => ({ value, labels: l(en, lv, ru) });
const OTHER = opt('other', 'Other', 'Cits', 'Другое');

const select = (key: string, labels: LocalizedText, options: CatalogOption[], required = true): CatalogAttribute => ({
  key,
  type: 'SELECT',
  required,
  labels,
  options,
});
const text = (key: string, labels: LocalizedText, required = false): CatalogAttribute => ({ key, type: 'TEXT', required, labels });
const number = (key: string, labels: LocalizedText, unit?: string, required = false): CatalogAttribute => ({
  key,
  type: 'NUMBER',
  required,
  labels,
  ...(unit && { unit }),
});
const yesNo = (key: string, labels: LocalizedText): CatalogAttribute => ({ key, type: 'BOOLEAN', labels });

// Labels used by many categories.
const TYPE = l('Type', 'Veids', 'Тип');
const BRAND = l('Brand', 'Zīmols', 'Бренд');
const INCLUDED = l('In the box', 'Komplektā', 'В комплекте');
const POWER_W = l('Power', 'Jauda', 'Мощность');
const SIZE = l('Size', 'Izmērs', 'Размер');

const MODEL = l('Model', 'Modelis', 'Модель');
const POWER_SUPPLY = l('Power supply', 'Barošana', 'Питание');
const MAINS = opt('mains', 'Mains', 'Tīkls', 'Сеть');
const BATTERY = opt('battery', 'Battery', 'Akumulators', 'Аккумулятор');
const PETROL = opt('petrol', 'Petrol', 'Benzīns', 'Бензин');
const MANUAL = opt('manual', 'Manual', 'Manuāls', 'Ручной');
const HELMET = l('Helmet included', 'Ķivere komplektā', 'Шлем в комплекте');
const WEIGHT = l('Weight', 'Svars', 'Вес');
const PEOPLE = l('For how many people', 'Cik cilvēkiem', 'На сколько человек');

const included = () => text('included', INCLUDED);
const model = () => text('model', MODEL);
const size = (required = false) => text('size', SIZE, required);
const power = (...options: CatalogOption[]) => select('power', POWER_SUPPLY, options.length > 0 ? options : [MAINS, BATTERY]);
const brand = () => text('brand', BRAND);
const watts = () => number('watts', POWER_W, 'W');

/**
 * The category tree with the attributes the listing builder asks for (spec §4.3, §4.8): the
 * owner-approved C02 tree (11 roots, 62 subcategories). It is reference data: ensureCategories writes it
 * to the database on every start. `slug` and attribute keys are stable identifiers (listings store
 * values by key); names and labels may change freely. Categories of the earlier tree move their
 * listings by LEGACY_CATEGORIES below.
 */
export const CATALOG: CatalogCategory[] = [
  {
    slug: 'electronics',
    slugs: l('electronics', 'elektronika', 'elektronika'),
    sticker: 'blue',
    icon: 'monitor-smartphone',
    names: l('Electronics', 'Elektronika', 'Электроника'),
    children: [
      {
        slug: 'game-consoles',
        slugs: l('game-consoles', 'spelu-konsoles', 'igrovye-pristavki'),
        sticker: 'blue',
        icon: 'gamepad',
        names: l('Game consoles', 'Spēļu konsoles', 'Игровые приставки'),
        attributes: [
          select('model', MODEL, [
            opt('ps5', 'PlayStation 5'),
            opt('ps5-pro', 'PlayStation 5 Pro'),
            opt('ps4', 'PlayStation 4'),
            opt('xbox-series-x', 'Xbox Series X'),
            opt('xbox-series-s', 'Xbox Series S'),
            opt('switch', 'Nintendo Switch'),
            opt('switch-2', 'Nintendo Switch 2'),
            opt('vr-headset', 'VR headset', 'VR brilles', 'VR-шлем'),
            OTHER,
          ]),
          number('controllers', l('Controllers', 'Kontrolieri', 'Контроллеры'), undefined, true),
          text('games', l('Games included', 'Spēles komplektā', 'Игры в комплекте')),
        ],
      },
      {
        slug: 'laptops-tablets',
        slugs: l('laptops-tablets', 'portativie-datori-plansetes', 'noutbuki-planshety'),
        sticker: 'blue',
        icon: 'laptop',
        names: l('Laptops & tablets', 'Portatīvie datori un planšetes', 'Ноутбуки и планшеты'),
        attributes: [
          select('type', TYPE, [
            opt('laptop', 'Laptop', 'Portatīvais dators', 'Ноутбук'),
            opt('tablet', 'Tablet', 'Planšete', 'Планшет'),
            opt('e-reader', 'E-reader', 'E-grāmatu lasītājs', 'Электронная книга'),
          ]),
          brand(),
          number('screen', l('Screen size', 'Ekrāna izmērs', 'Диагональ экрана'), 'in'),
          yesNo('charger', l('Charger included', 'Lādētājs komplektā', 'Зарядка в комплекте')),
        ],
      },
      {
        slug: 'monitors-tvs',
        slugs: l('monitors-tvs', 'monitori-televizori', 'monitory-televizory'),
        sticker: 'blue',
        icon: 'tv',
        names: l('Monitors & TVs', 'Monitori un televizori', 'Мониторы и телевизоры'),
        attributes: [
          select('type', TYPE, [
            opt('monitor', 'Monitor', 'Monitors', 'Монитор'),
            opt('tv', 'TV', 'Televizors', 'Телевизор'),
          ]),
          brand(),
          number('screen', l('Screen size', 'Ekrāna izmērs', 'Диагональ экрана'), 'in', true),
          yesNo('stand', l('Stand included', 'Statīvs komplektā', 'Подставка в комплекте')),
        ],
      },
      {
        slug: 'projectors',
        slugs: l('projectors', 'projektori-ekrani', 'proektory-ekrany'),
        sticker: 'blue',
        icon: 'projector',
        names: l('Projectors & screens', 'Projektori un ekrāni', 'Проекторы и экраны'),
        attributes: [
          select('resolution', l('Resolution', 'Izšķirtspēja', 'Разрешение'), [
            opt('hd', 'HD (720p)'),
            opt('full-hd', 'Full HD (1080p)'),
            opt('4k', '4K'),
            opt('screen-only', 'Screen only', 'Tikai ekrāns', 'Только экран'),
          ]),
          number('brightness', l('Brightness', 'Spilgtums', 'Яркость'), 'lm'),
          yesNo('screenIncluded', l('Screen included', 'Ekrāns komplektā', 'Экран в комплекте')),
        ],
      },
      {
        slug: 'speakers-audio',
        slugs: l('speakers-audio', 'skalruni-audio', 'kolonki-audio'),
        sticker: 'blue',
        icon: 'speaker',
        names: l('Speakers & audio', 'Skaļruņi un audio', 'Колонки и аудио'),
        attributes: [
          select('type', TYPE, [
            opt('speaker', 'Speaker', 'Skaļrunis', 'Колонка'),
            opt('soundbar', 'Soundbar', 'Soundbar', 'Саундбар'),
            opt('music-centre', 'Music centre', 'Mūzikas centrs', 'Музыкальный центр'),
            opt('turntable', 'Record player', 'Plašu atskaņotājs', 'Проигрыватель пластинок'),
            opt('microphone', 'Microphone', 'Mikrofons', 'Микрофон'),
            OTHER,
          ]),
          brand(),
          yesNo('wireless', l('Wireless', 'Bezvadu', 'Беспроводной')),
        ],
      },
      {
        slug: 'walkie-talkies',
        slugs: l('walkie-talkies', 'racijas', 'ratsii'),
        sticker: 'blue',
        icon: 'radio',
        names: l('Walkie-talkies', 'Rācijas', 'Рации'),
        attributes: [
          brand(),
          number('pieces', l('Radios in the set', 'Rācijas komplektā', 'Раций в комплекте'), undefined, true),
          number('range', l('Range', 'Darbības attālums', 'Дальность'), 'km'),
        ],
      },
      {
        slug: 'drones',
        slugs: l('drones', 'droni', 'drony'),
        sticker: 'blue',
        icon: 'drone',
        names: l('Drones', 'Droni', 'Дроны'),
        attributes: [
          brand(),
          number('batteries', l('Batteries', 'Akumulatori', 'Аккумуляторы'), undefined, true),
          yesNo('camera', l('Has a camera', 'Ar kameru', 'С камерой')),
          number('weight', WEIGHT, 'g'),
        ],
      },
    ],
  },
  {
    slug: 'photo-video',
    slugs: l('photo-video', 'foto-video', 'foto-video'),
    sticker: 'violet',
    icon: 'camera',
    names: l('Photo & video', 'Foto un video', 'Фото и видео'),
    children: [
      {
        slug: 'cameras',
        slugs: l('cameras', 'fotokameras', 'fotokamery'),
        sticker: 'violet',
        icon: 'camera',
        names: l('Cameras', 'Fotokameras', 'Фотокамеры'),
        attributes: [
          select('type', TYPE, [
            opt('dslr', 'DSLR', 'Spoguļkamera', 'Зеркальная'),
            opt('mirrorless', 'Mirrorless', 'Hibrīdkamera', 'Беззеркальная'),
            opt('compact', 'Compact', 'Kompaktkamera', 'Компактная'),
            opt('film', 'Film camera', 'Filmiņu kamera', 'Плёночная'),
            OTHER,
          ]),
          brand(),
          text('mount', l('Lens mount', 'Objektīva stiprinājums', 'Байонет')),
          included(),
        ],
      },
      {
        slug: 'action-cameras',
        slugs: l('action-cameras', 'sporta-kameras', 'ekshn-kamery'),
        sticker: 'violet',
        icon: 'video',
        names: l('Action cameras', 'Sporta kameras', 'Экшн-камеры'),
        attributes: [brand(), model(), yesNo('waterproof', l('Waterproof case', 'Ūdensdrošs korpuss', 'Водонепроницаемый бокс')), included()],
      },
      {
        slug: 'instant-cameras',
        slugs: l('instant-cameras', 'momentfoto-kameras', 'kamery-momentalnoy-pechati'),
        sticker: 'violet',
        icon: 'image',
        names: l('Instant cameras', 'Momentfoto kameras', 'Камеры моментальной печати'),
        attributes: [brand(), model(), number('films', l('Film packs included', 'Filmiņu kasetes komplektā', 'Картриджей в комплекте'))],
      },
      {
        slug: 'lenses-flashes',
        slugs: l('lenses-flashes', 'objektivi-zibspuldzes', 'obektivy-vspyshki'),
        sticker: 'violet',
        icon: 'aperture',
        names: l('Lenses & flashes', 'Objektīvi un zibspuldzes', 'Объективы и вспышки'),
        attributes: [
          select('type', TYPE, [
            opt('lens', 'Lens', 'Objektīvs', 'Объектив'),
            opt('flash', 'Flash', 'Zibspuldze', 'Вспышка'),
          ]),
          brand(),
          text('mount', l('Mount', 'Stiprinājums', 'Байонет'), true),
          text('focal', l('Focal length', 'Fokusa attālums', 'Фокусное расстояние')),
        ],
      },
      {
        slug: 'tripods-stabilizers',
        slugs: l('tripods-stabilizers', 'stativi-stabilizatori', 'shtativy-stabilizatory'),
        sticker: 'violet',
        icon: 'tripod',
        names: l('Tripods & stabilizers', 'Statīvi un stabilizatori', 'Штативы и стабилизаторы'),
        attributes: [
          select('type', TYPE, [
            opt('tripod', 'Tripod', 'Statīvs', 'Штатив'),
            opt('gimbal', 'Gimbal', 'Stabilizators', 'Стабилизатор'),
            opt('monopod', 'Monopod', 'Monopods', 'Монопод'),
          ]),
          brand(),
          number('maxLoad', l('Maximum load', 'Maksimālā slodze', 'Максимальная нагрузка'), 'kg'),
        ],
      },
      {
        slug: 'studio-video',
        slugs: l('studio-video', 'studijas-video-aprikojums', 'studiynoe-videooborudovanie'),
        sticker: 'violet',
        icon: 'lamp',
        names: l('Studio & video gear', 'Studijas un video aprīkojums', 'Студийное и видеооборудование'),
        attributes: [
          select('type', TYPE, [
            opt('lighting', 'Lighting', 'Apgaismojums', 'Свет'),
            opt('backdrop', 'Backdrop', 'Fons', 'Фон'),
            opt('video-camera', 'Video camera', 'Videokamera', 'Видеокамера'),
            opt('microphone', 'Microphone', 'Mikrofons', 'Микрофон'),
            OTHER,
          ]),
          brand(),
          included(),
        ],
      },
      {
        slug: 'binoculars',
        slugs: l('binoculars', 'binokli', 'binokli'),
        sticker: 'violet',
        icon: 'binoculars',
        names: l('Binoculars', 'Binokļi', 'Бинокли'),
        attributes: [brand(), text('magnification', l('Magnification', 'Palielinājums', 'Кратность'), true)],
      },
    ],
  },
  {
    slug: 'tools',
    slugs: l('tools', 'instrumenti', 'instrumenty'),
    sticker: 'sun',
    icon: 'wrench',
    names: l('Tools', 'Instrumenti', 'Инструменты'),
    children: [
      {
        slug: 'drills-drivers',
        slugs: l('drills-drivers', 'urbjmasinas-skruvgriezi', 'dreli-shurupoverty'),
        sticker: 'sun',
        icon: 'drill',
        names: l('Drills & drivers', 'Urbjmašīnas un skrūvgrieži', 'Дрели и шуруповёрты'),
        attributes: [power(), watts(), brand(), included()],
      },
      {
        slug: 'rotary-hammers',
        slugs: l('rotary-hammers', 'perforatori-atskaldamie-amuri', 'perforatory-otboynye-molotki'),
        sticker: 'sun',
        icon: 'hammer',
        names: l('Rotary & demolition hammers', 'Perforatori un atskaldāmie āmuri', 'Перфораторы и отбойные молотки'),
        attributes: [power(), watts(), number('impact', l('Impact energy', 'Trieciena enerģija', 'Энергия удара'), 'J'), included()],
      },
      {
        slug: 'grinders-sanders',
        slugs: l('grinders-sanders', 'slipmasinas', 'shlifovalnye-mashiny'),
        sticker: 'sun',
        icon: 'disc',
        names: l('Grinders & sanders', 'Slīpmašīnas', 'Шлифовальные машины'),
        attributes: [
          select('type', TYPE, [
            opt('angle-grinder', 'Angle grinder', 'Leņķa slīpmašīna', 'Болгарка'),
            opt('orbital-sander', 'Orbital sander', 'Ekscentra slīpmašīna', 'Эксцентриковая шлифмашина'),
            opt('belt-sander', 'Belt sander', 'Lentes slīpmašīna', 'Ленточная шлифмашина'),
            opt('bench-grinder', 'Bench grinder', 'Galda slīpmašīna', 'Точильный станок'),
            OTHER,
          ]),
          power(),
          watts(),
          included(),
        ],
      },
      {
        slug: 'saws',
        slugs: l('saws', 'zagi', 'pily'),
        sticker: 'sun',
        icon: 'saw',
        names: l('Saws', 'Zāģi', 'Пилы'),
        attributes: [
          select('type', TYPE, [
            opt('circular', 'Circular saw', 'Ripzāģis', 'Циркулярная пила'),
            opt('reciprocating', 'Reciprocating saw', 'Zobenzāģis', 'Сабельная пила'),
            opt('jigsaw', 'Jigsaw', 'Figūrzāģis', 'Лобзик'),
            opt('mitre', 'Mitre saw', 'Leņķzāģis', 'Торцовочная пила'),
            opt('chainsaw', 'Chainsaw', 'Motorzāģis', 'Цепная пила'),
            OTHER,
          ]),
          power(MAINS, BATTERY, PETROL),
          watts(),
          included(),
        ],
      },
      {
        slug: 'routers-planers',
        slugs: l('routers-planers', 'frezmasinas-eveles', 'frezery-rubanki'),
        sticker: 'sun',
        icon: 'router',
        names: l('Routers & planers', 'Frēzmašīnas un ēveles', 'Фрезеры и рубанки'),
        attributes: [
          select('type', TYPE, [
            opt('router', 'Router', 'Frēzmašīna', 'Фрезер'),
            opt('planer', 'Planer', 'Ēvele', 'Рубанок'),
          ]),
          power(),
          watts(),
          included(),
        ],
      },
      {
        slug: 'hand-tool-sets',
        slugs: l('hand-tool-sets', 'rokas-instrumentu-komplekti', 'nabory-ruchnogo-instrumenta'),
        sticker: 'sun',
        icon: 'toolbox',
        names: l('Hand tool sets', 'Rokas instrumentu komplekti', 'Наборы ручного инструмента'),
        attributes: [
          text('kind', l('What tool', 'Kāds instruments', 'Какой инструмент'), true),
          number('pieces', l('Pieces in the set', 'Daļas komplektā', 'Предметов в наборе')),
        ],
      },
      {
        slug: 'measuring-tools',
        slugs: l('measuring-tools', 'merinstrumenti', 'izmeritelnyy-instrument'),
        sticker: 'sun',
        icon: 'ruler',
        names: l('Measuring tools', 'Mērinstrumenti', 'Измерительный инструмент'),
        attributes: [
          select('type', TYPE, [
            opt('laser-level', 'Laser level', 'Lāzera līmeņrādis', 'Лазерный уровень'),
            opt('rangefinder', 'Rangefinder', 'Tālmērs', 'Дальномер'),
            opt('moisture-meter', 'Moisture meter', 'Mitruma mērītājs', 'Влагомер'),
            opt('detector', 'Wall detector', 'Sienu detektors', 'Детектор проводки'),
            OTHER,
          ]),
          number('range', l('Range', 'Darbības attālums', 'Дальность'), 'm'),
        ],
      },
      {
        slug: 'ladders-scaffolding',
        slugs: l('ladders-scaffolding', 'kapnes-sastatnes', 'lestnitsy-lesa'),
        sticker: 'sun',
        icon: 'ladder',
        names: l('Ladders & scaffolding', 'Kāpnes un sastatnes', 'Лестницы и леса'),
        attributes: [
          select('type', TYPE, [
            opt('ladder', 'Ladder', 'Kāpnes', 'Лестница'),
            opt('step-ladder', 'Step ladder', 'Saliekamās kāpnes', 'Стремянка'),
            opt('scaffolding', 'Scaffolding', 'Sastatnes', 'Строительные леса'),
          ]),
          number('height', l('Working height', 'Darba augstums', 'Рабочая высота'), 'm', true),
        ],
      },
      {
        slug: 'cleaning-machines',
        slugs: l('cleaning-machines', 'tirisanas-tehnika', 'uborochnaya-tehnika'),
        sticker: 'sun',
        icon: 'spray-can',
        names: l('Cleaning machines', 'Tīrīšanas tehnika', 'Уборочная техника'),
        attributes: [
          select('type', TYPE, [
            opt('carpet-cleaner', 'Carpet cleaner', 'Paklāju tīrītājs', 'Моющий пылесос для ковров'),
            opt('wet-dry-vacuum', 'Wet and dry vacuum', 'Mitrās un sausās tīrīšanas putekļsūcējs', 'Строительный пылесос'),
            opt('floor-scrubber', 'Floor scrubber', 'Grīdas mazgāšanas mašīna', 'Поломоечная машина'),
            opt('window-cleaner', 'Window cleaner', 'Logu tīrītājs', 'Стеклоочиститель'),
            OTHER,
          ]),
          watts(),
          included(),
        ],
      },
    ],
  },
  {
    slug: 'garden',
    slugs: l('garden', 'darzs-pagalms', 'sad-dvor'),
    sticker: 'mint',
    icon: 'sprout',
    names: l('Garden & yard', 'Dārzs un pagalms', 'Сад и двор'),
    children: [
      {
        slug: 'lawn-mowers-trimmers',
        slugs: l('lawn-mowers-trimmers', 'zales-plaveji-trimmeri', 'gazonokosilki-trimmery'),
        sticker: 'mint',
        icon: 'shovel',
        names: l('Lawn mowers & trimmers', 'Zāles pļāvēji un trimmeri', 'Газонокосилки и триммеры'),
        attributes: [
          select('type', TYPE, [
            opt('lawn-mower', 'Lawn mower', 'Zāles pļāvējs', 'Газонокосилка'),
            opt('trimmer', 'Trimmer', 'Trimmeris', 'Триммер'),
            opt('hedge-trimmer', 'Hedge trimmer', 'Dzīvžoga šķēres', 'Кусторез'),
            opt('leaf-blower', 'Leaf blower', 'Lapu pūtējs', 'Воздуходувка'),
            OTHER,
          ]),
          select('power', POWER_SUPPLY, [MAINS, BATTERY, PETROL, MANUAL], false),
          number('width', l('Cutting width', 'Pļaušanas platums', 'Ширина скашивания'), 'cm'),
          included(),
        ],
      },
      {
        slug: 'pressure-washers',
        slugs: l('pressure-washers', 'augstspiediena-mazgataji', 'moyki-vysokogo-davleniya'),
        sticker: 'mint',
        icon: 'droplets',
        names: l('Pressure washers', 'Augstspiediena mazgātāji', 'Мойки высокого давления'),
        attributes: [brand(), number('pressure', l('Pressure', 'Spiediens', 'Давление'), 'bar'), watts(), included()],
      },
      {
        slug: 'snow-blowers',
        slugs: l('snow-blowers', 'sniega-frezes', 'snegouborschiki'),
        sticker: 'mint',
        icon: 'snowflake',
        names: l('Snow blowers', 'Sniega frēzes', 'Снегоуборщики'),
        attributes: [power(MAINS, BATTERY, PETROL), number('width', l('Working width', 'Darba platums', 'Ширина захвата'), 'cm')],
      },
      {
        slug: 'garden-furniture-canopies',
        slugs: l('garden-furniture-canopies', 'darza-mebeles-nojumes', 'sadovaya-mebel-navesy'),
        sticker: 'mint',
        icon: 'armchair',
        names: l('Garden furniture & canopies', 'Dārza mēbeles un nojumes', 'Садовая мебель и навесы'),
        attributes: [
          select('type', TYPE, [
            opt('furniture-set', 'Furniture set', 'Mēbeļu komplekts', 'Комплект мебели'),
            opt('canopy', 'Canopy or gazebo', 'Nojume vai paviljons', 'Навес или шатёр'),
            opt('parasol', 'Parasol', 'Saulessargs', 'Зонт'),
            OTHER,
          ]),
          number('seats', l('Seats', 'Sēdvietas', 'Мест')),
          size(),
        ],
      },
      {
        slug: 'trampolines',
        slugs: l('trampolines', 'batuti', 'batuty'),
        sticker: 'mint',
        icon: 'circle',
        names: l('Trampolines', 'Batuti', 'Батуты'),
        attributes: [
          number('diameter', l('Diameter', 'Diametrs', 'Диаметр'), 'm', true),
          yesNo('net', l('Safety net', 'Drošības tīkls', 'Защитная сетка')),
        ],
      },
    ],
  },
  {
    slug: 'home-kitchen',
    slugs: l('home-kitchen', 'maja-virtuve', 'dom-kuhnya'),
    sticker: 'lavender',
    icon: 'home',
    names: l('Home & kitchen', 'Māja un virtuve', 'Дом и кухня'),
    children: [
      {
        slug: 'vacuum-cleaners',
        slugs: l('vacuum-cleaners', 'puteklu-suceji', 'pylesosy'),
        sticker: 'lavender',
        icon: 'sparkles',
        names: l('Vacuum cleaners', 'Putekļu sūcēji', 'Пылесосы'),
        attributes: [
          select('type', TYPE, [
            opt('vacuum', 'Vacuum cleaner', 'Putekļu sūcējs', 'Пылесос'),
            opt('robot-vacuum', 'Robot vacuum', 'Robots putekļu sūcējs', 'Робот-пылесос'),
            opt('steam-cleaner', 'Steam cleaner', 'Tvaika tīrītājs', 'Пароочиститель'),
            OTHER,
          ]),
          brand(),
          yesNo('cordless', l('Cordless', 'Bezvadu', 'Беспроводной')),
        ],
      },
      {
        slug: 'fans-heaters',
        slugs: l('fans-heaters', 'ventilatori-silditaji', 'ventilyatory-obogrevateli'),
        sticker: 'lavender',
        icon: 'fan',
        names: l('Fans & heaters', 'Ventilatori un sildītāji', 'Вентиляторы и обогреватели'),
        attributes: [
          select('type', TYPE, [
            opt('fan', 'Fan', 'Ventilators', 'Вентилятор'),
            opt('heater', 'Heater', 'Sildītājs', 'Обогреватель'),
            opt('air-conditioner', 'Mobile air conditioner', 'Mobilais kondicionieris', 'Мобильный кондиционер'),
            opt('dehumidifier', 'Dehumidifier', 'Gaisa sausinātājs', 'Осушитель'),
            OTHER,
          ]),
          watts(),
        ],
      },
      {
        slug: 'kitchen-appliances',
        slugs: l('kitchen-appliances', 'virtuves-tehnika', 'kuhonnaya-tehnika'),
        sticker: 'lavender',
        icon: 'chef-hat',
        names: l('Kitchen appliances', 'Virtuves tehnika', 'Кухонная техника'),
        attributes: [
          select('type', TYPE, [
            opt('mixer', 'Mixer', 'Mikseris', 'Миксер'),
            opt('blender', 'Blender', 'Blenderis', 'Блендер'),
            opt('coffee-machine', 'Coffee machine', 'Kafijas automāts', 'Кофемашина'),
            opt('grill', 'Table grill', 'Galda grils', 'Настольный гриль'),
            opt('food-processor', 'Food processor', 'Virtuves kombains', 'Кухонный комбайн'),
            OTHER,
          ]),
          brand(),
          watts(),
        ],
      },
    ],
  },
  {
    slug: 'sports',
    slugs: l('sports', 'sports', 'sport'),
    sticker: 'blue',
    icon: 'bike',
    names: l('Sports', 'Sports', 'Спорт'),
    children: [
      {
        slug: 'bikes',
        slugs: l('bikes', 'velosipedi', 'velosipedy'),
        sticker: 'blue',
        icon: 'bike',
        names: l('Bikes', 'Velosipēdi', 'Велосипеды'),
        attributes: [
          select('type', TYPE, [
            opt('city', 'City bike', 'Pilsētas velosipēds', 'Городской велосипед'),
            opt('mountain', 'Mountain bike', 'Kalnu velosipēds', 'Горный велосипед'),
            opt('road', 'Road bike', 'Šosejas velosipēds', 'Шоссейный велосипед'),
            opt('electric', 'E-bike', 'Elektrovelosipēds', 'Электровелосипед'),
            opt('kids', 'Kids bike', 'Bērnu velosipēds', 'Детский велосипед'),
            OTHER,
          ]),
          text('frameSize', l('Frame size', 'Rāmja izmērs', 'Размер рамы')),
          yesNo('helmet', HELMET),
        ],
      },
      {
        slug: 'e-scooters',
        slugs: l('e-scooters', 'elektriskie-skrejriteni', 'elektrosamokaty'),
        sticker: 'blue',
        icon: 'scooter',
        names: l('E-scooters', 'Elektriskie skrejriteņi', 'Электросамокаты'),
        attributes: [
          brand(),
          number('range', l('Range', 'Nobraukums', 'Запас хода'), 'km'),
          number('maxSpeed', l('Top speed', 'Maksimālais ātrums', 'Максимальная скорость'), 'km/h'),
          yesNo('helmet', HELMET),
        ],
      },
      {
        slug: 'fitness',
        slugs: l('fitness', 'trenazieri-fitness', 'trenazhery-fitnes'),
        sticker: 'blue',
        icon: 'dumbbell',
        names: l('Fitness equipment', 'Trenažieri un fitness', 'Тренажёры и фитнес'),
        attributes: [
          text('kind', l('Equipment', 'Inventārs', 'Тренажёр или инвентарь'), true),
          number('weight', WEIGHT, 'kg'),
        ],
      },
      {
        slug: 'winter-sports',
        slugs: l('winter-sports', 'ziemas-sports', 'zimniy-sport'),
        sticker: 'blue',
        icon: 'snowflake',
        names: l('Winter sports', 'Ziemas sports', 'Зимний спорт'),
        attributes: [
          select('type', TYPE, [
            opt('skis', 'Skis', 'Slēpes', 'Лыжи'),
            opt('snowboard', 'Snowboard', 'Snovbords', 'Сноуборд'),
            opt('boots', 'Boots', 'Zābaki', 'Ботинки'),
            opt('skates', 'Skates', 'Slidas', 'Коньки'),
            opt('sledge', 'Sledge', 'Ragavas', 'Санки'),
            OTHER,
          ]),
          size(true),
          yesNo('helmet', HELMET),
        ],
      },
      {
        slug: 'water-sports',
        slugs: l('water-sports', 'udens-sports', 'vodnyy-sport'),
        sticker: 'blue',
        icon: 'waves',
        names: l('Water sports', 'Ūdens sports', 'Водный спорт'),
        attributes: [
          select('type', TYPE, [
            opt('sup', 'SUP board', 'SUP dēlis', 'SUP-доска'),
            opt('kayak', 'Kayak', 'Kajaks', 'Каяк'),
            opt('wetsuit', 'Wetsuit', 'Hidrotērps', 'Гидрокостюм'),
            opt('snorkel', 'Snorkelling set', 'Snorkelēšanas komplekts', 'Набор для снорклинга'),
            OTHER,
          ]),
          size(),
          yesNo('paddle', l('Paddle included', 'Airis komplektā', 'Весло в комплекте')),
        ],
      },
      {
        slug: 'sports-games',
        slugs: l('sports-games', 'sporta-speles', 'sportivnye-igry'),
        sticker: 'blue',
        icon: 'trophy',
        names: l('Sports games', 'Sporta spēles', 'Спортивные игры'),
        attributes: [
          select('type', TYPE, [
            opt('table-tennis', 'Table tennis', 'Galda teniss', 'Настольный теннис'),
            opt('volleyball', 'Volleyball', 'Volejbols', 'Волейбол'),
            opt('basketball', 'Basketball', 'Basketbols', 'Баскетбол'),
            opt('football', 'Football', 'Futbols', 'Футбол'),
            opt('badminton', 'Badminton', 'Badmintons', 'Бадминтон'),
            OTHER,
          ]),
          included(),
        ],
      },
    ],
  },
  {
    slug: 'camping',
    slugs: l('camping', 'turisms-kempings', 'turizm-kemping'),
    sticker: 'mint',
    icon: 'tent',
    names: l('Camping & outdoors', 'Tūrisms un kempings', 'Туризм и кемпинг'),
    children: [
      {
        slug: 'tents',
        slugs: l('tents', 'teltis', 'palatki'),
        sticker: 'mint',
        icon: 'tent',
        names: l('Tents', 'Teltis', 'Палатки'),
        attributes: [number('people', PEOPLE, undefined, true), number('weight', WEIGHT, 'kg'), brand()],
      },
      {
        slug: 'sleeping-bags-mats',
        slugs: l('sleeping-bags-mats', 'gulammaisi-paklajini', 'spalnye-meshki-kovriki'),
        sticker: 'mint',
        icon: 'bed',
        names: l('Sleeping bags & mats', 'Guļammaisi un paklājiņi', 'Спальные мешки и коврики'),
        attributes: [
          select('type', TYPE, [
            opt('sleeping-bag', 'Sleeping bag', 'Guļammaiss', 'Спальный мешок'),
            opt('mat', 'Mat', 'Paklājiņš', 'Коврик'),
            opt('air-mattress', 'Air mattress', 'Piepūšamais matracis', 'Надувной матрас'),
          ]),
          number('comfortTemp', l('Comfort temperature', 'Komforta temperatūra', 'Температура комфорта'), '°C'),
        ],
      },
      {
        slug: 'camping-furniture',
        slugs: l('camping-furniture', 'kempinga-mebeles', 'kempingovaya-mebel'),
        sticker: 'mint',
        icon: 'armchair',
        names: l('Camping furniture', 'Kempinga mēbeles', 'Кемпинговая мебель'),
        attributes: [text('kind', l('What furniture', 'Kādas mēbeles', 'Какая мебель'), true), number('pieces', l('Pieces', 'Gabali', 'Предметов'))],
      },
      {
        slug: 'stoves-coolers',
        slugs: l('stoves-coolers', 'plitinas-aukstumkastes', 'gorelki-holodilnye-sumki'),
        sticker: 'mint',
        icon: 'flame',
        names: l('Stoves & coolers', 'Plītiņas un aukstumkastes', 'Горелки и холодильные сумки'),
        attributes: [
          select('type', TYPE, [
            opt('stove', 'Camping stove', 'Tūrisma plītiņa', 'Туристическая горелка'),
            opt('cooler', 'Cooler', 'Aukstumkaste', 'Холодильная сумка'),
            opt('grill', 'Portable grill', 'Pārnēsājams grils', 'Переносной гриль'),
          ]),
          number('volume', l('Volume', 'Tilpums', 'Объём'), 'L'),
        ],
      },
      {
        slug: 'backpacks',
        slugs: l('backpacks', 'mugursomas', 'ryukzaki'),
        sticker: 'mint',
        icon: 'backpack',
        names: l('Backpacks', 'Mugursomas', 'Рюкзаки'),
        attributes: [
          select('type', TYPE, [
            opt('hiking', 'Hiking backpack', 'Pārgājienu mugursoma', 'Походный рюкзак'),
            opt('travel', 'Travel backpack', 'Ceļojumu mugursoma', 'Дорожный рюкзак'),
            opt('suitcase', 'Suitcase', 'Čemodāns', 'Чемодан'),
            OTHER,
          ]),
          number('volume', l('Volume', 'Tilpums', 'Объём'), 'L'),
        ],
      },
      {
        slug: 'boats-fishing',
        slugs: l('boats-fishing', 'laivas-makskeresana', 'lodki-rybalka'),
        sticker: 'mint',
        icon: 'sailboat',
        names: l('Boats & fishing', 'Laivas un makšķerēšana', 'Лодки и рыбалка'),
        attributes: [
          select('type', TYPE, [
            opt('inflatable-boat', 'Inflatable boat', 'Piepūšamā laiva', 'Надувная лодка'),
            opt('canoe', 'Canoe', 'Kanoe', 'Каноэ'),
            opt('fish-finder', 'Fish finder', 'Zivju meklētājs', 'Эхолот'),
            opt('fishing-gear', 'Fishing gear', 'Makšķerēšanas piederumi', 'Рыболовные снасти'),
            OTHER,
          ]),
          number('people', PEOPLE),
          yesNo('paddles', l('Paddles included', 'Airi komplektā', 'Вёсла в комплекте')),
        ],
      },
      {
        slug: 'climbing',
        slugs: l('climbing', 'alpinisma-inventars', 'alpinistskoe-snaryazhenie'),
        sticker: 'mint',
        icon: 'mountain',
        names: l('Climbing gear', 'Alpīnisma inventārs', 'Альпинистское снаряжение'),
        attributes: [text('kind', l('What gear', 'Kāds inventārs', 'Какое снаряжение'), true), size()],
      },
      {
        slug: 'gps-devices',
        slugs: l('gps-devices', 'turisma-gps', 'turisticheskie-gps'),
        sticker: 'mint',
        icon: 'compass',
        names: l('GPS devices', 'Tūrisma GPS', 'Туристические GPS'),
        attributes: [brand(), model()],
      },
    ],
  },
  {
    slug: 'kids',
    slugs: l('kids', 'berniem', 'detyam'),
    sticker: 'violet',
    icon: 'baby',
    names: l('Kids', 'Bērniem', 'Детям'),
    children: [
      {
        slug: 'strollers',
        slugs: l('strollers', 'bernu-rati', 'detskie-kolyaski'),
        sticker: 'violet',
        icon: 'baby',
        names: l('Strollers', 'Bērnu rati', 'Детские коляски'),
        attributes: [
          select('type', TYPE, [
            opt('pram', 'Pram', 'Guļamie rati', 'Люлька'),
            opt('pushchair', 'Pushchair', 'Sporta rati', 'Прогулочная коляска'),
            opt('travel-system', 'Travel system', 'Kombinētie rati', 'Коляска 2 в 1 или 3 в 1'),
            opt('double', 'Double stroller', 'Rati dvīņiem', 'Коляска для двойни'),
          ]),
          brand(),
          yesNo('foldable', l('Folds flat', 'Saliekami', 'Складная')),
        ],
      },
      {
        slug: 'car-seats-carriers',
        slugs: l('car-seats-carriers', 'autokresli-kengursomas', 'avtokresla-ryukzaki-kenguru'),
        sticker: 'violet',
        icon: 'car-seat',
        names: l('Car seats & carriers', 'Autokrēsli un ķengursomas', 'Автокресла и рюкзаки-кенгуру'),
        attributes: [
          select('type', TYPE, [
            opt('car-seat', 'Car seat', 'Autokrēsls', 'Автокресло'),
            opt('carrier', 'Baby carrier', 'Ķengursoma', 'Рюкзак-кенгуру'),
          ]),
          text('ageGroup', l('Age or weight group', 'Vecuma vai svara grupa', 'Возрастная или весовая группа')),
          yesNo('isofix', l('Isofix', 'Isofix', 'Isofix')),
        ],
      },
      {
        slug: 'kids-scooters-bikes',
        slugs: l('kids-scooters-bikes', 'skrejriteni-balansesanas-velosipedi', 'samokaty-begovely'),
        sticker: 'violet',
        icon: 'scooter',
        names: l('Scooters & balance bikes', 'Skrejriteņi un balansēšanas velosipēdi', 'Самокаты и беговелы'),
        attributes: [
          select('type', TYPE, [
            opt('scooter', 'Scooter', 'Skrejritenis', 'Самокат'),
            opt('balance-bike', 'Balance bike', 'Balansēšanas velosipēds', 'Беговел'),
            opt('kids-bike', 'Kids bike', 'Bērnu velosipēds', 'Детский велосипед'),
          ]),
          number('ageFrom', l('From age (years)', 'No vecuma (gadi)', 'С возраста (лет)')),
          yesNo('helmet', HELMET),
        ],
      },
      {
        slug: 'playhouses-slides',
        slugs: l('playhouses-slides', 'rotalu-majas-slidkalnini', 'igrovye-domiki-gorki'),
        sticker: 'violet',
        icon: 'castle',
        names: l('Playhouses & slides', 'Rotaļu mājas un slidkalniņi', 'Игровые домики и горки'),
        attributes: [
          select('type', TYPE, [
            opt('playhouse', 'Playhouse', 'Rotaļu māja', 'Игровой домик'),
            opt('slide', 'Slide', 'Slidkalniņš', 'Горка'),
            opt('bouncy-castle', 'Bouncy castle', 'Piepūšamā pils', 'Надувной замок'),
            opt('sandpit', 'Sandpit', 'Smilšu kaste', 'Песочница'),
            OTHER,
          ]),
          size(),
        ],
      },
      {
        slug: 'toys-board-games',
        slugs: l('toys-board-games', 'rotallietas-galda-speles', 'igrushki-nastolnye-igry'),
        sticker: 'violet',
        icon: 'blocks',
        names: l('Toys & board games', 'Rotaļlietas un galda spēles', 'Игрушки и настольные игры'),
        attributes: [
          text('kind', l('What toy or game', 'Kāda rotaļlieta vai spēle', 'Какая игрушка или игра'), true),
          number('ageFrom', l('From age (years)', 'No vecuma (gadi)', 'С возраста (лет)')),
          yesNo('complete', l('All pieces present', 'Visas detaļas ir', 'Все детали на месте')),
        ],
      },
      {
        slug: 'kids-furniture',
        slugs: l('kids-furniture', 'bernu-mebeles', 'detskaya-mebel'),
        sticker: 'violet',
        icon: 'bed',
        names: l('Kids’ furniture', 'Bērnu mēbeles', 'Детская мебель'),
        attributes: [
          select('type', TYPE, [
            opt('cot', 'Cot', 'Bērnu gultiņa', 'Детская кроватка'),
            opt('travel-cot', 'Travel cot', 'Ceļojumu gultiņa', 'Дорожная кроватка'),
            opt('high-chair', 'High chair', 'Barošanas krēsliņš', 'Стульчик для кормления'),
            opt('playpen', 'Playpen', 'Manēža', 'Манеж'),
            opt('changing-table', 'Changing table', 'Pārtinamais galds', 'Пеленальный столик'),
            OTHER,
          ]),
          yesNo('foldable', l('Foldable', 'Saliekams', 'Складной')),
        ],
      },
    ],
  },
  {
    slug: 'events-party',
    slugs: l('events-party', 'pasakumi-svetki', 'prazdniki-meropriyatiya'),
    sticker: 'ember',
    icon: 'party-popper',
    names: l('Events & parties', 'Pasākumi un svētki', 'Праздники и мероприятия'),
    children: [
      {
        slug: 'event-tents',
        slugs: l('event-tents', 'teltis-nojumes-pasakumiem', 'shatry-navesy'),
        sticker: 'ember',
        icon: 'tent',
        names: l('Event tents & canopies', 'Teltis un nojumes pasākumiem', 'Шатры и навесы'),
        attributes: [
          select('type', TYPE, [
            opt('tent', 'Party tent', 'Svētku telts', 'Шатёр'),
            opt('canopy', 'Canopy', 'Nojume', 'Навес'),
            opt('pavilion', 'Pop-up pavilion', 'Saliekamais paviljons', 'Быстросборный павильон'),
          ]),
          number('capacity', l('Guests', 'Viesi', 'Гостей')),
          size(),
        ],
      },
      {
        slug: 'tables-chairs',
        slugs: l('tables-chairs', 'galdi-kresli', 'stoly-stulya'),
        sticker: 'ember',
        icon: 'armchair',
        names: l('Tables & chairs', 'Galdi un krēsli', 'Столы и стулья'),
        attributes: [
          select('type', TYPE, [
            opt('table', 'Tables', 'Galdi', 'Столы'),
            opt('chair', 'Chairs', 'Krēsli', 'Стулья'),
            opt('set', 'Tables and chairs', 'Galdi un krēsli', 'Столы и стулья'),
            OTHER,
          ]),
          number('capacity', l('Seats', 'Sēdvietas', 'Мест')),
          text('dimensions', l('Size (W × D × H)', 'Izmērs (P × D × A)', 'Размер (Ш × Г × В)')),
        ],
      },
      {
        slug: 'sound-light',
        slugs: l('sound-light', 'skana-gaisma', 'zvuk-svet'),
        sticker: 'ember',
        icon: 'speaker',
        names: l('Sound & light', 'Skaņa un gaisma', 'Звук и свет'),
        attributes: [
          select('type', TYPE, [
            opt('speaker-system', 'Speaker system', 'Skaņas sistēma', 'Акустическая система'),
            opt('mixer', 'Mixing desk', 'Mikšerpults', 'Микшерный пульт'),
            opt('microphone', 'Microphone', 'Mikrofons', 'Микрофон'),
            opt('stage-lights', 'Stage lights', 'Skatuves gaismas', 'Сценический свет'),
            opt('smoke-machine', 'Smoke machine', 'Dūmu mašīna', 'Дым-машина'),
            OTHER,
          ]),
          watts(),
          included(),
        ],
      },
      {
        slug: 'costumes',
        slugs: l('costumes', 'karnevala-terpi', 'karnavalnye-kostyumy'),
        sticker: 'ember',
        icon: 'shirt',
        names: l('Costumes', 'Karnevāla tērpi', 'Карнавальные костюмы'),
        attributes: [
          select('size', SIZE, [
            opt('xs', 'XS'),
            opt('s', 'S'),
            opt('m', 'M'),
            opt('l', 'L'),
            opt('xl', 'XL'),
            opt('xxl', 'XXL'),
            opt('kids', 'Kids', 'Bērnu', 'Детский'),
          ]),
          text('theme', l('Character or theme', 'Tēls vai tēma', 'Образ или тема')),
          yesNo('accessories', l('Accessories included', 'Aksesuāri komplektā', 'Аксессуары в комплекте')),
        ],
      },
      {
        slug: 'party-decor',
        slugs: l('party-decor', 'svetku-dekoracijas', 'prazdnichnyy-dekor'),
        sticker: 'ember',
        icon: 'cake',
        names: l('Party decor', 'Svētku dekorācijas', 'Праздничный декор'),
        attributes: [
          select('type', TYPE, [
            opt('decorations', 'Decorations', 'Dekorācijas', 'Декор'),
            opt('photo-wall', 'Photo wall', 'Foto siena', 'Фотозона'),
            opt('chocolate-fountain', 'Chocolate fountain', 'Šokolādes strūklaka', 'Шоколадный фонтан'),
            opt('popcorn-machine', 'Popcorn machine', 'Popkorna aparāts', 'Аппарат для попкорна'),
            opt('bubble-machine', 'Bubble machine', 'Burbuļu mašīna', 'Генератор мыльных пузырей'),
            OTHER,
          ]),
          included(),
        ],
      },
    ],
  },
  {
    slug: 'music',
    slugs: l('music', 'muzika', 'muzyka'),
    sticker: 'lavender',
    icon: 'music',
    names: l('Music', 'Mūzika', 'Музыка'),
    children: [
      {
        slug: 'instruments',
        slugs: l('instruments', 'muzikas-instrumenti', 'muzykalnye-instrumenty'),
        sticker: 'lavender',
        icon: 'guitar',
        names: l('Musical instruments', 'Mūzikas instrumenti', 'Музыкальные инструменты'),
        attributes: [
          select('type', TYPE, [
            opt('guitar', 'Guitar', 'Ģitāra', 'Гитара'),
            opt('bass', 'Bass guitar', 'Basģitāra', 'Бас-гитара'),
            opt('keyboard', 'Keyboard or piano', 'Sintezators vai klavieres', 'Синтезатор или пианино'),
            opt('drums', 'Drums', 'Bungas', 'Барабаны'),
            opt('violin', 'Violin', 'Vijole', 'Скрипка'),
            opt('wind', 'Wind instrument', 'Pūšaminstruments', 'Духовой инструмент'),
            OTHER,
          ]),
          brand(),
          yesNo('case', l('Case included', 'Futrālis komplektā', 'Чехол в комплекте')),
        ],
      },
      {
        slug: 'dj-equipment',
        slugs: l('dj-equipment', 'dj-aprikojums', 'dj-oborudovanie'),
        sticker: 'lavender',
        icon: 'disc',
        names: l('DJ equipment', 'DJ aprīkojums', 'DJ-оборудование'),
        attributes: [
          select('type', TYPE, [
            opt('controller', 'DJ controller', 'DJ kontrolieris', 'DJ-контроллер'),
            opt('turntable', 'Turntable', 'Vinila atskaņotājs', 'Проигрыватель винила'),
            opt('mixer', 'Mixer', 'Mikseris', 'Микшер'),
            opt('monitors', 'Monitors', 'Monitori', 'Мониторы'),
            OTHER,
          ]),
          brand(),
          included(),
        ],
      },
    ],
  },
  {
    slug: 'car-travel',
    slugs: l('car-travel', 'auto-celosana', 'avto-puteshestviya'),
    sticker: 'sun',
    icon: 'car',
    names: l('Car & travel', 'Auto un ceļošana', 'Авто и путешествия'),
    children: [
      {
        slug: 'roof-boxes-racks',
        slugs: l('roof-boxes-racks', 'jumta-kastes-bagaznieki', 'avtoboksy-bagazhniki'),
        sticker: 'sun',
        icon: 'package',
        names: l('Roof boxes & racks', 'Jumta kastes un bagāžnieki', 'Автобоксы и багажники'),
        attributes: [
          select('type', TYPE, [
            opt('roof-box', 'Roof box', 'Jumta kaste', 'Автобокс'),
            opt('roof-rack', 'Roof rack', 'Jumta bagāžnieks', 'Багажник на крышу'),
            opt('ski-rack', 'Ski rack', 'Slēpju turētājs', 'Крепление для лыж'),
          ]),
          number('volume', l('Volume', 'Tilpums', 'Объём'), 'L'),
          text('fits', l('Fits cars', 'Der automašīnām', 'Подходит для машин')),
        ],
      },
      {
        slug: 'bike-carriers',
        slugs: l('bike-carriers', 'velosipedu-turetaji', 'velokrepleniya'),
        sticker: 'sun',
        icon: 'bike',
        names: l('Bike carriers', 'Velosipēdu turētāji', 'Велокрепления'),
        attributes: [
          select('type', TYPE, [
            opt('towbar', 'Towbar carrier', 'Uz āķa', 'На фаркоп'),
            opt('roof', 'Roof carrier', 'Uz jumta', 'На крышу'),
            opt('rear', 'Boot carrier', 'Uz bagāžnieka durvīm', 'На заднюю дверь'),
          ]),
          number('bikes', l('Bikes', 'Velosipēdi', 'Велосипедов'), undefined, true),
        ],
      },
      {
        slug: 'dashcams-gps',
        slugs: l('dashcams-gps', 'videoregistratori-gps', 'videoregistratory-gps'),
        sticker: 'sun',
        icon: 'navigation',
        names: l('Dashcams & GPS', 'Videoreģistratori un GPS', 'Видеорегистраторы и GPS'),
        attributes: [
          select('type', TYPE, [
            opt('dashcam', 'Dashcam', 'Videoreģistrators', 'Видеорегистратор'),
            opt('gps', 'Car GPS', 'Auto GPS', 'Автонавигатор'),
          ]),
          brand(),
        ],
      },
      {
        slug: 'battery-chargers',
        slugs: l('battery-chargers', 'akumulatoru-ladetaji', 'zaryadnye-ustroystva'),
        sticker: 'sun',
        icon: 'battery-charging',
        names: l('Battery chargers', 'Akumulatoru lādētāji', 'Зарядные устройства'),
        attributes: [
          select('type', TYPE, [
            opt('charger', 'Battery charger', 'Akumulatora lādētājs', 'Зарядное устройство'),
            opt('jump-starter', 'Jump starter', 'Palaišanas ierīce', 'Пусковое устройство'),
            opt('compressor', 'Air compressor', 'Kompresors', 'Компрессор'),
            OTHER,
          ]),
          included(),
        ],
      },
    ],
  },
];

/**
 * Categories of the earlier tree (plan 6) and where their listings go in the C02 tree: an old
 * category's listings move to the new one on start (ensureCategories), keeping only the attribute
 * values the new category knows. Several old keys live on as roots of the new tree (`photo-video`,
 * `camping`); their listings still move to a subcategory, because only a leaf takes listings.
 */
export const LEGACY_CATEGORIES: Readonly<Record<string, string>> = {
  'photo-video': 'cameras',
  audio: 'speakers-audio',
  'power-tools': 'drills-drivers',
  'hand-tools': 'hand-tool-sets',
  'garden-tools': 'lawn-mowers-trimmers',
  'sports-outdoors': 'sports',
  'bikes-scooters': 'bikes',
  camping: 'tents',
  'home-cleaning': 'vacuum-cleaners',
  furniture: 'tables-chairs',
  'party-equipment': 'party-decor',
  'event-tents-furniture': 'event-tents',
  'strollers-car-seats': 'strollers',
  'toys-games': 'toys-board-games',
  'travel-gear': 'backpacks',
  'car-tools': 'battery-chargers',
};

/** Bumped whenever LEGACY_CATEGORIES changes: the moves run once per version. */
export const CATALOG_VERSION = 'c02';
