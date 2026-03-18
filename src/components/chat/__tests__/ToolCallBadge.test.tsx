import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result" = "call"
): ToolInvocation {
  return {
    toolCallId: "test-id",
    toolName,
    args,
    state,
    ...(state === "result" ? { result: "ok" } : {}),
  } as ToolInvocation;
}

// str_replace_editor

test("shows 'Creating <file>' for str_replace_editor create", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/Button.tsx" })} />);
  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
});

test("shows 'Editing <file>' for str_replace_editor str_replace", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/src/App.jsx" })} />);
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Editing <file>' for str_replace_editor insert", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "insert", path: "/src/App.jsx" })} />);
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Reading <file>' for str_replace_editor view", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "view", path: "/src/index.ts" })} />);
  expect(screen.getByText("Reading index.ts")).toBeDefined();
});

// file_manager

test("shows 'Renaming to <file>' for file_manager rename", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("file_manager", { command: "rename", path: "/src/old.tsx", new_path: "/src/new.tsx" })} />);
  expect(screen.getByText("Renaming to new.tsx")).toBeDefined();
});

test("shows 'Deleting <file>' for file_manager delete", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("file_manager", { command: "delete", path: "/src/unused.tsx" })} />);
  expect(screen.getByText("Deleting unused.tsx")).toBeDefined();
});

// unknown tool falls back to tool name

test("falls back to tool name for unknown tools", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("some_other_tool", { command: "run" })} />);
  expect(screen.getByText("some_other_tool")).toBeDefined();
});

// loading vs done state

test("shows spinner when call is in progress", () => {
  const { container } = render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/A.tsx" }, "call")} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("shows green dot when call is complete", () => {
  const { container } = render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/A.tsx" }, "result")} />);
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});
