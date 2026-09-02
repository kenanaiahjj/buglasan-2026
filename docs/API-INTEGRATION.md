# Integrating the backend

Everything the app fetches or submits goes through one of **two seams**. Neither
needs a rewrite to go live — both already have an HTTP client, and both fall
back to bundled demo data when no URL is configured. That is how the prototype
runs today.

| seam | file | owns |
| --- | --- | --- |
| `VotingApi` | `src/lib/votingApi.ts` | orders, payment, tallies (the write side) |
| `ContentApi` | `src/lib/contentApi.ts` | programmes, rosters, prices, dates (the read side) |

Between `ContentApi` and the screens sits **`src/lib/contentStore.ts`**. The
seam is the interface; the store is the thing that calls it, holds the answer
and hands it to components through `useContent()`. It matters because for one
commit the seam existed and nothing used it — every screen still read
`src/data/pageant.ts` at module scope, so the content URL could point at a
working server and the page would not change. `src/components/contentWiring.test.tsx`
exists to stop that happening again.

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

## Reading content in a component

```tsx
const { arenas, festival, bundles, status, live, error } = useContent();
const roster = useArenaEntries('hara');
```

Four things worth knowing before you rely on it:

- **It is never empty.** The store is seeded synchronously from the bundled
  data, so there is no loading state to design around and no null to guard.
  `App.tsx` fires one `loadContent()` on mount and the server's answer replaces
  the seed.
- **A failed load keeps the bundled roster on screen** and sets `status:
  'error'` with `live: false`. That is deliberate — a festival site showing a
  stale roster beats one showing nothing on voting night — but it means a
  *silent* failure looks exactly like demo mode. Nothing renders a banner for
  it today. **A production deployment should**, off `error` and `live`.
- **`entriesFor(arenaId)` falls back per arena**, so a server that omits one
  programme costs that programme its live roster rather than blanking it.
- **Prices must travel with the cart.** Every function in `voteBundles.ts` and
  the cart helpers in `voteFlow.ts` take an optional catalogue that defaults to
  the bundled ladder. Pass `useContent().bundles`. A total computed against the
  local constant is a total the server rejects as `price_mismatch`.

## Endpoints

### Content — `GET`, no auth assumed

| route | returns |
| --- | --- |
| `/arenas` | `ContestArena[]` |
| `/arenas/:arenaId/entries` | `VoteEntry[]` |
| `/vote-bundles` | `VoteBundle[]` |
| `/festival` | `FestivalSummary` |

`/arenas` is fetched first and its ids decide which `/entries` calls go out, so
it is one round trip then three in parallel. An arena the list omits is never
asked for.

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
  votingClosesAt?: string;  // ISO 8601 — the one the countdowns compare against
  votingWindow?: string;    // display text for the open period
  totalVotes?: number;      // festival-wide headline; omit and the UI shows —
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
| `pageantContent.totalVotes` | `src/data/pageant.ts` | Hardcoded 12,846. Should be a sum of live tallies. |
| Vote bundle ladder | `src/lib/voteBundles.ts` | Invented price list — ₱10/10 votes up to ₱1,000/1,300. |
| Rosters, tallies, dates | `src/data/pageant.ts` | Demo data; the same six people appear in two arenas on reused portraits. |
| Programme logos | `public/assets/program-logos` | Some marked "temporary supplied stand-in" on the arena. |

## Notes for whoever picks this up

- `entriesForArena()` in `src/lib/arenaEntries.ts` is what normalises the four
  arenas' different source shapes into `VoteEntry`. When the server returns
  `VoteEntry` directly, that function becomes the demo path only.
- **What is still not behind the seam**, and why:
  - `announcements` and the legacy `candidates` list, both read by
    `DashboardPage.tsx`. Neither has an endpoint; `candidates` is the pre-arena
    roster that only that screen still uses.
  - `BUGLASAN_HERO_LOGO` and the arena `logo` paths preloaded by
    `siteBoot.ts` — build assets resolved before a fetch could answer.
  - `NEGROS_ORIENTAL_LGUS`, the origin dropdown. A fixed list of the province's
    25 LGUs, not festival data.
  - Type-only imports of `ContestArena` etc. are the contract and stay.
- `pageantContent` still holds presentational copy the seam does not carry —
  hero lines, the edition name, hashtags. Only fields a server would own were
  lifted into `FestivalSummary`.
- `src/lib/stageBudget.ts` decides whether a device gets the 8.1MB WebGL stage.
  Worth knowing before debugging "why is there no 3D on my phone".
