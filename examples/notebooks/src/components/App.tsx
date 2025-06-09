import "./App.css";

import type EditorJS from "@editorjs/editorjs";
import { Async, createRef, $, type Ref } from "defuss";
import type { Notebook, NotebookFileEntry } from "../models/Notebook.js";
import { Editor } from "./Editor.js";
import type { RpcApi } from "../rpc.js";
import { getRpcClient } from "../lib/rpc-client.js";

const loadNotebooks = async (): Promise<Array<NotebookFileEntry>> => {
  const rpc = await getRpcClient<RpcApi>();
  const fooApi = new rpc.FooApi();
  const barApi = new rpc.BarApi();

  console.log("goil", await fooApi.helloWorld(42));
  console.log("works", await barApi.calc(42, 8));

  try {
    const response = await fetch("/api/notebook");
    const json = await response.json();
    return json.data;
  } catch (e) {
    console.error("Error loading notebooks!", e);
  }

  return [];
};

export async function NotebookList({ onNotebookLinkClick }) {
  // within an <Async /> parent, we can make use of asynchronous components
  const notebookFiles: Array<NotebookFileEntry> = await loadNotebooks();

  return (
    <>
      {notebookFiles.map(({ notebook }) => (
        <li>
          <a
            key={notebook.id}
            class="link notebook-link"
            href="#"
            onClick={(e) => onNotebookLinkClick(e, notebook)}
          >
            {notebook.title}
          </a>
        </li>
      ))}
    </>
  );
}

export interface NotebookListProps {
  tocRef: Ref;
  onNotebookLinkClick: Function;
}

export function Notebooks({ tocRef, onNotebookLinkClick }: NotebookListProps) {
  const listRef = createRef();

  const InnerList = () => (
    <Async fallback={<div>Loading...</div>}>
      <NotebookList onNotebookLinkClick={onNotebookLinkClick} />
    </Async>
  );

  return (
    <aside class="hbox px-xs absolute z-10 h-full toc" ref={tocRef}>
      <h5 class="p-none py-xs">
        Notebooks
        <button
          type="button"
          class="btn"
          onClick={() => $(listRef).update(<InnerList />)}
        >
          🔄
        </button>
      </h5>
      <ol ref={listRef}>
        <InnerList />
      </ol>
    </aside>
  );
}

export function App() {
  const sheetRef = createRef<Notebook>();
  const tocRef = createRef();
  const saveBtnRef = createRef();

  let activeNotebook: Notebook;
  let displayState: "source" | "wysiwyg" = "source";
  let tocDisplayState = true;
  let readOnly = true;
  let editor: EditorJS;

  const onNotebookLinkClick = (e: Event, notebook: Notebook) => {
    e.preventDefault();
    activeNotebook = notebook;

    if (sheetRef.current) {
      sheetRef.current.innerHTML = "";
    }
    console.log("notebook link clicked", notebook);

    editor = Editor({ sheetRef, notebook });
    console.log("editor", editor);

    toggleToc();
  };

  const switchSourceAndWysiwyg = async () => {
    console.log("switching source and wysiwyg");

    if (displayState === "source") {
      displayState = "wysiwyg";
    } else {
      displayState = "source";
    }

    const output = await editor.save();
    console.log("output", output);

    /*
    const copyOutputToClipboard = async () => {
      try {
        const output = await editor.save();
        const jsonOutput = JSON.stringify(output, null, 2); // serialize output to JSON with indentation
        await navigator.clipboard.writeText(jsonOutput); // copy JSON to clipboard
        console.log('Output copied to clipboard');
      } catch (error) {
        console.error('Failed to copy output to clipboard', error);
      }
    };

    // call the function to copy output to clipboard
    await copyOutputToClipboard();
    */

    // save to disk
    await fetch("/api/notebook", {
      method: "PATCH",
      body: JSON.stringify({
        ...activeNotebook,
        delta: output,
      }),
    });
  };

  const toggleToc = () => {
    tocDisplayState = !tocDisplayState;

    if (tocDisplayState) {
      $(tocRef).removeClass("hidden");
    } else {
      $(tocRef).addClass("hidden");
    }
  };

  const toggleReadOnlyAndEditMode = () => {
    console.log("toggling read only and edit mode");
    readOnly = !readOnly;

    $(saveBtnRef).toggleClass("hidden");

    editor.readOnly.toggle(readOnly);
  };

  return (
    <>
      <header class="p-xs vbox items-center justify-between">
        <div class="logo vbox items-center gap-xs" style={{ width: "auto" }}>
          <img
            src="/defuss_mascott.webp"
            alt="defuss Mascott"
            style="height: auto; width: 40px"
          />
          <h1 class="h4">
            defuss <span class="h5 dim">notebooks</span>
          </h1>
          <button type="button" class="btn rounded tocBtn" onClick={toggleToc}>
            ☰
          </button>
        </div>

        <div class="vbox gap-2xxs">
          <button
            type="button"
            class="btn rounded"
            onClick={toggleReadOnlyAndEditMode}
          >
            📝
          </button>
          <button
            type="button"
            class="btn rounded hidden"
            ref={saveBtnRef}
            onClick={switchSourceAndWysiwyg}
          >
            💾
          </button>
        </div>
      </header>

      <main class="vbox fit">
        <Notebooks tocRef={tocRef} onNotebookLinkClick={onNotebookLinkClick} />

        <section class="fit relative">
          <div
            class="rounded p-xs sheet h-full px-2xl mx-xs overflow-auto pb-xxl pt-xl"
            ref={sheetRef}
          >
            <h5>How to use this?</h5>
            <p>Open a notebook and play with the code.</p>
          </div>
        </section>
      </main>
    </>
  );
}
