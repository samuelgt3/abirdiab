# ndmin guide (for nbir and her team)

You do not need any technical knowledge. Everything you change here appears on the website straight away.

## Log in
1. Go to **your-website-address/admin** (for example `www.abirdiab.com/admin`).
2. Type the email and password you were given, press **Log in**.
3. To leave, press **Log out** (top right). Always log out on a shared computer.

If login fails, check the email and password. If you forgot the password, ask your developer to send you a reset link.

## Dashboard (the home page)
After login you land on the **Dashboard**. The red and orange cards under **Needs your attention** tell you what to do today
(for example "1 paid booking needs a joining link") — click one to go straight to it. Below are your numbers for the month,
what is coming up in the next 14 days, your latest bookings and quick buttons to add a course, workshop, post or testimonial.

## Other pages
- **Newsletter subscribers** — everyone who signed up in the website footer. **Copy emails** or **Export CSV** to use in your email tool.
- **My account** — change your password (10+ characters, with a number) and see who you are signed in as.
- In every list (courses, workshops, journal, testimonials) use the **switch** to show/hide an item instantly, the arrows to reorder,
  the copy icon to duplicate, and the search box to find things. **Ctrl+S** (Cmd+S on Mac) saves while editing.

## Sessions & availability (when you take 1:1 sessions)
Open **Sessions & availability** in the left menu.
1. Type your **price per session** (US dollars) and press **Save details**.
2. **Pick the days** you are free on the calendar (tap a weekday name to select all of that weekday in the month).
3. **Choose the times** (or type another one like 14:30) and press **Add**. The same times go onto every selected day.
4. Below, you see everything posted. A time shows **Booked · name** once someone books it. Press ✕ to remove a free time.
Visitors can only book the times posted here. If nothing is posted they see "No times are open right now".

## Guided meditations (the voices on the home page)
Open **Guided meditations** in the left menu. Each item is one meditation in the "Guided Audio" section.
Add a title, a short description and the length, then **upload the audio** (a short free preview clip, MP3 works well) and press **Save**.
Visitors press the item on the home page and hear it right there. An item without audio still shows, and leads to the full recordings in Materials.
To **delete a clip**: open the meditation, press **Remove** next to the audio, then **Save**. The file is deleted from storage too, and the item stays but shows greyed out. Deleting a whole item (or replacing a file with a new upload) also deletes the old files. Use the arrows to reorder and the switch to hide one.

## Workshop seats
In a workshop, **Number of seats** is the real number (e.g. 50). It counts down as people book and shows **Sold out** at zero.
Visitors see only one fifth of the real number: 50 seats shows "10 spots open", after 5 bookings it shows 9. Use 0 for no limit.

**Coming soon workshops:** leave the **Date and time** empty and the workshop shows on the site as *Coming soon* (it cannot be booked). When the date is known, fill it in and it opens for booking. To remove one, switch it to Hidden or delete it.

## Course files and videos
Open a course and scroll to **Private content**: paste the Bunny video id and/or upload the PDF or audio.
Only people who bought it (or anyone, if the course is free) can open it.

## Bookings & orders
Every session booked, workshop seat reserved, material bought or gift sent on the website appears here, newest first.
- Click a row to see the client's email, phone, note and (for workshops) where they want the joining link.
- Each booking has a reference like **AD-3C5E15** — the client sees the same number.
- With **card payments on** (Booking settings), customers pay by card right inside the booking window on the website, and the booking turns **Paid** by itself.
  Click it to see the amount charged and the Paymob transaction number.
- Anything still **Awaiting payment** was not paid yet (card payments off, or the customer closed the window). Press **Copy pay link**
  and send it to the client (WhatsApp, chat, anything): it opens a page on your website where they pay by card. If they pay another
  way, change the status to **Paid** yourself.
  For a session, change it to **Confirmed** once you have agreed the time; **Completed** afterwards.
- **Private notes** are only visible to you.

