# PlayPadel (beta)

3D padel game for Lowveld Padel: web (lowveldpadel.co.za/play) + Android.

| Folder | What it is |
|---|---|
| `web/` | The game website (deployed on Vercel, root directory `web`). `index.html` is the whole game. `download.html` is the tester download page. |
| `app/` | Capacitor 6 Android app (`com.nomz.padeldoubles`). |
| `.github/workflows/android-apk.yml` | Builds the APK on every push to `main` and publishes it to the `beta` release. |

APK link (fixed): https://github.com/amadadi78614/PlayPadel/releases/download/beta/padel-doubles-3d-beta.apk

Backend: Supabase project `padel-doubles-3d` (players leaderboard + feedback, RPC functions only).

| `src/` | Game source: `parts/` (JS/HTML pieces), `build.py` assembles `padel-doubles-3d.html`, `make_web.py` builds the PWA. |
