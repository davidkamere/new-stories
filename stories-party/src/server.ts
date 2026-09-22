import { DurableObject } from "cloudflare:workers";

interface Env {
  ROOM: DurableObjectNamespace;
}

export class PartyServer extends DurableObject<Env> {
  private connUsers = new Map<WebSocket, string>();

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected websocket", { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    
    // Accept the WebSocket connection
    this.ctx.acceptWebSocket(server);
    
    // Send current lock state to new connection
    const activeUser = await this.ctx.storage.get<string>("activeUser");
    server.send(JSON.stringify({ type: "lock", activeUser: activeUser ?? null }));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const msg = typeof message === "string" ? message : new TextDecoder().decode(message);
    let data: any = null;
    
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    if (data?.type === "start_editing" && data?.user) {
      const activeUser = await this.ctx.storage.get<string>("activeUser");
      if (activeUser && activeUser !== data.user) {
        ws.send(JSON.stringify({ type: "lock", activeUser }));
        return;
      }

      this.connUsers.set(ws, data.user);
      await this.ctx.storage.put("activeUser", data.user);
      this.broadcast({ type: "lock", activeUser: data.user });
      return;
    }

    if (data?.type === "stop_editing" && data?.user) {
      const activeUser = await this.ctx.storage.get<string>("activeUser");
      if (activeUser && activeUser === data.user) {
        await this.ctx.storage.delete("activeUser");
        this.broadcast({ type: "lock", activeUser: null });
      }
      return;
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const user = this.connUsers.get(ws);
    this.connUsers.delete(ws);
    
    if (!user) return;
    
    const activeUser = await this.ctx.storage.get<string>("activeUser");
    if (activeUser && activeUser === user) {
      await this.ctx.storage.delete("activeUser");
      this.broadcast({ type: "lock", activeUser: null });
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("WebSocket error:", error);
    await this.webSocketClose(ws, 1011, "Error", false);
  }

  private broadcast(message: object): void {
    const msg = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(msg);
      } catch (e) {
        console.error("Broadcast error:", e);
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === "/health") {
      return new Response("OK");
    }

    // Route to Durable Object
    const roomName = url.pathname.slice(1) || "default"; // Remove leading slash
    const id = env.ROOM.idFromName(roomName);
    const stub = env.ROOM.get(id);
    
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;