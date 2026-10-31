import "./globals.css";

export const metadata = {
  title: "Algovested Admin Console | Gateway & System Telemetry",
  description: "Internal operations dashboard for Algovested user management, dedicated IP proxy allocation, cron monitoring, and audit logs.",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7f5f0] text-stone-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
