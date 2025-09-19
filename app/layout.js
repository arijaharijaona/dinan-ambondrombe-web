export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{fontFamily:'system-ui, sans-serif', padding:16}}>
        <h1>Dinan’Ambondrombe (MVP)</h1>
        {children}
      </body>
    </html>
  );
}
