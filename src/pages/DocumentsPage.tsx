import { useMemo, useState } from 'react';
import { ArrowLeft, Download, FileText, Search } from 'lucide-react';
import { DOCUMENT_CATEGORIES, getPublishedDocuments, publicUrl, type DocumentCategory, type DocumentItem } from '@/lib/content';
import { useEffect } from 'react';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DocumentCategory | 'Todas'>('Todas');

  useEffect(() => {
    (async () => {
      const list = await getPublishedDocuments();
      setDocuments(list);
      setLoaded(true);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (category !== 'Todas' && doc.category !== category) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q)
      );
    });
  }, [documents, query, category]);

  return (
    <div className="documents-page-shell">
      <section className="documents-hero">
        <div className="page-width">
          <a href="/" className="admin-back"><ArrowLeft size={15} /> Volver al sitio</a>
          <span className="eyebrow">Biblioteca institucional</span>
          <h1>Documentos</h1>
          <p>Consulta y descarga documentos institucionales, informes, proyectos y resoluciones de AAFRIGAMAG.</p>
        </div>
      </section>

      <section className="page-width documents-controls">
        <label className="documents-search">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, descripción o categoría…"
          />
        </label>
        <div className="documents-filters">
          <button
            className={`doc-filter-chip ${category === 'Todas' ? 'active' : ''}`}
            onClick={() => setCategory('Todas')}
          >
            Todas
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`doc-filter-chip ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="page-width documents-list">
        {!loaded ? (
          <div className="admin-loading">Cargando documentos…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <FileText size={28} />
            <h2>No hay documentos</h2>
            <p>No encontramos documentos que coincidan con tu búsqueda.</p>
          </div>
        ) : (
          filtered.map((doc) => {
            const url = publicUrl(doc.storage_path);
            return (
              <article className="document-row" key={doc.id}>
                <div className="document-row-icon"><FileText size={22} /></div>
                <div className="document-row-main">
                  <strong>{doc.title}</strong>
                  {doc.description && <p>{doc.description}</p>}
                  <div className="document-row-meta">
                    <span className="doc-cat">{doc.category}</span>
                    <span>{formatDate(doc.doc_date)}</span>
                  </div>
                </div>
                {url && (
                  <a className="button button-outline document-row-btn" href={url} target="_blank" rel="noreferrer">
                    <Download size={15} /> Ver / descargar
                  </a>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
