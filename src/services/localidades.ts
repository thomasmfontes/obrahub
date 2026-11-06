import municipiosData from '../data/municipios.json';
import internacionalData from '../data/internacional.json';

export interface LocalidadeOption {
  value: string;
  label: string;
  description?: string;
  tipo: 'internacional' | 'municipio';
}

interface MunicipioRaw {
  cidade: string;
  uf: string;
  label: string;
}

interface CidadeInternacionalRaw {
  localidade: string;
  pais: string;
  continente: string;
}

interface PaisRaw {
  pais: string;
  regiao: string;
}

const municipios: MunicipioRaw[] = municipiosData as MunicipioRaw[];
const cidadesInternacionais: CidadeInternacionalRaw[] = (internacionalData as any).cidadesInternacionais || [];
const paises: PaisRaw[] = (internacionalData as any).paises || [];

// Função para remover acentos para busca flexível
export const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

/**
 * Busca de Localidades Reais:
 * 1. Missões Internacionais (Países do Mundo + Cidades no Exterior)
 * 2. Municípios oficiais do Brasil (IBGE)
 */
export const buscarLocalidades = (
  query: string,
  limite: number = 40
): LocalidadeOption[] => {
  const cleanQuery = normalizeText(query);

  // Se não houver busca, exibe os destaques internacionais e primeiros municípios
  if (!cleanQuery) {
    const destaquesInternacionais: LocalidadeOption[] = [
      { value: 'Moçambique', label: 'Moçambique', description: 'Missão Internacional • África', tipo: 'internacional' },
      { value: 'Angola', label: 'Angola', description: 'Missão Internacional • África', tipo: 'internacional' },
      { value: 'Bolívia', label: 'Bolívia', description: 'Missão Internacional • América do Sul', tipo: 'internacional' },
      { value: 'Paraguai', label: 'Paraguai', description: 'Missão Internacional • América do Sul', tipo: 'internacional' },
      { value: 'Portugal', label: 'Portugal', description: 'Missão Internacional • Europa', tipo: 'internacional' },
      { value: 'Estados Unidos', label: 'Estados Unidos', description: 'Missão Internacional • América do Norte', tipo: 'internacional' },
      { value: 'Japão', label: 'Japão', description: 'Missão Internacional • Ásia', tipo: 'internacional' },
    ];

    const defaultMunicipios: LocalidadeOption[] = municipios.slice(0, 15).map((m) => ({
      value: m.label,
      label: m.label,
      description: `Município Oficial IBGE • ${m.uf}`,
      tipo: 'municipio'
    }));

    return [...destaquesInternacionais, ...defaultMunicipios];
  }

  // 1. Filtrar Cidades Internacionais e Países
  const internacionaisResult: LocalidadeOption[] = [];

  // 1.1 Cidades no Exterior
  for (const c of cidadesInternacionais) {
    if (internacionaisResult.length >= 15) break;
    const nomeNorm = normalizeText(c.localidade);
    const paisNorm = normalizeText(c.pais);
    if (nomeNorm.includes(cleanQuery) || paisNorm.includes(cleanQuery)) {
      internacionaisResult.push({
        value: `${c.localidade} - ${c.pais}`,
        label: `${c.localidade} - ${c.pais}`,
        description: `Missão Internacional • ${c.continente}`,
        tipo: 'internacional'
      });
    }
  }

  // 1.2 Países do Mundo
  for (const p of paises) {
    if (internacionaisResult.length >= 25) break;
    const paisNorm = normalizeText(p.pais);
    if (paisNorm.includes(cleanQuery)) {
      const alreadyAdded = internacionaisResult.some(i => i.value.toLowerCase() === p.pais.toLowerCase());
      if (!alreadyAdded && p.pais.toLowerCase() !== 'brasil') {
        internacionaisResult.push({
          value: p.pais,
          label: p.pais,
          description: `País • ${p.regiao || 'Exterior'}`,
          tipo: 'internacional'
        });
      }
    }
  }

  // 2. Filtrar Municípios do IBGE (Brasil)
  const municipiosResult: LocalidadeOption[] = [];
  const maxMunicipios = limite - internacionaisResult.length;
  
  if (maxMunicipios > 0) {
    for (const m of municipios) {
      if (municipiosResult.length >= maxMunicipios) break;

      const nomeCidade = normalizeText(m.cidade);
      const uf = normalizeText(m.uf);
      const labelNorm = normalizeText(m.label);

      if (nomeCidade.includes(cleanQuery) || labelNorm.includes(cleanQuery) || (cleanQuery.length === 2 && uf === cleanQuery)) {
        municipiosResult.push({
          value: m.label,
          label: m.label,
          description: `Município Oficial IBGE • ${m.uf}`,
          tipo: 'municipio'
        });
      }
    }
  }

  return [...internacionaisResult, ...municipiosResult];
};
