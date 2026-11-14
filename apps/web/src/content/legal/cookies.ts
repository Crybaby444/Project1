/*
 * Cookie policy. Lists exactly what the site (apps/web) and the API (apps/api/src/auth) store in the
 * browser today; legal.test.ts checks the names. NOT legal advice: a lawyer reviews it before a
 * commercial launch. If a cookie is added or changed, update all three languages.
 */
import type { LegalDoc, LegalTexts } from './types';

const en: LegalDoc = {
  title: 'Cookies',
  summary: [
    'Only strictly necessary cookies: signing in, security, and your theme and language.',
    'No advertising, analytics or tracking cookies, so there is no consent banner.',
    'If you remove them in your browser, you are signed out and your choices reset.',
  ],
  sections: [
    {
      id: 'what',
      heading: '1. What cookies are',
      blocks: [
        {
          p: 'Cookies are small text files a website stores in your browser. We use them only for things you ask for: staying signed in, keeping your account safe, and remembering your theme and language. Cookies that are strictly necessary for a service you request do not need your consent under the EU ePrivacy rules (in Latvia, the Law on Information Society Services).',
        },
      ],
    },
    {
      id: 'list',
      heading: '2. The cookies we use',
      blocks: [
        {
          table: {
            head: ['Name', 'What it does', 'How long'],
            rows: [
              [
                'yoyo_at',
                'Keeps you signed in: a short-lived sign-in token that scripts cannot read.',
                '15 minutes',
              ],
              [
                'yoyo_rt',
                'Renews your sign-in without asking for the password again. Sent only to the sign-in endpoints.',
                '30 days',
              ],
              [
                'yoyo_session',
                'Tells the site’s scripts that you may be signed in, so they ask for your account only then. Holds no personal data.',
                '30 days',
              ],
              [
                'yoyo_dev',
                'Remembers that this browser has signed in before, so other people’s wrong passwords cannot lock you out.',
                '1 year',
              ],
              ['yoyo_oauth', 'Connects your return from Google to the sign-in you started.', '10 minutes'],
              ['yoyo-theme', 'Remembers the light or dark theme, if you chose one.', '1 year'],
              [
                'NEXT_LOCALE',
                'Remembers the site language you picked, or that you chose to stay on this one.',
                '1 year',
              ],
            ],
          },
        },
      ],
    },
    {
      id: 'storage',
      heading: '3. Other storage in your browser',
      blocks: [
        {
          table: {
            head: ['Name', 'What it does', 'How long'],
            rows: [
              [
                'yoyo-refreshed-at (local storage)',
                'Lets all your open tabs renew the sign-in once, instead of each tab on its own. Holds only a time.',
                'Until you clear the site’s data',
              ],
            ],
          },
        },
      ],
    },
    {
      id: 'control',
      heading: '4. How to remove them',
      blocks: [
        {
          p: 'You can delete cookies in your browser’s settings at any time. Without them you are signed out, and the site follows your device’s theme and the language in the address.',
        },
      ],
    },
    {
      id: 'future',
      heading: '5. If this changes',
      blocks: [
        {
          p: 'If we ever want to use cookies that are not strictly necessary, for example for statistics, we will ask for your consent first, you will be able to say no without losing anything, and this page will list them.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '6. Contact',
      blocks: [
        {
          p: 'Questions about cookies: [admin@yoyo.rent](mailto:admin@yoyo.rent). See also the [privacy policy](/privacy).',
        },
      ],
    },
  ],
};

const lv: LegalDoc = {
  title: 'Sīkdatnes',
  summary: [
    'Tikai obligāti nepieciešamās sīkdatnes: pieteikšanās, drošība, jūsu tēma un valoda.',
    'Nekādu reklāmas, analītikas vai izsekošanas sīkdatņu, tāpēc nav arī piekrišanas loga.',
    'Ja tās izdzēšat pārlūkā, jūs tiekat izrakstīts un jūsu izvēles tiek atiestatītas.',
  ],
  sections: [
    {
      id: 'what',
      heading: '1. Kas ir sīkdatnes',
      blocks: [
        {
          p: 'Sīkdatnes ir nelielas teksta datnes, ko vietne saglabā jūsu pārlūkā. Mēs tās izmantojam tikai tam, ko jūs paši vēlaties: lai jūs paliktu pieteicies, lai jūsu konts būtu drošībā un lai atcerētos jūsu tēmu un valodu. Saskaņā ar ES e-privātuma noteikumiem (Latvijā — Informācijas sabiedrības pakalpojumu likumu) sīkdatnēm, kas ir obligāti nepieciešamas jūsu pieprasītajam pakalpojumam, jūsu piekrišana nav vajadzīga.',
        },
      ],
    },
    {
      id: 'list',
      heading: '2. Mūsu izmantotās sīkdatnes',
      blocks: [
        {
          table: {
            head: ['Nosaukums', 'Ko tā dara', 'Cik ilgi'],
            rows: [
              [
                'yoyo_at',
                'Uztur jūs pieteikušos: īslaicīgs pieteikšanās marķieris, ko skripti nevar nolasīt.',
                '15 minūtes',
              ],
              [
                'yoyo_rt',
                'Atjauno pieteikšanos, atkārtoti neprasot paroli. Tiek sūtīta tikai pieteikšanās adresēm.',
                '30 dienas',
              ],
              [
                'yoyo_session',
                'Pasaka vietnes skriptiem, ka jūs, iespējams, esat pieteicies, lai tie jautātu pēc jūsu konta tikai tad. Personas datus nesatur.',
                '30 dienas',
              ],
              [
                'yoyo_dev',
                'Atceras, ka šajā pārlūkā jau ir pieteikts, lai citu cilvēku nepareizās paroles nevarētu jūs bloķēt.',
                '1 gads',
              ],
              ['yoyo_oauth', 'Sasaista jūsu atgriešanos no Google ar jūsu sākto pieteikšanos.', '10 minūtes'],
              ['yoyo-theme', 'Atceras gaišo vai tumšo tēmu, ja to izvēlējāties.', '1 gads'],
              [
                'NEXT_LOCALE',
                'Atceras jūsu izvēlēto vietnes valodu vai to, ka izvēlējāties palikt šajā.',
                '1 gads',
              ],
            ],
          },
        },
      ],
    },
    {
      id: 'storage',
      heading: '3. Cita krātuve jūsu pārlūkā',
      blocks: [
        {
          table: {
            head: ['Nosaukums', 'Ko tā dara', 'Cik ilgi'],
            rows: [
              [
                'yoyo-refreshed-at (lokālā krātuve)',
                'Ļauj visām atvērtajām cilnēm atjaunot pieteikšanos vienu reizi, nevis katrai atsevišķi. Satur tikai laiku.',
                'Līdz vietnes datu notīrīšanai',
              ],
            ],
          },
        },
      ],
    },
    {
      id: 'control',
      heading: '4. Kā tās izdzēst',
      blocks: [
        {
          p: 'Sīkdatnes var izdzēst pārlūka iestatījumos jebkurā brīdī. Bez tām jūs tiekat izrakstīts, un vietne izmanto jūsu ierīces tēmu un adresē norādīto valodu.',
        },
      ],
    },
    {
      id: 'future',
      heading: '5. Ja kaut kas mainīsies',
      blocks: [
        {
          p: 'Ja kādreiz vēlēsimies izmantot sīkdatnes, kas nav obligāti nepieciešamas, piemēram, statistikai, mēs vispirms lūgsim jūsu piekrišanu, jūs varēsiet atteikties, neko nezaudējot, un šajā lapā tās būs uzskaitītas.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '6. Kontakti',
      blocks: [
        {
          p: 'Jautājumi par sīkdatnēm: [admin@yoyo.rent](mailto:admin@yoyo.rent). Skatiet arī [privātuma politiku](/privacy).',
        },
      ],
    },
  ],
};

const ru: LegalDoc = {
  title: 'Файлы cookie',
  summary: [
    'Только строго необходимые cookie: вход, безопасность, ваши тема и язык.',
    'Никаких рекламных, аналитических и следящих cookie, поэтому нет и баннера согласия.',
    'Если удалить их в браузере, вы выйдете из аккаунта, а ваш выбор сбросится.',
  ],
  sections: [
    {
      id: 'what',
      heading: '1. Что такое cookie',
      blocks: [
        {
          p: 'Cookie — небольшие текстовые файлы, которые сайт сохраняет в вашем браузере. Мы используем их только для того, о чём вы просите сами: чтобы вы оставались в аккаунте, чтобы аккаунт был защищён и чтобы помнить вашу тему и язык. По правилам ЕС об электронной конфиденциальности (в Латвии — Закон об услугах информационного общества) для cookie, строго необходимых для запрошенной вами услуги, согласие не требуется.',
        },
      ],
    },
    {
      id: 'list',
      heading: '2. Какие cookie мы используем',
      blocks: [
        {
          table: {
            head: ['Название', 'Зачем', 'Срок'],
            rows: [
              [
                'yoyo_at',
                'Держит вас в аккаунте: короткоживущий токен входа, недоступный скриптам.',
                '15 минут',
              ],
              [
                'yoyo_rt',
                'Продлевает вход, не спрашивая пароль снова. Отправляется только на адреса входа.',
                '30 дней',
              ],
              [
                'yoyo_session',
                'Подсказывает скриптам сайта, что вы, возможно, вошли, чтобы они запрашивали аккаунт только тогда. Персональных данных не содержит.',
                '30 дней',
              ],
              [
                'yoyo_dev',
                'Помнит, что в этом браузере уже входили, чтобы чужие неверные пароли не могли заблокировать вам вход.',
                '1 год',
              ],
              ['yoyo_oauth', 'Связывает ваше возвращение из Google с начатым входом.', '10 минут'],
              ['yoyo-theme', 'Помнит светлую или тёмную тему, если вы её выбрали.', '1 год'],
              ['NEXT_LOCALE', 'Помнит выбранный язык сайта или то, что вы решили остаться на этом.', '1 год'],
            ],
          },
        },
      ],
    },
    {
      id: 'storage',
      heading: '3. Другое хранилище в браузере',
      blocks: [
        {
          table: {
            head: ['Название', 'Зачем', 'Срок'],
            rows: [
              [
                'yoyo-refreshed-at (local storage)',
                'Позволяет всем открытым вкладкам продлить вход один раз, а не каждой по отдельности. Хранит только время.',
                'Пока вы не очистите данные сайта',
              ],
            ],
          },
        },
      ],
    },
    {
      id: 'control',
      heading: '4. Как их удалить',
      blocks: [
        {
          p: 'Удалить cookie можно в настройках браузера в любой момент. Без них вы выйдете из аккаунта, а сайт будет следовать теме вашего устройства и языку из адреса.',
        },
      ],
    },
    {
      id: 'future',
      heading: '5. Если что-то изменится',
      blocks: [
        {
          p: 'Если мы когда-нибудь захотим использовать cookie, которые не являются строго необходимыми, например для статистики, мы сначала спросим ваше согласие, вы сможете отказаться, ничего не потеряв, и эта страница их перечислит.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '6. Контакты',
      blocks: [
        {
          p: 'Вопросы о cookie: [admin@yoyo.rent](mailto:admin@yoyo.rent). См. также [политику конфиденциальности](/privacy).',
        },
      ],
    },
  ],
};

export const COOKIES_POLICY: LegalTexts = { en, lv, ru };
