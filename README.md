# Progressive Overload Coach (PWA)

Local-first progressive overload training app with a rugged in-gym UI, timers, and CSV export.

## Features

- Progressive overload logic with automatic weight/rep progression per exercise.
- Daily cycle support (Push A, Pull A, Mobility, Push B, Pull B).
- Multiple profiles with separate programs, exercise libraries, and progression.
- Large in-gym UI with timers, set tracking, and quick adjustments.
- Local-first storage with CSV export and a calendar history view.

## Quick start (laptop + iPhone)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build and serve the PWA:
   ```bash
   npm run build
   systemctl --user restart gym-app.service
   ```
3. On the laptop, open `http://localhost:4173`.
4. On the iPhone, open `http://<laptop-tailscale-ip>/` and tap **Share → Add to Home Screen**.

## Tailscale access (recommended)

Use the Tailscale IP or MagicDNS hostname so the app works on any network.

1. Install Tailscale on laptop + iPhone (same tailnet).
2. Open the app using:
   ```text
   http://<laptop-tailscale-ip>/
   ```
   or
   ```text
   http://<laptop-magicdns-hostname>/
   ```

If MagicDNS fails, use the Tailscale IP directly.

## Services (systemd)

The laptop uses systemd user services for the app and sync server:

```bash
systemctl --user status gym-app.service
systemctl --user status gym-app-sync.service
```

To restart:

```bash
systemctl --user restart gym-app.service
systemctl --user restart gym-app-sync.service
```

## Profiles

- The app supports multiple users with separate programs, exercise libraries, and history.
- Choose profiles from the header dropdown or the landing screen.
- Program definitions live in `src/programs/jacob.js` and `src/programs/mari.js` (shared base in `src/programs/base.js`).

## Data, history, and export

- Data is stored locally in browser storage under `overload_state_v1`.
- The History tab shows a two-month calendar with pass/miss badges.
- Export CSV from **Settings → Actions → Export CSV**.

## Progression and scheduling

- The app defaults to the **next day** after the latest completed session.
- You can override the day in the header; progression still uses session history.
- Program increases exercises per session every 4 weeks: 3 → 4 → 5 → 6.
- Sets per exercise increase every 4 weeks: 3 → 4 → 5 → 6.
- Progression rule: 3x5 → 3x6 → 3x7 → add weight → reset to 3x5.
- If a target is missed twice in a row, weight deloads ~5% and resets to 3x5.

## Sync server (iPhone -> laptop)

Run a lightweight sync server on the laptop and point the iPhone to it. The app pulls on load and pushes after finishing a day.

1. Start the server on the laptop:
   ```bash
   systemctl --user enable --now gym-app-sync.service
   systemctl --user status gym-app-sync.service --no-pager
   ```
2. In the app **Settings**, set **Sync server URL** to:
   ```text
   http://<laptop-tailscale-ip>:8787
   ```
3. Finish a workout on the iPhone to push the latest session and settings.

The sync state is stored in `sync-data.json` on the laptop.

## Adding a new iPhone (Mari)

1. Install Tailscale on the new phone and confirm it is in the same tailnet.
2. Open `http://<laptop-tailscale-ip>/` in Safari and add to Home Screen.
3. Open the app → **Settings** → set **Sync server URL** to:
   ```text
   http://<laptop-tailscale-ip>:8787
   ```
4. Select the **Mari** profile.

## Troubleshooting

- If history is wrong on a device, use **Settings → Actions → Force Pull From Server**.
- If a profile is polluted, switch to that profile and use **Reset All Data** (per profile).
- If MagicDNS fails, use the Tailscale IP directly.
