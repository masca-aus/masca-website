// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PostPanel } from "../../components/admin/mediaCalendar/PostPanel";
import { newPost, applyAction } from "../../features/mediaCalendar/service";
import type { Post, CalendarUser } from "../../features/mediaCalendar/types";
const callbacks = vi.hoisted(() => ({ onPost: null as unknown as (p: Post) => void }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {} }) }));
vi.mock("next/dynamic", () => ({ default: () => (props: {onPost: (p: Post) => void}) => { callbacks.onPost = props.onPost; return <div>Caption ready</div>; } }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const user: CalendarUser = { id: "1", email: "test@masca.org.au", role: "administrator", status: "active" };
it("retains an edited hold reason and reports a conflict after a teammate changes it", async () => {
  let server = {...newPost(user, {title: "Shared draft"}), onHold: true, holdReason: "Original reason"};
  vi.stubGlobal("fetch", async (_url: string, opts?: RequestInit) => {
    if (opts?.body) {
      try {
        const next = structuredClone(server);
        applyAction(next, user, JSON.parse(String(opts.body)));
        server = next;
        return new Response(JSON.stringify({post:server}));
      } catch (e) { return new Response(JSON.stringify({error: (e as Error).message}), {status:409}); }
    }
    return new Response(JSON.stringify({post:server,assets:[],pendingUploads:[],history:[]}));
  });
  render(<PostPanel id={server.id} user={user} members={[]} categories={[]} onClose={() => {}} onChange={() => {}} />);
  await screen.findByText("Caption ready");
  fireEvent.click(screen.getByText("Post details"));
  const reason = screen.getByRole("textbox", {name:"Hold reason"}) as HTMLTextAreaElement;
  fireEvent.focus(reason);
  fireEvent.change(reason, {target:{value:"My unsaved reason"}});
  server = {...server, version:server.version+1, holdReason:"Teammate's reason"};
  act(() => callbacks.onPost(server));
  fireEvent.blur(reason);
  await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/changed|latest|conflict/i));
  expect(server.holdReason).toBe("Teammate's reason");
  expect(reason.value).toBe("My unsaved reason");
});
it.each([false, true])("advances queued edits only for its own acknowledged writes (peer edit: %s)", async (peerEdit) => {
  let server = newPost(user, {title:"Queued edits"});
  let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  const versions: number[] = [];
  vi.stubGlobal("fetch", async (_url: string, opts?: RequestInit) => {
    if (!opts?.body) return new Response(JSON.stringify({post:server,assets:[],pendingUploads:[],history:[]}));
    const action = JSON.parse(String(opts.body));
    versions.push(action.expectedVersion);
    try {
      const next = structuredClone(server);
      applyAction(next, user, action);
      server = next;
      if (versions.length === 1) await paused;
      return new Response(JSON.stringify({post:next}));
    } catch (e) { return new Response(JSON.stringify({error:(e as Error).message}), {status:409}); }
  });
  render(<PostPanel id={server.id} user={user} members={[]} categories={[]} onClose={() => {}} onChange={() => {}} />);
  await screen.findByText("Caption ready");
  fireEvent.click(screen.getByText("Post details"));
  fireEvent.click(screen.getByRole("checkbox", {name:"Put on hold"}));
  await waitFor(() => expect(versions).toEqual([1]));
  const reason = screen.getByRole("textbox", {name:"Hold reason"});
  fireEvent.change(reason, {target:{value:"Queued local reason"}});
  fireEvent.blur(reason);
  if (peerEdit) {
    server = {...server, version:server.version+1, holdReason:"Teammate's reason"};
    act(() => callbacks.onPost(server));
  }
  await act(async () => { release(); await paused; });
  await waitFor(() => expect(versions).toEqual([1, 2]));
  if (peerEdit) {
    await screen.findByRole("alert");
    expect(server.holdReason).toBe("Teammate's reason");
  } else await waitFor(() => expect(server.holdReason).toBe("Queued local reason"));
});
