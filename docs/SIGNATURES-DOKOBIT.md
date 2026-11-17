# Contract signatures: typed name today, Dokobit when switched on

Audit 2026-11-16, item C1 / M5. Owner decision: the signing provider is built and stays off until there is
a contract with the provider.

## Today (`SIGNATURES=typed`, the default)

Each side types their full name and ticks the consent. Yoyo records who, when, the typed name, the IP, the
browser and the SHA-256 of the exact terms (`ContractSignature`, method `SIMULATED`). Under eIDAS this is a
**simple electronic signature** (Art. 25): valid as evidence, weaker than an advanced or qualified one.
Identity is backed by the admin identity check (`IDENTITY_REQUIRED`).

## With Dokobit (`SIGNATURES=dokobit`)

Smart-ID, Mobile-ID and eParaksts through Dokobit Documents Gateway: an advanced or qualified signature on
the contract PDF itself.

1. The person presses **Sign**. The site calls `POST /api/v1/bookings/:id/signing`; the API renders the
   contract PDF in their language, uploads it (`/api/file/upload.json`, SHA-256 digest), waits for
   `uploaded`, creates a `pdf` signing for that one person (`/api/signing/create.json`, with
   `postback_url`) and stores a `SigningSession` with the terms' hash.
2. The site shows Dokobit's page in the dialog and asks `GET /api/v1/bookings/:id/signing` every 3 s.
3. Dokobit posts `signer_signed` / `signing_completed` to `/api/v1/signatures/dokobit/postback`.
   **The postback is only a hint**: it is not signed, so the API asks Dokobit's
   `/api/signing/:token/status.json` with its own access token. Only when Dokobit says this signer signed,
   and the contract's terms are still the ones the signing started with, the deal takes the `SIGN` step
   for that person (method `DOKOBIT:<smartid|mobile|…>`). The session is claimed first, so the postback
   and the page's check never record it twice.
4. While Dokobit is on, a typed-name `SIGN` is refused (409 `ACTION_NOT_ALLOWED`, `why: SIGN_WITH_PROVIDER`).

Tested end to end against a local fake Dokobit (`apps/api/test/signing-dokobit.e2e.test.ts`).

## Switching on (owner)

1. A Dokobit (Signicat) contract for Documents Gateway; get the sandbox access token first.
2. API (Render) environment: `SIGNATURES=dokobit`, `DOKOBIT_ACCESS_TOKEN=…`,
   `DOKOBIT_API_URL=https://gateway-sandbox.dokobit.com` (later `https://gateway.dokobit.com`),
   `API_PUBLIC_URL=https://<the API's public address>`.
3. Site (Vercel): `NEXT_PUBLIC_SIGNATURES=dokobit`.
4. **Before production, check against the sandbox:** the exact shape of
   `GET /api/signing/:token/status.json` is not in Dokobit's public docs. The adapter accepts `signers` as
   a map or a list, per-signer `status` `signed`/`completed`, and `signing_status`; adjust
   `DokobitSignatureProvider.state` if the sandbox answers differently. Also allow Dokobit's domain in the
   site's CSP `frame-src` if a CSP is added.
5. Keep the signed PDF: Dokobit stores files for 30 days. Downloading the signed file into Yoyo's storage
   on `signing_completed` is the next step if long-term archiving with the provider's signature is needed.
