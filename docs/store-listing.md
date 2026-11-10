# Store listing

What to enter in the Google Play Console (and, later, App Store Connect) for
SwingArm. Copy from here; when the app changes, update this file first.

Images are in `assets/store/`.

---

## Main store listing (Grow users → Store presence → Main store listing)

**App name** (30 characters max)

```
SwingArm: Motorcycle Service
```

**Short description** (80 characters max)

```
Motorcycle maintenance by miles and months. Log service, keep a clean history.
```

**Full description** (4,000 characters max)

```
SwingArm keeps track of what your motorcycle needs, so nothing sneaks past due.

Every maintenance job counts down by miles and by months, whichever comes first. The bike that sits all winter still gets its brake fluid, and the one you ride every day gets its oil on time.

WHAT IT DOES
• Your bike's real schedule: start from the manufacturer's maintenance schedule where we have it, or a sensible checklist for your bike. Change any interval, or add your own jobs.
• See what's due: overdue, due soon and all good at a glance, for every bike in your garage.
• Log service in a tap: date, odometer, cost, where it was done and notes. SwingArm spots jobs worth doing in the same visit, like the air filter with the oil change.
• Reminders: a notification or an email when something's coming due, plus odometer check-ins.
• Repairs and upgrades: keep one-off jobs, estimates and product links in one place.
• Your shop: save your shops, ask for an appointment, and add it to your calendar.
• Storage mode: storage and back-on-the-road checklists, and battery check-ins while the bike sits.
• A history buyers trust: print it, export it, or share a read-only link when you sell.

Any make and model. Miles or kilometers. Your garage is private: a bike's history is shared only when you make a link, and you can turn the link off.

Sign in with Google or with a code sent to your email. The same account works on the web at swingarm.app.

FREE DURING EARLY ACCESS
SwingArm is free while it's in early access, with no ads. Paid plans may come later; you'll hear about them before anything changes.

Questions or ideas? support@swingarm.app
```

**Graphics**

- App icon: `assets/store/play-icon-512.png` (512×512; Play rounds the corners itself, so it's a full square).
- Feature graphic: `assets/store/feature-graphic.png` (1024×500).
- Phone screenshots: 2 to 8, portrait. Plan: Tasks (a bike with something due), log service, History, Garage, a reminder notification, More. Taken on the Pixel from a garage with real-looking bikes.

**Category and contact** (Store presence → Store settings)

- App category: **Auto & Vehicles**
- Email: `support@swingarm.app`
- Website: `https://swingarm.app`
- Phone: optional; leave it blank if Play allows (the account's phone is the owner's own).

---

## App content (Policy and programs → App content)

**Privacy policy:** `https://swingarm.app/privacy`

**App access:** All or some functionality is restricted. Instructions:

```
SwingArm needs an account, and anyone can create one for free. On the sign-in screen, tap "Continue with Google" and use any Google account. No invite, payment or special credentials are needed.
```

**Ads:** No, the app doesn't contain ads.

**Content rating:** category **Utility, Productivity, Communication or Other**. Answer No to violence, sexuality, language, controlled substances, gambling and the rest. Users interacting or exchanging content: **No** (share links are read-only pages, not messaging). Shares the user's location: **No**. Digital purchases: **No** (for now). Expected rating: Everyone / PEGI 3.

**Target audience:** **18 and over** only. (Riders are adults; including under-18 ages brings Google's Families rules.) Appeals to children: No.

**News app:** No. **Government app:** No. **Financial features:** none. **Health:** none. **COVID-19:** not a tracing or status app.

**Account deletion**

- Can users create an account in the app? Yes.
- Delete account URL: `https://swingarm.app/privacy` (the "How long we keep it, and deleting it" section gives the steps: More → Delete account).
- Partial data deletion: not offered separately; riders can edit or delete any bike, task or record in the app.

### Data safety

Overall:

- Does the app collect or share any required user data types? **Yes**.
- Is all collected data encrypted in transit? **Yes** (HTTPS only).
- Ways users can request deletion: **in the app** (More → Delete account) and the URL above.
- Shared with third parties: **No** for every type. Supabase, Vercel, Resend and Firebase are service providers acting for us, which Google doesn't count as sharing.

Collected (all **not optional** unless noted, none processed ephemerally):

| Play's data type | What it is in SwingArm | Purposes |
| --- | --- | --- |
| Personal info → Email address | The account's email | App functionality, Account management, Developer communications |
| Personal info → Name | From Google, if the rider signs in with Google (optional) | Account management |
| Personal info → Other info | Google profile picture, if signed in with Google (optional) | Account management |
| App activity → App interactions | Usage statistics: pages visited and a few actions (Vercel Web Analytics, no cookies) | Analytics |
| App activity → Other user-generated content | Bikes, odometer readings, tasks, service log, costs, notes, shops, repairs, storage checklists (optional: the rider enters them) | App functionality |
| Device or other IDs | The push address (Firebase token) when notifications are on (optional) | App functionality |

Not collected: location, contacts, photos or files from the phone, financial or payment info, health, messages, audio, calendar, web browsing, crash logs. (Adding a booking to the calendar hands it to the phone's calendar app; SwingArm doesn't read the calendar.)

---

## Before the public release (Claude)

- Home page: "Coming soon to Google Play" becomes a Google Play link (`https://play.google.com/store/apps/details?id=app.swingarm`), and the hero's "phone apps coming soon" line changes.
- Help page: getting the Android app.
- Privacy policy: still accurate for Android (Firebase is already in it); check the date if anything changes.
