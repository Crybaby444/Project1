/*
 * Terms of service. A careful first version for an operator in Latvia, written for a service that is
 * opening step by step. NOT legal advice: before a commercial launch (real payments, the service fee)
 * a lawyer must review it. The three languages must say the same thing (legal.test.ts checks the shape).
 */
import type { LegalDoc, LegalTexts } from './types';

const en: LegalDoc = {
  title: 'Terms of service',
  summary: [
    'Yoyo connects people who rent things to each other. The rental itself is an agreement between the renter and the owner.',
    'List only items that are yours (or that you may rent out), safe and legal, and describe them honestly.',
    'The contract is signed before any payment, the deposit follows one rule, and our team decides disputes.',
    'Online payments arrive later. Until then no money moves through Yoyo.',
    'Latvian law applies. Write to admin@yoyo.rent with anything.',
  ],
  sections: [
    {
      id: 'about',
      heading: '1. About Yoyo and these terms',
      blocks: [
        {
          p: 'Yoyo (yoyo.rent) is an online marketplace where people rent items to each other. It is run by {operator}, referred to here as “Yoyo”, “we” or “us”.',
        },
        {
          p: 'These terms apply to everyone who uses Yoyo. By creating an account you accept them. If you do not agree with them, please do not use the service.',
        },
        {
          p: 'Yoyo is a go-between. The rental agreement for an item is made between the renter and the owner; Yoyo is not a party to it, does not own the items and does not rent them out itself.',
        },
      ],
    },
    {
      id: 'account',
      heading: '2. Your account',
      blocks: [
        {
          list: [
            'You must be at least 18 years old and legally able to enter into contracts.',
            'Use your real name and an email address that you read. One person, one account.',
            'Keep your password to yourself. You are responsible for what happens in your account; tell us at once if you think someone else has access to it.',
            'You can delete your account at any time in Settings → Security. The [privacy policy](/privacy) explains what happens to your data.',
          ],
        },
      ],
    },
    {
      id: 'listings',
      heading: '3. Listings',
      blocks: [
        {
          p: 'You may list only items that you own or are entitled to rent out, that are in the condition you describe, and that are safe and legal to use.',
        },
        { p: 'You may not list:' },
        {
          list: [
            'weapons, ammunition, explosives and their parts;',
            'drugs, medicines and anything else whose sale or hire is restricted by law;',
            'stolen, counterfeit or illegally imported goods;',
            'hazardous substances, and gas or fuel containers that are not empty;',
            'animals and plants;',
            'vehicles and equipment that need a licence, registration or insurance to be hired out, unless you hold it;',
            'items that infringe someone else’s rights, and adult content;',
            'services, jobs and anything that is not a physical item.',
          ],
        },
        {
          p: 'Photos and descriptions must honestly show the actual item. Only the district of the pick-up place is shown publicly; the exact point you set is used to work out distances and is never published.',
        },
        {
          p: 'A person checks each new listing before it is published. We may reject, hide or remove a listing that breaks these terms or the law, and we tell you why.',
        },
      ],
    },
    {
      id: 'deals',
      heading: '4. How a deal works',
      blocks: [
        {
          list: [
            'The renter picks whole days and sends a request. The owner has 24 hours to accept it; otherwise the request expires.',
            'Yoyo then prepares a rental contract with the parties, the item, the dates, the price, the deposit and the rules. Both sides sign it in the service before any payment.',
            'The parties meet in person to hand over and to return the item, and each of them marks these steps in the service. Yoyo does not deliver items.',
            'The renter uses the item with care, according to its purpose and the owner’s rules, does not lend it on, and returns it on time in the condition it was received, apart from normal wear.',
            'The owner hands over the item as described in the listing, in working and safe condition, with everything the listing says is included.',
          ],
        },
      ],
    },
    {
      id: 'money',
      heading: '5. Prices, fees and the deposit',
      blocks: [
        {
          p: 'Online payments are being introduced step by step. Until they are available in your deal, no money moves through Yoyo, and nothing in the service is a payment you owe to Yoyo. Once they are available, the following applies:',
        },
        {
          list: [
            'The renter pays the rent for the chosen days plus a service fee of 10% of the rent. The owner pays no fee.',
            'The deposit is frozen for the rental and is not paid to the owner while the rental runs.',
            'The rent is released to the owner once both sides confirm the handover; the service fee goes to Yoyo at the same moment.',
            'Refunds and payouts go back the way the money came in.',
            'A balance shown in the Yoyo wallet is a record of your deals inside the service. It is not electronic money or a deposit account and earns no interest.',
          ],
        },
        { p: 'Prices are in euros and show every fee before you confirm.' },
      ],
    },
    {
      id: 'deposit',
      heading: '6. The deposit rule',
      blocks: [
        {
          list: [
            'If the owner confirms that all is well, the whole deposit goes back to the renter.',
            'If the owner reports damage with a description and photos and the renter agrees, the whole deposit goes to the owner.',
            'If the renter disagrees, the dispute goes to Yoyo. We look at the photos from the handover and the return, the chat and the history of the deal, decide whether the deposit goes to the renter or to the owner, and explain the decision to both sides.',
            'If the owner does not check the item within 48 hours of its return, it counts as fine. If the renter does not answer a damage report within 48 hours, the dispute goes to Yoyo.',
            'If the item is not returned after the last day, the owner can open a dispute.',
          ],
        },
        {
          p: 'Our decision is about the deposit only. It does not take away either side’s right to claim further damages from the other or to go to court.',
        },
      ],
    },
    {
      id: 'cancel',
      heading: '7. Cancelling',
      blocks: [
        {
          p: 'Either side can cancel a deal until the item is handed over. If the deal was already paid, the renter gets back the rent, the service fee and the deposit. Cancellations are shown in the statistics of a profile. After the handover a deal cannot be cancelled: the item is returned and the deal closes as usual.',
        },
      ],
    },
    {
      id: 'reviews',
      heading: '8. Reviews',
      blocks: [
        {
          p: 'After a deal closes, both sides have 14 days to rate each other from 1 to 5 stars and write a short review; the renter also rates the item. Reviews must be honest and about the deal. Paying for reviews, reviewing yourself and pressuring someone over a review are not allowed. We may remove reviews that break these rules or the law.',
        },
      ],
    },
    {
      id: 'conduct',
      heading: '9. How we treat each other',
      blocks: [
        {
          list: [
            'Be honest and polite. No harassment, hate speech or threats.',
            'Do not move deals or payments outside Yoyo to avoid the fee or the deposit rule.',
            'No spam, scams, fake accounts, or attempts to break, overload or scrape the service.',
            'Use other people’s details only for your deal with them.',
          ],
        },
      ],
    },
    {
      id: 'moderation',
      heading: '10. Moderation, blocking and reports',
      blocks: [
        {
          p: 'If you see something that breaks these terms or the law, write to [admin@yoyo.rent](mailto:admin@yoyo.rent). We look at every report. We may hide content, or limit or block an account, when the terms or the law are broken or to protect other people. We tell the person concerned what we did and why, unless the law or someone’s safety does not allow it, and they can answer us if they think we got it wrong.',
        },
      ],
    },
    {
      id: 'liability',
      heading: '11. Responsibility',
      blocks: [
        {
          p: 'Owners and renters are responsible for their items, listings and deals. Yoyo does not inspect the items and does not guarantee their condition, safety or legality, or that a deal will take place.',
        },
        {
          p: 'We work to keep Yoyo available and safe, but we cannot promise that it will always work without interruptions or errors.',
        },
        {
          p: 'As far as the law allows, Yoyo is not liable for indirect damage or lost profit, and our total liability to you is limited to the fees you paid to Yoyo in the 12 months before the claim. This does not limit liability for intent or gross negligence, for harm to life or health, or any rights you have as a consumer that cannot be limited.',
        },
        { p: 'Yoyo does not provide insurance for items or deals.' },
      ],
    },
    {
      id: 'content',
      heading: '12. Your content',
      blocks: [
        {
          p: 'You keep the rights to the photos and texts you upload. You give Yoyo a free, non-exclusive licence to store, show and adapt them (for example, to resize photos) in order to run and present the service, for as long as they are on Yoyo. Upload only content you have the right to use.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '13. Changes to these terms',
      blocks: [
        {
          p: 'We may change these terms, for example when new features arrive. We announce changes on this page at least 14 days before they take effect, and by email when they matter to you. If you do not agree, you can delete your account before the change takes effect.',
        },
      ],
    },
    {
      id: 'law',
      heading: '14. Law and disputes',
      blocks: [
        {
          p: 'These terms are governed by the law of the Republic of Latvia. Please write to us first: most problems can be solved quickly. Disputes are settled by the courts of Latvia.',
        },
        {
          p: 'If you are a consumer, nothing in these terms takes away the rights that mandatory law gives you, including the law of the country where you live. You can also turn to the Consumer Rights Protection Centre of Latvia (PTAC, [www.ptac.gov.lv](https://www.ptac.gov.lv)).',
        },
      ],
    },
    {
      id: 'contact',
      heading: '15. Contact',
      blocks: [{ p: 'Questions about these terms: [admin@yoyo.rent](mailto:admin@yoyo.rent).' }],
    },
  ],
};

const lv: LegalDoc = {
  title: 'Lietošanas noteikumi',
  summary: [
    'Yoyo savieno cilvēkus, kuri iznomā lietas viens otram. Pati noma ir vienošanās starp nomnieku un īpašnieku.',
    'Izlieciet tikai lietas, kas pieder jums (vai kuras jums ir tiesības izīrēt), ir drošas un likumīgas, un aprakstiet tās godīgi.',
    'Līgumu paraksta pirms jebkāda maksājuma, depozītam ir viens noteikums, un strīdus izšķir mūsu komanda.',
    'Tiešsaistes maksājumi parādīsies vēlāk. Līdz tam caur Yoyo nauda neplūst.',
    'Piemēro Latvijas tiesības. Ar jebkuru jautājumu rakstiet uz admin@yoyo.rent.',
  ],
  sections: [
    {
      id: 'about',
      heading: '1. Par Yoyo un šiem noteikumiem',
      blocks: [
        {
          p: 'Yoyo (yoyo.rent) ir tiešsaistes tirgus vieta, kur cilvēki iznomā lietas viens otram. To uztur {operator}, turpmāk — “Yoyo” vai “mēs”.',
        },
        {
          p: 'Šie noteikumi attiecas uz ikvienu Yoyo lietotāju. Izveidojot kontu, jūs tos pieņemat. Ja jūs tiem nepiekrītat, lūdzu, neizmantojiet pakalpojumu.',
        },
        {
          p: 'Yoyo ir starpnieks. Nomas līgumu par lietu slēdz nomnieks un īpašnieks; Yoyo nav šī līguma puse, lietas tam nepieder, un pats Yoyo tās neizīrē.',
        },
      ],
    },
    {
      id: 'account',
      heading: '2. Jūsu konts',
      blocks: [
        {
          list: [
            'Jums jābūt vismaz 18 gadus vecam un tiesīgam slēgt līgumus.',
            'Norādiet savu īsto vārdu un e-pasta adresi, kuru lasāt. Viens cilvēks — viens konts.',
            'Neizpaudiet savu paroli. Jūs atbildat par to, kas notiek jūsu kontā; nekavējoties paziņojiet mums, ja domājat, ka tam piekļūst kāds cits.',
            'Kontu var izdzēst jebkurā brīdī sadaļā Iestatījumi → Drošība. Kas notiek ar jūsu datiem, skaidro [privātuma politika](/privacy).',
          ],
        },
      ],
    },
    {
      id: 'listings',
      heading: '3. Sludinājumi',
      blocks: [
        {
          p: 'Jūs drīkstat izlikt tikai lietas, kas pieder jums vai kuras jums ir tiesības izīrēt, kuras ir tādā stāvoklī, kā aprakstāt, un kuras ir droši un likumīgi lietot.',
        },
        { p: 'Nedrīkst izlikt:' },
        {
          list: [
            'ieročus, munīciju, sprāgstvielas un to daļas;',
            'narkotikas, zāles un visu citu, kura pārdošanu vai nomu ierobežo likums;',
            'zagtas, viltotas vai nelikumīgi ievestas preces;',
            'bīstamas vielas un gāzes vai degvielas tvertnes, kas nav tukšas;',
            'dzīvniekus un augus;',
            'transportlīdzekļus un iekārtas, kuru iznomāšanai vajadzīga licence, reģistrācija vai apdrošināšana, ja jums tās nav;',
            'lietas, kas aizskar citu personu tiesības, un pieaugušajiem paredzētu saturu;',
            'pakalpojumus, darbu un visu, kas nav fiziska lieta.',
          ],
        },
        {
          p: 'Foto un aprakstam godīgi jāparāda īstā lieta. Publiski redzams tikai nodošanas vietas rajons; jūsu norādīto precīzo punktu izmanto attālumu aprēķinam, un tas nekad netiek publicēts.',
        },
        {
          p: 'Katru jaunu sludinājumu pirms publicēšanas pārbauda cilvēks. Mēs varam noraidīt, paslēpt vai noņemt sludinājumu, kas pārkāpj šos noteikumus vai likumu, un pasakām, kāpēc.',
        },
      ],
    },
    {
      id: 'deals',
      heading: '4. Kā notiek darījums',
      blocks: [
        {
          list: [
            'Nomnieks izvēlas veselas dienas un nosūta pieprasījumu. Īpašniekam ir 24 stundas, lai to apstiprinātu; pretējā gadījumā pieprasījums beidzas.',
            'Tad Yoyo sagatavo nomas līgumu ar pusēm, lietu, datumiem, cenu, depozītu un noteikumiem. Abas puses to paraksta pakalpojumā pirms jebkāda maksājuma.',
            'Puses satiekas klātienē, lai lietu nodotu un atdotu, un katra atzīmē šos soļus pakalpojumā. Yoyo lietas nepiegādā.',
            'Nomnieks lieto lietu rūpīgi, atbilstoši tās mērķim un īpašnieka noteikumiem, nenodod to tālāk un atdod laikā tādā stāvoklī, kādā saņēma, izņemot parasto nolietojumu.',
            'Īpašnieks nodod lietu, kā aprakstīts sludinājumā, darba kārtībā un drošā stāvoklī, ar visu, kas sludinājumā norādīts komplektā.',
          ],
        },
      ],
    },
    {
      id: 'money',
      heading: '5. Cenas, maksas un depozīts',
      blocks: [
        {
          p: 'Tiešsaistes maksājumi tiek ieviesti pakāpeniski. Kamēr tie nav pieejami jūsu darījumā, caur Yoyo nauda neplūst, un nekas pakalpojumā nav maksājums, ko jūs būtu parādā Yoyo. Kad tie būs pieejami, piemēro sekojošo:',
        },
        {
          list: [
            'Nomnieks maksā nomu par izvēlētajām dienām un servisa maksu 10% apmērā no nomas. Īpašnieks maksu nemaksā.',
            'Depozīts nomas laikā ir iesaldēts un netiek izmaksāts īpašniekam, kamēr noma turpinās.',
            'Nomas maksu īpašnieks saņem, kad abas puses apstiprina nodošanu; servisa maksa tajā pašā brīdī pāriet Yoyo.',
            'Atmaksas un izmaksas notiek tādā pašā veidā, kā nauda tika iemaksāta.',
            'Yoyo makā redzamais atlikums ir jūsu darījumu uzskaite pakalpojumā. Tā nav elektroniskā nauda vai noguldījumu konts, un par to netiek maksāti procenti.',
          ],
        },
        { p: 'Cenas ir eiro, un visas maksas ir redzamas pirms apstiprināšanas.' },
      ],
    },
    {
      id: 'deposit',
      heading: '6. Depozīta noteikums',
      blocks: [
        {
          list: [
            'Ja īpašnieks apstiprina, ka viss kārtībā, viss depozīts atgriežas pie nomnieka.',
            'Ja īpašnieks ziņo par bojājumu ar aprakstu un foto un nomnieks piekrīt, viss depozīts pāriet īpašniekam.',
            'Ja nomnieks nepiekrīt, strīdu izskata Yoyo. Mēs izskatām foto no nodošanas un atgriešanas, saraksti un darījuma vēsturi, izlemjam, vai depozīts pienākas nomniekam vai īpašniekam, un paskaidrojam lēmumu abām pusēm.',
            'Ja īpašnieks 48 stundu laikā pēc atgriešanas lietu nepārbauda, tā tiek uzskatīta par kārtībā esošu. Ja nomnieks 48 stundu laikā neatbild uz ziņojumu par bojājumu, strīdu izskata Yoyo.',
            'Ja lieta pēc pēdējās dienas netiek atdota, īpašnieks var atvērt strīdu.',
          ],
        },
        {
          p: 'Mūsu lēmums attiecas tikai uz depozītu. Tas neatņem nevienai pusei tiesības prasīt no otras papildu zaudējumus vai vērsties tiesā.',
        },
      ],
    },
    {
      id: 'cancel',
      heading: '7. Atcelšana',
      blocks: [
        {
          p: 'Jebkura puse var atcelt darījumu, kamēr lieta nav nodota. Ja darījums jau apmaksāts, nomnieks saņem atpakaļ nomas maksu, servisa maksu un depozītu. Atcelšanas ir redzamas profila statistikā. Pēc nodošanas darījumu atcelt nevar: lietu atdod, un darījums noslēdzas kā parasti.',
        },
      ],
    },
    {
      id: 'reviews',
      heading: '8. Atsauksmes',
      blocks: [
        {
          p: 'Pēc darījuma noslēgšanas abām pusēm ir 14 dienas, lai novērtētu viena otru ar 1–5 zvaigznēm un uzrakstītu īsu atsauksmi; nomnieks novērtē arī lietu. Atsauksmēm jābūt godīgām un par darījumu. Maksāt par atsauksmēm, rakstīt tās par sevi un izdarīt spiedienu atsauksmes dēļ ir aizliegts. Mēs varam dzēst atsauksmes, kas pārkāpj šos noteikumus vai likumu.',
        },
      ],
    },
    {
      id: 'conduct',
      heading: '9. Kā izturamies viens pret otru',
      blocks: [
        {
          list: [
            'Esiet godīgi un pieklājīgi. Nekādas aizskaršanas, naida runas vai draudu.',
            'Nepārnesiet darījumus vai maksājumus ārpus Yoyo, lai izvairītos no maksas vai depozīta noteikuma.',
            'Nekāda surogātpasta, krāpšanas, viltus kontu vai mēģinājumu pakalpojumu salauzt, pārslogot vai masveidā kopēt.',
            'Citu cilvēku datus izmantojiet tikai darījumam ar viņiem.',
          ],
        },
      ],
    },
    {
      id: 'moderation',
      heading: '10. Moderācija, bloķēšana un ziņojumi',
      blocks: [
        {
          p: 'Ja redzat kaut ko, kas pārkāpj šos noteikumus vai likumu, rakstiet uz [admin@yoyo.rent](mailto:admin@yoyo.rent). Mēs izskatām katru ziņojumu. Mēs varam paslēpt saturu vai ierobežot vai bloķēt kontu, ja tiek pārkāpti noteikumi vai likums, vai lai aizsargātu citus. Mēs paziņojam attiecīgajai personai, ko darījām un kāpēc, ja vien to neliedz likums vai kāda drošība, un viņa var mums atbildēt, ja uzskata, ka esam kļūdījušies.',
        },
      ],
    },
    {
      id: 'liability',
      heading: '11. Atbildība',
      blocks: [
        {
          p: 'Īpašnieki un nomnieki atbild par savām lietām, sludinājumiem un darījumiem. Yoyo lietas nepārbauda un negarantē to stāvokli, drošību vai likumību, kā arī to, ka darījums notiks.',
        },
        {
          p: 'Mēs strādājam, lai Yoyo būtu pieejams un drošs, bet nevaram apsolīt, ka tas vienmēr darbosies bez pārtraukumiem vai kļūdām.',
        },
        {
          p: 'Ciktāl to pieļauj likums, Yoyo neatbild par netiešiem zaudējumiem vai negūto peļņu, un mūsu kopējā atbildība pret jums nepārsniedz maksas, ko jūs samaksājāt Yoyo 12 mēnešos pirms prasības. Tas neierobežo atbildību par ļaunu nolūku vai rupju neuzmanību, par kaitējumu dzīvībai vai veselībai, kā arī patērētāja tiesības, kuras nevar ierobežot.',
        },
        { p: 'Yoyo nenodrošina lietu vai darījumu apdrošināšanu.' },
      ],
    },
    {
      id: 'content',
      heading: '12. Jūsu saturs',
      blocks: [
        {
          p: 'Tiesības uz jūsu augšupielādētajiem foto un tekstiem paliek jums. Jūs piešķirat Yoyo bezmaksas, neekskluzīvu licenci tos glabāt, rādīt un pielāgot (piemēram, mainīt foto izmēru), lai darbinātu un parādītu pakalpojumu, kamēr tie atrodas Yoyo. Augšupielādējiet tikai saturu, ko jums ir tiesības izmantot.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '13. Noteikumu izmaiņas',
      blocks: [
        {
          p: 'Mēs varam mainīt šos noteikumus, piemēram, kad parādās jaunas iespējas. Par izmaiņām paziņojam šajā lapā vismaz 14 dienas pirms to stāšanās spēkā un pa e-pastu, ja tās skar jūs. Ja nepiekrītat, varat izdzēst savu kontu, pirms izmaiņas stājas spēkā.',
        },
      ],
    },
    {
      id: 'law',
      heading: '14. Piemērojamās tiesības un strīdi',
      blocks: [
        {
          p: 'Šiem noteikumiem piemēro Latvijas Republikas tiesības. Lūdzu, vispirms rakstiet mums: lielāko daļu problēmu var atrisināt ātri. Strīdus izšķir Latvijas tiesas.',
        },
        {
          p: 'Ja esat patērētājs, nekas šajos noteikumos neatņem tiesības, ko jums dod obligātās tiesību normas, tostarp jūsu dzīvesvietas valsts tiesības. Jūs varat vērsties arī Patērētāju tiesību aizsardzības centrā (PTAC, [www.ptac.gov.lv](https://www.ptac.gov.lv)).',
        },
      ],
    },
    {
      id: 'contact',
      heading: '15. Kontakti',
      blocks: [{ p: 'Jautājumi par šiem noteikumiem: [admin@yoyo.rent](mailto:admin@yoyo.rent).' }],
    },
  ],
};

const ru: LegalDoc = {
  title: 'Условия использования',
  summary: [
    'Yoyo сводит людей, которые сдают вещи друг другу. Сама аренда — это договорённость между арендатором и владельцем.',
    'Выставляйте только свои вещи (или те, что вы вправе сдавать), безопасные и законные, и описывайте их честно.',
    'Договор подписывается до любой оплаты, у залога одно правило, а споры решает наша команда.',
    'Онлайн-оплата появится позже. До тех пор деньги через Yoyo не проходят.',
    'Действует право Латвии. С любым вопросом пишите на admin@yoyo.rent.',
  ],
  sections: [
    {
      id: 'about',
      heading: '1. О Yoyo и этих условиях',
      blocks: [
        {
          p: 'Yoyo (yoyo.rent) — онлайн-площадка, где люди сдают вещи друг другу в аренду. Её ведёт {operator}, далее — «Yoyo» или «мы».',
        },
        {
          p: 'Эти условия действуют для всех, кто пользуется Yoyo. Создавая аккаунт, вы их принимаете. Если вы с ними не согласны, пожалуйста, не пользуйтесь сервисом.',
        },
        {
          p: 'Yoyo — посредник. Договор аренды вещи заключают арендатор и владелец; Yoyo не является его стороной, вещи ему не принадлежат, и сам он их не сдаёт.',
        },
      ],
    },
    {
      id: 'account',
      heading: '2. Ваш аккаунт',
      blocks: [
        {
          list: [
            'Вам должно быть не меньше 18 лет, и вы должны быть вправе заключать договоры.',
            'Указывайте своё настоящее имя и почту, которую вы читаете. Один человек — один аккаунт.',
            'Никому не сообщайте пароль. Вы отвечаете за то, что происходит в вашем аккаунте; сразу сообщите нам, если думаете, что к нему получил доступ кто-то другой.',
            'Удалить аккаунт можно в любой момент в разделе Настройки → Безопасность. Что происходит с вашими данными, объясняет [политика конфиденциальности](/privacy).',
          ],
        },
      ],
    },
    {
      id: 'listings',
      heading: '3. Объявления',
      blocks: [
        {
          p: 'Выставлять можно только вещи, которые принадлежат вам или которые вы вправе сдавать, которые находятся в описанном состоянии и которыми безопасно и законно пользоваться.',
        },
        { p: 'Нельзя выставлять:' },
        {
          list: [
            'оружие, боеприпасы, взрывчатку и их части;',
            'наркотики, лекарства и всё, продажа или прокат чего ограничены законом;',
            'краденые, поддельные или незаконно ввезённые вещи;',
            'опасные вещества, а также непустые баллоны с газом или топливом;',
            'животных и растения;',
            'транспорт и технику, для сдачи которых нужны лицензия, регистрация или страховка, если их у вас нет;',
            'вещи, нарушающие чужие права, и материалы для взрослых;',
            'услуги, работу и всё, что не является физической вещью.',
          ],
        },
        {
          p: 'Фото и описание должны честно показывать саму вещь. Публично виден только район места передачи; точку, которую вы указали, мы используем для расчёта расстояния и никогда не публикуем.',
        },
        {
          p: 'Каждое новое объявление перед публикацией проверяет человек. Мы можем отклонить, скрыть или снять объявление, нарушающее эти условия или закон, и объясняем причину.',
        },
      ],
    },
    {
      id: 'deals',
      heading: '4. Как проходит сделка',
      blocks: [
        {
          list: [
            'Арендатор выбирает целые дни и отправляет запрос. У владельца есть 24 часа, чтобы его принять; иначе запрос истекает.',
            'Затем Yoyo готовит договор аренды: стороны, вещь, даты, цена, залог и правила. Обе стороны подписывают его в сервисе до любой оплаты.',
            'Стороны встречаются лично, чтобы передать и вернуть вещь, и каждая отмечает эти шаги в сервисе. Yoyo не доставляет вещи.',
            'Арендатор пользуется вещью бережно, по назначению и по правилам владельца, не передаёт её третьим лицам и возвращает вовремя в том состоянии, в котором получил, с учётом обычного износа.',
            'Владелец передаёт вещь такой, как описано в объявлении, исправной и безопасной, со всем, что указано в комплекте.',
          ],
        },
      ],
    },
    {
      id: 'money',
      heading: '5. Цены, сборы и залог',
      blocks: [
        {
          p: 'Онлайн-оплата вводится постепенно. Пока она недоступна в вашей сделке, деньги через Yoyo не проходят, и ничто в сервисе не является вашим долгом перед Yoyo. Когда она станет доступна, действует следующее:',
        },
        {
          list: [
            'Арендатор платит за аренду выбранных дней и сервисный сбор 10% от суммы аренды. Владелец сбор не платит.',
            'На время аренды залог замораживается и не выплачивается владельцу, пока аренда идёт.',
            'Плата за аренду переходит владельцу, когда обе стороны подтвердили передачу; сервисный сбор в тот же момент переходит Yoyo.',
            'Возвраты и выплаты идут тем же способом, которым деньги поступили.',
            'Баланс в кошельке Yoyo — это учёт ваших сделок внутри сервиса. Это не электронные деньги и не депозитный счёт, проценты на него не начисляются.',
          ],
        },
        { p: 'Цены указаны в евро, все сборы видны до подтверждения.' },
      ],
    },
    {
      id: 'deposit',
      heading: '6. Правило залога',
      blocks: [
        {
          list: [
            'Если владелец подтверждает, что всё в порядке, залог целиком возвращается арендатору.',
            'Если владелец сообщает о повреждении с описанием и фото и арендатор согласен, залог целиком переходит владельцу.',
            'Если арендатор не согласен, спор переходит к Yoyo. Мы изучаем фото при передаче и возврате, переписку и историю сделки, решаем, кому достаётся залог — арендатору или владельцу, и объясняем решение обеим сторонам.',
            'Если владелец не проверил вещь в течение 48 часов после возврата, она считается целой. Если арендатор не ответил на сообщение о повреждении в течение 48 часов, спор переходит к Yoyo.',
            'Если вещь не вернули после последнего дня, владелец может открыть спор.',
          ],
        },
        {
          p: 'Наше решение касается только залога. Оно не лишает ни одну из сторон права требовать от другой возмещения дополнительного ущерба или обратиться в суд.',
        },
      ],
    },
    {
      id: 'cancel',
      heading: '7. Отмена',
      blocks: [
        {
          p: 'Любая сторона может отменить сделку, пока вещь не передана. Если сделка уже оплачена, арендатору возвращаются плата за аренду, сервисный сбор и залог. Отмены видны в статистике профиля. После передачи сделку отменить нельзя: вещь возвращают, и сделка закрывается как обычно.',
        },
      ],
    },
    {
      id: 'reviews',
      heading: '8. Отзывы',
      blocks: [
        {
          p: 'После закрытия сделки у обеих сторон есть 14 дней, чтобы оценить друг друга от 1 до 5 звёзд и написать короткий отзыв; арендатор также оценивает вещь. Отзывы должны быть честными и касаться сделки. Нельзя платить за отзывы, писать их самому себе и давить на кого-либо из-за отзыва. Мы можем удалять отзывы, нарушающие эти правила или закон.',
        },
      ],
    },
    {
      id: 'conduct',
      heading: '9. Как мы относимся друг к другу',
      blocks: [
        {
          list: [
            'Будьте честны и вежливы. Никаких оскорблений, языка вражды и угроз.',
            'Не переносите сделки и оплату за пределы Yoyo, чтобы обойти сбор или правило залога.',
            'Никакого спама, мошенничества, фальшивых аккаунтов и попыток сломать, перегрузить или массово скопировать сервис.',
            'Используйте данные других людей только для сделки с ними.',
          ],
        },
      ],
    },
    {
      id: 'moderation',
      heading: '10. Модерация, блокировка и жалобы',
      blocks: [
        {
          p: 'Если вы видите что-то, что нарушает эти условия или закон, напишите на [admin@yoyo.rent](mailto:admin@yoyo.rent). Мы рассматриваем каждую жалобу. Мы можем скрыть материал, ограничить или заблокировать аккаунт, если нарушены условия или закон, либо чтобы защитить других людей. Мы сообщаем человеку, что сделали и почему, если этого не запрещают закон или чья-то безопасность, и он может ответить нам, если считает, что мы ошиблись.',
        },
      ],
    },
    {
      id: 'liability',
      heading: '11. Ответственность',
      blocks: [
        {
          p: 'Владельцы и арендаторы отвечают за свои вещи, объявления и сделки. Yoyo не осматривает вещи и не гарантирует их состояние, безопасность или законность, а также то, что сделка состоится.',
        },
        {
          p: 'Мы стараемся, чтобы Yoyo был доступен и безопасен, но не можем обещать, что он всегда будет работать без перерывов и ошибок.',
        },
        {
          p: 'В той мере, в какой это допускает закон, Yoyo не отвечает за косвенный ущерб и упущенную выгоду, а наша общая ответственность перед вами ограничена сборами, которые вы заплатили Yoyo за 12 месяцев до претензии. Это не ограничивает ответственность за умысел или грубую неосторожность, за вред жизни или здоровью, а также права потребителя, которые нельзя ограничить.',
        },
        { p: 'Yoyo не страхует вещи и сделки.' },
      ],
    },
    {
      id: 'content',
      heading: '12. Ваши материалы',
      blocks: [
        {
          p: 'Права на загруженные вами фото и тексты остаются за вами. Вы даёте Yoyo бесплатную неисключительную лицензию хранить, показывать и адаптировать их (например, менять размер фото), чтобы сервис работал и выглядел как надо, пока они находятся на Yoyo. Загружайте только то, что вы вправе использовать.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '13. Изменение условий',
      blocks: [
        {
          p: 'Мы можем менять эти условия, например, когда появляются новые функции. Мы сообщаем об изменениях на этой странице не позднее чем за 14 дней до их вступления в силу, а если они касаются вас, — и письмом. Если вы не согласны, вы можете удалить аккаунт до того, как изменения вступят в силу.',
        },
      ],
    },
    {
      id: 'law',
      heading: '14. Право и споры',
      blocks: [
        {
          p: 'К этим условиям применяется право Латвийской Республики. Пожалуйста, сначала напишите нам: большинство проблем решается быстро. Споры рассматривают суды Латвии.',
        },
        {
          p: 'Если вы потребитель, ничто в этих условиях не отменяет прав, которые дают вам императивные нормы закона, в том числе страны, где вы живёте. Вы также можете обратиться в Центр защиты прав потребителей Латвии (PTAC, [www.ptac.gov.lv](https://www.ptac.gov.lv)).',
        },
      ],
    },
    {
      id: 'contact',
      heading: '15. Контакты',
      blocks: [{ p: 'Вопросы об этих условиях: [admin@yoyo.rent](mailto:admin@yoyo.rent).' }],
    },
  ],
};

export const TERMS: LegalTexts = { en, lv, ru };
