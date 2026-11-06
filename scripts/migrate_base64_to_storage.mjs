import fs from 'fs';
import { neon } from '@neondatabase/serverless';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const env = fs.readFileSync('.env.local', 'utf8');

function getEnvVar(name) {
  const match = env.match(new RegExp(`${name}="?([^"\\n]+)"?`));
  return match ? match[1] : '';
}

const dbUrl = getEnvVar('DATABASE_URL');
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
};

if (!dbUrl || !firebaseConfig.apiKey) {
  console.error("Variáveis de ambiente ausentes no .env.local.");
  process.exit(1);
}

const sql = neon(dbUrl);
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

function dataUrlToBuffer(dataUrl) {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].replace('data:', '');
  const buffer = Buffer.from(parts[1], 'base64');
  return { buffer, contentType };
}

async function migrate() {
  console.log("🔍 Verificando fotos em Base64 na tabela tb_evidencia_fotografica...");
  const rows = await sql`
    SELECT id_foto, id_diario, t_download_url, t_titulo_legenda 
    FROM tb_evidencia_fotografica 
    WHERE t_download_url LIKE 'data:image%'
  `;

  if (rows.length === 0) {
    console.log("✅ Nenhuma foto em Base64 encontrada. O banco já está 100% limpo!");
    return;
  }

  console.log(`Encontradas ${rows.length} fotos em Base64 para migrar.`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      console.log(`[${i + 1}/${rows.length}] Migrando foto ${row.id_foto}...`);
      const { buffer, contentType } = dataUrlToBuffer(row.t_download_url);
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const storagePath = `migracoes/${row.id_diario || 'geral'}/${row.id_foto}.${ext}`;
      const fileRef = ref(storage, storagePath);

      await uploadBytes(fileRef, buffer, {
        contentType,
        customMetadata: {
          id_foto: row.id_foto,
          legenda: row.t_titulo_legenda || '',
          migrado_em: new Date().toISOString()
        }
      });

      const downloadUrl = await getDownloadURL(fileRef);

      await sql`
        UPDATE tb_evidencia_fotografica 
        SET t_download_url = ${downloadUrl},
            t_storage_path = ${storagePath}
        WHERE id_foto = ${row.id_foto}
      `;

      console.log(`  -> Sucesso! Nova URL: ${downloadUrl.substring(0, 60)}...`);
    } catch (err) {
      console.warn(`  ⚠️ Falha ao migrar foto ${row.id_foto}:`, err.message);
    }
  }

  console.log("🏁 Processo de migração concluído!");
}

migrate().catch(console.error);
