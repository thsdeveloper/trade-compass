/**
 * Script para upload de todos os logos de bancos para Supabase Storage
 * e associacao automatica com a tabela banks
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carregar variaveis de ambiente
dotenv.config({ path: path.join(__dirname, '../back/.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET_NAME = 'bank-logos';
const LOGOS_DIR = '/home/pcthiago/projetos/Bancos-em-SVG';

interface Bank {
  id: string;
  ispb: string;
  code: number | null;
  name: string;
  full_name: string | null;
  logo_url: string | null;
}

// Mapeamento manual de pastas para nomes de bancos no BD
const FOLDER_TO_BANK_NAME: Record<string, string[]> = {
  'Nu Pagamentos S.A': ['Nu Pagamentos', 'Nubank', 'NU PAGAMENTOS'],
  'Banco do Brasil S.A': ['Banco do Brasil', 'BCO DO BRASIL'],
  'Bradesco S.A': ['Bradesco', 'BCO BRADESCO'],
  'Itaú Unibanco S.A': ['Itaú', 'Itau', 'ITAÚ UNIBANCO', 'BCO ITAUBANK'],
  'Banco Santander Brasil S.A': ['Santander', 'BCO SANTANDER'],
  'Caixa Econômica Federal': ['Caixa', 'CAIXA ECONOMICA'],
  'Banco Inter S.A': ['Inter', 'BCO INTER'],
  'Banco C6 S.A': ['C6 Bank', 'C6', 'BCO C6'],
  'PicPay': ['PicPay'],
  'Mercado Pago': ['Mercado Pago', 'MERCADOPAGO'],
  'PagSeguro Internet S.A': ['PagSeguro', 'PagBank', 'PAGSEGURO'],
  'Stone Pagamentos S.A': ['Stone', 'STONE PAGAMENTOS'],
  'Sicoob': ['Sicoob', 'SICOOB'],
  'Sicredi': ['Sicredi', 'SICREDI'],
  'Banco Original S.A': ['Original', 'BCO ORIGINAL'],
  'Banco Safra S.A': ['Safra', 'BCO SAFRA'],
  'Banrisul': ['Banrisul', 'BCO BANRISUL'],
  'XP Investimentos': ['XP', 'XP INVESTIMENTOS'],
  'Banco BTG Pacutal': ['BTG', 'BTG Pactual', 'BCO BTG PACTUAL'],
  'Banco BMG': ['BMG', 'BCO BMG'],
  'Neon': ['Neon', 'BCO NEON'],
  'Banco Votorantim': ['Votorantim', 'BCO VOTORANTIM'],
  'BRB - Banco de Brasilia': ['BRB', 'BCO DE BRASILIA'],
  'Banco do Nordeste do Brasil S.A': ['BNB', 'Nordeste', 'BCO DO NORDESTE'],
  'Banco da Amazônia S.A': ['Amazônia', 'BASA', 'BCO DA AMAZONIA'],
  'Banco Daycoval': ['Daycoval', 'BCO DAYCOVAL'],
  'Banco Sofisa': ['Sofisa', 'BCO SOFISA'],
  'ABC Brasil': ['ABC Brasil', 'BCO ABC BRASIL'],
  'Banco Pine': ['Pine', 'BCO PINE'],
  'Cora Sociedade Credito Direto S.A': ['Cora'],
  'Efí - Gerencianet': ['Efí', 'Gerencianet'],
  'Unicred': ['Unicred', 'UNICRED'],
  'Cresol': ['Cresol', 'CRESOL'],
  'Ailos': ['Ailos', 'AILOS'],
  'Asaas IP S.A': ['Asaas'],
  'InfinitePay': ['InfinitePay'],
  'Banco Mercantil do Brasil S.A': ['Mercantil', 'BCO MERCANTIL'],
  'Banco Rendimento': ['Rendimento', 'BCO RENDIMENTO'],
  'Banco do Estado do Espirito Santo': ['Banestes', 'BCO EST DO ES'],
  'Banco do Estado do Para': ['Banpará', 'BCO EST DO PARA'],
  'Banco do Estado do Sergipe': ['Banese', 'BCO EST DE SERGIPE'],
  'BNP Paripas': ['BNP Paribas', 'BCO BNP PARIBAS'],
  'Bank of America': ['Bank of America', 'BCO BOFA'],
  'Lets Bank S.A': ['Lets Bank'],
  'Omni': ['Omni', 'OMNI BCO'],
  'MagaluPay': ['MagaluPay', 'Magalu'],
  'Ifood Pago': ['iFood', 'IFOOD'],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function selectBestLogo(files: string[]): { main: string | null; dark: string | null } {
  const svgFiles = files.filter(f => f.endsWith('.svg'));

  // Preferencias para logo principal (evitar branco/negativo)
  const mainPreference = svgFiles.find(f =>
    !f.toLowerCase().includes('branco') &&
    !f.toLowerCase().includes('negativ') &&
    !f.toLowerCase().includes('white') &&
    !f.toLowerCase().includes('fundo') &&
    (f.toLowerCase().includes('logo') || svgFiles.length === 1)
  ) || svgFiles.find(f =>
    !f.toLowerCase().includes('branco') &&
    !f.toLowerCase().includes('negativ') &&
    !f.toLowerCase().includes('white')
  ) || svgFiles[0];

  // Logo dark (branco/negativo)
  const darkLogo = svgFiles.find(f =>
    f.toLowerCase().includes('branco') ||
    f.toLowerCase().includes('negativ') ||
    f.toLowerCase().includes('white')
  );

  return { main: mainPreference || null, dark: darkLogo || null };
}

async function uploadFile(filePath: string, fileName: string): Promise<string | null> {
  try {
    const fileContent = fs.readFileSync(filePath);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileContent, {
        contentType: 'image/svg+xml',
        upsert: true,
      });

    if (error) {
      console.error(`  Erro upload ${fileName}:`, error.message);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error(`  Erro ao ler ${filePath}:`, err);
    return null;
  }
}

async function findBankByName(folderName: string, banks: Bank[]): Promise<Bank | null> {
  // Tentar mapeamento manual primeiro
  const possibleNames = FOLDER_TO_BANK_NAME[folderName];
  if (possibleNames) {
    for (const name of possibleNames) {
      const bank = banks.find(b =>
        b.name.toLowerCase().includes(name.toLowerCase()) ||
        b.full_name?.toLowerCase().includes(name.toLowerCase())
      );
      if (bank) return bank;
    }
  }

  // Tentar match por nome da pasta
  const folderSlug = slugify(folderName);
  return banks.find(b => {
    const nameSlug = slugify(b.name);
    const fullNameSlug = b.full_name ? slugify(b.full_name) : '';
    return nameSlug.includes(folderSlug) ||
           folderSlug.includes(nameSlug) ||
           fullNameSlug.includes(folderSlug) ||
           folderSlug.includes(fullNameSlug);
  }) || null;
}

async function main() {
  console.log('=== Upload de Logos de Bancos ===\n');

  // Buscar todos os bancos
  console.log('Buscando bancos do banco de dados...');
  const { data: banks, error } = await supabase
    .from('banks')
    .select('id, ispb, code, name, full_name, logo_url')
    .eq('is_active', true);

  if (error || !banks) {
    console.error('Erro ao buscar bancos:', error?.message);
    return;
  }
  console.log(`Encontrados ${banks.length} bancos.\n`);

  // Listar pastas de logos
  const folders = fs.readdirSync(LOGOS_DIR).filter(f => {
    const fullPath = path.join(LOGOS_DIR, f);
    return fs.statSync(fullPath).isDirectory() && !f.startsWith('.');
  });

  console.log(`Encontradas ${folders.length} pastas de logos.\n`);

  let uploaded = 0;
  let matched = 0;
  let notMatched: string[] = [];

  for (const folder of folders) {
    // Pular pasta de logos escuros (tratamos separadamente)
    if (folder.includes('Escuros')) continue;

    const folderPath = path.join(LOGOS_DIR, folder);
    const files = fs.readdirSync(folderPath);

    // Encontrar banco correspondente
    const bank = await findBankByName(folder, banks);

    if (!bank) {
      notMatched.push(folder);
      continue;
    }

    matched++;
    console.log(`[${matched}] ${folder} -> ${bank.name} (${bank.code || 'sem codigo'})`);

    // Selecionar melhor logo
    const { main, dark } = selectBestLogo(files);

    if (!main) {
      console.log('  Nenhum logo encontrado');
      continue;
    }

    // Upload logo principal
    const mainPath = path.join(folderPath, main);
    const mainFileName = `${slugify(bank.name)}.svg`;
    const mainUrl = await uploadFile(mainPath, mainFileName);

    if (mainUrl) {
      console.log(`  Logo: ${main} -> ${mainFileName}`);
      uploaded++;
    }

    // Upload logo dark se existir
    let darkUrl: string | null = null;
    if (dark) {
      const darkPath = path.join(folderPath, dark);
      const darkFileName = `${slugify(bank.name)}-dark.svg`;
      darkUrl = await uploadFile(darkPath, darkFileName);
      if (darkUrl) {
        console.log(`  Dark: ${dark} -> ${darkFileName}`);
      }
    }

    // Atualizar banco
    if (mainUrl || darkUrl) {
      const updates: Record<string, string> = {};
      if (mainUrl) updates.logo_url = mainUrl;
      if (darkUrl) updates.logo_dark_url = darkUrl;

      const { error: updateError } = await supabase
        .from('banks')
        .update(updates)
        .eq('id', bank.id);

      if (updateError) {
        console.error(`  Erro ao atualizar banco: ${updateError.message}`);
      }
    }
  }

  console.log('\n=== Resumo ===');
  console.log(`Bancos associados: ${matched}`);
  console.log(`Logos enviados: ${uploaded}`);
  console.log(`Pastas sem match: ${notMatched.length}`);

  if (notMatched.length > 0) {
    console.log('\nPastas nao associadas:');
    notMatched.forEach(f => console.log(`  - ${f}`));
  }
}

main().catch(console.error);
