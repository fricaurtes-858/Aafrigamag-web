import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Save, Youtube } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_CONTACT_SETTINGS,
  getSiteSettings,
  type SiteSettings,
} from '@/lib/content';

function AdminError({ message }: { message: string }) {
  return <div className="admin-error">{message}</div>;
}

type FieldDef = { key: keyof SiteSettings; label: string; placeholder?: string; type?: string };

const CONTACT_FIELDS: FieldDef[] = [
  { key: 'contact_eyebrow', label: 'Encabezado pequeño', placeholder: 'Estamos para escucharte' },
  { key: 'contact_title', label: 'Título principal', placeholder: 'Construyamos juntos.' },
  { key: 'contact_intro', label: 'Texto descriptivo', placeholder: '¿Tienes una idea…?' },
  { key: 'contact_municipality', label: 'Municipio', placeholder: 'Plato' },
  { key: 'contact_department', label: 'Departamento', placeholder: 'Magdalena' },
  { key: 'contact_country', label: 'País', placeholder: 'Colombia' },
  { key: 'contact_phone', label: 'Teléfono', placeholder: '+57 300 000 0000' },
  { key: 'contact_whatsapp', label: 'Número de WhatsApp (solo dígitos, con código país)', placeholder: '573000000000' },
  { key: 'contact_facebook', label: 'URL de Facebook', placeholder: 'https://facebook.com/…' },
  { key: 'contact_instagram', label: 'URL de Instagram', placeholder: 'https://instagram.com/…' },
  { key: 'contact_youtube', label: 'URL de YouTube', placeholder: 'https://youtube.com/…' },
];

const FORM_FIELDS: FieldDef[] = [
  { key: 'form_label_name', label: 'Etiqueta: Nombre completo' },
  { key: 'form_placeholder_name', label: 'Placeholder: Nombre completo' },
  { key: 'form_label_email', label: 'Etiqueta: Correo electrónico' },
  { key: 'form_placeholder_email', label: 'Placeholder: Correo electrónico' },
  { key: 'form_label_phone', label: 'Etiqueta: Teléfono' },
  { key: 'form_placeholder_phone', label: 'Placeholder: Teléfono' },
  { key: 'form_label_subject', label: 'Etiqueta: Asunto' },
  { key: 'form_placeholder_subject', label: 'Placeholder: Asunto' },
  { key: 'form_label_message', label: 'Etiqueta: Mensaje' },
  { key: 'form_placeholder_message', label: 'Placeholder: Mensaje' },
  { key: 'form_label_attachments', label: 'Etiqueta: Documentos adjuntos' },
  { key: 'form_consent_text', label: 'Texto de aceptación de tratamiento de datos' },
  { key: 'form_submit_text', label: 'Texto del botón Enviar' },
  { key: 'form_success_title', label: 'Título del mensaje de envío exitoso' },
  { key: 'form_success_text', label: 'Texto del mensaje de envío exitoso' },
];

const EMAIL_KEY: keyof SiteSettings = 'institutional_email';

