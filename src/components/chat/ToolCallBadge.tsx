"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const fileName = typeof args.path === "string"
    ? args.path.split("/").pop() ?? args.path
    : null;

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":   return fileName ? `Creating ${fileName}` : "Creating file";
      case "str_replace":
      case "insert":   return fileName ? `Editing ${fileName}` : "Editing file";
      case "view":     return fileName ? `Reading ${fileName}` : "Reading file";
    }
  }

  if (toolName === "file_manager") {
    const newFileName = typeof args.new_path === "string"
      ? args.new_path.split("/").pop()
      : null;
    switch (args.command) {
      case "rename": return newFileName ? `Renaming to ${newFileName}` : "Renaming file";
      case "delete": return fileName ? `Deleting ${fileName}` : "Deleting file";
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation: tool }: ToolCallBadgeProps) {
  const label = getLabel(tool.toolName, tool.args as Record<string, unknown>);
  const done = tool.state === "result" && tool.result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
