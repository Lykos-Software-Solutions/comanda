/**
 * Catálogo de ejemplo: una parrilla de barrio. Los alias son lo que la gente
 * escribe de verdad por WhatsApp, no el nombre comercial del producto — nadie
 * pide "Coca-Cola 1.5L", piden "una coca grande".
 */
export type Product = {
  id: string;
  name: string;
  price: number;
  /** Unidad en la que se vende. `unidad` es lo normal; `kg` habilita "medio kilo". */
  unit: "unidad" | "kg";
  stock: number;
  aliases: string[];
};

export const catalog: Product[] = [
  {
    id: "empanada-carne",
    name: "Empanada de carne",
    price: 1200,
    unit: "unidad",
    stock: 120,
    aliases: ["empanada de carne", "empanadas de carne", "empanada carne", "empanada", "empanadas"],
  },
  {
    id: "empanada-pollo",
    name: "Empanada de pollo",
    price: 1200,
    unit: "unidad",
    stock: 80,
    aliases: ["empanada de pollo", "empanadas de pollo", "empanada pollo"],
  },
  {
    id: "empanada-jyq",
    name: "Empanada de jamón y queso",
    price: 1250,
    unit: "unidad",
    stock: 60,
    aliases: [
      "empanada de jamon y queso",
      "empanadas de jamon y queso",
      "jamon y queso",
      "jyq",
      "j y q",
    ],
  },
  {
    id: "milanesa",
    name: "Milanesa de ternera",
    price: 9800,
    unit: "unidad",
    stock: 25,
    aliases: ["milanesa", "milanesas", "mila", "milas", "milanesa de ternera"],
  },
  {
    id: "asado-tira",
    name: "Asado de tira",
    price: 14500,
    unit: "kg",
    stock: 30,
    aliases: ["asado", "asado de tira", "tira de asado", "tira"],
  },
  {
    id: "vacio",
    name: "Vacío",
    price: 16900,
    unit: "kg",
    stock: 18,
    aliases: ["vacio", "vacío"],
  },
  {
    id: "chorizo",
    name: "Chorizo",
    price: 3200,
    unit: "unidad",
    stock: 90,
    aliases: ["chorizo", "chorizos", "choripan", "chori", "choris"],
  },
  {
    id: "coca-15",
    name: "Coca-Cola 1.5L",
    price: 3500,
    unit: "unidad",
    stock: 48,
    aliases: ["coca grande", "coca 1.5", "coca de litro y medio", "coca cola grande", "gaseosa"],
  },
  {
    id: "coca-500",
    name: "Coca-Cola 500ml",
    price: 2000,
    unit: "unidad",
    stock: 60,
    aliases: ["coca chica", "coca 500", "cocacola", "coca cola", "coca"],
  },
  {
    id: "agua",
    name: "Agua mineral 500ml",
    price: 1500,
    unit: "unidad",
    stock: 72,
    aliases: ["agua", "agua mineral", "aguita"],
  },
  {
    id: "flan",
    name: "Flan casero",
    price: 4200,
    unit: "unidad",
    stock: 20,
    aliases: ["flan", "flancito", "flan casero", "postre"],
  },
];

export const findById = (id: string) => catalog.find((p) => p.id === id);

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })
    .format(cents)
    .replace(/\s/g, " ");
