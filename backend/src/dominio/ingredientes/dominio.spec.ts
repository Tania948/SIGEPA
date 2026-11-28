import { identificar, mencionados } from './catalogo';
import { costoReceta, enUnidadBase, leerCantidad } from './costos';
import { enTemporada } from './temporada';

describe('catálogo de ingredientes', () => {
  it('reconoce nombres libres de recetas', () => {
    expect(identificar('chiles guajillo, sin semillas')?.id).toBe('chile-seco');
    expect(identificar('Hojas de aguacate')?.id).toBe('hoja-aguacate');
    expect(identificar('aguacate maduro')?.id).toBe('aguacate');
    expect(identificar('salsa de soya')?.id).toBe('soya');
    expect(identificar('sal de grano')?.id).toBe('sal');
    expect(identificar('frijol colado')?.id).toBe('frijol');
  });
  it('no confunde palabras parecidas', () => {
    expect(identificar('queso fresco')?.id).toBe('queso'); // "fresco" no es "res"
    expect(identificar('ajonjolí')?.id).toBe('ajonjoli'); // no es "ajo"
  });
  it('encuentra ingredientes mencionados en una pregunta', () => {
    expect(mencionados('¿dónde se recolecta la hierba santa?').map((i) => i.id)).toContain('hierba-santa');
  });
});

describe('cantidades y costos', () => {
  it('lee fracciones', () => {
    expect(leerCantidad('½')).toBe(0.5);
    expect(leerCantidad('1 1/2')).toBe(1.5);
    expect(leerCantidad('2½')).toBe(2.5);
    expect(leerCantidad('al gusto')).toBeNull();
  });
  it('convierte unidades a la unidad del catálogo', () => {
    const pollo = identificar('pollo')!;
    expect(enUnidadBase(500, 'g', pollo)).toBeCloseTo(0.5);
    expect(enUnidadBase(2, 'piezas', pollo)).toBeCloseTo(0.5); // 0.25 kg por pieza
  });
  it('escala el costo al número de personas', () => {
    const ings = [{ cantidad: '1', unidad: 'kg', nombre: 'pollo' }];
    const para4 = costoReceta(ings, 4);
    const para8 = costoReceta(ings, 4, 8);
    expect(para8.total).toBe(para4.total * 2);
    expect(para8.porciones).toBe(8);
  });
});

describe('temporadas', () => {
  it('entiende rangos de meses, incluso los que cruzan el año', () => {
    expect(enTemporada('Lluvias (junio a octubre)', 7)).toBe(true);
    expect(enTemporada('Lluvias (junio a octubre)', 11)).toBe(false);
    expect(enTemporada('Cosecha de octubre a abril', 0)).toBe(true);
    expect(enTemporada('Agosto y septiembre', 8)).toBe(true);
    expect(enTemporada('Todo el año', 3)).toBe(true);
  });
});
