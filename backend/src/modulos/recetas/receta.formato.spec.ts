import { cantidadATexto, textoACantidad } from './receta.formato';

describe('cantidades de ingredientes (columna DECIMAL)', () => {
  it('convierte lo que escribe la persona en número', () => {
    expect(textoACantidad('200')).toBe(200);
    expect(textoACantidad('1,5')).toBe(1.5);
    expect(textoACantidad('1/2')).toBe(0.5);
    expect(textoACantidad('1 1/2')).toBe(1.5);
    expect(textoACantidad('½')).toBe(0.5);
    expect(textoACantidad('2¼')).toBe(2.25);
  });
  it('"al gusto" y vacío se guardan como NULL; lo ilegible se rechaza', () => {
    expect(textoACantidad('Al gusto')).toBeNull();
    expect(textoACantidad('')).toBeNull();
    expect(textoACantidad('mucho')).toBeUndefined();
    expect(textoACantidad('-3')).toBeUndefined();
  });
  it('muestra el número de la base de forma legible', () => {
    expect(cantidadATexto('4.00')).toBe('4');
    expect(cantidadATexto('0.50')).toBe('½');
    expect(cantidadATexto('1.50')).toBe('1½');
    expect(cantidadATexto('0.33')).toBe('⅓');
    expect(cantidadATexto('2.40')).toBe('2.4');
    expect(cantidadATexto(null)).toBe('Al gusto');
  });
});
