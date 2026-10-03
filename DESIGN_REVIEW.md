# Nexus Travels — design and verification record

Prepared on 3 October 2026 from `SHAYAN-ABRAR/NEXUS-TRAVELS-TICKETING-with-js`, main revision `7d9f7b062c4c491a05bfc363f67aa7ddb789f7f0`. Source files and assets were read through the connected GitHub integration.

## Delivered changes

- Rebuilt the landing page, route card, offer tickets, seat map, booking summary, passenger form, confirmations and footer in an ivory/blue editorial identity.
- Created two AI campaign photographs and responsive WebP assets; the complete prompts and provenance are in `images/CAMPAIGN-IMAGES.md`.
- Replaced runtime CDN styling and fonts with local CSS, JavaScript and licensed font files. Added local Bengali coverage for taka symbols and passenger names.
- Added selectable journey dates, removable selections, coupon eligibility reconciliation, validation, browser-local demo tickets, downloads, cancellation, mobile navigation and working information links.
- Preserved the original Dhaka–Sylhet route, coach, AC Business class, 9 PM departure, 11-hour sample duration, 40 seats, BDT 550 seat fare, maximum four seats, NEW15 and Couple 20 discounts, and name/phone/optional-email form.
- Replaced unsupported success-email claims with clear demo messaging. Phone and email remain transient and are cleared after confirmation.
- The original source snapshot remains unchanged outside the deliverable folder. No remote branch, commit, pull request, merge or deployment was created by the assistant.

## Browser checks

All 22 checks passed in headless Chromium at the GitHub Pages repository subpath.

| Check | Result |
| --- | --- |
| GitHub Pages subpath loads 40 seats, images and local fonts | Pass |
| Keyboard skip link and seat arrow navigation | Pass |
| Seat selection, four-seat limit, removal and totals | Pass |
| Invalid coupon and case-insensitive NEW15 calculation | Pass |
| Removing a discounted seat cancels the offer | Pass |
| Couple 20 discount and restored draft after refresh | Pass |
| Name, phone and optional email validation | Pass |
| Confirmation, correct receipt and phone/email privacy | Pass |
| Downloaded ticket contains the correct fare and demo status | Pass |
| Dialog Escape restores focus and saved seats become unavailable | Pass |
| Saved tickets persist and cancellation releases seats | Pass |
| Date changes reset seats and coupon; invalid dates are blocked | Pass |
| Offer button stages a code and applies it with four seats | Pass |
| Booking state is reconciled across two tabs | Pass |
| No horizontal overflow at phone, tablet and desktop sizes | Pass |
| Mobile menu, seat selection, offer and summary bar | Pass |
| Complete mobile booking with Bengali phone digits | Pass |
| FAQ, terms, privacy and cancellation controls | Pass |
| Corrupted stored state falls back safely | Pass |
| Unavailable browser storage still allows a downloadable demo ticket | Pass |
| Passenger names are rendered as text, never HTML | Pass |
| No page errors, failed assets, or third-party network requests | Pass |

## Visual review

Reviewed rendered desktop (1440 px), tablet (768 px) and mobile (390 px) layouts, including the hero, offers, seat map, selected fares, passenger form and confirmation dialog. Checked widths 320, 360, 390, 430, 700, 768, 900, 1024, 1280, 1440 and 1920 px without horizontal overflow. Corrected a missing taka glyph and mobile text spacing during review.

Current screenshots are in `screenshots/`. The original `tour.gif` remains as an unreferenced legacy file.

## Practical limits

This remains a static local demonstration. No real bookings, payments, email or cross-device inventory exist. Local storage can be unavailable or cleared, and separate-tab reservations are not atomic. The AI scenes are illustrative. Other browser engines and the Windows publishing helper were not executed in this environment. The helper uses Windows PowerShell 5.1-compatible commands and stops on native Git failures.

The supplied ZIP is a complete website tree without Git metadata. The PowerShell helper creates a fresh checkout and branch; only an explicit `-Push` invocation commits and pushes. It checks the source revision before copying files and never merges or force-pushes.
