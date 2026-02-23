# effect-native

`effect-native` is the ultra extreme programming command-line interface for the Effect Native project. It shrinks every feedback loop so optimistic programmers see evidence immediately.

## Usage

```bash
npx effect-native --help
```

## Development

Run with host Bun by default:

```bash
bun install --frozen-lockfile
bun run build
bun --filter @effect-native/effect-native test
```

Use Nix when you want an isolated shell:

```bash
nix develop --command bun run build
```

## License

MIT
