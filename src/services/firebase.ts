import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL, type FirebaseStorage } from "firebase/storage";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isConfiguredFirebase = Boolean(apiKey && !apiKey.includes("MockKey"));

const firebaseConfig = {
  apiKey: apiKey || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "obrahub-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "obrahub-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "obrahub-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:mock123",
};

// Inicialização segura: só inicializa o Firebase se houver credenciais reais configuradas
export const app: FirebaseApp | null = isConfiguredFirebase
  ? (getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const storage: FirebaseStorage | null = app ? getStorage(app) : null;

/**
 * Lê o arquivo cru como Data URL sem compressão (fallback seguro)
 */
function rawFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Redimensiona e comprime imagens via Canvas para otimização de armazenamento no fallback local.
 * Limita largura/altura a 1280px e codifica em JPEG com qualidade 0.75 (~50KB-100KB por foto),
 * evitando strings gigantes em Base64 inflando o banco PostgreSQL Neon e excedendo cotas de egress.
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 1280,
  quality = 0.75
): Promise<string> {
  // Se não for imagem ou se estiver fora do browser (ex: SSR), faz fallback seguro
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return rawFileToDataUrl(file);
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Redimensiona proporcionalmente caso exceda o limite de largura ou altura
        if (width > maxWidth || height > maxWidth) {
          if (width >= height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          rawFileToDataUrl(file).then(resolve).catch(() => resolve(""));
          return;
        }

        // Desenha a imagem redimensionada no canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Exporta como JPEG com compressão
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn("Falha ao comprimir imagem no canvas, usando arquivo original:", err);
        rawFileToDataUrl(file).then(resolve).catch(() => resolve(""));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      rawFileToDataUrl(file).then(resolve).catch(() => resolve(""));
    };

    img.src = objectUrl;
  });
}

/**
 * Converte um arquivo File em Data URL (Base64) com compressão inteligente para exibição e armazenamento seguro offline
 */
export async function fileToDataUrl(
  file: File,
  maxWidth = 1280,
  quality = 0.75
): Promise<string> {
  return compressImageToDataUrl(file, maxWidth, quality);
}

/**
 * Upload de fotos de evidência:
 * - Se as credenciais do Firebase estiverem configuradas, envia para o Firebase Storage.
 * - Caso contrário (desenvolvimento local/offline), comprime via Canvas (max 1280px, JPEG 0.75)
 *   e gera Data URL Base64 compacta persistível no banco Neon sem estourar cotas.
 */
export async function uploadMissionPhoto(
  idRelatorio: string,
  file: File,
  legenda: string
): Promise<{ downloadUrl: string; storagePath: string }> {
  // Se não houver chaves reais de Firebase configuradas, usa compressão e conversão local
  if (!isConfiguredFirebase || !storage) {
    const dataUrl = await fileToDataUrl(file, 1280, 0.75);
    return {
      downloadUrl: dataUrl,
      storagePath: `local/${idRelatorio}/${file.name}`
    };
  }

  try {
    const storagePath = `relatorios/${idRelatorio}/fotos/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, storagePath);
    
    const snapshot = await uploadBytes(fileRef, file, {
      customMetadata: { legenda, idRelatorio },
    });
    
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { downloadUrl, storagePath };
  } catch (err) {
    console.warn("Firebase Storage indisponível ou sem permissão de CORS, gerando Data URL local comprimida:", err);
    const dataUrl = await fileToDataUrl(file, 1280, 0.75);
    return {
      downloadUrl: dataUrl,
      storagePath: `local/${file.name}`
    };
  }
}
