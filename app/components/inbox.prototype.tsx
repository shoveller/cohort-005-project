// THROWAWAY: three Inbox layouts on /?variant=A|B|C. All mutations are in memory.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Dialog, Popover } from "radix-ui";
import {
  Bell,
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  Inbox,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";

const variants = ["A", "B", "C"] as const;
type Variant = (typeof variants)[number];
const names = { A: "작은 드롭다운", B: "오른쪽 패널", C: "전용 페이지" };
const sample = [
  {
    id: 1,
    title: "Your question has a reply",
    text: "Alex replied to your question about React effects.",
    time: "2 min ago",
    kind: "Learning",
    target: "해당 Lesson의 Question과 Reply",
    read: false,
  },
  {
    id: 2,
    title: "Your refund request was approved",
    text: "Your payment for Advanced TypeScript will be refunded.",
    time: "30 min ago",
    kind: "Purchase",
    target: "해당 구매의 환불 상태 화면",
    read: false,
  },
  {
    id: 3,
    title: "Welcome to React Foundations",
    text: "Your course is ready. Start with your first lesson.",
    time: "1 hour ago",
    kind: "Learning",
    target: "구매한 Course의 첫 Lesson",
    read: false,
  },
  {
    id: 4,
    title: "Your refund request was received",
    text: "We will email you when your request has been reviewed.",
    time: "Yesterday",
    kind: "Purchase",
    target: "해당 구매의 환불 상태 화면",
    read: true,
  },
];

export function InboxPrototype() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("variant");
  const variant: Variant =
    requested === "B" || requested === "C" ? requested : "A";
  const enabled = variants.some((key) => key === requested);
  const [items, setItems] = useState(sample);
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const unread = items.filter((item) => !item.read).length;
  const visible = items.filter((item) => !unreadOnly || !item.read);

  function cycle(direction: number) {
    const next =
      variants[
        (variants.indexOf(variant) + direction + variants.length) %
          variants.length
      ];
    if (!next) return;
    setParams(
      (previous) => {
        previous.set("variant", next);
        return previous;
      },
      { replace: true, preventScrollReset: true }
    );
    setOpen(false);
    setDestination(null);
  }

  useEffect(() => {
    if (!enabled) return;
    function onKey(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(
          "input, textarea, select, [contenteditable='true'], [role='dialog']"
        )
      )
        return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        cycle(event.key === "ArrowLeft" ? -1 : 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, variant, setParams]);

  if (!enabled) return null;

  const trigger = (
    <button
      ref={bell}
      className="relative rounded-md p-2 hover:bg-muted"
      aria-label={`Open Inbox, ${unread} unread`}
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {unread}
        </span>
      )}
    </button>
  );
  const content = (
    <>
      <div className="flex items-center justify-between border-b p-5">
        <div>
          <h2 className="text-xl font-semibold">Inbox</h2>
          <p className="text-xs text-muted-foreground">
            {unread} unread · Student sample
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close Inbox"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={unreadOnly ? "ghost" : "secondary"}
            onClick={() => setUnreadOnly(false)}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={unreadOnly ? "secondary" : "ghost"}
            onClick={() => setUnreadOnly(true)}
          >
            Unread
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          disabled={unread === 0}
          onClick={() =>
            setItems((previous) =>
              previous.map((item) => ({ ...item, read: true }))
            )
          }
        >
          <CheckCheck className="size-4" /> Mark all read
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <Inbox className="mx-auto mb-4 size-8 text-muted-foreground" />
            <h3 className="font-semibold">
              {items.length === 0 ? "Nothing here yet" : "You're all caught up"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {items.length === 0
                ? "Course updates and replies will appear here."
                : "You have no unread notifications."}
            </p>
          </div>
        ) : (
          visible.map((item) => (
            <button
              key={item.id}
              className={`flex w-full gap-3 border-b p-5 text-left transition-colors hover:bg-muted ${item.read ? "" : "bg-primary/5"}`}
              onClick={() => {
                setItems((previous) =>
                  previous.map((entry) =>
                    entry.id === item.id ? { ...entry, read: true } : entry
                  )
                );
                setDestination(item.target);
                setOpen(false);
              }}
            >
              <span
                className={`mt-2 size-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-primary"}`}
                aria-label={item.read ? "Read" : "Unread"}
              />
              <span
                className={
                  variant === "C"
                    ? "grid flex-1 gap-2 sm:grid-cols-[1fr_2fr_100px]"
                    : "flex-1"
                }
              >
                <span className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                    {item.kind}
                  </span>
                  <span
                    className={`block text-sm ${item.read ? "font-normal" : "font-semibold"}`}
                  >
                    {item.title}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {item.text}
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {item.time}
                </span>
              </span>
              {variant !== "A" && (
                <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground" />
              )}
            </button>
          ))
        )}
      </div>
      <p className="border-t px-5 py-3 text-xs text-muted-foreground">
        시제품 · 열기만 해서는 읽음 처리하지 않음 · 항목 클릭 시 읽음 + 이동 미리보기
      </p>
    </>
  );

  return (
    <>
      {variant === "A" ? (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>{trigger}</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              aria-label="Inbox"
              align="end"
              sideOffset={12}
              className="z-40 flex max-h-[65dvh] w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-xl"
            >
              {content}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ) : variant === "B" ? (
        <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
          <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-30 bg-black/25" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col bg-background pb-40 text-foreground shadow-xl"
            >
              <Dialog.Title className="sr-only">Inbox</Dialog.Title>
              {content}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : (
        <>
          <button
            ref={bell}
            aria-label={`Open Inbox, ${unread} unread`}
            aria-expanded={open}
            className="relative rounded-md p-2 hover:bg-muted"
            onClick={() => setOpen((value) => !value)}
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {unread}
              </span>
            )}
          </button>
          {open && (
            <section
              aria-label="Inbox page preview"
              className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto bg-background px-4 pb-44 pt-8 text-foreground"
            >
              <div className="mx-auto max-w-5xl">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    bell.current?.focus();
                  }}
                >
                  <ArrowLeft className="size-4" /> Back to courses
                </Button>
                <p className="my-4 text-xs text-muted-foreground">
                  전용 페이지 레이아웃 미리보기 · 실제 URL 이동은 구현 단계에서
                  적용
                </p>
                <div className="overflow-hidden rounded-xl border">
                  {content}
                </div>
              </div>
            </section>
          )}
        </>
      )}
      <aside
        aria-label="Prototype controls"
        className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border bg-background p-3 text-foreground shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            size="icon"
            variant="outline"
            aria-label="Previous variant"
            onClick={() => cycle(-1)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <strong className="min-w-44 text-center text-sm">
            {variant} · {names[variant]}
          </strong>
          <Button
            size="icon"
            variant="outline"
            aria-label="Next variant"
            onClick={() => cycle(1)}
          >
            <ArrowRight className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setItems([]);
              setDestination(null);
            }}
          >
            빈 상태
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setItems(sample);
              setUnreadOnly(false);
              setDestination(null);
            }}
          >
            샘플 복원
          </Button>
        </div>
        <p className="mt-2 text-center text-xs" role="status">
          가짜 데이터 · 전체 {items.length} · 읽지 않음 {unread} ·{" "}
          {open ? "Inbox 열림" : "Inbox 닫힘"} · {unreadOnly ? "Unread" : "All"}
        </p>
        {destination && (
          <p className="mt-2 rounded-md bg-muted p-2 text-center text-xs">
            이동 미리보기 → {destination} (가짜 대상)
          </p>
        )}
      </aside>
    </>
  );
}
