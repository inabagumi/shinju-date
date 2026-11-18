"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Input } from "@shinju-date/ui";
import { GripVertical, X } from "lucide-react";
import { useCallback, useState } from "react";
import type { ChangeEvent, ClipboardEvent } from "react";

interface SortableItemProps {
  id: string;
  value: string;
  onChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onPaste: (id: string, text: string) => void;
  placeholder?: string;
  showRemove: boolean;
}

const SortableItem = ({
  id,
  onChange,
  onPaste,
  onRemove,
  placeholder,
  showRemove,
  value,
}: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(id, e.target.value);
    },
    [id, onChange]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text");
      if (text.includes("\n")) {
        e.preventDefault();
        onPaste(id, text);
      }
    },
    [id, onPaste]
  );

  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  return (
    <div className="flex items-center gap-2" ref={setNodeRef} style={style}>
      <Button
        aria-label="ドラッグして並び替え"
        className="cursor-grab touch-none px-2 py-1 text-muted active:cursor-grabbing"
        type="button"
        variant="ghost"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </Button>
      <Input
        className="flex-1"
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      {showRemove && (
        <Button
          aria-label="削除"
          className="text-danger hover:bg-danger/10"
          onClick={handleRemove}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      )}
    </div>
  );
};

interface Item {
  id: string;
  value: string;
}

interface SortableInputListProps {
  name: string;
  defaultValues?: string[];
  placeholder?: string;
  addButtonLabel?: string;
}

const NO_DEFAULT_VALUES: string[] = [];

export const SortableInputList = ({
  addButtonLabel = "追加",
  defaultValues = NO_DEFAULT_VALUES,
  name,
  placeholder,
}: SortableInputListProps) => {
  const [items, setItems] = useState<Item[]>(() =>
    defaultValues.length > 0
      ? defaultValues.map((value, index) => ({
          id: `${name}-${index}-${Temporal.Now.instant().epochMilliseconds}`,
          value,
        }))
      : [
          {
            id: `${name}-0-${Temporal.Now.instant().epochMilliseconds}`,
            value: "",
          },
        ]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex(
          (item) => item.id === active.id
        );
        const newIndex = currentItems.findIndex((item) => item.id === over.id);
        return arrayMove(currentItems, oldIndex, newIndex);
      });
    }
  }, []);

  const handleChange = useCallback((id: string, value: string) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, value } : item))
    );
  }, []);

  const handlePaste = useCallback((id: string, text: string) => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      return;
    }

    setItems((currentItems) => {
      const currentIndex = currentItems.findIndex((item) => item.id === id);
      if (currentIndex === -1) {
        // Item not found, return unchanged
        return currentItems;
      }

      const newItems = [...currentItems];
      const currentItem = newItems[currentIndex];
      if (!currentItem) {
        // Safety check, should never happen
        return currentItems;
      }

      // Set first line to current field
      // We know lines[0] exists because we checked lines.length > 0
      const firstLine = lines[0] as string;
      newItems[currentIndex] = {
        id: currentItem.id,
        value: firstLine,
      };

      // Create new items for remaining lines
      const additionalItems = lines.slice(1).map((line, index) => ({
        id: `${id}-paste-${index}-${Temporal.Now.instant().epochMilliseconds}`,
        value: line,
      }));

      // Insert additional items after current item
      newItems.splice(currentIndex + 1, 0, ...additionalItems);

      return newItems;
    });
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      setItems((currentItems) => {
        const filtered = currentItems.filter((item) => item.id !== id);
        // Keep at least one empty field
        return filtered.length > 0
          ? filtered
          : [
              {
                id: `${name}-0-${Temporal.Now.instant().epochMilliseconds}`,
                value: "",
              },
            ];
      });
    },
    [name]
  );

  const handleAdd = useCallback(() => {
    setItems((currentItems) => [
      ...currentItems,
      {
        id: `${name}-${currentItems.length}-${Temporal.Now.instant().epochMilliseconds}`,
        value: "",
      },
    ]);
  }, [name]);

  return (
    <div className="space-y-2">
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableItem
              id={item.id}
              key={item.id}
              onChange={handleChange}
              onPaste={handlePaste}
              onRemove={handleRemove}
              showRemove={items.length > 1}
              value={item.value}
              {...(placeholder ? { placeholder } : {})}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button onClick={handleAdd} size="sm" variant="secondary">
        {addButtonLabel}
      </Button>

      {/* Hidden inputs to submit the data */}
      {items.map((item, index) => (
        <input
          key={item.id}
          name={`${name}[${index}]`}
          type="hidden"
          value={item.value}
        />
      ))}
    </div>
  );
};
