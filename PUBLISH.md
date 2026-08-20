# Publishing this site to your WPI userspace

Your new site lives in this folder as plain files: `index.html`, `res.html`, `talk.html`, `proj.html`, `fund.html`, `team.html`, `teach.html`, `serve.html`, `REU.html`, `cv.html`, `style.css`, and the `img/` folder. WPI serves whatever is in your `public_html` folder at `https://users.wpi.edu/~yli15/`, so publishing is just copying these files there.

This step requires your own WPI username and password — only you can do it.

## 1. Map your public_html folder

**macOS:**
1. In Finder, press `Cmd+K` (or Go → Connect to Server).
2. Enter: `smb://users.wpi.edu/personalweb/public_html`
3. Click Connect, choose "Registered User", and sign in with your WPI username and password.

**Windows:**
1. Open File Explorer → right-click "Network" → "Map network drive…"
2. Folder: `\\users.wpi.edu\personalweb\public_html`
3. When prompted, sign in as `ADMIN\<your WPI username>` with your WPI password.

(Full details are in the WPI KB article "Create a Personal Website at WPI" you already have in `MyInput/`.)

## 2. Copy the files over

Once `public_html` is mounted as a drive/volume:

1. Open a second Finder/Explorer window on this project folder: `/Users/yli15/Documents/ClaudeCode/WPI_Personal_Website/`
2. Select all of: `index.html`, `res.html`, `talk.html`, `proj.html`, `fund.html`, `team.html`, `teach.html`, `serve.html`, `REU.html`, `cv.html`, `style.css`, and the `img/` folder.
3. Drag them into the mounted `public_html` folder, overwriting the old versions when prompted (choose "Replace"/"Overwrite").

You don't need to touch file permissions — WPI's server already applies the correct bits (0701 for folders, 0744 for files) automatically.

## 3. Verify

Visit `https://users.wpi.edu/~yli15/` in a browser (may take a minute to reflect). Click through all the nav links, and try the venue filter chips on the Publications page.

## Notes

- Old files with the same names are overwritten; anything else already in your `public_html` (that this project didn't create) is untouched.
- If you ever leave WPI, remember the KB article's note: your site is only served while your account is active — migrate the contents to an external host before departure.
