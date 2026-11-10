Firebase's settings for the iPhone app (notifications, see AppDelegate.swift):

- `GoogleService-Info.plist`: the store app, `app.swingarm`
- `GoogleService-Info-Dev.plist`: development builds, `app.swingarm.dev`
  (renamed from the `GoogleService-Info.plist` Firebase downloads)

Download them from Firebase's Project settings (project `swingarm-e40d2`),
under each iOS app. They're gitignored because the repo is public.
