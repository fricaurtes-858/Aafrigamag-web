import { supabase } from '@/lib/supabase';

export const STORAGE_BUCKET = 'site-media';
export const CONTACT_BUCKET = 'contact-attachments';
export const ALLOWED_CONTACT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];
export const ALLOWED_CONTACT_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
export const MAX_CONTACT_FILE_MB = 10;
export const MAX_CONTACT_FILES = 5;
export const DOCUMENT_CATEGORIES = [
  'Institucionales',
  'Estatutos',
  'Informes',
  'Proyectos',
  'Convocatorias',
  'Resoluciones',
  'Otros',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type SiteSettings = {
  id: string;
  institutional_email: string;
  updated_at: string;
  // Contact presentation
  contact_eyebrow: string;
  contact_title: string;
  contact_intro: string;
  contact_municipality: string;
  contact_department: string;
  contact_country: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_facebook: string;
  contact_instagram: string;
  contact_youtube: string;
  // Contact form copy
  form_label_name: string;
  form_placeholder_name: string;
  form_label_email: string;
  form_placeholder_email: string;
  form_label_phone: string;
  form_placeholder_phone: string;
  form_label_subject: string;
  form_placeholder_subject: string;
  form_label_message: string;
  form_placeholder_message: string;
  form_label_attachments: string;
  form_consent_text: string;
  form_submit_text: string;
  form_success_title: string;
  form_success_text: string;
};

export const DEFAULT_CONTACT_SETTINGS: Omit<SiteSettings, 'id' | 'updated_at'> = {
  institutional_email: '',
  contact_eyebrow: 'Estamos para escucharte',
  contact_title: 'Construyamos juntos.',
  contact_intro:
    '¿Tienes una idea, una propuesta de alianza o quieres conocer más sobre nuestro trabajo? Escríbenos.',
  contact_municipality: 'Plato',
  contact_department: 'Magdalena',
  contact_country: 'Colombia',
  contact_phone: '',
  contact_whatsapp: '',
  contact_facebook: '',
  contact_instagram: '',
  contact_youtube: '',
  form_label_name: 'Nombre completo',
  form_placeholder_name: 'Tu nombre completo',
  form_label_email: 'Correo electrónico',
  form_placeholder_email: 'Tu correo electrónico',
  form_label_phone: 'Teléfono (opcional)',
  form_placeholder_phone: 'Tu número de teléfono',
  form_label_subject: 'Asunto',
  form_placeholder_subject: '¿Sobre qué nos escribes?',
  form_label_message: 'Mensaje',
  form_placeholder_message: 'Cuéntanos cómo podemos ayudarte',
  form_label_attachments: 'Documentos adjuntos (opcional)',
  form_consent_text: 'Acepto el tratamiento de mis datos personales.',
  form_submit_text: 'Enviar mensaje',
  form_success_title: 'Mensaje recibido',
  form_success_text: 'Gracias por escribirnos. Te contactaremos pronto.',
};

export type StoryPhoto = {
  id: string;
  story_id: string;
  storage_path: string;
  caption: string;
  sort_order: number;
};

export type StoryDocument = {
  id: string;
  story_id: string;
  storage_path: string;
  original_name: string;
  title: string;
  sort_order: number;
};

export type OurStory = {
  id: string;
  title: string;
  subtitle: string;
  intro: string;
  body: string;
  status: 'draft' | 'published';
  updated_at: string;
  photos?: StoryPhoto[];
  documents?: StoryDocument[];
};

export type DocumentItem = {
  id: string;
  title: string;
  description: string;
  category: DocumentCategory;
  doc_date: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
};

export type NewsPhoto = {
  id: string;
  post_id: string;
  storage_path: string;
  caption: string;
  sort_order: number;
};

export type NewsPost = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  cover_path: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  photos?: NewsPhoto[];
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
  phone?: string | null;
  subject?: string | null;
};

export type ContactAttachment = {
  id: string;
  message_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as SiteSettings | null;
}

