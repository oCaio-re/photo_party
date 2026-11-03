/**
 * Fills the flagship Event (`caio-e-sarah`) with curated Unsplash stock media, one batch per
 * Wedding Moment, so the Live Gallery, Moment filters and Slideshow look like a real party.
 *
 * Files go to R2 exactly like Guest uploads (`<uuid>.webp` / `<uuid>.mp4`). Rows are tagged with
 * a `stock-seed-` guest_session_id, so re-running replaces the previous batch instead of piling up.
 *
 *   node --env-file=.env.local scripts/seed-stock.mjs          # replace stock media
 *   node --env-file=.env.local scripts/seed-stock.mjs --remove # only remove stock media
 *
 * Requires ImageMagick (`magick`) and `ffmpeg` on PATH.
 */
import { neon } from "@neondatabase/serverless";
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const EVENT_SLUG = "caio-e-sarah";
const SESSION_PREFIX = "stock-seed-";
const EVENT_DAY = "2026-12-11";

for (const name of ["DATABASE_URL", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"]) {
  if (!process.env[name]) {
    console.error(`${name} not set`);
    process.exit(1);
  }
}

const sql = neon(process.env.DATABASE_URL);
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL.replace(/\/$/, "");

/** `time` is Brasília wall-clock; times after midnight roll into the next day. */
const MEDIA = [
  // Cerimônia (15:00–17:00)
  { unsplash: "1469371670807-013ccf25f16a", moment: "cerimonia", time: "15:05", guest: "Família Lima", table: "Mesa 1", message: "Chegamos cedinho e o altar já está um sonho! 🌸", likes: 18, comments: [["Tia Cláudia", "Que decoração mais delicada!"]] },
  { unsplash: "1519657337289-077653f724ed", moment: "cerimonia", time: "15:12", guest: "Beatriz Cerimonial", quest: "Look da Noite", message: "O vestido esperando a noiva... 🤍", likes: 41, comments: [["Camila", "Que vestido, meu Deus 😍"], ["Sarah", "Bia, você pensou em tudo!"]] },
  { unsplash: "1507915977619-6ccfe8003ae6", moment: "cerimonia", time: "15:34", guest: "Tio Jorge", table: "Mesa 2", message: "Lá vem a noiva!! Todo mundo de pé 👏", likes: 27, comments: [] },
  { unsplash: "1465495976277-4387d4b0b4c6", moment: "cerimonia", time: "15:52", guest: "Madrinha Carol", table: "Mesa dos Noivos", quest: "Momento com os Noivos", message: "A troca das alianças. Não segurei as lágrimas 💍", likes: 56, comments: [["Mãe da Noiva", "Momento mais lindo da minha vida ❤️"], ["Pedro", "Chorei junto"]] },
  { unsplash: "1583939003579-730e3918a45a", moment: "cerimonia", time: "16:18", guest: "Lucas & Mariana", table: "Mesa dos Noivos", quest: "Momento com os Noivos", message: "CASADOS!!! Chuva de pétalas pro casal mais lindo 🎉", likes: 72, comments: [["Caio", "Melhor dia da minha vida!"], ["Renata", "Que foto perfeita!!"], ["Thiago", "Viva os noivos!"]] },
  { unsplash: "1525258946800-98cfd641d0de", moment: "cerimonia", time: "16:41", guest: "Juliana", table: "Mesa 3", message: "Esse buquê merece uma foto só pra ele 💐", likes: 23, comments: [["Patrícia Decorações", "Peônias e rosas inglesas ✨"]] },

  // Recepção e Fotos (17:00–19:00)
  { unsplash: "1606216794074-735e91aa2c92", moment: "recepcao", time: "17:06", guest: "Pedro Henrique", table: "Mesa 4", quest: "Momento com os Noivos", message: "Flagrei os noivos fugindo pra sessão de fotos 📸", likes: 38, comments: [["Sarah", "Fomos pegos kkkk"]] },
  { unsplash: "1527529482837-4698179dc6ce", moment: "recepcao", time: "17:24", guest: "Turma da Faculdade", table: "Mesa 3", quest: "O Brinde da Mesa", message: "Primeiro brinde da noite debaixo das luzinhas 🥂", likes: 31, comments: [["Guilherme", "Saúde!!"], ["Ana Beatriz", "Turma unida sempre"]] },
  { unsplash: "1528605248644-14dd04022da1", moment: "recepcao", time: "17:48", guest: "Primos da Sarah", table: "Mesa 5", quest: "Sorriso Espontâneo", message: "Mesa 5 já chegou rindo de tudo 😂", likes: 22, comments: [["Bruna", "A melhor mesa, sem discussão"]] },
  { unsplash: "1591604466107-ec97de577aff", moment: "recepcao", time: "18:09", guest: "Vovó Lourdes", table: "Mesa 1", message: "Meus netos lindos. Que Deus abençoe essa união 🙏", likes: 64, comments: [["Caio & Sarah", "Te amamos, vó! ❤️"]] },
  { unsplash: "1470337458703-46ad1756a187", moment: "recepcao", time: "18:31", guest: "Rafa", table: "Mesa 6", message: "O drink do bar tá perigoso de tão bom 🍹", likes: 15, comments: [["Leo", "Já tô no terceiro"]] },
  { unsplash: "1550784718-990c6de52adf", moment: "recepcao", time: "18:47", guest: "Ana Beatriz", table: "Mesa 3", quest: "Look da Noite", message: "Cenário de filme pra esse casal ✨", likes: 47, comments: [["Mariana", "Parece capa de revista"]] },

  // Jantar Especial (19:00–20:30)
  { unsplash: "1519225421980-715cb0215aed", moment: "jantar", time: "19:02", guest: "Patrícia Decorações", message: "Mesas prontas para o jantar. Cada detalhe com carinho 🌿", likes: 29, comments: [["Mãe da Noiva", "Ficou exatamente como sonhamos!"]] },
  { unsplash: "1525772764200-be829a350797", moment: "jantar", time: "19:14", guest: "Família Souza", table: "Mesa 5", message: "Velas, flores e boa companhia. Que clima gostoso!", likes: 17, comments: [] },
  { unsplash: "1414235077428-338989a2e8c0", moment: "jantar", time: "19:38", guest: "Guilherme", table: "Mesa 3", message: "Alguém sabe o nome do chef? Esse prato tá surreal 🤤", likes: 26, comments: [["Felipe", "Repeti duas vezes"], ["Larissa", "O risoto também!"]] },
  { unsplash: "1510812431401-41d2bd2722f3", moment: "jantar", time: "19:56", guest: "Padrinhos da Mesa 2", table: "Mesa 2", quest: "O Brinde da Mesa", message: "Tim-tim aos noivos! 🍷", likes: 33, comments: [["Rodrigo", "Saúde, amor e prosperidade!"]] },
  { unsplash: "1530023367847-a683933f4172", moment: "jantar", time: "20:12", guest: "Camila", table: "Mesa 7", message: "Essa mesa comprida ficou um charme", likes: 14, comments: [] },

  // Bolo e Brinde (20:30–21:30)
  { unsplash: "1535254973040-607b474cb50d", moment: "bolo", time: "20:34", guest: "Renata", quest: "Doce Tentação", message: "O BOLO!!! Quatro andares de pura arte 🎂", likes: 58, comments: [["Caio", "Estava surreal de gostoso!"], ["Tia Cláudia", "Quero a receita"]] },
  { unsplash: "1623428454614-abaf00244e52", moment: "bolo", time: "20:49", guest: "Tia Cláudia", table: "Mesa 1", quest: "Doce Tentação", message: "Esse com frutas vermelhas eu não resisti 🍓", likes: 24, comments: [] },
  { unsplash: "1519671482749-fd09be7ccebf", moment: "bolo", time: "21:01", guest: "Padrinho Marcelo", table: "Mesa dos Noivos", quest: "O Brinde da Mesa", message: "Brinde oficial dos padrinhos! Viva Caio & Sarah 🥂", likes: 45, comments: [["Sarah", "Amamos vocês padrinhos! 🥰"]] },
  { unsplash: "1488477181946-6428a0291777", moment: "bolo", time: "21:09", guest: "Bruna", table: "Mesa 4", quest: "Doce Tentação", message: "Mesa de doces atacada em 5 minutos rsrs", likes: 21, comments: [["Renata", "Os bem-casados sumiram!"]] },
  { unsplash: "1563729784474-d77dbb933a9e", moment: "bolo", time: "21:19", guest: "Larissa", table: "Mesa 6", message: "Cupcakes lindos demais pra comer... comi mesmo assim 🧁", likes: 19, comments: [] },

  // Início da Festa (21:30–23:30)
  { unsplash: "1517457373958-b7bdd4587205", moment: "festa", time: "21:38", guest: "Mesa 4 Animada", table: "Mesa 4", quest: "Grande Selfie Coletiva", message: "A pista abriu e ninguém ficou sentado! 🎉", likes: 34, comments: [["Thiago", "Mesa 4 a mais animada com certeza"]] },
  { unsplash: "1470225620780-dba8ba36b745", moment: "festa", time: "21:46", guest: "DJ Alex", message: "Bora que a noite só tá começando! 🎶", likes: 28, comments: [["Felipe", "Solta o funk, DJ!"]] },
  { unsplash: "1566737236500-c8ac43014a67", moment: "festa", time: "22:14", guest: "Felipe", table: "Mesa 3", quest: "Rei ou Rainha da Pista", message: "O Caio mandou muito no passinho 🕺", likes: 39, comments: [["Caio", "Treinei um mês pra isso kkk"], ["Larissa", "Meus pés doem de tanto dançar!"]] },
  { unsplash: "1541532713592-79a0317b6b77", moment: "festa", time: "22:41", guest: "Galera do Padel", table: "Mesa 7", quest: "Grande Selfie Coletiva", message: "Brinde da galera no meio da pista 🍻", likes: 26, comments: [["Leo", "Melhor festa do ano com folga!"]] },
  { unsplash: "1529634806980-85c3dd6d34ac", moment: "festa", time: "22:57", guest: "Sarah", table: "Mesa dos Noivos", quest: "Momento com os Noivos", message: "Marido 🤍", likes: 81, comments: [["Caio", "Esposa ❤️"], ["Madrinha Carol", "Não aguento esses dois"]] },
  { unsplash: "1429962714451-bb934ecdc4ec", moment: "festa", time: "23:12", guest: "Thiago", table: "Mesa 8", quest: "Rei ou Rainha da Pista", message: "Coraçãozinho pros noivos lá da pista ❤️🙌", likes: 20, comments: [] },

  // Encerramento (23:30–02:00)
  { unsplash: "1591969851586-adbbd4accf81", moment: "encerramento", time: "23:42", guest: "Camila Daminha", table: "Mesa 1", message: "A última dança deles foi de tirar o fôlego", likes: 52, comments: [["Sarah", "Nossa música ❤️"]] },
  { unsplash: "1595407753234-0882f1e77954", moment: "encerramento", time: "00:08", guest: "Mãe da Noiva", table: "Mesa dos Noivos", message: "A saída dos noivos debaixo de confete! Que noite! ✨", likes: 66, comments: [["Pedro Henrique", "Final perfeito!"], ["Tio Jorge", "Felicidades ao casal!"]] },
  { unsplash: "1607190074257-dd4b7af0309f", moment: "encerramento", time: "00:41", guest: "Caio & Sarah", table: "Mesa dos Noivos", message: "Obrigado a cada um de vocês por fazer parte do nosso dia. Amamos vocês! 💍", likes: 93, comments: [["Família Lima", "Nós que agradecemos! ❤️"], ["Turma da Faculdade", "Felicidades eternas!"]] },

  // Video Clips (Ken Burns over a still, like a short phone clip)
  { unsplash: "1606490194859-07c18c9f0968", video: true, moment: "recepcao", time: "18:20", guest: "Fotógrafo", quest: "Momento com os Noivos", message: "Golden hour com os noivos 🌅🎥", likes: 61, comments: [["Mariana", "Ficou cinematográfico!!"]] },
  { unsplash: "1496337589254-7e19d01cec44", video: true, moment: "festa", time: "22:30", guest: "Primos da Sarah", table: "Mesa 5", quest: "Rei ou Rainha da Pista", message: "A pista pegando fogo às 22h30! 🔥", likes: 37, comments: [["Bruna", "Ninguém quer ir embora!"]] },
  { unsplash: "1573676048035-9c2a72b6a12a", video: true, moment: "encerramento", time: "00:15", guest: "Padrinho Marcelo", table: "Mesa dos Noivos", message: "Chuva de arroz na saída! 🍚✨", likes: 44, comments: [["Caio", "Saímos com arroz até no sapato kkkk"]] },
];

function brasiliaDate(time) {
  const [h] = time.split(":").map(Number);
  const day = new Date(`${EVENT_DAY}T00:00:00-03:00`);
  if (h < 12) day.setUTCDate(day.getUTCDate() + 1);
  const [y, mo, d] = [day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate()];
  const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T${time}:00-03:00`;
  return new Date(iso);
}

async function download(unsplashId, destPath) {
  const url = `https://images.unsplash.com/photo-${unsplashId}?auto=format&fit=crop&w=1200&h=1600&q=85&fm=jpg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unsplash ${unsplashId}: HTTP ${res.status}`);
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

async function removeStockMedia(eventId) {
  const rows = await sql`
    SELECT storage_path FROM photos
    WHERE event_id = ${eventId} AND guest_session_id LIKE ${SESSION_PREFIX + "%"}
  `;
  if (rows.length > 0) {
    await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: rows.map((r) => ({ Key: r.storage_path })) },
    }));
  }
  // Likes and comments cascade
  await sql`DELETE FROM photos WHERE event_id = ${eventId} AND guest_session_id LIKE ${SESSION_PREFIX + "%"}`;
  console.log(`Removed ${rows.length} previous stock media`);
}

