/**
 * API pública tipada da lib de logos de bancos (vendorizada de
 * @edusites/bancos-brasil, MIT). Consuma sempre por aqui — os arquivos
 * `core`/`icones` são o código original com `@ts-nocheck`.
 */
import {
  svgBanco as _svgBanco,
  listarBancos as _listarBancos,
  obterPreset as _obterPreset,
} from './core';

export type BancoFormato = 'quadrado' | 'circulo' | 'sem';

export interface BancoOptions {
  /** Chave do banco (ex.: 'nubank', 'itau', 'bancodobrasil'). */
  nome: string;
  formato?: BancoFormato;
  /** Cor do ícone (hex). Padrão: preset do banco. */
  cor?: string;
  /** Cor de fundo (hex). Padrão: preset do banco. */
  fundo?: string;
  /** Lado do ícone em px. Padrão: 64. */
  tamanho?: number;
  className?: string;
}

export interface BancoPreset {
  cor: string;
  fundo: string;
  formato: BancoFormato;
  tamanho: number;
}

/** Gera a string SVG do banco. Retorna null se a chave não existe. */
export function svgBanco(options: BancoOptions): string | null {
  return _svgBanco(options);
}

/** Lista as chaves de bancos suportadas. */
export function listarBancos(): string[] {
  return _listarBancos();
}

/** Preset de cores de um banco (ou null). */
export function obterPreset(nome: string): BancoPreset | null {
  return _obterPreset(nome);
}

export { resolveBankKey } from './resolve';
