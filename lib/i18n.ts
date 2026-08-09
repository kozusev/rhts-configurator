export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export function isLocale(x: string): x is Locale {
  return (locales as readonly string[]).includes(x);
}

/**
 * Read a translatable field. Fields are stored as JSON strings:
 * {"en":"...","es":"...","uk":"..."}. Falls back to any available value.
 */
export function t(field: string | null | undefined, locale: Locale): string {
  if (!field) return "";
  let obj: Record<string, string>;
  try {
    obj = JSON.parse(field);
  } catch {
    return field; // plain string fallback
  }
  if (obj && typeof obj === "object") {
    return obj[locale] || obj[defaultLocale] || Object.values(obj).find(Boolean) || "";
  }
  return "";
}

/** Build a translatable JSON string from parts (used by admin/seed). Extra locale keys are allowed. */
export function ml(parts: Record<string, string>): string {
  return JSON.stringify(parts);
}

// ---- UI dictionary (static interface strings) ----
// Values may still carry a leftover "uk" key; only active locales are read.
type Dict = Record<string, Record<string, string>>;

const dict: Dict = {
  brand: { en: "RHTS Milling Cells", es: "Células de Fresado RHTS", uk: "Фрезерні комірки RHTS" },
  nav_home: { en: "Home", es: "Inicio", uk: "Головна" },
  nav_packages: { en: "Milling packs", es: "Packs de fresado", uk: "Фрезерні пакети" },
  nav_contact: { en: "Contact", es: "Contacto", uk: "Контакти" },
  hero_title: { en: "Robotic milling cells, configured your way", es: "Células de fresado robotizadas, a tu medida", uk: "Роботизовані фрезерні комірки під ваші задачі" },
  hero_sub: { en: "Pick a milling pack, choose your robot and options, get an instant offer.", es: "Elige un pack, tu robot y opciones, y recibe una oferta al instante.", uk: "Оберіть пакет, робота та опції — і отримайте пропозицію миттєво." },
  packs_title: { en: "Choose your milling pack", es: "Elige tu pack de fresado", uk: "Оберіть фрезерний пакет" },
  packs_sub: { en: "Three ready-to-go spindle packages. Configure the rest.", es: "Tres paquetes de husillo listos. Configura el resto.", uk: "Три готові пакети шпинделя. Решту — налаштуйте." },
  view_pack: { en: "Configure this pack", es: "Configurar este pack", uk: "Налаштувати пакет" },
  from: { en: "from", es: "desde", uk: "від" },
  spindle: { en: "Spindle", es: "Husillo", uk: "Шпиндель" },
  power: { en: "Power", es: "Potencia", uk: "Потужність" },
  tool_holder: { en: "Tool holder", es: "Portaherramientas", uk: "Тримач інструменту" },
  step_robot: { en: "1. Choose your robot", es: "1. Elige tu robot", uk: "1. Оберіть робота" },
  step_options: { en: "2. Additional options", es: "2. Opciones adicionales", uk: "2. Додаткові опції" },
  step_contact: { en: "3. Your details & offer", es: "3. Tus datos y oferta", uk: "3. Ваші дані та пропозиція" },
  robot_year: { en: "Year", es: "Año", uk: "Рік" },
  robot_reach: { en: "Arm reach", es: "Alcance", uk: "Досяжність" },
  robot_payload: { en: "Payload", es: "Carga", uk: "Вантаж" },
  robot_controller: { en: "Controller", es: "Controlador", uk: "Контролер" },
  cond_new: { en: "New", es: "Nuevo", uk: "Новий" },
  cond_used: { en: "Used", es: "Usado", uk: "Вживаний" },
  select: { en: "Select", es: "Seleccionar", uk: "Обрати" },
  selected: { en: "Selected", es: "Seleccionado", uk: "Обрано" },
  add: { en: "Add", es: "Añadir", uk: "Додати" },
  added: { en: "Added", es: "Añadido", uk: "Додано" },
  summary: { en: "Your configuration", es: "Tu configuración", uk: "Ваша конфігурація" },
  base_pack: { en: "Base pack", es: "Pack base", uk: "Базовий пакет" },
  robot: { en: "Robot", es: "Robot", uk: "Робот" },
  options: { en: "Options", es: "Opciones", uk: "Опції" },
  total: { en: "Estimated total", es: "Total estimado", uk: "Орієнтовна сума" },
  first_name: { en: "First name", es: "Nombre", uk: "Ім'я" },
  last_name: { en: "Last name", es: "Apellidos", uk: "Прізвище" },
  email: { en: "Email", es: "Correo", uk: "Ел. пошта" },
  phone: { en: "Phone", es: "Teléfono", uk: "Телефон" },
  company: { en: "Company (optional)", es: "Empresa (opcional)", uk: "Компанія (необов'язково)" },
  reg_number: { en: "Reg. / VAT number", es: "Nº de registro / IVA", uk: "Реєстр. номер / ПДВ" },
  delivery_address: { en: "Delivery address", es: "Dirección de entrega", uk: "Адреса доставки" },
  get_offer: { en: "Get my PDF offer", es: "Recibir mi oferta en PDF", uk: "Отримати пропозицію у PDF" },
  sending: { en: "Sending…", es: "Enviando…", uk: "Надсилання…" },
  thanks_title: { en: "Thank you!", es: "¡Gracias!", uk: "Дякуємо!" },
  thanks_body: { en: "Your offer has been generated — download it below. Our team will review it and follow up with you shortly.", es: "Tu oferta ha sido generada — descárgala abajo. Nuestro equipo la revisará y se pondrá en contacto contigo en breve.", uk: "Вашу пропозицію сформовано — завантажте її нижче. Наша команда перевірить її та невдовзі зв'яжеться з вами." },
  download_pdf: { en: "Download PDF offer", es: "Descargar oferta PDF", uk: "Завантажити PDF" },
  required: { en: "Please fill in all required fields.", es: "Rellena todos los campos obligatorios.", uk: "Заповніть усі обов'язкові поля." },
  no_robot: { en: "Please select a robot to continue.", es: "Selecciona un robot para continuar.", uk: "Оберіть робота, щоб продовжити." },
  optional_note: { en: "Add anything else you'd like us to include…", es: "Añade cualquier otra cosa que quieras incluir…", uk: "Додайте будь-що ще, що бажаєте врахувати…" },
  back_home: { en: "Back to all packs", es: "Volver a todos los packs", uk: "До всіх пакетів" },
};

export function ui(key: keyof typeof dict | string, locale: Locale): string {
  const entry = dict[key as string];
  if (!entry) return String(key);
  return entry[locale] || entry[defaultLocale] || "";
}

/**
 * UI-string keys the <Configurator> needs. Single source of truth — used by
 * both the public package page and the admin lead flows via configuratorLabels().
 */
export const CONFIGURATOR_LABEL_KEYS = [
  "step_robot", "step_options", "step_contact", "robot_year", "robot_reach", "robot_payload",
  "robot_controller", "cond_new", "cond_used", "select", "selected", "add", "added", "summary",
  "base_pack", "robot", "options", "total", "first_name", "last_name", "email", "phone", "company",
  "get_offer", "sending", "thanks_title", "thanks_body", "download_pdf", "required", "no_robot",
  "optional_note", "reg_number", "delivery_address",
] as const;

/** Build the label map the <Configurator> expects for a given locale. */
export function configuratorLabels(locale: Locale): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const k of CONFIGURATOR_LABEL_KEYS) labels[k] = ui(k, locale);
  return labels;
}
