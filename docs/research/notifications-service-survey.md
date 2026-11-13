# In-app notification service survey for Cadence

Resolves [#11](https://github.com/shoveller/cohort-005-project/issues/11). Scope locked by [map #9](https://github.com/shoveller/cohort-005-project/issues/9): in-app channel only, Student recipients only, service must provide storage + delivery + a React bell-icon/popover UI widget (we don't build the UI).

## Summary

Four services were evaluated against the locked scope: **Novu**, **Knock**, **Courier**, and **MagicBell**. OneSignal and SuprSend were scanned but dropped (OneSignal is push-first, not an in-app inbox; SuprSend is lower-profile without the primary-source depth the others have). MagicBell is dropped because the only shipped React package is `@magicbell/react-headless` (hooks only, no built-in UI), which contradicts the "widget from the service" rule.

The recommendation is **Novu**.

## Comparison

| Axis | Novu (`@novu/react` 3.19.2) | Knock (`@knocklabs/react` 0.15.1) | Courier (`@trycourier/courier-react` 9.3.5) | MagicBell (`@magicbell/react-headless` 5.5.1) |
|---|---|---|---|---|
| License | ISC | MIT | MIT | Custom |
| UI shape | Single `<Inbox />` (bell + popover baked in) | `NotificationIconButton` + `NotificationFeedPopover` (composed) | `CourierInbox` wrapping framework-agnostic web components | **Headless only** — no UI, hooks |
| SSR story | Explicit `browser`/server exports in `package.json`, `"sideEffects": false` | Dedicated `./next` and `./tanstack` subpath exports; peer dep on `@tanstack/react-router` | Thin React wrapper over web components (custom elements) — needs client-only mount | N/A (no UI) |
| Identity model | `subscriberId` + `applicationIdentifier`; HMAC (`subscriberHash`) generated server-side with API key | `apiKey` + `user={id, …}` + optional `userToken`; HMAC via API key | `userId` + JWT from backend | N/A |
| Local dev | **Keyless mode**: `<Inbox />` with zero config, no signup | Free dev tier, requires account and API key | Free dev tier, requires account | N/A |
| Hosting | Hosted cloud OR self-host (open-source core) | **Hosted SaaS only** | Hosted SaaS only | Hosted SaaS only |
| Lock-in risk | Low (can self-host, open core) | Medium (SaaS only, but SDK is MIT) | Medium | N/A |
| Backend trigger | Node SDK or HTTP; `novu.trigger('<workflow>', {to, payload})` | Node SDK or HTTP; `knock.workflows.trigger(...)` | HTTP / SDK | N/A |
| Localization | Built-in `localization` prop on `<Inbox />` | Via CSS/component overrides | Via theme/content | N/A |
| Repo activity | Last commit `packages/react` 2026-11-05 | Last commit `packages/react` 2026-11-12 | Monorepo active (commits 2026-06+) | Active |
| React support | 18, 19 | 17, 18, 19 | 17 (separate pkg), 18+ | 18, 19 |

## Recommendation: Novu

1. **Keyless mode directly answers our "Not yet specified" local dev decision.** `<Inbox />` renders with zero configuration, so the prototype ticket (#12) and future integration work can proceed without any account provisioning. ([`@novu/react` README](https://github.com/novuhq/novu/blob/next/packages/react/README.md))
2. **Explicit server/browser split in `package.json` exports** plus `"sideEffects": false` make the SDK trivially safe for React Router v7's Vite SSR build — the client bundle gets `./dist/esm/index.js`, server builds get the `./server` entry, no Node-only globals leak to the browser. ([package.json](https://github.com/novuhq/novu/blob/next/packages/react/package.json))
3. **Open-source (ISC) with self-host option** lowers vendor lock-in risk versus Knock/Courier/MagicBell, which are hosted-only. Cadence starts on Novu's free cloud; migration path exists if that ever matters.
4. **Single `<Inbox />` component with popover built in** matches the tiny scope locked in Q6 (bell icon + popover only). No need to compose `IconButton` + `Popover` like Knock, and no need to wrap custom-element web components like Courier.
5. **Standard HMAC identity model** — generate `subscriberHash` in a React Router loader (server) using the Novu secret, pass it to the component via `useLoaderData`. Clean separation, no secret leakage.

Knock is a very close second and genuinely strong — the `./next` subpath + Radix-based components are higher-polish — but its hosted-only posture, the slightly more verbose composed API, and the lack of a keyless-dev story make Novu the better fit for a small course-platform codebase.

## Integration considerations for the next effort

- **Identity sync.** Cadence user ids (from `app/db/schema.ts`) become Novu `subscriberId`s. On first notification for a user, Novu auto-creates the subscriber; richer sync (email/name) is optional. HMAC enablement is a per-environment setting in Novu's dashboard — enable in prod, skip in local keyless.
- **SSR mounting.** `<Inbox />` is a client-only component (it opens a WebSocket). Under React Router v7 SSR, wrap it with a client-only pattern (e.g. `useEffect`-gated render or `<ClientOnly>` wrapper). Novu's export split means the import itself is SSR-safe, but the component needs to render client-side only.
- **Event emit.** From route actions, call Novu's Node SDK: `novu.trigger('<workflow-key>', { to: { subscriberId: userId }, payload })`. Which call sites fire which workflow is the output of ticket [#10](https://github.com/shoveller/cohort-005-project/issues/10). Workflows are defined in the Novu dashboard (or in code via Novu Framework), not inline.
- **Local dev policy.** Keyless mode supports the UI side. For emitting events in local dev, the two choices — real cloud dev-app vs no-op — are now informed by the fact that keyless-UI + real-trigger is awkward (keyless stores notifications in a Novu-side scratch app not tied to your account). Recommended: use a dedicated Novu "development" app in cloud, with its own `applicationIdentifier` committed to `.env.example`. Finalize in ticket after this one.
- **Styling.** `<Inbox />` ships CSS-in-JS with a `appearance` prop for theme overrides; the prototype ticket (#12) can produce the Cadence-flavored appearance config as part of its mock evaluation.

## Sources

Primary sources fetched during research (all read directly from GitHub, not from marketing pages):

- Knock React README — https://github.com/knocklabs/javascript/blob/main/packages/react/README.md
- Knock React `package.json` (exports, peerDeps) — https://github.com/knocklabs/javascript/blob/main/packages/react/package.json
- Novu React README — https://github.com/novuhq/novu/blob/next/packages/react/README.md
- Novu React `package.json` (exports, peerDeps) — https://github.com/novuhq/novu/blob/next/packages/react/package.json
- Courier web monorepo README — https://github.com/trycourier/courier-web/blob/main/README.md
- npm registry metadata for `@knocklabs/react`, `@novu/react`, `@trycourier/courier-react`, `@trycourier/react-inbox` (deprecated — replaced by courier-web monorepo), `@magicbell/react-headless`, `react-onesignal`, `@suprsend/react`
