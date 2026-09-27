#!/usr/bin/env bash
# Recorrido completo de la demo contra un servidor ya levantado.
#
#   npm run start:dev        # en una terminal
#   npm run demo             # en otra
#
# Muestra, en este orden: onboarding sin datos personales, una sesion de nivel
# resuelta tarjeta por tarjeta con errores, las sesiones que hagan falta hasta
# dominar el nivel segun las reglas del servidor, el pago de estrellas y
# accesorio, el repaso, el bloqueo por habilitacion docente, el desbloqueo desde
# el panel y la tabla del curso.
#
# La clase vive en memoria: para volver a correrla, reiniciar el servidor.

set -euo pipefail

BASE="${AMI_BASE_URL:-http://localhost:3000}"
CLASS_CODE="${AMI_CLASS_CODE:-PRIMERO-A}"
TEACHER_CODE="${AMI_TEACHER_CODE:-PRIMERO-A-DOC}"

command -v jq >/dev/null || { echo "Falta jq. Instalalo con: apt-get install jq"; exit 1; }

# Todo lo informativo va a stderr: stdout queda libre para el JSON que las
# funciones devuelven y el llamador vuelve a pasar por jq.
paso() { printf '\n\033[1;36m== %s\033[0m\n' "$*" >&2; }
dato() { printf '   %s\n' "$*" >&2; }

api() {
  local method=$1 path=$2 body=${3:-} header=${4:-}
  local args=(-sS -X "$method" "$BASE$path" -H 'Content-Type: application/json')
  [[ -n "$header" ]] && args+=(-H "$header")
  [[ -n "$body" ]] && args+=(-d "$body")
  curl "${args[@]}"
}

paso "1. La seno dio el codigo $CLASS_CODE y el chico lo escribe"
api POST /onboarding/class-code/verify "{\"classCode\":\"$CLASS_CODE\"}" | jq -c

paso "2. Elige mascota y entra. Sin nombre, sin cuenta, sin contrasena"
SESSION=$(api POST /onboarding/students "{\"classCode\":\"$CLASS_CODE\",\"petSpecies\":\"LION\"}")
STUDENT_TOKEN=$(echo "$SESSION" | jq -r .studentToken)
AUTH="x-ami-student-token: $STUDENT_TOKEN"
dato "token: $STUDENT_TOKEN"

paso "3. Pantalla inicial: que niveles ve"
api GET /me/levels '' "$AUTH" | jq -r '.[] | "   nivel \(.order) \(.title) -> \(.status)"'

# La solucion no viaja al cliente: se reconstruye leyendo los botones de la
# tarjeta, que es justo lo que hace el chico. Se decide por el tipo de tarjeta:
# la presentacion de la letra tambien trae una palabra, pero se resuelve tocando
# su unico boton.
RESOLVER='
  def sinTilde: gsub("Á";"A") | gsub("É";"E") | gsub("Í";"I")
              | gsub("Ó";"O") | gsub("Ú";"U");
  # Consume la palabra de izquierda a derecha con el boton mas largo que encaje:
  # sirve igual para botones de letra y de silaba.
  def armar($resto; $libres):
    if $resto == "" then []
    else
      ([$libres | to_entries[] | select(. as $e | $resto | startswith($e.value.label | sinTilde))]
        | sort_by(-(.value.label | length)) | .[0]) as $e
      | if $e == null then null
        else armar($resto[($e.value.label | length):]; ($libres | del(.[$e.key]))) as $sigue
          | if $sigue == null then null else [$e.value.id] + $sigue end
        end
    end;
  .card as $c
  | if $c.kind == "LETTER_INTRO" then [$c.tiles[0].id]
    elif $c.kind == "SOUND_RECOGNITION" then
      ($c.targetPhoneme | sinTilde) as $p
      | [$c.tiles[] | select((.label | sinTilde) | startswith($p)) | .id][0:1]
    elif $c.kind == "SENTENCE_BUILDING" then
      reduce ($c.targetSentence | sinTilde | split(" "))[] as $p ([[], $c.tiles];
        (.[1] | map((.label | sinTilde) == $p) | index(true)) as $i
        | if $i == null then . else [.[0] + [.[1][$i].id], (.[1] | del(.[$i]))] end)
      | .[0]
    else armar($c.targetWord | sinTilde; $c.tiles) // []
    end'

