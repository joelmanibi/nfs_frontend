'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import FileList from '@/components/files/FileList';
import Button from '@/components/ui/Button';
import { filesAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export default function SentPage() {
  const [files, setFiles]     = useState([]);
  const [count, setCount]     = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await filesAPI.getSent();
      setFiles(data.files);
      setCount(data.count);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-900/40 border border-green-700/30">
            <Send size={17} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Fichiers envoyés</h1>
            {!loading && (
              <p className="text-xs text-slate-500">
                {count} fichier{count > 1 ? 's' : ''} envoyé{count > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={fetch} loading={loading}>
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>

      <FileList files={files} mode="sent" loading={loading} />
    </div>
  );
}

