import { Estado } from '../../../database/entidades';
import { entender, numerosEnTexto } from './interpretar';

const estados = [
  { idEstado: 20, nomEstado: 'Oaxaca' }, { idEstado: 31, nomEstado: 'Yucatán' }, { idEstado: 2, nomEstado: 'Baja California' },
  { idEstado: 3, nomEstado: 'Baja California Sur' }, { idEstado: 15, nomEstado: 'México' }, { idEstado: 9, nomEstado: 'Ciudad de México' },
] as Estado[];

describe('interpretar preguntas', () => {
  it('convierte números escritos con letra', () => {
    expect(numerosEnTexto('tengo mil quinientos pesos').trim()).toBe('tengo 1500 pesos');
    expect(numerosEnTexto('somos cinco').trim()).toBe('somos 5');
  });
  it('detecta presupuesto y personas', () => {
    const e = entender('Tengo $1,200 para 6 personas', estados);
    expect(e.presupuesto).toBe(1200);
    expect(e.personas).toBe(6);
  });
  it('distingue Baja California de Baja California Sur', () => {
    expect(entender('recetas de baja california sur', estados).estados).toEqual([3]);
    expect(entender('recetas de Baja California', estados).estados).toEqual([2]);
  });
  it('reconoce preguntas de origen y temporada', () => {
    const e = entender('¿Qué se recolecta en Oaxaca ahora?', estados);
    expect(e.origen).toBe(true);
    expect(e.temporadaAhora).toBe(true);
    expect(e.estados).toEqual([20]);
  });
  it('reconoce tiempo máximo', () => {
    expect(entender('algo rápido de Yucatán', estados).tiempoMax).toBe(45);
    expect(entender('en menos de 30 minutos', estados).tiempoMax).toBe(30);
  });
});
