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

---

## Two rules that outrank the shapes

**Money is centavos, integers only.** ₱20.00 is `2000`. A float total is a
total two systems will eventually disagree about, and the one that loses is
the one holding the money.

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
  "quantity": 25,
  "mobile": "9171234567",         // 10 digits, no leading 0, no +63
  "origin": "Bais City",          // a Negros Oriental LGU, or the agreed
                                  // out-of-province label
  "method": "gcash",              // gcash | maya | card
  "expectedAmountCentavos": 50000,
  "idempotencyKey": "BF26-HA-0DURU50"
}
```

```jsonc
// 201. Hosted checkout — the normal path.
{
  "reference": "BF26-HA-0DURU50",
  "status": "pending",
  "arenaId": "hara",
  "entryId": "c-03",
  "quantity": 25,
  "amountCentavos": 50000,
  "checkoutUrl": "https://pay.example/checkout/...",
  "pollAfterMs": 3000
}
```

A `pending` order with a `checkoutUrl` sends the supporter to the provider.
A `confirmed` order (no checkout needed, or the key was already settled)
finishes in the dialog.

**Price the order yourself.** `expectedAmountCentavos` is what the client
computed, sent so a mismatch is caught — never so it can be trusted. Reject a
disagreement with `409` and `code: "price_mismatch"`. A client that sets the
price is a client that sets it to zero.

**Never accept card details.** The dialog collects a mobile number and a town,
and nothing else. Card data belongs on the acquirer's hosted page, which is
what `checkoutUrl` is for.

## `GET /vote-orders/{reference}`

The same object. Poll it while `status` is `pending`, honouring `pollAfterMs`.
Terminal states are `confirmed`, `failed` and `expired`.

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
- **One vote per confirmed order** goes into that local echo regardless of
  quantity. If you want the bought quantity reflected locally before the next
  poll, that is a deliberate change in `VoteFlowModal`, not an oversight.
- **`votingDeadlineISO` in `src/data/pageant.ts`** drives the countdown and
  the board's closed state. Keep it in step with whatever the server enforces,
  or the wall will promise a window the API rejects.
