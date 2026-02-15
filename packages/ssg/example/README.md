# Example `defuss-ssg` project

This is an example project using `defuss-ssg` to build a static site from MDX files. You can build and serve it simply by downloading/copying this folder *somewhere* and then run either:

```bash
npx defuss-ssg build .    # build the site in ./dist
npx defuss-ssg serve .    # serve the site at http://localhost:3000 with auto-rebuild on changes
```

Or, in case you are a developer of `defuss-ssg`, clone the whole repo, install dependencies and run the example from the `packages/ssg` folder:

```bash

git clone
cd defuss/packages/ssg
bun i && bun build

bun run cli-build ./example   # build the example site in ./example/dist
bun run cli-serve ./example   # serve the example site at http://localhost:3000 with auto-rebuild on changes
```

The output is generated in the `dist/` folder, except you change the configuration in `config.ts`.