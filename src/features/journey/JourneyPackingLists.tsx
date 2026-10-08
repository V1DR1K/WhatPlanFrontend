import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/ui/Button";
import { JourneyIcon } from "./JourneyIcon";
import type { Packing } from "./journey";

type PackingMember = { id: number; username: string };
type PackingOrderDraft = { userId: number; ids: string[] };
type PackingGesture = {
  userId: number;
  item: Packing;
  itemId: string;
  overId: string | null;
  phase: "holding" | "dragging";
};
type PackingPress = {
  userId: number;
  item: Packing;
  packed: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  axis: "x" | "y" | null;
  captureTarget: HTMLDivElement;
  list: HTMLUListElement;
  row: HTMLLIElement;
  initialIds: string[];
  ids: string[];
  timer: number;
  mode: "holding" | "scrolling" | "dragging";
};
type PackingLayoutSnapshot = {
  list: HTMLUListElement;
  positions: Map<string, DOMRect>;
};
type Props = {
  members: PackingMember[];
  packing: Packing[];
  editable: boolean;
  disabled: boolean;
  onToggle: (item: Packing, packed: boolean) => void;
  onReorder: (userId: number, ids: string[]) => Promise<unknown>;
  onEdit: (item: Packing) => void;
  onRemove: (item: Packing) => void;
};

const LONG_PRESS_DURATION = 500;
const LONG_PRESS_MOVE_TOLERANCE = 18;
const AUTO_SCROLL_EDGE_SIZE = 76;
const AUTO_SCROLL_MAX_STEP = 14;
const previewTransform = ({ left, top }: { left: number; top: number }) =>
  `translate3d(${left + 14}px, ${top + 14}px, 0) rotate(1deg)`;

const capturePackingLayout = (list: HTMLUListElement): PackingLayoutSnapshot => ({
  list,
  positions: new Map(
    Array.from(list.querySelectorAll<HTMLElement>("[data-packing-item]"))
      .map((item): [string, DOMRect] => [item.dataset.packingItem ?? "", item.getBoundingClientRect()]),
  ),
});

