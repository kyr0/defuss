# qjsx-musl

Builds musl-linked QuickJS artifacts inside Alpine and places them in `./dist`:

- `dist/qjs` — upstream QuickJS interpreter built from the QuickJS checkout pinned by `quickjs-x`
- `dist/qjsx` — QuickJS-x interpreter
- `dist/js` — `qjsx-node` renamed to `js`

## Requirements

- Docker

## Usage

```sh
make build
make smoke
```

Static build:

```sh
make build STATIC=1
```

## Notes

- `make build` clones `rmst/quickjs-x` with its pinned QuickJS submodule, builds `qjsx` and `qjsx-node`, then builds plain `qjs` from the same QuickJS source tree.
- `dist/js` is the runtime intended to be copied into a musl-based BusyBox image.
- `STATIC=0` is enough for `busybox:musl` because the musl loader is already present there.
- `STATIC=1` is the safer option if you want the binary to be maximally self-contained.
