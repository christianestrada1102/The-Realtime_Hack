"use client";

import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

const editorTheme = EditorView.theme({
  "&": { backgroundColor: "#0d0d0d", height: "100%" },
  ".cm-content": { fontFamily: "var(--font-mono, monospace)", fontSize: "13px", padding: "12px 0" },
  ".cm-gutters": { backgroundColor: "#0d0d0d", borderRight: "1px solid #1a1a1a", color: "#3f3f46" },
  ".cm-line": { padding: "0 12px 0 8px" },
  ".cm-focused": { outline: "none" },
  ".cm-editor": { height: "100%" },
  ".cm-scroller": { overflow: "auto" },
});

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        javascript({ typescript: true }),
        oneDark,
        editorTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
