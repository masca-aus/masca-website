"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Post } from "@/features/mediaCalendar/types";
import { acceptedMimes } from "@/features/mediaCalendar/uploadPolicy";
import { api, calendarAPI, RequestError } from "./api";
export type LocalUpload = {
  key: string;
  file: File;
  url: string;
  progress: number;
  status:
    "queued" | "uploading" | "attaching" | "done" | "failed" | "cancelled";
  error?: string;
  assetId?: string;
  uploaded?: boolean;
};
export function useUploads(post: Post, onPost: (post: Post) => void) {
  const [uploads, setUploads] = useState<LocalUpload[]>([]);
  const items = useRef<LocalUpload[]>([]),
    active = useRef(0),
    mounted = useRef(true),
    postRef = useRef(post),
    callback = useRef(onPost),
    xhrs = useRef(new Map<string, XMLHttpRequest>());
  useEffect(() => {
    postRef.current = post;
    callback.current = onPost;
  });
  const sync = () => {
    if (mounted.current) setUploads(items.current.map((i) => ({ ...i })));
  };
  const pump = useRef(() => {});
  useEffect(() => {
    pump.current = () => {
      while (active.current < 3) {
        const item = items.current.find((i) => i.status === "queued");
        if (!item) break;
        item.status = "uploading";
        active.current++;
        sync();
        (async () => {
          try {
            if (!item.assetId) {
              const init = await api<{ id: string; url: string }>(
                `${calendarAPI}/assets`,
                {
                  action: "init",
                  postId: postRef.current.id,
                  name: item.file.name,
                  mime: item.file.type,
                  size: item.file.size,
                },
              );
              item.assetId = init.id;
              if (item.status === "cancelled") {
                await api(`${calendarAPI}/assets`, {
                  action: "cancel",
                  id: init.id,
                });
                return;
              }
              await new Promise<void>((resolve, reject) => {
                const x = new XMLHttpRequest();
                xhrs.current.set(item.key, x);
                x.open("PUT", init.url);
                x.setRequestHeader("Content-Type", item.file.type);
                x.upload.onprogress = (e) => {
                  if (e.lengthComputable) {
                    item.progress = Math.round((e.loaded / e.total) * 100);
                    sync();
                  }
                };
                x.onload = () =>
                  x.status >= 200 && x.status < 300
                    ? resolve()
                    : reject(new Error("Upload failed. Please retry."));
                x.onerror = () =>
                  reject(new Error("Connection lost. Please retry."));
                x.onabort = () => reject(new Error("Upload cancelled."));
                x.send(item.file);
              });
              item.uploaded = true;
            }
            if (item.status === "cancelled") return;
            item.status = "attaching";
            sync();
            for (let attempt = 0; attempt < 4; attempt++) {
              try {
                const result = await api<{ post: Post }>(
                  `${calendarAPI}/assets`,
                  {
                    action: "finish",
                    id: item.assetId,
                    expectedVersion: postRef.current.version,
                  },
                );
                postRef.current = result.post;
                callback.current(result.post);
                break;
              } catch (e) {
                if (
                  e instanceof RequestError &&
                  e.status === 409 &&
                  attempt < 3
                ) {
                  const current = await api<{ post: Post }>(
                    `${calendarAPI}?id=${postRef.current.id}`,
                  );
                  postRef.current = current.post;
                  if (["in_review", "posted"].includes(current.post.status))
                    throw e;
                } else throw e;
              }
            }
            item.status = "done";
            item.progress = 100;
          } catch (e) {
            if (item.status !== "cancelled") {
              item.status = "failed";
              item.error = e instanceof Error ? e.message : "Upload failed.";
            }
          } finally {
            active.current--;
            xhrs.current.delete(item.key);
            sync();
            pump.current();
          }
        })();
      }
    };
  });
  const add = useCallback((files: File[]) => {
    for (const file of files) {
      const item: LocalUpload = {
        key: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        progress: 0,
        status: "queued",
      };
      if (!acceptedMimes.includes(file.type)) {
        item.status = "failed";
        item.error = "Use JPEG, PNG, WebP, MP4 or MOV.";
      }
      items.current.push(item);
    }
    sync();
    pump.current();
  }, []);
  const retry = (key: string) => {
    const i = items.current.find((i) => i.key === key);
    if (i) {
      if (i.assetId && !i.uploaded) {
        void api(`${calendarAPI}/assets`, { action: "cancel", id: i.assetId });
        i.assetId = undefined;
      }
      i.status = "queued";
      i.error = undefined;
      sync();
      pump.current();
    }
  };
  const cancel = (key: string) => {
    const i = items.current.find((i) => i.key === key);
    if (i) {
      i.status = "cancelled";
      xhrs.current.get(key)?.abort();
      if (i.assetId)
        void api(`${calendarAPI}/assets`, { action: "cancel", id: i.assetId });
      sync();
    }
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const x of xhrs.current.values()) x.abort();
      for (const i of items.current) URL.revokeObjectURL(i.url);
    };
  }, []);
  return {
    uploads,
    add,
    retry,
    cancel,
    pending: uploads.some((i) => !["done", "cancelled"].includes(i.status)),
  };
}
