'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  type ChangeEvent,
  type ClipboardEvent,
  useCallback,
  useState,
} from 'react'

type SortableItemProps = {
  id: string
  value: string
  onChange: (id: string, value: string) => void
  onRemove: (id: string) => void
  onPaste: (id: string, text: string) => void
  placeholder?: string
  showRemove: boolean
}

function SortableItem({
  id,
  onChange,
  onPaste,
  onRemove,
  placeholder,
  showRemove,
  value,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(id, e.target.value)
    },
    [id, onChange],
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text')
      if (text.includes('\n')) {
        e.preventDefault()
        onPaste(id, text)
      }
    },
    [id, onPaste],
  )

  const handleRemove = useCallback(() => {
    onRemove(id)
  }, [id, onRemove])

  return (
    <div className="flex items-center gap-2" ref={setNodeRef} style={style}>
      <button
        aria-label="ドラッグして並び替え"
        className="cursor-grab touch-none rounded px-2 py-1 text-gray-500 hover:bg-gray-100 active:cursor-grabbing"
        type="button"
        {...attributes}
        {...listeners}
      >
        <span className="text-lg">⋮⋮</span>
      </button>
      <input
        className="flex-1 rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      {showRemove && (
        <button
          aria-label="削除"
          className="rounded px-2 py-1 text-red-600 hover:bg-red-50"
          onClick={handleRemove}
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  )
}

type Item = {
  id: string
  value: string
}

type SortableInputListProps = {
  name: string
  defaultValues?: string[]
  placeholder?: string
  addButtonLabel?: string
}

export function SortableInputList({
  addButtonLabel = '追加',
  defaultValues = [],
  name,
  placeholder,
}: SortableInputListProps) {
  const [items, setItems] = useState<Item[]>(() =>
    defaultValues.length > 0
      ? defaultValues.map((value, index) => ({
          id: `${name}-${index}-${Date.now()}`,
          value,
        }))
      : [{ id: `${name}-0-${Date.now()}`, value: '' }],
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  const handleChange = useCallback((id: string, value: string) => {
    setItems((items) =>
      items.map((item) => (item.id === id ? { ...item, value } : item)),
    )
  }, [])

  const handlePaste = useCallback((id: string, text: string) => {
    const lines = text.split('\n').filter((line) => line.trim() !== '')
    if (lines.length === 0) return

    setItems((items) => {
      const currentIndex = items.findIndex((item) => item.id === id)
      if (currentIndex === -1) return items // Item not found, return unchanged

      const newItems = [...items]
      const currentItem = newItems[currentIndex]
      if (!currentItem) return items // Safety check, should never happen

      // Set first line to current field
      // We know lines[0] exists because we checked lines.length > 0
      const firstLine = lines[0] as string
      newItems[currentIndex] = {
        id: currentItem.id,
        value: firstLine,
      }

      // Create new items for remaining lines
      const additionalItems = lines.slice(1).map((line, index) => ({
        id: `${id}-paste-${index}-${Date.now()}`,
        value: line,
      }))

      // Insert additional items after current item
      newItems.splice(currentIndex + 1, 0, ...additionalItems)

      return newItems
    })
  }, [])

  const handleRemove = useCallback(
    (id: string) => {
      setItems((items) => {
        const filtered = items.filter((item) => item.id !== id)
        // Keep at least one empty field
        return filtered.length > 0
          ? filtered
          : [{ id: `${name}-0-${Date.now()}`, value: '' }]
      })
    },
    [name],
  )

  const handleAdd = useCallback(() => {
    setItems((items) => [
      ...items,
      { id: `${name}-${items.length}-${Date.now()}`, value: '' },
    ])
  }, [name])

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

      <button
        className="rounded-md border border-774-blue-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        onClick={handleAdd}
        type="button"
      >
        {addButtonLabel}
      </button>

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
  )
}
