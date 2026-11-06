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
   * Addresses on the Latvian and Russian sites (`/lv/c/<lv>`, `/ru/c/<ru>`), from the W03 sitemap
   * (docs/hitexis/W03-sitemap-urls.md §D). Once indexed they do not change; a change needs a 301.
   */
  slugs: { lv: string; ru: string };
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

const included = () => text('included', INCLUDED);
const brand = () => text('brand', BRAND);
const watts = () => number('watts', POWER_W, 'W');

/**
 * The category tree with the attributes the listing builder asks for (spec §4.3, §4.8). It is reference
 * data: ensureCategories writes it to the database on every start. Slugs and attribute keys are
 * stable identifiers (listings store values by key); names and labels may change freely.
 */
export const CATALOG: CatalogCategory[] = [
  {
    slug: 'electronics',
    slugs: { lv: 'elektronika', ru: 'elektronika' },
    sticker: 'blue',
    icon: 'monitor-smartphone',
    names: l('Electronics', 'Elektronika', 'Электроника'),
    children: [
      {
        slug: 'game-consoles',
        slugs: { lv: 'spelu-konsoles', ru: 'igrovye-pristavki' },
        sticker: 'blue',
        icon: 'gamepad',
        names: l('Game consoles', 'Spēļu konsoles', 'Игровые приставки'),
        attributes: [
          select('model', l('Model', 'Modelis', 'Модель'), [
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
        slug: 'photo-video',
        slugs: { lv: 'foto-video', ru: 'foto-video' },
        sticker: 'blue',
        icon: 'camera',
        names: l('Photo & video', 'Foto un video', 'Фото и видео'),
        attributes: [
          select('type', TYPE, [
            opt('camera', 'Camera', 'Kamera', 'Камера'),
            opt('lens', 'Lens', 'Objektīvs', 'Объектив'),
            opt('action-camera', 'Action camera', 'Sporta kamera', 'Экшн-камера'),
            opt('lighting', 'Lighting', 'Apgaismojums', 'Свет'),
            opt('tripod-gimbal', 'Tripod or gimbal', 'Statīvs vai stabilizators', 'Штатив или стабилизатор'),
            OTHER,
          ]),
          brand(),
          text('mount', l('Lens mount', 'Objektīva stiprinājums', 'Байонет')),
          included(),
        ],
      },
      {
        slug: 'audio',
        slugs: { lv: 'audio', ru: 'audio' },
        sticker: 'blue',
        icon: 'headphones',
        names: l('Audio', 'Audio', 'Аудио'),
        attributes: [
          select('type', TYPE, [
            opt('speaker', 'Speaker', 'Skaļrunis', 'Колонка'),
            opt('headphones', 'Headphones', 'Austiņas', 'Наушники'),
            opt('microphone', 'Microphone', 'Mikrofons', 'Микрофон'),
            opt('recorder', 'Recorder', 'Diktofons', 'Рекордер'),
            OTHER,
          ]),
          brand(),
          yesNo('wireless', l('Wireless', 'Bezvadu', 'Беспроводной')),
        ],
      },
      {
        slug: 'laptops-tablets',
        slugs: { lv: 'klepjdatori-plansetes', ru: 'noutbuki-planshety' },
        sticker: 'blue',
        icon: 'laptop',
        names: l('Laptops & tablets', 'Klēpjdatori un planšetes', 'Ноутбуки и планшеты'),
        attributes: [
          select('type', TYPE, [
            opt('laptop', 'Laptop', 'Klēpjdators', 'Ноутбук'),
            opt('tablet', 'Tablet', 'Planšete', 'Планшет'),
            opt('e-reader', 'E-reader', 'E-grāmatu lasītājs', 'Электронная книга'),
          ]),
          brand(),
          number('screen', l('Screen size', 'Ekrāna izmērs', 'Диагональ экрана'), 'in'),
          yesNo('charger', l('Charger included', 'Lādētājs komplektā', 'Зарядка в комплекте')),
        ],
      },
      {
        slug: 'projectors',
        slugs: { lv: 'projektori', ru: 'proektory' },
        sticker: 'blue',
        icon: 'projector',
        names: l('Projectors', 'Projektori', 'Проекторы'),
        attributes: [
          select('resolution', l('Resolution', 'Izšķirtspēja', 'Разрешение'), [
            opt('hd', 'HD (720p)'),
            opt('full-hd', 'Full HD (1080p)'),
            opt('4k', '4K'),
          ]),
          number('brightness', l('Brightness', 'Spilgtums', 'Яркость'), 'lm'),
          yesNo('screenIncluded', l('Screen included', 'Ekrāns komplektā', 'Экран в комплекте')),
        ],
      },
      {
        slug: 'drones',
        slugs: { lv: 'droni', ru: 'drony' },
        sticker: 'blue',
        icon: 'drone',
        names: l('Drones', 'Droni', 'Дроны'),
        attributes: [
          brand(),
          number('batteries', l('Batteries', 'Akumulatori', 'Аккумуляторы'), undefined, true),
          yesNo('camera', l('Has a camera', 'Ar kameru', 'С камерой')),
          number('weight', l('Weight', 'Svars', 'Вес'), 'g'),
        ],
      },
    ],
  },
  {
    slug: 'tools',
    slugs: { lv: 'instrumenti', ru: 'instrumenty' },
    sticker: 'sun',
    icon: 'wrench',
    names: l('Tools', 'Instrumenti', 'Инструменты'),
    children: [
      {
        slug: 'power-tools',
        slugs: { lv: 'elektroinstrumenti', ru: 'elektroinstrument' },
        sticker: 'sun',
        icon: 'drill',
        names: l('Power tools', 'Elektroinstrumenti', 'Электроинструмент'),
        attributes: [
          select('power', l('Power supply', 'Barošana', 'Питание'), [
            opt('mains', 'Mains', 'Tīkls', 'Сеть'),
            opt('battery', 'Battery', 'Akumulators', 'Аккумулятор'),
          ]),
          watts(),
          included(),
        ],
      },
      {
        slug: 'hand-tools',
        slugs: { lv: 'rokas-instrumenti', ru: 'ruchnoy-instrument' },
        sticker: 'sun',
        icon: 'hammer',
        names: l('Hand tools', 'Rokas instrumenti', 'Ручной инструмент'),
        attributes: [
          text('kind', l('What tool', 'Kāds instruments', 'Какой инструмент'), true),
          number('pieces', l('Pieces in the set', 'Daļas komplektā', 'Предметов в наборе')),
        ],
      },
      {
        slug: 'garden-tools',
        slugs: { lv: 'darza-tehnika', ru: 'sadovyy-instrument' },
        sticker: 'sun',
        icon: 'shovel',
        names: l('Garden tools', 'Dārza tehnika', 'Садовый инструмент'),
        attributes: [
          select('type', TYPE, [
            opt('lawn-mower', 'Lawn mower', 'Zāles pļāvējs', 'Газонокосилка'),
            opt('trimmer', 'Trimmer', 'Trimmeris', 'Триммер'),
            opt('hedge-trimmer', 'Hedge trimmer', 'Dzīvžoga šķēres', 'Кусторез'),
            opt('chainsaw', 'Chainsaw', 'Motorzāģis', 'Бензопила'),
            opt('leaf-blower', 'Leaf blower', 'Lapu pūtējs', 'Воздуходувка'),
            OTHER,
          ]),
          select(
            'power',
            l('Power supply', 'Barošana', 'Питание'),
            [
              opt('mains', 'Mains', 'Tīkls', 'Сеть'),
              opt('battery', 'Battery', 'Akumulators', 'Аккумулятор'),
              opt('petrol', 'Petrol', 'Benzīns', 'Бензин'),
              opt('manual', 'Manual', 'Manuāls', 'Ручной'),
            ],
            false,
          ),
          included(),
        ],
      },
      {
        slug: 'measuring-tools',
        slugs: { lv: 'merinstrumenti', ru: 'izmeritelnyy-instrument' },
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
        slugs: { lv: 'kapnes-sastatnes', ru: 'lestnitsy-lesa' },
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
        slugs: { lv: 'tirisanas-tehnika', ru: 'uborochnaya-tehnika' },
        sticker: 'sun',
        icon: 'spray-can',
        names: l('Cleaning machines', 'Tīrīšanas tehnika', 'Уборочная техника'),
        attributes: [
          select('type', TYPE, [
            opt('pressure-washer', 'Pressure washer', 'Augstspiediena mazgātājs', 'Мойка высокого давления'),
            opt('carpet-cleaner', 'Carpet cleaner', 'Paklāju tīrītājs', 'Моющий пылесос для ковров'),
            opt('wet-dry-vacuum', 'Wet and dry vacuum', 'Mitrās un sausās tīrīšanas putekļsūcējs', 'Строительный пылесос'),
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
    slug: 'sports-outdoors',
    slugs: { lv: 'sports-daba', ru: 'sport-otdyh' },
    sticker: 'mint',
    icon: 'bike',
    names: l('Sports & outdoors', 'Sports un daba', 'Спорт и отдых'),
    children: [
      {
        slug: 'bikes-scooters',
        slugs: { lv: 'velosipedi-skrejriteni', ru: 'velosipedy-samokaty' },
        sticker: 'mint',
        icon: 'bike',
        names: l('Bikes & scooters', 'Velosipēdi un skrejriteņi', 'Велосипеды и самокаты'),
        attributes: [
          select('type', TYPE, [
            opt('city', 'City bike', 'Pilsētas velosipēds', 'Городской велосипед'),
            opt('mountain', 'Mountain bike', 'Kalnu velosipēds', 'Горный велосипед'),
            opt('road', 'Road bike', 'Šosejas velosipēds', 'Шоссейный велосипед'),
            opt('electric', 'E-bike', 'Elektrovelosipēds', 'Электровелосипед'),
            opt('kids', 'Kids bike', 'Bērnu velosipēds', 'Детский велосипед'),
            opt('scooter', 'Scooter', 'Skrejritenis', 'Самокат'),
            opt('e-scooter', 'E-scooter', 'Elektriskais skrejritenis', 'Электросамокат'),
          ]),
          text('frameSize', l('Frame size', 'Rāmja izmērs', 'Размер рамы')),
          yesNo('helmet', l('Helmet included', 'Ķivere komplektā', 'Шлем в комплекте')),
        ],
      },
      {
        slug: 'camping',
        slugs: { lv: 'kempings', ru: 'kemping' },
        sticker: 'mint',
        icon: 'tent',
        names: l('Camping', 'Kempings', 'Кемпинг'),
        attributes: [
          select('type', TYPE, [
            opt('tent', 'Tent', 'Telts', 'Палатка'),
            opt('sleeping-bag', 'Sleeping bag', 'Guļammaiss', 'Спальный мешок'),
            opt('stove', 'Camping stove', 'Tūrisma plītiņa', 'Туристическая плитка'),
            opt('backpack', 'Backpack', 'Mugursoma', 'Рюкзак'),
            opt('furniture', 'Camping furniture', 'Kempinga mēbeles', 'Кемпинговая мебель'),
            OTHER,
          ]),
          number('people', l('For how many people', 'Cik cilvēkiem', 'На сколько человек')),
          number('weight', l('Weight', 'Svars', 'Вес'), 'kg'),
        ],
      },
      {
        slug: 'winter-sports',
        slugs: { lv: 'ziemas-sports', ru: 'zimniy-sport' },
        sticker: 'mint',
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
          text('size', SIZE, true),
          yesNo('helmet', l('Helmet included', 'Ķivere komplektā', 'Шлем в комплекте')),
        ],
      },
      {
        slug: 'water-sports',
        slugs: { lv: 'udens-sports', ru: 'vodnyy-sport' },
        sticker: 'mint',
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
          text('size', SIZE),
          yesNo('paddle', l('Paddle included', 'Airis komplektā', 'Весло в комплекте')),
        ],
      },
      {
        slug: 'fitness',
        slugs: { lv: 'fitness', ru: 'fitnes' },
        sticker: 'mint',
        icon: 'dumbbell',
        names: l('Fitness', 'Fitness', 'Фитнес'),
        attributes: [
          text('kind', l('Equipment', 'Inventārs', 'Тренажёр или инвентарь'), true),
          number('weight', l('Weight', 'Svars', 'Вес'), 'kg'),
        ],
      },
    ],
  },
  {
    slug: 'home-kitchen',
    slugs: { lv: 'maja-virtuve', ru: 'dom-kuhnya' },
    sticker: 'lavender',
    icon: 'home',
    names: l('Home & kitchen', 'Māja un virtuve', 'Дом и кухня'),
    children: [
      {
        slug: 'kitchen-appliances',
        slugs: { lv: 'virtuves-tehnika', ru: 'kuhonnaya-tehnika' },
        sticker: 'lavender',
        icon: 'chef-hat',
        names: l('Kitchen appliances', 'Virtuves tehnika', 'Кухонная техника'),
        attributes: [
          select('type', TYPE, [
            opt('mixer', 'Mixer', 'Mikseris', 'Миксер'),
            opt('blender', 'Blender', 'Blenderis', 'Блендер'),
            opt('coffee-machine', 'Coffee machine', 'Kafijas automāts', 'Кофемашина'),
            opt('grill', 'Grill', 'Grils', 'Гриль'),
            opt('food-processor', 'Food processor', 'Virtuves kombains', 'Кухонный комбайн'),
            OTHER,
          ]),
          brand(),
          watts(),
        ],
      },
      {
        slug: 'home-cleaning',
        slugs: { lv: 'majas-uzkopsana', ru: 'uborka-doma' },
        sticker: 'lavender',
        icon: 'sparkles',
        names: l('Cleaning', 'Uzkopšana', 'Уборка'),
        attributes: [
          select('type', TYPE, [
            opt('vacuum', 'Vacuum cleaner', 'Putekļsūcējs', 'Пылесос'),
            opt('robot-vacuum', 'Robot vacuum', 'Robots putekļsūcējs', 'Робот-пылесос'),
            opt('steam-cleaner', 'Steam cleaner', 'Tvaika tīrītājs', 'Пароочиститель'),
            OTHER,
          ]),
          brand(),
        ],
      },
      {
        slug: 'furniture',
        slugs: { lv: 'mebeles', ru: 'mebel' },
        sticker: 'lavender',
        icon: 'sofa',
        names: l('Furniture', 'Mēbeles', 'Мебель'),
        attributes: [
          text('kind', l('What furniture', 'Kādas mēbeles', 'Какая мебель'), true),
          text('dimensions', l('Size (W × D × H)', 'Izmērs (P × D × A)', 'Размер (Ш × Г × В)')),
        ],
      },
    ],
  },
  {
    slug: 'events-party',
    slugs: { lv: 'pasakumi-svetki', ru: 'prazdniki-meropriyatiya' },
    sticker: 'ember',
    icon: 'party-popper',
    names: l('Events & party', 'Pasākumi un svinības', 'Праздники и мероприятия'),
    children: [
      {
        slug: 'party-equipment',
        slugs: { lv: 'svetku-inventars', ru: 'inventar-dlya-prazdnika' },
        sticker: 'ember',
        icon: 'cake',
        names: l('Party equipment', 'Svētku inventārs', 'Оборудование для праздников'),
        attributes: [
          select('type', TYPE, [
            opt('chocolate-fountain', 'Chocolate fountain', 'Šokolādes strūklaka', 'Шоколадный фонтан'),
            opt('popcorn-machine', 'Popcorn machine', 'Popkorna aparāts', 'Аппарат для попкорна'),
            opt('cotton-candy', 'Cotton candy machine', 'Cukurvates aparāts', 'Аппарат для сахарной ваты'),
            opt('bubble-machine', 'Bubble machine', 'Burbuļu mašīna', 'Генератор мыльных пузырей'),
            opt('decorations', 'Decorations', 'Dekorācijas', 'Декор'),
            OTHER,
          ]),
          included(),
        ],
      },
      {
        slug: 'sound-light',
        slugs: { lv: 'skana-gaisma', ru: 'zvuk-svet' },
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
        slug: 'event-tents-furniture',
        slugs: { lv: 'teltis-nojumes', ru: 'shatry-mebel' },
        sticker: 'ember',
        icon: 'armchair',
        names: l('Tents & event furniture', 'Teltis un pasākumu mēbeles', 'Шатры и мебель'),
        attributes: [
          select('type', TYPE, [
            opt('tent', 'Party tent', 'Svētku telts', 'Шатёр'),
            opt('table', 'Tables', 'Galdi', 'Столы'),
            opt('chair', 'Chairs', 'Krēsli', 'Стулья'),
            OTHER,
          ]),
          number('capacity', l('Seats or guests', 'Vietas vai viesi', 'Мест или гостей')),
          text('size', SIZE),
        ],
      },
      {
        slug: 'costumes',
        slugs: { lv: 'kostimi', ru: 'kostyumy' },
        sticker: 'ember',
        icon: 'shirt',
        names: l('Costumes', 'Kostīmi', 'Костюмы'),
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
    ],
  },
  {
    slug: 'kids',
    slugs: { lv: 'berniem', ru: 'detyam' },
    sticker: 'violet',
    icon: 'baby',
    names: l('Kids', 'Bērniem', 'Детям'),
    children: [
      {
        slug: 'strollers-car-seats',
        slugs: { lv: 'rati-autokresli', ru: 'kolyaski-avtokresla' },
        sticker: 'violet',
        icon: 'baby',
        names: l('Strollers & car seats', 'Ratiņi un autosēdeklīši', 'Коляски и автокресла'),
        attributes: [
          select('type', TYPE, [
            opt('stroller', 'Stroller', 'Ratiņi', 'Коляска'),
            opt('car-seat', 'Car seat', 'Autosēdeklītis', 'Автокресло'),
            opt('carrier', 'Baby carrier', 'Ķengursoma', 'Переноска'),
          ]),
          text('ageGroup', l('Age or weight group', 'Vecuma vai svara grupa', 'Возрастная или весовая группа')),
          yesNo('isofix', l('Isofix', 'Isofix', 'Isofix')),
        ],
      },
      {
        slug: 'toys-games',
        slugs: { lv: 'rotallietas-speles', ru: 'igrushki-igry' },
        sticker: 'violet',
        icon: 'blocks',
        names: l('Toys & games', 'Rotaļlietas un spēles', 'Игрушки и игры'),
        attributes: [
          text('kind', l('What toy or game', 'Kāda rotaļlieta vai spēle', 'Какая игрушка или игра'), true),
          number('ageFrom', l('From age (years)', 'No vecuma (gadi)', 'С возраста (лет)')),
          yesNo('complete', l('All pieces present', 'Visas detaļas ir', 'Все детали на месте')),
        ],
      },
      {
        slug: 'kids-furniture',
        slugs: { lv: 'bernu-mebeles', ru: 'detskaya-mebel' },
        sticker: 'violet',
        icon: 'bed',
        names: l('Kids furniture', 'Bērnu mēbeles', 'Детская мебель'),
        attributes: [
          select('type', TYPE, [
            opt('cot', 'Cot', 'Bērnu gultiņa', 'Детская кроватка'),
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
    slug: 'music',
    slugs: { lv: 'muzika', ru: 'muzyka' },
    sticker: 'blue',
    icon: 'music',
    names: l('Music', 'Mūzika', 'Музыка'),
    children: [
      {
        slug: 'instruments',
        slugs: { lv: 'muzikas-instrumenti', ru: 'muzykalnye-instrumenty' },
        sticker: 'blue',
        icon: 'guitar',
        names: l('Instruments', 'Instrumenti', 'Инструменты'),
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
        slugs: { lv: 'dj-aprikojums', ru: 'dj-oborudovanie' },
        sticker: 'blue',
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
    slugs: { lv: 'auto-celojumi', ru: 'avto-puteshestviya' },
    sticker: 'sun',
    icon: 'car',
    names: l('Car & travel', 'Auto un ceļojumi', 'Авто и путешествия'),
    children: [
      {
        slug: 'roof-boxes-racks',
        slugs: { lv: 'jumta-kastes-bagaznieki', ru: 'avtoboksy-bagazhniki' },
        sticker: 'sun',
        icon: 'package',
        names: l('Roof boxes & racks', 'Jumta kastes un bagāžnieki', 'Боксы и багажники'),
        attributes: [
          select('type', TYPE, [
            opt('roof-box', 'Roof box', 'Jumta kaste', 'Автобокс'),
            opt('roof-rack', 'Roof rack', 'Jumta bagāžnieks', 'Багажник на крышу'),
            opt('bike-rack', 'Bike rack', 'Velosipēdu turētājs', 'Велобагажник'),
            opt('ski-rack', 'Ski rack', 'Slēpju turētājs', 'Крепление для лыж'),
          ]),
          number('volume', l('Volume', 'Tilpums', 'Объём'), 'L'),
          text('fits', l('Fits cars', 'Der automašīnām', 'Подходит для машин')),
        ],
      },
      {
        slug: 'travel-gear',
        slugs: { lv: 'celojumu-piederumi', ru: 'dorozhnoe-snaryazhenie' },
        sticker: 'sun',
        icon: 'luggage',
        names: l('Travel gear', 'Ceļojumu aprīkojums', 'Туристическое снаряжение'),
        attributes: [
          select('type', TYPE, [
            opt('suitcase', 'Suitcase', 'Čemodāns', 'Чемодан'),
            opt('backpack', 'Travel backpack', 'Ceļojumu mugursoma', 'Туристический рюкзак'),
            opt('travel-cot', 'Travel cot', 'Ceļojumu gultiņa', 'Дорожная кроватка'),
            OTHER,
          ]),
          number('volume', l('Volume', 'Tilpums', 'Объём'), 'L'),
        ],
      },
      {
        slug: 'car-tools',
        slugs: { lv: 'auto-instrumenti', ru: 'avtoinstrument' },
        sticker: 'sun',
        icon: 'car-front',
        names: l('Car tools', 'Auto instrumenti', 'Автоинструмент'),
        attributes: [
          select('type', TYPE, [
            opt('jump-starter', 'Jump starter', 'Palaišanas ierīce', 'Пусковое устройство'),
            opt('compressor', 'Air compressor', 'Kompresors', 'Компрессор'),
            opt('jack', 'Jack', 'Domkrats', 'Домкрат'),
            opt('tow-rope', 'Tow rope', 'Vilkšanas trose', 'Буксировочный трос'),
            OTHER,
          ]),
          included(),
        ],
      },
    ],
  },
];
