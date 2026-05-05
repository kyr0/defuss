# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.9 AS builder

WORKDIR /repo

COPY . .

RUN bun install --frozen-lockfile
RUN node ./packages/ssg/scripts/prepare-container-runtime.mjs

FROM node:24-trixie-slim

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
	&& apt-get install -y --no-install-recommends git \
	&& git config --global url."https://github.com/".insteadOf ssh://git@github.com/ \
	&& git config --global url."https://github.com/".insteadOf git@github.com: \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/bun /usr/local/bin/bun
RUN ln -sf /usr/local/bin/bun /usr/local/bin/bunx

COPY --from=builder /repo/packages/ssg/.container-runtime/ /app/

EXPOSE 3000

ENTRYPOINT ["node", "/app/dist/cli.mjs"]
CMD ["dev", "/workspace", "--host", "0.0.0.0", "--port", "3000"]
