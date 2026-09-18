const vscode = require('vscode');

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

function lookup(languageId) {
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

function findCommentMatches(document) {
    const syntax = lookup(document.languageId);
    if (!syntax) return [];

    const text = document.getText();
    let matches = [];

    if (syntax.block && syntax.block.starting && syntax.block.ending) {
        matches = matches.concat(
            blockCommentFinder(text, syntax.block.starting, syntax.block.ending)
        );
    }

    if (syntax.line) {
        const lineMatches = commentfinder(text, syntax.line);
        lineMatches.forEach((lm) => {
            const insideBlock = matches.some((bm) => lm.start >= bm.start && lm.start < bm.end);
            if (!insideBlock) {
                matches.push(lm);
            }
        });
    }

    return matches;
}

function classifyMatches(document, matches) {
    const trailingRanges = [];
    const wholeLineNumbers = new Set();

    matches.forEach((m) => {
        const startPos = document.positionAt(m.start);
        const endPos = document.positionAt(m.end);
        const range = new vscode.Range(startPos, endPos);

        const firstLineText = document.lineAt(startPos.line).text;
        const beforeText = firstLineText.slice(0, startPos.character);
        const isWholeLine = beforeText.trim() === '';

        if (isWholeLine) {
            for (let ln = startPos.line; ln <= endPos.line; ln++) {
                wholeLineNumbers.add(ln);
            }
        } else {
            trailingRanges.push(range);
        }
    });

    const sorted = Array.from(wholeLineNumbers).sort((a, b) => a - b);
    const allBlocks = [];
    let blockStart = null;
    let prev = null;
    sorted.forEach((ln) => {
        if (blockStart === null) {
            blockStart = ln;
        } else if (ln !== prev + 1) {
            allBlocks.push({ start: blockStart, end: prev });
            blockStart = ln;
        }
        prev = ln;
    });
    if (blockStart !== null) {
        allBlocks.push({ start: blockStart, end: prev });
    }

    return { trailingRanges, allBlocks };
}

const hideDecorationType = vscode.window.createTextEditorDecorationType({
    textDecoration: 'none; display: none;',
});

const foldingRangesMap = new Map();
const foldingChangeEmitter = new vscode.EventEmitter();

const foldingProvider = {
    onDidChangeFoldingRanges: foldingChangeEmitter.event,
    provideFoldingRanges(document) {
        return foldingRangesMap.get(document.uri.toString()) || [];
    }
};

const hiddenState = new Map();

async function toggleHideComments() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const uri = editor.document.uri.toString();
    const state = hiddenState.get(uri);
    const isHidden = state && state.hidden;

    if (isHidden) {
        editor.setDecorations(hideDecorationType, []);
        const linesToUnfold = state.blocks.map((b) => b.start);
        if (linesToUnfold.length > 0) {
            await vscode.commands.executeCommand('editor.unfold', { selectionLines: linesToUnfold });
        }
        foldingRangesMap.delete(uri);
        foldingChangeEmitter.fire(editor.document);
        hiddenState.set(uri, { hidden: false, blocks: [] });
        return;
    }

    const rawMatches = findCommentMatches(editor.document);
    if (rawMatches.length === 0) {
        vscode.window.showInformationMessage(
            `No comments found (or unsupported language: ${editor.document.languageId}).`
        );
        return;
    }

    const { trailingRanges, allBlocks } = classifyMatches(editor.document, rawMatches);
    const foldBlocks = allBlocks.filter((b) => b.end > b.start);

    const singleLineRanges = allBlocks
        .filter((b) => b.end === b.start)
        .map((b) => {
            const lineLength = editor.document.lineAt(b.start).text.length;
            return new vscode.Range(
                new vscode.Position(b.start, 0),
                new vscode.Position(b.start, lineLength)
            );
        });

    editor.setDecorations(hideDecorationType, trailingRanges.concat(singleLineRanges));

    if (foldBlocks.length > 0) {
        const foldingRanges = foldBlocks.map(
            (b) => new vscode.FoldingRange(b.start, b.end, vscode.FoldingRangeKind.Comment)
        );
        foldingRangesMap.set(uri, foldingRanges);
        foldingChangeEmitter.fire(editor.document);
        const linesToFold = foldBlocks.map((b) => b.start);
        await vscode.commands.executeCommand('editor.fold', { selectionLines: linesToFold });
    }

    hiddenState.set(uri, { hidden: true, blocks: foldBlocks });
}

