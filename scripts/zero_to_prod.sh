#!/usr/bin/env bash
set -euo pipefail

MIGRATION_FILE="db/migrations/0000_initial.sql"
SEED_SCRIPT="db/seed.ts"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "✖ Missing required command: $1" >&2
    exit 1
  fi
}

load_env() {
  if [[ -f .env ]]; then
    # shellcheck source=/dev/null
    set -a && source .env && set +a
  fi
}

parse_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    node - <<'NODE'
      const url = new URL(process.env.DATABASE_URL);
      if (url.protocol !== 'mysql:') {
        console.error('✖ DATABASE_URL must use mysql://');
        process.exit(1);
      }
      const out = {
        host: url.hostname || 'localhost',
        port: url.port || '3306',
        user: url.username || 'root',
        password: url.password || '',
        database: url.pathname.replace(/^\//, '') || '',
      };
      if (!out.database) {
        console.error('✖ DATABASE_URL missing database name');
        process.exit(1);
      }
      console.log(`${out.host}:${out.port}:${out.user}:${out.password}:${out.database}`);
NODE
    return
  fi

  if [[ -z "${DB_HOST:-}" || -z "${DB_USER:-}" || -z "${DB_NAME:-}" ]]; then
    echo "✖ DATABASE_URL not set and DB_HOST/DB_USER/DB_NAME missing. Update .env" >&2
    exit 1
  fi

  local host="${DB_HOST:-localhost}"
  local port="${DB_PORT:-3306}"
  local user="${DB_USER}"
  local pass="${DB_PASSWORD:-}"
  local name="${DB_NAME}"
  echo "${host}:${port}:${user}:${pass}:${name}"
}

apply_migration() {
  require_cmd mysql
  IFS=":" read -r DB_HOST DB_PORT DB_USER DB_PASS DB_NAME <<<"$(parse_database_url)"
  export MYSQL_PWD="$DB_PASS"
  echo "→ Applying migration ${MIGRATION_FILE} to ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  mysql --protocol=TCP -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < "$MIGRATION_FILE"
  echo "✓ Migration applied"
}

run_seed() {
  require_cmd npx
  echo "→ Running seed (${SEED_SCRIPT})"
  npx tsx "$SEED_SCRIPT"
  echo "✓ Seed completed"
}

run_lint_build() {
  require_cmd npm
  echo "→ npm run lint"
  npm run lint
  echo "→ npm run build"
  npm run build
  echo "✓ Lint/build complete"
}

menu() {
  echo "Zero-to-Production Menu"
  echo "1) Apply migration"
  echo "2) Seed sample data"
  echo "3) Lint + Build"
  echo "4) Exit"
  printf "Choose an option: "
}

while true; do
  load_env
  menu
  read -r choice
  case "$choice" in
    1) apply_migration ;;
    2) run_seed ;;
    3) run_lint_build ;;
    4) echo "Bye"; exit 0 ;;
    *) echo "Invalid choice";;
  esac
  echo
done
