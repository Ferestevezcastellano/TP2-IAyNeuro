#!/usr/bin/env bash
# Recorrido completo de la demo contra un servidor ya levantado.
#
#   npm run start:dev        # en una terminal
#   npm run demo             # en otra
#
# Muestra, en este orden: onboarding sin datos personales, una sesion de nivel
# resuelta tarjeta por tarjeta, el nivel que no se domina de una sola vez, el
# pago de estrellas y accesorio al tercer intento, el bloqueo por habilitacion
# docente, el desbloqueo desde el panel, el repaso y la tabla del curso.

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

# Resuelve una sesion entera del nivel actual, tarjeta por tarjeta.
jugar_sesion() {
  local aciertos_perfectos=$1
  local state sid card_id tiles seq n=0

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

    # La solucion no viaja al cliente: la reconstruimos leyendo los labels de la
    # tarjeta contra la palabra objetivo, que es justo lo que hace el chico.
    tiles=$(echo "$state" | jq -c '.card.tiles')
    local target
    target=$(echo "$state" | jq -r '.card.targetWord // .card.targetSentence // ""')

    if [[ -n "$target" ]]; then
      seq=$(echo "$state" | jq -c --arg t "$target" '
        ($t | if test(" ") then split(" ") else (split("") | map(ascii_upcase)) end) as $parts
        | reduce $parts[] as $p ([[], .card.tiles];
            (.[1] | map(.label == $p) | index(true)) as $i
            | if $i == null then . else [.[0] + [.[1][$i].id], (.[1] | del(.[$i]))] end)
        | .[0]')
    else
      # Tarjeta de reconocimiento: la respuesta es el dibujo que empieza con el
      # fonema. Hay que sacar las tildes, porque ARBOL se ilustra como ARBOL.
      seq=$(echo "$state" | jq -c '
        def sinTilde: gsub("\u00c1";"A") | gsub("\u00c9";"E") | gsub("\u00cd";"I")
                    | gsub("\u00d3";"O") | gsub("\u00da";"U");
        (.card.targetPhoneme | sinTilde) as $p
        | [.card.tiles[] | select((.label | sinTilde) | startswith($p)) | .id][0:1]')
    fi

    if [[ "$seq" == "[]" || -z "$seq" ]]; then
      echo "   no se pudo resolver la tarjeta $card_id" >&2
      exit 1
    fi

    if [[ "$n" -gt "$aciertos_perfectos" ]]; then
      # Una tarjeta que sale recien al segundo intento, para ver el feedback.
      api POST "/practice/sessions/$sid/cards/$card_id/attempt" \
        "{\"sequence\":$(echo "$seq" | jq -c 'reverse')}" "$AUTH" \
        | jq -r '"   fallo -> \(.feedback.valoro) \(.feedback.mePregunto)"' >&2
    fi

    local res
    res=$(api POST "/practice/sessions/$sid/cards/$card_id/attempt" "{\"sequence\":$seq}" "$AUTH")
    echo "$res" | jq -r '"   tarjeta \(.expectedLength) botones -> correct=\(.correct) | \(.feedback.valoro)"' >&2

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

paso "4. Primera sesion del nivel 1"
jugar_sesion 99 | jq -r '"   precision \(.accuracy) | promedio \(.masteryAverage) | dominado=\(.mastered) | faltan \(.sessionsRemaining) sesion(es)\n   mascota: \(.feedback.valoro) \(.feedback.sugiero)"'

paso "5. Segunda sesion: una sola sesion buena no alcanza, tampoco dos"
jugar_sesion 99 | jq -r '"   precision \(.accuracy) | promedio \(.masteryAverage) | dominado=\(.mastered) | faltan \(.sessionsRemaining) sesion(es)"'

paso "6. Tercera sesion: recien aca el promedio movil declara el dominio"
jugar_sesion 99 | jq -r '"   precision \(.accuracy) | promedio \(.masteryAverage) | dominado=\(.mastered)\n   estrellas +\(.starsAwarded) (total \(.totalStars)) | accesorio: \(.accessoryUnlocked.label // "ninguno")\n   siguiente: nivel \(.nextLevel.order // 0) -> \(.nextLevel.status // "sin nivel")\n   mascota: \(.feedback.valoro) \(.feedback.sugiero)"'

paso "7. La mascota estrena el accesorio ganado"
api PATCH /me/pet '{"equippedAccessoryIds":["acc-gorro"]}' "$AUTH" \
  | jq -r '"   \(.label) con: \([.accessories[] | select(.equipped) | .label] | join(", "))"'

paso "8. Repaso: solo aparece lo ya dominado, y no afecta la progresion"
api GET /review/sounds '' "$AUTH" | jq -r '"   sonidos disponibles: \([.[].letter] | join(", "))"'
api GET '/review/cards?limit=3' '' "$AUTH" | jq -r '"   \(.cards | length) tarjetas de \(.available) disponibles"'

paso "9. El nivel 4 esta cerrado: la seno todavia no lo dio"
api GET /me/levels '' "$AUTH" | jq -r '.[] | select(.order == 4) | "   nivel 4 -> \(.status): \(.lockedReason)"'
api POST /practice/sessions '{"levelId":"level-04-l-n"}' "$AUTH" | jq -r '"   intentar entrar -> \(.statusCode // 200): \(.message // "entro")"'

paso "10. La seno abre el nivel 4 desde su panel"
TEACHER_TOKEN=$(api POST /teacher/session "{\"teacherCode\":\"$TEACHER_CODE\"}" | jq -r .teacherToken)
TAUTH="x-ami-teacher-token: $TEACHER_TOKEN"
api PUT /teacher/class/unlocked-level '{"levelOrder":4}' "$TAUTH" \
  | jq -r '"   \(.name) habilitado hasta el nivel \(.unlockedLevelOrder) de \(.lastLevelOrder)"'

paso "11. El chico ve el cambio, pero sigue necesitando dominar el 2 y el 3"
api GET /me/levels '' "$AUTH" | jq -r '.[] | "   nivel \(.order) \(.title) -> \(.status)"'

paso "12. Lo que ve la seno de su curso"
api GET /teacher/class '' "$TAUTH" | jq -r '"   \(.name) (\(.code)) | \(.studentCount) alumnos | habilitado hasta \(.unlockedLevelOrder)"'
api GET /teacher/class/students '' "$TAUTH" \
  | jq -r '.[] | "   \(.pet) | \(.stars) estrellas | \(.masteredLevels) niveles | en nivel \(.currentLevelOrder // 0) con promedio \(.currentMasteryAverage)"'
api GET /teacher/class/levels '' "$TAUTH" \
  | jq -r '.[] | "   nivel \(.order) \(.title) | habilitado=\(.unlocked) | dominado por \(.masteredCount) | en curso \(.inProgressCount)"'

printf '\n\033[1;32mRecorrido completo.\033[0m Documentacion en %s/docs\n' "$BASE"
