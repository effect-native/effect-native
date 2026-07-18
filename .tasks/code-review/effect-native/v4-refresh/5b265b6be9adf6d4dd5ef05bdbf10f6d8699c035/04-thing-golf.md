# Thing Golf

## Thing: Effect beta-family lock resolution

`MODIFY`: resolve the existing Effect beta dependency family at beta.99.

| Axis                    | Score | Evidence                                                           |
| ----------------------- | ----: | ------------------------------------------------------------------ |
| Safety / Explosiveness  |     1 | Runtime dependencies move, but the full CI-equivalent gate passes. |
| Lightness / Burden      |     0 | No dependency declaration or public surface is added.              |
| Clarity / Chaos         |    -1 | One coherent family replaces the stale beta.97 resolution.         |
| Trustworthy / Betraying |    -1 | DotOK and executable gate evidence make health explicit.           |
| Freedom / Control-Freak |     0 | No new configuration, approval, or coupling is introduced.         |

**ThingBadness: -1.** The refresh reduces stale-version and misleading-health
liability without adding a maintained surface.
