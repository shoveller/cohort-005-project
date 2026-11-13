# Hosted in-app notification providers for Cadence

Research for [#20](https://github.com/shoveller/cohort-005-project/issues/20), part of map [#19](https://github.com/shoveller/cohort-005-project/issues/19). Researched 2026-11-14. Pricing pages change often, so recheck the free-tier numbers before committing.

**Question:** Which hosted in-app notification services (Knock, Novu Cloud, Courier, MagicBell, SuprSend) fit Cadence? Constraints: free tier only, hosted SaaS only, React Router framework mode with SSR, SQLite/Drizzle, TypeScript, English-only, and identity that comes from the DevUI user switcher.

## Cadence facts that shape the answer

- Rendering is SSR. `react-router.config.ts` sets `ssr: true`. Note that `package.json` pins `react-router`/`@react-router/*` **8.3.0**, not v7. The framework-mode SSR model is the same either way.
- Identity comes from a cookie session. `app/lib/session.ts` stores a numeric `userId` in a `createCookieSessionStorage` cookie (`cadence_session`), and the DevUI panel (`app/components/dev-ui.tsx`) only changes that value. There is no login and no password, but the **server always knows the current `userId`** in every loader.
- Email already exists. `app/lib/mailer.server.ts` sends through Postmark, or writes to `.outbox/` when no token is set.

## Comparison

| | Knock | Novu Cloud | Courier | MagicBell | SuprSend |
|---|---|---|---|---|---|
| **Free tier** | Developer: 10,000 messages/mo, unlimited feeds and feed retention, unlimited channels, 30-day logs. No hard cap: Knock contacts you about billing [1] | Free: 10,000 workflow runs/mo, **up to 5 workflows**, unlimited subscribers, 24 h activity-feed retention, 3 team members [2] | Developer: 10,000 sends/mo. One template across several channels = one send. The page does not say whether Inbox is in the free plan [3] | Builder: **1,000 deliveries/mo**, counted per channel, 1 project. Overage is billed per use [4] | Free: 10,000 notifications/mo, unlimited channels. In-app feed has SuprSend branding. No digest/batching, preferences or i18n on Free. No hard cap [5] |
| **Prebuilt React feed** | `@knocklabs/react`: `NotificationIconButton`, `NotificationFeedPopover`, `NotificationFeed`, plus a CSS file [6][7] | `@novu/react`: `<Inbox />` [8][9] | `@trycourier/courier-react`: `<CourierInbox />`, `<CourierInboxPopupMenu />`, `<CourierToast />`, `<CourierPreferences />` [10] | `@magicbell/react`: `Inbox`, `FloatingInbox`, `ToastContainer`, `UserPreferences`, … [11] | `@suprsend/react`: drop-in Inbox [12] |
| **Headless option** | Hooks in `@knocklabs/react(-core)`, plus `@knocklabs/client` [6] | `@novu/react` hooks, or framework-agnostic `@novu/js` [8] | `useCourier()` hook, which drives the same client [10] | The React docs page mentions no hooks. `magicbell-js` client exists [11][13] | Headless hooks [12] |
| **Node server SDK (trigger)** | `@knocklabs/node`: `client.workflows.trigger(key, { recipients, data })` [14] | `@novu/api`: `novu.trigger({ workflowId, to: { subscriberId }, payload })` [15] | `@trycourier/courier` (npm) [13] | `magicbell-js` (npm) [13] | `@suprsend/node-sdk`: `workflows.trigger(new WorkflowTriggerRequest(...))` [16] |
| **React peer / SSR** | React 17–19. `next` and `@tanstack/react-router` are *optional* peers [13]. Docs give no SSR guidance [6][7] | React 18–19 [13]. Docs give no SSR guidance [8][9] | React ≥18. Docs say it renders **client-side only** (`'use client'` in Next) [10] | Docs give no SSR guidance [11] | React ≥16.8 [13]. Uses Emotion for styles [13] |
| **Real-time transport** | WebSocket (Phoenix channels: `@knocklabs/client` depends on `phoenix`). Sockets auto-disconnect in idle tabs [7][13] | WebSocket (`@novu/js` depends on `socket.io-client`/`partysocket`) [13] | WebSocket via `inbox.listenForUpdates()` [10] | WebSocket (`@magicbell/react` depends on `reconnecting-websocket`) [13] | WebSocket (`@suprsend/web-sdk` depends on `socket.io-client`) [13] |
| **Feed auth** | Public API key + user id. Optional **enhanced security mode** requires an RS256 JWT (`sub` = user id) signed with `signUserToken` from `@knocklabs/node`. Off by default; docs advise keeping it off in dev [17] | `applicationIdentifier` + `subscriberId`. Optional per-environment **HMAC**: `subscriberHash = HMAC-SHA256(secretKey, subscriberId)` [18] | **Always a JWT**: the backend calls `POST /auth/issue-token` with scopes `user_id:<id> inbox:read:messages inbox:write:events`, and the client calls `signIn({ userId, jwt })`. The SDK does not refresh tokens [19] | **Always a JWT**: HS256 signed with the project Secret Key. Claims are `user_external_id` and/or `user_email`, plus `api_key` [20] | Public key. Optional **enhanced security mode** requires an ES256 JWT (`entity_type: subscriber`, `entity_id`, `exp`) [21] |
| **Email/push later** | Unlimited channels on Free. Same workflow fans out to email/push/SMS/chat [1] | All channels on Free [2] | Multichannel routing. Inbox is one channel in the routing [3][22] | "All integrations". Each channel delivery counts against the 1,000 [4] | Unlimited channels on Free [5] |

## How the DevUI user switcher fits each auth model

Every provider's secure mode works the same way. The **server** knows the user and signs something (an HMAC or a JWT). The **browser** passes that, together with the user id, to the feed component. Cadence already has this split. In the root loader (or a layout loader), `getCurrentUserId(request)` returns the switched-to user, and the loader can return `{ userId, feedToken }` with the token minted on the server with the provider's secret. When a user is switched in the DevUI, the cookie changes and the loaders re-run. The new token and user id then reach the feed, and the provider component should be keyed on `userId` so it remounts. The lack of real auth does not break any provider. It only means the signature protects nothing more than the cookie does. That is acceptable for a dev-only platform, but it is still worth turning on so that the integration matches production.

- **Knock and SuprSend** can run with secure mode *off*, using just the public key and the user id [17][21]. This is the simplest start, but anyone with the public key can read any user's feed.
- **Novu's** HMAC is a one-line `crypto.createHmac('sha256', secret).update(String(userId)).digest('hex')` in the loader [18].
- **Courier and MagicBell** have no "off" mode [19][20]. Courier needs a server-to-server call per token; MagicBell is a local `jwt.sign`.
- Every provider keys users by a string id. Cadence's numeric `user.id` stringified (e.g. `"42"`) works as the Knock `recipient`/`user.id`, the Novu `subscriberId`, the Courier `user_id`, the MagicBell `user_external_id` and the SuprSend `distinct_id`. The seed users would need to be identified (upserted) with the provider, or auto-created on first trigger or inbox load, as Novu does [9].

## SSR in React Router framework mode

None of the five documents React Router framework mode. Courier explicitly says its components render client-side only [10], and every one opens a WebSocket in the browser. The practical pattern is the same for all of them:

- Render the bell or feed only after hydration, using a `useEffect`-gated "mounted" flag or `React.lazy` inside a client-only boundary.
- Keep the provider's secret and the token signing in a `*.server.ts` module that the loader calls.
- Do the triggering from actions or `*.server.ts` code with the Node SDK.

Knock declares `next` and `@tanstack/react-router` as *optional* peers, so it does not require Next [13]. SuprSend pulls in Emotion and MagicBell ships its own CSS-in-JS, which is extra styling weight alongside Cadence's Tailwind. Knock and Novu are the easiest to theme, through a CSS file and appearance props respectively [7][8]. This last point is my assessment and was not verified in a running app.

## Assessment

- **Knock** is the strongest fit. It has a 10k/mo free tier with unlimited feeds, retention and channels, and no hard cap. It has mature prebuilt components plus headless hooks, a typed Node SDK, and auth that can start off and later switch to `signUserToken` from the same SDK. Its React package does not depend on Next. Risks: it is a commercial product with no self-host escape hatch (self-hosting is out of scope anyway), and the docs do not cover SSR.
- **Novu Cloud** is a close second. It has 10k runs/mo, a polished `<Inbox />`, simple HMAC and an open-source core. The **5-workflow cap on Free** is the main risk, because the v1 Notification catalogue (event → recipient role) may need more than five event types unless several events share one workflow driven by payload. The 24 h activity retention applies to the debug activity feed, not to the user's inbox.
- **Courier** is viable. It has 10k sends/mo and a good React kit, but its pricing page does not confirm that Inbox is in the free tier [3]. Its auth is mandatory JWT with manual refresh, and Inbox is client-only.
- **SuprSend** is viable but weaker. It shows SuprSend branding in the feed on Free, has no preferences or digest on Free (per-user preferences is an open question on #19), and adds an Emotion dependency.
- **MagicBell** is the weakest fit. Its 1,000 deliveries/mo count per channel, which leaves little room once email or push is added.

**Recommendation for #21 (not a decision):** shortlist **Knock** (first) and **Novu Cloud** (second). The choice between them hinges on whether the v1 catalogue fits in 5 Novu workflows, and on preference for Knock's prebuilt feed versus Novu's `<Inbox />`. Both support a loader-minted token or hash keyed on the DevUI's `userId`.

## Sources

1. Knock pricing: https://knock.app/pricing
2. Novu pricing: https://novu.co/pricing
3. Courier pricing: https://www.courier.com/pricing
4. MagicBell pricing: https://www.magicbell.com/pricing
5. SuprSend pricing: https://www.suprsend.com/pricing
6. Knock React overview: https://docs.knock.app/in-app-ui/react/overview
7. Knock React feed setup: https://docs.knock.app/in-app-ui/react/feed
8. Novu Inbox overview: https://docs.novu.co/platform/inbox/overview
9. Novu React quickstart: https://docs.novu.co/platform/quickstart/react
10. Courier React SDK: https://www.courier.com/docs/sdk-libraries/courier-react-web
11. MagicBell React library: https://www.magicbell.com/docs/libraries/react
12. SuprSend React inbox: https://docs.suprsend.com/docs/inbox-react
13. npm registry metadata (`npm view <pkg> version peerDependencies peerDependenciesMeta dependencies`), checked 2026-11-14: `@knocklabs/react@0.15.1`, `@knocklabs/client@0.23.1`, `@knocklabs/node@1.41.1`, `@novu/react@3.19.2`, `@novu/js@3.19.2`, `@novu/api@3.19.1`, `@trycourier/courier-react@9.3.5`, `@trycourier/courier@10.0.0`, `@magicbell/react@1.14.0`, `magicbell-js@1.8.0`, `@suprsend/react@1.5.0`, `@suprsend/web-sdk@5.4.0`, `@suprsend/node-sdk@1.15.1`
14. knock-node README: https://github.com/knocklabs/knock-node
15. Novu TypeScript server SDK: https://docs.novu.co/platform/sdks/server/typescript
16. suprsend-node-sdk README: https://github.com/suprsend/suprsend-node-sdk
17. Knock in-app security and authentication: https://docs.knock.app/in-app-ui/security-and-authentication
18. Novu Inbox prepare for production (HMAC): https://docs.novu.co/platform/inbox/prepare-for-production
19. Courier Inbox authentication: https://www.courier.com/docs/platform/inbox/authentication
20. MagicBell user JWT: https://www.magicbell.com/docs/api/authentication/user
21. SuprSend client authentication: https://docs.suprsend.com/docs/client-authentication
22. Courier Inbox overview: https://www.courier.com/docs/platform/inbox/inbox-overview
