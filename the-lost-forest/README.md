# THE LOST FOREST
Five Days. One Mysterious Forest. One Way Home.

Original cooperative 2D browser adventure. Phaser client, authoritative Colyseus server, 1–8 explorers, no accounts or competitive scoring.

## Run
Node 22 or later.

```sh
npm ci --include=dev
npm run build
npm run build:server
npm start
```

Open http://localhost:2567. Create a room in one browser and join its six-character code in a second independent session. The same Node service serves the client, health endpoint and WebSockets. The client never fabricates remote players.

For the managed Sites preview, build first, then run `sites-preview start` for this checkout. Its daemon supplies the preview port. `npm run dev` uses the TypeScript Node entrypoint and serves the existing `dist` build.

## Controls
- Move: A/D or left/right arrows.
- Jump: Space, W or up arrow.
- Interact: E.
- Hide: Hold H, S or down arrow inside fern patches.
- Touch devices: directional, Jump, Hide and Interact buttons.
- Chat and quick reactions are room-only. Local mute available.

## Chapters
1. Stranded: gather materials, build shelter, inspect footprints.
2. The Chase: physically run, jump over roots and hide from Thornback.
3. The Lost Valley: repair a river bridge, find the abandoned field station.
4. The Living Jungle: collect stone clues, solve the beacon sequence.
5. The Final Escape: repair a glider and escape together.

Between chapters, Professor Pebble offers an optional funny question and trivia. An answer can be typed and shared without voice. Wrong puzzle answers consume no resources. Creature encounters and falls return explorers to safety. No player elimination.

## Hosting
`render.yaml` describes a free Node web service and a free Postgres checkpoint database. No paid resource is requested. A Render connection and an accessible source repository or approved source deployment route are needed to publish. HTTPS/WSS must be verified after deployment.

Important free-host limitations: Render can cold-start or restart free services. Free Postgres expires after 30 days, so this blueprint is a submission deployment rather than a permanent persistence arrangement. Do not upgrade or add paid services without owner approval. Check available free resources and account limits before provisioning.

Sites can host the frontend. For a split deployment, put the actual HTTPS backend origin into `VITE_SERVER_URL` before building, or publish `public/server-config.json` containing `{"serverUrl":"ACTUAL_VERIFIED_BACKEND_ORIGIN"}` and rebuild. Never put secrets in the frontend configuration. Until a Node backend is deployed, a Sites frontend alone is not playable multiplayer.

## Authority and recovery
The server processes inputs at 30 Hz and broadcasts room snapshots at 15 Hz. It validates collection distance, shared resource requirements, puzzle proximity and chapter objectives. The client predicts local input and reconciles against server snapshots. Room codes are unlisted; they are access invitations, not account authentication.

A dropped client's seat is reserved for 120 seconds. Tokens in sessionStorage permit reload recovery within that window. With DATABASE_URL configured, shared chapter/resource/puzzle state is checkpointed every 10 seconds and at important transitions. Rejoining a room code after a process restart restores the chapter at a safe start. Player positions and chat are not durable. Completed rooms are not restored. Stored rooms expire after 24 hours. Without Postgres, checkpoint files are development-only and do not survive ephemeral-host replacement.

## Verification
`npm test` runs network tests using two real Colyseus clients plus gameplay tests. The network test covers private codes, independent movement, jumping observed remotely, shared collection, range validation, reconnection and invalid codes. Gameplay tests cover physics, construction, five-chapter transitions, puzzle retries, hiding and collective completion.

Logic tests position players at objectives to exercise rules; they are not a full manual playthrough. Before submission, complete a full normal-input run, deployed two-browser test, physical phone/tablet tests and eight-player test. Session length is not yet measured. Do not claim these are verified until performed.

## Assets
Environment, characters and creature artwork are original procedural drawings in the client. No film artwork, characters, names or audio are used. Phaser and Colyseus dependencies retain their upstream licenses. Optional Google Fonts use their original licenses; system font fallbacks are provided.

## Verified submission release
Public game: https://the-lost-forest-adventure.sheetalsaini.chatgpt.site/
Multiplayer server: https://the-lost-forest.onrender.com/
Source: sheetalsaini/Ai-projects-Nov-2025, branch the-lost-forest-release, folder the-lost-forest.

Verified against public hosting: two independent browser sessions join by code, shared inventory and construction, group exit checks, synchronized chapter progression, visible Professor Pebble replies, and browser reload reconnection. A two-client network test passes remote movement, jumping, collection, reconnect and invalid codes. Eight real clients can join; a ninth is rejected.

A complete live five-chapter playthrough passed using only normal input and interaction messages, without admin actions or teleporting. The optimized test run took 126 seconds; this compact release has not been calibrated to the original 20–30 minute human-session target. Physical phone/iPad tests and cross-country latency tests remain unverified.

Eight local automated tests pass. Run the live checks with FOREST_TEST_URL set to the actual backend origin. The optional --use-env-proxy Node flag is appropriate only in environments that require their configured outbound proxy.

Restart-safe Postgres checkpoints are not yet wired in production. The free checkpoint database exists, but DATABASE_URL still needs to be supplied through Render configuration after the owner completes dashboard authentication. Temporary disconnect and browser-reload recovery work while the room server remains alive.

## Cross-device and invite hotfix
A solo start now permits invited friends through the same room code, with an eight-player capacity. Previously solo rooms were locked to one player while still displaying a shareable code. Joining now distinguishes invalid, full, expired and temporarily unavailable rooms.

The device selector defaults to Auto and remembers optional Phone, iPad/Tablet or Laptop/Desktop choices. The screen-controls button changes layouts without leaving the room. Touch controls have independent pointer capture for concurrent movement and jumping. Inputs use 16px fonts in touch layouts to prevent Safari focus zoom; the viewport and camera fit dynamic phone heights. Portrait phones show a landscape recommendation. Every layout connects to the same Render backend.
