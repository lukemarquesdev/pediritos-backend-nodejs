#!/bin/sh
set -eu

for database in pediritos_auth pediritos_catalog pediritos_orders pediritos_payments pediritos_stock pediritos_notifications; do
  psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 \
    --command "SELECT 'CREATE DATABASE ' || quote_ident('$database') WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec"
done
