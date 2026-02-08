import PartySocket from "partysocket";

const LOCAL_PARTYKIT_HOST = "ws://127.0.0.1:1999";
const REMOTE_PARTYKIT_HOST = "https://stories-party.davidkamere.partykit.dev";
const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || REMOTE_PARTYKIT_HOST;

export const setUpSocket = (roomId) => {
    const conn = new PartySocket({
        host: PARTYKIT_HOST || LOCAL_PARTYKIT_HOST,
        room: roomId,
    });

    return conn;
};
