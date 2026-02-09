import http from "http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 1999;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("story-lock-ws running\n");
});

const wss = new WebSocketServer({ noServer: true });

// roomId -> { activeUser: string|null, clients: Set<WebSocket> }
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { activeUser: null, clients: new Set() });
  }
  return rooms.get(roomId);
}

function broadcast(roomId, message) {
  const room = getRoom(roomId);
  for (const client of room.clients) {
    if (client.readyState === 1) client.send(message);
  }
}

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const roomId = url.searchParams.get("room");
  if (!roomId) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, roomId);
  });
});

wss.on("connection", (ws, roomId) => {
  const room = getRoom(roomId);
  room.clients.add(ws);

  ws.send(JSON.stringify({ type: "lock", activeUser: room.activeUser }));

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (data?.type === "start_editing" && data?.user) {
      if (room.activeUser && room.activeUser !== data.user) {
        ws.send(JSON.stringify({ type: "lock", activeUser: room.activeUser }));
        return;
      }
      room.activeUser = data.user;
      broadcast(roomId, JSON.stringify({ type: "lock", activeUser: room.activeUser }));
      return;
    }

    if (data?.type === "stop_editing" && data?.user) {
      if (room.activeUser && room.activeUser === data.user) {
        room.activeUser = null;
        broadcast(roomId, JSON.stringify({ type: "lock", activeUser: null }));
      }
      return;
    }
  });

  ws.on("close", () => {
    room.clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`story-lock-ws listening on :${PORT}`);
});
