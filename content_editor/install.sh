#!/bin/zsh
# Installs content_editor to /usr/local/bin so you can run it from anywhere.
LAUNCHER=/usr/local/bin/content_editor
SERVER="$(cd "$(dirname "$0")" && pwd)/server.js"
SITE="$(cd "$(dirname "$0")" && pwd)/../site"

sudo tee "$LAUNCHER" > /dev/null << EOF
#!/bin/zsh
SITE="$SITE"

# Start Astro dev server
(cd "\$SITE" && npm run dev) &
ASTRO_PID=\$!

# Start content editor server
node $SERVER &
EDITOR_PID=\$!

# Wait briefly then open the editor
sleep 1.5
open http://localhost:3131

# On exit, kill both
trap "kill \$ASTRO_PID \$EDITOR_PID 2>/dev/null" EXIT INT TERM
wait \$EDITOR_PID
EOF

sudo chmod +x "$LAUNCHER"
echo "Installed: $LAUNCHER"
echo "Run: content_editor"