function trimmedStartForTrailing(document, range) {
    const lineText = document.lineAt(range.start.line).text;
    const before = lineText.slice(0, range.start.character);
    const trimmed = before.replace(/\s+$/, '');
    return new vscode.Position(range.start.line, trimmed.length);
}

function buildDeletionRanges(document, trailingRanges, allBlocks) {
    const deletions = [];

    trailingRanges.forEach((range) => {
        const start = trimmedStartForTrailing(document, range);
        deletions.push(new vscode.Range(start, range.end));
    });

    allBlocks.forEach((b) => {
        if (b.end < document.lineCount - 1) {
            deletions.push(new vscode.Range(
                new vscode.Position(b.start, 0),
                new vscode.Position(b.end + 1, 0)
            ));
        } else if (b.start > 0) {
            const prevLineLen = document.lineAt(b.start - 1).text.length;
            deletions.push(new vscode.Range(
                new vscode.Position(b.start - 1, prevLineLen),
                new vscode.Position(b.end, document.lineAt(b.end).text.length)
            ));
        } else {
            const lastLineLen = document.lineAt(b.end).text.length;
            deletions.push(new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(b.end, lastLineLen)
            ));
        }
    });

    return deletions;
}

async function removeCommentsPermanently() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const document = editor.document;
    const uri = document.uri.toString();
    const state = hiddenState.get(uri);

    if (state && state.hidden) {
        editor.setDecorations(hideDecorationType, []);
        const linesToUnfold = state.blocks.map((b) => b.start);
        if (linesToUnfold.length > 0) {
            await vscode.commands.executeCommand('editor.unfold', { selectionLines: linesToUnfold });
        }
        foldingRangesMap.delete(uri);
        foldingChangeEmitter.fire(document);
        hiddenState.set(uri, { hidden: false, blocks: [] });
    }

    const rawMatches = findCommentMatches(document);
    if (rawMatches.length === 0) {
        vscode.window.showInformationMessage(
            `No comments found (or unsupported language: ${document.languageId}).`
        );
        return;
    }

    const { trailingRanges, allBlocks } = classifyMatches(document, rawMatches);
    const deletions = buildDeletionRanges(document, trailingRanges, allBlocks);

    const success = await editor.edit((editBuilder) => {
        deletions.forEach((r) => editBuilder.delete(r));
    });

    if (!success) {
        vscode.window.showErrorMessage('Edit failed to apply.');
        return;
    }

    vscode.window.showInformationMessage(`Removed ${rawMatches.length} comment(s) from the file.`);
}

function activate(context) {
    const disposable = vscode.commands.registerCommand('commentHider.toggle', toggleHideComments);
    context.subscriptions.push(disposable);

    const removeDisposable = vscode.commands.registerCommand('commentHider.removeAll', removeCommentsPermanently);
    context.subscriptions.push(removeDisposable);

    const foldingDisposable = vscode.languages.registerFoldingRangeProvider('*', foldingProvider);
    context.subscriptions.push(foldingDisposable);
    context.subscriptions.push(foldingChangeEmitter);
    context.subscriptions.push(hideDecorationType);

    vscode.workspace.onDidCloseTextDocument((doc) => {
        const uri = doc.uri.toString();
        hiddenState.delete(uri);
        foldingRangesMap.delete(uri);
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};