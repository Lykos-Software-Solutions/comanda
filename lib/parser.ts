import { catalog, type Product } from "./catalog";

/**
 * Convierte un mensaje suelto de WhatsApp en un pedido estructurado.
 *
 * Es determinista a propósito: sin LLM. Para un catálogo acotado —que es el
 * caso de una parrilla, un kiosco o una distribuidora— las reglas alcanzan, no
 * cuestan nada por mensaje y no se pueden abusar. Un modelo entra recién
 * cuando el catálogo es grande o el vocabulario del cliente es impredecible.
 */

export type OrderLine = {
  product: Product;
  quantity: number;
  /** Lo que escribió la persona, para poder mostrarle qué se interpretó. */
  matchedText: string;
  subtotal: number;
};

export type ParseResult = {
  lines: OrderLine[];
  /** Fragmentos que no matchearon nada del catálogo. */
  unmatched: string[];
  total: number;
};

const WORD_NUMBERS: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  quince: 15,
  veinte: 20,
  treinta: 30,
};

/** Multiplicadores por unidad de venta: "docena" son doce, "medio kilo" es 0,5. */
const UNIT_WORDS: { re: RegExp; factor: number }[] = [
  { re: /\bmedias?\s+docenas?\b/, factor: 6 },
  { re: /\bdocenas?\b/, factor: 12 },
  { re: /\bmedios?\s+kilos?\b/, factor: 0.5 },
  { re: /\bkilos?\b|\bkg\b/, factor: 1 },
  { re: /\bcuartos?\b/, factor: 0.25 },
];

