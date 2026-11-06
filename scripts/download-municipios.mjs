import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function download() {
  console.log('Baixando municípios do IBGE...');
  const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado');
  const data = await res.json();
  
  // Ordena por nome
  data.sort((a, b) => a['municipio-nome'].localeCompare(b['municipio-nome']));

  const list = data.map(m => ({
    cidade: m['municipio-nome'],
    uf: m['UF-sigla'],
    label: `${m['municipio-nome']} - ${m['UF-sigla']}`
  }));

  const outDir = path.resolve(__dirname, '../src/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'municipios.json');
  fs.writeFileSync(outPath, JSON.stringify(list));
  console.log(`Sucesso! ${list.length} municípios salvos em ${outPath}`);
}

download().catch(err => {
  console.error('Erro ao baixar:', err);
  process.exit(1);
});
