import fs from 'fs';

let code = fs.readFileSync('src/services/neon.ts', 'utf8');

code = code.replace(
  'SELECT * FROM tb_despesa_rubrica WHERE id_relatorio = $1 ORDER BY dc_valor_despesa DESC',
  'SELECT * FROM tb_despesa_rubrica WHERE id_relatorio = $1 ORDER BY t_data_despesa ASC NULLS LAST, dc_valor_despesa DESC'
);

const oldSaveTarget = `        \`UPDATE tb_despesa_rubrica SET nm_rubrica = $1, t_icone_identificador = $2,
          dc_valor_despesa = $3, nr_comprovantes_anexados = $4, t_comprovante_storage_urls = $5
          WHERE id_despesa = $6 AND id_relatorio = $7 RETURNING *\`,
        [data.nm_rubrica, data.t_icone_identificador || 'file', valorDespesa,
          (data.t_comprovante_storage_urls || []).length, data.t_comprovante_storage_urls || [], data.id_despesa, data.id_relatorio]`;

const newSaveTarget = `        \`UPDATE tb_despesa_rubrica SET nm_rubrica = $1, t_icone_identificador = $2,
          dc_valor_despesa = $3, nr_comprovantes_anexados = $4, t_comprovante_storage_urls = $5,
          t_data_despesa = $6
          WHERE id_despesa = $7 AND id_relatorio = $8 RETURNING *\`,
        [data.nm_rubrica, data.t_icone_identificador || 'file', valorDespesa,
          (data.t_comprovante_storage_urls || []).length, data.t_comprovante_storage_urls || [], data.t_data_despesa || null, data.id_despesa, data.id_relatorio]`;

code = code.replace(oldSaveTarget, newSaveTarget);
code = code.replace(oldSaveTarget.replace(/\n/g, '\r\n'), newSaveTarget.replace(/\n/g, '\r\n'));

const oldInsertTarget = `    const rows = await executeQuery<DespesaRubrica>(
      \`INSERT INTO tb_despesa_rubrica (
        id_relatorio, nm_rubrica, t_icone_identificador, dc_valor_despesa, nr_comprovantes_anexados, t_comprovante_storage_urls
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;\`,
      [
        data.id_relatorio,
        data.nm_rubrica,
        data.t_icone_identificador || 'file',
        valorDespesa,
        data.nr_comprovantes_anexados || 0,
        data.t_comprovante_storage_urls || []
      ]
    );`;

const newInsertTarget = `    const rows = await executeQuery<DespesaRubrica>(
      \`INSERT INTO tb_despesa_rubrica (
        id_relatorio, nm_rubrica, t_icone_identificador, dc_valor_despesa, nr_comprovantes_anexados, t_comprovante_storage_urls, t_data_despesa
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;\`,
      [
        data.id_relatorio,
        data.nm_rubrica,
        data.t_icone_identificador || 'file',
        valorDespesa,
        data.nr_comprovantes_anexados || 0,
        data.t_comprovante_storage_urls || [],
        data.t_data_despesa || null
      ]
    );`;

code = code.replace(oldInsertTarget, newInsertTarget);
code = code.replace(oldInsertTarget.replace(/\n/g, '\r\n'), newInsertTarget.replace(/\n/g, '\r\n'));

if (!code.includes('registerPushDeviceToken')) {
  code += `\nexport async function registerPushDeviceToken(token: string, idMissionario?: string): Promise<void> {\n  if (!token) return;\n  try {\n    await executeQuery(\n      \`INSERT INTO tb_dispositivo_push (t_fcm_token, id_missionario, t_plataforma, t_ativo, updated_at)\n       VALUES ($1, $2, 'web', true, CURRENT_TIMESTAMP)\n       ON CONFLICT (t_fcm_token) \n       DO UPDATE SET id_missionario = COALESCE($2, tb_dispositivo_push.id_missionario),\n                     t_ativo = true,\n                     updated_at = CURRENT_TIMESTAMP\`,\n      [token, idMissionario || null]\n    );\n  } catch (err) {\n    console.warn("Aviso ao registrar token push no Neon:", err);\n  }\n}\n`;
}

fs.writeFileSync('src/services/neon.ts', code, 'utf8');
console.log('✅ neon.ts atualizado com sucesso!');
