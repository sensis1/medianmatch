#!/bin/bash
# Double-registration test: 50 test visitors, each visiting 3 times.
# Expected change on the dashboard: Visits +150, Visitors +50.
# If Visitors goes up by more than 50, the server is double-registering people.
# If Visits goes up by more than 150, events are being stored twice.
# All test rows are labeled "loadtest"; remove with:
#   DELETE FROM events WHERE type='visit' AND label='loadtest';

PEOPLE=50; REPEATS=3
API="https://medianmatch-stats.onrender.com"
ORIGIN="https://medianmatch.onrender.com"
UA="Mozilla/5.0 (Macintosh) MedianMatch-DedupTest/1.0"

echo "Before running, write down Visits and Visitors for today on $API/admin."
read -p "Press Enter when ready... "

printf "Waking API"
for i in $(seq 1 20); do
  [ "$(curl -s -m 30 -o /dev/null -w '%{http_code}' "$API/health")" = "200" ] && { echo " ✓"; break; }
  printf "."; sleep 5
done

ok=0; bad=0
for r in $(seq 1 $REPEATS); do
  for p in $(seq 1 $PEOPLE); do
    code=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -X POST "$API/e" \
      -H "Content-Type: text/plain" -H "Origin: $ORIGIN" -A "$UA Person-$p" \
      --data '[{"t":"visit","l":"loadtest"}]')
    if [ "$code" = "204" ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "visit failed: HTTP $code"; fi
    printf "\rRound %d/%d, accepted %d" $r $REPEATS $ok
  done
done
echo
echo "Accepted $ok visits from $PEOPLE test visitors ($bad failed)."
echo "Now refresh $API/admin and compare with what you wrote down:"
echo "  Visits should be +$ok"
echo "  Visitors should be +$PEOPLE"
echo "Anything higher means double-registration."
