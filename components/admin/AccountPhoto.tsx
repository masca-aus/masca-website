"use client";
import Image from "next/image";
import { useAuth } from "@payloadcms/ui";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { compressUploadImage } from "@/utils/imageCompression";
import "./accountPhoto.css";
type Info = { userId: string; photoVersion: string | null };
export function AccountPhoto() {
  const { user } = useAuth();
  const pathname = usePathname();
  if (pathname !== "/admin/account" || !user) return null;
  return (
    <AccountPhotoEditor
      key={String(user.id)}
      email={String(user.email ?? "")}
    />
  );
}
function AccountPhotoEditor({ email }: { email: string }) {
  const [photo, setPhoto] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    fetch("/api/account/photo?info=true", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Unable to load your photo.");
        return data as Info;
      })
      .then((data) => {
        if (!controller.signal.aborted) setPhoto(data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load your photo.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          active.current = null;
        }
      });
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, []);
  async function save(file?: File) {
    if (active.current || loading || busy) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (
        file &&
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      )
        throw new Error("Choose a JPG, PNG or WebP photo.");
      const prepared = file ? await compressUploadImage(file) : undefined;
      if (controller.signal.aborted) return;
      const response = await fetch("/api/account/photo", {
        method: prepared ? "POST" : "DELETE",
        credentials: "same-origin",
        signal: controller.signal,
        ...(prepared
          ? { body: prepared, headers: { "Content-Type": prepared.type } }
          : {}),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Your photo could not be saved.");
      if (!controller.signal.aborted) {
        setPhoto(data);
        setFailed(false);
        setNotice(prepared ? "Photo saved." : "Photo removed.");
      }
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Your photo could not be saved.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        active.current = null;
        if (input.current) input.current.value = "";
      }
    }
  }
  const initials =
    email
      .split("@")[0]
      .split(/[._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "ME";
  return (
    <section
      className="masca-account-photo"
      aria-labelledby="account-photo-heading"
      aria-busy={loading || busy}
    >
      <div className="masca-account-photo__avatar">
        {photo?.photoVersion && !failed ? (
          <Image
            key={photo.photoVersion}
            src={`/api/account/photo?id=${encodeURIComponent(photo.userId)}&v=${encodeURIComponent(photo.photoVersion)}`}
            width={80}
            height={80}
            alt="Your account photo"
            unoptimized
            onError={() => setFailed(true)}
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </div>
      <div className="masca-account-photo__content">
        <h2 id="account-photo-heading">Profile photo</h2>
        <p>A face for your teammates to recognise. Shown inside the CMS.</p>
        <div className="masca-account-photo__actions">
          <button
            type="button"
            disabled={loading || busy}
            onClick={() => input.current?.click()}
          >
            {busy
              ? "Saving…"
              : photo?.photoVersion
                ? "Replace photo"
                : "Upload photo"}
          </button>
          {photo?.photoVersion && (
            <button
              type="button"
              disabled={loading || busy}
              onClick={() => void save()}
            >
              Remove photo
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Choose account photo"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void save(file);
          }}
        />
        <small>
          JPG, PNG or WebP. Large JPG and PNG photos are resized automatically.
          Saves immediately.
        </small>
        {notice && (
          <p className="masca-account-photo__notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="masca-account-photo__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
