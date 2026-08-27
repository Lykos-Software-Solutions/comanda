import { describe, it, expect } from "vitest";
import { parseOrder, normalize } from "../parser";

/** Devuelve [nombre, cantidad] de cada línea, que es lo que importa comparar. */
const lines = (msg: string) => parseOrder(msg).lines.map((l) => [l.product.name, l.quantity]);

describe("normalize", () => {
  it("saca tildes y puntuación", () => {
    expect(normalize("¡Vacío, por favor!")).toBe("vacio por favor");
  });
});

describe("cantidades", () => {
  it("lee dígitos", () => {
    expect(lines("2 empanadas de carne")).toEqual([["Empanada de carne", 2]]);
  });

  it("lee números escritos en palabras", () => {
    expect(lines("tres chorizos")).toEqual([["Chorizo", 3]]);
  });

  it("asume uno cuando no hay cantidad", () => {
    expect(lines("un flan")).toEqual([["Flan casero", 1]]);
    expect(lines("flan")).toEqual([["Flan casero", 1]]);
  });

  it("resuelve docenas y medias docenas", () => {
    expect(lines("una docena de empanadas")).toEqual([["Empanada de carne", 12]]);
    expect(lines("media docena de empanadas de pollo")).toEqual([["Empanada de pollo", 6]]);
    expect(lines("2 docenas de empanadas")).toEqual([["Empanada de carne", 24]]);
  });

  it("resuelve kilos y fracciones", () => {
    expect(lines("un kilo de asado")).toEqual([["Asado de tira", 1]]);
    expect(lines("medio kilo de vacio")).toEqual([["Vacío", 0.5]]);
    expect(lines("2 kilos de asado de tira")).toEqual([["Asado de tira", 2]]);
  });

  it("acepta decimales con coma, que es como se escribe acá", () => {
    // El bug que evita: la coma separa items, asi que "1,5" se partia en "1"
    // y "5 kilos de vacio" y el pedido salia por 5 kilos en vez de 1,5.
    expect(lines("1,5 kilos de vacio")).toEqual([["Vacío", 1.5]]);
  });

  it("sigue separando por coma sin espacio", () => {
    expect(lines("3 milanesas,2 chorizos")).toEqual([
      ["Milanesa de ternera", 3],
      ["Chorizo", 2],
    ]);
  });
});

describe("identificación de productos", () => {
  it("prefiere el alias más largo", () => {
    // El bug que evita: "coca" matchea antes que "coca grande" y todo pedido
    // de coca grande entraba como la chica, a mitad de precio.
    expect(lines("una coca grande")).toEqual([["Coca-Cola 1.5L", 1]]);
    expect(lines("una coca")).toEqual([["Coca-Cola 500ml", 1]]);
  });

  it("tolera errores de tipeo", () => {
    expect(lines("2 empandas")).toEqual([["Empanada de carne", 2]]);
    expect(lines("3 chorizoss")).toEqual([["Chorizo", 3]]);
  });

  it("no inventa productos con palabras cortas parecidas", () => {
    expect(parseOrder("dame pan").lines).toHaveLength(0);
  });

  it("distingue variantes del mismo producto", () => {
    expect(lines("6 empanadas de pollo")).toEqual([["Empanada de pollo", 6]]);
    expect(lines("2 empanadas de jamon y queso")).toEqual([["Empanada de jamón y queso", 2]]);
  });
});

describe("mensajes reales", () => {
  it("separa varios productos en un mensaje", () => {
    expect(lines("2 docenas de empanadas y una coca grande")).toEqual([
      ["Empanada de carne", 24],
      ["Coca-Cola 1.5L", 1],
    ]);
  });

  it("maneja comas, saltos de línea y cortesías", () => {
    const r = parseOrder("hola! quiero:\n3 milanesas,\n2 chorizos\ny un agua\ngracias");
    expect(r.lines.map((l) => [l.product.name, l.quantity])).toEqual([
      ["Milanesa de ternera", 3],
      ["Chorizo", 2],
      ["Agua mineral 500ml", 1],
    ]);
    expect(r.unmatched).toEqual([]);
  });

  it("suma cuando el mismo producto aparece dos veces", () => {
    expect(lines("2 chorizos y 3 chorizos")).toEqual([["Chorizo", 5]]);
  });

  it("reporta lo que no reconoce en vez de ignorarlo", () => {
    const r = parseOrder("una coca y dos pizzas");
    expect(r.lines).toHaveLength(1);
    expect(r.unmatched).toEqual(["dos pizzas"]);
  });

  it("calcula el total", () => {
    const r = parseOrder("una docena de empanadas y una coca grande");
    // 12 × 1200 + 1 × 3500
    expect(r.total).toBe(12 * 1200 + 3500);
  });

  it("no cobra de más con fracciones de kilo", () => {
    const r = parseOrder("medio kilo de vacio");
    expect(r.total).toBe(Math.round(0.5 * 16900));
  });
});
