#!/usr/bin/env python3
"""Rehace public/audio/fonema/<silaba>.ogg a partir del video de FIESTIKIDS.

Las 45 silabas (M P S L N D F T B x A E I O U) salen del video
"SILABAS PARA NINOS CON MUSICA" (https://youtu.be/j1RIUuftxKo). El video arma
cada bloque como "MA de mama, ME de mesa..." y lo cierra repitiendo las cinco
silabas solas; esa repeticion final es la unica parte donde la silaba suena
aislada, sin la palabra de ejemplo pegada atras, y es de donde se corta.

El video tiene musica de fondo todo el tiempo, asi que primero se separa la voz
con Demucs. Despues de separar, la musica que queda en la pista de voz esta 40 dB
por debajo de la silaba: inaudible.

Uso:
    python3 scripts/silabas.py [--trabajo DIR]

Hace falta: yt-dlp (con un runtime de JS instalado, por ejemplo node), demucs,
numpy, soundfile y ffmpeg. Tarda unos minutos: casi todo es Demucs en CPU.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

VIDEO = "https://youtu.be/j1RIUuftxKo"
DESTINO = Path(__file__).resolve().parent.parent / "public" / "audio" / "fonema"

# Estribillo de cada bloque, medido sobre la pista de voz: cinco silabas
# seguidas, siempre en orden A E I O U. Son marcas gruesas; los bordes finos los
# afina `afinar()`. Si YouTube re-codifica el video y todo se corre unos
# milisegundos, estos son los numeros que hay que volver a medir.
ESTRIBILLOS = {
    "M": [(66.40, 67.07), (67.43, 68.16), (68.47, 69.13), (69.53, 70.15), (70.47, 71.03)],
    "P": [(107.93, 108.49), (108.77, 109.40), (109.69, 110.31), (110.66, 111.17), (111.51, 111.93)],
    "S": [(147.65, 148.40), (148.93, 149.62), (149.95, 150.69), (150.91, 151.59), (151.80, 152.37)],
    "L": [(188.69, 189.41), (189.67, 190.43), (190.76, 191.41), (191.68, 192.36), (192.66, 193.30)],
    "N": [(228.84, 229.54), (229.87, 230.54), (230.84, 231.42), (231.62, 232.18), (232.49, 233.39)],
    "D": [(270.15, 270.83), (271.22, 271.84), (272.12, 272.76), (273.09, 273.60), (273.92, 274.52)],
    "F": [(311.72, 312.41), (312.65, 313.39), (313.65, 314.28), (314.57, 315.26), (315.51, 316.05)],
    "T": [(352.03, 352.77), (353.17, 353.78), (354.13, 354.70), (355.14, 355.62), (356.07, 356.48)],
    "B": [(392.37, 393.00), (393.28, 393.95), (394.27, 394.91), (395.28, 395.79), (396.13, 396.64)],
}
VOCALES = "AEIOU"

CUADRO = 0.005          # paso del analisis, en segundos
MIRA_ANTES = 0.18       # cuanto se mira alrededor de la marca gruesa
MIRA_DESPUES = 0.25
ENTRADA, SALIDA = 0.012, 0.080   # fundidos, para que no chasquee
CABEZA, COLA = 0.030, 0.120      # silencio que queda en el archivo final
LUFS = -18.0            # mismo volumen que los audios de las letras


def correr(*orden: str, **kw) -> subprocess.CompletedProcess:
    return subprocess.run(list(orden), check=True, **kw)


def ffmpeg() -> str:
    """ffmpeg del sistema; si no esta, el estatico que trae imageio-ffmpeg."""
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("Falta ffmpeg (o el paquete imageio-ffmpeg).")


def bajar_y_separar(trabajo: Path) -> Path:
    """Baja el audio del video y devuelve la pista de voz separada de la musica."""
    voz = trabajo / "sep" / "htdemucs" / "completo" / "vocals.wav"
    if voz.exists():
        print(f"voz ya separada en {voz}")
        return voz

    crudo = trabajo / "video.webm"
    if not crudo.exists():
        print("bajando el audio del video...")
        correr("yt-dlp", "--js-runtimes", "node", "-f", "bestaudio",
               "-o", str(trabajo / "video.%(ext)s"), VIDEO)
        crudo = next(trabajo.glob("video.*"))

    completo = trabajo / "completo.wav"
    if not completo.exists():
        correr(ffmpeg(), "-y", "-loglevel", "error", "-i", str(crudo),
               "-ac", "2", "-ar", "44100", str(completo))

    print("separando voz y musica con Demucs (tarda unos minutos)...")
    correr(sys.executable, "-m", "demucs", "--two-stems=vocals", "-n", "htdemucs",
           "-o", str(trabajo / "sep"), str(completo))
    return voz


def medir(onda: np.ndarray, sr: int, desde: int, hasta: int) -> tuple[np.ndarray, np.ndarray]:
    """Nivel en dB y proporcion de energia por encima de 4 kHz, cuadro por cuadro."""
    paso = int(sr * CUADRO)
    trozo = onda[desde:hasta]
    n = len(trozo) // paso
    db = np.empty(n)
    agudo = np.empty(n)
    alto = np.fft.rfftfreq(paso, 1 / sr) > 4000
    ventana = np.hanning(paso)
    for i in range(n):
        c = trozo[i * paso:(i + 1) * paso]
        db[i] = 20 * np.log10(np.sqrt(np.mean(c ** 2)) + 1e-12)
        espectro = np.abs(np.fft.rfft(c * ventana)) ** 2
        agudo[i] = espectro[alto].sum() / (espectro.sum() + 1e-12)
    return db, agudo


def afinar(onda: np.ndarray, sr: int, a: float, b: float,
           fin_previo: float, inicio_siguiente: float) -> tuple[int, int]:
    """Afina los bordes de una silaba sin invadir a la vecina.

    El nivel solo no alcanza para separar el ataque de una F o una S (fricativas
    flojas, 30 dB por debajo de la vocal) de la cola de reverberacion de la
    silaba anterior: las dos andan por los -60 dB. Lo que las distingue es el
    brillo. Por eso el nucleo se busca por nivel y recien despues se estira hacia
    atras, y solo mientras el sonido siga siendo agudo, que es lo que hace una
    fricativa o el golpe de una T.
    """
    desde = max(0, int(max(a - MIRA_ANTES, fin_previo + 0.02) * sr))
    hasta = min(len(onda), int(min(b + MIRA_DESPUES, inicio_siguiente - 0.02) * sr))
    paso = int(sr * CUADRO)
    db, agudo = medir(onda, sr, desde, hasta)
    pico = db.max()

    fuerte = db > pico - 30
    firme = np.where(fuerte[:-1] & fuerte[1:])[0]      # dos cuadros seguidos
    if len(firme) == 0:
        firme = np.where(fuerte)[0]
    i0, i1 = int(firme[0]), int(firme[-1]) + 1

    tope = int(0.25 / CUADRO)                           # ataque agudo y flojo
    i, faltas = i0, 0
    while i > 0 and i0 - i < tope and faltas <= 3:
        i -= 1
        if db[i] > pico - 45 and agudo[i] > 0.15:
            i0, faltas = i, 0
        else:
            faltas += 1

    tope = int(0.30 / CUADRO)                           # cola de la vocal
    i, faltas = i1, 0
    while i < len(db) - 1 and i - i1 < tope and faltas <= 3:
        i += 1
        if db[i] > pico - 38:
            i1, faltas = i, 0
        else:
            faltas += 1

    return desde + i0 * paso, desde + (i1 + 1) * paso


def recortar(voz: Path, salida: Path) -> list[str]:
    onda, sr = sf.read(voz)
    if onda.ndim > 1:
        onda = onda.mean(axis=1)
    salida.mkdir(parents=True, exist_ok=True)

    cabeza, cola = int(CABEZA * sr), int(COLA * sr)
    entrada, fin = int(ENTRADA * sr), int(SALIDA * sr)
    nombres: list[str] = []

    for consonante, marcas in ESTRIBILLOS.items():
        bordes = []
        for i, (a, b) in enumerate(marcas):
            previo = marcas[i - 1][1] if i > 0 else a - 1.0
            siguiente = marcas[i + 1][0] if i + 1 < len(marcas) else b + 1.0
            bordes.append(list(afinar(onda, sr, a, b, previo, siguiente)))
        # dos silabas nunca comparten muestras
        for i in range(len(bordes) - 1):
            bordes[i][1] = min(bordes[i][1], bordes[i + 1][0])

        for i, (desde, hasta) in enumerate(bordes):
            silaba = (consonante + VOCALES[i]).lower()
            clip = np.concatenate([np.zeros(cabeza), onda[desde:hasta], np.zeros(cola)])
            clip[cabeza:cabeza + entrada] *= np.linspace(0, 1, entrada)
            clip[-cola - fin:-cola] *= np.linspace(1, 0, fin)
            sf.write(salida / f"{silaba}.wav", clip, sr, subtype="FLOAT")
            nombres.append(silaba)
            print(f"  {silaba:3} {desde / sr:7.2f}-{hasta / sr:7.2f}  ({(hasta - desde) / sr:.2f} s)")
    return nombres


def sonoridad(ff: str, archivo: Path) -> float:
    """Sonoridad integrada (LUFS) medida con ebur128."""
    salida = subprocess.run(
        [ff, "-hide_banner", "-i", str(archivo), "-af", "highpass=f=70,ebur128", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    marca = salida.index("Integrated loudness")
    return float(salida[marca:].split("I:")[1].split("LUFS")[0])


def encodear(ff: str, wav: Path, ogg: Path, ganancia: float) -> None:
    correr(ff, "-y", "-loglevel", "error", "-i", str(wav),
           "-af", f"highpass=f=70,volume={ganancia:.2f}dB,alimiter=limit=0.891:level=disabled",
           "-ac", "1", "-ar", "44100", "-c:a", "libvorbis", "-b:a", "96k", str(ogg))


def normalizar(ff: str, wav: Path, ogg: Path) -> float:
    """Deja el archivo en -18 LUFS medidos sobre el ogg, no sobre el wav.

    La medida se toma del resultado y se corrige una vez porque en clips tan
    cortos la compuerta del ebur128 y la codificacion con perdida mueven el
    numero un par de decimas, y todos los audios tienen que sonar igual de
    fuerte: si una silaba salta, el chico deja de escuchar y se asusta.
    """
    ganancia = LUFS - sonoridad(ff, wav)
    encodear(ff, wav, ogg, ganancia)
    desvio = LUFS - sonoridad(ff, ogg)
    if abs(desvio) > 0.2:
        ganancia += desvio
        encodear(ff, wav, ogg, ganancia)
    return ganancia


def codificar(ff: str, origen: Path, destino: Path, nombres: list[str]) -> None:
    """Normaliza a -18 LUFS y guarda ogg vorbis mono 44,1 kHz / 96 kb/s."""
    destino.mkdir(parents=True, exist_ok=True)
    for silaba in nombres:
        ganancia = normalizar(ff, origen / f"{silaba}.wav", destino / f"{silaba}.ogg")
        print(f"  {silaba:3} {ganancia:+.2f} dB")


def repaso(ff: str, origen: Path, destino: Path, nombres: list[str]) -> None:
    """Un solo archivo con las 45 silabas seguidas, para escucharlas de una."""
    sr = 44100
    piezas = []
    for silaba in nombres:
        audio, _ = sf.read(origen / f"{silaba}.wav")
        piezas.append(audio)
        piezas.append(np.zeros(int(0.30 * sr)))
    junto = origen / "seguidas.wav"
    sf.write(junto, np.concatenate(piezas), sr, subtype="FLOAT")
    normalizar(ff, junto, destino / "_silabas-seguidas.ogg")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trabajo", type=Path, default=Path("/tmp/ami-silabas"),
                        help="carpeta donde quedan el video y los intermedios")
    parser.add_argument("--destino", type=Path, default=DESTINO)
    args = parser.parse_args()
    args.trabajo.mkdir(parents=True, exist_ok=True)

    ff = ffmpeg()
    voz = bajar_y_separar(args.trabajo)

    print("recortando las silabas...")
    nombres = recortar(voz, args.trabajo / "clips")

    print("normalizando y codificando...")
    codificar(ff, args.trabajo / "clips", args.destino, nombres)
    repaso(ff, args.trabajo / "clips", args.destino, nombres)

    (args.trabajo / "silabas.json").write_text(json.dumps(nombres, indent=2))
    print(f"\n{len(nombres)} silabas en {args.destino}")


if __name__ == "__main__":
    main()
