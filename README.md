# Pi Local Model Options Extensions

Collection of Pi extensions for local model/provider options.

## Packages

| Extension                                                                        | What it adds                                             | Install                                                  |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| [`@mohammedhammoud/pi-local-model-options`](./extensions/pi-local-model-options) | `/local` command for per-model local generation options. | `pi install npm:@mohammedhammoud/pi-local-model-options` |

## Quick start

Install from npm:

```bash
pi install npm:@mohammedhammoud/pi-local-model-options
```

Install the collection from GitHub:

```bash
pi install git:github.com/mohammedhammoud/pi-extensions
```

Pin a release tag:

```bash
pi install git:github.com/mohammedhammoud/pi-extensions@v0.1.0
```

Try locally:

```bash
pi -e ./extensions/pi-local-model-options
```

## Development

```bash
npm install
npm run check
npm run build
npm run pack:local-model-options
npm run publish:local-model-options
```

## Release

Release Please opens release PRs from Conventional Commits on `main`.
Publishing to npm runs when a GitHub release is published and needs `NPM_TOKEN` in repo secrets.

## Structure

```text
extensions/
└── pi-local-model-options/
    ├── src/
    ├── package.json
    ├── README.md
    └── tsconfig.json
```

## License

MIT. See [LICENSE](./LICENSE).
