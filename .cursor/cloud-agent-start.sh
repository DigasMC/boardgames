#!/usr/bin/env bash
set -euo pipefail

[ ! -d '/agent/repos/boardgames' ] || cd '/agent/repos/boardgames' || exit $?

set_bridge_sysctl() {
  sudo sysctl -w net.bridge.bridge-nf-call-iptables=0 >/dev/null 2>&1 || true
  sudo sysctl -w net.bridge.bridge-nf-call-ip6tables=0 >/dev/null 2>&1 || true
}

set_bridge_sysctl

if ! docker info >/dev/null 2>&1; then
  if [ -S /var/run/docker.sock ]; then
    sudo chmod 666 /var/run/docker.sock || true
  fi
fi

if ! docker info >/dev/null 2>&1; then
  sudo dockerd --host=unix:///var/run/docker.sock --iptables=true --storage-driver=overlay2 >/tmp/dockerd.log 2>&1 &
  ready=0
  for _ in $(seq 1 90); do
    if [ -S /var/run/docker.sock ]; then
      sudo chmod 666 /var/run/docker.sock || true
    fi
    if docker info >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [ "$ready" -ne 1 ]; then
    echo "dockerd did not become ready" >&2
    exit 1
  fi
fi

set_bridge_sysctl

supabase_ready=0
for _ in $(seq 1 12); do
  if npx supabase start >/tmp/supabase-start.out 2>&1; then
    supabase_ready=1
    break
  fi
  if npx supabase status -o env >/tmp/supabase-status.env 2>/dev/null && grep -q '^API_URL=' /tmp/supabase-status.env; then
    supabase_ready=1
    break
  fi
  sleep 5
done
if [ "$supabase_ready" -ne 1 ]; then
  cat /tmp/supabase-start.out >&2
  exit 1
fi

status_env="$(npx supabase status -o env)"
api_url="$(printf '%s\n' "$status_env" | sed -n 's/^API_URL=//p' | tr -d '"')"
anon_key="$(printf '%s\n' "$status_env" | sed -n 's/^ANON_KEY=//p' | tr -d '"')"
service_key="$(printf '%s\n' "$status_env" | sed -n 's/^SERVICE_ROLE_KEY=//p' | tr -d '"')"
if [ -z "$api_url" ] || [ -z "$anon_key" ] || [ -z "$service_key" ]; then
  echo "supabase status did not return API credentials" >&2
  exit 1
fi

umask 077
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=${api_url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon_key}
SUPABASE_SERVICE_ROLE_KEY=${service_key}
BGG_API_KEY=${BGG_API_KEY:-}
EOF

export NEXT_TELEMETRY_DISABLED=1
if curl -sf -o /dev/null --max-time 3 http://127.0.0.1:3000/; then
  exit 0
fi

exec npm run dev -- --hostname 0.0.0.0 --port 3000
