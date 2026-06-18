import { useRef, useState } from "react";

/** 拖拽位置。 */
type DragPosition = {
  /** 横向偏移像素。 */
  x: number;
  /** 纵向偏移像素。 */
  y: number;
};

/** 拖拽起点记录。 */
type DragStart = {
  /** 起始横向偏移像素。 */
  originX: number;
  /** 起始纵向偏移像素。 */
  originY: number;
  /** 起始指针横坐标。 */
  pointerX: number;
  /** 起始指针纵坐标。 */
  pointerY: number;
};

/** 管理可拖拽弹窗的位置和标题栏事件。 */
export function useDraggableModal() {
  const [position, setPosition] = useState<DragPosition>({ x: 0, y: 0 });
  const dragStartRef = useRef<DragStart | null>(null);

  /** 重置弹窗位置。 */
  function resetPosition() {
    setPosition({ x: 0, y: 0 });
  }

  /** 按下弹窗标题栏时记录拖拽起点。 */
  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      originX: position.x,
      originY: position.y,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
  }

  /** 拖拽标题栏时移动弹窗。 */
  function drag(event: React.PointerEvent<HTMLDivElement>) {
    const dragStart = dragStartRef.current;

    if (!dragStart) {
      return;
    }

    setPosition({
      x: dragStart.originX + event.clientX - dragStart.pointerX,
      y: dragStart.originY + event.clientY - dragStart.pointerY,
    });
  }

  /** 松开标题栏时结束拖拽。 */
  function stopDrag(event: React.PointerEvent<HTMLDivElement>) {
    dragStartRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return {
    drag,
    position,
    resetPosition,
    startDrag,
    stopDrag,
  };
}
