import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

export default class Server implements Party.Server {
  constructor(public room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
      // A websocket just connected!
      console.log(
        `Connected:
          id: ${conn.id}
          room: ${this.room.id}
          url: ${new URL(ctx.request.url).pathname}`
      );

      const my = this;

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

  onMessage(message: string, sender: Party.Connection) {
      // let's log the message
      if (message === "clearChannel"){
          console.log("clearing channel")
      }

      if (message === "saveEdits"){
          console.log("saving edits")
      }

      if (message === "deleteEdits"){
          console.log("deleting edits")
      }

      // console.log(`connection ${sender.id} sent message: ${message}`);
      // as well as broadcast it to all the other connections in the room...
      this.room.broadcast(
        `${sender.id}: ${message}`,
        // ...except for the connection it came from
        [sender.id]
      );
  }
}

Server satisfies Party.Worker;
