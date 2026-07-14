/**
 * Parser do QR code de NFC-e (Nota Fiscal de Consumidor Eletrônica).
 *
 * O QR code carrega uma URL de consulta da SEFAZ. Formatos conhecidos:
 * - v2 (online):  ...?p=<chave 44 dígitos>|<versão>|<tpAmb>|<cIdToken>|<hash>
 * - v2 (offline): ...?p=<chave>|<versão>|<tpAmb>|<dhEmi hex>|<vNF>|<vICMS>|<digVal>|<cIdToken>|<hash>
 * - v1:           ...?chNFe=<chave>&nVersao=100&tpAmb=1&dhEmi=<hex>&vNF=170.00&...
 *
 * A chave de acesso (44 dígitos) codifica:
 * cUF(2) AAMM(4) CNPJ(14) modelo(2) série(3) nNF(9) tpEmis(1) cNF(8) DV(1)
 */

export interface NfceQrInfo {
  accessKey: string;
  cnpj: string;
  /** YYYY-MM derivado do AAMM da chave */
  emissionYearMonth: string;
  invoiceNumber: string;
  /** Valor total da nota, quando presente no QR (modo offline / v1) */
  totalAmount: number | null;
  /** Data/hora de emissão completa, quando presente no QR */
  emissionDate: string | null;
}

const UF_BY_CODE: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP',
  '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB',
  '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES',
  '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS',
  '51': 'MT', '52': 'GO', '53': 'DF',
};

function decodeHexString(hex: string): string | null {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  try {
    return Buffer.from(hex, 'hex').toString('utf8');
  } catch {
    return null;
  }
}

/** Extrai a data de emissão de um campo dhEmi hex-encodado (ex.: "2026-07-13T20:15:00-03:00") */
function parseDhEmi(value: string): string | null {
  const decoded = decodeHexString(value);
  if (decoded && /^\d{4}-\d{2}-\d{2}/.test(decoded)) return decoded;
  return null;
}

export function parseNfceQr(qrData: string): NfceQrInfo | null {
  const keyMatch = qrData.match(/\d{44}/);
  if (!keyMatch) return null;

  const accessKey = keyMatch[0];
  const aamm = accessKey.slice(2, 6);
  const cnpj = accessKey.slice(6, 20);
  const invoiceNumber = String(parseInt(accessKey.slice(25, 34), 10));
  const emissionYearMonth = `20${aamm.slice(0, 2)}-${aamm.slice(2, 4)}`;

  let totalAmount: number | null = null;
  let emissionDate: string | null = null;

  // Formato v1: parâmetros de query soltos
  try {
    const url = new URL(qrData);
    const vNF = url.searchParams.get('vNF');
    if (vNF && /^\d+(\.\d+)?$/.test(vNF)) {
      totalAmount = parseFloat(vNF);
    }
    const dhEmi = url.searchParams.get('dhEmi');
    if (dhEmi) {
      emissionDate = parseDhEmi(dhEmi);
    }
  } catch {
    // qrData pode não ser uma URL válida; segue para o formato pipe
  }

  // Formato v2: segmentos separados por | após "p="
  if (totalAmount === null) {
    const pMatch = qrData.match(/[?&]p=([^&]+)/);
    if (pMatch) {
      const segments = decodeURIComponent(pMatch[1]).split('|');
      // No modo offline os campos são: chave|versão|tpAmb|dhEmi|vNF|vICMS|...
      // vNF é o primeiro segmento decimal após o dhEmi (posição 4)
      if (segments.length >= 6) {
        const [, , , dhEmi, vNF] = segments;
        if (/^\d+\.\d{2}$/.test(vNF)) {
          totalAmount = parseFloat(vNF);
        }
        emissionDate = emissionDate ?? parseDhEmi(dhEmi);
      }
    }
  }

  return { accessKey, cnpj, emissionYearMonth, invoiceNumber, totalAmount, emissionDate };
}

export function formatCnpj(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function ufFromAccessKey(accessKey: string): string | null {
  return UF_BY_CODE[accessKey.slice(0, 2)] ?? null;
}

export interface CnpjInfo {
  name: string;
  tradeName: string | null;
}

/** Consulta razão social do emissor na BrasilAPI (best effort, sem chave de API) */
export async function lookupCnpj(cnpj: string): Promise<CnpjInfo | null> {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      razao_social?: string;
      nome_fantasia?: string;
    };
    if (!data.razao_social) return null;
    return {
      name: data.razao_social,
      tradeName: data.nome_fantasia || null,
    };
  } catch {
    return null;
  }
}
