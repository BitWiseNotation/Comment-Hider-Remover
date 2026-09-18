const vscode = require('vscode');  //imports using CommonJS syntax


// data for 35 languages 
const data = {
    "javascript": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "typescript": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "javascriptreact": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "typescriptreact": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "java": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "c": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "cpp": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "csharp": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "go": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "rust": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "php": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "swift": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "kotlin": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "dart": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "scala": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "groovy": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "objective-c": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },

    "python": { "line": "#", "block": { "starting": null, "ending": null } },
    "ruby": { "line": "#", "block": { "starting": "=begin", "ending": "=end" } },
    "shellscript": { "line": "#", "block": { "starting": null, "ending": null } },
    "yaml": { "line": "#", "block": { "starting": null, "ending": null } },
    "dockerfile": { "line": "#", "block": { "starting": null, "ending": null } },
    "powershell": { "line": "#", "block": { "starting": "<#", "ending": "#>" } },
    "perl": { "line": "#", "block": { "starting": null, "ending": null } },
    "r": { "line": "#", "block": { "starting": null, "ending": null } },
    "toml": { "line": "#", "block": { "starting": null, "ending": null } },
    "makefile": { "line": "#", "block": { "starting": null, "ending": null } },

    "sql": { "line": "--", "block": { "starting": "/*", "ending": "*/" } },
    "lua": { "line": "--", "block": { "starting": "--[[", "ending": "]]" } },
    "haskell": { "line": "--", "block": { "starting": "{-", "ending": "-}" } },
    "ada": { "line": "--", "block": { "starting": null, "ending": null } },

    "html": { "line": null, "block": { "starting": "<!--", "ending": "-->" } },
    "xml": { "line": null, "block": { "starting": "<!--", "ending": "-->" } },
    "markdown": { "line": null, "block": { "starting": "<!--", "ending": "-->" } },
    "vue": { "line": null, "block": { "starting": "<!--", "ending": "-->" } },

    "css": { "line": null, "block": { "starting": "/*", "ending": "*/" } },
    "scss": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },
    "less": { "line": "//", "block": { "starting": "/*", "ending": "*/" } },

    "matlab": { "line": "%", "block": { "starting": "%{", "ending": "%}" } },
    "latex": { "line": "%", "block": { "starting": null, "ending": null } },

    "vb": { "line": "'", "block": { "starting": null, "ending": null } },
    "fsharp": { "line": "//", "block": { "starting": "(*", "ending": "*)" } },
    "pascal": { "line": "//", "block": { "starting": "{", "ending": "}" } }
};

function lookup(languageId) {     //lookup function to match a language and find their comment symbols
    return data[languageId];
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function commentfinder(text, marker) {
    const escapedMarker = escapeRegex(marker);
    const regex = new RegExp(escapedMarker + '.*$', 'gm');
    let results = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        results.push({
            text: match[0],
            start: match.index,
            end: match.index + match[0].length
        });
    }
    return results;
}

function blockCommentFinder(text, startMarker, endMarker) {
    const escapedStart = escapeRegex(startMarker);
    const escapedEnd = escapeRegex(endMarker);
    const regex = new RegExp(escapedStart + '[\\s\\S]*?' + escapedEnd, 'g');
    let results = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        results.push({
            text: match[0],
            start: match.index,
            end: match.index + match[0].length
        });
    }
    return results;
}


function findCommentRanges(document) {
    const syntax = lookup(document.languageId);
    if (!syntax) return [];

    const text = document.getText();
    let matches = [];

    // Block comments first, so we can avoid double-matching line comments inside them
    if (syntax.block && syntax.block.starting && syntax.block.ending) {
        matches = matches.concat(
            blockCommentFinder(text, syntax.block.starting, syntax.block.ending)
        );
    }

    // Line comments, skipping any that fall inside an already-found block comment
    if (syntax.line) {
        const lineMatches = commentfinder(text, syntax.line);
        lineMatches.forEach((lm) => {
            const insideBlock = matches.some((bm) => lm.start >= bm.start && lm.start < bm.end);
            if (!insideBlock) {
                matches.push(lm);
            }
        });
    }

    // Convert character indices into vscode.Range objects
    return matches.map((m) => {
        const startPos = document.positionAt(m.start);
        const endPos = document.positionAt(m.end);
        return new vscode.Range(startPos, endPos);
    });
}

// Problem 9: the decoration that visually hides text without touching the file
const hideDecorationType = vscode.window.createTextEditorDecorationType({
    textDecoration: 'none; display: none;',
});

// Problem 10: per-file hidden/shown state, keyed by document URI string
const hiddenState = new Map();

function toggleHideComments() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const uri = editor.document.uri.toString();
    const isHidden = hiddenState.get(uri) === true;

    if (isHidden) {
        editor.setDecorations(hideDecorationType, []);
        hiddenState.set(uri, false);
    } else {
        const ranges = findCommentRanges(editor.document);
        if (ranges.length === 0) {
            vscode.window.showInformationMessage(
                `No comments found (or unsupported language: ${editor.document.languageId}).`
            );
            return;
        }
        editor.setDecorations(hideDecorationType, ranges);
        hiddenState.set(uri, true);
    }
}

function activate(context) {                     //required for extension
    const disposable = vscode.commands.registerCommand('commentHider.toggle', toggleHideComments);
    context.subscriptions.push(disposable);

    // Clean up tracked state when a file closes
    vscode.workspace.onDidCloseTextDocument((doc) => {
        hiddenState.delete(doc.uri.toString());
    });
}

function deactivate() {}    //required for extension

module.exports = {
    activate,
    deactivate
};
