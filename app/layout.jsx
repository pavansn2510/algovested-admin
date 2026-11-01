import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-jakarta" });

export const metadata = {
  title: "Algovested Admin",
  description: "Internal operations: users, plans, dedicated IPs, cron jobs and email logs.",
  robots: "noindex, nofollow",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-screen bg-[#fbf8f3] text-stone-900 antialiased selection:bg-amber-100 selection:text-stone-900">
        {children}
      </body>
    </html>
  );
}
