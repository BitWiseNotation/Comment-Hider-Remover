# Comment Hider

Toggle-hide or permanently remove comments in any file — one shortcut for each.


## Features

- **Toggle Hide Comments** (`Ctrl+F1` / `Cmd+F1`) — instantly hides every comment in the active file. Press again to bring them back. Nothing is ever deleted; this is purely visual.
  - Multi-line comment blocks are **folded**, collapsing the vertical space they took up.
  - Trailing (inline) comments and standalone single-line comments are hidden via decoration.
- **Remove All Comments** (`Ctrl+F2` / `Cmd+F2`) — permanently deletes every comment from the file. This edits the file directly; undo with `Ctrl+Z` if needed.
- Both commands are also available as icon buttons in the editor title bar, and from the Command Palette (`Ctrl+Shift+P` → "Toggle Hide Comments" / "Remove All Comments").

## Supported languages

JavaScript, TypeScript, JSX/TSX, Java, C, C++, C#, Go, Rust, PHP, Swift, Kotlin, Dart, Scala, Groovy, Objective-C, Python, Ruby, Shell scripts, YAML, Dockerfile, PowerShell, Perl, R, TOML, Makefile, SQL, Lua, Haskell, Ada, HTML, XML, Markdown, Vue, CSS, SCSS, LESS, MATLAB, LaTeX, Visual Basic, F#, Pascal.

Don't see your language? Open an issue or a PR — adding one is a single entry in the `data` object at the top of `extension.js`.

## How it works

- Comments are located with regex matching tailored to each language's line/block comment syntax, then classified as either:
  - **Whole-line** comments (the entire line is a comment) — a run of 2+ consecutive whole-line comments gets registered with a custom folding range and folded via VS Code's built-in fold command, which is what actually collapses the vertical gap.
  - **Trailing** comments (following real code on the same line) and **standalone single-line** comments — hidden via a text editor decoration (`textDecoration: 'none; display: none;'`), which visually removes the text without touching the file.
- The permanent-removal command reuses the same detection, but deletes the matched ranges directly from the document instead of decorating or folding them — including cleanly removing the surrounding blank line for whole-line blocks so no gaps are left behind.

## Known limitations

- A **standalone single-line comment** (not part of a multi-line block) can be hidden but not folded — VS Code's folding API needs at least 2 lines to collapse anything, so a lone comment line leaves a small blank-line gap when toggled. This is a constraint of the API, not a bug.
- Comment detection uses per-language regex rather than a full language parser, so on rare edge cases (e.g. a `//` inside a string literal that isn't actually a comment) it can misidentify something as a comment.

## Installation

Search "Comment Hider" in the Extensions view (`Ctrl+Shift+X`) inside VS Code, or install from the [Marketplace](https://marketplace.visualstudio.com/).


Open the folder in VS Code and press `F5` to launch an Extension Development Host with the extension loaded. No build step — it's plain JavaScript.

## License

MIT