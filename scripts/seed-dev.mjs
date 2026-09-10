import { neon } from "@neondatabase/serverless";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import crypto from "crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// S3 / R2 setup
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});
const BUCKET = process.env.R2_BUCKET_NAME || "photo-party";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-7a58935c7a80408aa2977bb76ca8e1b4.r2.dev";

const UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function uploadToR2(filename, buffer, contentType) {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return `${PUBLIC_URL}/${filename}`;
  } catch (err) {
    console.warn(`R2 upload fallback to local: ${err.message}`);
    const localPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(localPath, buffer);
    return `/uploads/${filename}`;
  }
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

// Media Definitions
const PHOTO_DATA = [
  {
    urlSource: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85",
    guestName: "Família Lima",
    message: "Banquete maravilhoso! Tudo impecável para celebrar o amor de Sarah e Caio!",
    tableName: "Mesa 1",
    questTitle: null,
    likes: 24,
    comments: [
      { name: "Tia Cláudia", content: "A comida estava divina, que festa abençoada!" },
      { name: "Caio & Sarah", content: "Muito obrigado por estarem conosco!! ❤️" }
    ],
    timeOffsetMinutes: 30,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=85",
    guestName: "Lucas & Mariana",
    message: "Um brinde eterno a esse casal incrível! Vocês merecem toda a felicidade do mundo! 🥂💍",
    tableName: "Mesa dos Noivos",
    questTitle: "Momento com os Noivos",
    likes: 48,
    comments: [
      { name: "Mariana", content: "Os noivos mais radiantes que já vi!" },
      { name: "Pedro", content: "Brinde lendário!!" },
      { name: "Sarah", content: "Amamos vocês demais padrinhos! 🥰" }
    ],
    timeOffsetMinutes: 55,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=85",
    guestName: "Padrinhos da Mesa 2",
    message: "Erguendo as taças para Sarah & Caio! Viva os noivos!! 🍾✨",
    tableName: "Mesa 2",
    questTitle: "O Brinde da Mesa",
    likes: 31,
    comments: [
      { name: "Rodrigo", content: "Saúde, amor e muita prosperidade!" },
      { name: "Ana Beatriz", content: "Tim tim!! 🥂" }
    ],
    timeOffsetMinutes: 70,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=900&q=85",
    guestName: "Juliana Fotografia",
    message: "Cada detalhe planejado com tanto carinho. As alianças e o buquê mais perfeitos! 🤍",
    tableName: null,
    questTitle: null,
    likes: 39,
    comments: [
      { name: "Mãe da Noiva", content: "Ficou tudo perfeito, filha querida!" }
    ],
    timeOffsetMinutes: 85,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=900&q=85",
    guestName: "Turma da Faculdade",
    message: "Momento de pura risada na mesa 3! Festa inesquecível! 😄🎉",
    tableName: "Mesa 3",
    questTitle: "Sorriso Espontâneo",
    likes: 19,
    comments: [
      { name: "Guilherme", content: "Gargalhada sincera demais kkkkk" }
    ],
    timeOffsetMinutes: 110,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=85",
    guestName: "Patrícia Decorações",
    message: "O bolo e a mesa de doces prontos para os noivos! Uma verdadeira obra de arte! 🍰✨",
    tableName: null,
    questTitle: "Doce Tentação",
    likes: 42,
    comments: [
      { name: "Caio", content: "O bolo estava surreal de gostoso!" },
      { name: "Renata", content: "Os bem-casados acabaram em 5 minutos rsrs" }
    ],
    timeOffsetMinutes: 135,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=900&q=85",
    guestName: "Beatriz Cerimonial",
    message: "Sarah simplesmente deslumbrante! Um conto de fadas moderno! 👗👰",
    tableName: null,
    questTitle: "Look da Noite",
    likes: 65,
    comments: [
      { name: "Sarah", content: "Obrigada Bia por cada detalhe do cerimonial!" },
      { name: "Camila", content: "A noiva mais linda do planeta!!" }
    ],
    timeOffsetMinutes: 160,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=85",
    guestName: "Mesa 4 Animada",
    message: "Juntamos todo mundo da mesa 4 pra selfie oficial da noite!! 📸✌️",
    tableName: "Mesa 4",
    questTitle: "Grande Selfie Coletiva",
    likes: 27,
    comments: [
      { name: "Thiago", content: "Mesa 4 a mais animada com certeza!" }
    ],
    timeOffsetMinutes: 180,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85",
    guestName: "DJ Alex",
    message: "A pista de dança está pegando fogo com o Caio e a Sarah! Ninguém fica parado! 🕺💃",
    tableName: null,
    questTitle: "Rei ou Rainha da Pista",
    likes: 38,
    comments: [
      { name: "Felipe", content: "O Caio mandou muito no passinho!" },
      { name: "Larissa", content: "Meus pés doem de tanto dançar!" }
    ],
    timeOffsetMinutes: 210,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?auto=format&fit=crop&w=900&q=85",
    guestName: "Família Souza",
    message: "Jantar sob as luzes do jardim. Que clima acolhedor e cheio de paz!",
    tableName: "Mesa 5",
    questTitle: null,
    likes: 18,
    comments: [],
    timeOffsetMinutes: 230,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=85",
    guestName: "Padre Antônio",
    message: "Que Deus abençoe para sempre este matrimônio de Sarah e Caio.",
    tableName: "Mesa dos Noivos",
    questTitle: null,
    likes: 54,
    comments: [
      { name: "Sarah & Caio", content: "Amém! Palavras que guardaremos no coração!" }
    ],
    timeOffsetMinutes: 250,
  },
  {
    urlSource: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=85",
    guestName: "Gabi & Bruno",
    message: "A decoração noturna com luzinhas ficou um encanto! Parabéns aos noivos!",
    tableName: "Mesa 6",
    questTitle: null,
    likes: 21,
    comments: [],
    timeOffsetMinutes: 280,
  },
];

