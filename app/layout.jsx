import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'NFS — Transfert de fichiers sécurisé',
  description: 'Plateforme de transfert de fichiers chiffrés AES-256',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#1e293b' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

