import { ChangeEvent, useEffect, useState } from 'react';
import { FileText, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  deleteSiteFile,
  fileKey,
  getAllStories,
  getStoryWithRelations,
  publicUrl,
  uploadSiteFile,
  type OurStory,
  type StoryDocument,
  type StoryPhoto,
} from '@/lib/content';

function errMsg(): string {
  return 'No pudimos completar la acción. Revisa e inténtalo de nuevo.';
}

export default function StoryPanel() {
  const [stories, setStories] = useState<OurStory[]>([]);
  const [selected, setSelected] = useState<OurStory | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await getAllStories();
      setStories(list);
      if (list.length > 0) await openStory(list[0]);
      setLoading(false);
    })();
  }, []);

  async function loadList() {
    const list = await getAllStories();
    setStories(list);
  }

  async function openStory(story: OurStory) {
    const full = await getStoryWithRelations(story.id);
    setSelected(full);
  }

  async function createStory() {
    const { data, error: insertError } = await supabase
      .from('our_story')
      .insert({ title: 'Nuestra historia' })
      .select()
      .maybeSingle();
    if (insertError || !data) {
      setError(errMsg());
      return;
    }
    await loadList();
    await openStory(data as OurStory);
  }

  function updateField<K extends keyof OurStory>(key: K, value: OurStory[K]) {
    if (!selected) return;
    setSelected({ ...selected, [key]: value });
  }

  async function saveStory() {
    if (!selected) return;
    setNotice('');
    setError('');
    const { error: updateError } = await supabase
      .from('our_story')
      .update({
        title: selected.title,
        subtitle: selected.subtitle,
        intro: selected.intro,
        body: selected.body,
        status: selected.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id);
    if (updateError) setError(errMsg());
    else {
      setNotice('Historia guardada.');
      await loadList();
    }
  }

  async function togglePublish() {
    if (!selected) return;
    const nextStatus = selected.status === 'published' ? 'draft' : 'published';
    const { error: updateError } = await supabase
      .from('our_story')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (updateError) setError(errMsg());
    else {
      setSelected({ ...selected, status: nextStatus });
      setNotice(nextStatus === 'published' ? 'Historia publicada.' : 'Historia despublicada.');
      await loadList();
    }
  }

  async function addPhoto(event: ChangeEvent<HTMLInputElement>) {
    if (!selected || !event.target.files?.length) return;
    const file = event.target.files[0];
    const path = `story/${selected.id}/${fileKey()}-${file.name}`;
    const { path: stored, error: uploadError } = await uploadSiteFile(path, file, true);
    if (uploadError) {
      setError('No se pudo subir la fotografía.');
      return;
    }
    const { data, error: insertError } = await supabase
      .from('our_story_photos')
      .insert({ story_id: selected.id, storage_path: stored, caption: '', sort_order: selected.photos?.length ?? 0 })
      .select()
      .maybeSingle();
    if (insertError || !data) {
      setError(errMsg());
      return;
    }
    setSelected({ ...selected, photos: [...(selected.photos ?? []), data as StoryPhoto] });
    event.target.value = '';
  }

  async function removePhoto(photo: StoryPhoto) {
    if (!window.confirm('¿Eliminar esta fotografía?')) return;
    await deleteSiteFile(photo.storage_path);
    await supabase.from('our_story_photos').delete().eq('id', photo.id);
    if (selected) setSelected({ ...selected, photos: selected.photos?.filter((p) => p.id !== photo.id) });
  }

  async function addDocument(event: ChangeEvent<HTMLInputElement>) {
    if (!selected || !event.target.files?.length) return;
    const file = event.target.files[0];
    const path = `story/${selected.id}/docs/${fileKey()}-${file.name}`;
    const { path: stored, error: uploadError } = await uploadSiteFile(path, file, true);
    if (uploadError) {
      setError('No se pudo subir el documento.');
      return;
    }
    const { data, error: insertError } = await supabase
      .from('our_story_documents')
      .insert({ story_id: selected.id, storage_path: stored, original_name: file.name, title: file.name, sort_order: selected.documents?.length ?? 0 })
      .select()
      .maybeSingle();
    if (insertError || !data) {
      setError(errMsg());
      return;
    }
    setSelected({ ...selected, documents: [...(selected.documents ?? []), data as StoryDocument] });
    event.target.value = '';
  }

  async function removeDocument(doc: StoryDocument) {
    if (!window.confirm('¿Eliminar este documento?')) return;
    await deleteSiteFile(doc.storage_path);
    await supabase.from('our_story_documents').delete().eq('id', doc.id);
    if (selected) setSelected({ ...selected, documents: selected.documents?.filter((d) => d.id !== doc.id) });
  }

  if (loading) return <div className="admin-loading">Cargando historia…</div>;

  return (
    <div className="story-panel">
      {error && <div className="admin-error">{error}</div>}
      {notice && <div className="admin-notice">{notice}</div>}
      {stories.length === 0 ? (
        <div className="admin-empty">
          <FileText size={28} />
          <h2>No hay historia todavía</h2>
          <p>Crea la historia de AAFRIGAMAG para editarla desde aquí.</p>
          <button className="button button-green" onClick={createStory}>
            <Plus size={16} /> Crear historia
          </button>
        </div>
      ) : (
        <div className="story-editor">
          <div className="story-editor-head">
            <div>
              <input
                className="editor-title"
                value={selected?.title ?? ''}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="Título de la historia"
              />
              <span className={`read-badge ${selected?.status === 'published' ? 'read' : 'unread'}`}>
                {selected?.status === 'published' ? 'Publicada' : 'Borrador'}
              </span>
            </div>
            <div className="story-actions">
              <button className="button button-outline" onClick={togglePublish}>
                {selected?.status === 'published' ? 'Despublicar' : 'Publicar'}
              </button>
              <button className="button button-green" onClick={saveStory}>
                <Save size={16} /> Guardar
              </button>
            </div>
          </div>

          {selected && (
            <>
              <label className="story-field">
                Subtítulo
                <input value={selected.subtitle} onChange={(event) => updateField('subtitle', event.target.value)} placeholder="Subtítulo o bajada" />
              </label>
              <label className="story-field">
                Intro (resumen breve)
                <textarea value={selected.intro} onChange={(event) => updateField('intro', event.target.value)} rows={3} placeholder="Texto introductorio breve que aparece en la sección Nosotros" />
              </label>

              <div className="story-section-block">
                <div className="story-block-head">
                  <h3>Historia completa</h3>
                  <p>Escribe cada párrafo separado por una línea en blanco. Se mostrarán como párrafos en la página pública.</p>
                </div>
                <textarea
                  className="story-body-area"
                  rows={14}
                  placeholder={'Escribe aquí la historia de AAFRIGAMAG.\n\nCada salto de línea inicia un nuevo párrafo en la página pública.'}
                  value={selected.body}
                  onChange={(event) => updateField('body', event.target.value)}
                />
              </div>

              <div className="story-section-block">
                <div className="story-block-head">
                  <h3>Fotografías</h3>
                  <label className="button button-outline upload-btn">
                    <ImagePlus size={16} /> Subir foto
                    <input type="file" accept="image/*" hidden onChange={addPhoto} />
                  </label>
                </div>
                {(!selected.photos || selected.photos.length === 0) && (
                  <p className="story-empty">Aún no hay fotografías.</p>
                )}
                <div className="story-photos-grid">
                  {selected.photos?.map((photo) => {
                    const url = publicUrl(photo.storage_path);
                    return (
                      <div className="story-photo-card" key={photo.id}>
                        {url && <img src={url} alt={photo.caption || 'Foto de la historia'} loading="lazy" />}
                        <input
                          value={photo.caption}
                          onChange={async (event) => {
                            const caption = event.target.value;
                            await supabase.from('our_story_photos').update({ caption }).eq('id', photo.id);
                            setSelected({
                              ...selected,
                              photos: selected.photos?.map((p) => (p.id === photo.id ? { ...p, caption } : p)),
                            });
                          }}
                          placeholder="Pie de foto"
                        />
                        <button className="icon-button danger" onClick={() => removePhoto(photo)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="story-section-block">
                <div className="story-block-head">
                  <h3>Documentos relacionados</h3>
                  <label className="button button-outline upload-btn">
                    <FileText size={16} /> Subir documento
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf" hidden onChange={addDocument} />
                  </label>
                </div>
                {(!selected.documents || selected.documents.length === 0) && (
                  <p className="story-empty">Aún no hay documentos relacionados.</p>
                )}
                <div className="story-docs-list">
                  {selected.documents?.map((doc) => {
                    const url = publicUrl(doc.storage_path);
                    return (
                      <div className="story-doc-row" key={doc.id}>
                        <FileText size={18} />
                        <input
                          value={doc.title}
                          onChange={async (event) => {
                            const title = event.target.value;
                            await supabase.from('our_story_documents').update({ title }).eq('id', doc.id);
                            setSelected({
                              ...selected,
                              documents: selected.documents?.map((d) => (d.id === doc.id ? { ...d, title } : d)),
                            });
                          }}
                        />
                        {url && (
                          <a className="text-link" href={url} target="_blank" rel="noreferrer">
                            Abrir
                          </a>
                        )}
                        <button className="icon-button danger" onClick={() => removeDocument(doc)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
