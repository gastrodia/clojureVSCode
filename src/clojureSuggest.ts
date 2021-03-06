'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    nREPLClient
} from './nreplClient';
import {
    ClojureProvider
} from './clojureProvider';

const mappings = {
    'nil': vscode.CompletionItemKind.Value,
    'macro': vscode.CompletionItemKind.Value,
    'class': vscode.CompletionItemKind.Class,
    'keyword': vscode.CompletionItemKind.Keyword,
    'namespace': vscode.CompletionItemKind.Module,
    'function': vscode.CompletionItemKind.Function,
    'special-form': vscode.CompletionItemKind.Keyword,
    'var': vscode.CompletionItemKind.Variable,
    'method': vscode.CompletionItemKind.Method
}

export class ClojureCompletionItemProvider extends ClojureProvider implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable < vscode.CompletionList > {
        return new Promise < vscode.CompletionList > ((resolve, reject) => {

            let document = vscode.window.activeTextEditor.document;

            // TODO: Use VSCode means for getting a current word
            let lineText = document.lineAt(position.line).text;
            let words: string[] = lineText.split(' ');
            let currentWord = words[words.length - 1].replace(/^[\('\[\{]+|[\)\]\}]+$/g, '');
            let text = document.getText()
            let ns = this.getNamespace(text);

            let currentWordLength: number = currentWord.length;

            let buildInsertText = (suggestion: string) => {
                return suggestion[0] === '.' ? suggestion.slice(1) : suggestion;
            }

            let nrepl = this.getNREPL()
            nrepl.complete(currentWord, ns, (completions) => {
                let suggestions = [];
                if ('completions' in completions) {
                    completions.completions.forEach(element => {
                        suggestions.push({
                            label: element.candidate,
                            kind: mappings[element.type] || vscode.CompletionItemKind.Text,
                            insertText: buildInsertText(element.candidate)
                        })
                    })
                } else {
                    return reject();
                }
                let completionList: vscode.CompletionList = new vscode.CompletionList(suggestions, false);
                resolve(completionList);

            });
        })
    }

    public resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): Thenable < vscode.CompletionItem > {
        return new Promise < vscode.CompletionItem > ((resolve, reject) => {
            let document = vscode.window.activeTextEditor.document;
            let ns = this.getNamespace(document.getText());
            this.getNREPL().info(item.label, ns, (info) => {
                item.documentation = info.doc;
                resolve(item);
            })
        })
    }
}