import { Button, Input } from "@shinju-date/ui";
import { GripVertical, X } from "lucide-react";

interface SortableInputListFallbackProps {
  name: string;
  defaultValues?: string[];
  placeholder?: string;
  addButtonLabel?: string;
}

const NO_DEFAULT_VALUES: string[] = [];

/**
 * `SortableInputList`（dnd-kit）を読み込むまでの表示。読み込んだ後と同じ行数・
 * 同じ並びで部品を置き、入力欄の位置がずれないようにする。入力した内容が
 * 読み込み後に失われないよう、入力欄とボタンは操作できないようにしておく。
 * 読み込み中に送信されても値が消えないよう、送信用の値は読み込み後と同じ形で置く。
 */
export const SortableInputListFallback = ({
  addButtonLabel = "追加",
  defaultValues = NO_DEFAULT_VALUES,
  name,
  placeholder,
}: SortableInputListFallbackProps) => {
  const values = defaultValues.length > 0 ? defaultValues : [""];

  return (
    <div aria-busy="true" className="space-y-2">
      {values.map((value, index) => (
        <div className="flex items-center gap-2" key={index}>
          <Button
            aria-label="ドラッグして並び替え"
            className="px-2 py-1 text-muted"
            disabled
            variant="ghost"
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </Button>
          <Input
            className="flex-1"
            disabled
            placeholder={placeholder}
            readOnly
            type="text"
            value={value}
          />
          {values.length > 1 && (
            <Button
              aria-label="削除"
              className="text-danger hover:bg-danger/10"
              disabled
              size="sm"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          )}
        </div>
      ))}

      <Button disabled size="sm" variant="secondary">
        {addButtonLabel}
      </Button>

      {values.map((value, index) => (
        <input
          key={index}
          name={`${name}[${index}]`}
          type="hidden"
          value={value}
        />
      ))}
    </div>
  );
};
