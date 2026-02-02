import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { TRPCProvider } from "@/lib/trpc/provider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'MoneyCompass - Hub de Gerenciamento Financeiro',
  description:
    'Gerencie transações, planeje orçamento 50/30/20, acompanhe metas e investimentos. Comece grátis!',
  keywords: [
    'finanças pessoais',
    'controle financeiro',
    'orçamento 50/30/20',
    'gestão de gastos',
    'metas financeiras',
    'planejamento financeiro',
    'controle de despesas',
    'organização financeira',
  ],
  authors: [{ name: 'MoneyCompass' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://moneycompass.app',
    title: 'MoneyCompass - Hub de Gerenciamento Financeiro',
    description:
      'Gerencie transações, planeje orçamento 50/30/20, acompanhe metas e investimentos. Comece grátis!',
    siteName: 'MoneyCompass',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoneyCompass - Hub de Gerenciamento Financeiro',
    description:
      'Gerencie transações, planeje orçamento 50/30/20, acompanhe metas e investimentos. Comece grátis!',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            classNames: {
              toast: 'bg-white border border-slate-200 shadow-lg',
              title: 'text-slate-900 font-medium text-sm',
              description: 'text-slate-500 text-sm',
            },
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
