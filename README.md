# Progressive Overload Coach (PWA)

Local-first progressive overload training app with a rugged in-gym UI, timers, and CSV export.

## Features

- Progressive overload logic with automatic weight/rep progression per exercise.
- Daily cycle support (Push A, Pull A, Mobility, Push B, Pull B).
- Large in-gym UI with timers, set tracking, and quick adjustments.
- Local-first storage with CSV export.

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server and expose it on your LAN:
   ```bash
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
3. On your laptop, open `http://localhost:5173`.
4. On your iPhone (same network), open `http://<laptop-ip>:5173` in Safari and tap **Share → Add to Home Screen**.

## Fixed IP / always-on access options

You move networks and use VPN, so a static local IP alone will not stay consistent. Two options:

1. **Recommended: Tailscale (stable IP + MagicDNS)**
   - Install Tailscale on both your laptop and iPhone.
   - It gives your laptop a stable private IP (and a hostname) no matter where you are.
   - Open the app on iPhone using `http://<tailscale-ip>:5173` or `http://<hostname>:5173`.

2. **Local LAN static IP (only works on a specific Wi-Fi network)**
   - Configure a static DHCP reservation in your router for the laptop’s MAC address.
   - Use `http://<reserved-ip>:5173` on your iPhone when on that network.

## Using a phone hotspot or switching Wi‑Fi

Tailscale works across any network (home Wi‑Fi, gym Wi‑Fi, phone hotspot) as long as both devices are connected to Tailscale.

Recommended workflow when switching networks:
- Connect the laptop to the new Wi‑Fi or phone hotspot.
- Open the Tailscale app on the iPhone and confirm **Connected**.
- On the laptop, ensure the app service is running:
  ```bash
  systemctl --user status gym-app.service
  ```
- Ensure Tailscale Serve is configured (persistent):
  ```bash
  sudo tailscale serve status
  ```
  If it shows “No serve config”, re‑enable:
  ```bash
  sudo tailscale serve --bg --http=80 4173
  ```
- Open the app on iPhone:
  ```text
  http://100.118.64.67/
  ```
  or
  ```text
  http://jacob-20nks0qn06.tail989908.ts.net/
  ```

## Data and export

- Data is stored locally in the browser's localStorage on the laptop under `overload_state_v1`.
- Optional sync server can persist and merge sessions across devices.
- Progress tracking is stored with the latest completed session:
  - `progress.lastCompletedDate`
  - `progress.lastCompletedDayKey`
  - `progress.lastCompletedWeekNumber`
- Export CSV from the **Settings** section.

## Day selection and flow

- The app starts the day view at the next day after the last completed session.
- You can override "Today" using the day dropdown in the header to run Push A/B, Pull A/B, Mobility, or Rest.
- Starting a day creates a session for the selected day.

## Workout adjustments

- Weight and target reps are adjusted directly in the main, large selectors on the Workout screen.
- Achieved reps are tracked per set and saved with the session.

## Notes

- Default rest timer is 90s with a 120s option.
- Program automatically increases from 3 → 4 → 5 → 6 exercises after weeks 4, 8, and 12.
- Pull-down → pull-up transition uses performance + bodyweight thresholds and adds negatives when ready.

## Sync server (iPhone -> laptop)

Run a lightweight sync server on the laptop and point the iPhone to it. The app pulls on load and pushes automatically when finishing a day.

1. Start the server on the laptop:
   ```bash
   node sync-server.js --port 8787 --file ./sync-data.json
   ```
   Or manage it with systemd:
   ```bash
   systemctl --user enable --now gym-app-sync.service
   systemctl --user status gym-app-sync.service --no-pager
   ```
2. In the app **Settings**, set **Sync server URL** to:
   ```text
   http://<laptop-tailscale-ip>:8787
   ```
3. Finish a workout on the iPhone to push the latest session and settings.

If the field is empty, the app auto-fills it using the current host (same hostname, port 8787).

The sync state is stored in `sync-data.json` on the laptop.

## Troubleshooting

- If the app keeps showing Day 1, use **Settings → Reset All Data** once to rebuild progress from storage.
- If you want to ignore history for a day, use the day dropdown to select a different workout.
