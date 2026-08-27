# Comanda

Convierte un mensaje suelto de WhatsApp en un pedido con productos, cantidades y
precios.

> «hola! 2 docenas de empanadas y una coca grande»
>
> → 24 × Empanada de carne — $ 28.800
> → 1 × Coca-Cola 1.5L — $ 3.500
> → **Total: $ 32.300**

Demo pública: **[comanda.lykos.com.ar](https://comanda.lykos.com.ar)**

## Qué resuelve

En una PyME argentina el pedido no llega por un formulario web: llega por
WhatsApp, escrito como se lo dirías a una persona. Alguien lo lee y lo copia a
mano a una planilla o a un sistema. Ese paso es el que se rompe: se traspapelan
pedidos, se cobra de menos, el stock nunca coincide.

Comanda hace ese paso automático.

## Cómo funciona

El parser (`lib/parser.ts`) es **determinista, sin modelo de lenguaje**. Para un
catálogo acotado —una parrilla, un kiosco, una distribuidora— las reglas
alcanzan, no cuestan nada por mensaje y no se pueden abusar. Un modelo entra
recién cuando el catálogo es grande o el vocabulario del cliente es
impredecible.

Resuelve lo que aparece en los mensajes reales:

| Entrada                             | Interpretación                               |
| :---------------------------------- | :------------------------------------------- |
| `2 empanadas`                       | cantidad en dígitos                          |
| `tres chorizos`                     | cantidad escrita en palabras                 |
| `una docena de empanadas`           | unidades de venta (docena, media docena)     |
| `medio kilo de vacío` · `1,5 kilos` | productos por peso, con decimal en coma      |
| `2 empandas`                        | errores de tipeo, por distancia de edición   |
| `una coca grande` vs `una coca`     | el alias más largo gana, o se cobra de menos |
| `3 milanesas, 2 chorizos y un agua` | varios productos en un mensaje               |
| `hola! quiero … gracias`            | cortesías, que no son productos faltantes    |

Lo que no reconoce lo devuelve como faltante en vez de ignorarlo: es preferible
que el cliente vea «no encontré _pizzas_» a que el pedido salga incompleto sin
que nadie se entere.

## Sobre la demo

**No hay un WhatsApp conectado.** La demo simula la conversación para que se
pueda probar sin instalar nada. El mismo parser corre igual detrás de la API
oficial de WhatsApp Cloud, que es lo que se instala en cada cliente.

Tampoco hay base de datos: el estado del pedido y del stock vive en la sesión
de cada visitante, así que dos personas probando al mismo tiempo no se pisan.

## Desarrollo

```bash
bun install
bun run dev        # http://localhost:3000
bun run test       # el parser tiene 18 tests
bun run typecheck
bun run build      # export estático en out/
```

## Licencia

MIT. Hecho por [Lykos](https://lykos.com.ar).
