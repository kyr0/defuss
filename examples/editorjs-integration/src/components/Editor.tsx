import EditorJS from '@editorjs/editorjs'; 
import Header from '@editorjs/header'; 
import List from '@editorjs/list'; 
import Marker from '@editorjs/marker'; 
import Underline from '@editorjs/underline';
import ChangeCase from 'editorjs-change-case';
import StrikeThrough from '@sotaproject/strikethrough';
import Alert from 'editorjs-alert';
import Delimiter from '@editorjs/delimiter';
import Quote from '@coolbytes/editorjs-quote';
import Undo from 'editorjs-undo';
import DragDrop from "editorjs-drag-drop";
import InlineImage from 'editorjs-inline-image';
import MathLive from './tools/math/Math.js'
import CodeEditor from './tools/code/Code.js'
import Table from '@editorjs/table'
import TextAlign from '@canburaks/text-align-editorjs';
import type { Ref } from 'defuss/jsx-runtime';
import type { Notebook } from '../models/Notebook.js';

export interface EditorProps {
  sheetRef: Ref
  notebook: Notebook
}

export const Editor = ({ sheetRef, notebook }) => {
  const editor = new EditorJS({
    onReady: () => {
      //new DragDrop(editor, "2px solid #fff");
      new Undo({ editor });
    },
    autofocus: true,
    minHeight: 5,
    readOnly: true,
    holder: sheetRef.current,
    tools: { 
      header: Header, 
      list: List,
      marker: Marker,
      underline: Underline,
      changeCase: ChangeCase,
      strikethrough: StrikeThrough,
      textAlign:TextAlign,
      alert: Alert,
      quote: Quote, 
      table: {
        // @ts-ignore
        class: Table,
        inlineToolbar: true,
        config: {
          rows: 2,
          cols: 3,
          maxRows: 5,
          maxCols: 5,
        },
      },
      code: CodeEditor,
      image: {
        class: InlineImage,
        inlineToolbar: true,
        config: {
          embed: {
            display: true,
          },
        },
      },
      math: {
        class: MathLive,
        inlineToolbar: true,
        config: {
          virtualKeyboardMode: 'manual',
          defaultMode: 'math',
          smartMode:false,
          virtualKeyboardTheme:'material',
        },
      },
      delimiter: {
        class: Delimiter,
        config: {
          styleOptions: ['star', 'dash', 'line'],
          defaultStyle: 'star',
          lineWidthOptions: [8, 15, 25, 35, 50, 60, 100],
          defaultLineWidth: 25,
          lineThicknessOptions: [1, 2, 3, 4, 5, 6],
          defaultLineThickness: 2,
        }
      },
    }, 
    data: notebook.data,
    onChange: async(api, event) => {
      console.log('Now I know that Editor\'s content changed!', event)

      const output = await editor.save();
      console.log('output', output)
    }
  });

  return editor;
}