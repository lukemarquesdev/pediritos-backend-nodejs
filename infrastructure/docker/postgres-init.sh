#!/bin/sh
set -eu

for database in pediritos_auth pediritos_catalog pediritos_orders pediritos_payments pediritos_stock pediritos_notifications; do
  createdb --username "$POSTGRES_USER" "$database"
done
