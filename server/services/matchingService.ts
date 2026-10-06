import { db } from '../db/database.js';
import { CandidateMatch, ExtractedDocumentData } from '../types/index.js';

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return Math.max(0.7, minLen / maxLen);
  }

  // Token matching (first name + last name)
  const tokens1 = s1.split(/\s+/);
  const tokens2 = s2.split(/\s+/);
  let matches = 0;
  for (const t1 of tokens1) {
    if (tokens2.some((t2) => t2 === t1 || (t1.length > 3 && t2.includes(t1)))) {
      matches++;
    }
  }

  const tokenScore = (matches * 2) / (tokens1.length + tokens2.length);
  return tokenScore;
}

export async function matchCandidatesForDocument(
  data?: ExtractedDocumentData
): Promise<CandidateMatch[]> {
  if (!data) return [];

  const alunos = await db.alunos.find();
  const candidates: CandidateMatch[] = [];

  for (const aluno of alunos) {
    let score = 0;
    let criterio = '';

    // Priority 1: CPF (if found and matched)
    if (data.cpf && (aluno as any).cpf) {
      const cleanDocCpf = data.cpf.replace(/\D/g, '');
      const cleanAlunoCpf = ((aluno as any).cpf || '').replace(/\D/g, '');
      if (cleanDocCpf && cleanDocCpf === cleanAlunoCpf) {
        score = 1.0;
        criterio = 'Correspondência exata de CPF (Prioridade 1)';
      }
    }

    // Priority 2: Matrícula
    if (score === 0 && data.matricula && (aluno as any).matricula) {
      if (normalizeString(data.matricula) === normalizeString((aluno as any).matricula)) {
        score = 0.96;
        criterio = 'Correspondência exata de Matrícula (Prioridade 2)';
      }
    }

    // Priority 3: RG
    if (score === 0 && data.rg && (aluno as any).rg) {
      const cleanDocRg = data.rg.replace(/\D/g, '');
      const cleanAlunoRg = ((aluno as any).rg || '').replace(/\D/g, '');
      if (cleanDocRg && cleanDocRg === cleanAlunoRg) {
        score = 0.94;
        criterio = 'Correspondência exata de RG (Prioridade 3)';
      }
    }

    // Priority 4: Nome exato
    if (score === 0 && data.nome) {
      const normDocNome = normalizeString(data.nome);
      const normAlunoNome = normalizeString(aluno.nome);

      if (normDocNome === normAlunoNome) {
        score = 0.92;
        criterio = 'Nome exatamente idêntico (Prioridade 4)';
      } else {
        const similarity = calculateSimilarity(data.nome, aluno.nome);

        // Priority 5: Nome semelhante + data
        if (similarity >= 0.70 && data.data) {
          score = Math.min(0.88, similarity + 0.1);
          criterio = 'Nome semelhante com confirmação de data (Prioridade 5)';
        }
        // Priority 6: Nome semelhante + outro dado (origem, destino, etc)
        else if (similarity >= 0.65 && (data.origem || data.destino || data.empresa)) {
          score = Math.min(0.82, similarity + 0.05);
          criterio = 'Nome semelhante com coincidência de trecho/empresa (Prioridade 6)';
        } else if (similarity >= 0.50) {
          score = similarity * 0.75;
          criterio = 'Similaridade fonética/textual de nome';
        }
      }
    }

    if (score > 0.40) {
      let nivelConfianca: 'alta' | 'media' | 'baixa' = 'baixa';
      if (score >= 0.90) {
        nivelConfianca = 'alta';
      } else if (score >= 0.70) {
        nivelConfianca = 'media';
      }

      candidates.push({
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        score: Math.round(score * 100) / 100,
        nivelConfianca,
        criterio,
      });
    }
  }

  // Sort descending by score
  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}
