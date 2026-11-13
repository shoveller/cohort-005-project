# Cadence 관리형 앱 내 알림: Knock와 Novu Cloud 조사

- 조사일: **2026-11-14 KST**. 실행 환경 `date` 출력: `2026-11-14 01:30:48 KST`.
- 지도: [Cadence 앱 내 알림: 독립 설계 지도와 구현 명세](https://github.com/shoveller/cohort-005-project/issues/26)
- 연구: [무료 검증 가능한 관리형 앱 내 알림 서비스의 실제 지원 범위는 무엇인가](https://github.com/shoveller/cohort-005-project/issues/28)
- 기준 코드: `979e285`, 브랜치 `research/cadence-in-app-notifications-map-26`.
- 범위: 현재 티켓·패키지·공식 문서·게시자가 배포한 npm 메타데이터로 새로 조사했다. 기존 지도의 결론을 사용하지 않았다. 실제 계정 생성, 서비스 설정, SDK 설치, 알림 전송, 브라우저 연동 검증은 수행하지 않았다.
- 이 문서는 **조사 결과와 선택의 tradeoff**다. 서비스·알림 종류·수신자·UI는 아직 선택하지 않았다. research 스킬에 따른 위임 연구 결과이며 문서 외 앱 코드는 변경하지 않았다.

## 1. 답변 요약

두 후보 모두 실제 호스팅 서비스가 사용자별 알림을 저장하고 피드 조회·읽음 상태·실시간 갱신을 제공한다. 외부 이메일 사업자가 있어야 앱 내 알림이 되는 구조가 아니다. Knock는 관리형 in-app feed, Novu는 **Novu Cloud의 In-App/Inbox**를 비교한다. Novu 오픈소스 자체 호스팅의 무료 라이선스를 관리형 무료 제공과 혼동하지 않는다. [K2][K3][N2][N7]

가장 큰 선택 차이는 다음과 같다.

1. **비용 단위와 초과 동작:** Knock Free는 월 10,000 delivered messages, Novu Free는 월 10,000 workflow runs다. Knock는 초과를 hard cap하지 않고 결제 수단 등록을 협의한다. Novu Free는 새 trigger를 HTTP 402로 거절한다. [K1][N1][N2]
2. **보존:** Knock 사용자 feed는 무기한 조회 가능하지만 일반 플랜 로그는 30일이다. Novu Free의 사용자 Inbox는 30일, 운영 Activity Feed는 1일이다. 로그 보존을 사용자 알림 보존으로 읽으면 잘못된 비교가 된다. [K4][N3]
3. **유료 시작점:** Knock Starter는 월 $250, Novu Pro는 월 $30부터다. 무료 UI의 브랜드 제거는 두 서비스 모두 유료 기능이다. [K1][N1][N5]
4. **재시도 중복 방지:** Knock trigger 멱등성은 24시간이다. Novu도 24시간 캐시를 문서화하지만 **모든 조직에서 기본 활성화되는 기능이 아니며 지원팀 확인이 필요하다**. `transactionId`는 API 멱등성의 대체물이 아니다. [K5][N6]
5. **프로젝트 호환성:** React 19 peer 범위는 두 후보 모두 맞는다. 다만 Knock는 선언만 있고 lockfile에 없으며, 두 SDK 모두 이 프로젝트의 React Router 8 SSR/hydration 실행 검증은 아직 없다.

두 후보가 요구하는 핵심 기능을 이미 문서화하므로 대안은 추가하지 않았다. 후보 수를 늘리기보다 아래 미확인 항목을 선택 대화와 실제 검증에서 해소하는 편이 유용하다.

## 2. 현재 프로젝트와 SDK 호환성의 증거 수준

현재 브랜치의 `package.json`, `package-lock.json`을 직접 확인했다.

| 항목 | 선언 | lockfile |
| --- | --- | --- |
| React / React DOM | `^19.2.7` / `^19.2.7` | React `19.2.8` 확인 |
| React Router / Node·Serve·Dev adapter | `8.3.0` | Router `8.3.0`, Node engine `>=22.22.0` |
| Vite | `^7.1.7` | `7.3.7` |
| TypeScript | `^5.9.2` | `5.9.3` |
| Knock server | `@knocklabs/node ^1.41.1` | **항목 없음** |
| Knock React | `@knocklabs/react ^0.15.1` | **항목 없음** |
| Novu | 선언 없음 | 항목 없음 |

lockfile의 루트 dependency 목록에도 Knock가 없다. 따라서 선언 버전은 설치 버전의 증거가 아니며, 구현 때 manifest/lockfile 동기화부터 필요하다. 현재 조사 프로세스 Node는 `v22.22.3`이다. 배포 서버의 Node 버전은 확인하지 않았다.

게시자가 배포한 npm registry 메타데이터 확인:

- `npm view @knocklabs/react@0.15.1 peerDependencies peerDependenciesMeta --json`: React/React DOM `^17 || ^18 || ^19`. Next와 TanStack Router peer는 **optional**이므로 Cadence에 이 프레임워크들을 추가할 근거가 아니다. [P1]
- `npm view @novu/react version peerDependencies engines --json`: 조사 시 latest `3.19.2`, React/React DOM `^18.0.0 || ^19.0.0 || ^19.0.0-0`. [P2]
- `npm view @novu/api version engines --json`: 조사 시 latest `3.19.1`. `@knocklabs/node@1.41.1`과 함께 조회 결과에 engines가 없었다. **engine 필드 부재를 모든 런타임 지원 보장으로 해석하지 않는다.** [P3][P4]
- Novu 공식 React quickstart는 Vite와 React Router navigation callback을 사용한다. 현재 프로젝트는 `react-router` 패키지를 사용하므로 예시의 `react-router-dom` import를 그대로 복사하는 것은 별도 판단이 필요하다. [N8]
- Knock는 `KnockProvider` + `KnockFeedProvider` + feed/popover와 CSS import를 제공한다. 공식 최신 예시의 세부 API가 선언된 `0.15.1`에 모두 존재한다고 가정하지 않는다. [K8]

**판정:** React peer 범위상 두 후보 모두 가능하다. clean install, 실제 타입 검사, SSR import, hydration, CSS 충돌, 인증 후 mount와 사용자 변경 시 reset까지 통과했다는 뜻은 아니다. 연구 문서만 추가했으므로 앱 변경용 `npm run typecheck` / `npm run test`는 실행하지 않았다.

## 3. 무료 검증과 유료 전환

금액은 공식 페이지에 표시된 USD 월 가격이다. 계약·세금·향후 변경은 포함하지 않는다.

| 항목 | Knock | Novu Cloud |
| --- | --- | --- |
| 무료 시작 | 카드 없이 $0 | 카드 없이 $0 |
| 무료 월 사용량 | delivered messages 10,000 | workflow runs 10,000 |
| 집계 기준 | 한 수신자·한 채널로 전달된 메시지 1개. 실패/bounce는 제외 | 한 subscriber에 workflow 1회 실행. 조직의 Dev/Prod 등 모든 환경 합산 |
| 무료 workflow / 환경 | 각각 unlimited | workflows 5개, Dev/Prod 2개 |
| 무료 한도 초과 | hard cap 없이 연락하여 다음 달 결제 수단 협의 | 새 실행 중단, HTTP 402. 기간 리셋 또는 업그레이드 필요 |
| 첫 유료 | Starter $250/월, 50,000 messages 포함, 추가 $0.005/개 | Pro $30/월부터, 30,000 runs 포함, 추가 $1.20/1,000 runs |
| 다음 단계 | Enterprise 협의 | Team $250/월부터, 250,000 runs, 추가 $1.20/1,000 runs |
| 브랜드 제거 | Starter 이상 | 유료 플랜 |
| 무료 운영 로그 | 30일 | Activity Feed 24시간 |
| 무료 사용자 알림 | 무기한 feed | Inbox 30일 |
| 유료 사용자 알림 | 무기한 feed | Pro/Team 90일, Enterprise custom |

근거: [K1][K4][N1][N2][N3]. Novu 14일 Pro trial은 상시 Free와 다른 상품이며 30,000 runs cap이 있다. 유료 Pro/Team은 기본적으로 초과분 과금이며 usage limit의 pause를 설정한 경우 중단한다. Knock의 비차단 정책은 무료 무제한이나 가격 상한의 보장이 아니다.

**계산 예시(견적 아님):** 사건 1건을 4명에게 각각 앱 내 메시지 1개씩 전달하면 Knock 4 messages, Novu 4 subscriber workflow runs가 된다. 모든 역할을 후보로 검토한다는 말은 모든 사용자에게 broadcast한다는 뜻이 아니다. 채널·step·digest 수에 따라 두 집계 단위가 달라지므로 같은 10,000을 언제나 같은 처리량으로 환산할 수 없다. [K1][N2]

## 4. 인증·수신자·서버 API·역할 경계

| 항목 | Knock | Novu Cloud |
| --- | --- | --- |
| 서버 발행 | secret API key로 `POST /v1/workflows/{key}/trigger`; recipients, actor, data, tenant. 비동기 실행, workflow_run_id 반환 | `POST /v1/events/trigger`; REST 필드 `name`, SDK 필드 `workflowId`, `to`, payload, actor, context. 응답 acknowledged/status/transactionId 확인 |
| 사용자 식별 | Cadence의 안정적인 사용자 ID를 Knock user ID에 매핑; inline identify 지원 | Cadence 사용자 ID를 subscriberId에 매핑; 문자열/객체 recipient, 미등록 subscriber 생성 지원 |
| 브라우저 | public API key + user ID + feed channel ID | applicationIdentifier + subscriberId |
| 사용자 사칭 방지 | enhanced security mode 활성화 + 서버에서 RS256 서명 JWT; sub, iat, exp. 필요하면 explicit grants | In-App provider에서 HMAC 활성화 + 서버의 HMAC-SHA256(secretKey, subscriberId)인 subscriberHash |
| 다중 조직 범위 | tenant filter와 signed tenant grants | context와 별도 contextHash; 서버에서 허용 범위를 판정해 서명 |

근거: [K6][K7][N4][N5][N8]. 공개 식별자만 전달하는 quickstart는 운영용 사용자 격리 증거가 아니다. Knock token 만료 갱신 callback이 문서화되어 있다. Novu의 subscriberHash 생성식에는 만료 시각이 없으므로 JWT와 동일한 만료/폐기 특성을 가정하지 않는다. 로그아웃·역할 변경 시 기존 세션 무효화의 구체적 서비스 동작은 실제 검증 대상이다.

**Cadence에 남는 책임(조사에서 도출한 경계):** 수강생·강사·팀 관리자·플랫폼 관리자 모두 같은 user/subscriber 모델로 표현할 수 있지만, 사건별 수신자를 결정하는 주체는 Cadence다. 서비스 dashboard의 Team members/RBAC는 Cadence 사용자 역할과 다르다. 클릭 대상의 구매·수강·팀 권한도 Cadence가 다시 검사해야 한다. 알림 읽음은 수강 권한 부여나 환불 실행의 증거가 아니다. 어떤 역할에 어떤 사건을 보낼지는 후속 결정이다.

## 5. 조회·읽음·UI·실시간

### Knock

- `GET /v1/users/:id/feeds/:channel_id`로 역시간순 feed와 total/unread/unseen count를 제공한다. 메시지 상태는 seen/read/archive와 각 반대 상태, batch/bulk API가 있다. 기본 조회는 archived를 제외한다. [K2][K6]
- built-in feed/popover, renderItem, CSS 변수·스타일 대체, headless API로 직접 UI 구현이 가능하다. badge를 unseen 대신 unread로 설정할 수 있다. **popover 열기는 기본 seen 처리이며 read 처리와 다르다.** [K8]
- WebSocket `new-message` 이벤트는 전체 본문 대신 count 등 metadata를 보내며 throttling될 수 있다. 알림 데이터는 feed API로 재조회하는 구조다. 다중 탭 동기화 옵션은 `__experimentalCrossBrowserUpdates`로 문서화되어 있다. 실시간 제공을 모든 탭·기기에서 즉시 일관성을 보장한다는 뜻으로 확대하지 않는다. [K2][K8]

### Novu Cloud

- In-App 메시지는 Novu가 저장하고 WebSocket으로 연결 클라이언트에 전달한다. [N7]
- `<Inbox />`의 bell·feed와 headless hooks 선택 가능. `useNotifications`는 pagination/filter/refetch, readAll/seenAll/archiveAll을 제공하며 개별 notification에는 read/unread/seen/archive/unarchive/delete가 있다. `useCounts`는 total/unread/unseen 실시간 count를 제공한다. [N8][N9][N10]
- hook 문서는 새 알림 및 read/seen/archive/snooze 상태의 실시간 갱신을 명시한다. 그러나 재연결 누락 복구·여러 기기 경합·정확한 지연 SLA는 이번 조사에서 검증하지 않았다. [N9]
- appearance·custom item·headless 선택지가 있어 제품 UI와 맞출 수 있다. 브랜드 제거 유료 조건을 headless 사용만으로 우회 가능하다고 해석하지 않는다. [N1][N5][N11]

**선택에 남는 질문:** 목록을 열면 읽음인가, 개별 클릭 시 읽음인가? badge는 unseen인가 unread인가? popover인가 전용 화면인가? 이는 서비스가 강제한 결정이 아니며 기존 지도에서 화면·동작 결정 시 함께 다룰 항목이다.

## 6. 보존·데이터 처리 제약

- **Knock:** 일반 플랜 message/workflow/API 로그 30일, Enterprise 일부 로그 90일, API 로그는 공통 30일. 로그가 사라져도 feed 조회와 상태 변경은 가능하다. 가격표는 feed retention을 unlimited/configurable로 표현하지만 retention 문서는 custom retention 미지원이라고 안내한다. 대상 데이터가 달라 보이므로 **임의 feed TTL 설정을 지원한다고 단정하지 말고 필요 시 확인**한다. [K1][K4]
- **Knock 데이터 범위:** trigger data가 feed response에 전달될 수 있다. allow/deny list로 응답 노출을 조정할 수 있지만 이를 저장 자체의 금지로 해석하면 안 된다. user 삭제 API는 메시지·내용·관련 로그 등 hard delete를 문서화하며 처리에 최대 10분이 걸릴 수 있다. [K2][K10]
- **Knock 지역:** 보안 문서는 EU residency를 **2026년 말 예정**으로 명시한다. 조사일에 EU 지원이 이미 가능하다고 볼 수 없다. 무료 계정의 실제 region 선택·한국 저장 옵션은 미확인이다. [K11]
- **Novu:** Free Inbox 30일/Activity 1일, Pro 90일/7일, Team 90일/90일이다. 오래된 알림 기록을 무기한 보관해야 한다면 Free/Pro/Team 그대로는 충족하지 않는다. [N3]
- **Novu 지역:** 가격표에 Free부터 US+EU data residency, 보안 페이지에 US와 Germany가 명시된다. 한국 등 추가 지역은 Enterprise 옵션이다. EU에서는 browser API와 socket URL도 바꾸어야 한다. [N1][N5][N12]
- **Novu 데이터 범위:** payload는 workflow 렌더링과 feed API에 사용 가능하다. direct trigger recipient 최대 100, workflow step 최대 20, trigger context 최대 5. 이메일 문서는 trigger payload 512KB 제한(첨부 제외)을 언급하지만 일반 limits 페이지에서 동일 수치를 다시 확인하지 못했으므로, 앱 내 알림의 정확한 전체 body/필드 제한은 채택 시 재확인한다. [N4][N3][N13]
- Novu 상세 보안 문서 링크 `https://docs.novu.co/additional-resources/security.md`는 조사 시 404였다. subscriber 삭제 후 관련 메시지·백업의 완전 삭제 시한, 법적 금지 데이터 범주와 계약별 보존 조건은 확인하지 못했다. 두 서비스의 DPA를 계약 검토까지 완료했다는 뜻도 아니다.

**제품 결정에 주는 의미:** 환불 사유·댓글 전문·결제 개인정보를 외부 payload에 넣을지는 자동으로 정해지지 않는다. 최소한의 사건 종류·대상 ID·표시용 문구만 보낼지 선택해야 한다. UI 필터는 데이터 접근 권한이나 외부 저장 제한의 대체물이 아니다. 이 문서는 법률 적합성을 판정하지 않는다.

## 7. 중복·오류·재시도

| 계층 | Knock | Novu Cloud |
| --- | --- | --- |
| API 중복 방지 | trigger endpoint의 Idempotency-Key, 최대 255자, 24시간. 동일 key/body 재전송. 2xx만 cache | API key 인증의 POST/PATCH에 Idempotency-Key, 최대 255자, 성공/오류 24시간, 진행 중 5분. **조직 활성화 확인 필요** |
| 진행 중/변경 payload | 원 요청과 다른 parameter면 오류 | 진행 중 409 + Retry-After, 다른 body 422 |
| transaction ID | workflow run 식별과 API 중복키를 구분 | transactionId는 추적·취소 및 처리 단계 중복 검사. API 경계의 동시 요청/중복 과금 방지와 동등하지 않음 |
| 서비스 내부 전송 | retryable 오류에 최대 8회/30분 지수 backoff+jitter, undelivered 표시 및 수동 retry 문서화 | In-App은 외부 provider 없이 저장+socket. 외부 채널 provider 1회 정책을 in-app 저장 재시도 정책으로 오해하면 안 됨 |
| 호출자 오류 처리 | 429 존재. endpoint/환경/서명 사용자별 제한 | 429/Retry-After, Free quota 402, API 응답 status도 확인 |

근거: [K5][K7][K9][K12][N4][N6][N7][N2]. Knock의 외부 provider 전송 재시도 문서가 WebSocket 메시지 수신을 exactly-once로 보장하지는 않는다. Novu의 내부 Inbox DB 장애 재시도 횟수는 공개 자료에서 확정하지 못했다. 서버 SDK의 현재 설치 버전이 없으므로 SDK 자동 재시도 기본 횟수도 실증하지 않았다.

**Cadence 설계 시 함의(미결정):** 동일 사건 재전송은 같은 key와 같은 payload를 유지해야 한다. 24시간 이후 replay와 DB commit 후 발행 실패 복구는 별도 문제다. 관리형 feed가 있다고 Cadence의 사건 생성·발행 실패·중복키 저장 책임까지 사라지지 않는다. HTTP 요청 수락은 사용자가 읽었다는 뜻이 아니다. 402/인증 실패를 무한 재시도하는 정책은 적절하지 않으며, 409/429/일시 네트워크 실패와 구분해야 한다.

## 8. 선택 대화에 넘길 tradeoff와 미확인 항목

| 우선하는 조건 | 비교에서 드러난 tradeoff |
| --- | --- |
| 장기 사용자 알림 조회, 다수 workflow | Knock의 무기한 feed·무료 unlimited workflows가 유리한 근거. 첫 유료 고정비 $250 고려 |
| 낮은 첫 유료 비용, EU 무료 검증 | Novu Pro $30와 Free US/EU가 유리한 근거. Free 5 workflows/30일 Inbox와 한도 중단 수용 여부 필요 |
| 무료 상태의 안전한 중복 재전송 | Knock의 문서화된 trigger key와 Novu 조직별 idempotency 활성화 조건을 비교. Novu를 선택하면 무료 조직에서 실제 활성화 가능한지 우선 확인 |
| 빠른 UI 통합 | 양쪽 prebuilt 가능. 기존 Knock 선언이 개발 노력 절약의 가능성은 있지만 lockfile 부재 때문에 설치·연동 완료의 근거는 아님 |
| 강한 브랜드 일치 | 양쪽 custom/headless 가능. 무료 브랜드 조건과 UI 유지 비용을 비교 |

후속 검증에서 확인할 항목(아직 수행하지 않음):

1. 선택한 SDK 버전 고정 후 lockfile 동기화, React Router 8 SSR·hydration·CSS·routing 확인. 앱 변경 시 `npm run typecheck` → `npm run test` 순으로 실행.
2. 무료 조직에서 in-app-only workflow를 만들고, 서로 다른 사용자 A/B의 feed·읽음 상태 격리, 서명 누락/변조 거절 확인. 네 역할 중 실제 채택한 수신자만 발행되는지 확인.
3. 새로고침 후 알림/읽음 유지, 읽음↔미읽음, 모두 읽음, badge 의미, 로그아웃/사용자 전환 시 이전 사용자 데이터 제거 확인.
4. 같은 사건 key의 순차·동시 재전송과 timeout 뒤 재시도 확인. Novu는 지원팀을 통한 활성화 가능 여부가 선행 조건. 현재는 활성화/연동 성공으로 보고할 수 없다.
5. socket 단절·재연결과 두 탭 상태, 보존 만료 UX, 삭제된 대상·권한 변경 시 클릭 동작 확인.
6. 예상 수신자 수×사건 수로 quota 계산, 무료 cap 및 유료 초과 정책 수용 여부 결정. provider의 관리 화면에서 실제 plan/region/retention이 문서와 일치하는지 확인.

서비스 선택·보존 기간·무료 종료 시 허용 비용 등은 후속 대화에서 결정한다. 기존 지도의 서비스/화면/연동 결정 범위에 들어가므로 이번 연구에서 추가 결정 티켓을 만들지 않았다.

## 9. 공식 근거 목록

아래는 모두 2026-11-14 KST 조회. Context7으로 공식 문서를 찾은 뒤 주요 가격·보존·인증·멱등성은 원문을 직접 확인했다. npm 링크는 게시자가 배포한 패키지 메타데이터의 출처다. 웹 문서는 추후 변경될 수 있다.

- [K1] https://knock.app/pricing
- [K2] https://docs.knock.app/in-app-ui/api-overview
- [K3] https://docs.knock.app/integrations/in-app/feeds (공식 문서 인덱스에서 서비스 feed 기능 확인; 세부 주장은 K2 사용)
- [K4] https://docs.knock.app/manage-your-account/data-retention
- [K5] https://docs.knock.app/api-reference/overview/idempotent-requests
- [K6] https://docs.knock.app/in-app-ui/security-and-authentication
- [K7] https://docs.knock.app/api-reference/workflows/trigger
- [K8] https://docs.knock.app/in-app-ui/react/feed
- [K9] https://docs.knock.app/send-notifications/delivering-notifications
- [K10] https://docs.knock.app/managing-recipients/deleting-users
- [K11] https://docs.knock.app/developer-tools/security
- [K12] https://docs.knock.app/api-reference/overview/rate-limits
- [N1] https://novu.co/pricing/
- [N2] https://docs.novu.co/platform/account/billing
- [N3] https://docs.novu.co/platform/developer/limits
- [N4] https://docs.novu.co/api-reference/events/trigger-event
- [N5] https://docs.novu.co/platform/inbox/prepare-for-production
- [N6] https://docs.novu.co/api-reference/idempotency
- [N7] https://docs.novu.co/platform/developer/delivery-retries
- [N8] https://docs.novu.co/platform/quickstart/react
- [N9] https://docs.novu.co/platform/sdks/react/hooks/use-notifications
- [N10] https://docs.novu.co/platform/sdks/react/hooks/use-counts (공식 Notify 인덱스 설명)
- [N11] https://docs.novu.co/platform/inbox/headless-mode (공식 Notify 인덱스 설명 및 가격표)
- [N12] https://novu.co/security/
- [N13] https://docs.novu.co/platform/integrations/email (Context7 공식 발췌)
- [P1] https://registry.npmjs.org/@knocklabs/react/0.15.1
- [P2] https://registry.npmjs.org/@novu/react/3.19.2
- [P3] https://registry.npmjs.org/@novu/api/3.19.1
- [P4] https://registry.npmjs.org/@knocklabs/node/1.41.1

검증 기록: 패키지/lockfile JSON 확인, npm view 읽기 전용 조회, 공식 문서 비교, `git diff --check`. 실제 계정·알림 전송·연동·성능·계약 검증은 미수행.
