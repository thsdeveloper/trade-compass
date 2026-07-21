import { describe, it, expect } from 'vitest';
import { isOfxContent, parseOfx } from '../src/services/ofx-parser.js';

const SGML_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
ENCODING:USASCII

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>0260
<ACCTID>12345-6
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260715120000[-3:BRT]
<TRNAMT>-123.45
<FITID>66f1a2b3-0001
<MEMO>PIX TRANSF JOAO 15/07
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260716
<TRNAMT>5000.00
<FITID>66f1a2b3-0002
<NAME>EMPRESA X LTDA
<MEMO>SALARIO
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

const COMMA_DECIMAL_OFX = `OFXHEADER:100
<OFX>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260701
<TRNAMT>-1.234,56
<FITID>abc-1
<MEMO>COMPRA MERCADO
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</OFX>`;

const CREDIT_CARD_OFX = `OFXHEADER:100
<OFX>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<CCSTMTRS>
<CCACCTFROM>
<ACCTID>5522********1234
</CCACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260710
<TRNAMT>-89.90
<FITID>card-1
<MEMO>NETFLIX.COM
</STMTTRN>
</BANKTRANLIST>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>
</OFX>`;

describe('isOfxContent', () => {
  it('reconhece cabecalho SGML e tag OFX', () => {
    expect(isOfxContent(SGML_OFX)).toBe(true);
    expect(isOfxContent('<OFX><STMTRS></STMTRS></OFX>')).toBe(true);
  });

  it('rejeita CSV comum', () => {
    expect(isOfxContent('data,descricao,valor\n2026-07-01,Mercado,-50')).toBe(false);
  });
});

describe('parseOfx', () => {
  it('retorna null para conteudo nao-OFX', () => {
    expect(parseOfx('data,descricao,valor')).toBeNull();
  });

  it('extrai transacoes com fitid, data, valor absoluto e tipo pelo sinal', () => {
    const result = parseOfx(SGML_OFX)!;
    expect(result.kind).toBe('account');
    expect(result.bankId).toBe('0260');
    expect(result.accountId).toBe('12345-6');
    expect(result.transactions).toHaveLength(2);

    const [debit, credit] = result.transactions;
    expect(debit).toMatchObject({
      fitid: '66f1a2b3-0001',
      date: '2026-07-15',
      amount: 123.45,
      type: 'DESPESA',
      memo: 'PIX TRANSF JOAO 15/07',
    });
    expect(credit).toMatchObject({
      fitid: '66f1a2b3-0002',
      date: '2026-07-16',
      amount: 5000,
      type: 'RECEITA',
    });
    // NAME + MEMO complementares são combinados
    expect(credit.memo).toBe('EMPRESA X LTDA - SALARIO');
  });

  it('aceita virgula como separador decimal', () => {
    const result = parseOfx(COMMA_DECIMAL_OFX)!;
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amount).toBe(1234.56);
    expect(result.transactions[0].type).toBe('DESPESA');
  });

  it('identifica fatura de cartao (CCSTMTRS)', () => {
    const result = parseOfx(CREDIT_CARD_OFX)!;
    expect(result.kind).toBe('credit_card');
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].fitid).toBe('card-1');
  });

  it('ignora linhas sem valor ou sem data', () => {
    const broken = `OFXHEADER:100
<OFX><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<MEMO>SEM DATA NEM VALOR
</STMTTRN>
</BANKTRANLIST></STMTRS></OFX>`;
    expect(parseOfx(broken)!.transactions).toHaveLength(0);
  });
});
