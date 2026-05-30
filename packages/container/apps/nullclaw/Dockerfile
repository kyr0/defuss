# syntax=docker/dockerfile:1.7

FROM --platform=$BUILDPLATFORM alpine:3.23 AS builder
RUN apk add --no-cache zig musl-dev
WORKDIR /src

COPY build.zig build.zig.zon ./
COPY src/ src/
COPY vendor/sqlite3/ vendor/sqlite3/

ARG VERSION=dev

RUN --mount=type=cache,target=/root/.cache/zig \
    --mount=type=cache,target=/src/.zig-cache \
    set -eux; \
    zig build \
      -Dtarget=x86_64-linux-musl \
      -Doptimize=ReleaseSmall \
      -Dversion="${VERSION}" \
      -Dstatic=true \
      -Dengines=base,sqlite

FROM scratch AS artifact
COPY --from=builder /src/zig-out/bin/nullclaw /nullclaw
