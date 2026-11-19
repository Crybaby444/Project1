# What the owner will do later

Owner, 2026-11-19: nothing paid is confirmed for now; keep these as a list. Each item says what it
unlocks and where the switch is. The code for all of them is ready and off.

## Free, done

- [x] Nightly database backup: `BACKUP_DATABASE_URL` and `BACKUP_PASSPHRASE` set in GitHub
  (2026-11-19). The first run was decrypted and checked. The passphrase is in `.env.deploy`; keep a copy
  in a password manager.
- [x] Example listings for Latvia added (Admin → System → Example listings).

## Paid, or needs a company: later

| # | What | Why it matters | Cost / condition | Where the switch is |
|---|---|---|---|---|
| 1 | Paid email plan | Today about 90 emails a day: sign-ups, password resets and deal notices stop beyond that | Paid plan of the email provider | Provider dashboard; nothing changes in code |
| 2 | Render Starter | The free API sleeps: the first request after a pause takes about a minute, and deal timers can run late | about $7 a month | Render → yoyo-api → plan |
| 3 | Stripe (real card payments) | Today payments are simulated ("test mode") | Company or sole trader; Stripe fees per payment | `docs/PAYMENTS-STRIPE.md` |
| 4 | Legal check of the wallet | A balance kept on Yoyo may count as e-money (needs a licence); with Stripe Connect it becomes owner earnings held by Stripe | Lawyer | Before item 3 |
| 5 | Dokobit e-signatures (Smart-ID, Mobile-ID, eParaksts) | Advanced signatures instead of the typed name (a simple e-signature is already legally valid) | The token form asks for a company; production needs a contract and Dokobit's integration review (checked 2026-11-19) | `docs/SIGNATURES-DOKOBIT.md` |
| 6 | Company details | The contract, terms and footer name the operator | Registering a company | Legal pages and the contract texts |
| 7 | Insurance against damage | Deposits cover small damage; expensive items need more | Insurer | Terms and the item page |

When an item is done, tick it here and tell Claude "done"; the matching switch is a few
environment variables, described in the linked document.
