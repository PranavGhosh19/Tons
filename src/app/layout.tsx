
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthButton, MobileMenu, MobileNavLinks } from "@/components/auth-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { BottomBar } from "@/components/bottom-bar";

export const metadata: Metadata = {
  title: "Shipping Battlefield",
  description: "The Battlefield for Modern Shipping",
};

const LogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
      <path
        d="M23 23.5C24.3807 23.5 25.5 22.3807 25.5 21C25.5 19.6193 24.3807 18.5 23 18.5H9C7.61929 18.5 6.5 19.6193 6.5 21C6.5 22.3807 7.61929 23.5 9 23.5H23Z"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 18.5L12.5 10.5H19.5L22.5 18.5"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 10.5V8"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

const Header = () => (
  <header
    className={cn(
      "sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm dark:bg-background/80"
    )}
  >
    <div className="container flex h-16 items-center">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg font-headline"
        >
          <LogoIcon />
          <span className="hidden sm:block font-bold text-base sm:text-xl">Shipping Battlefield</span>
        </Link>
        
      </div>
      
       <div className="ml-auto flex items-center gap-2">
         <div className="hidden sm:flex">
            <AuthButton />
         </div>
         <MobileMenu />
      </div>
    </div>
  </header>
);

const Footer = () => (
  <footer className="py-6 md:px-8 md:py-0 border-t">
    <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
      <p className="text-center text-sm leading-loose text-muted-foreground">
        &copy; {new Date().getFullYear()} Shipping Battlefield. All rights reserved.
      </p>
    </div>
  </footer>
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-background font-body antialiased">
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <div className="flex-1 pb-16 sm:pb-0">{children}</div>
          <Footer />
        </div>
        <BottomBar />
        <Toaster />
      </body>
    </html>
  );
}
