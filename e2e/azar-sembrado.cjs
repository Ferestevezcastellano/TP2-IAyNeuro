// Precarga para el backend: Math.random determinista, para que el sorteo de
// tarjetas salga igual en dos corridas que hagan los mismos pedidos.
let s = 20260926;
Math.random = () => {
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
  return s / 4294967296;
};
