# Cadence 앱 내 개인 알림함: Knock, Novu Cloud, MagicBell 조사

- 확인 날짜: **2026-11-13** (대화 기준일). 아래 가격과 문서는 이 조사에서 조회한 공개 자료의 스냅샷이며 견적·계약이 아니다.
- 연구 티켓: [Knock과 대안의 앱 내 알림 지원·무료 검증 조건 조사](https://github.com/shoveller/cohort-005-project/issues/5)
- 지도: [Cadence 앱 내 알림의 구현 경로 찾기](https://github.com/shoveller/cohort-005-project/issues/4)
- 코드 기준: `979e28535d8b0ddd32b7241e51423c9a381879ad`.
- 범위: Student·Instructor의 저장되는 개인 알림함, 데스크톱·모바일 웹, 무료 개발 검증. 서비스 선택과 화면 배치는 아직 사용자 결정이다.
- 수행: 공식 문서·가격·공식 SDK 소스 및 배포 메타데이터 조사. **가입, 키 조회, SDK 설치·실행, 실제 연결, 알림 발송은 수행하지 않았다.** 연구 커밋에는 이 문서만 포함한다.

## 1. 결론과 추천

**추천: Knock을 첫 연결 smoke 대상으로 유지하되 최종 서비스로 확정하지 않는다.** 개인 피드 저장, read/seen 분리, 실시간, React UI/headless, 사용자 JWT 경계가 공식 문서에 있고, 무료 월 10,000개 메시지와 무기한 피드 보존이 공개되어 있다. 다만 Starter의 월 기본료 $250, 무료 초과 시 hard cap이 없다는 정책, 정확한 React Router SSR 실행 결과를 사용자가 받아들일 수 있어야 한다. [K1–K6]

**Novu Cloud는 유료 진입비가 낮은 대안**이다. 무료 10,000 workflow runs, Pro $30부터이며, React 19 지원과 SSR용 export가 확인된다. 대신 무료 Inbox는 30일 보존이고, 멱등성 기능은 모든 조직에 기본 활성화되어 있지 않다. 이 두 조건이 선택을 가를 수 있다. [N1–N7,N10]

**MagicBell은 Inbox 중심의 대안**이다. 현행 React SDK와 API v2가 사용자 JWT·저장 알림·실시간·읽음 상태를 제공한다. 그러나 무료 1,000 deliveries, 공개 자료에서 확정하지 못한 보존 기간·Builder 초과 단가, React 19/SSR 호환 근거의 부족 때문에 현재는 Knock보다 먼저 선택할 근거가 약하다. 미확인은 미지원 판정이 아니다. [M1–M8]

이 문서의 **사실**은 출처가 확인된 제품·코드 내용이다. **추천/설계 제안**은 Cadence에 적용하기 위한 판단이며 구현된 사실이나 사용자 확정으로 취급하지 않는다.

## 2. Cadence에서 확인한 전제

| 사실 | 코드 근거 — 위 기준 커밋의 경로 |
| --- | --- |
| React `^19.2.7`, React DOM `^19.2.7`, React Router/Node/Serve `8.3.0`, ESM, SQLite·Drizzle. 알림 서비스 SDK 없음 | `package.json:23–45`; Node 실행 버전은 이 선언만으로 확정할 수 없음 |
| SSR 활성화 | `react-router.config.ts:3–12`, `ssr: true` |
| DevUI는 사용자 전환 POST 후 쿠키 세션을 변경 | `app/components/dev-ui.tsx:109–129`, `app/routes/api.switch-user.ts:7–23`, `app/lib/session.ts:17–31` |
| 질문은 최상위 comment, 답변은 parentId가 있는 child comment. 댓글 INSERT 경로가 두 개 | `app/routes/instructor.questions.tsx:118–156`, `app/routes/courses.$slug.lessons.$lessonId.tsx:404–434` |
| Refund Request 승인·거절은 실제 트랜잭션. 승인과 실제 지급 확인은 같은 사건이 아님 | `app/lib/refunds.server.ts:614–733`; `GLOSSARY.md:61–90` |
| 레슨 생성은 제목과 빈 콘텐츠·영상으로 호출됨. INSERT를 공개 사건으로 볼 수 없음 | `app/routes/instructor.$courseId.tsx:265–292,762` |

로컬 근거의 [고정 커밋 트리](https://github.com/shoveller/cohort-005-project/tree/979e28535d8b0ddd32b7241e51423c9a381879ad). 지급 성공/실패를 확인하는 경로가 있다는 근거는 이번 조사에서 찾지 못했고, 제공된 도메인 조사도 그 경로가 없다고 명시한다. 따라서 `Refund Issued/Failed` 알림을 현재 발행 가능한 사건으로 제안하지 않는다.

**설계 제안:** 댓글 두 쓰기 경로가 동일한 사건 식별 규칙을 사용하도록 후속 구현 범위를 정한다. 질문/답변의 정확한 수신자, 자기 알림 제외, 구매 소식 포함 여부는 별도 결정이다. Refund Request 결정 알림은 본인 Student를 수신 후보로 삼을 수 있지만 Platform Admin 업무용 알림을 MVP에 추가하는 뜻은 아니다.

## 3. 후보 비교: 제품이 소유하는 상태와 UI

| 항목 | Knock | Novu Cloud | MagicBell |
| --- | --- | --- | --- |
| 저장·조회 | 서버 Feed API가 사용자별 FeedItem 제공. 로그 보존 만료 후에도 조회 가능 [K2] | 서버가 Inbox 메시지를 저장·조회; Activity Feed는 개발자용 실행 기록 [N2,N6] | broadcast에서 수신자별 notification 생성, 사용자 JWT로 목록 조회 [M2,M5] |
| read/seen·count | `read_at`와 `seen_at` 분리, unread/unseen count, read/unread/seen/archive 동작 [K3,K4] | read/seen/archive 및 `useCounts`의 total/unread/unseen [N3,N9] | read/seen/archive 타임스탬프; `/notifications/unread/count`, 읽음·seen API [M2,M5] |
| 실시간 | Feed API와 실시간 서비스, React hooks에서 연동 [K3] | WebSocket으로 메시지 전달, hooks가 상태·count 갱신 [N3,N6] | `magicbell-js/realtime` WebSocket, 재연결·disconnect 제공 [M6] |
| 기본 UI | feed/popover, inbox, toast, CSS [K5] | Inbox·Bell·Notifications·preferences [N3,N9] | FloatingInbox·Inbox·ContextProvider, CSS·item renderer [M3] |
| 맞춤 UI | React hooks와 `@knocklabs/client`로 headless [K3] | `useNotifications`, `useCounts`, `useNovu`, `@novu/js` [N3] | React renderer 교체 또는 UserClient REST+Realtime으로 직접 UI. 현행 문서에서 React headless hook 세트를 확인하지 못함 [M3,M6] |
| 장기 보존 | Feed 무기한, 일반 플랜 메시지/실행 로그 30일 [K1,K2] | Free Inbox 30일, Pro/Team 90일; Free Activity Feed 24시간 [N1] | 현재 가격·API·notification 문서에서 Inbox 보존 일수 확정 불가 [M1,M2,M5] |
| Node/SQLite 관계 | Node SDK 또는 HTTP로 trigger. SQLite 어댑터 불필요 [K7,K8] | Node `@novu/api` 또는 HTTP. Cloud 저장소는 Cadence SQLite와 별개 [N8] | Node ProjectClient 또는 HTTP v2. UserClient와 구분 [M4,M6] |

**의미상 주의:** 실시간 toast는 저장 알림함의 대체물이 아니다. 브라우저를 닫아 둔 동안 발생한 메시지는 다음 접속 시 서버 목록 조회로 회수해야 한다. WebSocket 수신, 서버 저장, 사용자가 읽음은 서로 다른 성공 조건이다.

**설계 제안:** 사용자가 요구한 배지가 “읽지 않은 개수”라면 unread count를 사용한다. Knock 기본 popover는 열 때 seen을 처리하고 일반적으로 unseen 배지를 쓴다. 기본 동작을 그대로 가져와 요구가 충족되었다고 하지 않는다. headless에서는 seen 시점도 앱이 구현해야 한다. 열면 seen, 클릭/명시적 동작이면 read라는 구분은 프로토타입에서 확인할 후보 정책이다. [K3]

## 4. React 19.2.7 / React Router 8.3.0 SSR 근거

공식 React 지원 범위와 npm peer 선언은 **설치·타입 호환의 근거일 뿐, Cadence의 빌드·hydration·실시간 연결 성공 증거가 아니다.** React Router 8.3.0을 명시한 세 제품의 통합 시험 결과는 확보하지 못했다.

| 후보 | 조회한 버전/소스 | 확인된 근거 | 남은 검증 |
| --- | --- | --- | --- |
| Knock | 배포 `@knocklabs/react@0.15.1`, `@knocklabs/node@1.41.1`; JS 소스 `07c61ac3ef1c968731ea9b83d81193f254ed1761` | React/DOM peer `^17.0.0 \|\| ^18.0.0 \|\| ^19.0.0`. Next/TanStack router peer는 optional. 인증 hook은 클라이언트 생성·authenticate와 unmount teardown을 포함 [K6,K9] | SSR import/render 시 브라우저 전용 부작용, Vite 서버 번들, hydration, route 전환과 구독 정리. Next 전용 export를 React Router 지원 증거로 쓰지 않음 |
| Novu | 배포 `@novu/react@3.19.2`, `@novu/api@3.19.1`; 소스 `2fab470bfea0f170fd1ef740e17f8e86419b6f76` | React/DOM peer `^18.0.0 \|\| ^19.0.0 \|\| ^19.0.0-0`, 공식 문서 React 19 지원. package exports가 browser와 server를 분리 [N4,N7] | SSR 소스는 컴포넌트 stub/placeholder 및 데이터 없는 hooks를 제공. **알림 목록을 서버에서 완전히 렌더한다는 뜻이 아님**. Remix 예제도 RR 8.3.0 검증을 대신하지 않음 |
| MagicBell | 배포 `@magicbell/react@1.14.0`, `magicbell-js@1.8.0` | 공식 React 문서가 해당 패키지를 사용. 배포 메타데이터에 React peerDependencies가 없고 dev `@types/react`는 `^18.3.22`. 배포 JS의 context-provider/inbox에는 `"use client"`와 React hooks가 있음 [M3,M8] | React 19 명시 지원 범위를 확보하지 못함. peer 부재는 모든 버전 호환 선언이 아님. `"use client"`만으로 React Router SSR 차단·안전 보장 안 됨 |

**추천 검증 경계:** 서버 loader는 세션에서 사용자 식별 및 토큰 발급을, action/서버 작업은 사건 확정 후 trigger를 담당한다. 알림 UI·실시간 연결은 hydration 이후 브라우저에서 활성화하는 최소 실험을 먼저 한다. SSR에는 안정적인 빈 자리/로딩 상태를 사용한다. browser-only import가 필요한지는 실제 빌드로 판정한다. 앱 전체 SSR 해제를 해결책으로 전제하지 않는다.

Knock Node README는 TypeScript 4.9 이상과 Node 20 LTS 이상 중 non-EOL 버전을 안내한다. Cadence는 ESM·TS 5.9이지만 실제 Node 버전과 설치할 의존성 조합은 smoke 때 기록해야 한다. Novu·MagicBell은 Node 사용을 공식 안내하지만 이번 조사에서 정확한 최소 Node 버전 보장을 확보하지 못했다. [K8,N8,M6]

## 5. 사용자 인증·키 경계와 DevUI 전환

### 문서상 인증 방식

| 후보 | 브라우저에 전달 | 서버에만 보관 | 공식 경계 |
| --- | --- | --- | --- |
| Knock | 공개 API key, feed channel ID, 현재 user ID, 사용자 JWT | secret API key와 별도의 `KNOCK_SIGNING_KEY` | enhanced security를 켜면 RS256 JWT의 `sub`로 사용자 인증, `iat`/`exp` 권장. 꺼져 있으면 공개 key로 임의 사용자 요청 가능. grants로 feed 권한 제한 가능 [K4] |
| Novu | applicationIdentifier, subscriber ID, `subscriberHash`; 선택한 region의 API/socket 주소 | `NOVU_SECRET_KEY` | In-App integration의 HMAC 보안 활성화. 서버에서 `HMAC-SHA256(secretKey, subscriberId)` 생성. 이 hash는 자체 exp claim이 있는 JWT와 다르다 [N5] |
| MagicBell v2 | 현재 사용자의 User JWT | Project JWT, User JWT 서명용 Secret Key; API Key도 서버 토큰 생성 설정에서 관리 | User JWT는 HS256, `user_external_id` 또는 email 및 `api_key`; 서버 broadcast는 Project JWT [M4] |

MagicBell 문서의 JWT 예제는 만료를 1년으로 둔다. **추천:** 예제를 그대로 복사하지 말고 Cadence 세션 수명과 재발급 정책에 맞춘 짧은 유효기간을 선택한다. Knock도 만료·재발급 callback을 문서화한다. Novu의 정적 HMAC은 로그아웃만으로 서명이 무효화된다고 주장할 수 없다. 세 서비스 모두 프런트 state 제거와 서버 토큰 무효화는 다른 문제다. [K4,N5,M4]

### Cadence 적용 제안 — 아직 구현 안 됨

1. 알림 사용자 ID는 서버 세션에서 얻은 DB 사용자 ID로 매핑한다. 예: 개발 데이터셋 namespace + `String(user.id)`. 이름·email·role·PPP 국가를 개인 알림함의 식별자로 사용하지 않는다. DB 재시드로 숫자 ID가 재사용되면 새 namespace/격리 환경이 필요하다.
2. 토큰 발급 endpoint는 요청자가 보낸 임의 `userId`를 서명하지 않는다. 세션에서 현재 사용자를 조회하고 Student/Instructor MVP 자격을 검사한다. 서버 secret/Project JWT는 loader JSON·Vite 공개 환경변수·브라우저 번들에 넣지 않는다.
3. DevUI 전환 시작 시 이전 목록·배지·toast를 감추고, 이전 socket/구독과 사용자별 cache를 정리한다. 새 세션으로 loader를 재검증한 뒤 **새 ID와 새 토큰을 한 쌍으로** 활성화한다. 늦게 도착한 이전 사용자의 응답을 새 상태에 반영하지 않는다.
4. Knock의 `enabled=false`는 연결 중지·데이터 정리를 공식 제공한다. 소스에도 사용자 변경 시 재인증과 teardown이 있다. 하지만 별도 앱 cache, custom UI 상태까지 정리해 준다고 가정하지 않는다. Novu/MagicBell도 실제 선택 버전의 dispose/disconnect·provider 전환을 확인한다. [K6,M6]
5. 로그아웃·계정 전환 시 local/session storage와 공유 탭의 오래된 상태도 검증한다. 인증 토큰이 포함된 서버 응답을 사용자 간 공유 cache에 저장하지 않는다.
6. trigger의 `recipients`는 브라우저 입력이 아니라 서버의 수강·강의 소유·Purchase 관계 조회로 결정한다. feed 소유자 인증은 잘못된 수신자 선정이나 링크 대상의 접근 권한을 대신하지 않는다. 이동한 화면에서 권한을 다시 검사한다.

현재 `api.switch-user`는 양의 정수 ID를 받아 세션을 바꾸는 개발 기능이다. **개발 계정 전환에서 알림이 섞이지 않는지 검증하는 장치이지, 프로덕션 로그인·권한 검증이 완성되어 있다는 근거가 아니다.** 프로덕션 인증 적용은 별도 구현 범위다.

## 6. 서버 trigger·멱등성·재시도·장애 책임

| 구간 | Knock | Novu Cloud | MagicBell |
| --- | --- | --- | --- |
| 앱 → 서비스 | workflow key, recipients, actor, data로 trigger; run ID 반환 [K7] | 서버 `@novu/api` trigger 또는 `POST /v1/events/trigger` [N8,N10] | ProjectClient/`POST /v2/broadcasts`; broadcast가 개별 알림 생성 [M5,M6] |
| 멱등성 | trigger endpoint의 `Idempotency-Key`만 지원, 24시간, 동일 payload, 성공 2xx만 cache [K10] | POST/PATCH + API key, 성공/오류 24시간·진행 중 5분. 진행 중 중복 409, 다른 body 재사용 422. **조직별 활성화 요청이 필요할 수 있음** [N10] | 일부 endpoint의 `Idempotency-Key`, 첫 응답 24시간 cache. broadcast의 실제 적용·재시도는 smoke로 확인 [M7] |
| API 호출 재시도 | Node SDK 기본 2회: 연결 오류, 408/409/429/5xx. timeout 기본 1분 [K8] | 앱에서 timeout/429/409 등을 구분하고 key를 보존. SDK 재시도 기본값은 이번 조사로 보장하지 않음 | rate limit 500 req/min/IP, 429 뒤 60초. 앱/SDK의 재시도 기본값·정책을 별도 확인 [M7] |
| 수락 이후 서비스 책임 | 발송 pipeline retry·logging. 하위 provider 일시 오류는 최대 8회/30분 [K11] | In-App는 Novu 저장+WebSocket이며 외부 provider 호출 없음. email/SMS/chat/push provider 발송은 1회, 자동 retry 없음 [N6] | delivery 상태·실패 기록 제공. 제품의 자동 retry 횟수·기간 보장은 공개 근거 미확보 [M9] |

Knock의 하위 provider 재시도는 **Cadence → Knock trigger를 영구 보관·재발행해 준다는 뜻이 아니다.** Novu의 `transactionId`는 추적·취소에 유용하지만 API-level idempotency와 같은 중복/과금 방어가 아니다. 특히 idempotency 활성화가 확인되지 않은 무료 계정에서는 동일 key 재전송이 안전하다고 가정하지 않는다. [K10,K11,N10]

**설계 제안: 앱에 남는 책임**

- DB 트랜잭션의 사건 확정과 외부 API 호출은 원자적이지 않다. SQLite commit 이후 프로세스가 죽으면 trigger가 유실될 수 있고, 외부 수락 뒤 응답만 잃으면 중복 전송될 수 있다.
- 후속 구현에서 내구성 있는 outbox/작업 기록을 고려한다. 사건 ID·종류·수신자 집합·payload·발행 상태·provider run/broadcast ID를 연결하고 재시도 동안 동일 idempotency key/payload를 유지한다. 예: `reply-created:<commentId>:<recipientId>:v1`. 실제 MVP 채택과 실패 허용 범위는 사용자 결정이다.
- SDK retry와 앱 retry를 겹쳐 무제한 반복하지 않는다. timeout·일시 오류는 제한적 backoff, 잘못된 payload/401·권한 오류는 수정 후 재처리, Novu 402는 한도/요금 문제로 분류한다. 24시간을 넘긴 작업은 로컬 발행 기록과 서비스 상태를 대조한 뒤 재전송한다.
- API 2xx/run ID는 실행 수락이지 수신자에게 보임·읽음 보장이 아니다. 서비스 실행 로그/알림 목록과 대조하고 영구 실패·재처리 필요 항목을 운영자가 볼 수 있어야 한다.
- 앱 구매·댓글·Refund Request 성공을 알림 전달 실패 때문에 되돌리지 않는 정책을 검토한다. 단, 이 정책에는 유실 복구 수단과 사용자에게 보이는 상태 정의가 함께 필요하다.
- 브라우저 연결 복구 시 서버 목록/count를 다시 읽는다. read 변경이 실패하면 성공한 것처럼 확정하지 않고 재조회/재시도 상태를 제공한다.

## 7. 무료 한도·가격·유료 전환

모두 USD 월 기준 공개 가격이다. 실제 월 이용량은 미정이다. 세금·환율·연간 할인·별도 채널 공급자 비용은 아래 계산에 포함하지 않는다. 이 MVP는 in-app만 가정하므로 guides/AI/외부 채널 사용료도 계산에서 제외한다.

| 후보 | 무료 개발 플랜 | 유료 기본·초과 단가 | 전환 조건과 한계 |
| --- | --- | --- | --- |
| Knock [K1] | $0, 월 messages sent 10,000. 프로필·workflow·channel·환경 무제한, 카드 불필요. guides 500명/agent 500 credits는 별도 지표 | Starter $250/월, messages 50,000 포함, 이후 $0.005/개. Enterprise 별도 견적 | 무료 초과 시 hard cap 안 함; billing method가 없으면 다음 달 결제 방법을 논의하도록 연락한다고 명시. 무제한 무료라는 뜻 아님. branding 제거는 Starter 이상 |
| Novu Cloud [N1,N2] | $0, 월 workflow runs 10,000, workflows 5개, Dev+Prod 2환경, 팀원 3명, 카드 불필요 | Pro $30부터/월, 30,000 runs 포함, 추가 $1.20/1,000 runs. Team $250부터, 250,000 포함. Enterprise custom | Free는 10,000 도달 시 새 trigger HTTP 402로 중지. 월 reset 또는 upgrade 필요. 유료 Pro/Team은 기본 초과 과금, usage limit + pause 설정 가능. 14일 Pro trial은 Free와 별개 |
| MagicBell [M1] | Builder $0, 월 deliveries 1,000, project 1개, 사용자·팀원 무제한, 모든 integrations | Startup $249/월, 50,000 deliveries 포함, 추가 $0.0025/개. project 5개, 추가 project $99. Enterprise custom | FAQ는 한도 후 delivery별 과금이라고 설명하지만 **Builder 초과 단가·카드 필요 여부·자동 유료 전환 방식은 명확하지 않음**. Startup 단가를 Builder에 적용하지 않음 |

### 계산식과 명시적 가정

- `M`: Knock에서 실제 전달된 수신자×채널 메시지 수. 실패/bounce는 과금 제외. in-app+email이면 같은 사용자도 2개다.
- `R`: Novu의 수신자별 workflow 실행 수. 한 실행의 메시지·step·채널 수와 별개이며 **동일 조직의 모든 환경 사용량을 합산**한다. topic fan-out도 실제 실행된 subscriber 수만큼 증가한다.
- `D`: MagicBell에서 수신자가 받은 채널별 delivery 합계. 100명 in-app + 그중 50명 email이면 150 deliveries다.
- 선택한 유료 플랜이 Starter이고 guides/agent를 사용하지 않으면 Knock 예상 서비스료: `250 + 0.005 × max(0, M - 50,000)`.
- 기본 포함량의 Novu Pro를 선택하면 대략 `30 + 1.20 × max(0, R - 30,000) / 1,000`. Team은 `250 + 1.20 × max(0, R - 250,000) / 1,000`. 1,000단위 청구의 반올림·정산 방식은 checkout에서 확인해야 한다.
- MagicBell Startup, project 5개 이하라면 `249 + 0.0025 × max(0, D - 50,000)`. 추가 project는 공개 단가를 별도 합산한다. Builder 초과분의 공식 계산식은 확보하지 못했다.

**가정 예시:** 한 달 100개의 사건을 각각 2명에게, in-app 1채널·workflow 1회로, digest/재발행 없이 보낸다면 `M=R=D=200`이다. 세 서비스의 공개 무료량 이내지만, 같은 계정의 다른 테스트·환경 사용량과 MagicBell 계정 조건은 별도 확인해야 한다. 이 예시는 실제 Cadence 이용량 예측이 아니다.

### 보존 정책을 읽는 방법

- **Knock:** 가격표의 Feed retention은 unlimited. 데이터 보존 문서는 일반 플랜의 message/workflow log 30일, Enterprise 90일, API log 일괄 30일을 명시한다. 로그가 사라져도 FeedItem 조회·read/seen 변경은 계속 가능하다. 가격표는 feed 보존을 설정 가능하다고 하지만 데이터 보존 문서에는 custom retention 미지원 경고가 있다. 서로 다른 데이터 범위일 수 있으므로 자동 삭제/맞춤 보존 설정의 실제 범위는 계정에서 확인한다. [K1,K2]
- **Novu:** 가격표 HTML의 `aria-label="Inbox feed retention for free plan"` 값은 `30 days`, Pro/Team은 `90 days`다. 같은 표의 Activity feed retention은 Free `24h`, Pro `7 days`, Team `90 days`. Markdown 변환에서 열 순서가 평탄화되어 원본 HTML label을 추가 확인했다. 따라서 무료 개인 Inbox가 24시간 후 사라진다고 읽으면 안 된다. [N1]
- **MagicBell:** 현재 공개 가격·notification·API 문서에서는 플랜별 보존 일수를 확인하지 못했다. 개인정보 처리방침의 목적 달성 기간을 Inbox 제품 보존 보장으로 대체하지 않는다. 계정/지원팀 확인 전 “무기한” 또는 과거 가격표의 일수를 약속하지 않는다. [M1,M2,M5]

## 8. 인간 준비사항과 최소 smoke 절차

다음은 **후속 검증 계획**이며 이번 조사에서 통과한 항목이 아니다. 계정/자격증명 준비를 포함한 실제 연결 실험은 별도 승인 범위로 실행한다.

### 사람이 준비할 것

1. 첫 검증 후보 선택(추천 Knock). 개발용 계정을 만들고 현재 Free/Builder 상태·무료 사용량·초과 정책·카드 요구 여부를 직접 확인한다. 유료 전환 없이 실험을 끝낼 사용량 상한을 정한다. 운영 개인정보 대신 합성 Student A/B·Instructor I를 쓴다.
2. 다음 설정/키를 비공개 서버 환경에 준비한다. 문서·이슈·브라우저 번들에 secret을 넣지 않는다. 아래 이름 중 앱 환경변수명은 후보이며 현행 앱에 존재한다는 뜻은 아니다.

| 후보 | 준비 항목 |
| --- | --- |
| Knock | 개발 환경 secret API key, 공개 API key, signing key(`KNOCK_SIGNING_KEY`), feed channel ID, in-app step 한 개의 workflow key. enhanced security 켜기. 해당 환경에서 workflow를 사용할 수 있도록 저장/게시 상태 확인 |
| Novu | 개발 환경 `NOVU_SECRET_KEY`, applicationIdentifier, region/API/socket 주소, in-app workflow ID. HMAC 켜기. **지원팀/계정에서 idempotency 활성화 여부 확인** |
| MagicBell | 개발 project, 서버 Project JWT, User Auth API Key/Secret Key, in-app delivery 설정. 합성 사용자 external ID와 User JWT. Builder 초과 처리·Inbox 보존 기간 확인 |

3. in-app만 활성화한다. 이메일/SMS/Slack/push credentials·OS 알림 권한은 이 검증에 필요하지 않다. 데스크톱과 모바일 웹의 후보 화면, read/seen 정책, 외부 서비스에 보낼 최소 payload를 결정한다.

### 실행 순서와 합격 증거

1. **설치·SSR:** 별도 실험 브랜치에 정확한 SDK 버전을 고정하고 Node/React/Router/lockfile 버전을 기록한다. 앱 변경 후 `npm run typecheck` → `npm run test` 순으로 실행하고 `npm run build`, 프로덕션 SSR 첫 요청까지 확인한다. hydration 오류·`window/document` 서버 참조·브라우저 secret 유출이 없어야 한다.
2. **인증 거부 시험:** 미로그인에는 토큰을 발급하지 않는다. A의 토큰으로 B의 ID/feed/message read 요청을 시도해 거부되는지 확인한다. 잘못된 서명·누락 토큰·만료 토큰도 확인한다(Novu HMAC 자체에는 JWT exp가 없으므로 세션/재인증 경계를 별도 확인).
3. **오프라인 저장:** B 브라우저를 닫은 상태에서 합성 사건 1건을 서버 trigger로 B에게만 보낸다. run/broadcast ID를 기록한다. 재접속하면 B 목록 1건·unread 1, A에게는 0이어야 한다. 페이지 새로고침·재로그인 후에도 정책상 보존된다.
4. **실시간·상태:** 열린 B 탭에 두 번째 사건을 보낸다. 새로고침 없이 목록/count가 갱신되는지 측정한다. seen과 read를 각각 바꾼 뒤 새로고침·다른 탭에서 서버 상태가 유지되는지 확인한다. 브라우저 offline→online 후 목록/count를 다시 맞춘다.
5. **DevUI A→B→A:** 전환 중·직후 이전 계정 목록, 배지, toast가 노출되지 않아야 한다. 느린 네트워크 응답·열린 탭·빠른 연속 전환·로그아웃·동일 사용자 국가 변경도 확인한다. 이전 socket/구독을 닫고 새 토큰과 ID를 일치시켰다는 네트워크 증거를 남긴다.
6. **중복·실패:** 동일 사건·같은 idempotency key/payload를 재요청해 알림이 1건인지 확인한다. 다른 payload 재사용, 요청 timeout, API 실패, 서버 commit 이후 발행 실패를 구분한다. 무료량을 실제로 소진하지 않고 HTTP 실패를 통제된 fixture로 재현한다. Novu는 idempotency 미활성일 때 결과를 따로 기록한다.
7. **화면·권한:** 데스크톱 popover/전체 목록과 모바일 drawer/페이지 후보를 비교한다. 미읽음 숫자·긴 텍스트·페이지네이션·키보드/초점·스크롤을 확인한다. 알림 링크 대상이 삭제되었거나 권한이 사라졌을 때 기존 상세 화면 권한 검사가 유지되는지 확인한다.
8. **계정 검증:** 사용량 대시보드의 실제 증가량과 무료 플랜을 대조한다. 보존 설정·branding·자동 초과 과금·로그 확인 가능 범위를 기록한다. 보존 만료는 짧은 smoke로 증명할 수 없으므로 장기 관찰/지원 확인 항목으로 남긴다.

최소 결과물은 실행 버전, 명령 결과, 실패/성공 로그에서 비밀을 제거한 기록, A/B 격리 화면, 실제 계정 플랜/설정 확인이다. 목업 UI나 API 2xx 하나만으로 연결 검증을 완료했다고 하지 않는다.

## 9. 남은 사용자 결정·미검증·자료 한계

### 최종 선택 전 사용자 결정

1. **검증 순서:** Knock부터 실계정 smoke를 진행할지, 낮은 유료 진입비 때문에 Novu를 먼저 볼지.
2. **보존·비용:** Inbox를 몇 개월/무기한 유지할지, branding 허용 여부, 무료 초과 시 멈춤과 과금 중 원하는 정책, 허용 가능한 월 기본료. 월 사건·수신자·채널 예상량을 정해야 비용 비교가 가능하다.
3. **MVP 사건·권한:** 질문/답변, 본인 Purchase·Refund Request 소식 중 정확한 사건과 수신자. 승인과 Issued Refund는 분리한다. 신규 레슨 INSERT를 공개 알림으로 쓰지 않는다.
4. **화면 동작:** 데스크톱·모바일 배치, badge unread/seen, 클릭 read 여부, 실패 표시, 관련 화면 이동. 프로토타입에서 확인한다.
5. **운영 책임:** 외부 전송 payload 범위, 데이터 위치/삭제 요구, 발행 유실 허용 수준과 outbox 채택, 계정·키 관리 담당자.

### 확인하지 못한 부분

- 세 제품 모두 Cadence 정확한 React 19.2.7/Router 8.3.0/Node/SQLite 조합의 설치·SSR·hydration·실제 인증·실시간·계정 전환 격리.
- 실제 계정의 무료 플랜 부여, 결제 수단 요구, 한도 경고·차단·과금 처리, 사용량 집계, 지역 선택·기능 활성화.
- Novu 조직의 idempotency 활성화, MagicBell Builder 초과 단가·보존 일수·자동 delivery retry 보장, Knock custom retention 범위.
- 만료/로그아웃 후 토큰의 실제 서버 유효성, 다중 탭/느린 응답 cleanup, 장기 보존 및 삭제 시점.

### 조사 방법과 실패·충돌 처리

- 라이브러리는 Context7 resolve를 먼저 사용했다. Knock `/websites/knock_app`, `/knocklabs/javascript`, Novu `/websites/novu_co`의 공식 문서/소스를 조회했다. MagicBell resolve는 무관한 MagicBlock 결과만 반환해 채택하지 않고 MagicBell 공식 docs·npm 배포물로 보완했다.
- 가격은 각 서비스 공식 URL에서 직접 조회했다. Novu 가격표의 열 해석은 공식 HTML `aria-label`로 재확인했다. 비교업체의 가격·기능 주장은 근거에 사용하지 않았다.
- MagicBell `/docs/channels/in-app` 조회는 404였고 공식 navigation에서 찾은 `/docs/channels/in_app`로 확인했다. Novu SSR 소스 `index.ts` 추정 경로도 404였고 실제 `index.tsx`에서 확인했다. 실패 경로를 근거로 미지원 판정하지 않았다.
- Knock 가격표의 configurable feed retention과 retention 문서의 custom retention 경고는 문맥 차이 가능성을 남겼다. Novu 검색 결과의 일부 예제는 transactionId를 멱등성처럼 설명했으나, 상세 Idempotency 문서의 조직별 활성화·API 경계 설명을 우선했다. 예제 복사만으로 보장하지 않는다.
- MagicBell 배포물은 npm registry tarball을 메모리에서 읽어 정적 코드만 확인했다. 설치·실행하지 않았다. 배포 소스의 `"use client"`, peer 범위, 공식 Remix 예제는 실제 SSR 검증과 구분했다.
- 문서 변경만 있으므로 앱의 typecheck/test를 실행해 SDK 호환을 검증했다고 주장하지 않는다. 문서 제출 전 변경 파일·공백 오류·출처 참조·브랜치 push를 확인한다.

## 10. 공식 출처 목록

아래 출처는 모두 **2026-11-13 확인**. 가격과 문서는 변경될 수 있다. 소스 permalink는 확인한 커밋을 고정했으며 npm 버전 URL은 해당 배포 메타데이터를 가리킨다.

### Knock

- **K1** 가격·무료 한도·초과 정책·feed/log 보존: https://knock.app/pricing
- **K2** 데이터 보존: https://docs.knock.app/manage-your-account/data-retention
- **K3** headless, count, seen/read: https://docs.knock.app/in-app-ui/react/headless/feed
- **K4** 공개/비밀 키·RS256 JWT·grants·만료: https://docs.knock.app/in-app-ui/security-and-authentication
- **K5** React UI SDK: https://docs.knock.app/in-app-ui/react/sdk/overview
- **K6** provider lifecycle: https://docs.knock.app/in-app-ui/react/sdk/components/knock-provider ; [인증 hook 고정 소스](https://github.com/knocklabs/javascript/blob/07c61ac3ef1c968731ea9b83d81193f254ed1761/packages/react-core/src/modules/core/hooks/useAuthenticatedKnockClient.ts)
- **K7** 서버 trigger: https://docs.knock.app/send-notifications/triggering-workflows/api
- **K8** Node SDK retry·runtime: https://github.com/knocklabs/knock-node#retries ; https://github.com/knocklabs/knock-node#requirements ; https://registry.npmjs.org/@knocklabs/node/1.41.1
- **K9** React peer/optional peers: [package.json 고정 소스](https://github.com/knocklabs/javascript/blob/07c61ac3ef1c968731ea9b83d81193f254ed1761/packages/react/package.json) ; https://registry.npmjs.org/@knocklabs/react/0.15.1
- **K10** 멱등성: https://docs.knock.app/api-reference/overview/idempotent-requests
- **K11** 전달·재시도: https://docs.knock.app/send-notifications/delivering-notifications

### Novu Cloud

- **N1** 가격·Inbox/Activity Feed 보존: https://novu.co/pricing/
- **N2** run 집계·무료 cap·trial·유료 과금: https://docs.novu.co/platform/account/billing
- **N3** headless·count·실시간: https://docs.novu.co/platform/inbox/headless-mode
- **N4** React 지원: https://docs.novu.co/platform/inbox/setup-inbox ; https://docs.novu.co/platform/inbox
- **N5** HMAC·환경·branding: https://docs.novu.co/platform/inbox/prepare-for-production
- **N6** provider와 In-App 재시도 구분: https://docs.novu.co/platform/developer/delivery-retries
- **N7** [React package.json 고정 소스](https://github.com/novuhq/novu/blob/2fab470bfea0f170fd1ef740e17f8e86419b6f76/packages/react/package.json) ; [SSR stub 고정 소스](https://github.com/novuhq/novu/blob/2fab470bfea0f170fd1ef740e17f8e86419b6f76/packages/react/src/server/index.tsx) ; https://registry.npmjs.org/@novu/react/3.19.2 ; https://docs.novu.co/platform/quickstart/remix
- **N8** 서버 SDK: https://docs.novu.co/platform/sdks/server/typescript ; https://registry.npmjs.org/@novu/api/3.19.1
- **N9** React hooks·구성요소: https://docs.novu.co/platform/sdks/react ; https://docs.novu.co/platform/sdks/react/hooks/use-counts
- **N10** 멱등성·활성화 조건: https://docs.novu.co/api-reference/idempotency

### MagicBell

- **M1** 가격·delivery 계산: https://www.magicbell.com/pricing
- **M2** notification 저장 모델·상태: https://www.magicbell.com/docs/primitive/notification
- **M3** 현행 React UI: https://www.magicbell.com/docs/libraries/magicbell-react
- **M4** 인증 구분: https://www.magicbell.com/docs/api/authentication ; https://www.magicbell.com/docs/api/authentication/user
- **M5** 사용자 알림 API·count·broadcast: https://www.magicbell.com/docs/api/reference ; https://www.magicbell.com/docs/api/openapi.json
- **M6** Node/Browser/Realtime SDK: https://www.magicbell.com/docs/libraries/magicbell-js ; https://www.magicbell.com/docs/channels/in_app ; https://registry.npmjs.org/magicbell-js/1.8.0
- **M7** API v2·rate limit·idempotency: https://www.magicbell.com/docs/api
- **M8** 공식 문서가 지정한 패키지 배포 메타데이터: https://registry.npmjs.org/@magicbell/react/1.14.0 ; [배포 tarball](https://registry.npmjs.org/@magicbell/react/-/react-1.14.0.tgz) 내 `dist/esm/context-provider.js`, `dist/esm/inbox.js`, `package.json`
- **M9** delivery 상태: https://www.magicbell.com/docs/primitive/delivery
