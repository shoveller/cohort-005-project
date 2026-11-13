# Knock 수강생 인앱 알림 조사

- 조사일: 2026-11-14
- 연구 티켓: [Knock의 인앱 알림 기능·React 연동·비용 조사 #16](https://github.com/shoveller/cohort-005-project/issues/16)
- 지도: [Cadence 수강생 인앱 알림: 정책·외부 서비스·화면 결정 지도 #13](https://github.com/shoveller/cohort-005-project/issues/13)
- 저장소 조사 기준: `979e28535d8b0ddd32b7241e51423c9a381879ad`
- 범위: 공개 공식 문서, 공급자 SDK 소스 및 npm 배포 메타데이터 조사. 계정 생성·실제 알림 전송·앱 통합 테스트는 수행하지 않았다.

## 결론

**Knock은 알림 저장·조회·읽음 상태를 외부 서비스에 맡기면서 React UI를 직접 구성할 수 있는 후보다.** 호스팅형 Feed API, 실시간 업데이트, 상태 변경 API, 완성형 컴포넌트와 headless hooks가 공개되어 있다. Free 플랜으로 실제 인앱 연동을 검증할 수 있는 제품 조건도 확인했다. 서비스 선택과 UI 선택은 사용자에게 남긴다. [S1][S2][S3][S4][S5]

확인 수준을 다음과 같이 구분한다.

| 구분 | 판단 |
| --- | --- |
| 확인된 사실 | 인앱 피드 저장·조회·읽음/안읽음·보관 상태, React UI 커스터마이징, 환경별 데이터·키 분리, 무료 월 10,000건, React 19 peer 지원 |
| 근거에 따른 판단 | 수강생 대상 알림을 저장하고 노출하는 기술적 후보 조건은 충족한다. 현재 앱 React 선언 버전은 SDK 지원 범위 안이다. |
| 미확인 | 실제 계정의 청구 조건·기능 활성화, React Router 8.3.0 SSR/hydration·라우팅, 토큰 갱신·사용자 전환·네트워크 복구의 실제 통합 동작 |
| 사용자 정책 의존 | 이벤트·수신자, 읽음 기준·배지 의미, UI 형태, 브랜딩 허용 여부, 예산·보관 기간, 서비스 최종 선택 |

## 1. 호스팅형 저장·조회·읽음 상태

- Knock의 in-app feed channel이 알림을 생성하고 Feed API로 사용자별·채널별 피드를 조회한다. 별도 외부 이메일 공급자를 붙이지 않고 Knock이 인앱 전달을 관리한다. 조회 경로는 `GET /v1/users/:id/feeds/:channel_id`다. [S1][S2][S6]
- 메시지 상태는 `seen`과 `read`가 구분된다. 상태 변경 API로 읽음·안읽음·확인·미확인·보관 및 복구를 처리할 수 있다. 기본 UI는 피드를 열면 seen으로 처리하고, 항목 클릭 또는 모두 읽음으로 read를 처리한다. 배지는 기본적으로 **unseen** 기준이며 `badgeCountType="unread"`로 바꿀 수 있다. 따라서 “피드를 열면 모두 읽음”은 서비스의 필수 규칙이 아니다. [S1][S2][S3]
- Feed UI는 websocket 기반 실시간 업데이트를 제공한다. headless UI는 `useNotifications`, `useNotificationStore`로 항목과 카운터를 읽고 seen/read 처리를 직접 연결한다. [S4][S7]
- 인앱 피드는 무기한 조회할 수 있고 로그 보관 기한이 지나도 FeedItem 조회와 상태 변경이 가능하다. Free/Starter의 **로그 보관 30일**을 **피드 보관 30일**로 해석하면 안 된다. Enterprise 로그는 90일, API 로그는 모든 플랜 30일이다. [S5][S8]
- 발송된 알림의 본문·메타데이터는 수정할 수 없다. 내용이 오래되었으면 보관 처리 후 새 workflow를 트리거해야 한다. 환불 상태 정정이나 답변 수정 시 재알림 정책을 정할 때 고려해야 한다. [S1]

## 2. React UI와 한국어

현재 안내되는 SDK는 `@knocklabs/react`다. 이전 `@knocklabs/react-notification-feed`에는 마이그레이션 문서가 별도로 있다. 기본 feed/popover, toast, inbox 또는 완전한 커스텀 UI를 만들 수 있으므로 이번 조사로 화면 형태를 고정할 필요는 없다. [S9]

커스터마이징 근거:

- `--rnf-*` CSS 변수와 `rnf-*` 클래스 스타일 교체.
- `renderItem`으로 알림 항목 교체, 아바타·아이콘·배지·라이트/다크 모드 변경.
- `onNotificationClick`, `onNotificationButtonClick`으로 클릭 동작 연결.
- headless hooks와 Feed API로 직접 화면 구성. 이 경우 seen/read 동작도 앱이 연결한다. [S3][S4][S10]

**한국어 UI와 Enterprise 번역 기능은 구분해야 한다.** React 컴포넌트 문구는 `KnockProvider`의 `i18n.translations`와 `locale`로 지정할 수 있지만 기본 제공 언어는 영어뿐이다. 요금표의 Enterprise 전용 Translations(i18n)는 Knock 템플릿 번역 관리 기능을 가리킨다. 한국어 UI 커스텀 문구 기능만을 근거 없이 Enterprise 필수로 분류하지 않는다. 무료 계정의 최종 한국어 화면과 날짜 표시는 통합 검증 대상으로 남긴다. [S3][S5][S6]

## 3. 서버 트리거와 수신자 식별

서버는 secret API key로 workflow trigger를 호출하고, `key`, `recipients`, `data`를 전달한다. `actor`, `tenant`, `cancellation_key` 등도 지정할 수 있다. 응답 `workflow_run_id`는 실행 식별자이며 실제 사용자 화면 표시를 검증한 증거는 아니다. [S2][S11]

수신자는 미리 identify한 사용자 ID 또는 inline recipient로 전달한다. inline identification은 workflow 실행 전에 사용자를 식별한다. 사용자 필수 필드는 `id`뿐이며 인앱 전용 수신자에게 이메일은 필수가 아니다. ID에는 내부의 안정적인 식별자를 쓰는 것이 공식 권장이다. ID는 최대 256자, `/`·`#` 불가, 생성 후 변경 불가다. 각 환경의 사용자는 서로 분리되어 있다. [S11][S12]

트리거 API의 제약과 지원:

- 한 호출에 최대 1,000명. [S11]
- `Idempotency-Key`로 24시간 내 동일 요청 재시도 시 동일 응답 반환; 동일 키의 다른 파라미터는 오류. 24시간을 넘는 중복 방지까지 보장하는 장치는 아니다. [S11]
- 알림 payload의 전체 `data` 크기는 10MB 제한. [S11]

Cadence 적용 판단: 질문 답변·환불 결과가 실제로 확정된 서버 시점에서 수신 학생 ID를 결정하여 trigger하는 흐름을 구성할 수 있다. 그러나 어떤 이벤트를 언제 확정하는지, 답변 작성자 자신을 제외할지, 다중 수신자를 허용할지, DB 변경과 외부 전송 실패 사이를 어떻게 처리할지는 이 연구가 결정하지 않는다. Knock은 앱의 수강 권한·이벤트 정책을 대신 판정하지 않는다.

## 4. 인증과 환경 분리

| 용도 | 공식 모델 |
| --- | --- |
| 서버 전송 | 환경별 secret API key |
| 브라우저 피드 | 환경별 public API key, 사용자 ID, feed channel ID |
| 운영 사용자 인증 | enhanced security mode를 켜고 서버가 서명한 사용자 JWT 추가 |
| JWT | RS256, 필수 `sub`, 권장 `iat`·`exp`; private signing key는 서버에서 사용 |
| 토큰 갱신 | `onUserTokenExpiring` callback을 통해 서버에서 갱신 가능 |
| 접근 범위 | `explicit_grants`와 `user/feed_read`, `user/feed_write` 등의 grants로 제한 가능 |

기본 enhanced security mode는 꺼져 있다. 이 상태에서는 public key로 임의 사용자를 인증할 수 있으므로 운영에서는 켜도록 공식 문서가 명시한다. 서버는 현재 앱 세션의 사용자 ID에 대해 JWT를 발급하고, 브라우저에는 secret API key나 signing key를 전달하지 않는 모델이다. 이는 실제 키를 읽지 않고 공개 인증 문서로 확인했다. [S2]

계정은 현재 문서 기준 **production 하나로 시작**한다. owner/admin 등이 environments를 활성화하면 development가 생기고 추가 staging 등을 만들 수 있다. 활성화 후 끌 수 없다. 환경마다 users/messages/logs 등의 데이터와 API key가 분리된다. workflows 등은 commit/promotion 대상으로 관리된다. “가입하면 dev/prod가 이미 모두 준비됨”을 전제로 삼지 않는다. Free에도 isolated environments는 무제한으로 표시된다. [S5][S13]

로컬 테스트 사용자와 운영 사용자는 서로 다른 Knock 환경에서 identify하면 분리 가능하다. 개발자별 ID namespace나 별도 환경을 둘지는 팀 정책이다. 이 격리는 비용 면제를 뜻하지 않는다.

## 5. 무료 검증과 유료 전환

2026-11-14에 조회한 공식 가격표 기준이며, 계약·대시보드의 실제 조건은 가입 또는 결제 직전에 다시 확인해야 한다. 통화는 USD다. [S5][S6]

| 항목 | Free | Starter | Enterprise |
| --- | --- | --- | --- |
| 기본 가격 | $0/월, 카드 불필요 | $250/월 + 추가 사용량 | 개별 견적 |
| 메시지 | 월 최대 10,000 | 월 50,000 포함, 이후 $0.005/건 | 볼륨별 협의 |
| Guide recipients | 월 최대 500 | 월 2,500 포함, 이후 $0.05/명 | 협의 |
| Agent credits | 월 최대 500 | 월 2,000 포함, 이후 $0.01/credit | 협의 |
| 피드 API·기본 UI·자체 UI | 제공 | 제공 | 제공 |
| 프로필·workflow·채널·환경 | 무제한 | 무제한 | 무제한 |
| Knock 브랜딩 제거 | 불가 | 가능 | 가능 |
| 로그 보관 | 30일 | 30일 | 90일 |
| 템플릿 Translations(i18n) | 미제공 | 미제공 | 제공 |

과금 단위는 **성공적으로 사용자 한 명에게 채널 하나로 전달한 메시지 한 건**이다. workflow trigger 횟수 자체가 아니다. 인앱만 100명에게 한 건씩 전달하면 100건이며, 같은 수신자에게 인앱과 이메일을 보내면 2건이다. 피드 열람·read 갱신을 메시지 전송과 동일하게 계산한다고 문서에 쓰여 있지는 않다. Guides는 별도 사용량 체계이며 이번 영속적 알림 피드의 사용량과 혼동하면 안 된다. [S5][S6]

### 무료 한도를 넘으면

공식 FAQ는 결제수단 없이 무료 한도를 초과해도 메시지를 hard cap하지 않고, 다음 달 결제수단 등록을 위해 연락한다고 설명한다. 이는 무제한 무료나 초과요금 면제 약속이 아니다. 초과분 소급 청구 여부·유예 기간·연락 후 전환 시점은 확인한 공개 문서에서 구체적으로 보장되지 않아 지원팀 또는 실제 청구 화면 확인이 필요하다. [S5]

유료 업그레이드 시 그 날짜가 청구 주기의 기준일이 되고 플랫폼 기본료가 즉시 청구된다. 사용량 초과분은 후불이다. 메시지량뿐 아니라 브랜딩 제거 또는 Enterprise 기능 필요 여부도 전환 요인이 된다. [S5]

예산 예시(인앱 메시지만, 추가 유료 기능·별도 계약 없음): 월 60,000건이면 Starter 기준 `$250 + (60,000 - 50,000) × $0.005 = $300`이다. 실제 예상량은 선택 이벤트 수 × 수신자 수에 개발 테스트 전송을 더해 산정해야 한다. [S5][S6]

### 실제 테스트 가능 조건

Free는 기간 제한 trial이 아니라 평가·소규모 운영용 플랜으로 표시되며 카드 없이 가입할 수 있다. Feed API·완성형 컴포넌트·자체 UI·end-to-end testing을 포함하므로 공개 제품 조건상 실제 연동 검증이 가능하다. 다만 **이번 조사에서 실제 계정 또는 end-to-end 전송을 검증한 것은 아니다.** [S5]

특히 인앱 채널에는 sandbox mode가 지원되지 않는다. Knock이 직접 인앱 전달을 처리하기 때문이다. 개발 환경 전송도 사용량에 포함될 수 있으며 channel conditions로 테스트 수신자를 제한해야 한다. 일반적인 sandbox 설명만 보고 “무료 사용량과 무관하게 인앱 무제한 시험 가능”이라고 판단하면 안 된다. [S6]

후속 검증 최소 범위(아직 실행하지 않음):

1. Free 계정에서 environments를 활성화하고 development에 인앱 채널·workflow를 만든다.
2. 가상 학생 두 명을 identify하고 한 학생에게 실제 서버 trigger를 보낸다.
3. 피드 조회·실시간 수신·새로고침 후 읽음 상태 지속·다른 학생 미노출을 확인한다.
4. enhanced security mode에서 토큰 누락·다른 사용자 요청 거부와 정상 토큰 갱신을 확인한다.
5. 현재 앱의 SSR/hydration·로그아웃/학생 전환·라우트 이동·오프라인 복구를 확인한다.
6. 청구 화면에서 사용량 증가와 무료 플랜 브랜딩·기능 제한을 확인한다.

## 6. 현재 저장소와 SDK 호환성

조사 시 `package.json`을 직접 읽었다. lockfile의 실제 설치 버전과 혼동하지 않고 **선언된 의존성**을 기록한다. [S14]

| 패키지 | 저장소 선언 |
| --- | --- |
| `react`, `react-dom` | `^19.2.7` |
| `react-router` | `8.3.0` |
| `@react-router/node`, `@react-router/serve`, `@react-router/dev` | `8.3.0` |
| `vite` | `^7.1.7` |

조회한 npm 최신 `@knocklabs/react`는 **0.15.1**이었다. 배포 메타데이터의 `gitHead`는 `f24c79feebed3d817d7145c379ff3c8fd5ee8cae`이며 해당 공식 소스의 package.json과 대조했다. [S15][S16]

- React/React DOM peer: `^17.0.0 || ^18.0.0 || ^19.0.0`. 앱의 `^19.2.7`은 지원 범위 안이다.
- Next 및 `@tanstack/react-router`는 **optional peers**다. TanStack Router는 이 저장소의 `react-router`와 다른 패키지이며, 그 optional peer를 React Router 8 공식 지원 선언으로 해석하지 않는다.
- SDK는 ESM/CJS/types 및 일반 React entrypoint를 제공한다. React Router 8.3.0 전용 peer나 adapter 지원을 확인하지 못했다.
- 공식 feed는 click handler와 action URL을 지원하므로 앱 라우팅과 연결할 수 있는 확장점은 있다. 현재 앱의 client-side navigation·SSR·hydration까지 검증되었다는 뜻은 아니다. [S3][S15]

**호환성 결론: React 버전은 명시적 지원 범위, React Router 조합은 실제 통합 검증 필요.** 이번에는 의존성 설치나 앱 변경을 하지 않았다. Markdown만 추가하므로 `app/` 변경 시 요구되는 typecheck/test 대상 변경은 없다.

재현용 읽기 명령:

```sh
npm view @knocklabs/react version peerDependencies repository --json
npm view @knocklabs/react@0.15.1 peerDependenciesMeta dist.integrity gitHead --json
```

## 7. 다음 결정에 남기는 조건

- 사용자가 질문 답변·환불 결과 등 이벤트, 수신자, 발생 조건을 먼저 확정한다.
- 읽음과 확인을 구분할지, 배지는 unseen/unread 중 무엇인지 정한다.
- Free 브랜딩을 허용할지와 월 메시지 예산을 정한다. headless 사용이 브랜딩 제한 우회 권한을 준다고 가정하지 않는다. headless에 적용되는 구체적 표기 의무는 지원팀 확인 대상으로 남긴다.
- 피드 보관 기간과 정정 알림 처리 정책을 정한다. 가격표는 피드 보관 설정 가능이라고 표시하지만 데이터 보관 문서는 커스텀 retention window를 일반적으로 지원하지 않는다고 쓰므로, **무기한 기본 보관은 확인**, **사용자 지정 자동 만료 방식·적용 대상은 추가 확인**으로 구분한다. [S5][S8]
- 검증 계정 준비 후 위 통합 검증을 수행한다. 이 조사 결과는 서비스 최종 선택 또는 구현 완료 선언이 아니다.

## 공식 근거

아래 웹 문서는 조사일에 직접 조회했다. SDK 버전 관련 근거는 변경 가능한 main 대신 commit 또는 명시 버전을 함께 기록했다.

- [S1] [In-app feeds](https://docs.knock.app/integrations/in-app/feeds)
- [S2] [Security and authentication](https://docs.knock.app/in-app-ui/security-and-authentication)
- [S3] [React feed: UI overrides, interactions, localization](https://docs.knock.app/in-app-ui/react/feed)
- [S4] [React headless feed](https://docs.knock.app/in-app-ui/react/headless/feed)
- [S5] [공식 가격표와 FAQ](https://knock.app/pricing)
- [S6] [Knock plans and usage](https://docs.knock.app/manage-your-account/knock-plans)
- [S7] [Handling interactivity](https://docs.knock.app/in-app-ui/feeds/handling-interactivity)
- [S8] [Data retention](https://docs.knock.app/manage-your-account/data-retention)
- [S9] [Knock React SDK](https://docs.knock.app/in-app-ui/react/sdk/overview)
- [S10] [Feed styling](https://docs.knock.app/in-app-ui/feeds/styling)
- [S11] [Triggering workflows via API](https://docs.knock.app/send-notifications/triggering-workflows/api)
- [S12] [Users](https://docs.knock.app/concepts/users)
- [S13] [Environments](https://docs.knock.app/version-control/environments)
- [S14] [조사 기준 저장소 package.json](https://github.com/shoveller/cohort-005-project/blob/979e28535d8b0ddd32b7241e51423c9a381879ad/package.json#L23-L67)
- [S15] [Knock SDK 0.15.1 공식 소스 package.json](https://github.com/knocklabs/javascript/blob/f24c79feebed3d817d7145c379ff3c8fd5ee8cae/packages/react/package.json)
- [S16] [npm @knocklabs/react 0.15.1](https://www.npmjs.com/package/@knocklabs/react/v/0.15.1)
