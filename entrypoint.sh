#!/usr/bin/env sh
set -eu

if [ -z "${JELLYFIN_URL:-}" ]; then
  echo "Attention: JELLYFIN_URL is not defined"
else
  echo "JELLYFIN_URL runtime configuration enabled"
fi

envsubst '${TMDB_API_KEY}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

escaped_jellyfin_url=$(printf '%s' "${JELLYFIN_URL:-}" | sed 's/[&|\\]/\\&/g')
sed -i "s|__JELLYFIN_URL__|${escaped_jellyfin_url}|g" /usr/share/nginx/html/index.html

exec "$@"
