import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Facebook,
  FileText,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Radio,
  Sprout,
  Target,
  Users,
  X,
  Youtube,
} from 'lucide-react';
import RadioPlayer from '@/components/RadioPlayer';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const images = {
  logo: '/images/WhatsApp_Image_2026-10-23_at_12.37.17_PM.jpeg',
  qr: '/images/WhatsApp_Image_2026-10-23_at_12.44.09_PM.jpeg',
  hero: '/images/WhatsApp_Image_2026-10-23_at_12.42.43_PM.jpeg',
  community: '/images/gallery/WhatsApp_Image_2026-10-23_at_12.46.29_PM.jpeg',
  stand: '/images/gallery/WhatsApp_Image_2026-10-23_at_12.45.36_PM(1).jpeg',
  productive: '/images/Retrato_rural_con_nino_y_burro.png',
  territory: '/images/gallery/WhatsApp_Image_2026-10-23_at_12.46.41_PM.jpeg',
  farm: '/images/gallery/WhatsApp_Image_2026-10-23_at_12.46.19_PM(1).jpeg',
  market: '/images/gallery/WhatsApp_Image_2026-10-23_at_12.46.06_PM.jpeg',
};

type SectionTagProps = { eyebrow: string; title: string; intro?: string; light?: boolean };

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`} aria-label="AAFRIGAMAG">
      <img className="official-logo" src={images.logo} alt="Logo oficial de AAFRIGAMAG" />
    </div>
  );
}

function SectionTag({ eyebrow, title, intro, light = false }: SectionTagProps) {
  return (
    <div className={`section-heading ${light ? 'light' : ''}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {intro && <p>{intro}</p>}
    </div>
  );
}

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (status === 'sending') return;

    setStatus('sending');
    setErrorMsg('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus('error');
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    if (!validateEmail(email)) {
      setStatus('error');
      setErrorMsg('El correo electrónico no tiene un formato válido.');
      return;
    }

    if (!consent) {
      setStatus('error');
      setErrorMsg('Debes aceptar el tratamiento de datos para enviar el mensaje.');
      return;
    }

    if (!supabaseConfigured) {
      setStatus('error');
      setErrorMsg('No fue posible enviar el mensaje en este momento. Intenta más tarde.');
      return;
    }

    const { error: insertError } = await supabase
      .from('contact_messages')
      .insert({ name: name.trim(), email: email.trim(), message: message.trim() });

    if (insertError) {
      setStatus('error');
      setErrorMsg('No fue posible enviar el mensaje. Intenta nuevamente en unos minutos.');
      return;
    }

    setName('');
    setEmail('');
    setMessage('');
    setConsent(false);
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <form className="contact-form" onSubmit={(event) => { event.preventDefault(); setStatus('idle'); }}>
        <div className="contact-success">
          <Check size={28} />
          <div>
            <strong>Mensaje recibido</strong>
            <span>Gracias por escribirnos. Te contactaremos pronto.</span>
          </div>
        </div>
        <button className="button button-green" type="submit">Enviar otro mensaje <ArrowRight size={16} /></button>
      </form>
    );
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <label>Nombre<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" disabled={status === 'sending'} /></label>
      <label>Correo electrónico<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" disabled={status === 'sending'} /></label>
      <label>Mensaje<textarea required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Cuéntanos cómo podemos ayudarte" rows={4} disabled={status === 'sending'} /></label>
      <label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={status === 'sending'} /> Acepto el tratamiento de mis datos personales.</label>
      {status === 'error' && <div className="contact-error">{errorMsg}</div>}
      <button className="button button-green" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando…' : 'Enviar mensaje'} <ArrowRight size={16} />
      </button>
    </form>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-shell">
      <div className="topline"><span>Organización social y comunitaria</span><span>Trabajamos en territorio</span></div>
      <header className="site-header">
        <a className="logo-link" href="#inicio" onClick={closeMenu}><Logo /></a>
        <button className="mobile-menu" aria-label="Abrir menú" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="Navegación principal">
          <a href="#nosotros" onClick={closeMenu}>Nosotros</a>
          <a href="#trabajo" onClick={closeMenu}>Qué hacemos</a>
          <a href="#noticias" onClick={closeMenu}>Noticias</a>
          <a href="#convocatorias" onClick={closeMenu}>Convocatorias</a>
          <a href="#galeria" onClick={closeMenu}>Galería</a>
          <a href="#emisora" onClick={closeMenu}>Emisora</a>
          <a href="#contacto" onClick={closeMenu}>Contacto</a>
          <a className="nav-admin" href="/admin" onClick={closeMenu}>Panel admin</a>
          <a className="nav-donate" href="#donaciones" onClick={closeMenu}>Donar <ArrowRight size={16} /></a>
        </nav>
      </header>

      <main>
        <section id="inicio" className="hero-section">
          <div className="hero-photo" style={{ backgroundImage: `url(${images.hero})` }} />
          <div className="hero-overlay" />
          <div className="hero-content page-width">
            <div className="hero-kicker"><span className="dot" /> Presencia que nace en la comunidad</div>
            <h1>Transformamos<br /><em>territorios</em> desde la comunidad.</h1>
            <p>Trabajamos por el fortalecimiento social, cultural, productivo y comunitario de nuestras comunidades.</p>
            <div className="hero-actions"><a href="#trabajo" className="button button-gold">Conoce nuestro trabajo <ArrowRight size={17} /></a><a href="#donaciones" className="button button-ghost">Apoya nuestra misión</a></div>
            <div className="hero-note"><span>01</span><span className="note-line" /><span>Comunidades que lideran su propio desarrollo</span></div>
          </div>
        </section>

        <section className="quick-links page-width">
          <a href="#trabajo" className="quick-card"><span className="quick-icon green"><Sprout /></span><span><strong>Proyectos</strong><small>Conoce nuestras iniciativas</small></span><ArrowRight size={17} /></a>
          <a href="#noticias" className="quick-card"><span className="quick-icon blue"><FileText /></span><span><strong>Noticias</strong><small>Lo que está pasando</small></span><ArrowRight size={17} /></a>
          <a href="#convocatorias" className="quick-card"><span className="quick-icon yellow"><CalendarDays /></span><span><strong>Convocatorias</strong><small>Participa y construye</small></span><ArrowRight size={17} /></a>
          <a href="#donaciones" className="quick-card featured"><span className="quick-icon white"><Target /></span><span><strong>Donaciones</strong><small>Tu aporte transforma</small></span><ArrowRight size={17} /></a>
        </section>

        <section id="nosotros" className="story-section page-width section-pad">
          <div className="story-image-wrap"><img src={images.community} alt="Grupo de integrantes participando en una feria comunitaria" loading="lazy" /><div className="image-caption"><span>AAF</span><span>Trabajo colectivo · Cuidado · Futuro</span></div></div>
          <div className="story-copy"><SectionTag eyebrow="Quiénes somos" title="Una organización que camina con su gente." intro="AAF​​RIGAMAG es una organización social y comunitaria que fortalece procesos nacidos desde las comunidades, sus saberes y sus territorios." /><p>Creemos en la participación, en el trabajo colectivo y en la capacidad de las comunidades para construir oportunidades dignas y sostenibles.</p><a href="#contacto" className="text-link">Conoce nuestra historia <ArrowRight size={16} /></a><div className="values-row"><div><Users size={20} /><strong>Comunidad</strong><span>Escuchamos y construimos juntos</span></div><div><Sprout size={20} /><strong>Territorio</strong><span>Cuidamos lo que nos sostiene</span></div></div></div>
        </section>

        <section id="trabajo" className="work-section section-pad">
          <div className="page-width"><SectionTag eyebrow="Nuestro trabajo" title="Sembramos capacidades, cosechamos bienestar." intro="Acompañamos procesos sociales, culturales, productivos y ambientales para que más personas puedan hacer realidad sus proyectos de vida." /><div className="work-grid"><article className="work-card work-large"><img src={images.productive} alt="Actividad rural y productiva de AAFRIGAMAG" loading="lazy" style={{ objectPosition: 'center 42%' }} /><div className="work-card-overlay"><span>01 · Desarrollo productivo</span><h3>Economías que nacen del territorio</h3><p>Fortalecemos iniciativas productivas y saberes locales.</p></div></article><article className="work-card"><div className="work-icon"><Users /></div><span>02 · Desarrollo social</span><h3>Familias y comunidades con voz</h3><p>Promovemos participación, cuidado y oportunidades para todas las generaciones.</p><a href="#contacto">Saber más <ArrowRight size={15} /></a></article><article className="work-card work-dark" style={{ backgroundImage: `linear-gradient(#1c6680dd,#1c6680dd), url(${images.farm})`, backgroundSize: 'cover', backgroundPosition: 'center' }}><div className="work-icon"><Sprout /></div><span>03 · Seguridad alimentaria</span><h3>Alimentos, autonomía y futuro</h3><p>Impulsamos prácticas que conectan la tierra con el bienestar.</p><a href="#contacto">Saber más <ArrowRight size={15} /></a></article></div></div>
        </section>

        <section className="impact-section section-pad"><div className="page-width impact-inner"><div className="impact-copy"><SectionTag eyebrow="Nuestro propósito" title="El cambio se construye cuando nadie camina solo." light /><p>Esta web está preparada para crecer con la organización: nuevos proyectos, convocatorias, noticias y documentos podrán ser gestionados desde el panel administrativo.</p><a className="button button-outline-light" href="#contacto">Hablemos de alianzas <ArrowRight size={16} /></a></div><div className="impact-stats"><div><strong>01</strong><span>Comunidad</span></div><div><strong>02</strong><span>Territorio</span></div><div><strong>03</strong><span>Participación</span></div></div></div></section>

        <section id="convocatorias" className="section-pad page-width"><div className="split-heading"><SectionTag eyebrow="Participa" title="Convocatorias" intro="Encuentra oportunidades para sumarte a los procesos de AAFRIGAMAG." /><a href="#contacto" className="text-link">Ver todas <ArrowRight size={16} /></a></div><div className="calls-grid"><article className="call-card"><div className="status open-status">Próximamente</div><span className="call-date">Información por publicar</span><h3>Convocatorias de AAFRIGAMAG</h3><p>Muy pronto publicaremos aquí oportunidades, inscripciones y procesos de participación.</p><a href="#contacto">Ver detalle <ArrowRight size={15} /></a></article><article className="call-card call-image"><img src={images.territory} alt="Actividad comunitaria en el territorio" loading="lazy" /><div className="call-image-copy"><span>Programas sociales</span><h3>Infancias y juventudes</h3></div></article></div></section>

        <section id="noticias" className="news-section section-pad"><div className="page-width"><div className="split-heading"><SectionTag eyebrow="Desde el territorio" title="Últimas noticias" intro="Historias, aprendizajes y momentos que nos conectan." /><a href="#contacto" className="text-link">Ver noticias <ArrowRight size={16} /></a></div><div className="news-grid"><article className="news-feature"><img src={images.market} alt="Feria comunitaria de productos del territorio" loading="lazy" /><div className="news-copy"><span>Contenido institucional</span><h3>Historias del territorio</h3><p>Este espacio está preparado para publicar noticias y experiencias verificadas de AAFRIGAMAG desde el panel administrativo.</p><a href="#contacto" className="text-link">Leer historia <ArrowRight size={16} /></a></div></article><article className="news-small"><div className="news-date">ACTUALIZACIONES <strong>—</strong></div><h3>Próximamente, nuevas historias</h3><p>Las publicaciones aparecerán aquí cuando sean cargadas por el equipo de la organización.</p><a href="#contacto" className="text-link">Próximamente <ArrowRight size={16} /></a></article></div></div></section>

        <section id="galeria" className="gallery-section section-pad page-width"><div className="split-heading"><SectionTag eyebrow="Nuestro trabajo en imágenes" title="Galería" intro="Conoce algunas de las acciones que desarrollamos junto a nuestras comunidades." /><a className="text-link" href="#galeria">Ver toda la galería <ArrowRight size={16} /></a></div><div className="gallery-grid"><button onClick={() => setActiveImage(images.hero)}><img src={images.hero} alt="Niños y jóvenes frente al pendón de AAFRIGAMAG" loading="lazy" /></button><button onClick={() => setActiveImage(images.community)}><img src={images.community} alt="Grupo de integrantes en una feria comunitaria" loading="lazy" /></button><button onClick={() => setActiveImage(images.stand)}><img src={images.stand} alt="Stand de AAFRIGAMAG" loading="lazy" /></button><button onClick={() => setActiveImage(images.territory)}><img src={images.territory} alt="Actividad comunitaria en el territorio" loading="lazy" /></button><button onClick={() => setActiveImage(images.farm)}><img src={images.farm} alt="Mujeres y productos agrícolas" loading="lazy" /></button><button onClick={() => setActiveImage(images.market)}><img src={images.market} alt="Productos del territorio en feria" loading="lazy" /></button></div></section>

        <section id="donaciones" className="donation-section section-pad"><div className="page-width donation-inner"><div className="donation-copy"><span className="eyebrow">Apoya nuestra misión</span><h2>Tu aporte transforma comunidades.</h2><p>Con tu apoyo podemos continuar fortaleciendo iniciativas sociales, comunitarias, productivas y culturales.</p><div className="check-list"><span><Check size={16} /> Más oportunidades</span><span><Check size={16} /> Más participación</span><span><Check size={16} /> Más territorio</span></div></div><div className="qr-card"><img className="qr-image" src={images.qr} alt="Código QR oficial Bre-B para donaciones" /><strong>QR Bre-B de donaciones</strong><span>Escanea el código desde tu aplicación bancaria.</span><small>Gracias por apoyar nuestra misión.</small></div></div></section>

        <section className="radio-section" id="emisora"><div className="page-width"><div className="radio-inner"><div className="radio-mark"><Radio size={28} /></div><div className="radio-text"><span className="eyebrow">Emisora comunitaria</span><h2>El Sol 89 · En vivo</h2><p>Plato, Magdalena · 89.0 FM</p></div></div><RadioPlayer /></div></section>

        <section id="contacto" className="contact-section section-pad page-width"><div className="contact-info"><SectionTag eyebrow="Estamos para escucharte" title="Construyamos juntos." intro="¿Tienes una idea, una alianza o quieres conocer más de nuestro trabajo? Escríbenos." /><div className="contact-lines"><span><MapPin size={18} /> Colombia · Información por actualizar</span><span><Mail size={18} /> Correo institucional por configurar</span></div><div className="socials"><a href="#contacto" aria-label="Facebook"><Facebook size={18} /></a><a href="#contacto" aria-label="Instagram"><Instagram size={18} /></a><a href="#contacto" aria-label="YouTube"><Youtube size={18} /></a></div></div><ContactForm /></section>
      </main>

      <footer className="site-footer"><div className="page-width footer-top"><Logo light /><div className="footer-links"><div><strong>Explora</strong><a href="#nosotros">Nosotros</a><a href="#trabajo">Qué hacemos</a><a href="#noticias">Noticias</a></div><div><strong>Participa</strong><a href="#convocatorias">Convocatorias</a><a href="#donaciones">Donaciones</a><a href="#contacto">Contacto</a></div><div><strong>Legal</strong><a href="#contacto">Privacidad</a><a href="#contacto">Tratamiento de datos</a><a href="#contacto">Términos</a></div></div></div><div className="page-width footer-bottom"><span>© 2024 AAFRIGAMAG · Contenido institucional editable</span><a href="/admin" id="admin">Panel administrador <ArrowRight size={14} /></a></div></footer>

      <a className="whatsapp-float" href="#contacto" aria-label="Escríbenos por WhatsApp"><MessageCircle size={22} /></a>
      {activeImage && <div className="lightbox" role="dialog" aria-label="Vista ampliada" onClick={() => setActiveImage(null)}><button onClick={() => setActiveImage(null)} aria-label="Cerrar"><X /></button><img src={activeImage} alt="Vista ampliada de la galería" /></div>}
    </div>
  );
}

export default App;