/** Sin tildes y en minúscula: la gente escribe "vacio" y "jamon". */
export function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // La coma decimal pasa a punto ANTES de barrer la puntuacion. Si no,
      // "1,5" quedaba como "1 5" y la cantidad terminaba siendo 5.
      .replace(/(\d),(\d)/g, "$1.$2")
      .replace(/[^\w\s.]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Distancia de Levenshtein, para tolerar "empandas" o "milanesq". */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Tolerancia proporcional: en palabras cortas un error ya es otra palabra. */
function isFuzzyMatch(text: string, alias: string): boolean {
  if (alias.length < 5) return text === alias;
  return editDistance(text, alias) <= (alias.length <= 8 ? 1 : 2);
}

type Match = { product: Product; alias: string; index: number; length: number; exact: boolean };

/**
 * Busca aliases dentro del fragmento. Los más largos primero: "coca grande"
 * tiene que ganarle a "coca", o todo pedido de coca grande entra como chica.
 */
function findProduct(fragment: string): Match | null {
  const candidates: { product: Product; alias: string }[] = [];
  for (const product of catalog) {
    for (const alias of product.aliases) candidates.push({ product, alias: normalize(alias) });
  }
  candidates.sort((a, b) => b.alias.length - a.alias.length);

  for (const { product, alias } of candidates) {
    const index = fragment.indexOf(alias);
    if (index !== -1) return { product, alias, index, length: alias.length, exact: true };
  }

  // Sin coincidencia literal, se prueba palabra por palabra con tolerancia a
  // errores de tipeo. Sólo contra aliases de una palabra: comparar una palabra
  // suelta contra "empanada de jamon y queso" da distancias enormes y ruido.
  const words = fragment.split(" ").filter(Boolean);
  for (const { product, alias } of candidates) {
    if (alias.includes(" ")) continue;
    for (const word of words) {
      if (isFuzzyMatch(word, alias)) {
        return { product, alias, index: fragment.indexOf(word), length: word.length, exact: false };
      }
    }
  }
  return null;
}

/** Cantidad que precede al producto: dígitos, número en palabras o unidad. */
function extractQuantity(before: string): number {
  const text = before.trim();

  // Ultimo numero que aparezca en el prefijo, este donde este: en
  // "2 docenas de" el numero va antes de la unidad, no pegado al producto.
  const numbers = [...text.matchAll(/(\d+(?:[.,]\d+)?)/g)];
  const lastNumber = numbers.length
    ? parseFloat(numbers[numbers.length - 1][1].replace(",", "."))
    : null;

  for (const { re, factor } of UNIT_WORDS) {
    if (re.test(text)) {
      // "2 docenas" son 24; "docena" sola es una.
      return factor * (lastNumber ?? 1);
    }
  }

  if (lastNumber !== null) return lastNumber;

  const lastWord = text.split(" ").filter(Boolean).pop();
  if (lastWord && WORD_NUMBERS[lastWord] !== undefined) return WORD_NUMBERS[lastWord];

  // Sin cantidad explícita: uno. En productos por peso, un kilo.
  return 1;
}

/** Minúscula y sin tildes, pero conservando la puntuación que separa items. */
function deaccent(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Los pedidos vienen en una sola línea separados por "y", comas o saltos.
 *
 * Se corta antes de normalizar: `normalize` borra la puntuación, así que si se
 * hiciera al revés las comas ya no existirían y "3 milanesas, 2 chorizos"
 * quedaría como un solo pedido de milanesas.
 *
 * Tampoco se corta por "de" ni por "con": romperían "empanada de carne". Y los
 * aliases que llevan un separador adentro —"jamón y queso", "j y q"— se
 * enmascaran antes de cortar, o el "y" del medio los parte al medio.
 */
// La coma separa items salvo cuando es el decimal de un numero: "1,5 kilos"
// es una cantidad, no dos pedidos. Sigue separando en "milanesas,2 chorizos",
// donde un lado no es digito.
const SEPARATORS = /\s*(?:(?<!\d),|,(?!\d)|\by\b|\bmas\b|\btambien\b|\+|\n|;)\s*/;

function splitFragments(text: string): string[] {
  let masked = deaccent(text);

  const tricky = catalog
    .flatMap((p) => p.aliases.map(deaccent))
    .filter((a) => SEPARATORS.test(a))
    .sort((a, b) => b.length - a.length);

  const restore: string[] = [];
  for (const alias of tricky) {
    while (masked.includes(alias)) {
      masked = masked.replace(alias, `\u0000${restore.length}\u0000`);
      restore.push(alias);
    }
  }

  return masked
    .split(SEPARATORS)
    .map((f) => normalize(f.replace(/\u0000(\d+)\u0000/g, (_, i) => restore[Number(i)])))
    .filter(Boolean);
}

const FILLER = new Set([
  "hola",
  "buenas",
  "buenos",
  "dias",
  "tardes",
  "noches",
  "gracias",
  "porfa",
  "por",
  "favor",
  "che",
  "dale",
  "quiero",
  "queria",
  "necesito",
  "me",
  "mandas",
  "mandame",
  "manda",
  "pedido",
  "pedir",
  "seria",
  "sería",
  "un",
  "una",
  "de",
  "para",
  "llevar",
  "es",
  "todo",
  "eso",
  "ok",
  "listo",
  "hey",
  "buen",
  "dia",
]);

/** Cierto si el fragmento no tiene ni una palabra que pueda ser un producto. */
function isCourtesy(fragment: string): boolean {
  const words = fragment.split(" ").filter(Boolean);
  return words.length > 0 && words.every((w) => FILLER.has(w) || /^\d+([.,]\d+)?$/.test(w));
}

export function parseOrder(message: string): ParseResult {
  const lines: OrderLine[] = [];
  const unmatched: string[] = [];

  for (const fragment of splitFragments(message)) {
    const match = findProduct(fragment);
    if (!match) {
      // Un fragmento hecho solo de cortesía o relleno no es un error del
      // pedido: "hola quiero" no es un producto que no encontramos.
      if (!isCourtesy(fragment)) unmatched.push(fragment);
      continue;
    }

    const quantity = extractQuantity(fragment.slice(0, match.index));
    const existing = lines.find((l) => l.product.id === match.product.id);
    if (existing) {
      existing.quantity += quantity;
      existing.subtotal = Math.round(existing.quantity * existing.product.price);
      continue;
    }

    lines.push({
      product: match.product,
      quantity,
      matchedText: fragment,
      subtotal: Math.round(quantity * match.product.price),
    });
  }

  return { lines, unmatched, total: lines.reduce((sum, l) => sum + l.subtotal, 0) };
}
