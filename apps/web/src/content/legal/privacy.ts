/*
 * Privacy policy (GDPR). A careful first version for an operator in Latvia that describes what the
 * code really does today (see apps/api: auth cookies, sessions, account deletion in me.service.ts).
 * NOT legal advice: before a commercial launch a lawyer must review it, including the providers'
 * company names, data processing agreements and transfer mechanisms. Keep the three languages in step.
 */
import type { LegalDoc, LegalTexts } from './types';

const en: LegalDoc = {
  title: 'Privacy policy',
  summary: [
    'We keep only what the service needs. No advertising, no tracking, no selling of data.',
    'Your exact address is never public: others see only the district.',
    'You can see, correct, export and delete your data. Deleting your account is one button in Settings.',
    'Our hosting and email providers process data for us under contract.',
    'Questions and requests: admin@yoyo.rent.',
  ],
  sections: [
    {
      id: 'controller',
      heading: '1. Who is responsible',
      blocks: [
        {
          p: 'The controller of your personal data is {operator}. For anything about your data, write to [admin@yoyo.rent](mailto:admin@yoyo.rent).',
        },
      ],
    },
    {
      id: 'data',
      heading: '2. What data we keep',
      blocks: [
        {
          table: {
            head: ['What', 'Details'],
            rows: [
              [
                'Account',
                'Name, email address, password (stored only as a one-way hash), language, theme and, if you add them, your city and a short “about” text.',
              ],
              ['Sign-in with Google', 'Your Google account identifier and email address. We never see your Google password.'],
              ['Phone', 'When phone confirmation is available: your number and when it was confirmed.'],
              [
                'Listings',
                'Photos (with location and camera data removed), title, description, category, prices, deposit, rules, the district, and the exact point you set, which is never shown to anyone else.',
              ],
              [
                'Sessions and security',
                'The IP address and browser of each signed-in session, sign-in attempts, and a device cookie that protects your sign-in.',
              ],
              ['Emails we send', 'The address, the kind of message and when it was sent.'],
              [
                'Deals, messages and reviews',
                'As these features open: booking requests, contracts and their signatures, handover photos, chat messages, reports, disputes and reviews.',
              ],
              ['Server logs', 'Technical records kept by our hosting providers: IP address, time, the address requested and errors.'],
            ],
          },
        },
        {
          p: 'We do not use analytics, advertising or tracking tools, and we do not buy data about you from anyone.',
        },
      ],
    },
    {
      id: 'purposes',
      heading: '3. Why we use it, and on what basis',
      blocks: [
        {
          table: {
            head: ['Purpose', 'Legal basis (GDPR)'],
            rows: [
              [
                'Running your account, listings and deals, and sending the emails the service needs',
                'Performing our contract with you, Article 6(1)(b)',
              ],
              [
                'Keeping the service and accounts safe: limits on sign-in attempts, device cookies, preventing fraud and abuse, handling reports and disputes',
                'Our legitimate interest in a safe service, Article 6(1)(f)',
              ],
              [
                'Keeping accounting records once payments are live, and answering lawful requests from authorities',
                'Legal obligation, Article 6(1)(c)',
              ],
              ['Answering your messages', 'Contract or legitimate interest, depending on the question'],
            ],
          },
        },
        {
          p: 'We do not make automated decisions about you that have legal or similarly significant effects, and we never sell your data.',
        },
      ],
    },
    {
      id: 'required',
      heading: '4. Do you have to give us data?',
      blocks: [
        {
          p: 'To create an account we need your name, an email address and a password (or your Google sign-in); without them we cannot open an account. To list an item we need its photos, description, prices and place. Everything else, such as your city and the “about” text, is up to you.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '5. How long we keep it',
      blocks: [
        {
          table: {
            head: ['Data', 'How long'],
            rows: [
              ['Account data', 'Until you delete your account.'],
              [
                'Sessions with their IP address and browser',
                'Until the session ends, at most 30 days after it was last renewed, and at once when you delete your account.',
              ],
              ['Email confirmation and password reset links', 'Valid for 24 hours and 1 hour; removed when you delete your account.'],
              ['Counters that limit sign-in attempts', 'In the server’s memory for minutes; gone after every restart.'],
              [
                'Listings',
                'Until you delete them or your account. Published listings are then kept archived, hidden from everyone and without the exact point, because past deals may refer to them.',
              ],
              ['Deals, contracts and payment records', 'As long as Latvian accounting and limitation rules require.'],
              ['Server logs', 'Kept by the hosting providers for a short time, usually days to a few weeks.'],
              ['Backups', 'Our database provider keeps restore points for a short window of days; after that, deleted data is gone from them too.'],
            ],
          },
        },
      ],
    },
    {
      id: 'delete',
      heading: '6. Deleting your account',
      blocks: [
        { p: 'Open Settings → Security → Delete account. When you confirm:' },
        {
          list: [
            'your name, email address, password, phone, city and “about” text are erased, and the email address can be used for a new account;',
            'all your sessions end and their IP addresses and browsers are erased; the link to your Google account is removed;',
            'listings that were never published are deleted together with their photos; published listings leave the catalog and lose their exact point;',
            'what remains is an anonymous record (“Deleted user”), so that past deals, contracts and reviews that other people rely on still make sense.',
          ],
        },
        {
          p: 'If you cannot sign in, write to [admin@yoyo.rent](mailto:admin@yoyo.rent) from the address of the account and we will delete it for you.',
        },
        {
          p: 'If you have an open deal or money in your Yoyo wallet, finish the deal or pay the money out first: until then the account cannot be deleted, so that nobody’s deposit or payment is left without an owner.',
        },
      ],
    },
    {
      id: 'processors',
      heading: '7. Who helps us',
      blocks: [
        { p: 'These providers run parts of Yoyo for us. They process data only on our instructions, under data processing terms:' },
        {
          table: {
            head: ['Provider', 'What for', 'Where'],
            rows: [
              ['Vercel Inc.', 'Hosting and delivering the website', 'Servers in the EU and the USA; company in the USA'],
              ['Render Services, Inc.', 'Running the server behind the site (the API)', 'Frankfurt, Germany; company in the USA'],
              ['Neon', 'The database', 'Frankfurt, Germany; company in the USA'],
              ['Resend', 'Sending the service’s emails', 'USA'],
              ['Cloudinary Ltd.', 'Storing and resizing listing photos', 'Israel and the USA'],
              ['ImprovMX', 'Forwarding the email sent to admin@yoyo.rent', 'Outside the EU'],
              ['GoDaddy', 'The yoyo.rent domain name and its DNS', 'USA'],
            ],
          },
        },
        {
          p: 'Independent services: if you choose to sign in with Google, Google Ireland Limited handles that sign-in under its own privacy policy. When you search for an address while creating a listing, the text you type is sent from our server to the OpenStreetMap Foundation’s Nominatim service; no account data is sent with it.',
        },
      ],
    },
    {
      id: 'transfers',
      heading: '8. Data outside the EU',
      blocks: [
        {
          p: 'Some of the providers above are based outside the European Economic Area. Such transfers rely on the EU–US Data Privacy Framework for certified companies, on an adequacy decision of the European Commission (for example, for Israel and the United Kingdom), or on the Commission’s standard contractual clauses. You can ask us for details.',
        },
      ],
    },
    {
      id: 'rights',
      heading: '9. Your rights',
      blocks: [
        {
          list: [
            'Access: get a copy of the data we hold about you.',
            'Correction: fix data that is wrong or incomplete.',
            'Erasure: have your data deleted.',
            'Restriction: ask us to pause using your data while something is checked.',
            'Portability: get the data you gave us in a machine-readable format.',
            'Objection: object to uses based on our legitimate interest.',
          ],
        },
        {
          p: 'Much of this you can do yourself in Settings. For the rest, write to [admin@yoyo.rent](mailto:admin@yoyo.rent) from the address of your account. We answer within one month, free of charge.',
        },
        {
          p: 'If you think we handle your data wrongly, you can complain to the Data State Inspectorate of Latvia (Datu valsts inspekcija), Elijas iela 17, Rīga, LV-1050, [www.dvi.gov.lv](https://www.dvi.gov.lv), or to the data protection authority of the EU country where you live.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: '10. Cookies',
      blocks: [{ p: 'We use only the cookies the site needs to work. The [cookie policy](/cookies) lists every one of them.' }],
    },
    {
      id: 'children',
      heading: '11. Children',
      blocks: [
        {
          p: 'Yoyo is for people aged 18 and over. We do not knowingly keep data about children; if you think a child has an account, tell us and we will delete it.',
        },
      ],
    },
    {
      id: 'security',
      heading: '12. Security',
      blocks: [
        {
          p: 'Connections are encrypted (HTTPS). Passwords are stored only as Argon2 hashes, sign-in tokens are short-lived and kept in cookies that scripts cannot read, photos are stripped of location data, and only the people who run Yoyo can reach the database. If a breach puts your data at risk, we will tell you and the supervisory authority as the law requires.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '13. Changes',
      blocks: [
        {
          p: 'We update this policy when the service changes. The date at the top shows the current version; important changes are announced by email.',
        },
      ],
    },
  ],
};

const lv: LegalDoc = {
  title: 'Privātuma politika',
  summary: [
    'Mēs glabājam tikai to, kas vajadzīgs pakalpojumam. Nekādas reklāmas, izsekošanas vai datu pārdošanas.',
    'Jūsu precīzā adrese nekad nav publiska: citi redz tikai rajonu.',
    'Jūs varat savus datus apskatīt, labot, izgūt un dzēst. Konta dzēšana ir viena poga Iestatījumos.',
    'Mūsu mitināšanas un e-pasta pakalpojumu sniedzēji apstrādā datus mūsu uzdevumā saskaņā ar līgumu.',
    'Jautājumi un pieprasījumi: admin@yoyo.rent.',
  ],
  sections: [
    {
      id: 'controller',
      heading: '1. Kas ir atbildīgs',
      blocks: [
        {
          p: 'Jūsu personas datu pārzinis ir {operator}. Par visu, kas saistīts ar jūsu datiem, rakstiet uz [admin@yoyo.rent](mailto:admin@yoyo.rent).',
        },
      ],
    },
    {
      id: 'data',
      heading: '2. Kādus datus mēs glabājam',
      blocks: [
        {
          table: {
            head: ['Kas', 'Sīkāk'],
            rows: [
              [
                'Konts',
                'Vārds, e-pasta adrese, parole (glabāta tikai kā neatgriezeniska jaucējvērtība), valoda, tēma un, ja tos norādāt, pilsēta un īss teksts “par mani”.',
              ],
              ['Pieteikšanās ar Google', 'Jūsu Google konta identifikators un e-pasta adrese. Jūsu Google paroli mēs nekad neredzam.'],
              ['Tālrunis', 'Kad būs pieejama tālruņa apstiprināšana: jūsu numurs un apstiprināšanas laiks.'],
              [
                'Sludinājumi',
                'Foto (bez atrašanās vietas un kameras datiem), nosaukums, apraksts, kategorija, cenas, depozīts, noteikumi, rajons un jūsu norādītais precīzais punkts, kas nevienam citam netiek rādīts.',
              ],
              [
                'Sesijas un drošība',
                'Katras sesijas IP adrese un pārlūks, pieteikšanās mēģinājumi un ierīces sīkdatne, kas aizsargā jūsu pieteikšanos.',
              ],
              ['Mūsu sūtītie e-pasti', 'Adrese, ziņas veids un nosūtīšanas laiks.'],
              [
                'Darījumi, ziņas un atsauksmes',
                'Kad šīs iespējas tiks atvērtas: rezervāciju pieprasījumi, līgumi un to paraksti, nodošanas foto, sarakste, ziņojumi, strīdi un atsauksmes.',
              ],
              ['Servera žurnāli', 'Mitināšanas pakalpojumu sniedzēju tehniskie ieraksti: IP adrese, laiks, pieprasītā adrese un kļūdas.'],
            ],
          },
        },
        {
          p: 'Mēs neizmantojam analītikas, reklāmas vai izsekošanas rīkus un nepērkam datus par jums ne no viena.',
        },
      ],
    },
    {
      id: 'purposes',
      heading: '3. Kāpēc mēs tos izmantojam un uz kāda pamata',
      blocks: [
        {
          table: {
            head: ['Mērķis', 'Tiesiskais pamats (VDAR)'],
            rows: [
              [
                'Jūsu konta, sludinājumu un darījumu darbība un pakalpojumam vajadzīgo e-pastu sūtīšana',
                'Līguma ar jums izpilde, 6. panta 1. punkta b) apakšpunkts',
              ],
              [
                'Pakalpojuma un kontu drošība: pieteikšanās mēģinājumu ierobežojumi, ierīces sīkdatnes, krāpšanas un ļaunprātīgas izmantošanas novēršana, ziņojumu un strīdu izskatīšana',
                'Mūsu leģitīmās intereses uzturēt drošu pakalpojumu, 6. panta 1. punkta f) apakšpunkts',
              ],
              [
                'Grāmatvedības uzskaite, kad darbosies maksājumi, un atbildes uz likumīgiem iestāžu pieprasījumiem',
                'Juridisks pienākums, 6. panta 1. punkta c) apakšpunkts',
              ],
              ['Atbildes uz jūsu vēstulēm', 'Līgums vai leģitīmās intereses atkarībā no jautājuma'],
            ],
          },
        },
        {
          p: 'Mēs nepieņemam par jums automatizētus lēmumus, kam ir juridiskas vai līdzīgi būtiskas sekas, un nekad nepārdodam jūsu datus.',
        },
      ],
    },
    {
      id: 'required',
      heading: '4. Vai jums dati jāsniedz?',
      blocks: [
        {
          p: 'Lai izveidotu kontu, mums vajadzīgs jūsu vārds, e-pasta adrese un parole (vai pieteikšanās ar Google); bez tiem kontu atvērt nevaram. Lai izliktu lietu, vajadzīgi tās foto, apraksts, cenas un vieta. Viss pārējais, piemēram, pilsēta un teksts “par mani”, ir pēc jūsu izvēles.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '5. Cik ilgi mēs tos glabājam',
      blocks: [
        {
          table: {
            head: ['Dati', 'Cik ilgi'],
            rows: [
              ['Konta dati', 'Līdz konta dzēšanai.'],
              [
                'Sesijas ar to IP adresi un pārlūku',
                'Līdz sesijas beigām, ne ilgāk kā 30 dienas pēc pēdējās atjaunošanas, un uzreiz pēc konta dzēšanas.',
              ],
              ['E-pasta apstiprināšanas un paroles atjaunošanas saites', 'Derīgas 24 stundas un 1 stundu; dzēstas līdz ar kontu.'],
              ['Pieteikšanās mēģinājumu skaitītāji', 'Servera atmiņā dažas minūtes; pazūd pēc katras restartēšanas.'],
              [
                'Sludinājumi',
                'Līdz jūs tos vai savu kontu izdzēšat. Publicētie sludinājumi pēc tam tiek glabāti arhīvā, paslēpti no visiem un bez precīzā punkta, jo uz tiem var atsaukties iepriekšējie darījumi.',
              ],
              ['Darījumi, līgumi un maksājumu ieraksti', 'Tik ilgi, cik to prasa Latvijas grāmatvedības un noilguma noteikumi.'],
              ['Servera žurnāli', 'Mitināšanas pakalpojumu sniedzēji tos glabā īsu laiku, parasti no dažām dienām līdz dažām nedēļām.'],
              ['Rezerves kopijas', 'Datubāzes pakalpojumu sniedzējs glabā atjaunošanas punktus dažas dienas; pēc tam dzēstie dati pazūd arī no tiem.'],
            ],
          },
        },
      ],
    },
    {
      id: 'delete',
      heading: '6. Konta dzēšana',
      blocks: [
        { p: 'Atveriet Iestatījumi → Drošība → Dzēst kontu. Kad apstiprināt:' },
        {
          list: [
            'jūsu vārds, e-pasta adrese, parole, tālrunis, pilsēta un teksts “par mani” tiek dzēsti, un e-pasta adresi var izmantot jaunam kontam;',
            'visas jūsu sesijas beidzas, un to IP adreses un pārlūki tiek dzēsti; saikne ar jūsu Google kontu tiek noņemta;',
            'nekad nepublicētie sludinājumi tiek dzēsti kopā ar foto; publicētie sludinājumi pazūd no kataloga un zaudē precīzo punktu;',
            'paliek anonīms ieraksts (“Dzēsts lietotājs”), lai iepriekšējie darījumi, līgumi un atsauksmes, uz kuriem paļaujas citi cilvēki, saglabātu jēgu.',
          ],
        },
        {
          p: 'Ja nevarat pieteikties, rakstiet uz [admin@yoyo.rent](mailto:admin@yoyo.rent) no konta e-pasta adreses, un mēs to izdzēsīsim jūsu vietā.',
        },
        {
          p: 'Ja jums ir neslēgts darījums vai nauda Yoyo makā, vispirms pabeidziet darījumu vai izmaksājiet naudu: līdz tam kontu dzēst nevar, lai neviena depozīts vai maksājums nepaliktu bez saņēmēja.',
        },
      ],
    },
    {
      id: 'processors',
      heading: '7. Kas mums palīdz',
      blocks: [
        { p: 'Šie pakalpojumu sniedzēji mūsu uzdevumā darbina Yoyo daļas. Viņi apstrādā datus tikai pēc mūsu norādījumiem saskaņā ar datu apstrādes noteikumiem:' },
        {
          table: {
            head: ['Pakalpojumu sniedzējs', 'Kam', 'Kur'],
            rows: [
              ['Vercel Inc.', 'Vietnes mitināšana un piegāde', 'Serveri ES un ASV; uzņēmums ASV'],
              ['Render Services, Inc.', 'Vietnes servera daļa (API)', 'Frankfurte, Vācija; uzņēmums ASV'],
              ['Neon', 'Datubāze', 'Frankfurte, Vācija; uzņēmums ASV'],
              ['Resend', 'Pakalpojuma e-pastu sūtīšana', 'ASV'],
              ['Cloudinary Ltd.', 'Sludinājumu foto glabāšana un izmēra maiņa', 'Izraēla un ASV'],
              ['ImprovMX', 'Uz admin@yoyo.rent sūtīto vēstuļu pāradresācija', 'Ārpus ES'],
              ['GoDaddy', 'Domēns yoyo.rent un tā DNS', 'ASV'],
            ],
          },
        },
        {
          p: 'Neatkarīgi pakalpojumi: ja izvēlaties pieteikties ar Google, šo pieteikšanos apstrādā Google Ireland Limited saskaņā ar savu privātuma politiku. Kad, veidojot sludinājumu, meklējat adresi, jūsu ierakstītais teksts no mūsu servera tiek nosūtīts OpenStreetMap Foundation pakalpojumam Nominatim; konta dati kopā ar to netiek sūtīti.',
        },
      ],
    },
    {
      id: 'transfers',
      heading: '8. Dati ārpus ES',
      blocks: [
        {
          p: 'Daži no minētajiem pakalpojumu sniedzējiem atrodas ārpus Eiropas Ekonomikas zonas. Šādas nosūtīšanas pamatā ir ES–ASV datu privātuma regulējums sertificētiem uzņēmumiem, Eiropas Komisijas lēmums par aizsardzības līmeņa pietiekamību (piemēram, Izraēlai un Apvienotajai Karalistei) vai Komisijas standarta līguma klauzulas. Sīkāku informāciju varat pieprasīt mums.',
        },
      ],
    },
    {
      id: 'rights',
      heading: '9. Jūsu tiesības',
      blocks: [
        {
          list: [
            'Piekļuve: saņemt kopiju datiem, ko par jums glabājam.',
            'Labošana: izlabot nepareizus vai nepilnīgus datus.',
            'Dzēšana: panākt savu datu dzēšanu.',
            'Ierobežošana: lūgt uz laiku neizmantot jūsu datus, kamēr kaut kas tiek pārbaudīts.',
            'Pārnesamība: saņemt jūsu sniegtos datus mašīnlasāmā formātā.',
            'Iebildumi: iebilst pret izmantošanu, kuras pamatā ir mūsu leģitīmās intereses.',
          ],
        },
        {
          p: 'Daudz ko no tā varat izdarīt paši Iestatījumos. Par pārējo rakstiet uz [admin@yoyo.rent](mailto:admin@yoyo.rent) no sava konta e-pasta adreses. Mēs atbildam viena mēneša laikā, bez maksas.',
        },
        {
          p: 'Ja uzskatāt, ka apstrādājam jūsu datus nepareizi, varat iesniegt sūdzību Datu valsts inspekcijā, Elijas ielā 17, Rīgā, LV-1050, [www.dvi.gov.lv](https://www.dvi.gov.lv), vai jūsu dzīvesvietas ES valsts datu aizsardzības iestādē.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: '10. Sīkdatnes',
      blocks: [{ p: 'Mēs izmantojam tikai tās sīkdatnes, bez kurām vietne nedarbojas. Tās visas uzskaitītas [sīkdatņu politikā](/cookies).' }],
    },
    {
      id: 'children',
      heading: '11. Bērni',
      blocks: [
        {
          p: 'Yoyo ir paredzēts cilvēkiem no 18 gadu vecuma. Mēs apzināti neglabājam datus par bērniem; ja domājat, ka bērnam ir konts, pasakiet mums, un mēs to izdzēsīsim.',
        },
      ],
    },
    {
      id: 'security',
      heading: '12. Drošība',
      blocks: [
        {
          p: 'Savienojumi ir šifrēti (HTTPS). Paroles tiek glabātas tikai kā Argon2 jaucējvērtības, pieteikšanās marķieri ir īslaicīgi un glabājas sīkdatnēs, kuras skripti nevar nolasīt, no foto tiek noņemti atrašanās vietas dati, un datubāzei var piekļūt tikai tie, kas uztur Yoyo. Ja datu noplūde apdraud jūsu datus, mēs, kā to prasa likums, informēsim jūs un uzraudzības iestādi.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '13. Izmaiņas',
      blocks: [
        {
          p: 'Mēs atjaunojam šo politiku, kad mainās pakalpojums. Datums lapas augšā rāda pašreizējo versiju; par būtiskām izmaiņām paziņojam pa e-pastu.',
        },
      ],
    },
  ],
};

const ru: LegalDoc = {
  title: 'Политика конфиденциальности',
  summary: [
    'Мы храним только то, что нужно сервису. Никакой рекламы, слежки и продажи данных.',
    'Ваш точный адрес никогда не публикуется: другие видят только район.',
    'Свои данные можно посмотреть, исправить, выгрузить и удалить. Удаление аккаунта — одна кнопка в Настройках.',
    'Наши хостинг- и почтовые провайдеры обрабатывают данные по нашему поручению и по договору.',
    'Вопросы и запросы: admin@yoyo.rent.',
  ],
  sections: [
    {
      id: 'controller',
      heading: '1. Кто отвечает',
      blocks: [
        {
          p: 'Ответственный за обработку ваших персональных данных (контролёр) — {operator}. По любым вопросам о ваших данных пишите на [admin@yoyo.rent](mailto:admin@yoyo.rent).',
        },
      ],
    },
    {
      id: 'data',
      heading: '2. Какие данные мы храним',
      blocks: [
        {
          table: {
            head: ['Что', 'Подробно'],
            rows: [
              [
                'Аккаунт',
                'Имя, адрес почты, пароль (хранится только в виде необратимого хеша), язык, тема и, если вы их укажете, город и короткий текст «о себе».',
              ],
              ['Вход через Google', 'Идентификатор вашего аккаунта Google и адрес почты. Ваш пароль от Google мы никогда не видим.'],
              ['Телефон', 'Когда станет доступно подтверждение телефона: ваш номер и время подтверждения.'],
              [
                'Объявления',
                'Фото (без данных о местоположении и камере), название, описание, категория, цены, залог, правила, район и указанная вами точная точка, которую никто другой не видит.',
              ],
              [
                'Сессии и безопасность',
                'IP-адрес и браузер каждой сессии, попытки входа и cookie устройства, которая защищает ваш вход.',
              ],
              ['Письма, которые мы отправляем', 'Адрес, тип письма и время отправки.'],
              [
                'Сделки, сообщения и отзывы',
                'По мере запуска этих функций: запросы на бронь, договоры и их подписи, фото при передаче, сообщения в чате, жалобы, споры и отзывы.',
              ],
              ['Журналы сервера', 'Технические записи хостинг-провайдеров: IP-адрес, время, запрошенный адрес и ошибки.'],
            ],
          },
        },
        {
          p: 'Мы не используем инструменты аналитики, рекламы и слежки и не покупаем данные о вас ни у кого.',
        },
      ],
    },
    {
      id: 'purposes',
      heading: '3. Зачем мы их используем и на каком основании',
      blocks: [
        {
          table: {
            head: ['Цель', 'Правовое основание (GDPR)'],
            rows: [
              [
                'Работа вашего аккаунта, объявлений и сделок, отправка писем, без которых сервис не работает',
                'Исполнение договора с вами, статья 6(1)(b)',
              ],
              [
                'Безопасность сервиса и аккаунтов: ограничение попыток входа, cookie устройства, предотвращение мошенничества и злоупотреблений, рассмотрение жалоб и споров',
                'Наш законный интерес в безопасном сервисе, статья 6(1)(f)',
              ],
              [
                'Бухгалтерский учёт, когда заработают платежи, и ответы на законные запросы государственных органов',
                'Юридическая обязанность, статья 6(1)(c)',
              ],
              ['Ответы на ваши письма', 'Договор или законный интерес, в зависимости от вопроса'],
            ],
          },
        },
        {
          p: 'Мы не принимаем о вас автоматических решений, имеющих юридические или сходные по значимости последствия, и никогда не продаём ваши данные.',
        },
      ],
    },
    {
      id: 'required',
      heading: '4. Обязательно ли давать нам данные?',
      blocks: [
        {
          p: 'Чтобы создать аккаунт, нам нужны ваше имя, адрес почты и пароль (или вход через Google); без них открыть аккаунт нельзя. Чтобы выставить вещь, нужны её фото, описание, цены и место. Всё остальное, например город и текст «о себе», — по вашему желанию.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '5. Сколько мы их храним',
      blocks: [
        {
          table: {
            head: ['Данные', 'Срок'],
            rows: [
              ['Данные аккаунта', 'Пока вы не удалите аккаунт.'],
              [
                'Сессии с IP-адресом и браузером',
                'До конца сессии, не дольше 30 дней после последнего продления, и сразу при удалении аккаунта.',
              ],
              ['Ссылки подтверждения почты и сброса пароля', 'Действуют 24 часа и 1 час; удаляются вместе с аккаунтом.'],
              ['Счётчики попыток входа', 'В памяти сервера несколько минут; исчезают при каждом перезапуске.'],
              [
                'Объявления',
                'Пока вы не удалите их или аккаунт. Опубликованные объявления после этого хранятся в архиве, скрытые от всех и без точной точки, потому что на них могут ссылаться прошлые сделки.',
              ],
              ['Сделки, договоры и записи о платежах', 'Столько, сколько требуют латвийские правила бухгалтерского учёта и сроки давности.'],
              ['Журналы сервера', 'Хостинг-провайдеры хранят их недолго, обычно от нескольких дней до нескольких недель.'],
              ['Резервные копии', 'Провайдер базы данных хранит точки восстановления несколько дней; после этого удалённые данные исчезают и из них.'],
            ],
          },
        },
      ],
    },
    {
      id: 'delete',
      heading: '6. Удаление аккаунта',
      blocks: [
        { p: 'Откройте Настройки → Безопасность → Удалить аккаунт. Когда вы подтвердите:' },
        {
          list: [
            'ваши имя, адрес почты, пароль, телефон, город и текст «о себе» стираются, и этот адрес почты можно использовать для нового аккаунта;',
            'все ваши сессии завершаются, их IP-адреса и браузеры стираются; связь с вашим аккаунтом Google удаляется;',
            'никогда не публиковавшиеся объявления удаляются вместе с фото; опубликованные объявления исчезают из каталога и теряют точную точку;',
            'остаётся анонимная запись («Удалённый пользователь»), чтобы прошлые сделки, договоры и отзывы, на которые полагаются другие люди, не потеряли смысл.',
          ],
        },
        {
          p: 'Если вы не можете войти, напишите на [admin@yoyo.rent](mailto:admin@yoyo.rent) с адреса аккаунта, и мы удалим его за вас.',
        },
        {
          p: 'Если у вас есть незакрытая сделка или деньги в кошельке Yoyo, сначала завершите сделку или выведите деньги: до этого аккаунт удалить нельзя, чтобы ничей залог или платёж не остался без получателя.',
        },
      ],
    },
    {
      id: 'processors',
      heading: '7. Кто нам помогает',
      blocks: [
        { p: 'Эти провайдеры по нашему поручению обеспечивают работу частей Yoyo. Они обрабатывают данные только по нашим указаниям и на условиях договора об обработке данных:' },
        {
          table: {
            head: ['Провайдер', 'Для чего', 'Где'],
            rows: [
              ['Vercel Inc.', 'Хостинг и доставка сайта', 'Серверы в ЕС и США; компания в США'],
              ['Render Services, Inc.', 'Серверная часть сайта (API)', 'Франкфурт, Германия; компания в США'],
              ['Neon', 'База данных', 'Франкфурт, Германия; компания в США'],
              ['Resend', 'Отправка писем сервиса', 'США'],
              ['Cloudinary Ltd.', 'Хранение и изменение размера фото объявлений', 'Израиль и США'],
              ['ImprovMX', 'Пересылка писем, отправленных на admin@yoyo.rent', 'За пределами ЕС'],
              ['GoDaddy', 'Домен yoyo.rent и его DNS', 'США'],
            ],
          },
        },
        {
          p: 'Независимые сервисы: если вы входите через Google, этот вход обрабатывает Google Ireland Limited по своей политике конфиденциальности. Когда при создании объявления вы ищете адрес, введённый текст отправляется с нашего сервера в сервис Nominatim фонда OpenStreetMap; данные аккаунта вместе с ним не отправляются.',
        },
      ],
    },
    {
      id: 'transfers',
      heading: '8. Данные за пределами ЕС',
      blocks: [
        {
          p: 'Некоторые из этих провайдеров находятся за пределами Европейской экономической зоны. Такая передача опирается на EU–US Data Privacy Framework для сертифицированных компаний, на решение Европейской комиссии о достаточном уровне защиты (например, для Израиля и Великобритании) или на стандартные договорные условия Комиссии. Подробности можно запросить у нас.',
        },
      ],
    },
    {
      id: 'rights',
      heading: '9. Ваши права',
      blocks: [
        {
          list: [
            'Доступ: получить копию данных, которые мы о вас храним.',
            'Исправление: исправить неверные или неполные данные.',
            'Удаление: добиться удаления своих данных.',
            'Ограничение: попросить временно не использовать данные, пока что-то проверяется.',
            'Переносимость: получить предоставленные вами данные в машиночитаемом формате.',
            'Возражение: возразить против использования, основанного на нашем законном интересе.',
          ],
        },
        {
          p: 'Многое из этого можно сделать самому в Настройках. По остальному пишите на [admin@yoyo.rent](mailto:admin@yoyo.rent) с адреса вашего аккаунта. Мы отвечаем в течение месяца, бесплатно.',
        },
        {
          p: 'Если вы считаете, что мы обрабатываем ваши данные неправильно, вы можете подать жалобу в Государственную инспекцию данных Латвии (Datu valsts inspekcija), Elijas iela 17, Rīga, LV-1050, [www.dvi.gov.lv](https://www.dvi.gov.lv), или в надзорный орган страны ЕС, где вы живёте.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: '10. Файлы cookie',
      blocks: [{ p: 'Мы используем только cookie, без которых сайт не работает. Все они перечислены в [политике cookie](/cookies).' }],
    },
    {
      id: 'children',
      heading: '11. Дети',
      blocks: [
        {
          p: 'Yoyo предназначен для людей от 18 лет. Мы сознательно не храним данные детей; если вы думаете, что у ребёнка есть аккаунт, сообщите нам, и мы его удалим.',
        },
      ],
    },
    {
      id: 'security',
      heading: '12. Безопасность',
      blocks: [
        {
          p: 'Соединения зашифрованы (HTTPS). Пароли хранятся только в виде хешей Argon2, токены входа живут недолго и хранятся в cookie, недоступных скриптам, из фото удаляются данные о местоположении, а доступ к базе данных есть только у тех, кто ведёт Yoyo. Если утечка поставит ваши данные под угрозу, мы, как требует закон, сообщим вам и надзорному органу.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '13. Изменения',
      blocks: [
        {
          p: 'Мы обновляем эту политику, когда меняется сервис. Дата вверху показывает текущую версию; о важных изменениях мы сообщаем письмом.',
        },
      ],
    },
  ],
};

export const PRIVACY_POLICY: LegalTexts = { en, lv, ru };
