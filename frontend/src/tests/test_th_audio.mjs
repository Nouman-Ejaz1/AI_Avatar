import { TalkingHead } from "./talkinghead.mjs";
const th = new TalkingHead(null);
console.log(th.audioCtx ? "Has audioCtx" : "No audioCtx");
