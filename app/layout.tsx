import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script"; 
import "./globals.css";
import Navbar from "./components/Navbar"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Seller Tools",
  description: "Tools for Amazon and Flipkart Sellers",
  verification: {
    google: "mkSUi9CaHDpjMixEmkHhEbYgj2nL2eWBnSUq8B73E3M",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]`}>
        
        {/* Adsterra Ad Script */}
        <Script 
          src="//pl28175488.effectivegatecpm.com/66/6a/26/666a2635f82928121a8ccd607d68e862.js"
          strategy="afterInteractive"
        />

        {/* Modern Glassmorphism Navbar */}
        <Navbar />

        {/* Main Content with Padding for Fixed Header */}
        <main className="pt-20 min-h-screen">
          {children}
        </main>

      </body>
    </html>
  );
}