export async function getPublishedStory(): Promise<OurStory | null> {
  const { data: story } = await supabase
    .from('our_story')
    .select('*')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!story) return null;
  const [photos, documents] = await Promise.all([
    supabase
      .from('our_story_photos')
      .select('*')
      .eq('story_id', story.id)
      .order('sort_order'),
    supabase
      .from('our_story_documents')
      .select('*')
      .eq('story_id', story.id)
      .order('sort_order'),
  ]);
  return {
    ...(story as OurStory),
    photos: (photos.data ?? []) as StoryPhoto[],
    documents: (documents.data ?? []) as StoryDocument[],
  };
}

export async function getAllStories(): Promise<OurStory[]> {
  const { data, error } = await supabase
    .from('our_story')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) return [];
  return data as OurStory[];
}

export async function getStoryWithRelations(id: string): Promise<OurStory | null> {
  const { data: story } = await supabase
    .from('our_story')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!story) return null;
  const [photos, documents] = await Promise.all([
    supabase.from('our_story_photos').select('*').eq('story_id', id).order('sort_order'),
    supabase.from('our_story_documents').select('*').eq('story_id', id).order('sort_order'),
  ]);
  return {
    ...(story as OurStory),
    photos: (photos.data ?? []) as StoryPhoto[],
    documents: (documents.data ?? []) as StoryDocument[],
  };
}

export async function getPublishedDocuments(): Promise<DocumentItem[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('status', 'published')
    .order('doc_date', { ascending: false });
  if (error) return [];
  return data as DocumentItem[];
}

export async function getAllDocuments(): Promise<DocumentItem[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('doc_date', { ascending: false });
  if (error) return [];
  return data as DocumentItem[];
}

export async function getRecentNews(limit = 3): Promise<NewsPost[]> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) return [];
  return data as NewsPost[];
}

export async function getAllPublishedNews(): Promise<NewsPost[]> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false });
  if (error) return [];
  return data as NewsPost[];
}

export async function getAllNews(): Promise<NewsPost[]> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) return [];
  return data as NewsPost[];
}

export async function getNewsBySlug(slug: string): Promise<NewsPost | null> {
  const { data: post } = await supabase
    .from('news_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!post) return null;
  const { data: photos } = await supabase
    .from('news_photos')
    .select('*')
    .eq('post_id', post.id)
    .order('sort_order');
  return { ...(post as NewsPost), photos: (photos ?? []) as NewsPhoto[] };
}

export async function getNewsWithPhotos(id: string): Promise<NewsPost | null> {
  const { data: post } = await supabase
    .from('news_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!post) return null;
  const { data: photos } = await supabase
    .from('news_photos')
    .select('*')
    .eq('post_id', id)
    .order('sort_order');
  return { ...(post as NewsPost), photos: (photos ?? []) as NewsPhoto[] };
}

export async function uploadSiteFile(
  path: string,
  file: File,
  upsert = false,
): Promise<{ path: string; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert });
  if (error) return { path: '', error: error.message };
  return { path: data.path, error: null };
}

export async function deleteSiteFile(path: string): Promise<void> {
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}

export function fileKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function fileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

export function isAllowedContactFile(file: File): boolean {
  const ext = fileExt(file.name);
  return (
    ALLOWED_CONTACT_EXTS.includes(ext) &&
    (ALLOWED_CONTACT_TYPES.includes(file.type) || file.type === '' || file.type.startsWith('image/'))
  );
}

export async function createSignedContactUrl(path: string, expiresInSec = 60): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CONTACT_BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadContactAttachment(
  path: string,
  file: File,
): Promise<{ path: string; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(CONTACT_BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (error) return { path: '', error: error.message };
  return { path: data.path, error: null };
}

export async function deleteContactAttachment(path: string): Promise<void> {
  await supabase.storage.from(CONTACT_BUCKET).remove([path]);
}

export async function getContactAttachments(messageId: string): Promise<ContactAttachment[]> {
  const { data, error } = await supabase
    .from('contact_attachments')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at');
  if (error) return [];
  return data as ContactAttachment[];
}
