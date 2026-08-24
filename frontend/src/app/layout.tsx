import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppLayout } from '@/components';

// 400 for body, 600 for row and card names, 800 for anything structural — the
// three weights the boards actually use. Loading only these keeps the payload to
// what the design needs rather than to what the family offers.
const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IoTArg",
  description: "IoTArg — industrial IoT platform powered by ThingsBoard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col overflow-hidden">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
