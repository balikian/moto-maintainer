# User testing with friends

Text messages for friends trying SwingArm on their phones (written
2026-10-19). Send them in order; each one is short so nobody gets a wall of
text. Friends reply to the numbered questions by text.

**Before inviting anyone:** testers use https://swingarm.app (the test site
is behind Vercel's login). Production is on Supabase Pro with daily backups.
When a friend says what they ride, import the manufacturer schedule for that
model (admin page) before sending text 2, or they only get generic starter
tasks.

**Tips:** if you can, watch one or two people use it in person or over a
screen share, and don't help. Ask open questions ("what did you expect to
happen?"). Try to get a mix: someone who does their own wrenching, someone
whose shop does everything, someone who isn't very techy.

**Update these texts when features change** (for example, if schedule import
opens to riders, or sign-in changes).

## Text 1: the ask

Asking what they ride gives you time to load their schedule.

```
Hey! I've been building an app called SwingArm for tracking motorcycle maintenance: what's due, when you last did it, and your service history. Would you test it for me? It takes about 20 minutes, it's free, and brutal honesty is what I want. What bike(s) do you ride?
```

## Text 2: what to do

Send once they say yes and their schedule is loaded.

```
Thanks! Here's the link: swingarm.app

Sign in with Google or your email. If you use email, open the sign-in link on this same phone.

Please don't read the help page first. I want to see if it makes sense without it. Try to:
1. Add your bike
2. Look over the maintenance list. Does it look right for your bike?
3. Log the last service you actually did (like an oil change), with the real date and mileage
4. Add a task that isn't on the list
5. Send me your bike's service history (see if you can find how)

When something confuses you or looks broken, screenshot it and text it to me right then.

Your info is private to you. Heads up: it sends reminder emails when maintenance is due. You can turn those off under More.
```

## Text 3: feedback

Send when they say they're done; it's easier to answer on its own.

```
Thanks for trying it! Reply with quick answers. A few words each is fine:
1. Where did you get stuck or confused?
2. Did anything look broken? (What phone?)
3. Anything wrong or missing on your bike's maintenance list?
4. Would you keep using it? What would make you?
5. What would make it worth paying for?
6. How would you describe it to a riding buddy in one sentence?
```

## Text 4: follow-up, one to two weeks later

```
Quick SwingArm follow-up:
1. Have you opened it since? Why or why not?
2. Did you get a reminder email? Useful or annoying?
3. Have you updated your mileage?
```
