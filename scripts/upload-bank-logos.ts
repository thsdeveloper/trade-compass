/**
 * Script para upload de logos de bancos brasileiros para Supabase Storage
 *
 * Uso:
 *   npx tsx scripts/upload-bank-logos.ts
 *
 * Requisitos:
 *   - SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no .env do back
 *   - Bucket "bank-logos" deve existir no Supabase Storage (publico)
 *   - As logos devem estar em uma pasta local ou serem baixadas do GitHub
 *
 * O script:
 *   1. Busca todos os bancos da tabela 'banks'
 *   2. Para cada banco, tenta encontrar o logo correspondente
 *   3. Faz upload do logo para o Supabase Storage
 *   4. Atualiza a tabela 'banks' com a URL do logo
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variaveis de ambiente do back
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../back/.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKET_NAME = 'bank-logos';
const LOGOS_DIR = path.join(__dirname, 'bank-logos'); // Pasta local com os logos

interface Bank {
  id: string;
  ispb: string;
  code: number | null;
  name: string;
  full_name: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
}

// Mapeamento de nomes de arquivos para codigos de bancos
// Este mapeamento precisa ser ajustado de acordo com os arquivos disponíveis
const BANK_LOGO_MAPPING: Record<number, string> = {
  1: 'banco-do-brasil',
  33: 'santander',
  77: 'inter',
  104: 'caixa',
  212: 'original',
  237: 'bradesco',
  260: 'nubank',
  336: 'c6-bank',
  341: 'itau',
  380: 'picpay',
  748: 'sicredi',
  756: 'sicoob',
};

async function ensureBucketExists(): Promise<void> {
  console.log('Verificando bucket...');

  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('Erro ao listar buckets:', error.message);
    throw error;
  }

  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log(`Criando bucket "${BUCKET_NAME}"...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 1024 * 1024, // 1MB
      allowedMimeTypes: ['image/svg+xml', 'image/png', 'image/jpeg'],
    });

    if (createError) {
      console.error('Erro ao criar bucket:', createError.message);
      throw createError;
    }

    console.log('Bucket criado com sucesso!');
  } else {
    console.log('Bucket ja existe.');
  }
}

async function uploadLogo(
  bankCode: number,
  logoPath: string,
  isDark: boolean = false
): Promise<string | null> {
  const fileName = `${String(bankCode).padStart(3, '0')}${isDark ? '-dark' : ''}.svg`;

  try {
    const fileContent = fs.readFileSync(logoPath);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileContent, {
        contentType: 'image/svg+xml',
        upsert: true,
      });

    if (uploadError) {
      console.error(`Erro ao fazer upload de ${fileName}:`, uploadError.message);
      return null;
    }

    // Obter URL publica
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    console.log(`  Uploaded: ${fileName}`);
    return data.publicUrl;
  } catch (err) {
    console.error(`Erro ao processar ${logoPath}:`, err);
    return null;
  }
}

async function updateBankLogo(
  bankId: string,
  logoUrl: string | null,
  logoDarkUrl: string | null
): Promise<void> {
  const updates: Partial<Bank> = {};

  if (logoUrl) {
    updates.logo_url = logoUrl;
  }
  if (logoDarkUrl) {
    updates.logo_dark_url = logoDarkUrl;
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from('banks').update(updates).eq('id', bankId);

  if (error) {
    console.error(`Erro ao atualizar banco ${bankId}:`, error.message);
  }
}

async function processLogos(): Promise<void> {
  console.log('Buscando bancos...');

  const { data: banks, error } = await supabase
    .from('banks')
    .select('id, ispb, code, name, full_name, logo_url, logo_dark_url')
    .eq('is_active', true)
    .order('code', { ascending: true });

  if (error) {
    console.error('Erro ao buscar bancos:', error.message);
    throw error;
  }

  if (!banks || banks.length === 0) {
    console.log('Nenhum banco encontrado.');
    return;
  }

  console.log(`Encontrados ${banks.length} bancos.`);

  // Verificar se o diretorio de logos existe
  if (!fs.existsSync(LOGOS_DIR)) {
    console.log(`\nDiretorio de logos nao encontrado: ${LOGOS_DIR}`);
    console.log('Por favor, baixe os logos do repositorio:');
    console.log('  git clone https://github.com/Tgentil/Bancos-em-SVG.git scripts/bank-logos');
    console.log('\nOu crie a pasta e adicione os logos manualmente.');
    return;
  }

  const logoFiles = fs.readdirSync(LOGOS_DIR);
  console.log(`Encontrados ${logoFiles.length} arquivos de logos.`);

  let uploaded = 0;
  let skipped = 0;

  for (const bank of banks) {
    if (!bank.code) {
      skipped++;
      continue;
    }

    // Verificar se o banco ja tem logo
    if (bank.logo_url) {
      console.log(`  Banco ${bank.code} (${bank.name}) ja tem logo, pulando...`);
      skipped++;
      continue;
    }

    // Procurar arquivo de logo correspondente
    const logoName = BANK_LOGO_MAPPING[bank.code];
    if (!logoName) {
      // Tentar encontrar pelo codigo
      const possibleFiles = logoFiles.filter(
        (f) =>
          f.includes(String(bank.code).padStart(3, '0')) ||
          f.toLowerCase().includes(bank.name.toLowerCase().replace(/\s+/g, '-'))
      );

      if (possibleFiles.length === 0) {
        console.log(`  Sem logo para banco ${bank.code} (${bank.name})`);
        skipped++;
        continue;
      }

      // Usar o primeiro arquivo encontrado
      const logoFile = possibleFiles[0];
      const logoPath = path.join(LOGOS_DIR, logoFile);

      console.log(`Processando banco ${bank.code} (${bank.name})...`);
      const logoUrl = await uploadLogo(bank.code, logoPath);

      if (logoUrl) {
        await updateBankLogo(bank.id, logoUrl, null);
        uploaded++;
      }
    } else {
      // Usar o mapeamento definido
      const logoFile = logoFiles.find(
        (f) => f.toLowerCase().includes(logoName.toLowerCase())
      );

      if (!logoFile) {
        console.log(`  Arquivo de logo nao encontrado para ${logoName}`);
        skipped++;
        continue;
      }

      const logoPath = path.join(LOGOS_DIR, logoFile);
      console.log(`Processando banco ${bank.code} (${bank.name})...`);
      const logoUrl = await uploadLogo(bank.code, logoPath);

      // Verificar se existe versao dark
      const darkLogoFile = logoFiles.find(
        (f) =>
          f.toLowerCase().includes(logoName.toLowerCase()) &&
          f.toLowerCase().includes('dark')
      );

      let darkLogoUrl: string | null = null;
      if (darkLogoFile) {
        const darkLogoPath = path.join(LOGOS_DIR, darkLogoFile);
        darkLogoUrl = await uploadLogo(bank.code, darkLogoPath, true);
      }

      if (logoUrl || darkLogoUrl) {
        await updateBankLogo(bank.id, logoUrl, darkLogoUrl);
        uploaded++;
      }
    }
  }

  console.log(`\nProcessamento concluido!`);
  console.log(`  Logos enviados: ${uploaded}`);
  console.log(`  Bancos pulados: ${skipped}`);
}

async function main(): Promise<void> {
  console.log('=== Upload de Logos de Bancos ===\n');

  try {
    await ensureBucketExists();
    await processLogos();
  } catch (err) {
    console.error('Erro durante execucao:', err);
    process.exit(1);
  }
}

main();
