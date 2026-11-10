# RUSHLINE — Phase 2: Private sprint races

Phase 2 adds private rooms for 2–4 players while keeping solo play. This is a local/LAN multiplayer prototype, not a publicly hosted service.

## Start

From this folder, run `npm install` once, then `npm run dev`, or use `START-RUSHLINE.bat`. Open http://localhost:5173. The same Vite server serves the game and the `/race` WebSocket endpoint. Restart an older running Phase 1 server once to load the new server plugin.

For a built version, run `npm run build` then `npm run preview`; preview also includes the room server. A static-only host cannot run multiplayer.

## Play with friends

1. Choose **RACE WITH FRIENDS**, enter your name, and **CREATE ROOM**.
2. Share the six-character room code. Other players open the same server and choose **JOIN**.
3. Everyone selects **I'M READY**. The host starts when at least two players are ready.
4. A shared three-second countdown starts the temporary 300m sprint. Left/right changes lanes; Space/up jumps. Trains and barriers slow runners on collision.
5. Finish times and DNF status appear in the results. Return to the menu to create a fresh race.

On another device connected to the same network, open `http://YOUR-PC-LAN-IP:5173` rather than localhost. Windows Firewall must allow the Node server on your private network. No firewall or router settings were changed automatically. Devices on different networks need a hosted Node server with HTTPS/WSS; this has not been deployed.

## Race rules and synchronization

- The server owns movement, jumps, collisions, obstacle seed, countdown and finish times. Clients send actions, not claimed positions or scores.
- A shared seed produces the same obstacle layout for all racers. Each racer has independent collision/recovery state.
- Snapshots arrive at 20Hz; remote positions interpolate between updates. This first version has no client prediction, so internet latency will be noticeable.
- Maximum four runners. Late joining after countdown starts is blocked. Only the host can start, and all joined players must be ready.
- Runners can share lanes without colliding with each other. Names and colors distinguish rivals; distant rivals remain on the standings even when outside the chase camera.
- Multiplayer does not pause. Leaving marks a runner disconnected; remaining players continue. Lobby host ownership transfers if the host leaves.
- Empty rooms are removed. Server restart clears rooms. Reconnection means joining a fresh lobby; mid-race resume is not implemented.
- Races end when all connected players finish, or after four minutes of simulation time. Unfinished/disconnected players are DNF. Finish times have 50ms resolution; equal times are ties (display order uses player slot).

## Verification

`npm test` covers movement, installer recovery, room capacity, readiness, host permissions, countdown, common obstacles, authoritative collision/finish behavior, disconnects, and real WebSocket clients. `node inspect-model.mjs` checks installed character bounds during Run and Jump. `npm run build` generates the game bundle.

## Remaining work

Premium character/environment art, a real slide clip, sound, survival mode, reconnect/resume, latency prediction and production hosting remain future work. The current model has Run and Jump but no Slide clip; slide input does not bypass barriers. The room code is an invitation code, not account authentication. This version is intended for trusted local play, not an internet-scale competitive launch.

Implementation: `server/race.js`, `src/multiplayer.js`, `src/main.js`, and `vite.config.js`. Existing downloaded assets are retained.
