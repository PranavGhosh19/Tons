
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Poppins, PT_Sans } from 'next/font/google';
import { AppProviders } from "@/components/app-providers";

const fontPoppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700']
});

const fontPtSans = PT_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pt-sans',
  weight: ['400', '700']
});

export const metadata: Metadata = {
  title: "Shipping Battlefield",
  description: "The Battlefield for Modern Shipping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontPoppins.variable} ${fontPtSans.variable}`}>
      <head>
      </head>
      <body className="min-h-screen bg-background font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
            <AppProviders>
                {children}
            </AppProviders>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
