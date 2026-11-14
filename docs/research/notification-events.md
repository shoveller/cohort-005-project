# Notification candidate events in Cadence

Research for [#36](https://github.com/shoveller/cohort-005-project/issues/36), part of map [#34](https://github.com/shoveller/cohort-005-project/issues/34).

**Question:** Which things that happen in Cadence would a Student, Instructor, Platform Admin or Team Admin plausibly want a Notification about? For each one: the event, who receives it, where it happens in code, and the related glossary terms. This file lists them all. It does not choose or rank any.

**Sources (all primary, all local):** the code at commit `979e285` (`app/`), `GLOSSARY.md`, and `docs/adr/0001`–`0012`. Line numbers refer to that commit. Terms follow `GLOSSARY.md`. The code says "coupon" and "redeem" for what the glossary calls a **Seat** and **claiming** it. The `users.role` value `admin` is a **Platform Admin**. A **Team Admin** is a `team_members` row with role `admin` (`app/db/schema.ts:11-45`).

## How to read this

- **Recipient** is the role that would get the Notification. "Buyer" means the person who made the Purchase. That is a Student for an Individual Purchase and a Team Admin for a Team Licence.
- **Today** says what Cadence already does at that point, if anything. Only three events send anything today. Each of them sends a plain email through `sendEmail` (`app/lib/mailer.server.ts:67-72`), which goes to Postmark, or to `.outbox/` when there is no token. There is no Inbox.
- Section A lists events the code actually performs. Section B lists events the glossary or ADRs describe but the code does not implement yet.

## A. Events the code performs

### A1. Refund Requests

| # | Event | Recipient(s) | Where in code | Today | Glossary terms |
|---|---|---|---|---|---|
| 1 | Refund Request raised on an **Individual Purchase** | Student (buyer): confirmation. Platform Admin: a new Open Refund Request to decide. | `POST /courses/:slug/refund`, `app/routes/courses.$slug.refund.ts:32-77` → `raiseRefundRequest` `app/lib/refunds.server.ts:357-409` (insert at 379-388) | Email to the buyer, "Refund requested — {course}" (`refunds.server.ts:390-407`, sent at `courses.$slug.refund.ts:75`). Platform Admins get nothing. | Refund Request, Open Refund Request, Individual Purchase, Platform Admin |
| 2 | Refund Request raised on a **Team Licence** | Team Admin (buyer): confirmation. Platform Admin: a new request to decide. | Same action. The team page posts it with the Team Licence's `purchaseId` (ADR-0004). It redirects to `/team` (`courses.$slug.refund.ts:77`). | Same buyer email. | Refund Request, Team Licence, Team Admin |
| 3 | Team Licence's Unclaimed Seats **put on hold** because its Refund Request is open | Team Admin. A Student holding an unclaimed code can't be identified until they try to claim it. | No write happens. The hold is derived in `getSeatAvailability` `refunds.server.ts:111-121` (`on_hold`). | Nothing is sent. The Student only sees the error on `/redeem/:code`. | Unclaimed Seat, Open Refund Request (ADR-0003) |
| 4 | Refund Request **approved** on an Individual Purchase | Student (buyer). Also the Instructor (that Student now shows as Lapsed on the roster, see #7). Also other Platform Admins (a colleague decided it). | `POST /admin/refunds` intent `approve`, `app/routes/admin.refunds.tsx:94-139` → `approveRefundRequest` `refunds.server.ts:614-685` | Email "Refund approved — {course}" with the optional decision note (`buildDecisionEmail` `refunds.server.ts:736-781`, sent at `admin.refunds.tsx:130`). | Approved Refund Request, Refund, Platform Admin |
| 5 | Refund Request **approved** on a Team Licence: its Unclaimed Seats can never be claimed | Team Admin (buyer). Students holding unclaimed codes, if they could be identified. | `refunds.server.ts:628-643`. Sets `coupons.refunded_at` on each Unclaimed Seat. | Same approval email to the Team Admin. | Approved Refund Request, Team Licence, Unclaimed Seat (ADR-0003) |
| 6 | Refund Request **declined** (a note is required) | Buyer (Student or Team Admin). Other Platform Admins. For a Team Licence, the Seats become claimable again, which the Team Admin cares about. | intent `decline`, `admin.refunds.tsx:94-139` → `declineRefundRequest` `refunds.server.ts:692-733` | Email "Refund declined — {course}" with the note and "you can raise a new refund request". | Declined Refund Request |
| 7 | Approval **ends the Enrollment**, so the Student becomes **Lapsed** | Student. Instructor (the roster shows them as "Lapsed"). | `refunds.server.ts:644-666` deletes the `enrollments` row. The roster derives Lapsed in `app/routes/instructor.$courseId.students.tsx:48-60, 299` via `isLapsed` `app/lib/enrollments.ts:2`. | The Student is covered only by the approval email. The Instructor gets nothing. | Enrollment, Lapsed (ADR-0001, ADR-0002) |
| 8 | Approval on an Individual Purchase **keeps** the Enrollment because the Student also holds a Claimed Seat | Student (they keep access, which they may not expect). | `refunds.server.ts:645-656` | The approval email doesn't mention it. | Claimed Seat, Enrollment (ADR-0004) |
| 9 | A second Platform Admin tries to decide a request that was already decided ("first decision wins") | Platform Admin (the one who lost the race). This is closer to a UI error than a Notification. | `findOpenRefundRequest` `refunds.server.ts:587-595` returns 409 | An inline error. | Refund Request |

### A2. Purchases, Seats, Enrollment

| # | Event | Recipient(s) | Where in code | Today | Glossary terms |
|---|---|---|---|---|---|
| 10 | **Individual Purchase** made and **Enrollment** created | Student: receipt or welcome. Instructor: new sale and new Student on their course. | `POST /courses/:slug/purchase` intent `confirm-purchase`, `app/routes/courses.$slug.purchase.tsx:366-373` → `createPurchase` 180-191, `enrollUser` 145-178 | None. `enrollUser` has a stub, `// Would send welcome email here` (line 174), and it is called with `sendEmail=false` (line 371). | Purchase, Individual Purchase, Enrollment |
| 11 | **Team Licence** bought (Seats generated) | Team Admin: receipt and the Seat codes. Instructor: a sale. | intent `confirm-team-purchase`, `courses.$slug.purchase.tsx:375-379` → `createTeamPurchase` 237-247 (`generateCoupons` 220-235) | None. The buyer is redirected to `/team`. | Team Licence, Seat, Unclaimed Seat |
| 12 | A buyer **becomes a Team Admin** (team created on their first Team Licence) | Team Admin | `getOrCreateTeamForUser` `courses.$slug.purchase.tsx:209-218` | None. | Team Admin |
| 13 | **Seat claimed**, and the claim creates an **Enrollment** | Student who claimed: welcome. Team Admin: "X claimed a Seat". Instructor: new Student. | `POST /redeem/:code`, `app/routes/redeem.$code.tsx:185-212` → `redeemCoupon` 47-113 (update at 98-104, enrollment insert at 106-110) | None. The Student is redirected to `/courses/:slug/welcome`. | Seat, Claimed Seat, Enrollment |
| 14 | A Seat claim **makes the Team Licence non-refundable** (its first Claimed Seat) | Team Admin. An open request now "can only be declined" (`refunds.server.ts:629-636`). | Same write as #13. The rule is in `findRuleBreaks` `refunds.server.ts:241-242` (`seat_claimed`). | None. | Claimed Seat, Team Licence (ADR-0003) |
| 15 | Seat claim **refused**: on hold, refunded, already enrolled, or country mismatch | Student trying to claim. Team Admin (their colleague couldn't get in). | `redeemCoupon` `redeem.$code.tsx:61-96` | An inline error on the page. | Unclaimed Seat, Open Refund Request (ADR-0009 for country) |

### A3. Lesson comments (questions and answers)

The code treats a top-level comment by a non-staff author, with no live reply from the course's Instructor or a Platform Admin, as an "unanswered question" (`app/routes/instructor.questions.tsx:42-75`). The glossary has no term for a question or a comment.

| # | Event | Recipient(s) | Where in code | Today | Glossary terms |
|---|---|---|---|---|---|
| 16 | Student **posts a question** (top-level comment) on a lesson | Instructor (owner of the course). Platform Admin (their queue spans every course, `instructor.questions.tsx:171-175`). | `POST /courses/:slug/lessons/:lessonId` intent `create-comment`, no `parentId`. `app/routes/courses.$slug.lessons.$lessonId.tsx:898-909` → `createComment` 404-435 | It shows up in the `/instructor/questions` queue. Nothing is sent. | Student, Instructor |
| 17 | Instructor or Platform Admin **answers** a question | Student who asked | `POST /instructor/questions` intent `reply`, `instructor.questions.tsx:188-226` (createComment at 211). The reply can also be posted from the lesson page (#18). | Nothing is sent. | Student, Instructor, Platform Admin |
| 18 | Anyone **replies** to a comment on the lesson page | Author of the parent comment. Instructor, if a Student replies under a question that is still unanswered. | `create-comment` with `parentId`, `courses.$slug.lessons.$lessonId.tsx:898-909`. Replies are one level deep (416-428). | Nothing is sent. | — |
| 19 | Question **left unanswered for 3 days** (stale) | Instructor. Platform Admin. | Time-based, with no write. `STALE_AFTER_DAYS = 3` `instructor.questions.tsx:160`. It is only highlighted in the UI (`QuestionCard`, around line 232). | Only highlighted. | — |
| 20 | Comment **deleted by staff** (moderation) | Comment's author (Student) | intent `delete-comment`, `courses.$slug.lessons.$lessonId.tsx:927-935` → `deleteComment` 459-478 (`isStaff` allows deleting others' comments) | Nothing is sent. | — |
| 21 | Comment **edited** by its author | Repliers or the Instructor, if they already answered it | intent `edit-comment`, `courses.$slug.lessons.$lessonId.tsx:912-924` → `updateComment` 437-457 | Nothing is sent. | — |

### A4. Progress, quizzes, ratings

| # | Event | Recipient(s) | Where in code | Today | Glossary terms |
|---|---|---|---|---|---|
| 22 | Lesson **marked complete** | Student (self). Instructor. | intent `mark-complete`, `courses.$slug.lessons.$lessonId.tsx:947-950` → `markLessonComplete` 218-243 | Nothing is sent. | Student |
| 23 | **Course completed** (every lesson complete). This is derivable at #22, but no code checks for it. | Student. Instructor. | Would be at `markLessonComplete`. No completion check exists. | Nothing is sent. | Enrollment |
| 24 | **Quiz submitted** (passed or failed, pass is >70%) | Student (the result is shown inline). Instructor. | intent `submit-quiz`, `courses.$slug.lessons.$lessonId.tsx:952-976` → `computeResult` 531-635 (insert at 602-611, `passed` at 599) | Shown inline. | Student |
| 25 | Course **rated** or re-rated (1–5 stars) | Instructor | `POST /courses/:slug`, `app/routes/courses.$slug.tsx:453-481` → `rateCourse` 330-363 | Nothing is sent. | Enrollment (only enrolled Students may rate) |
| 26 | Video **watch progress recorded** (raw `video_watch_events`) | None directly. It feeds Watched and the Watch Limit (see B3). | `POST /api/video-tracking`, `app/routes/api.video-tracking.ts:15-41` | — | Watched, Watch Limit |

### A5. Course lifecycle and content

| # | Event | Recipient(s) | Where in code | Today | Glossary terms |
|---|---|---|---|---|---|
| 27 | Course **created** (always Draft) | Platform Admin | `POST /instructor/new`, `app/routes/instructor.new.tsx:112-160` → `createCourse` 46-70 | Nothing is sent. | Instructor |
| 28 | Instructor **changes course status** (Draft, Published or Archived), e.g. **course published** | Platform Admin. Enrolled Students, when it is archived. | intent `update-status`, `app/routes/instructor.$courseId.tsx:695-698` → `updateCourseStatus` 154-161 | Nothing is sent. | Instructor, Enrollment |
| 29 | Platform Admin **changes a course's status** | Instructor (owner). Enrolled Students. | intent `update-status`, `app/routes/admin.courses.tsx:141-144` → `updateCourseStatus` 75-82 | Nothing is sent. | Platform Admin, Instructor |
| 30 | Course **price** or **purchasing-power pricing** changed | Platform Admin | `instructor.$courseId.tsx:700-720` (`update-price`, `update-ppp-enabled`) | Nothing is sent. | Purchase (ADR-0005, ADR-0009) |
| 31 | **New lesson added** to a course | Enrolled Students | intent `add-lesson`, `instructor.$courseId.tsx:753-764` | Nothing is sent. | Enrollment |
| 32 | Lesson **content or video updated** | Enrolled Students (Students who had completed it, in particular) | `POST /instructor/:courseId/lessons/:lessonId` intent `update-lesson`, `app/routes/instructor.$courseId.lessons.$lessonId.tsx:207-` → update at 74-91 | Nothing is sent. | Enrollment |
| 33 | Lesson or module **deleted** (its progress rows go too) | Enrolled Students with progress there | `delete-module` `instructor.$courseId.tsx:740-751` (deletes its lessons at 238-239). `delete-lesson` 827-842. | Nothing is sent. | Enrollment, Watched |
| 34 | Quiz **created or changed** | Enrolled Students | intent `save-quiz`, `app/routes/instructor.$courseId.lessons.$lessonId.quiz.tsx:386-423` | Nothing is sent. | — |
| 35 | Quiz **deleted**. This **deletes every Student's attempts and answers.** | Students who attempted it | intent `delete-quiz`, `quiz.tsx:425-` → `deleteQuiz` 201-219 | Nothing is sent. | — |

### A6. Accounts and roles

| # | Event | Recipient(s) | Where in code | Today | Glossary terms |
|---|---|---|---|---|---|
| 36 | **New account signed up** (always role Student) | Student: welcome. Platform Admin. | `POST /signup`, `app/routes/signup.tsx:41-86` (insert at 77-81) | Nothing is sent. | Student |
| 37 | Platform Admin **changes a person's role** (Student, Instructor or Platform Admin) | That person | intent `update-role`, `app/routes/admin.users.tsx:126-130` → `updateUserRole` 60-67 | Nothing is sent. | Instructor, Platform Admin |
| 38 | Platform Admin **edits a person's name or email** | That person, at the old and new address. This affects where email Notifications go. | intent `update-user`, `admin.users.tsx:119-124` → `updateUser` 46-58 | Nothing is sent. | — |

Writes with no plausible recipient, left out on purpose: the user's own profile edit (`settings.tsx:66-97`, which can't change email). Category create, rename and delete (`admin.categories.tsx:167-`; delete is refused while a course uses the category). Module or lesson rename and reorder. Course title, description and sales copy edits. DevUI user and country switching (`api.switch-user.ts`, `api.set-dev-country.ts`). Login and logout.

## B. Events the glossary or ADRs imply but the code does not implement

| # | Event | Recipient(s) | Source | What the code does instead | Glossary terms |
|---|---|---|---|---|---|
| B1 | Refund becomes a **Pending Refund** (money not yet confirmed) | Buyer | GLOSSARY "Pending Refund" | Approval only sets `refunds.amount_refunded` (`refunds.server.ts:669-678`). No Refund record or money movement exists. The approval email already says the money "is on its way" (line 760). | Pending Refund, Refund |
| B2 | Refund **issued** (money confirmed sent) | Buyer (Student or Team Admin) | GLOSSARY "Issued Refund" | Not modelled. No state, no payment provider, no webhook. | Issued Refund |
| B3 | Refund **failed** (money couldn't be sent; the request stays approved) | Buyer. Platform Admin (to act on it). | GLOSSARY "Failed Refund", ADR-0002 | Not modelled. | Failed Refund, Approved Refund Request |
| B4 | Student **reaches or approaches the Watch Limit** (1 hour Watched) and can no longer get a Refund | Student | GLOSSARY "Watch Limit". `REFUND_WATCH_LIMIT_SECONDS` `app/lib/refund-rules.ts:6` | Checked only when someone asks for a refund (`refunds.server.ts:246-248`). Crossing the limit fires nothing. | Watch Limit, Watched |
| B5 | Student **completes 50% of lessons** and loses refund eligibility | Student | `REFUND_COMPLETION_LIMIT` `refund-rules.ts:7`, `refunds.server.ts:250-255` | Checked only when someone asks. This rule has no glossary term. | Refund Request |
| B6 | **14-day refund window** closing soon or closed | Buyer (Student or Team Admin) | `REFUND_WINDOW_DAYS` `refund-rules.ts:5`, `lastDayOfWindow` `refunds.server.ts:52-56` | The last day is only shown on the course and team pages. Nothing is time-based. | Refund Request |
| B7 | Seats on a Team Licence **released from hold** after a decline | Team Admin. Students holding codes. | ADR-0003 ("If the request is declined they work again") | Derived at read time (#3, #6). There's no event. | Unclaimed Seat, Declined Refund Request |
| B8 | **Welcome email on Enrollment** | Student | Stub `// Would send welcome email here` `courses.$slug.purchase.tsx:173-175` | The `sendEmail` flag exists, but it is always passed `false` and never acted on. | Enrollment |
| B9 | A Team Admin **invites a Student to a Seat** (sends them the code) | Student | Glossary: a Team Licence "grants Seats" that "a Student can claim" | No invite flow. Codes are shown on `/team` and shared outside Cadence, so the recipient is unknown until they claim. | Seat, Team Admin |
| B10 | Student **regains an Enrollment after being Lapsed** (buys again or claims a Seat, and keeps their progress) | Student. Instructor. | ADR-0001 ("should pick up where they left off") | This works through #10 or #13. Nothing marks it as a return. | Lapsed, Enrollment |

## Counts by recipient role

An event counts once for each role it names. Conditional recipients count too. #37 and #38 can concern anyone with an account, so they count for Student, Instructor and Platform Admin.

| Role | Section A (implemented) | Section B (implied only) | Section A event #s | Section B event #s |
|---|---|---|---|---|
| Student | 25 | 10 | 1, 4, 6, 7, 8, 10, 13, 15, 17, 18, 20, 21, 22, 23, 24, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38 | B1–B10 (B7 and B9 only if the code holder were known) |
| Instructor | 16 | 1 | 4, 7, 10, 11, 13, 16, 18, 19, 21, 22, 23, 24, 25, 29, 37, 38 | B10 |
| Platform Admin | 13 | 1 | 1, 2, 4, 6, 9, 16, 19, 27, 28, 30, 36, 37, 38 | B3 |
| Team Admin | 9 | 5 | 2, 3, 5, 6, 11, 12, 13, 14, 15 | B1, B2, B3, B6, B7 |

Section A has 38 events and section B has 10. Many events have several recipients, so the per-role counts add up to more than 48.

## Gaps worth knowing

- **Platform Admins hear about nothing.** A new Open Refund Request (#1, #2) reaches no one. Platform Admins have to visit `/admin/refunds`.
- **Seat holders can't be addressed.** An Unclaimed Seat has no person attached (`coupons.redeemed_by_user_id` is null until it is claimed). So #3, #5 and B7 can only go to the Team Admin.
- **The money side of Refunds doesn't exist.** Pending, Issued and Failed Refund (B1–B3) are glossary terms with no code. Today's approval email already promises the money "is on its way".
- **Three emails already exist** (#1/#2, #4/#5, #6). The buyer-facing Refund Request emails are the only Notifications Cadence sends now. They are built inline in `refunds.server.ts` and sent after the database write. If a send fails, the action throws, but the decision has already been committed (`admin.refunds.tsx:130`). This bears on the map's open question about service failures.
- **Several events are time-based, with no write to hook onto:** stale question (#19), Watch Limit or completion threshold (B4, B5), and the refund window closing (B6). These would need a scheduler or a check at read time, not a trigger inside an action.
- **No glossary terms exist for comments, questions, quizzes, lessons, ratings or course status.** Notifications about them would need words added to `GLOSSARY.md` first.
