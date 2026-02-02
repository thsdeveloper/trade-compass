'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Gradient orbs */}
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-500" />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5">
                <Compass className="h-6 w-6 text-white" />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">MoneyCompass</span>
          </Link>

          {/* Center Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Sua jornada para a{' '}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  liberdade financeira
                </span>{' '}
                começa aqui.
              </h1>
              <p className="text-lg text-slate-300 max-w-md leading-relaxed">
                Controle gastos, planeje o futuro e alcance seus objetivos com inteligência e simplicidade.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">50k+</div>
                <div className="text-sm text-slate-400">Usuários ativos</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">R$2M+</div>
                <div className="text-sm text-slate-400">Gerenciados</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">4.9</div>
                <div className="text-sm text-slate-400">Avaliação</div>
              </div>
            </div>
          </div>

          {/* Bottom testimonial */}
          <div className="space-y-4">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <blockquote className="text-lg text-slate-200 italic">
              &ldquo;Finalmente consegui organizar minhas finanças! O app é super intuitivo e me ajudou a economizar mais de R$500 por mês.&rdquo;
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold">
                ML
              </div>
              <div>
                <div className="text-white font-medium">Marina Lima</div>
                <div className="text-sm text-slate-400">Designer, São Paulo</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen bg-white">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-1.5">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">MoneyCompass</span>
          </Link>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} MoneyCompass. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
