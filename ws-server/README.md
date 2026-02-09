# story-lock-ws

Tiny WebSocket lock server for the co-writing app.

## Deploy (Railway)
1. Create a new Railway project from this folder.
2. Set the start command to `npm start` (Railway detects package.json).
3. Use the deployed URL in the app:
   - NEXT_PUBLIC_PARTYKIT_HOST=https://<your-railway-domain>

The app will connect to:
  wss://<your-railway-domain>/ws?room=<room_id>
