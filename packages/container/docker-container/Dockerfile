FROM --platform=linux/riscv64 alpine:3.23.3 AS builder

ARG WITH_PYTHON=0
ARG WITH_JQ=0
ARG WITH_NODE=0
ARG NODE_VERSION=24.14.0

# Install base tools + conditionally jq and CPython.
RUN apk add --no-cache busybox-static ca-certificates binutils \
 && if [ "$WITH_JQ" = "1" ]; then apk add --no-cache jq; fi \
 && if [ "$WITH_PYTHON" = "1" ]; then apk add --no-cache python3; fi

# Build a minimal non-root shell rootfs for agentic execution.
RUN mkdir -p \
      /rootfs/bin \
      /rootfs/usr/bin \
      /rootfs/usr/local/bin \
      /rootfs/etc \
      /rootfs/etc/ssl/certs \
      /rootfs/lib \
      /rootfs/usr/lib \
      /rootfs/tmp \
 && cp /bin/busybox.static /rootfs/bin/busybox \
 && /rootfs/bin/busybox --install -s /rootfs/bin \
 && cd /rootfs/bin && for f in *; do [ -L "$f" ] && ln -sf busybox "$f"; done && cd / \
 && ln -sf /bin/busybox /rootfs/bin/sh \
 && ln -sf /bin/busybox /rootfs/bin/env \
 && ln -s /bin/env /rootfs/usr/bin/env \
 && ln -s /bin/sh /rootfs/usr/bin/sh \
 && cp /etc/ssl/certs/ca-certificates.crt /rootfs/etc/ssl/certs/ca-certificates.crt \
 && chmod 1777 /rootfs/tmp \
 && mkdir -p /rootfs/root

# Shell profile with common aliases.
RUN cat > /rootfs/etc/profile <<'PROFILE'
export ENV=/etc/profile
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias md='mkdir -p'
alias rd='rmdir'
alias h='history'
alias cls='clear'
PROFILE

# Copy the musl dynamic linker (needed by jq, python, node when present).
ARG WITH_JQ
ARG WITH_PYTHON
ARG WITH_NODE
RUN if [ "$WITH_JQ" = "1" ] || [ "$WITH_PYTHON" = "1" ] || [ "$WITH_NODE" = "1" ]; then \
      cp /lib/ld-musl-*.so.1 /rootfs/lib/; \
    fi

# ── jq (conditional on WITH_JQ=1) ──────────────────────────────────────

ARG WITH_JQ
RUN if [ "$WITH_JQ" = "1" ]; then \
      cp /usr/bin/jq /rootfs/usr/bin/ \
   && for lib in $(ldd /usr/bin/jq 2>/dev/null | awk '/=>/{print $3}'); do \
        dir=$(dirname "$lib"); \
        mkdir -p /rootfs"$dir"; \
        cp -n "$lib" /rootfs"$lib"; \
      done; \
    fi

# ── CPython (conditional on WITH_PYTHON=1) ─────────────────────────────

# Copy the CPython binary, shared libs, and trimmed stdlib.
ARG WITH_PYTHON
RUN if [ "$WITH_PYTHON" = "1" ]; then \
      PYVER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')") \
   && PYBIN=$(readlink -f /usr/bin/python3) \
   && cp "$PYBIN" /rootfs/usr/bin/python${PYVER} \
   && ln -s python${PYVER} /rootfs/usr/bin/python3 \
   && ln -s python${PYVER} /rootfs/usr/bin/python \
   && for lib in $(ldd "$PYBIN" | awk '/=>/{print $3}'); do \
        dir=$(dirname "$lib"); \
        mkdir -p /rootfs"$dir"; \
        cp "$lib" /rootfs"$lib"; \
      done \
   && cp -a /usr/lib/python${PYVER} /rootfs/usr/lib/python${PYVER} \
   && rm -rf \
        /rootfs/usr/lib/python${PYVER}/test \
        /rootfs/usr/lib/python${PYVER}/tests \
        /rootfs/usr/lib/python${PYVER}/idlelib \
        /rootfs/usr/lib/python${PYVER}/tkinter \
        /rootfs/usr/lib/python${PYVER}/turtle*.py \
        /rootfs/usr/lib/python${PYVER}/turtledemo \
        /rootfs/usr/lib/python${PYVER}/lib2to3 \
        /rootfs/usr/lib/python${PYVER}/ensurepip \
        /rootfs/usr/lib/python${PYVER}/unittest \
        /rootfs/usr/lib/python${PYVER}/pydoc_data \
        /rootfs/usr/lib/python${PYVER}/pydoc.py \
        /rootfs/usr/lib/python${PYVER}/doctest.py \
        /rootfs/usr/lib/python${PYVER}/config-* \
        /rootfs/usr/lib/python${PYVER}/venv \
        /rootfs/usr/lib/python${PYVER}/xmlrpc \
        /rootfs/usr/lib/python${PYVER}/wsgiref \
        /rootfs/usr/lib/python${PYVER}/ctypes \
        /rootfs/usr/lib/python${PYVER}/_pydecimal.py \
        /rootfs/usr/lib/python${PYVER}/pickletools.py \
        /rootfs/usr/lib/python${PYVER}/difflib.py \
        /rootfs/usr/lib/python${PYVER}/_pydatetime.py \
        /rootfs/usr/lib/python${PYVER}/_pyio.py \
   && DYNLOAD=/rootfs/usr/lib/python${PYVER}/lib-dynload \
   && rm -f \
        ${DYNLOAD}/_test* \
        ${DYNLOAD}/_xxtestfuzz* \
        ${DYNLOAD}/xxlimited* \
        ${DYNLOAD}/_codecs_jp* \
        ${DYNLOAD}/_codecs_cn* \
        ${DYNLOAD}/_codecs_hk* \
        ${DYNLOAD}/_codecs_kr* \
        ${DYNLOAD}/_codecs_tw* \
        ${DYNLOAD}/_codecs_iso2022* \
        ${DYNLOAD}/_multibytecodec* \
        ${DYNLOAD}/_curses* \
        ${DYNLOAD}/_sqlite3* \
        ${DYNLOAD}/_dbm* \
        ${DYNLOAD}/_crypt* \
        ${DYNLOAD}/audioop* \
        ${DYNLOAD}/spwd* \
        ${DYNLOAD}/_ctypes* \
        ${DYNLOAD}/_decimal* \
        ${DYNLOAD}/unicodedata* \
        ${DYNLOAD}/_lsprof* \
   && find /rootfs/usr/lib/python${PYVER} -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true \
   && find /rootfs/usr/lib/python${PYVER} -name '*.pyc' -delete 2>/dev/null || true; \
    fi

# ── Final strip ────────────────────────────────────────────────────────

# Strip debug symbols from all binaries and shared objects.
RUN find /rootfs -type f \( -name '*.so*' -o -path '*/bin/*' \) \
      -exec strip --strip-unneeded {} + 2>/dev/null || true

FROM --platform=linux/riscv64 scratch

COPY --from=builder /rootfs/ /

ENV PATH=/bin:/usr/bin:/usr/local/bin \
    HOME=/root \
    TMPDIR=/tmp \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt \
    PYTHONDONTWRITEBYTECODE=1 \
    ENV=/etc/profile

WORKDIR /root

CMD ["/bin/sh"]
