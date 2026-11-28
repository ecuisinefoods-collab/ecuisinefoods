# Affiliate Operations RPC Test Matrix

Run only against an isolated disposable test database after migrations are applied in sequence. Never use the live eCuisinefoods project as a test target.

## Application activation
- Anonymous users can submit only public application fields; they cannot set `user_id`, review fields or status.
- Only the active owner can approve/reject applications.
- Only the active owner can activate an approved application.
- Activation fails if there is no confirmed Auth user matching the application email.
- Activation fails for unapproved applications, duplicate membership, invalid code or future/invalid start date.
- Successful activation creates a Beginner member, links the application and Auth user, and writes an audit record.

## Sale submission
- Unauthenticated users cannot call the submission RPC.
- An affiliate can submit only for their own active membership.
- Payload must contain 1–20 items; each item must reference an active product and a pack-size variant belonging to that product.
- Quantity and selling price must be positive.
- Invalid JSON shape, missing IDs, negative values, future sale date and unsupported payment status are rejected.
- A failure in any item rolls back the entire sale header and all items.
- Successful submission creates a pending-verification sale and audit event.
- Affiliate cannot directly update or delete submitted sale rows.

## Sale verification
- Non-owner users cannot execute the verification RPC.
- Only pending sales can be reviewed.
- Rejection requires a reason.
- Only fully paid sales can be approved.
- Reseller approval requires confirmed stock with payment marked paid/not-required and sufficient remaining quantity for every pack-size variant.
- Concurrent reseller approvals for the same member are serialized by a member-row lock; verify no overselling under concurrent requests.
- Commission sale approval is intentionally blocked until the customer-fund remittance model is agreed and implemented.
- Every decision records reviewer, timestamp and audit event.

## Stock transfers
- Only the active owner can record and confirm transfers.
- Recipient must be active or onboarding.
- Non-company sources require a source name.
- Payload must contain 1–20 valid product/variant lines with positive quantities and non-negative acquisition prices.
- Any invalid item rolls back the complete transfer.
- New transfers begin as recorded, never automatically confirmed.
- Pending payment blocks confirmation; paid/not-required transfers can be confirmed by owner.
- Only confirmed paid/not-required transfers count as reseller available stock.

## Financial safeguards
- Payout details are owner-only through RLS.
- Earning calculation facts cannot be edited or deleted; corrections use reversal/adjustment records.
- No commission rate, monthly target, payout cadence or leader reward is assumed by default.
