# Security Specification — ElfStory Multi-Slot Saves & Hall of Fame

## 1. Data Invariants
1. Save slots at `/users/{userId}/saves/{saveId}` (`saveId` in `['slot_1', 'slot_2', 'slot_3', 'active']`) belong strictly to the authenticated, email-verified user whose UID matches `userId` and `ownerId`.
2. Because ElfStory is a private single-player run-save architecture without shared leaderboards, top-level metadata (`ownerId`, `starterClass`, `level`, `zoneId`, `zoneName`, `buildTitle`, `kills`, `gold`, timestamps) and `savePayload` required keys are validated in `firestore.rules`, while nested `savePayload` RPG state is owner-scoped and trusted per player account.
3. Hall of Fame records at `/users/{userId}/chronicles/{entryId}` belong strictly to the authenticated owner, are immutable (`update` and `delete` denied), and constrain `keyDecisions` across all 8 optional indices (`0..7`) to strings of at most 120 characters.
4. No PII (`email`, `phone`, `address`) is stored in either collection or emitted in structured Firestore console error payloads.
5. `createdAt` and `updatedAt` must equal server `request.time`; `ownerId` and `createdAt` are immutable on update.
6. `allow list` on both collections explicitly checks `isOwner(userId) && resource.data.ownerId == request.auth.uid`.
7. Client startup does not perform unauthenticated/prohibited read probes against nonexistent `test/*` documents.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `get` on `/users/uid1/saves/slot_1`
2. Cross-user `list` on `/users/uid1/chronicles` by `uid2`
3. Invalid save slot ID `/users/uid1/saves/slot_99`
4. Identity spoofing: `uid1` creating chronicle with `ownerId: "uid2"`
5. Unbounded array poisoning: `keyDecisions` with > 8 items or oversized string at index 1..7
6. Invalid chronicle outcome `"cheated"`
7. Attempting `update` on an immutable chronicle entry
8. Shadow field injection on `SaveSlot` or `ChronicleEntry`
9. Oversized string in `buildTitle` (> 64 chars)
10. Unverified email user writing to `saves` or `chronicles`
11. Client-forged timestamp on `createdAt`
12. Mutating `ownerId` or `createdAt` during `SaveSlot` update

