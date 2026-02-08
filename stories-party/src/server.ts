import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

export default class Server implements Party.Server {
  private connUsers = new Map<string, string>();

  constructor(public room: Party.Room) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
      // A websocket just connected!
      console.log(
        `Connected:
          id: ${conn.id}
          room: ${this.room.id}
          url: ${new URL(ctx.request.url).pathname}`
      );

      const activeUser = await this.room.storage.get<string>("activeUser");
      conn.send(JSON.stringify({ type: "lock", activeUser: activeUser ?? null }));

      return onConnect(conn, this.room, {
        // experimental: persists the document to partykit's room storage
        
        persist: { mode: "snapshot" },


        // Or, you can load/save to your own database or storage
        async load(): Promise<any>  {
          // load a document from a database, or some remote resource
          // and return a Y.Doc instance here (or null if no document exists)
        },

        callback: {
          async handler(yDoc) {
            // called every few seconds after edits
            // broadcast the document to all connections in the room
          },
          // control how often handler is called with these options
          debounceWait: 10000, // default: 2000 ms
          debounceMaxWait: 20000, // default: 10000 ms
          timeout: 5000 // default: 5000 ms
        }
      });
  }

  async onMessage(message: string, sender: Party.Connection) {
      let data: any = null;
      try {
        data = JSON.parse(message);
      } catch {
        return;
      }

      if (data?.type === "start_editing" && data?.user) {
        const activeUser = await this.room.storage.get<string>("activeUser");
        // If someone else already has the lock, do not override.
        if (activeUser && activeUser !== data.user) {
          sender.send(JSON.stringify({ type: "lock", activeUser }));
          return;
        }

        this.connUsers.set(sender.id, data.user);
        await this.room.storage.put("activeUser", data.user);
        this.room.broadcast(JSON.stringify({ type: "lock", activeUser: data.user }));
        return;
      }

      if (data?.type === "stop_editing" && data?.user) {
        const activeUser = await this.room.storage.get<string>("activeUser");
        if (activeUser && activeUser === data.user) {
          await this.room.storage.delete("activeUser");
          this.room.broadcast(JSON.stringify({ type: "lock", activeUser: null }));
        }
        return;
      }
  }

  async onClose(conn: Party.Connection) {
      const user = this.connUsers.get(conn.id);
      this.connUsers.delete(conn.id);
      if (!user) return;
      const activeUser = await this.room.storage.get<string>("activeUser");
      if (activeUser && activeUser === user) {
        await this.room.storage.delete("activeUser");
        this.room.broadcast(JSON.stringify({ type: "lock", activeUser: null }));
      }
  }
}

Server satisfies Party.Worker;
