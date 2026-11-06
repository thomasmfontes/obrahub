import fs from 'fs';

let content = fs.readFileSync('src/components/WizardStep2.tsx', 'utf8');

// Find the index of "Despesas deste Dia"
const firstIdx = content.indexOf('Despesas deste Dia');
const secondIdx = content.indexOf('Despesas deste Dia', firstIdx + 1);

console.log('First index:', firstIdx, 'Second index:', secondIdx);

if (secondIdx !== -1) {
  // Find start of the second card (the comment `{/* Card 4: Despesas e Comprovantes do Dia */}`)
  const cardStart = content.lastIndexOf('{/* Card 4: Despesas e Comprovantes do Dia */}', secondIdx);
  // Find the end of this card: `</div>` before `{/* Card 2: Atividades Ministeriais */}`
  const nextCardStart = content.indexOf('{/* Card 2: Atividades Ministeriais */}', secondIdx);
  
  if (cardStart !== -1 && nextCardStart !== -1) {
    content = content.substring(0, cardStart) + content.substring(nextCardStart);
    fs.writeFileSync('src/components/WizardStep2.tsx', content, 'utf8');
    console.log('✅ Segundo card removido com sucesso!');
  }
}
