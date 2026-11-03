import { db } from "../src/lib/firebase.js";

await db.collection("test").doc("ping").set({ ok: true });
console.log("Firestore connected");
