import { FormEvent, useEffect, useState } from 'react';
import { Mail, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSiteSettings, type SiteSettings } from '@/lib/content';

function AdminError({ message }: { message: string }) {
  return <div className="admin-error">{message}</div>;
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const current = await getSiteSettings();
      if (!active) return;
      setSettings(current);
      setEmail(current?.institutional_email ?? '');
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const trimmed = email.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('El correo no tiene un formato válido.');
      setSaving(false);
      return;
    }
    if (settings) {
      const { error: updateError } = await supabase
        .from('site_settings')
        .update({ institutional_email: trimmed })
        .eq('id', settings.id);
      if (updateError) setError('No se pudo guardar la configuración.');
      else setNotice('Configuración guardada. El correo se actualizará en el sitio público.');
    } else {
      const { data, error: insertError } = await supabase
        .from('site_settings')
        .insert({ institutional_email: trimmed })
        .select()
        .maybeSingle();
      if (insertError || !data) setError('No se pudo guardar la configuración.');
      else {
        setSettings(data as SiteSettings);
        setNotice('Configuración guardada. El correo se actualizará en el sitio público.');
      }
    }
    setSaving(false);
  }

  if (loading) return <div className="admin-loading">Cargando configuración…</div>;

  return (
    <div className="settings-panel">
      <div className="settings-card">
        <span className="eyebrow">Configuración del sitio</span>
        <h2>Correo institucional</h2>
        <p className="settings-help">
          Este correo aparece públicamente en la sección de contacto y como enlace para enviar
          mensajes. Cámbialo aquí y se actualizará en todo el sitio sin tocar el código.
        </p>
        <form className="admin-form" onSubmit={save}>
          <label>
            Correo institucional
            <span className="input-with-icon">
              <Mail size={16} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="contacto@aafrigamag.org"
              />
            </span>
          </label>
          {error && <AdminError message={error} />}
          {notice && <div className="admin-notice">{notice}</div>}
          <button className="button button-green" disabled={saving}>
            <Save size={16} /> {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </form>
      </div>
    </div>
  );
}
