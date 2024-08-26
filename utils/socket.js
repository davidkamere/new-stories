import PartySocket from "partysocket";

// const PARTYKIT_HOST = "ws://127.0.0.1:1999";
const PARTYKIT_HOST = "https://stories-party.davidkamere.partykit.dev";

export const setUpSocket = () => {
    
    const conn = new PartySocket({
        host: PARTYKIT_HOST,
        room: "my-new-room",
    });



    return conn
}
