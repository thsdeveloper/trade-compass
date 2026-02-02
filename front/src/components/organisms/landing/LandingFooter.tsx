'use client';

import Link from 'next/link';
import { Compass, Twitter, Github, Linkedin } from 'lucide-react';

const footerLinks = {
  produto: [
    { label: 'Funcionalidades', href: '#features' },
    { label: 'Preços', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ],
  recursos: [
    { label: 'Como Funciona', href: '#how-it-works' },
    { label: 'Benefícios', href: '#features' },
    { label: 'Blog', href: '#' },
  ],
  suporte: [
    { label: 'Contato', href: '#' },
    { label: 'Ajuda', href: '#' },
    { label: 'Status', href: '#' },
  ],
  legal: [
    { label: 'Termos', href: '#' },
    { label: 'Privacidade', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

export function LandingFooter() {
  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            {/* Brand */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2">
                  <Compass className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">MoneyCompass</span>
              </Link>
              <p className="text-sm leading-relaxed max-w-xs mb-6">
                MoneyCompass simplifica a gestão financeira e dá controle total aos usuários.
              </p>
              {/* Social links */}
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className="w-9 h-9 rounded-lg bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center transition-colors"
                    aria-label={social.label}
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links columns */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Produto</h3>
              <ul className="space-y-3">
                {footerLinks.produto.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => scrollToSection(link.href)}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Recursos</h3>
              <ul className="space-y-3">
                {footerLinks.recursos.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => scrollToSection(link.href)}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Suporte</h3>
              <ul className="space-y-3">
                {footerLinks.suporte.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} MoneyCompass. Todos os direitos reservados.
            </p>
            <p className="text-xs text-slate-600 text-center sm:text-right max-w-md">
              Este produto não constitui aconselhamento financeiro. Consulte um profissional para decisões de investimento.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
