import { useMemo, type ReactElement } from 'react';
import { SvgXml } from 'react-native-svg';

import { resolveBankKey, svgBanco, type BancoFormato } from '@/lib/bancos-brasil';

type BankLogoProps = {
  /** Chave do banco (ex.: 'nubank') ou id/identificador a resolver. */
  bank?: string | null;
  /** Nome da conta — fallback para resolver o banco quando `bank` não basta. */
  name?: string | null;
  /** Lado do logo em px. */
  size?: number;
  formato?: BancoFormato;
  /** Renderizado quando o banco não é reconhecido (ex.: ícone genérico). */
  fallback?: ReactElement | null;
};

/**
 * Logo oficial do banco (Atomic Design · átomo). Renderiza o SVG do banco
 * correspondente à conta; quando o banco não é reconhecido, mostra `fallback`.
 * Dados vindos da lib vendorizada @edusites/bancos-brasil (MIT).
 */
export function BankLogo({
  bank,
  name,
  size = 40,
  formato = 'quadrado',
  fallback = null,
}: BankLogoProps): ReactElement | null {
  const xml = useMemo(() => {
    const key = resolveBankKey(bank, name);
    return key ? svgBanco({ nome: key, tamanho: size, formato }) : null;
  }, [bank, name, size, formato]);

  if (!xml) return fallback;
  return <SvgXml xml={xml} width={size} height={size} />;
}

/** Conveniência: resolve a chave do banco de uma conta (ou null). */
export { resolveBankKey } from '@/lib/bancos-brasil';
