const LIMITS = {
  title: 256,
  description: 4096,
  footer: 2048
};

const DEFAULT_COLOR = 0x556b2f;

function parseColor(input) {
  if (!input?.trim()) return DEFAULT_COLOR;
  const hex = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error("Cor inválida. Use formato `#RRGGBB` (ex.: `#556b2f`).");
  }
  return parseInt(hex, 16);
}

function parseUrl(input, label, required = false) {
  const raw = input?.trim();
  if (!raw) {
    if (required) throw new Error(`${label} é obrigatória.`);
    return null;
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} inválida. Use uma URL http(s) válida.`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${label} deve começar com http:// ou https://`);
  }
  if (raw.length > 2048) throw new Error(`${label} excede o limite de 2048 caracteres.`);
  return raw;
}

function validateDraft(draft) {
  const title = draft.title?.trim();
  const description = draft.description?.trim();

  if (!title) throw new Error("Título é obrigatório.");
  if (!description) throw new Error("Descrição é obrigatória.");
  if (title.length > LIMITS.title) throw new Error(`Título excede ${LIMITS.title} caracteres.`);
  if (description.length > LIMITS.description) throw new Error(`Descrição excede ${LIMITS.description} caracteres.`);

  const footer = draft.footer?.trim() || null;
  if (footer && footer.length > LIMITS.footer) {
    throw new Error(`Rodapé excede ${LIMITS.footer} caracteres.`);
  }

  const color = parseColor(draft.color);
  const imageUrl = parseUrl(draft.imageUrl, "URL da imagem");
  const thumbnailUrl = parseUrl(draft.thumbnailUrl, "URL da thumbnail");

  return { title, description, footer, color, imageUrl, thumbnailUrl };
}

module.exports = { LIMITS, DEFAULT_COLOR, parseColor, parseUrl, validateDraft };
