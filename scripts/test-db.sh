#!/usr/bin/env bash
# Throwaway local Postgres for `pnpm test:rls`, when you are not running the Supabase local stack.
#   pnpm db:test:start   → prints the TEST_DATABASE_URL to export
#   pnpm db:test:stop
# Pointing TEST_DATABASE_URL at `supabase start`'s database (port 54322) works too; the test run
# creates and drops its own database either way.
set -euo pipefail

PORT="${TEST_PG_PORT:-54329}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/.pgdata"
BIN="$(pg_config --bindir 2>/dev/null || ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"

# initdb refuses to run as root; fall back to the postgres system user.
run() { if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi; }

case "${1:-}" in
  start)
    if [ ! -f "$DIR/PG_VERSION" ]; then
      mkdir -p "$DIR"
      [ "$(id -u)" = "0" ] && chown postgres "$DIR"
      run "$BIN/initdb" -D "$DIR" -U postgres --auth=trust >/dev/null
    fi
    run "$BIN/pg_ctl" -D "$DIR" -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -l "$DIR/log" -w start >/dev/null
    echo "TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:$PORT/postgres"
    ;;
  stop)
    run "$BIN/pg_ctl" -D "$DIR" -m fast stop
    ;;
  *)
    echo "usage: $0 start|stop" >&2
    exit 1
    ;;
esac