const VIDEO_DATA = [
  {
    imageSource: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=900&q=85",
    guestName: "Padrinho Marcelo",
    message: "A entrada dos noivos com os sparkles iluminando tudo! Que momento emocionante! ✨🎥",
    tableName: "Mesa dos Noivos",
    questTitle: "Rei ou Rainha da Pista",
    likes: 57,
    comments: [
      { name: "Mariana", content: "Esse vídeo ficou cinematográfico!!" },
      { name: "Caio", content: "Foi o momento mais mágico da minha vida!" }
    ],
    timeOffsetMinutes: 100,
  },
  {
    imageSource: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=85",
    guestName: "Primos da Sarah",
    message: "O brinde mais animado da festa gravado ao vivo! 🥂🍾",
    tableName: "Mesa 2",
    questTitle: "O Brinde da Mesa",
    likes: 33,
    comments: [
      { name: "Tio Jorge", content: "Saúdeeeee!" }
    ],
    timeOffsetMinutes: 120,
  },
  {
    imageSource: "https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=900&q=85",
    guestName: "Camila Daminha",
    message: "Primeira dança de Caio e Sarah... chorei de emoção! 🤍💃🕺",
    tableName: "Mesa 1",
    questTitle: "Momento com os Noivos",
    likes: 62,
    comments: [
      { name: "Sarah", content: "Minha música favorita da vida com meu amor!" }
    ],
    timeOffsetMinutes: 170,
  },
  {
    imageSource: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85",
    guestName: "Galera do Padel",
    message: "A pista pegando fogo às 23h! Ninguém quer ir embora! 🔥🕺",
    tableName: "Mesa 7",
    questTitle: "Rei ou Rainha da Pista",
    likes: 44,
    comments: [
      { name: "Leo", content: "Melhor festa do ano com folga!" }
    ],
    timeOffsetMinutes: 270,
  }
];

