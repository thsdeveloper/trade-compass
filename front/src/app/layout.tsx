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
  title: 'MoneyCompass - Clareza para Decidir',
  description:
    'Copiloto inteligente para decisoes no mercado financeiro. Analise de contexto, zonas de decisao e setups tecnicos.',
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
