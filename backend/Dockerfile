# Build TypeScript with development dependencies kept out of the final image.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Install only production packages, including sequelize-cli for startup migrations.
FROM node:22-alpine AS production-dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Do not run the API process as root.
RUN addgroup -S shopmate && adduser -S shopmate -G shopmate

COPY --from=production-dependencies --chown=shopmate:shopmate /app/node_modules ./node_modules
COPY --from=build --chown=shopmate:shopmate /app/dist ./dist
COPY --chown=shopmate:shopmate package*.json ./
COPY --chown=shopmate:shopmate migrations ./migrations
COPY --chown=shopmate:shopmate sql ./sql
COPY --chown=shopmate:shopmate src/config/sequelize-cli.js ./src/config/sequelize-cli.js
COPY --chown=shopmate:shopmate docker-entrypoint.sh /usr/local/bin/shopmate-start
RUN chmod 755 /usr/local/bin/shopmate-start

USER shopmate
EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/shopmate-start"]
