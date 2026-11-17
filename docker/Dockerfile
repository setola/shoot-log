# Node satisfies the resolved Vite/Vitest/PDF.js engines; glibc also supports
# Wrangler/workerd. Never reuse the old Alpine/host node_modules directory.
FROM node:24.11.1-bookworm-slim

# Fixed Debian snapshot controls ImageMagick and its transitive packages.
# Refresh deliberately for security updates, then re-run the validation suite.
RUN rm -f /etc/apt/sources.list.d/debian.sources \
    && printf '%s\n' \
      'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/20251118T000000Z bookworm main' \
      'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian-security/20251118T000000Z bookworm-security main' \
      > /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends imagemagick ca-certificates \
    && rm -rf /var/lib/apt/lists/*
