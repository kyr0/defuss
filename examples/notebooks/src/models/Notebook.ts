import type { OutputData } from '@editorjs/editorjs';

export interface Notebook {
  id: string;
  title: string;
  path?: string;
  data: OutputData
}

export interface NotebookFileEntry {
  path: string;
  notebook: Notebook;
}
