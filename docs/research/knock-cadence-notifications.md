# Knock의 Cadence 질문·답글 인앱 알림 적합성 조사

- 확인일: **2026-11-13** (세션 기준일). 가격·문서는 확인 당시 공개 페이지 기준이며 계약 조건은 재확인이 필요하다.
- 조사 티켓: [Knock이 Cadence 질문·답글 알림 요구사항에 적합한가?](https://github.com/shoveller/cohort-005-project/issues/2)
- 설계 맵: [Cadence 인앱 알림 설계](https://github.com/shoveller/cohort-005-project/issues/1)
- 범위: 공식 문서에 근거한 적합성 및 설계 조건. 실제 계정, SDK 실행, 서비스 장애 주입 검증은 수행하지 않았다.
- 기록 위치: `docs/research/`에 기존 조사 문서 관례가 없어 새 디렉터리를 사용했다. `research/knock-cadence-notifications`는 병합하지 않는 조사 브랜치이며 PR을 만들지 않는다.

## 결론

**Knock은 우선 검증 후보로 유지할 수 있다.** 수신자 지정, 지속 피드, 개별/전체 읽음, 열람과 읽음 분리, 실시간 갱신, 커스텀 UI와 이동 핸들러를 공식 API가 지원한다. 다만 다음은 Knock 기본 UI만으로 충족되지 않으며 Cadence가 책임질 설계 조건이다.

1. 수신자 계산·중복 제거·본인 제외는 서버에서 한다. `actor`만 넣으면 모든 형태의 직접 수신자에서 자동 제외된다고 해석하면 안 된다.[S1]
2. 기본 멱등성은 24시간이다. 앱의 영속 전달 기록과 결과 불명 요청의 조정 절차 없이는 장기적인 이벤트당 한 번을 보장하지 못한다.[S2]
3. Knock 사용자 인증은 Cadence의 현재 강좌 접근 권한 검사가 아니다. 원문/작성자/강좌 정보와 미리보기를 저장한 피드를 브라우저에 직접 주면 권한 상실 후에도 조회될 수 있다. **Knock에는 비민감 알림 참조만 두고, 표시 내용은 Cadence 서버에서 현재 권한을 검사해 제공하는 방식**을 권장한다.[S3][S6]
4. SSR 통합·DevUI 전환·중복/장애 복구·삭제 후 표시를 실제 계정에서 검증해야 한다.

이는 **기술 조사 완료이지 서비스 최종 채택 결정이 아니다**. 예산과 예상 사용량은 입력받지 않았으며 추정하지 않았다. 위 조건은 앱 영역에서 보완 가능한 것으로 보이고 문서상 Knock을 배제할 중대한 불가능 조건은 확인되지 않아 다른 공급자 비교는 확대하지 않았다. 반대로 “앱 측 권한 조회/전달 기록 없이 모든 요구 충족”이 필수라면 현재 조사로는 미충족이다.

## 요구사항별 근거와 적용 조건

| 요구사항 | 공식 기능 및 판단 | Cadence 적용 조건 |
| --- | --- | --- |
| 새 질문 → 담당 Instructor | `recipients` 배열로 사용자 ID 지정 가능.[S1] | 서버에서 담당 강사를 구하고 작성자를 제외한다. 대상이 없으면 trigger하지 않는다. |
| 답글 → 질문 작성자와 담당 Instructor | 여러 사용자 수신자 및 actor 지정 가능.[S1] | `unique([questionAuthorId, instructorId]) - actorId`. 답글 참여 이력으로 다른 Student를 추가하지 않는다. |
| 같은 사람이 두 조건에 해당 | API에 전달할 수신자를 앱이 구성할 수 있다.[S1] | 집합으로 먼저 중복 제거. 공급자가 중복 ID를 처리하는 방식에 의존하지 않는다. |
| 자기 알림 제외 | actor 자동 제외 설명은 Object의 subscriber인 경우다.[S1] | 직접 recipients에서도 서버가 명시적으로 제외한다. |
| 이벤트 재처리 중복 방지 | trigger에 `Idempotency-Key`, 동일 payload, 기본 24시간.[S2] | 이벤트와 수신자별 전달 단위의 안정된 키 및 영속 기록. 긴 결과 불명 상태는 자동 재전송하지 않고 확인한다. |
| 답글마다 한 항목 | workflow channel step이 메시지를 생성하며 FeedItem은 독립 ID/read 상태를 갖는다.[S6][S9] | 답글당 trigger, in-app step 하나, batch/throttle로 묶지 않는다. |
| 피드 저장·삭제된 원문 알림 유지 | 인앱 FeedItem은 무기한 조회 가능. 로그 보존 기간과 다르다.[S7] | 원문 삭제 시 메시지를 archive/delete하지 않는다. 사용자 계정 삭제와 원문 삭제는 별도 정책이다. |
| 패널을 열어도 읽지 않음 | `seen_at`과 `read_at` 분리, headless에서 직접 상태 변경 가능.[S4][S5] | 열 때 read 호출 없음. 열람 기록은 별도로 선택. 배지는 반드시 `unread_count`; 기본 unseen 배지와 혼동 금지. |
| 개별 읽음·모두 읽음 | `markAsRead(item)`, `markAllAsRead()` 지원.[S4] | 클릭으로 대화 이동할 때 개별 읽음. 전체 읽음은 로드된 페이지만이 아니라 현재 feed scope 전체이며 비동기 처리될 수 있다. |
| 실시간 배지·목록 | 관리형 WebSocket과 SDK 재연결, feed store 제공.[S4][S8] | 배지/목록만 갱신. Toast/음향 컴포넌트를 사용하지 않는다. 재연결 시 피드를 다시 조회해 수렴시킨다. |
| 커스텀 패널·항목 | headless React hooks 또는 `renderItem`/클릭 핸들러 지원.[S5][S10] | 사이드바 버튼과 overlay panel은 앱 UI. 작성자·역할·강좌/레슨·본문 최대 두 줄·시간 렌더링을 직접 통제한다. |
| 링크와 위치 강조 | `action_url`, custom click handler 지원.[S10] | 앱이 안전한 내부 목적지를 계산하고 대상 로드 후 scroll/highlight한다. 삭제/권한없음 결과를 구분한다. |
| 서버·클라이언트 인증 | 서버 secret API key, 클라이언트 public key + 서버 서명 JWT.[S3] | 서버 세션을 근거로 sub를 결정. 브라우저가 제출한 userId로 임의 발급 금지. |
| SSR 앱 | 공식 Next.js 예시는 클라이언트 UI와 서버 trigger를 분리한다.[S11] | 이는 Cadence SSR 런타임 호환성 검증 결과가 아니다. 브라우저 SDK 초기화 경계와 hydration을 별도 검증한다. |

## 설계 권장안: 책임 경계

아래는 공급자 기능 사실과 구별되는 **제안**이며 제품 구현이나 확정 ADR이 아니다.

### 1. 이벤트와 전달

- 질문/답글 저장 성공을 근거로 서버가 이벤트를 만들고 수신자를 계산한다. 클라이언트에서 workflow를 직접 trigger하지 않는다.
- 새 질문 수신 집합은 `{담당 Instructor} - {작성자}`. 답글 수신 집합은 `{질문 작성자, 담당 Instructor} - {작성자}`. 현재 권한상 알림을 받을 수 있는지도 서버가 판단한다.
- 질문/답글 DB 커밋과 전달 기록(outbox)을 원자적으로 남기는 안을 우선 검토한다. 외부 호출을 DB 트랜잭션 안에서 수행하는 대신 별도 전달 작업이 처리한다.
- 전달 레코드의 고유성은 `(eventId, recipientId, channelPurpose)`처럼 이벤트와 수신자에 묶는다. 재시도 시 수신자와 payload를 다시 계산해 바꾸지 않는다. 수신자별 trigger를 선택하면 부분 실패 추적이 단순해지며, 이 조사에서는 구현을 확정하지 않는다.
- 동일 요청에는 동일 멱등키를 사용한다. Knock은 성공한 2xx만 캐시하고 4xx/5xx는 캐시하지 않으며, 지원 endpoint는 workflow trigger뿐이다.[S2]
- `workflow_run_id`를 받았다는 사실은 처리 접수이지 사용자가 피드를 받거나 읽었다는 뜻이 아니다.[S1][S9]
- 기록 가능한 단계는 예를 들어 `pending → accepted → delivery-confirmed`와 `retryable / terminal / unknown`이다. 네트워크 timeout으로 결과가 불명인 경우 24시간 안에서는 같은 키로 재시도한다. **24시간이 지난 unknown을 새 키로 맹목 재전송하면 중복될 수 있다.** 영속 outbox만으로 외부 서비스와 exactly-once가 완성되는 것도 아니다. 확인 후 재전송 여부를 판단하는 운영 절차가 필요하다.

### 2. 재시도·실패·실시간 복구

- 공식 발송 파이프라인은 일시 오류에 지수 backoff+jitter로 30분 동안 최대 8회 재시도하고, 종료 실패는 `undelivered`/`bounced` 등으로 나타낸다. undelivered는 대시보드에서 수동 재시도 가능하다.[S9]
- 이 수치는 공급자 발송 파이프라인 설명이다. Cadence→trigger API의 재시도, 브라우저 WebSocket, 읽음 요청에 동일 보장을 적용해서는 안 된다.
- 앱→Knock 오류는 오류 유형에 따라 재시도/보류한다. 인증·schema 오류는 수정이 필요하며, 일시 네트워크·rate limit은 같은 키로 backoff한다. 실제 SDK의 기본 retry 정책은 설치 버전에 맞춰 확인한다.
- 저장은 성공했지만 알림 전달은 실패한 경우 원문 작성을 다시 수행하지 않는다. 전달 레코드와 workflow ID로 조사한다. 30일/90일 로그 만료 전에 필요한 최소 운영 기록을 보유하는 정책이 필요하다.[S7]
- socket은 알림 변화 신호이며 원문 데이터의 권한 판단 근거가 아니다. `new-message`에는 전체 메시지 내용이 없고 badge metadata가 포함되며 throttling될 수 있다.[S6] 새 이벤트나 재연결 시 feed와 표시 데이터를 재조회한다.
- 읽음 API는 낙관적 상태를 적용한다.[S4] 실패 시 에러 표시와 서버 재조회로 배지·목록을 정합화한다. 모두 읽음 중 신규 도착의 포함 시점과 여러 탭 동기화는 실계정 검증 대상으로 남긴다.

### 3. 인증, DevUI 사용자 전환, SSR

- production은 enhanced security를 활성화한다. 기본 off에서는 public key로 임의 사용자를 인증할 수 있다.[S3]
- 서버 secret key와 RS256 private signing key는 서버에만 둔다. 클라이언트에는 public key, feed channel ID, 현재 세션 사용자에 해당하는 만료 있는 JWT만 전달한다. `sub`는 Cadence의 안정된 사용자 ID에 맞춘다.
- `explicit_grants: true`와 필요한 feed read/write 권한만 부여하는 안을 검토한다. SDK의 사용자 조회/inline identify 사용에 추가 권한이 필요한지는 실제 버전으로 검증한다. JWT scope는 강좌 접근권한을 자동 추론하지 않는다.[S3]
- DevUI 전환 시작 시 기존 패널/목록/배지를 비우고 이전 feed listener를 정리한다. JS `teardown()`은 현재 세션과 socket을 해제한다.[S12] 새 세션이 확정된 뒤 새 사용자 JWT로 새 client/feed를 만든다. 늦게 도착한 이전 사용자의 HTTP 응답을 세션 세대값 또는 취소로 폐기한다. 사용자 ID만 prop으로 바꿨다고 캐시가 안전하게 격리된다고 가정하지 않는다.
- JWT 만료는 `onUserTokenExpiring`에서 현재 서버 세션을 재확인해 갱신할 수 있다. 다른 사용자로 바뀐 세션에 이전 사용자의 token을 다시 발급하지 않는다.[S3]
- SSR에서는 요청별 서버 인증, 비공개 토큰 응답의 사용자별 처리, 브라우저에서의 feed/socket 초기화를 분리한다. 서버 전역에 사용자별 client/store를 공유하지 않는다. SSR 초기 상태와 hydration 중 로딩/사용자 전환 표시를 일치시킨다.
- 공식 Next.js 예시는 클라이언트 컴포넌트 사용 가능성을 입증할 뿐 React Router SSR 빌드·번들·SDK 버전 호환성을 증명하지 않는다.[S11] 현재 앱 코드를 조사·수정하거나 실행하지 않았으므로 특정 loader/component 삽입 위치를 확정하지 않았다.

### 4. 삭제된 원문과 권한 변경 후 미리보기

**알림의 존재·읽음 상태와 표시 내용의 수명을 분리한다.**

Knock의 `data`는 feed payload에 포함되고 `blocks`에는 렌더링된 내용이 들어간다.[S6] 따라서 브라우저에서 미리보기를 CSS로 숨기거나 클릭한 다음 권한을 검사하는 것만으로는 내용 접근을 차단할 수 없다.

권장 후보 흐름:

1. Knock에는 비민감한 불투명 알림 참조와 중립적인 안내만 저장한다. 작성자 이름/역할, 강좌명, 레슨명, 본문을 `data`, `blocks`, actor 프로필에 넣어 직접 노출시키지 않는다. 어떤 참조/메타데이터까지 비민감으로 허용할지는 추가 결정이 필요하다.
2. 앱이 feed의 참조들을 서버에 보내면 서버는 **수신자 소유권과 현재 원문 접근 권한**을 검사하고 표시용 정보를 반환한다. 다른 사람의 notification ID를 가져오는 요청도 거부해야 한다.
3. 접근 가능하면 작성자·역할·강좌/레슨·서식 제거 본문·시간을 표시한다. 미리보기는 서버에서 plain text로 만들고 클라이언트는 텍스트 노드+두 줄 제한으로 표시한다. 공식 예제의 HTML 삽입을 본문 미리보기에 그대로 적용하지 않는다.
4. 원문이 삭제되면 feed 항목은 유지하고 “삭제된 내용” 상태를 표시한다. 서버가 유지한 최소한의 부모 대화 참조가 있고 권한도 있으면 대화로 이동한다. 질문 전체가 삭제되거나 권한이 없으면 이동 불가 사유를 제공한다.
5. 접근 권한이 없으면 본문뿐 아니라 작성자/강좌 정보도 필요 범위에서 가리고 중립 항목만 남긴다. 이미 브라우저에 전달했던 데이터까지 소급 회수할 수는 없다. 열려 있는 화면의 권한 변경 감지와 캐시 무효화 시점을 후속 설계에서 정한다.

미정: 삭제 후에도 **옛 본문 미리보기**를 남길지, 수정 전 snapshot인지 최신 내용인지, 어느 필드를 얼마 동안 보유할지. 현재 합의는 알림 유지이지 삭제된 본문 영구 보존 승인이 아니다. 옛 미리보기가 필요하다면 Cadence 측 보호된 snapshot/tombstone 저장과 보존 정책이 필요하며 이 문서에서 확정하지 않는다.

대안 경로로 backend proxy가 공식적으로 가능하지만 추가 지연이 있다.[S3] 이를 선택할 경우 REST뿐 아니라 실시간 업데이트와 badge 집계 흐름까지 설계해야 한다. tenant scope나 data 필터를 강좌별 동적 인가의 대용으로 쓰지 않는다. 이 조사에서는 Knock의 기존 메시지 본문을 임의 수정하는 API를 확인하지 못했으므로 삭제 이벤트마다 해당 API로 고친다고 가정하지 않는다.

## 가격과 사용량 판단 방법

출처: [공식 가격표][S13], 확인일 **2026-11-13**. USD 표기. 개인 예산·사용량·최종 플랜을 결정하지 않는다.

| 플랜 | 월 기본 요금 | 월 메시지 포함량 및 초과 | 별도 사용량 |
| --- | --- | --- | --- |
| Free | $0 | 최대 10,000 messages | guide recipients 최대 500, agent credits 최대 500 |
| Starter | $250 + 추가 사용량 | 50,000 포함, 초과 메시지당 $0.005 | guide recipients 2,500 포함 후 $0.05/명, agent credits 2,000 포함 후 $0.01/credit |
| Enterprise | 개별 견적·연간 계약 | 볼륨 가격, monthly notified user 방식 선택 가능 | 계약별 확인 |

- billable message는 **한 사용자에게 한 채널로 전달된 한 메시지**다. 같은 이벤트라도 수신자 두 명에게 in-app 하나씩 전달되면 두 메시지다. workflow trigger 수, 저장 프로필 수 또는 배지 조회 수를 메시지 수로 세지 않는다. bounce/전송 실패는 과금 메시지에서 제외된다.[S13]
- 이번 범위는 feed이며 guides(배너/팝업)와 agent 사용량을 혼동하지 않는다. 사용하지 않는다면 그 항목에 사용량을 더하지 않는다.
- Free는 신용카드 없이 시작 가능. 한도 초과를 hard cap하지 않고 결제 방법에 관해 연락한다고 FAQ에 명시한다. 이를 무료 무제한 또는 자동 지출 상한으로 해석하면 안 된다. 초과 때의 실제 계약/청구 방식은 계정에서 확인해야 한다.[S13]
- 저장 프로필·workflow·채널·feed retention은 공개 표에서 무제한. Knock branding 제거는 Starter 이상이다. custom UI가 무료라는 사실이 branding 제거 권리까지 뜻하지 않는다.[S13]
- 피드 무기한 보존과 운영 로그 보존을 구분한다. 비 Enterprise 로그는 일반적으로 30일, Enterprise 90일이며 API 로그는 모든 플랜에서 30일이다.[S7]

사용량 산식(예측값을 대입하지 않음):

```text
M = Σ 각 이벤트에서 실제로 전달된 고유 수신자 수 × 해당 수신자에게 전달한 채널 수
이번 범위의 채널 수 = in-app 1개
Starter feed-only 요금 = 250 + max(0, M - 50,000) × 0.005 USD / 청구 주기
```

합의한 정책상 새 질문은 담당 강사(작성자 제외), 답글은 질문 작성자와 담당 강사(중복/작성자 제외)만 세면 된다. 실제 이벤트 수, 역할 중복 비율, 제외 수, 성공 전달 수는 사용자 데이터/관측값으로 채운다. 최종 판단은 사용자가 제공하는 예산, 관측/예상 사용량, branding 조건과 계약을 함께 검토해야 한다. 세금·환율·계약 할인 및 향후 다른 채널 비용은 위 식에 포함하지 않는다.

## 실제 계정으로 남겨 둔 검증과 후속 쟁점

아래는 **미실행 검증 목록**이다. 가입·키 생성·유료 변경을 수행하지 않았다.

1. Student A 질문 → Instructor I 하나, Student B 답글 → A/I 각각 하나, A 답글 → I만, I 답글 → A만, A=I 등 역할 중복 시 이벤트당 한 번. B는 후속 답글 구독자가 되지 않음.
2. 동일 키·payload 재시도, payload 불일치, timeout 후 replay, 24시간 초과 unknown 조정. 앱의 장기 중복 기록과 부분 실패 복구.
3. 패널 열기만으로 unread 불변, 개별 클릭 읽음, 모두 읽음의 scope/비동기 완료/동시 신규 도착, 읽음 실패 후 재조회.
4. A→B→A DevUI 빠른 전환에서 이전 배지·목록·늦은 응답이 노출되지 않는지, JWT user mismatch/만료, socket 정리 및 재연결.
5. SSR build와 hydration, 설치할 `@knocklabs/react` 버전의 hook 이름/cleanup 동작, 다른 탭 동기화. 문서 예제 간 hook 이름과 기본 UI 동작 설명이 달라 설치 버전을 기준으로 확인한다.
6. 원문 삭제·질문 전체 삭제·Enrollment 상실·복구 때 알림 유지, 표시 내용과 이동의 현재 인가. 네트워크 응답에도 보호 정보가 없는지 확인한다.
7. 실제 계정의 요금표·Free 초과 청구·custom UI branding 의무·feed 보존 설정. dashboard 사용량과 전달 성공 수 대조.

후속 사람이 결정할 사항: 미리보기 snapshot/최신값/삭제 표기 정책, 권한 변경 감지 시점, 장기 unknown 전달 처리, 실제 사용량·예산에 따른 채택, 모바일/빈 상태/에러 UI. 조사 범위를 넘는 새 티켓은 만들지 않았다.

## 근거와 검증 범위

Context7에서 Knock 라이브러리를 먼저 resolve하고 `/websites/knock_app` 공식 문서 인덱스로 수신자·feed·인증을 조회한 뒤 해당 공식 원문을 직접 확인했다. 가격은 Knock 자체 가격표를 확인했다. 출처의 지원 기능과 이 문서의 Cadence 설계 제안은 구분했다.

- 적용 정책: AGENTS.md, issue-tracker, Wayfinder, research, illuwa-programming(책임/상태/효과 경계 및 evidence-matched verification).
- 변경은 이 조사 Markdown 하나. 제품 코드·설정·패키지 변경 없음. `app/` 변경이 없으므로 typecheck/test를 실행하지 않았으며 앱 동작 검증 통과를 주장하지 않는다.
- 검증: 문서 내 핵심 수치·API 명칭을 아래 원문과 대조, `git diff --check`, 커밋 변경 파일 확인, origin push 및 GitHub 티켓/맵 반영 확인.

## 공식 출처

모두 2026-11-13 확인. 내용 변경 가능성이 있으므로 실제 계약/구현 직전에 다시 확인한다.

[S1]: https://docs.knock.app/send-notifications/triggering-workflows/api
[S2]: https://docs.knock.app/api-reference/overview/idempotent-requests
[S3]: https://docs.knock.app/in-app-ui/security-and-authentication
[S4]: https://docs.knock.app/in-app-ui/javascript/sdk/feed-client
[S5]: https://docs.knock.app/in-app-ui/react/headless/feed
[S6]: https://docs.knock.app/in-app-ui/api-overview
[S7]: https://docs.knock.app/manage-your-account/data-retention
[S8]: https://docs.knock.app/in-app-ui/feeds/socket-behavior
[S9]: https://docs.knock.app/send-notifications/delivering-notifications
[S10]: https://docs.knock.app/in-app-ui/feeds/handling-interactivity
[S11]: https://docs.knock.app/getting-started/quick-start/nextjs
[S12]: https://docs.knock.app/in-app-ui/javascript/sdk/knock
[S13]: https://knock.app/pricing

- S1: Trigger API, recipients/actor/data、workflow run ID。
- S2: 멱등 요청 범위·24시간·성공 응답 캐시。
- S3: 공개/비공개 키, enhanced security, JWT/grants, proxy。
- S4: FeedClient, 읽음/열람/전체 읽음 및 optimistic 상태。
- S5: Headless UI, unread/seen 구분, compact/rich data。
- S6: FeedItem, badge metadata, socket 신호, data/blocks 노출。
- S7: 피드 무기한 보존과 로그 만료 구분。
- S8: SDK socket 재연결과 동기화 옵션。
- S9: 발송 retry/상태/수동 재시도。
- S10: 클릭/URL 처리。
- S11: 공식 SSR 프레임워크 통합 예시의 클라이언트/서버 분리。
- S12: JavaScript 인증·teardown。
- S13: 공개 요금표·과금 단위·Free 초과·branding。
