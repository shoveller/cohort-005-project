# 알림 서비스 후보 비교: Inbox + 이메일

[#35](https://github.com/shoveller/cohort-005-project/issues/35) 조사 노트입니다. 상위 지도는 [#34](https://github.com/shoveller/cohort-005-project/issues/34)입니다. 조사일은 2026-11-14이고, 요금 수치는 자주 바뀌므로 결정하기 전에 다시 확인해야 합니다.

같은 브랜치의 [`hosted-in-app-notification-providers.md`](hosted-in-app-notification-providers.md)(#20용)가 Inbox 쪽(피드 인증, SSR, 실시간 전송)을 이미 다룹니다. 이 노트는 그 내용을 반복하지 않고 #35가 더 묻는 것을 다룹니다. 이메일 발송, sandbox와 개발 환경, Node 트리거 SDK, 수신 설정과 unsubscribe, 사람 등록 방식, 테스트 fake 만들기 쉬운 정도입니다.

**질문:** Inbox와 이메일을 한 워크플로로 처리하는 서드파티 서비스 가운데 Cadence에 맞는 것은 무엇인가? 기준은 세 가지입니다. (1) 무료 요금제로 개발할 수 있다. (2) React Router 7(framework mode)에서 쓸 Inbox 컴포넌트나 피드 API가 있다. (3) 이메일 발송이 포함되어 있거나 바로 연결된다.

## 답을 좌우하는 Cadence의 사실

- **버전:** `package.json`은 `react-router`/`@react-router/*` **8.3.0**을 고정합니다. 티켓에 적힌 7이 아닙니다. framework mode(SSR)의 모델은 같으므로 결론은 바뀌지 않습니다.
- **이메일이 이미 있습니다.** `app/lib/mailer.server.ts`는 `POSTMARK_SERVER_TOKEN`이 있으면 Postmark로 보내고, 없으면 `.outbox/`에 JSON 파일로 씁니다. `MailTransport` 인터페이스로 갈아 끼울 수 있게 되어 있습니다. 아래 후보는 모두 **Postmark를 provider로 연결**할 수 있습니다[K2][N2][C4]. 따라서 "이메일 발송 포함"이라는 기준은 사실상 "Cadence가 이미 쓰는 Postmark를 붙일 수 있는가"로 바뀝니다.
- **사람마다 이메일이 있습니다.** `users.email`은 `notNull().unique()`입니다(`app/db/schema.ts`). 서비스에 사람을 등록할 때 이메일 주소의 출처는 이 컬럼입니다.

## 후보 비교

| | Knock | Novu Cloud | Courier | MagicBell |
|---|---|---|---|---|
| **무료 요금제** | Developer: 월 10,000 메시지. 환경 무제한, 채널 무제한, 워크플로 무제한, 로그 30일. hard cap 없음(초과하면 연락이 옴). 유료 Starter는 월 $250부터 [K1] | Free: 월 10,000 workflow run, **워크플로 최대 5개**, 환경 2개(Dev/Prod), 팀원 3명, activity feed 보존 24시간. 유료 Pro는 월 $30부터 [N1] | Developer: 월 10,000 send. Test 환경 send도 같은 한도에 포함됨. 요금 페이지에 Inbox가 무료에 포함되는지는 나오지 않음 [C1] | Builder: **월 1,000 delivery**(채널별로 셈), 프로젝트 1개. 유료 Startup은 월 $249부터 [M1] |
| **Inbox (React)** | `@knocklabs/react`: `NotificationIconButton`, `NotificationFeedPopover`, `NotificationFeed` [K3] | `@novu/react` `<Inbox />`. **Preferences 화면이 내장**됨. 탭, 필터, 스누즈 [N3] | `@trycourier/courier-react` `CourierInbox`. 읽음과 보관 동기화 [C2] | `@magicbell/react` `Inbox`, `FloatingInbox`. User JWT 필요 [M3] |
| **이메일** | 직접 보내지 않고 provider로 보냄. Postmark, Resend, SES, SendGrid, SMTP 등 [K2] | provider로 보냄. Postmark, Resend, SES, SendGrid, SMTP 등 [N2] | 직접 보내지 않음. SES, SendGrid, Postmark, Resend 등을 연결 [C4] | provider로 보냄. Mailgun, SES, SendGrid, Ping Email, SMTP. **Postmark 전용 연동은 목록에 없음**(SMTP로는 가능) [M2] |
| **내장 테스트 이메일** | "Knock (testing only)" provider. 모든 환경에서 기본으로 켜져 있음. 월 100통, **Knock 계정 멤버의 주소로만** 보냄(그 밖의 주소는 `knock_recipient_not_allowed`) [K4]. 이메일 단계마다 **sandbox mode**가 있어서 실제로 보내지 않고 테스트할 수 있음 [K2] | demo email integration. 월 300통, 로그인한 계정 주소로만 보냄, Cloud에서만 동작 [N4] | Test 환경에 내장 provider가 있음. 가입한 주소로만 보냄 [C3] | 문서에 언급 없음 [M2] |
| **개발 환경** | Development와 Production. 환경마다 API key가 따로 있음. dev에서 commit한 뒤 prod로 promote [K5] | Development와 Production. 환경마다 Application Identifier와 Secret Key가 따로 있음. dev에서 publish하고, prod는 읽기 전용. 그 밖의 환경은 유료 [N5] | Production과 Test. 키가 환경에 묶임. provider 자격증명은 환경마다 설정. Mock key(provider를 부르지 않음)는 **Enterprise 전용** [C3] | 문서 개요에 환경이나 sandbox 언급 없음 [M4] |
| **Node 트리거 SDK** | `@knocklabs/node`: `client.workflows.trigger(key, { recipients, data })`. Stainless로 생성한 타입 SDK [K6] | `@novu/api`: `novu.trigger({ workflowId, to: { subscriberId, email }, payload })` [N6] | `@trycourier/courier` [C1] | `magicbell` (npm) [M4] |
| **수신 설정** | `PreferenceSet` = `workflows`/`categories`/`channel_types`/`channels`. 정하지 않은 값은 `true`. 환경 기본값과 사용자 값을 합침. 워크플로마다 **"Override recipient preferences"**(끌 수 없는 종류, 예: Refund 결과) [K7] | 세 층: 워크플로 채널 기본값 → 구독자 전역 → 워크플로별 구독자 채널. **Critical workflow**는 Preferences에 나오지 않고 끌 수 없음 [N7] | Topic 기반 preference. **Required topic**은 끌 수 없음 [C5] | 문서 개요에 내용 없음 [M4] |
| **이메일 unsubscribe** | 한 번 클릭 unsubscribe 링크. 누르면 `commercial_subscribed=false`가 되고, 상업 메시지만 끊기며 transactional은 계속 감 [K7] | Preferences 문서에 이메일 unsubscribe 언급 없음(미확인) [N7] | one-click unsubscribe 헤더를 topic마다 켬. 단 **자동으로 붙이는 provider는 SendGrid뿐**이고 Postmark에서는 직접 넣어야 함 [C5] | 언급 없음 [M2] |
| **사람 등록 방식** | `id`만 필수. `email`은 이메일 채널에만 필요. identify API로 미리 등록하거나, **트리거할 때 inline identify** [K8] | `subscriberId`(Cadence user id 권장). **트리거할 때 없으면 자동 생성, 있으면 갱신.** Inbox 첫 세션에서도 생성됨 [N8][N3] | 프로필에 email이 있어야 함. user id로 보내야 preference가 적용됨. 주소로 바로 보내면 preference를 건너뜀 [C5] | email 또는 external id. external id는 한 번 정하면 바꿀 수 없음. upsert [M5] |
| **테스트 fake가 쉬운가** | 생성형 SDK가 **`fetch` 주입**을 받음(`new Knock({ fetch })`) [K6]. 트리거 한 함수 뒤에 숨기면 fake가 쉬움 | `serverURL`과 `httpClient`(hook)를 주입할 수 있음 [N6]. 오픈소스라 self-host도 되지만 demo email은 self-host에서 동작하지 않음 [N4] | Mock key가 Enterprise 전용 [C3] | 근거 부족 |

## 판단

이 판단은 제 평가입니다. 실제 앱에서 돌려 보며 검증하지는 않았습니다.

- **"이메일 포함"을 그대로 만족하는 후보는 없습니다.** 넷 모두 실제 사용자에게 보내려면 provider가 필요하고, 내장 테스트 이메일은 계정 주인 주소로만 갑니다. 그래서 **DevUI 시드 사용자(Student, Instructor 등)의 주소로는 내장 provider가 메일을 보내지 못합니다.** 개발에서 이메일을 확인하는 길은 셋입니다. Knock의 **sandbox mode**(보내지 않고 메시지 기록만 남김), Postmark 개발용 토큰 연결, 또는 Mailtrap/SMTP 같은 캡처형 provider입니다. Cadence에는 이미 Postmark가 있으므로 같은 provider를 서비스에 붙이는 것이 가장 짧은 길입니다.
- **Knock**은 기준을 모두 충족하고, #34의 "Not yet specified" 항목에 가장 직접 답합니다.
  - 끌 수 없는 종류는 워크플로 override로 처리합니다.
  - 종류별·채널별 끄기는 `categories`/`channel_types`로 처리합니다.
  - unsubscribe 링크가 있습니다.
  - inline identify를 쓰면 등록 시점을 따로 정하지 않아도 됩니다.
  - 무료 요금제에 워크플로 개수 제한이 없습니다.
  - fetch 주입 SDK라 fake를 만들기 쉽습니다.

  약점도 있습니다. 내장 Preferences UI가 없어서(문서에서 확인하지 못함) 수신 설정 화면을 직접 만들어야 할 수 있습니다. 그리고 유료로 넘어가면 월 $250부터입니다.
- **Novu Cloud**는 `<Inbox />` 안에 Preferences 화면이 있고, critical workflow가 있고, 트리거 시 자동 생성되며, 유료 진입가가 월 $30으로 낮습니다. 다만 **무료는 워크플로 5개**입니다. 역할 넷에 알림 종류가 여럿이면 금방 찹니다(payload로 갈라 쓰는 방법은 있습니다). 이메일 unsubscribe 지원은 문서에서 확인하지 못했습니다.
- **Courier**는 조건부로 쓸 수 있습니다. 무료 요금제에 Inbox가 있는지 요금 페이지가 말하지 않고, Inbox 인증은 늘 JWT입니다. Postmark를 쓰면 unsubscribe 헤더를 직접 넣어야 하고, Mock key는 Enterprise 전용입니다.
- **MagicBell**은 제외합니다. 채널별로 세는 월 1,000 delivery는 Inbox와 이메일 두 채널이면 절반이 됩니다. 문서에서 환경, 테스트 이메일, unsubscribe를 확인할 수 없었습니다.
- (참고) SuprSend는 #20 노트에서 다뤘습니다. 무료 요금제에 preferences와 digest가 없어서 이번 기준에서는 뺐습니다.

### 후보

1. **Knock**: 추천
2. **Novu Cloud**
3. **Courier**: 예비. 무료 요금제에 Inbox가 있는지 확인되면 후보가 됨

### 추천: Knock (결정은 아님. 결정은 이후 grilling 티켓에서)

이유:

1. 무료 요금제에 워크플로 제한이 없고 환경도 무제한입니다.
2. 수신 설정 모델이 #34의 미정 항목(종류·채널별 끄기, 끌 수 없는 종류, unsubscribe)에 문서로 직접 대응합니다.
3. 트리거할 때 inline identify를 쓸 수 있어 사람 등록 흐름이 단순합니다.
4. 이메일 단계의 sandbox mode 덕분에 `npm run dev`에서 시드 사용자에게 실제 메일을 보내지 않고 흐름을 확인할 수 있습니다.
5. Postmark를 그대로 붙일 수 있습니다.
6. `fetch`를 주입하는 SDK라서 트리거를 `notifier.server.ts` 같은 한 함수 뒤에 두면 `npm run test` fake를 만들기 쉽습니다.

**뒤집힐 수 있는 조건:** 수신 설정 화면을 직접 만드는 비용이 크다고 판단되고 알림 종류가 5개 이하로 묶이면 Novu가 낫습니다.

## 출처

- K1. Knock pricing: https://knock.app/pricing
- K2. Knock email integrations overview (provider 목록, sandbox mode, "Knock (testing only)"): https://docs.knock.app/integrations/email/overview
- K3. Knock React overview: https://docs.knock.app/in-app-ui/react/overview
- K4. Knock test email provider: https://docs.knock.app/integrations/email/knock-test
- K5. Knock environments: https://docs.knock.app/concepts/environments
- K6. knock-node README (`workflows.trigger`, custom `fetch`): https://github.com/knocklabs/knock-node
- K7. Knock preferences overview: https://docs.knock.app/preferences/overview
- K8. Knock users: https://docs.knock.app/concepts/users
- N1. Novu pricing: https://novu.co/pricing
- N2. Novu email integrations: https://docs.novu.co/platform/integrations/email
- N3. Novu Inbox overview: https://docs.novu.co/platform/inbox/overview
- N4. Novu demo integrations: https://docs.novu.co/platform/integrations/demo-integration
- N5. Novu environments: https://docs.novu.co/platform/concepts/environments
- N6. Novu TypeScript server SDK: https://docs.novu.co/platform/sdks/server/typescript
- N7. Novu preferences: https://docs.novu.co/platform/concepts/preferences
- N8. Novu subscribers: https://docs.novu.co/platform/concepts/subscribers
- C1. Courier pricing: https://www.courier.com/pricing
- C2. Courier Inbox overview: https://www.courier.com/docs/platform/inbox/inbox-overview
- C3. Courier workspaces and environments: https://courier.com/docs/platform/workspaces/environments-api-keys
- C4. Courier email providers: https://www.courier.com/docs/integrations/email/overview
- C5. Courier notification preferences / users: https://www.courier.com/docs/platform/preferences/intro, https://www.courier.com/docs/platform/users/users-overview
- M1. MagicBell pricing: https://www.magicbell.com/pricing
- M2. MagicBell email channel: https://www.magicbell.com/docs/channels/email
- M3. MagicBell React library: https://www.magicbell.com/docs/libraries/magicbell-react
- M4. MagicBell docs index: https://www.magicbell.com/docs
- M5. MagicBell user primitive: https://www.magicbell.com/docs/primitive/user
- npm registry 메타데이터(2026-11-14): `@knocklabs/node@1.41.1`, `@knocklabs/react@0.15.1`(`next`, `@tanstack/react-router`는 optional peer), `@novu/api@3.19.1`, `@novu/react@3.19.2`, `@trycourier/courier@10.0.0`, `@trycourier/courier-react@9.3.5`, `@magicbell/react@1.14.0`, `magicbell@4.5.1`
