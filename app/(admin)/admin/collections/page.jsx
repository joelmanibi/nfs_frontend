'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderOpen,
  History,
  Mail,
  Play,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  Server,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/utils';

const PROTOCOLS = ['SFTP', 'FTP', 'FTPS', 'HTTP', 'HTTPS'];
const AUTH_TYPES = ['PASSWORD', 'SSH_KEY'];
const SCHEDULES = ['MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY'];
const WEEK_DAYS = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];
const DEFAULT_PORTS = { SFTP: 22, FTP: 21, FTPS: 21, HTTP: 80, HTTPS: 443 };

const EMPTY_FORM = {
  id: null,
  name: '',
  description: '',
  comment: '',
  host: '',
  protocol: 'SFTP',
  port: '22',
  authType: 'PASSWORD',
  username: '',
  password: '',
  sshPrivateKey: '',
  sourceDirectory: '',
  requestQuery: '',
  httpMethod: 'GET',
  httpHeaders: '',
  httpBody: '',
  httpResponseMode: 'SINGLE_FILE',
  scheduleType: 'MANUAL',
  scheduleTime: '02:00',
  scheduleDayOfWeek: '1',
  scheduleDayOfMonth: '1',
  isActive: true,
  recipients: [],
  hasPassword: false,
  hasSshPrivateKey: false,
};

const fieldClass = 'w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500';
const textareaClass = `${fieldClass} min-h-[96px] resize-y`;

const scheduleLabel = (collection) => {
  if (collection.scheduleType === 'MANUAL') return 'Manuelle';
  if (collection.scheduleType === 'DAILY') return `Quotidienne · ${collection.scheduleTime}`;
  if (collection.scheduleType === 'WEEKLY') {
    const day = WEEK_DAYS.find((item) => item.value === collection.scheduleDayOfWeek)?.label || '—';
    return `Hebdomadaire · ${day} ${collection.scheduleTime}`;
  }
  return `Mensuelle · Jour ${collection.scheduleDayOfMonth} ${collection.scheduleTime}`;
};

const executionTone = (status) => ({
  RUNNING: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  SUCCESS: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  PARTIAL: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  FAILED: 'bg-red-500/10 text-red-300 border-red-500/20',
}[status] || 'bg-slate-700/40 text-slate-300 border-slate-600');

const executionLabel = (status) => ({
  RUNNING: 'En cours',
  SUCCESS: 'Succès',
  PARTIAL: 'Partiel',
  FAILED: 'Échec',
}[status] || status || '—');

const boolLabel = (value) => (value ? 'Active' : 'Inactive');
const isHttpProtocol = (protocol) => protocol === 'HTTP' || protocol === 'HTTPS';

const formatDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
};

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${active ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-slate-700/40 text-slate-300 border-slate-600'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {boolLabel(active)}
    </span>
  );
}

function ExecutionBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${executionTone(status)}`}>
      {executionLabel(status)}
    </span>
  );
}

function RecipientChip({ recipient, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-700/40 px-3 py-1 text-xs text-white">
      <Mail size={11} className="text-slate-400" />
      <span className="max-w-[210px] truncate">{recipient.email}</span>
      <button type="button" onClick={() => onRemove(recipient.id)} className="text-slate-400 hover:text-white transition-colors">
        <X size={12} />
      </button>
    </span>
  );
}

export default function AdminCollectionsPage() {
  const { user: currentUser } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [userQuery, setUserQuery] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [userResults, setUserResults] = useState([]);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getCollections();
      setCollections(data.collections || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const searchUsers = useCallback(async (query = '') => {
    setUserLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ page: 1, limit: 12, search: query.trim() });
      const selectedIds = new Set(form.recipients.map((recipient) => recipient.id));
      setUserResults((data.users || []).filter((user) => !selectedIds.has(user.id)));
    } catch {
      setUserResults([]);
    } finally {
      setUserLoading(false);
    }
  }, [form.recipients]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);
  useEffect(() => {
    if (!formOpen) return;
    const timer = setTimeout(() => { searchUsers(userQuery); }, 250);
    return () => clearTimeout(timer);
  }, [formOpen, userQuery, searchUsers]);

  const visibleResults = useMemo(
    () => userResults.filter((user) => !form.recipients.some((recipient) => recipient.id === user.id)),
    [form.recipients, userResults],
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setUserQuery('');
    setUserResults([]);
    setFormOpen(false);
  };

  const openCreate = async () => {
    setForm(EMPTY_FORM);
    setUserQuery('');
    setFormOpen(true);
    await searchUsers('');
  };

  const openEdit = async (collection) => {
    try {
      const { data } = await adminAPI.getCollection(collection.id);
      const detail = data.collection || collection;
      const recipients = (detail.recipients || []).map((item) => item.user).filter(Boolean);

      setForm({
        id: detail.id,
        name: detail.name || '',
        description: detail.description || '',
        comment: detail.comment || '',
        host: detail.host || '',
        protocol: detail.protocol || 'SFTP',
        port: String(detail.port || DEFAULT_PORTS[detail.protocol] || 22),
        authType: detail.authType || 'PASSWORD',
        username: detail.username || '',
        password: '',
        sshPrivateKey: '',
        sourceDirectory: detail.sourceDirectory || '',
        requestQuery: detail.requestQuery || '',
        httpMethod: detail.httpMethod || 'GET',
        httpHeaders: detail.httpHeaders || '',
        httpBody: detail.httpBody || '',
        httpResponseMode: detail.httpResponseMode || 'SINGLE_FILE',
        scheduleType: detail.scheduleType || 'MANUAL',
        scheduleTime: detail.scheduleTime || '02:00',
        scheduleDayOfWeek: String(detail.scheduleDayOfWeek ?? 1),
        scheduleDayOfMonth: String(detail.scheduleDayOfMonth ?? 1),
        isActive: Boolean(detail.isActive),
        recipients,
        hasPassword: Boolean(detail.hasPassword),
        hasSshPrivateKey: Boolean(detail.hasSshPrivateKey),
      });
      setUserQuery('');
      setFormOpen(true);
      await searchUsers('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const openHistory = async (collection) => {
    setHistoryTarget(collection);
    setHistoryLoading(true);
    try {
      const { data } = await adminAPI.getCollectionExecutions(collection.id, { limit: 50 });
      setHistoryRows(data.executions || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addRecipient = (user) => {
    setForm((prev) => ({ ...prev, recipients: [...prev.recipients, user] }));
    setUserQuery('');
  };

  const removeRecipient = (userId) => {
    setForm((prev) => ({ ...prev, recipients: prev.recipients.filter((recipient) => recipient.id !== userId) }));
  };

  const handleProtocolChange = (value) => {
    setForm((prev) => ({
      ...prev,
      protocol: value,
      port: String(DEFAULT_PORTS[value] || prev.port),
      authType: value === 'SFTP' ? prev.authType : 'PASSWORD',
    }));
  };

  const validateForm = () => {
    const httpProtocol = isHttpProtocol(form.protocol);

    if (!form.name.trim()) return 'Le nom est requis.';
    if (!form.host.trim()) return 'L’adresse IP ou le hostname est requis.';
    if (!httpProtocol && !form.username.trim()) return 'Le login est requis.';
    if (!form.sourceDirectory.trim()) return httpProtocol ? 'L’endpoint API est requis.' : 'Le répertoire source est requis.';
    if (!form.recipients.length) return 'Sélectionnez au moins un destinataire.';
    if (form.scheduleType !== 'MANUAL' && !form.scheduleTime) return 'L’heure de planification est requise.';
    if (httpProtocol && form.httpMethod === 'GET' && form.httpBody.trim()) return 'Le body HTTP n’est disponible qu’en POST.';

    if (!httpProtocol && form.authType === 'PASSWORD' && !form.password.trim() && (!form.id || !form.hasPassword)) {
      return 'Le mot de passe distant est requis.';
    }

    if (form.authType === 'SSH_KEY' && !form.sshPrivateKey.trim() && (!form.id || !form.hasSshPrivateKey)) {
      return 'La clé SSH est requise.';
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      comment: form.comment.trim(),
      host: form.host.trim(),
      protocol: form.protocol,
      port: Number(form.port),
      authType: form.authType,
      username: form.username.trim(),
      sourceDirectory: form.sourceDirectory.trim(),
      requestQuery: isHttpProtocol(form.protocol) ? form.requestQuery.trim() || null : null,
      httpMethod: isHttpProtocol(form.protocol) ? form.httpMethod : null,
      httpHeaders: isHttpProtocol(form.protocol) ? form.httpHeaders.trim() || null : null,
      httpBody: isHttpProtocol(form.protocol) && form.httpMethod === 'POST' ? form.httpBody.trim() || null : null,
      httpResponseMode: isHttpProtocol(form.protocol) ? form.httpResponseMode : null,
      recipientUserIds: form.recipients.map((recipient) => recipient.id),
      scheduleType: form.scheduleType,
      scheduleTime: form.scheduleType === 'MANUAL' ? null : form.scheduleTime,
      scheduleDayOfWeek: form.scheduleType === 'WEEKLY' ? Number(form.scheduleDayOfWeek) : null,
      scheduleDayOfMonth: form.scheduleType === 'MONTHLY' ? Number(form.scheduleDayOfMonth) : null,
      isActive: form.isActive,
    };

    if (form.authType === 'PASSWORD' && form.password.trim()) payload.password = form.password.trim();
    if (form.authType === 'SSH_KEY' && form.sshPrivateKey.trim()) payload.sshPrivateKey = form.sshPrivateKey;

    setSaving(true);
    try {
      if (form.id) {
        await adminAPI.updateCollection(form.id, payload);
        toast.success('Configuration mise à jour.');
      } else {
        await adminAPI.createCollection(payload);
        toast.success('Configuration créée.');
      }

      await fetchCollections();
      resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (collection) => {
    setTogglingId(collection.id);
    try {
      await adminAPI.updateCollection(collection.id, { isActive: !collection.isActive });
      toast.success(`Configuration ${collection.isActive ? 'désactivée' : 'activée'}.`);
      await fetchCollections();
      if (historyTarget?.id === collection.id) {
        const next = { ...historyTarget, isActive: !collection.isActive };
        setHistoryTarget(next);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (collection) => {
    if (!confirm(`Supprimer la configuration « ${collection.name} » ?`)) return;
    setDeletingId(collection.id);
    try {
      await adminAPI.deleteCollection(collection.id);
      toast.success('Configuration supprimée.');
      setCollections((prev) => prev.filter((item) => item.id !== collection.id));
      if (historyTarget?.id === collection.id) {
        setHistoryTarget(null);
        setHistoryRows([]);
      }
      if (form.id === collection.id) resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const handleRun = async (collection) => {
    setRunningId(collection.id);
    try {
      const { data } = await adminAPI.runCollection(collection.id);
      toast.success(data.message || 'Exécution terminée.');
      await fetchCollections();
      if (historyTarget?.id === collection.id) {
        await openHistory(collection);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      await fetchCollections();
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20">
            <FolderOpen size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Collecte de fichiers</h1>
            <p className="text-xs text-slate-400">Gérez les sources distantes, les destinataires et les exécutions planifiées.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchCollections} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all">
            <Plus size={14} /> Nouvelle configuration
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${formOpen ? 'xl:grid-cols-[1.45fr_1fr]' : 'grid-cols-1'}`}>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <p className="text-sm font-medium text-white">Configurations enregistrées</p>
            <span className="text-xs text-slate-400">{collections.length} configuration{collections.length > 1 ? 's' : ''}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Nom</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">IP source</th>
                  <th className="text-left px-4 py-3">Protocole</th>
                  <th className="text-left px-4 py-3 hidden xl:table-cell">Planification</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Dernière exécution</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan={7} className="text-center text-slate-500 py-10">Chargement...</td></tr>
                ) : collections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center text-slate-400">
                      <FolderOpen size={32} className="mx-auto mb-3 opacity-40" />
                      <p>Aucune configuration de collecte pour le moment.</p>
                    </td>
                  </tr>
                ) : collections.map((collection) => (
                  <tr key={collection.id} className="hover:bg-slate-700/30 transition-colors align-top">
                    <td className="px-4 py-3">
                      <div className="space-y-1 min-w-[180px]">
                        <p className="font-medium text-white">{collection.name}</p>
                        <p className="text-xs text-slate-400 line-clamp-2">{collection.description || collection.comment || 'Aucune description.'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{collection.host}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <div className="space-y-1">
                        <p>{collection.protocol}</p>
                        <p className="text-xs text-slate-500">Port {collection.port}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 hidden xl:table-cell">
                      <div className="space-y-1">
                        <p>{scheduleLabel(collection)}</p>
                        <p className="text-xs text-slate-500">{collection.recipients?.length || 0} destinataire{collection.recipients?.length > 1 ? 's' : ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge active={collection.isActive} /></td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {collection.lastExecution ? (
                        <div className="space-y-1 text-xs">
                          <div className="text-slate-200">{formatDateTime(collection.lastExecution.executedAt)}</div>
                          <ExecutionBadge status={collection.lastExecution.status} />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Jamais</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => openEdit(collection)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-slate-700 text-slate-200 hover:bg-slate-600 transition-all">
                          Modifier
                        </button>
                        <button
                          onClick={() => handleToggleActive(collection)}
                          disabled={togglingId === collection.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-slate-700 text-slate-200 hover:bg-slate-600 transition-all disabled:opacity-50"
                        >
                          <Power size={12} /> {collection.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          onClick={() => handleRun(collection)}
                          disabled={runningId === collection.id || !collection.isActive}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                        >
                          <Play size={12} /> {runningId === collection.id ? '...' : 'Exécuter'}
                        </button>
                        <button onClick={() => openHistory(collection)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                          <History size={12} /> Historique
                        </button>
                        {currentUser?.role === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleDelete(collection)}
                            disabled={deletingId === collection.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                          >
                            <Trash2 size={12} /> {deletingId === collection.id ? '...' : 'Supprimer'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {formOpen && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{form.id ? 'Modifier la configuration' : 'Nouvelle configuration'}</p>
                <p className="text-xs text-slate-400">Source distante, destinataires et planification</p>
              </div>
              <button onClick={resetForm} className="text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Nom</label>
                  <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} className={fieldClass} placeholder="Collecte mensuelle finance" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Activation</label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-white">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => updateForm('isActive', e.target.checked)} className="rounded border-slate-600 bg-slate-800" />
                    Configuration active
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Description</label>
                  <textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} className={textareaClass} placeholder="Résumé métier de la collecte" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Commentaire</label>
                  <textarea value={form.comment} onChange={(e) => updateForm('comment', e.target.value)} className={textareaClass} placeholder="Commentaire envoyé avec la distribution" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{isHttpProtocol(form.protocol) ? 'Domaine / Hostname API' : 'IP / Hostname'}</label>
                  <input value={form.host} onChange={(e) => updateForm('host', e.target.value)} className={fieldClass} placeholder={isHttpProtocol(form.protocol) ? 'api.paa.local' : '10.0.0.12 ou ftp.paa.local'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Protocole</label>
                  <select value={form.protocol} onChange={(e) => handleProtocolChange(e.target.value)} className={fieldClass}>
                    {PROTOCOLS.map((protocol) => <option key={protocol} value={protocol}>{protocol}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Port</label>
                  <input value={form.port} onChange={(e) => updateForm('port', e.target.value)} type="number" min="1" max="65535" className={fieldClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Type d&apos;authentification</label>
                  <select value={form.authType} onChange={(e) => updateForm('authType', e.target.value)} className={fieldClass} disabled={form.protocol !== 'SFTP'}>
                    {AUTH_TYPES.map((type) => (
                      <option key={type} value={type} disabled={form.protocol !== 'SFTP' && type === 'SSH_KEY'}>
                        {type === 'PASSWORD' ? 'Mot de passe' : 'Clé SSH'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{isHttpProtocol(form.protocol) ? 'Login API (optionnel)' : 'Login'}</label>
                  <input value={form.username} onChange={(e) => updateForm('username', e.target.value)} className={fieldClass} placeholder={isHttpProtocol(form.protocol) ? 'optionnel pour Basic Auth' : 'nfs-collector'} />
                </div>
              </div>

              {form.authType === 'PASSWORD' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{isHttpProtocol(form.protocol) ? 'Mot de passe API (optionnel)' : 'Mot de passe'}</label>
                  <input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} className={fieldClass} placeholder={form.id && form.hasPassword ? 'Laisser vide pour conserver le secret actuel' : (isHttpProtocol(form.protocol) ? 'optionnel pour Basic Auth' : 'Mot de passe distant')} />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Clé SSH privée</label>
                  <textarea value={form.sshPrivateKey} onChange={(e) => updateForm('sshPrivateKey', e.target.value)} className={textareaClass} placeholder={form.id && form.hasSshPrivateKey ? 'Laisser vide pour conserver la clé actuelle' : '-----BEGIN OPENSSH PRIVATE KEY-----'} />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{isHttpProtocol(form.protocol) ? 'Endpoint API' : 'Répertoire source'}</label>
                <input value={form.sourceDirectory} onChange={(e) => updateForm('sourceDirectory', e.target.value)} className={fieldClass} placeholder={isHttpProtocol(form.protocol) ? '/exports/incoming' : '/exports/incoming'} />
              </div>

              {isHttpProtocol(form.protocol) && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Méthode HTTP</label>
                      <select
                        value={form.httpMethod}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          httpMethod: e.target.value,
                          httpBody: e.target.value === 'POST' ? prev.httpBody : '',
                        }))}
                        className={fieldClass}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Mode de réponse</label>
                      <select value={form.httpResponseMode} onChange={(e) => updateForm('httpResponseMode', e.target.value)} className={fieldClass}>
                        <option value="SINGLE_FILE">SINGLE_FILE</option>
                        <option value="FILE_LIST">FILE_LIST</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Paramètres API</label>
                    <textarea
                      value={form.requestQuery}
                      onChange={(e) => updateForm('requestQuery', e.target.value)}
                      className={textareaClass}
                      placeholder={'scope=finance&format=zip\nou {"scope":"finance","format":"zip"}'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Headers HTTP</label>
                    <textarea
                      value={form.httpHeaders}
                      onChange={(e) => updateForm('httpHeaders', e.target.value)}
                      className={textareaClass}
                      placeholder={'Authorization: Bearer mon-token\nX-API-Key: ma-cle\nou {"Authorization":"Bearer mon-token"}'}
                    />
                  </div>

                  {form.httpMethod === 'POST' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Body HTTP</label>
                      <textarea
                        value={form.httpBody}
                        onChange={(e) => updateForm('httpBody', e.target.value)}
                        className={textareaClass}
                        placeholder={'{"scope":"finance","format":"zip"}'}
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    {form.httpResponseMode === 'FILE_LIST'
                      ? 'FILE_LIST attend une réponse JSON contenant une liste de fichiers à télécharger individuellement.'
                      : 'SINGLE_FILE traite directement la réponse HTTP comme un fichier unique à distribuer.'}
                  </p>
                </>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Destinataires</p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-3 space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500" placeholder="Rechercher un utilisateur existant..." />
                  </div>

                  {form.recipients.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.recipients.map((recipient) => (
                        <RecipientChip key={recipient.id} recipient={recipient} onRemove={removeRecipient} />
                      ))}
                    </div>
                  )}

                  <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/60 divide-y divide-slate-800">
                    {userLoading ? (
                      <div className="px-3 py-4 text-sm text-slate-500">Recherche des utilisateurs...</div>
                    ) : visibleResults.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-slate-500">Aucun utilisateur disponible.</div>
                    ) : visibleResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addRecipient(user)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-800 transition-colors"
                      >
                        <div>
                          <p className="text-sm text-white">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                        <span className="text-xs text-blue-300">Ajouter</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Planification</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Fréquence</label>
                    <select value={form.scheduleType} onChange={(e) => updateForm('scheduleType', e.target.value)} className={fieldClass}>
                      {SCHEDULES.map((schedule) => <option key={schedule} value={schedule}>{schedule}</option>)}
                    </select>
                  </div>

                  {form.scheduleType !== 'MANUAL' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Heure</label>
                      <input type="time" value={form.scheduleTime} onChange={(e) => updateForm('scheduleTime', e.target.value)} className={fieldClass} />
                    </div>
                  )}

                  {form.scheduleType === 'WEEKLY' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Jour de la semaine</label>
                      <select value={form.scheduleDayOfWeek} onChange={(e) => updateForm('scheduleDayOfWeek', e.target.value)} className={fieldClass}>
                        {WEEK_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                      </select>
                    </div>
                  )}

                  {form.scheduleType === 'MONTHLY' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Jour du mois</label>
                      <input type="number" min="1" max="31" value={form.scheduleDayOfMonth} onChange={(e) => updateForm('scheduleDayOfMonth', e.target.value)} className={fieldClass} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
                <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-all">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all disabled:opacity-50">
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {form.id ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {historyTarget && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Historique des exécutions — {historyTarget.name}</p>
              <p className="text-xs text-slate-400">Date, statut, nombre de fichiers traités et erreurs éventuelles</p>
            </div>
            <button onClick={() => { setHistoryTarget(null); setHistoryRows([]); }} className="text-slate-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Fichiers traités</th>
                  <th className="text-left px-4 py-3">Message d&apos;erreur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {historyLoading ? (
                  <tr><td colSpan={4} className="text-center text-slate-500 py-10">Chargement...</td></tr>
                ) : historyRows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-slate-500 py-10">Aucune exécution pour cette configuration.</td></tr>
                ) : historyRows.map((execution) => (
                  <tr key={execution.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-slate-200">{formatDateTime(execution.executedAt)}</td>
                    <td className="px-4 py-3"><ExecutionBadge status={execution.status} /></td>
                    <td className="px-4 py-3 text-slate-200">
                      <div className="flex flex-col">
                        <span>{execution.collectedFilesCount} collecté(s)</span>
                        <span className="text-xs text-slate-500">{execution.distributedFilesCount} distribué(s)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-xl">
                      {execution.errorMessage || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!formOpen && !historyTarget && collections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Server size={18} className="text-blue-400" />
              <div>
                <p className="text-sm text-slate-400">Sources configurées</p>
                <p className="text-xl font-bold text-white">{collections.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <div>
                <p className="text-sm text-slate-400">Configurations actives</p>
                <p className="text-xl font-bold text-white">{collections.filter((item) => item.isActive).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-400" />
              <div>
                <p className="text-sm text-slate-400">Derniers échecs</p>
                <p className="text-xl font-bold text-white">{collections.filter((item) => item.lastExecution?.status === 'FAILED').length}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}