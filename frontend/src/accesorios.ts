/** La pestaña de "Vestí a tu compañero" donde aparece cada accesorio. */
export type Categoria = 'GORROS' | 'ANTEOJOS' | 'ROPA' | 'ESPECIALES';

interface Dibujo {
  /**
   * SVG del MISMO lienzo de 150×150 que las mascotas, ya dibujado en la
   * posición que le toca sobre la cara.
   */
  archivo: string;
  /**
   * Dónde está dibujada la pieza dentro del lienzo, como un cuadrado
   * [x, y, lado] que la contiene. Para mostrar el accesorio solo (sin mascota)
   * se recorta ese cuadrado: con un zoom fijo al centro, las piezas que van
   * abajo (bufanda, medalla, mochila) quedaban fuera del recorte.
   */
  encuadre: [number, number, number];
  categoria: Categoria;
  /**
   * En qué orden se apila. 0 va DETRÁS de la mascota: sin esto, la capa le
   * taparía la cara. Del 1 en adelante va delante, de abajo hacia arriba:
   * primero lo que cuelga, después lo de la cara.
   */
  plano: number;
}

/**
 * Todo lo que el frontend sabe de cada accesorio, en un solo lugar.
 *
 * Los accesorios se superponen como capas sobre la mascota. Eso evita el
 * problema que hace inviable la otra ruta: si el arte fuera "el animal con el
 * accesorio puesto", harían falta 4 animales × 6 accesorios = 24 imágenes, y
 * con dos accesorios encima se va a cientos. Superponiendo capas son 6
 * archivos y punto, y cualquier accesorio nuevo suma una sola fila acá.
 */
export const ACCESORIOS: Record<string, Dibujo> = {
  'acc-gorro': { archivo: '/accesorios/gorro.svg', encuadre: [26, 0, 104], categoria: 'GORROS', plano: 4 },
  'acc-anteojos': { archivo: '/accesorios/anteojos.svg', encuadre: [20, 16, 110], categoria: 'ANTEOJOS', plano: 3 },
  'acc-bufanda': { archivo: '/accesorios/bufanda.svg', encuadre: [36, 94, 56], categoria: 'ROPA', plano: 1 },
  'acc-capa': { archivo: '/accesorios/capa.svg', encuadre: [20, 68, 110], categoria: 'ROPA', plano: 0 },
  'acc-medalla': { archivo: '/accesorios/medalla.svg', encuadre: [40, 100, 50], categoria: 'ESPECIALES', plano: 2 },
  'acc-mochila': { archivo: '/accesorios/mochila.svg', encuadre: [34, 88, 62], categoria: 'ROPA', plano: 0 },
};