# Una respuesta equivocada: un boton que no dice lo que va primero.
EQUIVOCADA='
  (.sol[0]) as $primero
  | (.card.tiles | map(select(.id == $primero)) | .[0].label) as $bien
  | [.card.tiles[] | select(.label != $bien) | .id][0:1]'

# Resuelve una sesion entera del nivel actual, tarjeta por tarjeta. Con
# `errores` en 1, cada tarjeta sale recien al segundo intento.
jugar_sesion() {
  local errores=$1
  local state sid card_id seq n=0

  state=$(api POST /practice/sessions '{}' "$AUTH")
  sid=$(echo "$state" | jq -r .sessionId)
  dato "sesion $sid sobre $(echo "$state" | jq -r .levelId)"

  while true; do
    card_id=$(echo "$state" | jq -r '.card.id // empty')
    [[ -z "$card_id" ]] && break
    n=$((n + 1))

    if [[ "$n" -gt 20 ]]; then
      echo "   la sesion no avanza: 20 tarjetas y sigue abierta" >&2
      exit 1
    fi

    seq=$(echo "$state" | jq -c "$RESOLVER")
    if [[ "$seq" == "[]" || -z "$seq" ]]; then
      echo "   no se pudo resolver la tarjeta $card_id" >&2
      exit 1
    fi

    if [[ "$errores" == "1" ]]; then
      local mal
      mal=$(echo "$state" | jq -c --argjson sol "$seq" '{card: .card, sol: $sol}' | jq -c "$EQUIVOCADA")
      # La presentacion de la letra tiene un solo boton: no hay como equivocarse.
      if [[ "$mal" != "[]" ]]; then
        api POST "/practice/sessions/$sid/cards/$card_id/attempt" "{\"sequence\":$mal}" "$AUTH" \
          | jq -r '"   fallo -> \(.feedback.valoro) \(.feedback.mePregunto)"' >&2
      fi
    fi

    local res
    res=$(api POST "/practice/sessions/$sid/cards/$card_id/attempt" "{\"sequence\":$seq}" "$AUTH")
    echo "$res" | jq -r '"   \(.expectedLength) boton(es) -> correct=\(.correct) | \(.feedback.valoro)"' >&2

    if [[ "$(echo "$res" | jq -r .voiceCheckRequired)" == "true" ]]; then
      local expected
      expected=$(echo "$state" | jq -r '.card.voiceTarget')
      api POST "/practice/sessions/$sid/cards/$card_id/voice-check" \
        "{\"transcript\":\"$expected\"}" "$AUTH" \
        | jq -r '"   voz \"\(.transcript)\" similitud \(.similarity) -> accepted=\(.accepted)"' >&2
      state=$(api GET "/practice/sessions/$sid/current-card" '' "$AUTH")
    else
      state=$(echo "$res" | jq -c .session)
    fi
  done

  api POST "/practice/sessions/$sid/complete" '{}' "$AUTH"
}

REGLAS=$(api GET /catalog/mastery-rules)
UMBRAL=$(echo "$REGLAS" | jq -r .threshold)
VENTANA=$(echo "$REGLAS" | jq -r .windowSize)

paso "4. Primera sesion del nivel 1, equivocandose una vez en cada tarjeta"
dato "se domina con promedio $UMBRAL sobre las ultimas $VENTANA sesiones"
jugar_sesion 1 | jq -r '"   precision \(.accuracy) | promedio \(.masteryAverage) | dominado=\(.mastered)\n   mascota: \(.feedback.valoro) \(.feedback.sugiero)"'

