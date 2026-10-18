#!/bin/sh
set -eu

echo "Running database migrations..."
./node_modules/.bin/sequelize-cli db:migrate \
  --env production \
  --config src/config/sequelize-cli.js \
  --migrations-path migrations

echo "Ensuring pgvector index..."
node dist/scripts/applyPgvectorSql.js

echo "Starting ShopMate API..."
exec node dist/server.js
