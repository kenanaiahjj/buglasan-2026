# Integrating the backend

Everything the app fetches or submits goes through one of **two seams**. Neither
needs a rewrite to go live — both already have an HTTP client, and both fall
back to bundled demo data when no URL is configured. That is how the prototype
runs today.

| seam | file | owns |
| --- | --- | --- |
| `VotingApi` | `src/lib/votingApi.ts` | orders, payment, tallies (the write side) |
| `ContentApi` | `src/lib/contentApi.ts` | programmes, rosters, prices, dates (the read side) |

## Switching it on

| variable | effect |
| --- | --- |
| `VITE_VOTING_API_URL` | Set → real orders and tallies. Unset → in-memory demo, and the standings board runs a simulation. |
| `VITE_CONTENT_API_URL` | Set → rosters from the server. Unset → falls back to `VITE_VOTING_API_URL`, then to bundled data. |
| `VITE_VOTING_RETURN_URL` | Canonical route to return to after hosted checkout. Unset → the page the supporter started on. |

Read them only through `src/lib/votingConfig.ts`. They were being consulted from
several call sites, which is how a deployment ends up with the ballot talking to
a server while the standings board is still simulating.

One backend can serve both seams — that is the common case, and why the content
URL falls back to the voting one.

## Endpoints

### Content — `GET`, no auth assumed

| route | returns |
| --- | --- |
| `/arenas` | `ContestArena[]` |
| `/arenas/:arenaId/entries` | `VoteEntry[]` |
| `/vote-bundles` | `VoteBundle[]` |
| `/festival` | `FestivalSummary` |

### Voting

| route | notes |
| --- | --- |
| `POST /vote-orders` | Body `VoteOrderRequest`. Also sends `Idempotency-Key` as a header, for gateways that dedupe before the app sees it. |
| `GET /vote-orders/:reference` | Poll while `status === 'pending'`. |
| `GET /arenas/:arenaId/tally` | `TallySnapshot`. |

Responses are the types below as JSON, **unwrapped** — no `{ data: … }` envelope.

An optional `openTallyStream` exists on `VotingApi`. Implement it with SSE or a
socket and the overview board stops polling; leave it off and the board falls
back to `getTally`.

## Models

```ts
type ContestArena = {
  id: 'hara' | 'booths' | 'festival' | 'gandang';
  title: string; shortTitle: string; subtitle: string; tagline: string;
  icon: string; badge: string; logo?: string;
  venue: string; dateRange: string;
  totalEntries: number; votesOpen: boolean; accentColor: string;
  description: string;
  criteria: Array<{ name: string; percentage: number; description: string }>;
};

// One candidate, booth, or contingent. The four arenas differ only in `meta`.
type VoteEntry = {
  id: string;
  number: string;          // sash number, zero-padded: '01'
  name: string;            // full name, given names + surname
  origin: string;          // the town
  blurb: string;
  image: string | null;
  fallbackImage?: string;
  votes: number;
  meta: Array<{ label: string; value: string }>;
};

type VoteBundle = { id: string; priceCentavos: number; votes: number };

type FestivalSummary = {
  title: string;
  votingDeadline: string;   // display text
  votingClosesAt?: string;  // ISO 8601 — the one to compare against
};

type VoteOrderRequest = {
  arenaId; entryId; quantity;          // quantity = total votes across bundles
  mobile;                              // 10 digits, no leading 0, no +63
  origin; method: 'gcash' | 'maya' | 'card';
  expectedAmountCentavos;              // cross-check only, never trusted
  bundles?: Array<{ bundleId: string; count: number }>;
  idempotencyKey: string;
  returnUrl?: string;
};

type VoteOrder = {
  reference; status: 'pending' | 'confirmed' | 'failed' | 'expired';
  arenaId; entryId; quantity; amountCentavos;
  checkoutUrl?: string;                // hosted checkout, always
  pollAfterMs?: number;
};

type TallySnapshot = {
  arenaId;
  tallies: Record<string, number>;     // entryId → votes; absent means zero
  updatedAt: number;                   // epoch ms, server time
  votesPerMinute?: number;
};
```

### Errors

Throw/return `VotingApiError` with one of:

`network` · `timeout` · `unauthorized` · `rate_limited` · `price_mismatch` ·
`voting_closed` · `invalid` · `server` · `unknown`

`retryable` is derived: `network`, `timeout`, `server`, `rate_limited`. The
content client raises the same type, so callers catch one thing.

## Money and trust

- **Centavos, integers, everywhere.** Money in floating point is how a tally
  goes wrong.
- **The server prices the order.** `expectedAmountCentavos` and `bundles` are
  sent so a disagreement can be *detected* and reported as `price_mismatch` —
  never so the client can set a price. A client that sets the price is a client
  that sets it to zero.
- **`returnUrl` is a navigation hint, not proof of payment.** Allowlist it
  server-side before handing it to a provider; an arbitrary client-supplied
  redirect is an open door.
- **`idempotencyKey` is stable across retries** of the same order, derived from
  the draft. Retrying must not charge twice.
- **Card details never touch this app.** Hosted checkout only.

## Placeholder data that must be replaced

| what | where | note |
| --- | --- | --- |
| Candidate surnames | `src/data/pageant.ts` | **All 32 invented.** Flagged in caps on the `Candidate` type. |
| Vote bundle ladder | `src/lib/voteBundles.ts` | Invented price list — ₱10/10 votes up to ₱1,000/1,300. |
| Rosters, tallies, dates | `src/data/pageant.ts` | Demo data; the same six people appear in two arenas on reused portraits. |
| Programme logos | `public/assets/program-logos` | Some marked "temporary supplied stand-in" on the arena. |

## Notes for whoever picks this up

- `entriesForArena()` in `src/lib/arenaEntries.ts` is what normalises the four
  arenas' different source shapes into `VoteEntry`. When the server returns
  `VoteEntry` directly, that function becomes the demo path only.
- Components still import `src/data/pageant.ts` directly in places. Those are
  the remaining call sites to move behind `ContentApi` — the seam exists and is
  tested, but the migration is not finished.
- `src/lib/stageBudget.ts` decides whether a device gets the 8.1MB WebGL stage.
  Worth knowing before debugging "why is there no 3D on my phone".
