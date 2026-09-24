import { ilustracion } from '../ilustraciones';

/** La imagen de una palabra: un emoji, o un dibujo propio cuando no hay emoji que sirva. */
export function Ilustracion({ palabra, grande }: { palabra: string | undefined; grande?: boolean }) {
  const figura = ilustracion(palabra);
  if ('src' in figura) {
    const lado = grande ? 200 : 64;
    return <img src={figura.src} width={lado} height={lado} alt="" draggable={false} style={{ display: 'block' }} />;
  }
  return <>{figura.emoji}</>;
}
