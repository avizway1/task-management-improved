FROM node:18-alpine AS build

WORKDIR /app

# Copy dependency manifests first (layer-cache trick: only re-runs npm install
# when package.json / package-lock.json actually change)
COPY package*.json ./

# Install ALL dependencies needed to compile the React app.
# --legacy-peer-deps  → avoids peer-dep conflicts from recharts / d3 sub-packages
# --no-audit          → skip vulnerability scan (saves ~20 s per build in CI)
# --no-fund           → skip funding messages
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source after node_modules are installed (keeps the cache layer above valid)
COPY . .

# Compile React → static files land in /app/build
RUN npm run build

# ─── Production image: tiny nginx serving the compiled static files ───────────
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
