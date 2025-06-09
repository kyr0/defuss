import { createRef, type CSSProperties } from "defuss";
import { DSON } from "defuss-dson";
import { MonacoEditor } from "./MonacoEditor";

const textareaStyle: CSSProperties = {
  width: "40vw",
  borderRadius: "0.5rem",
  marginTop: "1rem",
  padding: "1rem",
  height: "550px",
  textAlign: "left",
};

const exampleCode = `const map = new Map();
map.set("name", "defuss");
map.set("age", 1);

const set = new Set();
set.add("name");
set.add("defuss");

const arrayOfRegexes = [/[a-zA-Z0-9]/];

// custom class support
class Foo {
  constructor(foo = 123) {
    this.foo = foo;
    console.log("Foo constructor called with:", foo);
  }
}

const objects = {
  name: "defuss",
  age: 39,
  authorEmail: "info@aron-homberg.de",
}
objects.circularReference = objects; // no problem

const everything = {
  maps: [map],
  sets: [set],
  arrays: [arrayOfRegexes],
  regex: /[a-zA-Z0-9]/,
  objects: [objects, new Foo(345)]
};

const serialized = await DSON.stringify(everything); 

// pass custom class constructor functions if used
const parsed = await DSON.parse(serialized);

const isEqual = await DSON.isEqual(
  { ...everything },
  parsed,
);

console.log("DSON parsed:");
console.dir(parsed);

console.log("DSON isEqual (parsed vs. everything):", isEqual);

const clone = await DSON.clone(parsed)

console.log("DSON clone:", clone, "isEqual:", await DSON.isEqual(clone, everything));

return serialized;`;

// @ts-ignore
window.DSON = DSON;

export const Repl = () => {
  const codeRef = createRef<string, HTMLTextAreaElement>();
  const serializationRef = createRef<string, HTMLTextAreaElement>();

  // co-routine to run when ready
  const onMount = async () => {
    const codeEditor = new MonacoEditor(
      {
        language: "javascript",
        code: exampleCode,
      },
      {
        language: "javascript",
        theme: "vs-dark",
        onReturn: async (value) => {
          updateResultEditor(await value);
        },
        onChange: (value) => {
          console.clear();
          codeEditor.executeCode(value);
        },
      },
      false,
    );

    codeRef.update(codeEditor.getDomNode());

    const resultEditor = new MonacoEditor(
      {
        language: "javascript",
        code: "",
      },
      {
        language: "javascript",
        theme: "vs-dark",
      },
      true,
    );
    serializationRef.update(resultEditor.getDomNode());

    const updateResultEditor = (value: string) => {
      resultEditor.setValue({
        code: value,
        language: "javascript",
      });
    };

    queueMicrotask(() => {
      codeEditor.executeCode(codeEditor.getValue());
    });
  };

  return (
    <div class={"vbox"} onMount={onMount}>
      <div>
        <h4>JavaScript</h4>

        <div
          ref={codeRef}
          style={{
            ...textareaStyle,
            marginRight: "1rem",
          }}
        ></div>
      </div>
      <div>
        <h4>DSON</h4>

        <div
          style={{
            ...textareaStyle,
            marginLeft: "1rem",
          }}
          ref={serializationRef}
        ></div>
      </div>
    </div>
  );
};
