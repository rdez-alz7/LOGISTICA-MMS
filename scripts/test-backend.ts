import { initDatabase, db } from '../server/db/database.js';
import { generateAlunosWorkbook, generateGeralWorkbook } from '../server/services/reportService.js';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('=== Iniciando Verificação do LOG MMS ===');

  // 1. Database Init
  await initDatabase();
  console.log('✔ Banco de dados inicializado com sucesso.');

  // 2. Health Check
  const users = await db.users.find();
  console.log(`✔ Total de usuários no banco: ${users.length}`);

  const admin = await db.users.findByEmailOrUsername('vitor');
  if (!admin) {
    throw new Error('Admin inicial não encontrado!');
  }
  console.log(`✔ Admin inicial encontrado: ${admin.name} (@${admin.username}) - Role: ${admin.role}`);

  const passwordValid = bcrypt.compareSync('admin', admin.passwordHash);
  if (!passwordValid) {
    throw new Error('Hash bcrypt da senha não confere!');
  }
  console.log('✔ Senha bcrypt verificada com sucesso.');

  // 3. Obreiros and Alunos
  const obreiros = await db.obreiros.find();
  console.log(`✔ Total de obreiros cadastrados: ${obreiros.length}`);
  if (obreiros.length === 0) throw new Error('Obreiros não encontrados!');

  const alunos = await db.alunos.find();
  console.log(`✔ Total de alunos cadastrados: ${alunos.length}`);
  if (alunos.length === 0) throw new Error('Alunos não encontrados!');
  console.log(`✔ Primeiro aluno: "${alunos[0].nome}" com obreiro "${alunos[0].obreiroNome}"`);

  // 4. Viagens
  const viagens = await db.viagens.find();
  console.log(`✔ Total de viagens cadastradas: ${viagens.length}`);

  // 5. Test real XLSX generation
  const alunoWb = await generateAlunosWorkbook();
  const bufferAluno = await alunoWb.xlsx.writeBuffer();
  console.log(`✔ Arquivo XLSX de Alunos gerado com sucesso (${bufferAluno.byteLength} bytes)`);

  const geralWb = await generateGeralWorkbook();
  const bufferGeral = await geralWb.xlsx.writeBuffer();
  console.log(`✔ Arquivo XLSX Geral Completo (4 abas) gerado com sucesso (${bufferGeral.byteLength} bytes)`);

  console.log('=== Todos os testes do LOG MMS foram aprovados com sucesso! ===');
}

runTests().catch((err) => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
