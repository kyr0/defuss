/** Browser-native demo: no framework, JSX compiler, or remote services. */
export function start(df$) {
  let nextId = 3;
  let tasks = [
    { id: 1, title: "Query with native CSS selectors", done: false },
    { id: 2, title: "Preserve node identity with keys", done: false },
  ];
  const content = () =>
    tasks.map((task) => ({
      type: "li",
      attributes: {
        key: task.id,
        "data-id": task.id,
        class: task.done ? "done" : "",
      },
      children: [
        {
          type: "input",
          attributes: {
            type: "checkbox",
            checked: task.done,
            "aria-label": `Complete ${task.title}`,
            onChange(event) {
              task.done = event.target.checked;
              render();
            },
          },
        },
        { type: "span", children: [task.title] },
        {
          type: "button",
          attributes: {
            type: "button",
            "aria-label": `Remove ${task.title}`,
            onClick() {
              tasks = tasks.filter((item) => item !== task);
              render();
            },
          },
          children: ["Remove"],
        },
      ],
    }));
  function render() {
    df$("#tasks").morph(content());
    df$("#status").text(
      `${tasks.length} tasks; ${tasks.filter((task) => task.done).length} complete.`,
    );
  }
  df$("#add-form").on("submit", function (event) {
    event.preventDefault();
    const title = String(df$(this).form().get("title") ?? "").trim();
    if (!title) return;
    tasks.push({ id: nextId++, title, done: false });
    df$("#title").val("");
    render();
    df$("#title")[0].focus();
  });
  df$("#reverse").on("click", () => {
    tasks.reverse();
    render();
  });
  df$("#transition").on("click", async () => {
    tasks.reverse();
    await df$("#tasks").morph(content(), {
      transition: { type: "fade", duration: 150, target: "self" },
    });
    df$("#status").text(
      "Transition completed; the original keyed rows were retained.",
    );
  });
  df$("#data-form").on("submit", function (event) {
    event.preventDefault();
    const data = df$(this).form(event.submitter);
    df$("#form-result").text(
      JSON.stringify(
        {
          entries: [...data],
          topics: data.getAll("topic"),
          query: df$(this).serialize(event.submitter),
        },
        null,
        2,
      ),
    );
  });
  render();
}