## Joining links (workshops and sessions)
- **Workshop:** open the workshop → **Edit** → paste the video-call link (Zoom, Google Meet or any other) in the green **Joining link** box → Save. Customers only receive it 2 hours before the start.
- **1:1 session:** open the booking in **Bookings & orders** and check *that session's own* link (it is made automatically when the session is paid; paste a different one only if you want to). Customers see it on their booking page from 2 hours before.
- Until a link is pasted, the customer sees "The link will be added here shortly".

## Booking settings
Set the **1:1 session price** (in US dollars), the session length, the start times you offer (e.g. `10:00, 12:00, 16:00`),
the days you work, your time zone and how far ahead people may book. Press **Save settings** — the website updates immediately.
While the price is empty, visitors see "Price confirmed by Abir after booking".

**Customer sign-in:** "Show Continue with Google" — switch on only after your developer has enabled Google in Supabase.

**Card payments (Paymob):** the tick box turns online card payment on or off, and *Currency customers are charged in* must match
your Paymob account (usually EGP). Only switch it on after your developer has added the Paymob keys and a test payment worked.

## Story submissions
Stories visitors send through "Share your story". Press **Add as testimonial** to copy one into Testimonials as *Hidden*; check it,
add the translation, then press **Show** in the Testimonials tab. Nothing appears on the site until you do.

## The four content sections
Use the buttons at the top: **Testimonials · Courses & materials · Workshops · Journal**.
Each shows a list. Every row has the same buttons:

| Button | What it does |
| --- | --- |
| ↑ ↓ | Move the item up or down. The website shows items in this order |
| **Hide / Show** | Take it off the website without losing it (safe, reversible) |
| **Edit** | Change its words, price, pictures |
| **Delete** | Remove it for good — it asks first. **Prefer Hide** if you might want it back |
| **+ Add new** | Create a new item |

The little green **Visible** / red **Hidden** tag shows what visitors can see.

## Editing in English and Arabic
Each form has two columns: **English** on the left and **العربية** on the right. Fill both when you can.
If an Arabic box is empty, Arabic visitors see the English text instead. Arabic boxes type right-to-left automatically.
Press **Save** at the bottom when done — nothing is saved until you do. **Cancel** discards your changes.

## Pictures, audio and files
Wherever you see a file box: press **Choose file**, pick it from your computer, wait for "Uploaded." — the link fills in by itself.
- Images: JPG or PNG, ideally under 1 MB (large photos slow the site down).
- Voice notes: MP3.
- Downloads: PDF.

## Courses & materials
- **Type**: Audio = meditation, Video = course, PDF = manual.
- **Price in USD**: type the dollar price only. The site converts it for each visitor (Egyptian pounds, dirhams, euros…) and shows a note that it is approximate. Tick **This item is free** for free items.
- **What you get**: one point per line.
- **Video ID**: only when the video is hosted on Bunny Stream (your developer will tell you what to paste).
- **Pack contents** (if you see it): one line per item inside the pack: `a` (audio), `v` (video) or `p` (PDF), then `|`, title, `|`, length, `|`, description. Arabic version goes in the right-hand box, same order, without the letter.

## Workshops
- **Date and time** uses the time zone of the computer you are using. Also fill **Time label** (e.g. `19:00 GST`) — that's the text visitors actually read.
- **Seats left**: the site shows "Only 4 spots left" under 5 seats.
- When the date passes, the workshop **disappears from the website automatically**. You never have to remove it.

## Testimonials
- **Kind**: *written* (a quote), *voice* (put the written transcript in the quote box and upload the audio), or *screenshot* (upload the image; add a separate Arabic image if you have one).
- Only publish a testimonial with the client's permission.

## Journal
Write the article text in the big box. Leave an **empty line between paragraphs**.

## If something goes wrong
| You see | Do this |
| --- | --- |
| "Could not save: …" in red | Take a screenshot and send it to your developer |
| Change doesn't show on the site | Refresh the site page (Ctrl+F5). Check the item says **Visible** |
| "Upload failed" | The file may be too large; shrink it and try again |
| You deleted something by mistake | Tell your developer straight away — there is no undo, but a backup may exist |
