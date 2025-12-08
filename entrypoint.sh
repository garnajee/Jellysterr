#!/usr/bin/env sh

if [ -z "$JELLYFIN_URL" ]; then
  echo "Attention: JELLYFIN_URL not definied"
else
  echo "Injection of JELLYFIN_URL: $JELLYFIN_URL"
fi

# placeholder replacement
sed -i "s|__JELLYFIN_URL__|$JELLYFIN_URL|g" /usr/share/nginx/html/index.html

exec "$@"

