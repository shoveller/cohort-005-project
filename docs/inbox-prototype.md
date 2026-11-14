# Inbox layout prototype (throwaway)

Decision source: [Inbox 모습 시제품](https://github.com/shoveller/cohort-005-project/issues/39).

## Run

With the project's dependencies and development database prepared, run:

```sh
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/?variant=A`. Use the header bell and the floating
previous/next buttons to compare A (dropdown), B (side panel), and C (page layout).
C previews a page inside the home screen; it does not implement a new route.
Without a valid `variant` parameter, the prototype is hidden. It is development-only.

The sample represents a Student. Notifications and read state are in memory;
reset on refresh. Clicking an item displays a destination description instead of
navigating to a real record. This does not integrate with Knock.

## Outcome

The user selected A. The canonical resolution, including read behavior, filters,
empty states, and the component strategy, lives on the linked decision ticket.
Knock's support for that UX requires a separate investigation.

## Verification

- `npm run typecheck`: passed.
- `npm run test`: 45 files / 1,215 tests passed.
- Browser checks: A/B/C switching, all-read and Unread empty state, item click
  marking read and displaying destination, empty Inbox, sample restore.

This branch preserves the comparison artifact, not production implementation.
Do not merge the prototype directly into main.
