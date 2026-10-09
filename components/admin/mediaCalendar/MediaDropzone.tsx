/* eslint-disable @next/next/no-img-element -- Private signed URLs and local object previews must bypass the public image cache. */
"use client";
import {
  ImagePlus,
  Upload,
  ArrowLeft,
  ArrowRight,
  X,
  FileVideo,
} from "lucide-react";
import { useRef, useState } from "react";
import type { Post, Asset } from "@/features/mediaCalendar/types";
import type { LocalUpload } from "./useUploads";
export function MediaDropzone({
  post,
  assets,
  disabled,
  uploads,
  add,
  retry,
  cancel,
  reorder,
  remove,
}: {
  post: Post;
  assets: Asset[];
  disabled: boolean;
  uploads: LocalUpload[];
  add: (files: File[]) => void;
  retry: (key: string) => void;
  cancel: (key: string) => void;
  reorder: (ids: string[]) => void;
  remove: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const addFiles = (files: File[]) => {
    if (!disabled) add(files);
  };
  return (
    <section
      aria-label="Post media"
      className="mc-media"
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files);
        if (files.length) {
          e.preventDefault();
          addFiles(files);
        }
      }}
    >
      <div className="mc-section-label">
        <h3>Media</h3>
        <span>{post.assets.length}/10</span>
      </div>
      {!disabled && (
        <button
          type="button"
          className={`mc-drop ${over ? "mc-drop--over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            addFiles(Array.from(e.dataTransfer.files));
          }}
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={28} />
          <strong>Drop media here, or choose files</strong>
          <span>You can paste an image here too.</span>
          <small>Images up to 20 MB · MP4, MOV up to 50 MB</small>
        </button>
      )}
      <input
        ref={input}
        hidden
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <div className="mc-attachments">
        {post.assets.map((id, index) => {
          const asset = assets.find((a) => a.id === id),
            local = uploads.find((u) => u.assetId === id);
          return (
            <article className="mc-attachment" key={id}>
              {asset?.mime.startsWith("video/") ? (
                <div className="mc-video-tile">
                  <FileVideo />
                  <span>Video</span>
                </div>
              ) : (
                <img
                  src={
                    local?.url ??
                    `/api/media-calendar/assets?id=${id}&thumbnail=true`
                  }
                  alt={asset?.name ?? "Post media"}
                  loading="lazy"
                />
              )}
              <span>
                {index + 1}. {asset?.name ?? local?.file.name ?? "Media"}
              </span>
              {!disabled && (
                <div className="mc-media-tools">
                  <button
                    title="Move earlier"
                    aria-label={`Move media ${index + 1} earlier`}
                    disabled={!index}
                    onClick={() => {
                      const ids = [...post.assets];
                      [ids[index - 1], ids[index]] = [
                        ids[index],
                        ids[index - 1],
                      ];
                      reorder(ids);
                    }}
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <button
                    title="Move later"
                    aria-label={`Move media ${index + 1} later`}
                    disabled={index === post.assets.length - 1}
                    onClick={() => {
                      const ids = [...post.assets];
                      [ids[index + 1], ids[index]] = [
                        ids[index],
                        ids[index + 1],
                      ];
                      reorder(ids);
                    }}
                  >
                    <ArrowRight size={15} />
                  </button>
                  <button
                    title="Remove media"
                    aria-label={`Remove media ${index + 1}`}
                    onClick={() => remove(id)}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {uploads
        .filter((u) => u.status !== "done" && u.status !== "cancelled")
        .map((u) => (
          <article key={u.key} className="mc-upload">
            {u.file.type.startsWith("image/") ? (
              <img
                className="mc-upload-preview"
                src={u.url}
                alt="Uploading media preview"
              />
            ) : (
              <Upload size={16} />
            )}
            <div>
              <strong>{u.file.name}</strong>
              <span>
                {u.error ??
                  (u.status === "attaching"
                    ? "Adding to post…"
                    : `${u.progress}% uploaded`)}
              </span>
              <progress value={u.progress} max={100} />
            </div>
            {u.status === "failed" && (
              <button onClick={() => retry(u.key)}>Retry</button>
            )}
            <button
              aria-label={`Cancel ${u.file.name}`}
              onClick={() => cancel(u.key)}
            >
              <X size={15} />
            </button>
          </article>
        ))}
      {!post.assets.length && disabled && <p>No media added yet.</p>}
    </section>
  );
}
