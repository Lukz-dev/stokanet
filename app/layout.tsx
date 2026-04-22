import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import { Providers } from "@/components/Providers";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { toThemeAttribute } from "@/lib/theme";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StokaNet",
  description: "Sistema de controle de estoque para lojas de qualquer segmento, com produtos, variações e reposições.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id

  const userThemePreference = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { themePreference: true },
      })
    : null

  const themeAttribute = toThemeAttribute(userThemePreference?.themePreference)

  return (
    <html lang="pt-BR" className="dark h-full antialiased" data-theme-color={themeAttribute}>
      <body className={`${font.className} min-h-full flex flex-col`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

