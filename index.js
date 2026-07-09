import express from "express";
import fs from "fs-extra";
import pino from "pino";
import path from "path";
import { fileURLToPath } from "url";
import { makeid } from "./gen-id.js";
import { upload } from "./mega.js";

import pkg from "@whiskeysockets/baileys";
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore
} = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const router = express.Router();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/", router);

async function removeFile(folderPath) {
  if (await fs.pathExists(folderPath)) {
    await fs.remove(folderPath);
  }
}

router.get("/pair", async (req, res) => {
  const id = makeid();
  let num = req.query.number;

  if (!num) {
    return res.json({ code: "❗ Please enter a valid number" });
  }

  num = String(num).replace(/\D/g, "");

  if (num.length < 10) {
    return res.json({ code: "❗ Number is too short" });
  }

  const sessionPath = path.join(__dirname, "temp", id);

  try {
    await removeFile(sessionPath);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          pino({ level: "silent" })
        )
      },
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "120.0.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    if (!state.creds.registered) {
      await delay(5000);

      const code = await sock.requestPairingCode(num);

      return res.json({
        code: code?.match(/.{1,4}/g)?.join("-") || code
      });
    }

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
      if (connection === "open") {
        try {
          await delay(3000);

          const credsPath = path.join(sessionPath, "creds.json");

          if (await fs.pathExists(credsPath)) {
            const megaUrl = await upload(
              fs.createReadStream(credsPath),
              `${sock.user?.id || num}.json`
            );

            const sessionId = megaUrl.replace(
              "https://mega.nz/file/",
              ""
            );

            await sock.sendMessage(sock.user.id, {
              text:
`🚀 *FUSÉE MD CONNECTED*

🔑 Session ID

${sessionId}

© Weed-Tech`
            });
          }
        } catch (e) {
          console.log(e);
        }

        await removeFile(sessionPath);
      }

      if (connection === "close") {
        const reason = lastDisconnect?.error?.output?.statusCode;

        if (reason === 401) {
          await removeFile(sessionPath);
        }
      }
    });

  } catch (err) {
    console.log(err);
    await removeFile(sessionPath);

    if (!res.headersSent) {
      res.json({
        code: "❗ Internal Server Error"
      });
    }
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
