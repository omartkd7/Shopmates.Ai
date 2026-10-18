#!/bin/sh
set -eu

echo "Running database migrations..."
./node_modules/.bin/sequelize-cli db:migrate \
  --env production \
  --config src/config/sequelize-cli.js \
  --migrations-path migrations

echo "Ensuring pgvector index..."
node dist/scripts/applyPgvectorSql.js

if [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  echo "Running idempotent demo seed..."
  node dist/seed.js
else
  echo "SEED_ADMIN_PASSWORD is not set; skipping optional demo seed."
fi

echo "Starting ShopMate API..."
exec node dist/server.js
