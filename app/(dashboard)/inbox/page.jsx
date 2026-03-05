'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import FileList from '@/components/files/FileList';
import Button from '@/components/ui/Button';
import { filesAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export default function InboxPage() {
  const [files, setFiles]     = useState([]);
  const [count, setCount]     = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await filesAPI.getInbox();
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
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-900/40 border border-blue-700/30">
            <Inbox size={17} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Boîte de réception</h1>
            {!loading && (
              <p className="text-xs text-slate-500">
                {count} fichier{count > 1 ? 's' : ''} reçu{count > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={fetch} loading={loading}>
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>

      <FileList files={files} mode="inbox" loading={loading} />
    </div>
  );
}

