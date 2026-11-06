import fs from 'fs';

let content = fs.readFileSync('src/services/neon.ts', 'utf8');

const oldBlock = `    if (data.id_despesa) {
      const rows = await executeQuery<DespesaRubrica>(
        \`UPDATE tb_despesa_rubrica SET nm_rubrica = $1, t_icone_identificador = $2,
          dc_valor_despesa = $3, nr_comprovantes_anexados = $4, t_comprovante_storage_urls = $5,
          t_data_despesa = $6
          WHERE id_despesa = $7 AND id_relatorio = $8 RETURNING *\`,
        [data.nm_rubrica, data.t_icone_identificador || 'file', valorDespesa,
          (data.t_comprovante_storage_urls || []).length, data.t_comprovante_storage_urls || [], data.t_data_despesa || null, data.id_despesa, data.id_relatorio]
      );
      if (rows[0]?.id_despesa !== data.id_despesa) throw new Error('O servidor não confirmou a alteração da despesa.');
      return rows[0];
    }`;

const newBlock = `    if (data.id_despesa) {
      if (data.t_data_despesa !== undefined) {
        const rows = await executeQuery<DespesaRubrica>(
          \`UPDATE tb_despesa_rubrica SET nm_rubrica = $1, t_icone_identificador = $2,
            dc_valor_despesa = $3, nr_comprovantes_anexados = $4, t_comprovante_storage_urls = $5,
            t_data_despesa = $8
            WHERE id_despesa = $6 AND id_relatorio = $7 RETURNING *\`,
          [data.nm_rubrica, data.t_icone_identificador || 'file', valorDespesa,
            (data.t_comprovante_storage_urls || []).length, data.t_comprovante_storage_urls || [], data.id_despesa, data.id_relatorio, data.t_data_despesa || null]
        );
        if (rows[0]?.id_despesa !== data.id_despesa) throw new Error('O servidor não confirmou a alteração da despesa.');
        return rows[0];
      }
      const rows = await executeQuery<DespesaRubrica>(
        \`UPDATE tb_despesa_rubrica SET nm_rubrica = $1, t_icone_identificador = $2,
          dc_valor_despesa = $3, nr_comprovantes_anexados = $4, t_comprovante_storage_urls = $5
          WHERE id_despesa = $6 AND id_relatorio = $7 RETURNING *\`,
        [data.nm_rubrica, data.t_icone_identificador || 'file', valorDespesa,
          (data.t_comprovante_storage_urls || []).length, data.t_comprovante_storage_urls || [], data.id_despesa, data.id_relatorio]
      );
      if (rows[0]?.id_despesa !== data.id_despesa) throw new Error('O servidor não confirmou a alteração da despesa.');
      return rows[0];
    }`;

content = content.replace(oldBlock, newBlock);
content = content.replace(oldBlock.replace(/\n/g, '\r\n'), newBlock.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/services/neon.ts', content, 'utf8');
console.log('✅ neon.ts saveDespesaRubrica atualizado com sucesso!');
