FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=order-service...

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
RUN corepack enable
WORKDIR /workspace
COPY --from=build /workspace /workspace
EXPOSE 3000
CMD ["pnpm", "--filter", "order-service", "start:prod"]
