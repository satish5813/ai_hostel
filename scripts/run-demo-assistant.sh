#!/bin/zsh
# Runs the demo assistant against the API on this Mac: it plays the wardens, the office, the mess and maintenance
# for the demo student, a few seconds after each action on the phone. Keep it running in a Terminal during the demo.
#   scripts/run-demo-assistant.sh                 the two new-registration logins, 2600041011 and 2600040011
#   scripts/run-demo-assistant.sh 2600040012      another student, or several separated by commas
cd ${0:A:h:h}
STUDENTS=${1:-2600041011,2600040011} DELAY=${DELAY:-6} API=${API:-http://localhost:4100} exec node scripts/demo-staff-bot.mjs
