"use client";

import { Button, Input } from "@shinju-date/ui";
import { useState } from "react";

import { useServerAction } from "@/lib/use-server-action";

import { addQueryAction } from "../_actions";

/** 手動のおすすめクエリを追加するフォーム。成功したら、入力を空にしてトーストで知らせる */
export function AddQueryForm() {
  const [newQuery, setNewQuery] = useState("");
  const addQuery = useServerAction(addQueryAction, {
    errorText: "追加に失敗しました。",
    onSuccess: () => setNewQuery(""),
    successText: "クエリを追加しました。",
  });
  const { isPending } = addQuery;

  const handleAddQuery = () => {
    void addQuery.run(newQuery);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 sm:max-w-md">
        <label
          className="mb-2 block text-meta font-semibold"
          htmlFor="new-query"
        >
          新しい手動クエリを追加
        </label>
        <Input
          disabled={isPending}
          id="new-query"
          onChange={(e) => setNewQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAddQuery();
            }
          }}
          placeholder="クエリを入力..."
          type="text"
          value={newQuery}
        />
      </div>
      <Button
        disabled={isPending || !newQuery.trim()}
        onClick={handleAddQuery}
        type="button"
      >
        {isPending ? "追加中..." : "追加"}
      </Button>
    </div>
  );
}
