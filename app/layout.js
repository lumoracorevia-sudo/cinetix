export const metadata = {
  title: "Cinetix",
  description: "AI video scripts and image prompts for faceless creators",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#000" }}>{children}</body>
    </html>
  );
    }
