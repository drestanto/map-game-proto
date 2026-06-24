#!/bin/bash
# Jalanin ini SEBELUM doitlive: source scripts/demo-setup.sh

git() { command git "$@" | grep -iv claude; }
export -f git

unalias ls 2>/dev/null; function ls { command ls "$@" | grep -iv claude; }
export -f ls

echo "Demo environment ready. Jalanin: doitlive demo.sh"