paso "5. Vuelve a jugar el nivel 1 hasta dominarlo: el promedio movil decide"
for intento in 1 2 3; do
  CIERRE=$(jugar_sesion 0)
  echo "$CIERRE" | jq -r '"   precision \(.accuracy) | promedio \(.masteryAverage) | dominado=\(.mastered)"'
  [[ "$(echo "$CIERRE" | jq -r .mastered)" == "true" ]] && break
done

paso "6. Al dominarlo cobra estrellas y un accesorio, y se abre el nivel 2"
echo "$CIERRE" | jq -r '"   estrellas +\(.starsAwarded) (total \(.totalStars)) | accesorio: \(.accessoryUnlocked.label // "ninguno")\n   siguiente: nivel \(.nextLevel.order // 0) -> \(.nextLevel.status // "sin nivel")\n   mascota: \(.feedback.valoro) \(.feedback.sugiero)"'

paso "7. La mascota estrena el accesorio ganado"
api PATCH /me/pet '{"equippedAccessoryIds":["acc-gorro"]}' "$AUTH" \
  | jq -r '"   \(.label) con: \([.accessories[] | select(.equipped) | .label] | join(", "))"'

paso "8. Repaso: solo aparece lo ya dominado, y no afecta la progresion"
api GET /review/sounds '' "$AUTH" | jq -r '"   sonidos disponibles: \([.[].letter] | join(", "))"'
api GET '/review/cards?limit=3' '' "$AUTH" | jq -r '"   \(.cards | length) tarjetas de \(.available) disponibles"'

CERRADO=$(api GET /me/levels '' "$AUTH" | jq -c '[.[] | select(.status == "LOCKED_BY_TEACHER")][0] // empty')
if [[ -z "$CERRADO" ]]; then
  echo "   no queda ningun nivel cerrado por la seno: la demo ya corrio contra este servidor. Reinicialo." >&2
  exit 1
fi
ORDEN_CERRADO=$(echo "$CERRADO" | jq -r .order)

paso "9. El nivel $ORDEN_CERRADO esta cerrado: la seno todavia no lo dio"
echo "$CERRADO" | jq -r '"   nivel \(.order) -> \(.status): \(.lockedReason)"'
api POST /practice/sessions "{\"levelId\":$(echo "$CERRADO" | jq .id)}" "$AUTH" | jq -r '"   intentar entrar -> \(.statusCode // 200): \(.message // "entro")"'

paso "10. La seno abre el nivel $ORDEN_CERRADO desde su panel"
TEACHER_TOKEN=$(api POST /teacher/session "{\"teacherCode\":\"$TEACHER_CODE\"}" | jq -r .teacherToken)
TAUTH="x-ami-teacher-token: $TEACHER_TOKEN"
api PUT /teacher/class/unlocked-level "{\"levelOrder\":$ORDEN_CERRADO}" "$TAUTH" \
  | jq -r '"   \(.name) habilitado hasta el nivel \(.unlockedLevelOrder) de \(.lastLevelOrder)"'

paso "11. El chico ve el cambio, pero antes tiene que dominar los niveles anteriores"
api GET /me/levels '' "$AUTH" | jq -r '.[] | "   nivel \(.order) \(.title) -> \(.status)"'

paso "12. Lo que ve la seno de su curso"
api GET /teacher/class '' "$TAUTH" | jq -r '"   \(.name) (\(.code)) | \(.studentCount) alumnos | habilitado hasta \(.unlockedLevelOrder)"'
api GET /teacher/class/students '' "$TAUTH" \
  | jq -r '.[] | "   \(.pet) | \(.stars) estrellas | \(.masteredLevels) niveles | en nivel \(.currentLevelOrder // 0) con promedio \(.currentMasteryAverage)"'
api GET /teacher/class/levels '' "$TAUTH" \
  | jq -r '.[] | "   nivel \(.order) \(.title) | habilitado=\(.unlocked) | dominado por \(.masteredCount) | en curso \(.inProgressCount)"'

printf '\n\033[1;32mRecorrido completo.\033[0m Documentacion en %s/docs\n' "$BASE"
