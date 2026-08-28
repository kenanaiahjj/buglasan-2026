# Voting API contract

What a backend must answer for Buglasan Festival 2026 to stop simulating and
start counting. The client that calls it is `src/lib/votingApi.ts`; the types
there are the source of truth and this file is the prose version.

**Turning it on is one variable.**

```
VITE_VOTING_API_URL=https://api.buglasan.example/v1
```

Unset, the app runs `createDemoVotingApi()` — orders settle instantly in
memory, nothing is charged, the standings board runs its simulation. Set, both
the vote flow and the standings board read the server and nothing else in the
front end changes.

For a deployment with one canonical hosted-checkout return route, set this
optional value too:

```
VITE_VOTING_RETURN_URL=https://vote.buglasan.example/payment-return
```

If it is unset, the client sends the page where the supporter started as the
return hint. The backend must allowlist the value before passing it to a
payment provider. Never use an arbitrary client-supplied URL for redirects.

---

## Two rules that outrank the shapes

**Money is centavos, integers only.** ₱20.00 is `2000`. A float total is a
total two systems will eventually disagree about, and the one that loses is
the one holding the money. The prototype accepts any positive whole-number
quantity and prices it at ₱1.00 per vote, so `quantity * 100` is the amount in
centavos. The backend must calculate that amount from its own copy of the
unit price.

**Every order carries an idempotency key.** `POST /vote-orders` sends it in the
body and in an `Idempotency-Key` header. A retried request after a timeout, a
double-tapped button, a gateway replay — all of them must settle to one charge
and one set of votes. The client derives the key from the order itself, not
per attempt, so the same order retried is byte-identical.

**The tally is yours, not ours.** Nothing in the front end can add to a public
count. `GET /tally` reads; votes are written only by whatever you trust to
confirm a payment, which is the gateway webhook and not this app.

---

## `POST /vote-orders`

Open an order and price it.

```jsonc
// Request. Header: Idempotency-Key: BF26-HA-0DURU50
{
  "arenaId": "hara",              // hara | booths | festival | gandang
  "entryId": "c-03",
  "quantity": 55,
  "mobile": "9171234567",         // 10 digits, no leading 0, no +63
  "origin": "Bais City",          // a Negros Oriental LGU, or the agreed
                                  // out-of-province label
  "method": "gcash",              // gcash | maya | card
  "expectedAmountCentavos": 5500,
  "idempotencyKey": "BF26-HA-0DURU50",
  "returnUrl": "https://vote.buglasan.example/payment-return"
}
```

`returnUrl` is optional and is a navigation hint only. The backend can ignore
it and use its configured route. If the backend accepts it, it must validate
the origin and route against an allowlist before giving it to the provider.

```jsonc
// 201. Hosted checkout — the normal path.
{
  "reference": "BF26-HA-0DURU50",
  "status": "pending",
  "arenaId": "hara",
  "entryId": "c-03",
  "quantity": 55,
  "amountCentavos": 5500,
  "checkoutUrl": "https://pay.example/checkout/...",
  "pollAfterMs": 3000
}
```

A `pending` order with a `checkoutUrl` sends the supporter to the provider.
A `confirmed` order (no checkout needed, or the key was already settled)
finishes in the dialog.

After checkout, the provider or backend can redirect to the approved return
route with the order `reference`. The front end must call
`GET /vote-orders/{reference}` and use that response to decide whether to
show confirmation. A return redirect, query parameter, or provider callback
is never evidence that payment succeeded.

**Price the order yourself.** `expectedAmountCentavos` is what the client
computed, sent so a mismatch is caught — never so it can be trusted. Calculate
the charge as `quantity * 100` and reject a disagreement with `409` and
`code: "price_mismatch"`. A client that sets the price is a client that sets
it to zero.

**Never accept card details.** The dialog collects a mobile number and a town,
and nothing else. Card data belongs on the acquirer's hosted page, which is
what `checkoutUrl` is for.

## `GET /vote-orders/{reference}`

The same object. Poll it while `status` is `pending`, honouring `pollAfterMs`.
Terminal states are `confirmed`, `failed` and `expired`.

The backend must make this read idempotent and safe to repeat. The provider's
webhook is the source of truth that moves an order to `confirmed`; it must
verify the provider signature, match the provider transaction to the order,
and apply the idempotency key before writing votes.

