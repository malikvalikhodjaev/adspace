#!/usr/bin/env bash
set -Eeuo pipefail
root=/home/malik/apps/adspace
release="$(realpath "${1:?Pass release directory}")"
case "$release" in "$root"/releases/*) ;; *) echo 'Unexpected release path' >&2; exit 1;; esac
test -f "$release/dist/standalone/server.js"
test -x /home/malik/apps/eventhub-uz/runtime/node/bin/node
test -x "$root/runtime/media/node_modules/ffmpeg-static/ffmpeg"
test -x "$root/runtime/media/node_modules/ffprobe-static/bin/linux/x64/ffprobe"
mkdir -p "$root/data" "$root/backups" /home/malik/.config/systemd/user
chmod 700 "$root/data" "$root/backups"
previous="$(readlink -f "$root/current" || true)"
config=/home/malik/.cloudflared/config.yml
backup="$root/backups/cloudflared-$(date +%Y%m%d-%H%M%S).yml"
cp "$config" "$backup"
route_changed=0
rollback() {
  trap - ERR
  cp "$backup" "$config"
  if [[ -n "$previous" && "$previous" != "$root/current" ]]; then
    ln -sfn "$previous" "$root/current"
    if [[ -f "$previous/deploy/adspace.service" ]]; then
      install -m 644 "$previous/deploy/adspace.service" /home/malik/.config/systemd/user/adspace.service
      systemctl --user daemon-reload
    fi
    systemctl --user restart adspace.service || true
  else
    systemctl --user stop adspace.service || true
  fi
  if [[ "$route_changed" -eq 1 ]]; then
    cloudflared tunnel --config "$config" ingress validate >/dev/null && systemctl --user restart cloudflared.service
  fi
  echo 'Publication failed; prior routing restored.' >&2
  exit 1
}
trap rollback ERR
ln -sfn "$release" "$root/current"
install -m 644 "$release/deploy/adspace.service" /home/malik/.config/systemd/user/adspace.service
systemctl --user daemon-reload
systemctl --user enable --now adspace.service
systemctl --user restart adspace.service
healthy=0
for attempt in {1..20}; do
  if curl -fsS http://127.0.0.1:3002/api/workspace >/dev/null; then healthy=1; break; fi
  sleep 1
done
test "$healthy" -eq 1
ADSPACE_DATA_DIR="$root/data" APP_URL=https://maydonlar.fom-analytics.uz /home/malik/apps/eventhub-uz/runtime/node/bin/node "$release/scripts/bootstrap-admin.mjs"
if ! grep -Fq 'hostname: maydonlar.fom-analytics.uz' "$config"; then
  route_changed=1
  python3 "$release/deploy/add-route.py" "$config"
fi
cloudflared tunnel --config "$config" ingress validate
if [[ "$route_changed" -eq 1 ]]; then
  cloudflared tunnel route dns 08ddeab2-0062-4eaf-9452-3d3b45643fad maydonlar.fom-analytics.uz
  systemctl --user restart cloudflared.service
fi
healthy=0
for attempt in {1..20}; do
  if curl -fsS --max-time 8 --doh-url https://cloudflare-dns.com/dns-query https://maydonlar.fom-analytics.uz/api/health; then healthy=1; break; fi
  sleep 2
done
test "$healthy" -eq 1
curl -fsS --max-time 15 https://marosim.fom-analytics.uz/api/health
dashboard_status="$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' https://fom-analytics.uz/admin)"
[[ "$dashboard_status" == 200 || "$dashboard_status" == 401 ]]
trap - ERR
echo 'Maydonlar is live. Marosim and dashboards are healthy.'
