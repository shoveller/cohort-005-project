# Novu Cloud 수강생 인앱 알림 조사

- 조사일: 2026-11-14
- 연구 티켓: [Novu Cloud의 인앱 알림 기능·React 연동·비용 조사 #15](https://github.com/shoveller/cohort-005-project/issues/15)
- 지도: [Cadence 수강생 인앱 알림: 정책·외부 서비스·화면 결정 지도 #13](https://github.com/shoveller/cohort-005-project/issues/13)
- 저장소 기준: `979e28535d8b0ddd32b7241e51423c9a381879ad`
- 범위: 공식 공개 문서, 가격표, 배포 패키지 메타데이터 조사. 서비스 가입·결제·실제 알림 전송·제품 구현은 수행하지 않았다.

## 결론

**Novu Cloud는 요구된 외부 호스팅형 알림 저장·조회·읽음 상태와 커스터마이징 가능한 React Inbox를 제공한다.** 공식 문서상 무료 플랜에서 실제 Cloud 연동을 검증할 수 있다. 현재 저장소 React 버전은 SDK의 peer dependency 범위 안에 있다. 다만 React Router 8.3의 SSR·hydration 및 실제 사용자 전환 동작까지 검증된 것은 아니다. [S1][S2][S3][S4][S7]

이는 기술·비용 후보 조사 결과이며 서비스 채택 결정이 아니다. 질문 답변·환불 결과 등을 실제로 어느 조건에서 누구에게 보낼지, 필요한 보존 기간과 UI 형태는 사용자 결정으로 남긴다.

## 1. 확인된 기능과 UI 선택 여지

| 요구 | 확인된 내용 | 근거 |
| --- | --- | --- |
| 호스팅형 저장·조회 | Cloud가 관리형 인프라를 제공하며 Inbox는 Novu 서비스에서 사용자 알림을 가져온다. 플랜별 Inbox feed 보존 기간이 명시되어 있다. | [S1][S3][S4] |
| 읽음 상태 | 읽음 처리와 사용자 설정 변경이 Novu 백엔드에 동기화되고 실시간 미읽음 수를 표시한다. React API에는 읽음/미읽음, 보관/보관 해제 UI가 있다. | [S1][S2] |
| 기본 UI | 벨, 목록, preferences, 탭·필터·현지화 등을 제공한다. | [S1] |
| 커스텀 UI | appearance의 색상·서체·요소 스타일·아이콘 변경, Notifications/InboxContent 조합, renderNotification 등 렌더 함수, headless hooks 또는 JS SDK 사용이 가능하다. | [S1][S2] |
| 클릭 후 이동 | `routerPush`로 앱의 라우터 이동 함수에 연결하는 공식 React Router 예제가 있다. | [S7] |
| 브랜딩 | 무료에서는 Novu 브랜딩 제거 토글이 비활성화된다. 유료에서 제거할 수 있다. | [S6] |

벨 팝오버·별도 목록·자체 UI 중 무엇을 쓸지는 이 연구로 정하지 않는다. 기본 기능 존재와 Cadence에서의 적절한 사용자 경험은 별개의 판단이다.

## 2. 서버 트리거·사용자 식별·인증

- 서버는 `@novu/api`의 `Novu({ secretKey })`와 `trigger({ workflowId, to, payload })`, 또는 `POST /v1/events/trigger`를 사용한다. HTTP 인증은 `Authorization: ApiKey <secret>`다. 프런트에서 비밀 키로 직접 호출하는 구조가 아니다. [S8]
- `subscriberId`는 앱 사용자의 고유 식별자에 연결한다. 공식 quickstart는 기존 인증 시스템/DB 사용자 ID 사용을 안내하며, Inbox에 없는 ID를 전달하면 subscriber가 자동 생성된다고 설명한다. [S7]
- `applicationIdentifier`는 환경별 공개 식별자다. 이것과 subscriber ID만으로는 타인의 ID를 추측한 접근을 방어하지 못한다. HMAC을 켜고, 서버가 로그인 사용자에 대해 `HMAC-SHA256(secretKey, subscriberId)`의 lowercase hex를 생성해 `subscriberHash`로 전달하는 방식이 공식 운영 절차다. HMAC 활성화 후 hash 누락 시 Inbox가 로드되지 않는다. [S5][S6]
- 따라서 Cadence의 서버 인증이 실제 수신자 ID를 결정해야 한다는 것은 **통합 시 필요한 조건**이다. 브라우저가 임의로 요청한 ID에 서명해 주면 안 된다. 학생/강사 권한과 질문·환불 소유권 정책은 Novu가 대신 결정하지 않는다.
- HMAC은 서명 인증이다. 문서에서 “encryption”이라고 부르더라도 알림 본문 암호화나 Cadence의 업무 권한 검사를 대신한다는 의미로 해석하지 않는다. [S6]
- 재시도에는 `Idempotency-Key`가 제공된다. 다만 **모든 조직에 기본 활성화된 기능은 아니며 support 문의가 필요할 수 있다.** 성공/오류 응답 캐시는 24시간, 처리 중 요청은 5분이다. 동일 키 처리 중에는 409, 본문을 바꾸면 422가 된다. `transactionId`는 API 경계에서 같은 과금·중복 방지를 보장하지 않는다. [S8]

정확한 전송 위치, DB 변경과 전송의 원자성, 재시도 큐, 24시간 이후 중복 정책은 후속 구현 계획에서 결정해야 한다. 기능 존재만으로 exactly-once 전달이 보장된다고 결론 내리지 않는다.

## 3. 개발·운영 환경 분리

- 기본 Development/Production 2개 환경이 제공된다. 환경별로 application identifier, API secret key, subscribers, integrations, topics, activity feed 등이 분리된다. [S5]
- workflow/layout/translation은 Development에서 변경한 후 다른 환경으로 publish한다. Development에만 있는 workflow를 Production 키로 실행할 수 없다. publish에는 Admin 또는 Owner 역할이 필요하다. [S5]
- 사용자 ID가 같더라도 환경별 subscriber 리소스는 별개다. 로컬 개발은 Development의 공개 ID와 서버 키를 한 쌍으로 설정하는 것이 가능한 검증 방식이다. [S5]
- Free/Pro는 2개 환경, Team은 최대 10개, Enterprise는 무제한 환경을 가격표에 명시한다. 별도 staging/QA 환경이 필요하면 유료 등급 조건이 달라진다. [S3][S5]
- **데이터 격리와 사용량 격리는 다르다.** Development/Production/custom 환경의 workflow runs는 조직 단위 월 사용량으로 합산된다. [S4]

## 4. 무료·체험·유료 전환과 제한

조사 당일 공식 가격표 기준이다. 계약 시 가격과 계정의 entitlement를 다시 확인한다. [S3][S4]

| 항목 | Free | Pro | Team |
| --- | --- | --- | --- |
| 월 기본 가격 | $0 | $30부터 | $250부터 |
| 포함 workflow runs | 10,000 | 30,000+ | 250,000+ |
| 초과 단가 | 추가 사용 불가 | 1,000회당 $1.20 | 1,000회당 $1.20 |
| workflow 수 | 5 | 20 | 100* |
| 환경 수 | 2 | 2 | 최대 10 |
| Inbox feed 보존 | 30일 | 90일 | 90일 |
| Activity feed 보존 | 24시간 | 7일 | 90일 |
| 팀 구성원 | 최대 3명 | 3명 | 무제한 |
| 브랜딩 제거 | 불가 | 가능 | 가능 |

`100*`는 가격표의 표기를 그대로 보존했다. 세부 예외나 계약상 적용 조건은 확인하지 않았다. Enterprise는 별도 견적이며 custom retention을 제공한다. 무료 24시간 보존이라는 문구는 **운영 Activity feed**에 대한 것으로, **사용자의 Inbox 30일 보존**과 혼동하면 안 된다. [S3]

### 과금 단위

workflow run은 **한 subscriber에 대한 workflow 1회 실행**이다. 한 workflow의 여러 단계나 채널 수를 각각 과금하지 않는다. Topic fan-out도 실제 조건에 맞아 실행된 subscriber마다 run이 생긴다. 따라서 수강생 1,000명에게 같은 workflow를 한 번씩 실행하면 1,000 runs라는 계산이다. 월 예상 비용은 이벤트 종류 수만이 아니라 실제 수신자 수와 개발 실행량을 포함해야 한다. [S4]

공식 가격표는 Free를 포함한 subscriber 수를 Unlimited로 표시하며, billing FAQ는 “paid plans에서 unlimited”라고 표현한다. 과금 단위가 subscriber 수가 아니라는 점은 일치한다. 무료의 대규모 subscriber 운영 가능 여부가 중요해지면 계정에서 재확인한다. [S3][S4]

### 실제 테스트 조건 및 중단 동작

- Free는 신용카드 없이 월 10,000 runs를 제공한다. 기간 제한형 체험만 존재하는 서비스가 아니다. React quickstart는 계정 생성 → SDK 연결 → In-App workflow 생성 → Dashboard Test Workflow → 앱 Inbox 수신 확인 절차를 제공한다. 따라서 공개 조건상 실제 연동 시험이 가능하다. [S4][S7]
- Free는 10,000회에 도달하면 새 실행을 중단하고 HTTP 402를 반환한다. 다음 주기 초기화 또는 유료 업그레이드가 필요하다. [S4]
- 별도로 **14일 Pro trial**이 있으며 30,000회에 도달하면 402로 중단되고 유료 전환이 필요하다. 공개 billing 문서만으로 trial 가입 자격, 카드 요구 여부, 만료 시 자동 전환/청구 여부는 확정할 수 없다. 무료 플랜의 “카드 불필요”를 trial에도 적용하지 않는다. [S4]
- 유료 Pro/Team은 기본적으로 초과 사용을 막지 않고 on-demand 과금한다. usage limit와 pause at limit를 켠 경우 제한에서 402로 중단할 수 있다. [S4]
- Free의 API 제한은 Events 60 RPS, Configuration 20 RPS, Global 30 RPS다. 일반 요청은 1 token, bulk는 항목 수와 무관하게 100 tokens를 소비하므로 초당 요청 수와 일괄 전송량을 혼동하면 안 된다. 초과 시 429와 Retry-After가 제공된다. [S9]

무료 월량, workflow 5개, 브랜딩, 30일 Inbox 보존을 넘는 요구가 생기면 유료 검토가 필요하다. 90일보다 긴 알림 기록이 필요한지, 추가 환경·RBAC가 필요한지는 사용자 정책에 달려 있다. 알림함을 환불/구매 업무 기록의 영구 저장소로 볼 수는 없다.

## 5. 저장소 실제 버전과 호환성 근거

기준 commit의 [`package.json`](https://github.com/shoveller/cohort-005-project/blob/979e28535d8b0ddd32b7241e51423c9a381879ad/package.json) 및 [`package-lock.json`](https://github.com/shoveller/cohort-005-project/blob/979e28535d8b0ddd32b7241e51423c9a381879ad/package-lock.json)을 확인했다.

| 패키지 | package.json 선언 | package-lock.json 고정 값 |
| --- | --- | --- |
| react | ^19.2.7 | 19.2.8 |
| react-dom | ^19.2.7 | 19.2.8 |
| react-router | 8.3.0 | 8.3.0 |
| @react-router/dev | 8.3.0 | 8.3.0 |

조사 시 `npm view @novu/react version peerDependencies engines --json` 결과는 아래와 같다. 앱에 패키지를 설치하지 않았다. 배포 메타데이터 원문은 [S10]이다.

```json
{
  "version": "3.19.2",
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0 || ^19.0.0-0",
    "react-dom": "^18.0.0 || ^19.0.0 || ^19.0.0-0"
  }
}
```

- **확인:** React 19.2.8/react-dom 19.2.8은 SDK peer 범위를 만족한다. 공식 SDK 문서도 React 18 및 19 지원을 명시한다. [S2][S10]
- **제한적인 근거:** 공식 React quickstart에는 `routerPush={(path) => navigate(path)}`와 React Router 연동 예제가 있다. SDK peer 목록에는 React Router 버전 제약이 없다. [S7][S10]
- **미확인:** 문서 예제는 `react-router-dom`을 import하지만 이 저장소는 `react-router` 8.3.0을 직접 사용한다. 공식 예제가 이 버전의 framework mode/SSR을 검증했다고 볼 근거는 없다. 실제 build·SSR·hydration·navigate 연결·사용자 교체는 후속 prototype에서 확인해야 한다.
- 공식 React API 표에 `backendUrl`이 나오고 사용 예제에는 `apiUrl`이 나오는 표기 차이도 관찰했다. 지역 endpoint를 설정할 때 설치한 고정 버전의 타입 선언을 최종 확인해야 한다. [S2][S6]

## 6. 후속 검증 및 사용자 결정에 의존하는 조건

### 아직 실행하지 않은 연동 검증

1. Free 조직에서 Development In-App workflow 하나를 생성하고, 테스트 subscriber 두 명으로 수신자별 분리·목록 조회·읽음 후 새로고침 지속성을 확인한다.
2. HMAC 활성화 후 올바른 사용자 hash는 성공하고, 누락·다른 사용자 hash는 거절되는지 확인한다.
3. React Router 8.3에서 SSR/hydration, 내부 링크 이동, 로그아웃 및 개발 UI 사용자 교체 후 캐시/연결 해제를 확인한다.
4. Dev/Prod 같은 ID가 다른 알림함을 갖는지, 환경별 키와 publish 절차가 맞는지 확인한다.
5. idempotency entitlement를 확인하고, 지원된다면 동일 키 재시도에서 한 번만 생성되는지 확인한다. 월량 한도를 실제 소진하지 않고 402/429 오류 처리는 별도 검증한다.
6. 실제 무료 계정의 Inbox retention·브랜딩·사용량 화면과 체험 신청 조건을 확인한다.

이 항목들은 “연구 실패”가 아니라 문서 조사와 실제 통합 검증의 경계다. 이번 결과만으로 전송 성공이나 배포 호환성을 주장하지 않는다.

### 사용자에게 남는 결정

- 질문 답변·환불 결과 등 어떤 이벤트와 수신자 정책을 선택할지.
- 필요한 Inbox 보존 기간, 월 수신자별 실행량, 무료 한도에서 중단을 허용할지.
- Novu 브랜딩 허용 여부, 기본/조합/headless UI 선택, 읽음과 이동의 의미.
- US/EU 중 데이터 지역 및 추가 환경 필요 여부. 가격표는 Free에도 US/EU를 제공한다. [S3]
- Novu와 다른 후보 중 최종 서비스 선택.

## 출처

모두 2026-11-14 조회. Context7로 공식 Novu 문서를 탐색한 후 부족한 부분은 공식 페이지 원문을 직접 확인했다. 가격·정책·latest 버전은 이후 바뀔 수 있다.

- [S1] [Inbox overview](https://docs.novu.co/platform/inbox/overview)
- [S2] [React SDK API](https://docs.novu.co/platform/sdks/react)
- [S3] [Novu 공식 가격표](https://novu.co/pricing/)
- [S4] [Billing: 과금 단위·무료/체험 한도·초과 동작](https://docs.novu.co/platform/account/billing)
- [S5] [Environments](https://docs.novu.co/platform/developer/environments)
- [S6] [Prepare for production: HMAC·브랜딩](https://docs.novu.co/platform/inbox/prepare-for-production)
- [S7] [React quickstart](https://docs.novu.co/platform/quickstart/react)
- [S8] [Idempotency: 서버 SDK 예제·인증·제한](https://docs.novu.co/api-reference/idempotency)
- [S9] [Rate limiting](https://docs.novu.co/api-reference/rate-limiting)
- [S10] [@novu/react 3.19.2 배포 메타데이터](https://registry.npmjs.org/@novu%2freact/3.19.2)

## 기록 검증

문서 변경만 수행했다. 원문 출처와 수치, package 선언과 lock 고정 값을 대조하고 `git diff --check`로 공백 오류를 검사했다. `app/` 변경이 없어 프로젝트 지침의 app 변경용 typecheck/test는 실행하지 않았다.
