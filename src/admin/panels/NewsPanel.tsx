import { FormEvent, useEffect, useState } from 'react';
import { Calendar, ImagePlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  deleteSiteFile,
  fileKey,
  getAllNews,
  getNewsWithPhotos,
  publicUrl,
  slugify,
  uploadSiteFile,
  type NewsPhoto,
  type NewsPost,
} from '@/lib/content';

function errMsg(): string {
  return 'No pudimos completar la acción. Revisa e inténtalo de nuevo.';
}

type Draft = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  cover_path: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
};

const emptyDraft: Draft = {
  title: '',
  slug: '',
  summary: '',
  body: '',
  cover_path: null,
  status: 'draft',
  published_at: null,
};

export default function NewsPanel() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [photos, setPhotos] = useState<NewsPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [extraPhoto, setExtraPhoto] = useState<File | null>(null);

  async function load() {
    const list = await getAllNews();
    setPosts(list);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing({ ...emptyDraft });
    setPhotos([]);
    setCoverFile(null);
    setExtraPhoto(null);
    setError('');
    setNotice('');
  }

  async function openEdit(post: NewsPost) {
    const full = await getNewsWithPhotos(post.id);
    setEditing({
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      body: post.body,
      cover_path: post.cover_path,
      status: post.status,
      published_at: post.published_at,
    });
    setPhotos(full?.photos ?? []);
    setCoverFile(null);
    setExtraPhoto(null);
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
    let slug = editing.slug.trim() || slugify(editing.title);
    if (!slug) slug = `noticia-${Date.now().toString(36)}`;
    const isPublished = editing.status === 'published';
    const publishedAt = isPublished ? editing.published_at ?? new Date().toISOString() : editing.published_at;

    if (editing.id) {
      let coverPath = editing.cover_path;
      if (coverFile) {
        const path = `news/${editing.id}/cover-${fileKey()}-${coverFile.name}`;
        const { path: stored, error: uploadError } = await uploadSiteFile(path, coverFile, true);
        if (uploadError) {
          setError('No se pudo subir la imagen principal.');
          setSaving(false);
          return;
        }
        if (coverPath) await deleteSiteFile(coverPath);
        coverPath = stored;
      }
      const { error: updateError } = await supabase
        .from('news_posts')
        .update({
          title: editing.title.trim(),
          slug,
          summary: editing.summary,
          body: editing.body,
          cover_path: coverPath,
          status: editing.status,
          published_at: publishedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);
      if (updateError) {
        setError(errMsg());
        setSaving(false);
        return;
      }
      setNotice('Noticia guardada.');
      await load();
      await openEdit({ ...(editing as NewsPost), slug, cover_path: coverPath, published_at: publishedAt } as NewsPost);
    } else {
      const { data, error: insertError } = await supabase
        .from('news_posts')
        .insert({
          title: editing.title.trim(),
          slug,
          summary: editing.summary,
          body: editing.body,
          status: editing.status,
          published_at: publishedAt,
          cover_path: null,
        })
        .select()
        .maybeSingle();
      if (insertError || !data) {
        setError(errMsg());
        setSaving(false);
        return;
      }
      const created = data as NewsPost;
      if (coverFile) {
        const path = `news/${created.id}/cover-${fileKey()}-${coverFile.name}`;
        const { path: stored, error: uploadError } = await uploadSiteFile(path, coverFile, true);
        if (!uploadError) {
          await supabase.from('news_posts').update({ cover_path: stored }).eq('id', created.id);
        }
      }
      setNotice('Noticia creada.');
      await load();
      await openEdit({ ...created, cover_path: null } as NewsPost);
    }
    setSaving(false);
  }

  async function togglePublish(post: NewsPost) {
    const next = post.status === 'published' ? 'draft' : 'published';
    const publishedAt = next === 'published' ? post.published_at ?? new Date().toISOString() : post.published_at;
    const { error: updateError } = await supabase
      .from('news_posts')
      .update({ status: next, published_at: publishedAt, updated_at: new Date().toISOString() })
      .eq('id', post.id);
    if (updateError) setError(errMsg());
    else await load();
  }

  async function remove(post: NewsPost) {
    if (!window.confirm('¿Eliminar esta noticia permanentemente?')) return;
    if (post.cover_path) await deleteSiteFile(post.cover_path);
    const { data: photoRows } = await supabase.from('news_photos').select('storage_path').eq('post_id', post.id);
    if (photoRows && photoRows.length > 0) {
      for (const row of photoRows) {
        await deleteSiteFile((row as { storage_path: string }).storage_path);
      }
    }
    const { error: deleteError } = await supabase.from('news_posts').delete().eq('id', post.id);
    if (deleteError) setError(errMsg());
    else {
      if (editing?.id === post.id) setEditing(null);
      await load();
    }
  }

  async function addExtraPhoto() {
    if (!editing?.id || !extraPhoto) return;
    const path = `news/${editing.id}/photo-${fileKey()}-${extraPhoto.name}`;
    const { path: stored, error: uploadError } = await uploadSiteFile(path, extraPhoto, true);
    if (uploadError) {
      setError('No se pudo subir la fotografía.');
      return;
    }
    const { data, error: insertError } = await supabase
      .from('news_photos')
      .insert({ post_id: editing.id, storage_path: stored, caption: '', sort_order: photos.length })
      .select()
      .maybeSingle();
    if (insertError || !data) {
      setError(errMsg());
      return;
    }
    setPhotos([...photos, data as NewsPhoto]);
    setExtraPhoto(null);
  }

  async function removePhoto(photo: NewsPhoto) {
    if (!window.confirm('¿Eliminar esta fotografía?')) return;
    await deleteSiteFile(photo.storage_path);
    await supabase.from('news_photos').delete().eq('id', photo.id);
    setPhotos(photos.filter((p) => p.id !== photo.id));
  }

  if (!loaded) return <div className="admin-loading">Cargando noticias…</div>;

  return (
    <div className="news-panel">
      {error && <div className="admin-error">{error}</div>}
      {notice && <div className="admin-notice">{notice}</div>}
      {!editing && (
        <div className="admin-toolbar">
          <button className="button button-green" onClick={openNew}>
            <Plus size={16} /> Nueva noticia
          </button>
        </div>
      )}
      {editing ? (
        <form className="admin-modal-flat" onSubmit={save}>
          <div className="flat-head">
            <h2>{editing.id ? 'Editar noticia' : 'Nueva noticia'}</h2>
            <button type="button" className="modal-close" onClick={() => setEditing(null)}>
              <X size={18} />
            </button>
          </div>
          <label className="story-field">
            Título
            <input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} required />
          </label>
          <label className="story-field">
            Slug (URL amigable)
            <input
              value={editing.slug}
              onChange={(event) => setEditing({ ...editing, slug: event.target.value })}
              placeholder={slugify(editing.title) || 'auto'}
            />
            <small>Se usa en /noticias/&lt;slug&gt;. Si lo dejas vacío, se genera automáticamente.</small>
          </label>
          <label className="story-field">
            Resumen
            <textarea value={editing.summary} onChange={(event) => setEditing({ ...editing, summary: event.target.value })} rows={2} />
          </label>
          <label className="story-field">
            Contenido completo
            <textarea
              className="news-body-area"
              value={editing.body}
              onChange={(event) => setEditing({ ...editing, body: event.target.value })}
              rows={10}
              placeholder="Escribe el contenido de la noticia. Cada salto de línea inicia un párrafo."
            />
          </label>
          <div className="form-row-3">
            <label className="story-field">
              Estado
              <select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as 'draft' | 'published' })}>
                <option value="draft">Borrador</option>
                <option value="published">Publicada</option>
              </select>
            </label>
            <label className="story-field">
              Fecha de publicación
              <span className="settings-help">
                {editing.published_at ? new Date(editing.published_at).toLocaleString('es-CO') : 'Se asigna al publicar'}
              </span>
            </label>
          </div>
          <label className="story-field">
            Imagen principal
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
            />
            {editing.cover_path && !coverFile && (
              <small className="current-file">
                Actual: <a href={publicUrl(editing.cover_path) ?? '#'} target="_blank" rel="noreferrer">ver imagen</a>
              </small>
            )}
          </label>

          {editing.id && (
            <div className="story-section-block">
              <div className="story-block-head">
                <h3>Fotografías adicionales</h3>
                <label className="button button-outline upload-btn">
                  <ImagePlus size={16} /> Subir foto
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      setExtraPhoto(event.target.files?.[0] ?? null);
                      if (event.target.files?.[0]) {
                        setTimeout(addExtraPhoto, 0);
                      }
                    }}
                  />
                </label>
              </div>
              {photos.length === 0 && <p className="story-empty">Aún no hay fotografías adicionales.</p>}
              <div className="story-photos-grid">
                {photos.map((photo) => {
                  const url = publicUrl(photo.storage_path);
                  return (
                    <div className="story-photo-card" key={photo.id}>
                      {url && <img src={url} alt={photo.caption || 'Foto adicional'} loading="lazy" />}
                      <input
                        value={photo.caption}
                        onChange={async (event) => {
                          const caption = event.target.value;
                          await supabase.from('news_photos').update({ caption }).eq('id', photo.id);
                          setPhotos(photos.map((p) => (p.id === photo.id ? { ...p, caption } : p)));
                        }}
                        placeholder="Pie de foto"
                      />
                      <button type="button" className="icon-button danger" onClick={() => removePhoto(photo)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flat-actions">
            <button className="button button-green" disabled={saving}>
              <Save size={16} /> {saving ? 'Guardando…' : 'Guardar noticia'}
            </button>
            <button type="button" className="button button-outline" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : posts.length === 0 ? (
        <div className="admin-empty">
          <Calendar size={28} />
          <h2>No hay noticias todavía</h2>
          <p>Crea la primera noticia de AAFRIGAMAG.</p>
        </div>
      ) : (
        <div className="news-admin-list">
          {posts.map((post) => {
            const cover = publicUrl(post.cover_path);
            return (
              <div className="news-admin-row" key={post.id}>
                {cover ? <img src={cover} alt={post.title} loading="lazy" /> : <div className="news-admin-noimg" />}
                <div className="news-admin-info">
                  <strong>{post.title}</strong>
                  <span>/noticias/{post.slug}</span>
                  <p>{post.summary || 'Sin resumen'}</p>
                  <div className="news-admin-meta">
                    <span className={`read-badge ${post.status === 'published' ? 'read' : 'unread'}`}>
                      {post.status === 'published' ? 'Publicada' : 'Borrador'}
                    </span>
                    {post.published_at && <span>{new Date(post.published_at).toLocaleDateString('es-CO')}</span>}
                  </div>
                </div>
                <div className="news-admin-actions">
                  <button className="icon-button" onClick={() => togglePublish(post)} title={post.status === 'published' ? 'Despublicar' : 'Publicar'}>
                    {post.status === 'published' ? <X size={15} /> : <Plus size={15} />}
                  </button>
                  <button className="icon-button" onClick={() => openEdit(post)} title="Editar">
                    <Pencil size={15} />
                  </button>
                  <button className="icon-button danger" onClick={() => remove(post)} title="Eliminar">
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
