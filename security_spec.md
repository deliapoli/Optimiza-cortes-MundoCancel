# Security Specification - MundoCancel Cut Optimizer

## Data Invariants
1. A `StockItem` must always belong to a valid `ProfileType`.
2. An `OptimizationJob` must have a `profileId` and a positive `bladeWidth`.
3. `CutResult` and `CutRequirement` documents must be associated with an existing `OptimizationJob`.
4. All write operations require a verified authenticated user.
5. Users can only see and manage their own data (actually, for this industrial app, we might want shared access, but I'll stick to a standard multi-tenant "per-user" model or a flat model if specified. The prompt mentions "roles", so I'll implement a basic role-base or at least user-isolation). *Correction*: The prompt doesn't explicitly mention multiple users but "roles" suggests it. I'll use `ownerId` on all main documents.

## Dirty Dozen Payloads (Rejection Targets)
1. **Malicious ID**: Creating a profile with a 2MB string as ID.
2. **Shadow Field**: Adding `isAdmin: true` to a user profile payload.
3. **Negative Length**: Creating a stock item with length `-500`.
4. **Huge Kerf**: Setting `bladeWidth` to `1000000` mm.
5. **Orphaned Result**: Creating a `CutResult` without a valid `jobId`.
6. **Identity Spoofing**: Setting `ownerId` to another user's UID.
7. **Timestamp Forge**: Providing a future `createdAt` from the client.
8. **Resource Exhaustion**: Sending a payload with 10,000 dummy keys.
9. **Status Jump**: Changing job status from `pending` to `completed` without actually having results (handled by logic).
10. **Unauthorized Read**: Reading another company's stock list.
11. **Type Poisoning**: Sending `length: "6000"` (string) instead of number.
12. **Empty Name**: Creating a profile with an empty `name` string.
