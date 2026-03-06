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
                background: '#ffffff',
                color: '#0d2d4a',
                border: '1px solid #c5dff0',
                borderRadius: '10px',
                fontSize: '14px',
                boxShadow: '0 4px 20px rgba(0, 90, 161, 0.12)',
              },
              success: { iconTheme: { primary: '#00ABDF', secondary: '#ffffff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

