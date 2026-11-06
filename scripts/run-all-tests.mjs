import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'UX-01 (Carregamento e Erros Explícitos)', script: 'scripts/test-load-resource.mjs' },
  { name: 'UX-02 (Fila de Salvamento e Proteção)', script: 'scripts/test-save-queue.mjs' },
  { name: 'UX-03 (Compartilhamento e Relatórios)', script: 'scripts/test-report-sharing.mjs' },
  { name: 'UX-04 (Validação de Período e Viagem)', script: 'scripts/test-trip-validation.mjs' },
  { name: 'UX-05 (Criação de Relatório via Agenda)', script: 'scripts/test-agenda-report.mjs' },
  { name: 'UX-06 (Diário de Bordo 30+ Dias)', script: 'scripts/test-trip-days.mjs' },
  { name: 'UX-07 (Retomada de Posição de Edição)', script: 'scripts/test-report-position.mjs' },
  { name: 'UX-08 (Edição de Despesas e Comprovantes)', script: 'scripts/test-expense-edit.mjs' },
  { name: 'UX-09 (Exclusão Protegida com Confirmação)', script: 'scripts/test-delete-items.mjs' },
  { name: 'UX-10 (Tela de Revisão Pré-Finalização)', script: 'scripts/test-report-review.mjs' },
  { name: 'UX-14 (Despesas Diárias e Notificações Push)', script: 'scripts/test-daily-expenses-and-push.mjs' },
  { name: 'UX-15 (Configurações de Lembrete e Notificações)', script: 'scripts/test-notification-settings.mjs' },
  { name: 'DB-01 & DB-02 (Sincronização e Protocolo)', script: 'scripts/test-database-backend-sprint1.mjs' },
  { name: 'DB-03 & DB-04 (Constraints e Índices)', script: 'scripts/test-database-backend-sprint2.mjs' },
  { name: 'FULL-STACK (Diagnóstico Geral de Tabelas)', script: 'scripts/verify-full-stack.mjs' }
];

async function runCommand(scriptPath) {
  return new Promise((resolve) => {
    const fullPath = path.resolve(__dirname, '..', scriptPath);
    const proc = spawn('node', [fullPath], { stdio: 'inherit' });
    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function run() {
  console.log("=================================================");
  console.log("🚀 EXECUTANDO SUÍTE INTEGRADA DE TESTES OBRAHUB");
  console.log("=================================================\n");

  const results = [];
  let allPassed = true;

  for (const s of suites) {
    console.log(`▶ Executando: ${s.name}...`);
    const passed = await runCommand(s.script);
    results.push({ name: s.name, passed });
    if (!passed) allPassed = false;
    console.log("");
  }

  console.log("=================================================");
  console.log("📊 RESUMO GERAL DAS SUÍTES DE TESTES");
  console.log("=================================================");
  for (const r of results) {
    const icon = r.passed ? "✅ APROVADO" : "❌ FALHOU";
    console.log(`${icon.padEnd(14)} | ${r.name}`);
  }
  console.log("=================================================");

  if (allPassed) {
    console.log("\n🎉 TODAS AS SUÍTES PASSARAM COM 100% DE SUCESSO!\n");
    process.exit(0);
  } else {
    console.error("\n⚠️ ALGUMAS SUÍTES APRESENTARAM FALHAS.\n");
    process.exit(1);
  }
}

run();
