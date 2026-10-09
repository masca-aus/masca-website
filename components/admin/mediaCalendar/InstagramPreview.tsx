/* eslint-disable @next/next/no-img-element -- Private signed URLs must bypass the public image cache. */
"use client";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Film,
  ImageIcon,
} from "lucide-react";
import { useState } from "react";
import type { Post, Asset } from "@/features/mediaCalendar/types";
export function InstagramPreview({
  post,
  assets,
}: {
  post: Post;
  assets: Asset[];
}) {
  const [slide, setSlide] = useState(0);
  const index = Math.min(slide, Math.max(0, post.assets.length - 1)),
    id = post.assets[index],
    asset = assets.find((a) => a.id === id);
  return (
    <section className="mc-preview" aria-label="Instagram preview">
      <div className="mc-section-label">
        <h3>Instagram preview</h3>
        <span>{post.type}</span>
      </div>
      <div className="mc-instagram">
        <header>
          <img src="/logo/favicon.ico" width="30" height="30" alt="" />
          <strong>mascanational</strong>
          <MoreHorizontal size={19} />
        </header>
        <div
          className={`mc-instagram-image ${post.type === "story" || post.type === "reel" ? "mc-instagram-image--portrait" : ""}`}
        >
          {id ? (
            asset?.mime.startsWith("video/") ? (
              <div className="mc-video-tile">
                <Film size={34} />
                <span>Video preview</span>
              </div>
            ) : (
              <img
                src={`/api/media-calendar/assets?id=${id}&thumbnail=true`}
                alt="Post preview"
                loading="lazy"
              />
            )
          ) : (
            <div>
              <ImageIcon size={35} />
              <span>Your media will appear here</span>
            </div>
          )}
          {post.assets.length > 1 && (
            <span className="mc-slide-count">
              {index + 1}/{post.assets.length}
            </span>
          )}
        </div>
        {post.assets.length > 1 && (
          <div className="mc-slide-dots">
            {post.assets.map((id, i) => (
              <button
                key={id}
                aria-label={`Preview image ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => setSlide(i)}
              />
            ))}
          </div>
        )}
        <div className="mc-instagram-icons">
          <Heart />
          <MessageCircle />
          <Send />
          <Bookmark />
        </div>
        <p>
          <strong>mascanational</strong>{" "}
          {post.caption || (
            <span className="mc-muted">Your caption will appear here.</span>
          )}
        </p>
      </div>
      <small>Layout preview · posting is done manually in Instagram.</small>
    </section>
  );
}