async function main() {
  const [event] = await sql`SELECT id, title FROM events WHERE slug = ${EVENT_SLUG} LIMIT 1`;
  if (!event) throw new Error(`Event ${EVENT_SLUG} not found. Run npm run db:init first.`);
  console.log(`Target Event: ${event.title} (${event.id})`);

  await removeStockMedia(event.id);
  if (process.argv.includes("--remove")) return;

  const tableIds = new Map((await sql`SELECT id, identifier FROM tables WHERE event_id = ${event.id}`).map((t) => [t.identifier, t.id]));
  const questIds = new Map((await sql`SELECT id, title FROM photo_quests WHERE event_id = ${event.id}`).map((q) => [q.title, q.id]));

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "photo-party-stock-"));
  try {
    for (const [i, item] of MEDIA.entries()) {
      const id = crypto.randomUUID();
      const source = path.join(workDir, `${id}.jpg`);
      await download(item.unsplash, source);

      let key, contentType;
      if (item.video) {
        key = `${id}.mp4`;
        contentType = "video/mp4";
        // 6s portrait 3:4 slow zoom, muted, like a short phone clip
        execFileSync("ffmpeg", [
          "-y", "-loop", "1", "-i", source,
          "-vf", "scale=1200:1600,zoompan=z='min(zoom+0.0010,1.15)':d=180:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x960:fps=30",
          "-c:v", "libx264", "-t", "6", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
          path.join(workDir, key),
        ], { stdio: "ignore" });
      } else {
        key = `${id}.webp`;
        contentType = "image/webp";
        // Mirrors client-side compression: WebP, long edge capped
        execFileSync("magick", [source, "-resize", "1600x1600>", "-quality", "82", path.join(workDir, key)]);
      }

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fs.readFileSync(path.join(workDir, key)),
        ContentType: contentType,
      }));

      const createdAt = brasiliaDate(item.time);
      const tableId = item.table ? tableIds.get(item.table) ?? null : null;
      const questId = item.quest ? questIds.get(item.quest) ?? null : null;

      await sql`
        INSERT INTO photos (
          id, event_id, table_id, quest_id, quest_title, guest_name, guest_session_id,
          message, media_type, storage_path, url, status, moment, created_at
        ) VALUES (
          ${id}, ${event.id}, ${tableId}, ${questId}, ${item.quest ?? null}, ${item.guest},
          ${SESSION_PREFIX + crypto.randomUUID()}, ${item.message}, ${item.video ? "video" : "photo"},
          ${key}, ${`${PUBLIC_URL}/${key}`}, 'approved', ${item.moment}, ${createdAt}
        )
      `;

      await sql`
        INSERT INTO photo_likes (id, photo_id, guest_session_id, created_at)
        SELECT gen_random_uuid()::text, ${id}, ${SESSION_PREFIX} || gen_random_uuid()::text,
               ${createdAt}::timestamp + (n || ' minutes')::interval
        FROM generate_series(1, ${item.likes}) AS n
      `;

      for (const [c, [name, content]] of item.comments.entries()) {
        const commentedAt = new Date(createdAt.getTime() + (c + 1) * 4 * 60 * 1000);
        await sql`
          INSERT INTO photo_comments (id, photo_id, guest_session_id, guest_name, content, created_at)
          VALUES (${crypto.randomUUID()}, ${id}, ${SESSION_PREFIX + crypto.randomUUID()}, ${name}, ${content}, ${commentedAt})
        `;
      }

      console.log(`[${i + 1}/${MEDIA.length}] ${item.moment.padEnd(12)} ${item.video ? "video" : "photo"} ${item.guest}`);
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }

  const [{ total }] = await sql`SELECT count(*)::int AS total FROM photos WHERE event_id = ${event.id}`;
  console.log(`\nDone. ${MEDIA.length} stock media seeded; Event now has ${total} media.`);
}

main().catch((err) => {
  console.error("Stock seed failed:", err);
  process.exit(1);
});
