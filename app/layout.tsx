import "./globals.css";

export const metadata = {
  title: "Agenda Operacional",
  description: "Agenda Etech - SGP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
