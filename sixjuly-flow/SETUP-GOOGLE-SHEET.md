# Connect a Google Sheet (plain-language guide)

You do **not** need this to use Sixjuly Flow. Without it, sources, links, topics and drafts are saved in your browser. Connecting a Sheet adds:

- a shared list of sources, found links, topic ideas and drafts that you (and anyone you share the Sheet with) can read and edit;
- automatic checking of your sources by Google, even when the app is closed (optional daily check).

The Sheet holds **text only**: links, titles, dates, short notes and statuses. Images and design files stay in the app.

## What you need
- A Google account.
- 5 minutes, once.
- The downloaded app file `sixjuly-flow/dist/sixjuly-flow.html` opened in Chrome. (The copy that runs inside Claude cannot contact Google, so connect from the downloaded file.)

## Steps
1. **Make a Sheet.** Go to <https://sheets.new>. Name it, for example, "Sixjuly design intelligence".
2. **Open the script editor.** In the Sheet click **Extensions → Apps Script**.
3. **Paste the script.** In Sixjuly Flow open **Topics → Google Sheet** and press **Copy script**. In the Apps Script window select everything already there, delete it and paste.
4. **Choose a passphrase.** Near the top, change `const SECRET = 'CHANGE-ME';` to your own phrase, for example `const SECRET = 'blue-lantern-4821';`. Press **Save** (the disk icon).
5. **Publish it.** Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
6. **Allow it.** Google asks for permission once. Choose your account → *Advanced* → *Go to project (unsafe)* → **Allow**. (Google shows this for every personal script. It only reads and writes this Sheet and fetches the public feeds you list.)
7. **Copy the "Web app URL"** (it ends in `/exec`).
8. **Connect.** Back in Sixjuly Flow paste the URL and your passphrase and press **Connect**. The four tabs appear in your Sheet: Sources, Found links, Topics, Content drafts.
9. Press **Send everything to the Sheet** once to copy your 74 starter sources over.

## Daily checking without opening the app (optional)
In the Apps Script editor pick the function `installDailyTrigger` in the toolbar and press **Run** once. Every morning around 7 the script reads your sources and adds new links to the **Found links** tab. In the app press **Get latest from the Sheet**.

## Good to know
- **Keep the Web app URL and passphrase private.** Together they are the key to the Sheet. They are stored only in your browser. If they leak, change `SECRET`, then **Deploy → Manage deployments → Edit → New version**.
- **If you change the script later**, redeploy: **Deploy → Manage deployments → pencil → Version: New version → Deploy**.
- **What gets read:** RSS / Atom feeds you list, or the feed a page announces in its own page header. Pages whose `robots.txt` asks automated tools to stay away are skipped. Social networks (LinkedIn, Instagram, X, YouTube) and newsletters are never read: open them yourself and use **Add link**.
- **What is stored per link:** title, link, date, source and a note of about 280 characters. No articles, no images.
- **Cost:** none. Google Apps Script and Sheets are free for personal use within Google's daily limits.

## If something goes wrong
| You see | Try |
| --- | --- |
| "The passphrase does not match" | The text in the app must equal `SECRET` in the script exactly. After editing the script, redeploy a new version. |
| "Change SECRET at the top of the script first" | You still have `CHANGE-ME`. Change it and redeploy. |
| "Could not reach Google" | Check the URL ends in `/exec`, access is **Anyone**, and you opened the downloaded app (not the copy inside Claude). |
| "That address does not look like a Web app URL" | Copy the **Web app** URL from the deployment dialog, not the editor address. |
| A source says "needs manual review" | It has no feed. Open it from its row and use **Add link** for anything worth keeping. |
