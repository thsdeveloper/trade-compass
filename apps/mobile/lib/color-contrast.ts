/**
 * Escolha de cor de texto legível sobre um fundo arbitrário.
 *
 * A paleta de contas (ACCOUNT_COLOR_PALETTE) tem 16 tons pastel: texto branco
 * sobre eles chega a 1.5:1, muito abaixo do mínimo de 4.5:1 do WCAG AA.
 */

const TEXT_ON_LIGHT = '#111827';
const TEXT_ON_DARK = '#FFFFFF';

/** Luminância relativa (WCAG 2.x) de uma cor hex #RGB ou #RRGGBB. */
function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;

  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(full.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Retorna preto ou branco — o que tiver maior contraste sobre `background`.
 * Cores inválidas caem no branco, preservando o visual anterior.
 */
export function contrastingTextColor(background: string): string {
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(background)) return TEXT_ON_DARK;
  return relativeLuminance(background) > 0.45 ? TEXT_ON_LIGHT : TEXT_ON_DARK;
}
