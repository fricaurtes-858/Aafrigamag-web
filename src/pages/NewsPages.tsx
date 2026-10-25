import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { getAllPublishedNews, getNewsBySlug, publicUrl, type NewsPost } from '@/lib/content';

function formatDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function NewsPages() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const parts = path.split('/');
  const slug = parts[1] ?? '';
  const [post, setPost] = useState<NewsPost | null>(null);
  const [list, setList] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'detail' | 'notfound'>('list');

  useEffect(() => {
    (async () => {
      if (slug) {
        const found = await getNewsBySlug(slug);
        if (found) {
          setPost(found);
          setMode('detail');
          setLoading(false);
          return;
        }
        setMode('notfound');
        setLoading(false);
        return;
      }
      const all = await getAllPublishedNews();
      setList(all);
      setMode('list');
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="public-form-shell"><div className="admin-loading">Cargando…</div></div>;

  if (mode === 'notfound') {
    return (
      <div className="public-form-shell">
        <div className="public-form-card">
          <a href="/noticias" className="admin-back"><ArrowLeft size={15} /> Volver a noticias</a>
          <div className="admin-empty">
            <h2>Noticia no encontrada</h2>
            <p>La noticia que buscas no está disponible o fue retirada.</p>
            <a className="button button-green" href="/noticias">Ver todas las noticias</a>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'detail' && post) {
    const cover = publicUrl(post.cover_path);
    return (
      <article className="news-detail-shell">
        <div className="news-detail-head page-width">
          <a href="/noticias" className="admin-back"><ArrowLeft size={15} /> Todas las noticias</a>
          <span className="eyebrow">AAFRIGAMAG · Noticias</span>
          <h1>{post.title}</h1>
          <div className="news-detail-meta">
            {post.published_at && <span><Calendar size={15} /> {formatDate(post.published_at)}</span>}
          </div>
        </div>
        {cover && (
          <div className="news-detail-cover">
            <img src={cover} alt={post.title} />
          </div>
        )}
        <div className="news-detail-body page-width">
          {post.summary && <p className="news-detail-summary">{post.summary}</p>}
          {post.body.split(/\n{2,}|\n/).filter(Boolean).map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
          {post.photos && post.photos.length > 0 && (
            <div className="news-detail-photos">
              {post.photos.map((photo) => {
                const url = publicUrl(photo.storage_path);
                if (!url) return null;
                return (
                  <figure key={photo.id}>
                    <img src={url} alt={photo.caption || 'Fotografía de la noticia'} loading="lazy" />
                    {photo.caption && <figcaption>{photo.caption}</figcaption>}
                  </figure>
                );
              })}
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="news-list-shell">
      <section className="news-list-hero">
        <div className="page-width">
          <span className="eyebrow">Desde el territorio</span>
          <h1>Noticias de AAFRIGAMAG</h1>
          <p>Historias, aprendizajes y momentos que conectan a la organización con su comunidad.</p>
        </div>
      </section>
      <section className="page-width news-list-grid">
        {list.length === 0 ? (
          <div className="admin-empty">
            <Calendar size={28} />
            <h2>No hay noticias publicadas</h2>
            <p>Las noticias aparecerán aquí cuando el equipo las publique.</p>
          </div>
        ) : (
          list.map((item) => {
            const cover = publicUrl(item.cover_path);
            return (
              <a className="news-card" key={item.id} href={`/noticias/${item.slug}`}>
                {cover ? (
                  <img src={cover} alt={item.title} loading="lazy" />
                ) : (
                  <div className="news-card-noimg"><Calendar size={26} /></div>
                )}
                <div className="news-card-body">
                  {item.published_at && <span className="news-card-date">{formatDate(item.published_at)}</span>}
                  <h3>{item.title}</h3>
                  {item.summary && <p>{item.summary}</p>}
                  <span className="text-link">Leer noticia <ArrowRight size={15} /></span>
                </div>
              </a>
            );
          })
        )}
      </section>
    </div>
  );
}
