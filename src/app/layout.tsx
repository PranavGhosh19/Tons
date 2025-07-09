import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ShipShape",
  description: "The Battlefield for Modern Shipping",
};

const Header = () => (
  <header
    className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    )}
  >
    <div className="container flex h-14 items-center">
      <div className="mr-4 flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg font-headline"
        >
          <Ship className="h-6 w-6 text-primary" />
          <span className="font-bold">ShipShape</span>
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-end space-x-2">
        <nav className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </nav>
      </div>
    </div>
  </header>
);

const Footer = () => (
  <footer className="py-6 md:px-8 md:py-0 border-t">
    <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
      <p className="text-center text-sm leading-loose text-muted-foreground">
        &copy; {new Date().getFullYear()} ShipShape. All rights reserved.
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
        <link href="https://fonts.googleapis.com/css2?family=Poppins&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-background font-body antialiased">
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
