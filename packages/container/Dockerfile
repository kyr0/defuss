# syntax=docker/dockerfile:1.7

FROM busybox:1.37-musl AS rootfs

COPY .cache/payload-bun/bin/bun /out/bin/bun

RUN set -eux; \
  mkdir -p /out/bin /out/root /out/tmp; \
  cp /bin/busybox /out/bin/busybox; \
  chmod +x /out/bin/bun; \
  for applet in \
    sh ls cat echo pwd env mkdir rm cp mv find grep sed tar head tail \
    touch printf which uname true false wc xargs sort cut; do \
      ln -s busybox "/out/bin/${applet}"; \
  done

FROM scratch
COPY --from=rootfs /out/ /
ENV PATH=/bin \
    HOME=/root
WORKDIR /root
ENTRYPOINT ["/bin/sh"]
CMD ["-i"]
