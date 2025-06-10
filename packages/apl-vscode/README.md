<h1 align="center">

<p align="center">
  <code>apl-vscode</code>
</p>

<sup align="center">

VS Code extension for APL (Agentic Prompting Language)

</sup>

</h1>

![IDE](https://raw.githubusercontent.com/defuss/packages/apl-vscode/main/preview.png)

> `apl-vscode` is a Visual Studio Code extension that provides syntax highlighting for APL (Agentic Prompting Language), a domain-specific language designed for building agentic AI applications.

## ✨ Features

- **Syntax Highlighting**: Rich syntax highlighting for APL files (`.apl`)
- **Jinja2 Support**: Full support for Jinja2 templating syntax within APL templates
- **Markdown Integration**: Proper highlighting for Markdown content in APL files
- **Multi-step Workflow Support**: Syntax highlighting for APL's three-phase structure (`pre`, `prompt`, `post`)
- **Prompt Phase Recognition**: Special highlighting for system, user, assistant, and developer prompt sections

## 📦 Installation

1. Open Visual Studio Code
2. Go to the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "APL" or "Agentic Prompting Language"
4. Click Install on the `apl-vscode` extension

Alternatively, install from the command line:
```bash
code --install-extension defuss-apl-vscode
```

## 🎯 Usage

### File Extensions

The extension automatically activates for files with these extensions:
- `.apl` - Primary APL file extension

In markdown, you can embed APL code blocks using the `apl` language identifier:

    ```apl
    # Your APL code here
    ```

### Language Features

Once installed, you'll get:
- **Syntax highlighting** for APL keywords and structure
- **Jinja2 template highlighting** for embedded logic
- **Markdown rendering** for documentation sections
- **Proper indentation** and code folding

### Testing the Extension

1. Open the project in VS Code
2. Press `F5` to launch a new Extension Development Host window
3. In the new window, open or create an `.apl` file to test syntax highlighting
4. Make changes to the extension code and reload the window (`Ctrl+R` / `Cmd+R`) to see updates

### Contributing

We welcome contributions! Here's how you can help:

- **Report bugs** - Submit issues on our [GitHub repository](https://github.com/kyr0/defuss)
- **Request features** - Let us know what language features you'd like to see
- **Submit PRs** - Contribute syntax improvements, new features, or bug fixes
- **Improve documentation** - Help make APL more accessible to developers

**Areas for improvement:**
- IntelliSense and auto-completion
- Hover information for APL keywords
- Error validation and diagnostics
- Code snippets and templates
- Language server protocol support

## License
[MIT](https://github.com/defuss/packages/apl-vscode/blob/main/LICENSE)