#!/bin/bash
# Sends test "visit" events to the MedianMatch stats API (needs only curl, built into macOS).
# Usage: bash scripts/ping-visits.sh [count]   (each visit is a separate test visitor)
# Test visits are labeled "loadtest". Remove later in Neon with:
#   DELETE FROM events WHERE type='visit' AND label='loadtest';

TOTAL=${1:-1000}
API="https://medianmatch-stats.onrender.com"
ORIGIN="https://medianmatch.onrender.com"
UA="Mozilla/5.0 (Macintosh) MedianMatch-LoadTest/1.0"
BODY='[{"t":"visit","l":"loadtest"},{"t":"visit","l":"loadtest"},{"t":"visit","l":"loadtest"},{"t":"visit","l":"loadtest"},{"t":"visit","l":"loadtest"},{"t":"visit","l":"loadtest"},{"t":"visit","l":"loadtest"},{"t":"visit","l":"loadtest"},{"t":"visit","l":"loadtest"},{"t":"visit","l":"loadtest"}]'

printf "Waking API (can take ~50s)"
for i in $(seq 1 20); do
  code=$(curl -s -m 30 -o /dev/null -w "%{http_code}" "$API/health")
  [ "$code" = "200" ] && { echo " ✓"; break; }
  printf "."; sleep 5
  [ "$i" = "20" ] && { echo; echo "API didn't respond at $API/health"; exit 1; }
done

# Each test visitor gets its own browser string, so the server counts it as a separate visitor.
visit() {
  for try in 1 2 3; do
    code=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -X POST "$API/e" \
      -H "Content-Type: text/plain" -H "Origin: $ORIGIN" -A "$UA Tester-$1" \
      --data '[{"t":"visit","l":"loadtest"}]')
    [ "$code" = "204" ] && { echo ok; return; }
    [ "$code" = "403" ] && { echo 403; return; }
    sleep 1
  done
  echo "fail:$code"
}
export -f visit; export API ORIGIN UA

seq 1 "$TOTAL" | xargs -P 10 -I{} bash -c 'visit {}' > /tmp/mm_results.txt
ok=$(grep -c '^ok$' /tmp/mm_results.txt)
if grep -q '^403$' /tmp/mm_results.txt; then
  echo "403: origin not allowed. Set ALLOWED_ORIGINS on Render to exactly $ORIGIN (likely why real visits aren't counting)."
fi
echo "Done: $ok of $TOTAL visits accepted, each as its own visitor."
echo "Check $API/admin: visitors should go up by $ok, with \"loadtest\" under referrers."