export function JourneyPackingLists({
  members,
  packing,
  editable,
  disabled,
  onToggle,
  onReorder,
  onEdit,
  onRemove,
}: Props) {
  const [draftOrder, setDraftOrder] = useState<PackingOrderDraft | null>(null);
  const [gesture, setGesture] = useState<PackingGesture | null>(null);
  const draftOrderRef = useRef<PackingOrderDraft | null>(null);
  const packingPress = useRef<PackingPress | null>(null);
  const packingLayoutSnapshot = useRef<PackingLayoutSnapshot | null>(null);
  const dragPointer = useRef({ x: 0, y: 0 });
  const previewPosition = useRef({ left: 0, top: 0 });
  const dragPreview = useRef<HTMLDivElement | null>(null);
  const suppressedClick = useRef<{ until: number; itemId: string } | null>(null);
  const autoScrollFrame = useRef<number | null>(null);
  const autoScrollDirection = useRef(0);
  const updateDropTargetRef = useRef<(press: PackingPress, x: number, y: number) => void>(() => {});
  const autoScrollTickRef = useRef<() => void>(() => {});

  const setPackingDraft = (next: PackingOrderDraft | null) => {
    draftOrderRef.current = next;
    setDraftOrder(next);
  };

  useLayoutEffect(() => {
    const snapshot = packingLayoutSnapshot.current;
    packingLayoutSnapshot.current = null;
    if (!snapshot || !snapshot.list.isConnected) return;

    snapshot.list.querySelectorAll<HTMLElement>("[data-packing-item]").forEach((item) => {
      const before = snapshot.positions.get(item.dataset.packingItem ?? "");
      if (!before) return;
      const after = item.getBoundingClientRect();
      const x = before.left - after.left;
      const y = before.top - after.top;
      if (Math.abs(x) < 1 && Math.abs(y) < 1) return;

      item.style.transition = "none";
      item.style.translate = `${x}px ${y}px`;
      void item.offsetHeight;
      item.style.transition = "";
      window.requestAnimationFrame(() => {
        item.style.translate = "0 0";
      });
    });
  }, [draftOrder]);

  const stopAutoScroll = () => {
    autoScrollDirection.current = 0;
    if (autoScrollFrame.current !== null) {
      window.cancelAnimationFrame(autoScrollFrame.current);
      autoScrollFrame.current = null;
    }
  };

  const resetDraft = (restore: boolean, list?: HTMLUListElement) => {
    if (!draftOrderRef.current) return;
    if (restore && list) packingLayoutSnapshot.current = capturePackingLayout(list);
    setPackingDraft(null);
  };

  const cancelPackingPress = (restoreOrder: boolean) => {
    const press = packingPress.current;
    if (!press) return;
    window.clearTimeout(press.timer);
    packingPress.current = null;
    stopAutoScroll();
    setGesture(null);
    if (press.mode === "dragging") {
      suppressedClick.current = { until: Date.now() + 350, itemId: press.item.id };
    }
    if (restoreOrder && press.mode === "dragging") resetDraft(true, press.list);
  };

  useEffect(() => {
    if (gesture?.phase !== "dragging") return undefined;
    const preventTouchScroll = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    document.addEventListener("touchmove", preventTouchScroll, { passive: false });
    return () => document.removeEventListener("touchmove", preventTouchScroll);
  }, [gesture?.phase]);

  useEffect(() => () => {
    if (packingPress.current) window.clearTimeout(packingPress.current.timer);
    stopAutoScroll();
  }, []);

  const positionDragPreview = (x: number, y: number) => {
    dragPointer.current = { x, y };
    const previewWidth = Math.min(340, Math.max(0, window.innerWidth - 48));
    const left = Math.max(16, Math.min(x, window.innerWidth - previewWidth - 30));
    const top = Math.max(16, Math.min(y, window.innerHeight - 110));
    previewPosition.current = { left, top };
    if (dragPreview.current) {
      dragPreview.current.style.transform = previewTransform(previewPosition.current);
    }
  };

  const updateDropTarget = (press: PackingPress, x: number, y: number) => {
    const underPointer = document.elementFromPoint(x, y);
    const targetRow = underPointer instanceof Element
      ? underPointer.closest<HTMLLIElement>("li[data-packing-item]")
      : null;
    const validTarget = targetRow &&
      targetRow.parentElement === press.list &&
      targetRow.dataset.packed === String(press.packed)
      ? targetRow
      : null;

    if (!validTarget) {
      setGesture((current) => current?.userId === press.userId && current.overId !== null
        ? { ...current, overId: null }
        : current);
      return;
    }

    const targetId = validTarget.dataset.packingItem;
    if (!targetId) return;
    setGesture((current) => current?.userId === press.userId && current.overId !== targetId
      ? { ...current, overId: targetId }
      : current);

    const sourceIndex = press.ids.indexOf(press.item.id);
    const targetIndex = press.ids.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const nextIds = [...press.ids];
    nextIds.splice(sourceIndex, 1);
    const targetAfterRemoval = nextIds.indexOf(targetId);
    const targetBounds = validTarget.getBoundingClientRect();
    const insertAfterTarget = y > targetBounds.top + targetBounds.height / 2;
    nextIds.splice(targetAfterRemoval + (insertAfterTarget ? 1 : 0), 0, press.item.id);
    if (nextIds.every((itemId, index) => itemId === press.ids[index])) return;

    packingLayoutSnapshot.current = capturePackingLayout(press.list);
    press.ids = nextIds;
    setPackingDraft({ userId: press.userId, ids: nextIds });
  };
  updateDropTargetRef.current = updateDropTarget;

  const autoScrollTick = () => {
    const press = packingPress.current;
    const direction = autoScrollDirection.current;
    if (!press || press.mode !== "dragging" || !direction) {
      autoScrollFrame.current = null;
      return;
    }

    const distance = direction < 0
      ? dragPointer.current.y
      : window.innerHeight - dragPointer.current.y;
    const intensity = Math.max(0, Math.min(1, (AUTO_SCROLL_EDGE_SIZE - distance) / AUTO_SCROLL_EDGE_SIZE));
    window.scrollBy(0, direction * Math.max(2, Math.round(AUTO_SCROLL_MAX_STEP * intensity)));
    updateDropTargetRef.current(press, dragPointer.current.x, dragPointer.current.y);
    autoScrollFrame.current = window.requestAnimationFrame(() => autoScrollTickRef.current());
  };
  autoScrollTickRef.current = autoScrollTick;

  const updateAutoScroll = (y: number) => {
    const direction = y <= AUTO_SCROLL_EDGE_SIZE
      ? -1
      : y >= window.innerHeight - AUTO_SCROLL_EDGE_SIZE
        ? 1
        : 0;
    autoScrollDirection.current = direction;
    if (direction && autoScrollFrame.current === null) {
      autoScrollFrame.current = window.requestAnimationFrame(() => autoScrollTickRef.current());
    }
    if (!direction) stopAutoScroll();
  };

  const startPackingPress = (
    event: ReactPointerEvent<HTMLLIElement>,
    userId: number,
    item: Packing,
    items: Packing[],
  ) => {
    const target = event.target;
    if (!editable || disabled || !event.isPrimary || packingPress.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const isControl = target instanceof Element && Boolean(
      target.closest("button, input, select, textarea, a, [data-packing-no-drag]"),
    );
    if (isControl && event.pointerType === "mouse") return;
    const captureTarget = event.currentTarget.closest<HTMLDivElement>(".journey-packing");
    if (!captureTarget) return;

    const ids = items.map((candidate) => candidate.id);
    const press: PackingPress = {
      userId,
      item,
      packed: item.packed,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      axis: null,
      captureTarget,
      list: event.currentTarget.parentElement as HTMLUListElement,
      row: event.currentTarget,
      initialIds: ids,
      ids: [...ids],
      timer: 0,
      mode: isControl ? "scrolling" : "holding",
    };
    packingPress.current = press;
    if (isControl) return;

    setGesture({ userId, item, itemId: item.id, overId: item.id, phase: "holding" });
    press.timer = window.setTimeout(() => {
      if (packingPress.current !== press || press.mode !== "holding") return;
      press.mode = "dragging";
      try {
        press.captureTarget.setPointerCapture(press.pointerId);
      } catch {
        // Pointer capture may be unavailable in synthetic or older browser events.
      }
      suppressedClick.current = { until: Date.now() + 1500, itemId: item.id };
      positionDragPreview(press.x, press.y);
      setGesture({ userId, item, itemId: item.id, overId: item.id, phase: "dragging" });
    }, LONG_PRESS_DURATION);
  };

  const movePackingPress = (event: ReactPointerEvent<HTMLDivElement>) => {
    const press = packingPress.current;
    if (!press || press.pointerId !== event.pointerId) return;

    const previousY = press.y;
    press.x = event.clientX;
    press.y = event.clientY;
    if (press.mode === "holding") {
      if (Math.max(Math.abs(press.x - press.startX), Math.abs(press.y - press.startY)) > LONG_PRESS_MOVE_TOLERANCE) {
        window.clearTimeout(press.timer);
        press.axis = Math.abs(press.x - press.startX) > Math.abs(press.y - press.startY) ? "x" : "y";
        press.mode = "scrolling";
        suppressedClick.current = { until: Date.now() + 350, itemId: press.item.id };
        setGesture(null);
        if (press.axis === "y" && event.pointerType !== "mouse") {
          window.scrollBy(0, previousY - press.y);
        }
      }
      return;
    }
    if (press.mode === "scrolling") {
      if (
        !press.axis &&
        Math.max(Math.abs(press.x - press.startX), Math.abs(press.y - press.startY)) > LONG_PRESS_MOVE_TOLERANCE
      ) {
        press.axis = Math.abs(press.x - press.startX) > Math.abs(press.y - press.startY) ? "x" : "y";
        suppressedClick.current = { until: Date.now() + 350, itemId: press.item.id };
      }
      if (press.axis === "y" && event.pointerType !== "mouse") {
        if (event.cancelable) event.preventDefault();
        window.scrollBy(0, previousY - press.y);
      }
      return;
    }
    if (press.mode !== "dragging") return;

    if (event.cancelable) event.preventDefault();
    positionDragPreview(press.x, press.y);
    updateDropTargetRef.current(press, press.x, press.y);
    updateAutoScroll(press.y);
  };

  const finishPackingPress = (event: ReactPointerEvent<HTMLDivElement>) => {
    const press = packingPress.current;
    if (!press || press.pointerId !== event.pointerId) return;
    window.clearTimeout(press.timer);
    packingPress.current = null;
    stopAutoScroll();
    setGesture(null);
    if (press.mode !== "dragging") return;

    suppressedClick.current = { until: Date.now() + 350, itemId: press.item.id };
    const changedOrder = press.ids.some((itemId, index) => itemId !== press.initialIds[index]);
    if (!changedOrder) {
      resetDraft(true, press.list);
      return;
    }

    void onReorder(press.userId, press.ids)
      .then(() => resetDraft(false))
      .catch(() => resetDraft(true, press.list));
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    const targetRow = event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-packing-item]")
      : null;
    if (
      event.detail > 0 &&
      suppressedClick.current &&
      (!targetRow || suppressedClick.current.itemId === targetRow.dataset.packingItem) &&
      Date.now() < suppressedClick.current.until
    ) {
      event.preventDefault();
      event.stopPropagation();
      suppressedClick.current = null;
    }
  };

  return (
    <>
      <div
        className="journey-packing"
        onPointerMove={movePackingPress}
        onPointerUp={finishPackingPress}
        onPointerCancel={() => cancelPackingPress(true)}
        onLostPointerCapture={(event) => {
          if (
            event.target === event.currentTarget &&
            packingPress.current?.pointerId === event.pointerId
          ) cancelPackingPress(true);
        }}
        onClickCapture={handleClickCapture}
      >
        {members.map((member) => {
          const draftPositions = draftOrder?.userId === member.id
            ? new Map(draftOrder.ids.map((itemId, index): [string, number] => [itemId, index]))
            : null;
          const items = packing
            .filter((item) => item.userId === member.id)
            .sort((a, b) =>
              Number(a.packed) - Number(b.packed) ||
              (draftPositions
                ? (draftPositions.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
                  (draftPositions.get(b.id) ?? Number.MAX_SAFE_INTEGER)
                : a.position - b.position) ||
              a.position - b.position ||
              a.id.localeCompare(b.id),
            );
          const done = items.filter((item) => item.packed).length;

          return (
            <section key={member.id}>
              <h3>{member.username}</h3>
              <p>{done} de {items.length} guardadas</p>
              <progress
                max={Math.max(1, items.length)}
                value={done}
                aria-label={`Valija de ${member.username}`}
              />
              {!items.length && (
                <p className="muted">Todavía no hay cosas en esta lista.</p>
              )}
              <ul data-packing-list={member.id}>
                {items.map((item) => {
                  const itemGesture = gesture?.userId === member.id && gesture.itemId === item.id
                    ? gesture
                    : null;
                  const dropTarget = gesture?.phase === "dragging" &&
                    gesture.userId === member.id &&
                    gesture.overId === item.id;
                  const sameStatus = items.filter((candidate) => candidate.packed === item.packed);
                  const statusIndex = sameStatus.findIndex((candidate) => candidate.id === item.id);
                  const move = (direction: -1 | 1) => {
                    const target = sameStatus[statusIndex + direction];
                    if (!target) return;
                    const reordered = [...items];
                    const currentIndex = items.findIndex((candidate) => candidate.id === item.id);
                    const targetIndex = items.findIndex((candidate) => candidate.id === target.id);
                    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
                    void onReorder(member.id, reordered.map((candidate) => candidate.id)).catch(() => {});
                  };

                  return (
                    <li
                      key={item.id}
                      data-packing-item={item.id}
                      data-packed={item.packed}
                      className={[
                        "journey-packing-item",
                        itemGesture ? `journey-packing-item--${itemGesture.phase}` : "",
                        dropTarget && !itemGesture ? "journey-packing-item--drop-target" : "",
                      ].filter(Boolean).join(" ")}
                      onPointerDown={(event) => startPackingPress(event, member.id, item, items)}
                      onContextMenu={(event) => {
                        if (gesture?.phase === "dragging") event.preventDefault();
                      }}
                    >
                      <div className="journey-packing-item-main">
                        <label className="journey-checkbox">
                          <input
                            type="checkbox"
                            checked={item.packed}
                            disabled={!editable || disabled}
                            onChange={(event) => onToggle(item, event.target.checked)}
                          />
                          <span>
                            {item.description} <small>× {item.quantity}</small>
                          </span>
                        </label>
                      </div>
                      {editable && (
                        <div className="journey-packing-item-actions">
                          <div className="journey-packing-order">
                            <Button
                              type="button"
                              variant="icon"
                              icon={<JourneyIcon name="UP" />}
                              aria-label={`Subir ${item.description}`}
                              title="Subir"
                              disabled={disabled || statusIndex === 0}
                              onClick={() => move(-1)}
                            />
                            <Button
                              type="button"
                              variant="icon"
                              icon={<JourneyIcon name="DOWN" />}
                              aria-label={`Bajar ${item.description}`}
                              title="Bajar"
                              disabled={disabled || statusIndex === sameStatus.length - 1}
                              onClick={() => move(1)}
                            />
                          </div>
                          <div className="journey-packing-item-manage">
                            <Button
                              type="button"
                              variant="secondary"
                              icon={<JourneyIcon name="EDIT" />}
                              onClick={() => onEdit(item)}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              icon={<JourneyIcon name="DELETE" />}
                              onClick={() => onRemove(item)}
                            >
                              Quitar
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      {gesture?.phase === "dragging" && createPortal(
        <div
          ref={dragPreview}
          className="journey-packing-drag-preview"
          style={{ transform: previewTransform(previewPosition.current) }}
          aria-hidden="true"
        >
          <span className="journey-packing-drag-preview__status">
            <JourneyIcon name={gesture.item.packed ? "CHECK" : "PENDING"} />
          </span>
          <span className="journey-packing-drag-preview__copy">
            <strong>{gesture.item.description}</strong>
            <small>× {gesture.item.quantity}{gesture.item.packed ? " · En la valija" : " · Pendiente"}</small>
          </span>
        </div>,
        document.body,
      )}
    </>
  );
}
