import { FormEvent, useEffect, useState } from 'react';
import { Download, FileText, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  deleteSiteFile,
  DOCUMENT_CATEGORIES,
  fileKey,
  getAllDocuments,
  publicUrl,
  uploadSiteFile,
  type DocumentCategory,
  type DocumentItem,
} from '@/lib/content';

function errMsg(): string {
  return 'No pudimos completar la acción. Revisa e inténtalo de nuevo.';
}

type Draft = {
  id?: string;
  title: string;
  description: string;
  category: DocumentCategory;
  doc_date: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: 'draft' | 'published';
};

const emptyDraft: Draft = {
  title: '',
  description: '',
  category: 'Otros',
  doc_date: new Date().toISOString().slice(0, 10),
  storage_path: '',
  original_name: '',
  mime_type: 'application/octet-stream',
  size_bytes: 0,
  status: 'draft',
};

export default function DocumentsPanel() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function load() {
    const list = await getAllDocuments();
    setDocuments(list);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, []);
  function openNew() {
    setEditing({ ...emptyDraft });
    setPendingFile(null);
    setError('');
    setNotice('');
  }

  function openEdit(doc: DocumentItem) {
    setEditing({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      doc_date: doc.doc_date,
      storage_path: doc.storage_path,
      original_name: doc.original_name,
      mime_type: doc.mime_type,
      size_bytes: doc.size_bytes,
      status: doc.status,
    });
    setPendingFile(null);
    setError('');
    setNotice('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    setNotice('');
    if (!editing.title.trim()) {
      setError('El título es obligatorio.');
      setSaving(false);
      return;
    }
    let storagePath = editing.storage_path;
    let originalName = editing.original_name;
    let mimeType = editing.mime_type;
    let sizeBytes = editing.size_bytes;
    if (pendingFile) {
      if (editing.id) {
        const path = `documents/${editing.id}/${fileKey()}-${pendingFile.name}`;
        const { path: stored, error: uploadError } = await uploadSiteFile(path, pendingFile, true);
        if (uploadError) {
          setError('No se pudo subir el documento.');
          setSaving(false);
          return;
        }
        if (editing.storage_path) await deleteSiteFile(editing.storage_path);
        storagePath = stored;
      } else {
        setError('Guarda primero el documento para adjuntar el archivo.');
        setSaving(false);
        return;
      }
      originalName = pendingFile.name;
      mimeType = pendingFile.type || 'application/octet-stream';
      sizeBytes = pendingFile.size;
    }
    if (editing.id) {
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          title: editing.title.trim(),
          description: editing.description,
          category: editing.category,
          doc_date: editing.doc_date,
          storage_path: storagePath,
          original_name: originalName,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          status: editing.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);
      if (updateError) setError(errMsg());
      else {
        setNotice('Documento guardado.');
        setEditing(null);
        await load();
      }
    } else {
      if (!pendingFile) {
        setError('Debes adjuntar un archivo.');
        setSaving(false);
        return;
      }
      const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
          title: editing.title.trim(),
          description: editing.description,
          category: editing.category,
          doc_date: editing.doc_date,
          status: editing.status,
          storage_path: 'pending',
          original_name: 'pending',
        })
        .select()
        .maybeSingle();
      if (insertError || !data) {
        setError(errMsg());
        setSaving(false);
        return;
      }
      const created = data as DocumentItem;
      const path = `documents/${created.id}/${fileKey()}-${pendingFile.name}`;
      const { path: stored, error: uploadError } = await uploadSiteFile(path, pendingFile, true);
      if (uploadError) {
        setError('No se pudo subir el archivo. Edita el documento para reintentar.');
        setSaving(false);
        await load();
        return;
      }
      await supabase
        .from('documents')
        .update({
          storage_path: stored,
          original_name: pendingFile.name,
          mime_type: pendingFile.type || 'application/octet-stream',
          size_bytes: pendingFile.size,
        })
        .eq('id', created.id);
      setNotice('Documento creado.');
      setEditing(null);
      await load();
    }
    setSaving(false);
  }

  async function togglePublish(doc: DocumentItem) {
    const next = doc.status === 'published' ? 'draft' : 'published';
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', doc.id);
    if (updateError) setError(errMsg());
    else await load();
  }

  async function remove(doc: DocumentItem) {
    if (!window.confirm('¿Eliminar este documento permanentemente?')) return;
    if (doc.storage_path && doc.storage_path !== 'pending') await deleteSiteFile(doc.storage_path);
    const { error: deleteError } = await supabase.from('documents').delete().eq('id', doc.id);
    if (deleteError) setError(errMsg());
    else await load();
  }

  if (!loaded) return <div className="admin-loading">Cargando documentos…</div>;

  return (
    <div className="documents-panel">
      {error && <div className="admin-error">{error}</div>}
      {notice && <div className="admin-notice">{notice}</div>}
      {!editing && (
        <div className="admin-toolbar">
          <button className="button button-green" onClick={openNew}>
            <Plus size={16} /> Nuevo documento
          </button>
        </div>
      )}
      {editing ? (
        <form className="admin-modal-flat" onSubmit={save}>
          <div className="flat-head">
            <h2>{editing.id ? 'Editar documento' : 'Nuevo documento'}</h2>
            <button type="button" className="modal-close" onClick={() => setEditing(null)}>
              <X size={18} />
            </button>
          </div>
          <label className="story-field">
            Título
            <input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} required />
          </label>
          <label className="story-field">
            Descripción
            <textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} rows={3} />
          </label>
          <div className="form-row-3">
            <label className="story-field">
              Categoría
              <select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value as DocumentCategory })}>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label className="story-field">
              Fecha
              <input type="date" value={editing.doc_date} onChange={(event) => setEditing({ ...editing, doc_date: event.target.value })} />
            </label>
            <label className="story-field">
              Estado
              <select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as 'draft' | 'published' })}>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </label>
          </div>
          <label className="story-field">
            Archivo
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf"
              onChange={(event) => setPendingFile(event.target.files?.[0] ?? null)}
            />
            {editing.original_name && !pendingFile && (
              <small className="current-file">Actual: {editing.original_name}</small>
            )}
          </label>
          <div className="flat-actions">
            <button className="button button-green" disabled={saving}>
              <Save size={16} /> {saving ? 'Guardando…' : 'Guardar documento'}
            </button>
            <button type="button" className="button button-outline" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : documents.length === 0 ? (
        <div className="admin-empty">
          <FileText size={28} />
          <h2>No hay documentos todavía</h2>
          <p>Sube el primer documento de la biblioteca.</p>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map((doc) => {
            const url = publicUrl(doc.storage_path);
            return (
              <div className="document-card" key={doc.id}>
                <div className="document-card-head">
                  <FileText size={20} />
                  <span className={`read-badge ${doc.status === 'published' ? 'read' : 'unread'}`}>
                    {doc.status === 'published' ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
                <strong>{doc.title}</strong>
                {doc.description && <p>{doc.description}</p>}
                <div className="document-meta">
                  <span className="doc-cat">{doc.category}</span>
                  <span>{new Date(doc.doc_date).toLocaleDateString('es-CO')}</span>
                </div>
                <div className="document-card-actions">
                  {url && (
                    <a className="icon-button" href={url} target="_blank" rel="noreferrer" title="Ver / descargar">
                      <Download size={15} />
                    </a>
                  )}
                  <button className="icon-button" onClick={() => togglePublish(doc)} title={doc.status === 'published' ? 'Despublicar' : 'Publicar'}>
                    {doc.status === 'published' ? <X size={15} /> : <Plus size={15} />}
                  </button>
                  <button className="icon-button" onClick={() => openEdit(doc)} title="Editar">
                    <Pencil size={15} />
                  </button>
                  <button className="icon-button danger" onClick={() => remove(doc)} title="Eliminar">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
