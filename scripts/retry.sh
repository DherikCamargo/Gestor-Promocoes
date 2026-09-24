#!/usr/bin/env bash
# Repete um comando até 3 vezes (espera de 20 s e 40 s; RETRY_WAIT_SECONDS muda a base) para falhas momentâneas da API da
# Cloudflare, como "unknown error [code: 10013]". Usado só em passos seguros de repetir:
# migrações do D1 (aplica apenas as pendentes), publicação do Worker e envio do segredo.
set -u
attempts=3
for i in $(seq 1 "$attempts"); do
  "$@" && exit 0
  status=$?
  if [ "$i" -lt "$attempts" ]; then
    wait=$((i * ${RETRY_WAIT_SECONDS:-20}))
    echo "Tentativa $i de $attempts falhou (código $status). Nova tentativa em ${wait}s..."
    sleep "$wait"
  fi
done
echo "Falhou nas $attempts tentativas."
exit "$status"