async function main() {
  console.log("Starting dev database seeding for Caio & Sarah wedding...");

  // 1. Get Event
  const [event] = await sql`SELECT id, slug, title FROM events WHERE slug = 'caio-e-sarah' LIMIT 1`;
  if (!event) {
    console.error("Event caio-e-sarah not found. Please run migrations first.");
    process.exit(1);
  }
  console.log(`Target Event: ${event.title} (${event.id})`);

  // 2. Map Tables and Quests
  const dbTables = await sql`SELECT id, identifier FROM tables WHERE event_id = ${event.id}`;
  const tableMap = new Map();
  for (const t of dbTables) {
    tableMap.set(t.identifier, t.id);
  }

  const dbQuests = await sql`SELECT id, title FROM photo_quests WHERE event_id = ${event.id}`;
  const questMap = new Map();
  for (const q of dbQuests) {
    questMap.set(q.title, q.id);
  }

  // Base time: 11 de Dezembro de 2026 às 15:30h
  const baseTime = new Date("2026-12-11T15:30:00-03:00").getTime();

  // 3. Process and Insert Photos
  console.log(`\n--- Seeding ${PHOTO_DATA.length} Stock Photos ---`);
  for (let i = 0; i < PHOTO_DATA.length; i++) {
    const item = PHOTO_DATA[i];
    const photoId = crypto.randomUUID();
    const tempFile = `/tmp/stock_photo_${i}.jpg`;
    const finalFilename = `photo_${photoId}.jpg`;

    console.log(`[${i + 1}/${PHOTO_DATA.length}] Downloading photo for: ${item.guestName}...`);
    await downloadFile(item.urlSource, tempFile);

    // Save locally
    const buffer = fs.readFileSync(tempFile);
    fs.writeFileSync(path.join(UPLOADS_DIR, finalFilename), buffer);

    // Upload to R2
    const publicUrl = await uploadToR2(finalFilename, buffer, "image/jpeg");

    const photoCreatedAt = new Date(baseTime + item.timeOffsetMinutes * 60 * 1000);
    const tableId = item.tableName ? tableMap.get(item.tableName) || null : null;
    const questId = item.questTitle ? questMap.get(item.questTitle) || null : null;

    await sql`
      INSERT INTO photos (
        id, event_id, table_id, quest_id, quest_title, guest_name, guest_session_id,
        message, media_type, storage_path, url, status, created_at
      ) VALUES (
        ${photoId}, ${event.id}, ${tableId}, ${questId}, ${item.questTitle},
        ${item.guestName}, ${crypto.randomUUID()}, ${item.message}, 'photo',
        ${finalFilename}, ${publicUrl}, 'approved', ${photoCreatedAt}
      )
    `;

    // Seed Likes
    for (let l = 0; l < item.likes; l++) {
      await sql`
        INSERT INTO photo_likes (id, photo_id, guest_session_id, created_at)
        VALUES (${crypto.randomUUID()}, ${photoId}, ${crypto.randomUUID()}, ${photoCreatedAt})
      `;
    }

    // Seed Comments
    for (const c of item.comments) {
      await sql`
        INSERT INTO photo_comments (id, photo_id, guest_session_id, guest_name, content, created_at)
        VALUES (${crypto.randomUUID()}, ${photoId}, ${crypto.randomUUID()}, ${c.name}, ${c.content}, ${photoCreatedAt})
      `;
    }

    try { fs.unlinkSync(tempFile); } catch (e) {}
  }

  // 4. Process and Insert Videos
  console.log(`\n--- Seeding ${VIDEO_DATA.length} Stock Wedding Videos ---`);
  for (let i = 0; i < VIDEO_DATA.length; i++) {
    const item = VIDEO_DATA[i];
    const videoId = crypto.randomUUID();
    const tempImg = `/tmp/stock_vid_src_${i}.jpg`;
    const tempVid = `/tmp/stock_vid_${videoId}.mp4`;
    const finalFilename = `video_${videoId}.mp4`;

    console.log(`[${i + 1}/${VIDEO_DATA.length}] Generating MP4 video clip for: ${item.guestName}...`);
    await downloadFile(item.imageSource, tempImg);

    // Generate fluid 6-second portrait 3:4 video (720x960, 30fps H.264)
    execSync(
      `ffmpeg -y -loop 1 -i "${tempImg}" -vf "scale=800:1066,zoompan=z='min(zoom+0.0012,1.15)':d=180:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x960:fps=30" -c:v libx264 -t 6 -pix_fmt yuv420p "${tempVid}"`,
      { stdio: "ignore" }
    );

    const videoBuffer = fs.readFileSync(tempVid);
    fs.writeFileSync(path.join(UPLOADS_DIR, finalFilename), videoBuffer);

    // Upload to R2
    const publicUrl = await uploadToR2(finalFilename, videoBuffer, "video/mp4");

    const videoCreatedAt = new Date(baseTime + item.timeOffsetMinutes * 60 * 1000);
    const tableId = item.tableName ? tableMap.get(item.tableName) || null : null;
    const questId = item.questTitle ? questMap.get(item.questTitle) || null : null;

    await sql`
      INSERT INTO photos (
        id, event_id, table_id, quest_id, quest_title, guest_name, guest_session_id,
        message, media_type, storage_path, url, status, created_at
      ) VALUES (
        ${videoId}, ${event.id}, ${tableId}, ${questId}, ${item.questTitle},
        ${item.guestName}, ${crypto.randomUUID()}, ${item.message}, 'video',
        ${finalFilename}, ${publicUrl}, 'approved', ${videoCreatedAt}
      )
    `;

    // Seed Likes
    for (let l = 0; l < item.likes; l++) {
      await sql`
        INSERT INTO photo_likes (id, photo_id, guest_session_id, created_at)
        VALUES (${crypto.randomUUID()}, ${videoId}, ${crypto.randomUUID()}, ${videoCreatedAt})
      `;
    }

    // Seed Comments
    for (const c of item.comments) {
      await sql`
        INSERT INTO photo_comments (id, photo_id, guest_session_id, guest_name, content, created_at)
        VALUES (${crypto.randomUUID()}, ${videoId}, ${crypto.randomUUID()}, ${c.name}, ${c.content}, ${videoCreatedAt})
      `;
    }

    try { fs.unlinkSync(tempImg); } catch (e) {}
    try { fs.unlinkSync(tempVid); } catch (e) {}
  }

  // 5. Seed Real-Time Chat Messages
  console.log(`\n--- Seeding Live Chat Messages ---`);
  const chatSeeds = [
    { name: "Padrinho Lucas", table: "Mesa dos Noivos", text: "Que cerimônia emocionante!! Viva o casal mais lindo!" },
    { name: "Tia Regina", table: "Mesa 1", text: "Sarah você estava parecendo uma princesa de conto de fadas! ❤️" },
    { name: "Felipe", table: "Mesa 3", text: "Quem aí já foi no buffet de massas? Está sensacional!!" },
    { name: "Bruna", table: "Mesa 4", text: "Caio, parabéns meu irmão! Você merece toda felicidade do mundo!" },
    { name: "DJ Alex", table: "Pista de Dança", text: "Partiu pista de dança galera! A noite só tá começando! 🎶🎉" },
    { name: "Sarah & Caio", table: "Mesa dos Noivos", text: "Obrigado de coração a cada um de vocês que veio comemorar com a gente! Amamos todos vocês! ✨💍" },
  ];

  for (let i = 0; i < chatSeeds.length; i++) {
    const msg = chatSeeds[i];
    const msgTime = new Date(baseTime + (i * 35 + 20) * 60 * 1000);
    await sql`
      INSERT INTO chat_messages (id, event_id, guest_session_id, guest_name, table_identifier, message, created_at)
      VALUES (${crypto.randomUUID()}, ${event.id}, ${crypto.randomUUID()}, ${msg.name}, ${msg.table}, ${msg.text}, ${msgTime})
    `;
  }

  const finalCount = await sql`SELECT count(*) FROM photos WHERE event_id = ${event.id}`;
  const videoCount = await sql`SELECT count(*) FROM photos WHERE event_id = ${event.id} AND media_type = 'video'`;
  const photoCount = await sql`SELECT count(*) FROM photos WHERE event_id = ${event.id} AND media_type = 'photo'`;
  console.log(`\n✅ Seeding complete! Total media in database: ${finalCount[0].count} (${photoCount[0].count} photos, ${videoCount[0].count} videos).`);
}

main().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
