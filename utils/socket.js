const isBrowser = typeof window !== "undefined";

const LOCAL_WS_HOST = "ws://127.0.0.1:1999";
const REMOTE_WS_HOST = "wss://stories-party.davidkamere.partykit.dev";
const RAW_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || REMOTE_WS_HOST;

function toWsUrl(host, roomId) {
  let base = host;
  if (base.startsWith("https://")) base = base.replace("https://", "wss://");
  if (base.startsWith("http://")) base = base.replace("http://", "ws://");
  if (!base.startsWith("ws://") && !base.startsWith("wss://")) {
    base = `wss://${base}`;
  }
  return `${base}/ws?room=${encodeURIComponent(roomId)}`;
}

export const setUpSocket = (roomId) => {
  const host = RAW_HOST || LOCAL_WS_HOST;
  const url = toWsUrl(host, roomId);
  if (!isBrowser) return null;
  return new WebSocket(url);
};