export default function SettingsPanel() {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const current = await getSiteSettings();
      if (!active) return;
      if (current) {
        setSettingsId(current.id);
        setValues({ ...current });
      } else {
        setValues({ ...DEFAULT_CONTACT_SETTINGS });
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setNotice('');
  }

  const locationText = useMemo(() => {
    const muni = (values.contact_municipality ?? '').trim();
    const dept = (values.contact_department ?? '').trim();
    const country = (values.contact_country ?? '').trim();
    return [muni, dept, country].filter(Boolean).join(', ').replace(/,([^,]*)$/, ' ·$1');
  }, [values.contact_municipality, values.contact_department, values.contact_country]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const email = (values[EMAIL_KEY] ?? '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('El correo no tiene un formato válido.');
      setSaving(false);
      return;
    }

    const payload: Record<string, string> = { ...values, institutional_email: email };
    // Strip non-editable keys
    delete payload.id;
    delete payload.updated_at;

    if (settingsId) {
      const { error: updateError } = await supabase
        .from('site_settings')
        .update(payload)
        .eq('id', settingsId);
      if (updateError) setError('No se pudo guardar la configuración.');
      else setNotice('Configuración guardada. Los cambios se reflejan en el sitio público.');
    } else {
      const { data, error: insertError } = await supabase
        .from('site_settings')
        .insert(payload)
        .select()
        .maybeSingle();
      if (insertError || !data) {
        setError('No se pudo guardar la configuración.');
      } else {
        setSettingsId((data as SiteSettings).id);
        setNotice('Configuración guardada. Los cambios se reflejan en el sitio público.');
      }
    }
    setSaving(false);
  }

  if (loading) return <div className="admin-loading">Cargando configuración…</div>;

  const facebook = (values.contact_facebook ?? '').trim();
  const instagram = (values.contact_instagram ?? '').trim();
  const youtube = (values.contact_youtube ?? '').trim();
  const whatsapp = (values.contact_whatsapp ?? '').trim();
  const email = (values.institutional_email ?? '').trim();

  return (
    <div className="settings-panel">
      <div className="settings-card">
        <span className="eyebrow">Configuración del sitio</span>
        <h2>Sección "Construyamos juntos"</h2>
        <p className="settings-help">
          Aquí editas todos los textos, la ubicación, el correo institucional, las redes
          sociales, el WhatsApp y los textos del formulario. Los cambios se guardan en la
          base de datos y se muestran en el sitio público sin tocar el código.
        </p>

        <form className="admin-form" onSubmit={save}>
          <h3 className="settings-group-title">Correo institucional</h3>
          <label>
            Correo institucional
            <span className="input-with-icon">
              <Mail size={16} />
              <input
                type="email"
                value={email}
                onChange={(event) => update(EMAIL_KEY, event.target.value)}
                placeholder="contacto@aafrigamag.org"
              />
            </span>
          </label>

          <h3 className="settings-group-title">Información de contacto</h3>
          {CONTACT_FIELDS.map((field) => (
            <label key={field.key}>
              {field.label}
              <input
                type={field.type ?? 'text'}
                value={(values[field.key] as string) ?? ''}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
              />
            </label>
          ))}

          <h3 className="settings-group-title">Textos del formulario</h3>
          {FORM_FIELDS.map((field) => (
            <label key={field.key}>
              {field.label}
              <input
                type="text"
                value={(values[field.key] as string) ?? ''}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
              />
            </label>
          ))}

          {error && <AdminError message={error} />}
          {notice && <div className="admin-notice">{notice}</div>}
          <button className="button button-green" disabled={saving}>
            <Save size={16} /> {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      <div className="settings-card">
        <span className="eyebrow">Vista previa</span>
        <h2>Cómo se verá en el sitio</h2>
        <div className="settings-preview">
          <span className="eyebrow">{values.contact_eyebrow || 'Estamos para escucharte'}</span>
          <h3>{values.contact_title || 'Construyamos juntos.'}</h3>
          <p>{values.contact_intro || ''}</p>
          <div className="settings-preview-lines">
            <span><MapPin size={16} /> {locationText || 'Plato, Magdalena · Colombia'}</span>
            {email ? <span><Mail size={16} /> {email}</span> : <span><Mail size={16} /> Correo por configurar</span>}
            {(values.contact_phone ?? '').trim() && (
              <span><Phone size={16} /> {values.contact_phone}</span>
            )}
          </div>
          <div className="settings-preview-socials">
            {facebook && <span><Facebook size={16} /> Facebook</span>}
            {instagram && <span><Instagram size={16} /> Instagram</span>}
            {youtube && <span><Youtube size={16} /> YouTube</span>}
            {!facebook && !instagram && !youtube && <span className="muted">Sin redes configuradas</span>}
          </div>
          <div className="settings-preview-whatsapp">
            {whatsapp ? <span><MessageCircle size={16} /> WhatsApp: {whatsapp}</span> : <span className="muted">WhatsApp no configurado (botón oculto)</span>}
          </div>
          <hr />
          <div className="settings-preview-form">
            <strong>{values.form_label_name || 'Nombre completo'}</strong>
            <input disabled placeholder={values.form_placeholder_name || 'Tu nombre completo'} />
            <strong>{values.form_label_email || 'Correo electrónico'}</strong>
            <input disabled placeholder={values.form_placeholder_email || 'Tu correo electrónico'} />
            <strong>{values.form_label_phone || 'Teléfono (opcional)'}</strong>
            <input disabled placeholder={values.form_placeholder_phone || 'Tu número de teléfono'} />
            <strong>{values.form_label_subject || 'Asunto'}</strong>
            <input disabled placeholder={values.form_placeholder_subject || '¿Sobre qué nos escribes?'} />
            <strong>{values.form_label_message || 'Mensaje'}</strong>
            <textarea disabled placeholder={values.form_placeholder_message || 'Cuéntanos cómo podemos ayudarte'} rows={2} />
            <strong>{values.form_label_attachments || 'Documentos adjuntos (opcional)'}</strong>
            <label className="consent"><input type="checkbox" disabled /> {values.form_consent_text || 'Acepto el tratamiento de mis datos personales.'}</label>
            <button type="button" className="button button-green" disabled>{values.form_submit_text || 'Enviar mensaje'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
