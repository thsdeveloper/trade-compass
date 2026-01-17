import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../back/.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'bank-logos';
const LOGOS_DIR = '/home/pcthiago/projetos/Bancos-em-SVG';

const manualMappings = [
  { folder: 'Banrisul', bankName: 'ESTADO DO RS', file: 'banrisul-logo-2023.svg' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function upload(filePath: string, fileName: string): Promise<string> {
  const content = fs.readFileSync(filePath);
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, content, {
    contentType: 'image/svg+xml',
    upsert: true,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl;
}

async function main() {
  console.log('Uploading remaining logos...\n');

  for (const m of manualMappings) {
    const { data: banks } = await supabase
      .from('banks')
      .select('id, name, code')
      .ilike('name', `%${m.bankName}%`)
      .limit(1);

    if (!banks?.length) {
      console.log(`Banco nao encontrado: ${m.bankName}`);
      continue;
    }

    const bank = banks[0];
    const filePath = path.join(LOGOS_DIR, m.folder, m.file);

    if (!fs.existsSync(filePath)) {
      console.log(`Arquivo nao existe: ${filePath}`);
      continue;
    }

    try {
      const slug = slugify(bank.name);
      const url = await upload(filePath, `${slug}.svg`);
      await supabase.from('banks').update({ logo_url: url }).eq('id', bank.id);
      console.log(`OK: ${bank.name} (${bank.code}) -> ${slug}.svg`);
    } catch (err) {
      console.error(`Erro: ${bank.name}`, err);
    }
  }

  console.log('\nDone!');
}

main();
