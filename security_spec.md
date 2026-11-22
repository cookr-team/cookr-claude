# Security Specification for Chef Connect (Firebase Rules)

This document outlines the Security Specs for Firebase rules, establishing attributes, invariants, and validation specs to prevent unauthorized access.

## Data Invariants

- **Identity Isolation**: A user profile belongs to the owner of that specific `uid`. Standard clients cannot read or modify other client profiles.
- **PII Isolation**: Users cannot read other users' sensitive info (NIF, billings, addresses, status) unless they are the owner or an admin.
- **Booking Identity Integrity**: A client can only create and query bookings where they are the `clientId`. A chef can only view or adjust bookings where they are the `cookId`.
- **Terminal State Lock**: Once a booking transitions to a terminal state (`completed`, `cancelled`, `cancelled_partial_refund`, `rejected`), no client or chef can update its status or core fields. Only admins have administrative overrides.
- **Self-Promotion Guard**: Standard users cannot modify their own system `role` or self-assign the `admin` privileges during registration.

## The "Dirty Dozen" Payloads

1. **Self-Assigned Role Escalation**: A registration payload attempting to set `role` to `admin`.
2. **PII Data Scrape**: An authenticated user requesting list/get on a user profile that is a client and does not belong to them.
3. **Spoofed Owner ID User Create**: Authenticated user `A` trying to create user profile `B` matching `uid` `B`.
4. **Third-Party Booking Invariant Breach**: Client `A` trying to create a booking where `clientId` is set to Client `B`.
5. **Unauthorized Chef Booking Accept**: Client `A` attempting to update a booking's status to `accepted` for a chef.
6. **Double Status Update (Terminal Lock)**: An authenticated client attempting to reactivate/update a booking whose status is already `completed`.
7. **Ad-hoc Menu Injection**: An authenticated client injecting a Menu item under a chef's profile that they do not own.
8. **Rating Spoofing on Reviews**: Authenticated client `A` posting a review where the `clientId` attribute is Client `B`.
9. **Junk Character ID Injection**: Injecting a document under `users/` with an invalid document ID filled with raw terminal code or over 1KB in size.
10. **Shadow Field Injection**: Modifying the platform parameters or user profile with ghost attributes like `isVerified: true` bypassing validations.
11. **Waitlist Identity Theft**: Posting a waitlist entry under another client's identifier.
12. **Notification Broadcast Hijack**: Attempting to broadcast notifications to all clients as a client.

---

## Test Runner (Mock assertions target)

This spec ensures that all "Dirty Dozen" payloads fail with `PERMISSION_DENIED` under our rigorous `firestore.rules` ruleset.
