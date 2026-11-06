import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cidadesInternacionaisDestaque = [
  // América do Sul
  { localidade: 'Santa Cruz de la Sierra', pais: 'Bolívia', continente: 'América do Sul' },
  { localidade: 'La Paz', pais: 'Bolívia', continente: 'América do Sul' },
  { localidade: 'Cobija', pais: 'Bolívia', continente: 'América do Sul' },
  { localidade: 'Guayaramerín', pais: 'Bolívia', continente: 'América do Sul' },
  { localidade: 'Assunção', pais: 'Paraguai', continente: 'América do Sul' },
  { localidade: 'Ciudad del Este', pais: 'Paraguai', continente: 'América do Sul' },
  { localidade: 'Pedro Juan Caballero', pais: 'Paraguai', continente: 'América do Sul' },
  { localidade: 'Buenos Aires', pais: 'Argentina', continente: 'América do Sul' },
  { localidade: 'Córdoba', pais: 'Argentina', continente: 'América do Sul' },
  { localidade: 'Puerto Iguazú', pais: 'Argentina', continente: 'América do Sul' },
  { localidade: 'Montevidéu', pais: 'Uruguai', continente: 'América do Sul' },
  { localidade: 'Rivera', pais: 'Uruguai', continente: 'América do Sul' },
  { localidade: 'Lima', pais: 'Peru', continente: 'América do Sul' },
  { localidade: 'Iquitos', pais: 'Peru', continente: 'América do Sul' },
  { localidade: 'Pucallpa', pais: 'Peru', continente: 'América do Sul' },
  { localidade: 'Santiago', pais: 'Chile', continente: 'América do Sul' },
  { localidade: 'Bogotá', pais: 'Colômbia', continente: 'América do Sul' },
  { localidade: 'Letícia', pais: 'Colômbia', continente: 'América do Sul' },
  { localidade: 'Caracas', pais: 'Venezuela', continente: 'América do Sul' },
  { localidade: 'Santa Elena de Uairén', pais: 'Venezuela', continente: 'América do Sul' },
  { localidade: 'Georgetown', pais: 'Guiana', continente: 'América do Sul' },
  { localidade: 'Paramaribo', pais: 'Suriname', continente: 'América do Sul' },

  // África
  { localidade: 'Maputo', pais: 'Moçambique', continente: 'África' },
  { localidade: 'Beira', pais: 'Moçambique', continente: 'África' },
  { localidade: 'Nampula', pais: 'Moçambique', continente: 'África' },
  { localidade: 'Tete', pais: 'Moçambique', continente: 'África' },
  { localidade: 'Chimoio', pais: 'Moçambique', continente: 'África' },
  { localidade: 'Quelimane', pais: 'Moçambique', continente: 'África' },
  { localidade: 'Luanda', pais: 'Angola', continente: 'África' },
  { localidade: 'Huambo', pais: 'Angola', continente: 'África' },
  { localidade: 'Benguela', pais: 'Angola', continente: 'África' },
  { localidade: 'Lubango', pais: 'Angola', continente: 'África' },
  { localidade: 'Praia', pais: 'Cabo Verde', continente: 'África' },
  { localidade: 'Bissau', pais: 'Guiné-Bissau', continente: 'África' },
  { localidade: 'São Tomé', pais: 'São Tomé e Príncipe', continente: 'África' },
  { localidade: 'Joanesburgo', pais: 'África do Sul', continente: 'África' },

  // Europa
  { localidade: 'Lisboa', pais: 'Portugal', continente: 'Europa' },
  { localidade: 'Porto', pais: 'Portugal', continente: 'Europa' },
  { localidade: 'Coimbra', pais: 'Portugal', continente: 'Europa' },
  { localidade: 'Braga', pais: 'Portugal', continente: 'Europa' },
  { localidade: 'Faro', pais: 'Portugal', continente: 'Europa' },
  { localidade: 'Madrid', pais: 'Espanha', continente: 'Europa' },
  { localidade: 'Barcelona', pais: 'Espanha', continente: 'Europa' },
  { localidade: 'Roma', pais: 'Itália', continente: 'Europa' },
  { localidade: 'Milão', pais: 'Itália', continente: 'Europa' },
  { localidade: 'Londres', pais: 'Reino Unido', continente: 'Europa' },
  { localidade: 'Paris', pais: 'França', continente: 'Europa' },
  { localidade: 'Zurique', pais: 'Suíça', continente: 'Europa' },
  { localidade: 'Genebra', pais: 'Suíça', continente: 'Europa' },
  { localidade: 'Bruxelas', pais: 'Bélgica', continente: 'Europa' },
  { localidade: 'Berlim', pais: 'Alemanha', continente: 'Europa' },

  // América do Norte & Ásia
  { localidade: 'Orlando (FL)', pais: 'Estados Unidos', continente: 'América do Norte' },
  { localidade: 'Miami (FL)', pais: 'Estados Unidos', continente: 'América do Norte' },
  { localidade: 'Boca Raton (FL)', pais: 'Estados Unidos', continente: 'América do Norte' },
  { localidade: 'Framingham (MA)', pais: 'Estados Unidos', continente: 'América do Norte' },
  { localidade: 'Boston (MA)', pais: 'Estados Unidos', continente: 'América do Norte' },
  { localidade: 'Newark (NJ)', pais: 'Estados Unidos', continente: 'América do Norte' },
  { localidade: 'Nova York (NY)', pais: 'Estados Unidos', continente: 'América do Norte' },
  { localidade: 'Houston (TX)', pais: 'Estados Unidos', continente: 'América do Norte' },
  { localidade: 'Los Angeles (CA)', pais: 'Estados Unidos', continente: 'América do Norte' },
  { localidade: 'Toronto', pais: 'Canadá', continente: 'América do Norte' },
  { localidade: 'Cidade do México', pais: 'México', continente: 'América do Norte' },
  { localidade: 'Tóquio', pais: 'Japão', continente: 'Ásia' },
  { localidade: 'Hamamatsu', pais: 'Japão', continente: 'Ásia' },
  { localidade: 'Nagoya', pais: 'Japão', continente: 'Ásia' },
  { localidade: 'Oizumi (Gunma)', pais: 'Japão', continente: 'Ásia' },
];

async function run() {
  console.log('Buscando países no IBGE...');
  const res = await fetch('https://servicodados.ibge.gov.br/api/v1/paises');
  const data = await res.json();

  const paises = data.map(p => ({
    pais: p.nome?.abreviado || p.nome?.['abreviado-EN'],
    regiao: p.localizacao?.regiao?.nome || 'Mundial'
  })).filter(p => p.pais);

  paises.sort((a, b) => a.pais.localeCompare(b.pais));

  const payload = {
    cidadesInternacionais: cidadesInternacionaisDestaque,
    paises: paises
  };

  const outDir = path.resolve(__dirname, '../src/data');
  const outPath = path.join(outDir, 'internacional.json');
  fs.writeFileSync(outPath, JSON.stringify(payload));
  console.log(`Sucesso! ${cidadesInternacionaisDestaque.length} cidades e ${paises.length} países salvos em ${outPath}`);
}

run().catch(console.error);
