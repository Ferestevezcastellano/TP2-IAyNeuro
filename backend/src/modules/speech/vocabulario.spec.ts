import { Card, CardKind, CardTile, Level, TileKind } from '../../core/domain';
import { CardRepository, LevelRepository } from '../../core/ports';
import { vocabularioDe } from './vocabulario';
import { VoskSpeechRecognitionProvider } from './vosk-speech-recognition.provider';

function tarjeta(parcial: Partial<Card>): Card {
  return {
    id: 'c',
    levelId: 'nivel-1',
    position: 1,
    group: 'g',
    kind: CardKind.WORD_BUILDING,
    prompt: '',
    audioKey: '',
    spokenAs: '',
    tiles: [],
    solution: [],
    ...parcial,
  };
}

const ficha = (label: string): CardTile => ({ id: label, label, kind: TileKind.IMAGE });

describe('vocabularioDe', () => {
  it('toma las palabras armadas, las de las oraciones y las de los dibujos', () => {
    const palabras = vocabularioDe([
      tarjeta({ targetWord: 'MESA' }),
      tarjeta({ targetSentence: 'LA LUNA SALE' }),
      tarjeta({ tiles: [ficha('ELEFANTE'), ficha('M')] }),
    ]);

    expect(palabras).toEqual(expect.arrayContaining(['mesa', 'la', 'luna', 'sale', 'elefante']));
    // una ficha de una o dos letras no es una palabra que compita
    expect(palabras).not.toContain('m');
  });

  it('suma las palabras comunes de primer grado aunque no estén en el contenido', () => {
    expect(vocabularioDe([])).toEqual(expect.arrayContaining(['perro', 'gato', 'mamá']));
  });

  it('reemplaza las palabras que el modelo no conoce por sus partes', () => {
    const palabras = vocabularioDe([tarjeta({ targetWord: 'TUCÁN' }), tarjeta({ tiles: [ficha('IGLÚ')] })]);

    expect(palabras).toEqual(expect.arrayContaining(['tu', 'can']));
    expect(palabras).not.toContain('tucán');
    expect(palabras).not.toContain('iglú');
  });

  it('no repite palabras', () => {
    const palabras = vocabularioDe([tarjeta({ targetWord: 'MESA' }), tarjeta({ targetSentence: 'LA MESA' })]);
    expect(palabras.filter((p) => p === 'mesa')).toHaveLength(1);
  });
});

describe('VoskSpeechRecognitionProvider', () => {
  it('arma el vocabulario con el contenido que tenga el repositorio al arrancar', async () => {
    const niveles = { findAll: async () => [{ id: 'nivel-1' } as Level] } as unknown as LevelRepository;
    const tarjetas = {
      findByLevelIds: async (ids: string[]) => (ids.includes('nivel-1') ? [tarjeta({ targetWord: 'PALOMA' })] : []),
    } as unknown as CardRepository;

    const vosk = new VoskSpeechRecognitionProvider(niveles, tarjetas);
    await vosk.onApplicationBootstrap();

    expect(vosk['palabras']).toContain('paloma');
  });
});