## `GET /arenas/{arenaId}/tally`

What the standings board reads.

```jsonc
{
  "arenaId": "hara",
  "tallies": { "c-01": 1245, "c-02": 1980 },  // entryId → votes; absent is 0
  "updatedAt": 1791830400000,                 // server epoch ms
  "votesPerMinute": 240                       // optional
}
```

The board polls this every 5s. Implement `openTallyStream` in the client
against an SSE or socket endpoint and the polling stops on its own —
`createApiVotingSource` prefers a stream whenever the client offers one, so
you can ship REST first and add the stream later without touching the UI.

A failed read is swallowed by design: the wall board keeps its last good
numbers rather than blanking because one poll timed out.

---

## Errors

Non-2xx with a JSON body:

```jsonc
{ "code": "voting_closed", "message": "Voting closed on 24 October." }
```

`message` is shown to the supporter, so write it for one. Recognised codes:
`price_mismatch`, `voting_closed`, `rate_limited`, `invalid`, `unauthorized`.
Anything else is mapped from the status: 401/403 → unauthorized, 409/422 →
invalid, 429 → rate_limited, 5xx → server.

`network`, `timeout`, `server` and `rate_limited` are treated as retryable and
the dialog offers the button again. The rest are terminal and say so.

---

## What is still the front end's job

- **Nothing writes to the tally.** The reducer's local `castArenaVote` fires
  only on a `confirmed` order, and only so the board moves before the next
  poll lands. It is a local echo, not a source of truth.
- **The confirmed quantity** goes into that local echo before the next poll.
  The server remains the source of truth for the public tally.
- **`votingDeadlineISO` in `src/data/pageant.ts`** drives the countdown and
  the board's closed state. Keep it in step with whatever the server enforces,
  or the wall will promise a window the API rejects.

### Numbers the server should own, and where they are faked today

Everything below renders a hardcoded value. In demo mode they agree with each
other; the moment a server answers, each one is a place the UI can start
lying. Listed in the order they will embarrass you.

| Where | What it shows now | What it should read |
| --- | --- | --- |
| `pageant.ts` → every entry's `votes:` | The seed for `arenaTallies` | Nothing. `GET /tally` replaces it; the seed only exists so the prototype is not all zeroes. |
| `DashboardPage` "Total votes" | `pageantContent.totalVotes` (12,846, hardcoded) | Sum of the live tallies across the four programmes. |
| `CountdownCard` on the dashboard | `pageantContent.countdown` (frozen `06d 12h 45m`) | `countdownFrom(Date.parse(votingDeadlineISO), Date.now())` — the standings board already does exactly this. |

The programme galleries and the standings board already read live counts, so
they need no change.

### Every stub, and where it is swapped

Two of these are load-bearing until a backend exists. Both are behind the same
switch, and neither can be reached from anywhere except `resolveVotingApi()`
and `createVotingOverviewSource()`.

| Stub | What it fakes | Swapped by |
| --- | --- | --- |
| `createDemoVotingApi` | Settles every order instantly, in memory. Charges nothing. | `VITE_VOTING_API_URL` → `createHttpVotingApi` |
| `createSimulatedVotingSource` | Invents turnout for the wall board. | the same variable → `createApiVotingSource` |

`resolveVotingApi()` logs a `console.error` when it falls back to the demo
client on any hostname that is not localhost, because an unset environment
variable is a quiet way to take real votes into memory and lose them. The wall
board's eyebrow reads **"Live simulation"** rather than "Live results" for the
same reason: if that label is wrong on an event screen, the variable is missing.

There is exactly one way to cast a vote — `VoteFlowModal`, through
`resolveVotingApi()`. The full-page ballot that used to live at
`#vote-<arena>` cast straight into the reducer with no payment and no API
call; the route and the component have been deleted rather than left as a
second path. So has the unreachable tabbed layout that sat behind a hardcoded
`useGallery = true` inside `ContestSubpageView`.

### Still separate on purpose

`VotePanel` on the dashboard is a different mechanism: one free vote a day,
driving `selectedCandidateId` / `voteConfirmed` / `votesRemaining` rather than
`arenaVotes` / `arenaTallies`. It is not part of the paid flow and does not
call the API. If the festival only ever sells votes, that panel and its
reducer branch are the next things to remove.
