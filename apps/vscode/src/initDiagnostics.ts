import * as vscode from 'vscode'
import { defaultOptions } from './defaultOptions'
import { humaniseDiagnostic } from './humaniseDiagnostic'
import { getCurrentLanguage } from './language'

let options = defaultOptions

const languages = [
   'typescript',
   'typescriptreact',
   'javascript',
   'javascriptreact',
   'vue',
   'svelte',
   'astro',
]

export function initDiagnostics(context: vscode.ExtensionContext) {
   const uriStore: Record<
    vscode.Uri['path'],
    {
       range: vscode.Range
       contents: vscode.MarkdownString[]
    }[]
  > = {}

   const updateOptions = () => {
      options = {
         ...defaultOptions,
         ...vscode.workspace.getConfiguration('typeScriptWizard'),
      }
   }

   updateOptions()

   context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((config) => {
         if (config.affectsConfiguration('typeScriptWizard'))
            updateOptions()
      }),
   )

   const hoverProvider: vscode.HoverProvider = {
      provideHover: (document, position) => {
         const itemsInUriStore = uriStore[document.uri.path]

         if (!itemsInUriStore)
            return null

         const itemsInRange = itemsInUriStore.filter((item) => {
            return item.range.contains(position)
         })
         return itemsInRange[0]
      },
   }

   context.subscriptions.push(
      ...languages.map((language) => {
         return vscode.languages.registerHoverProvider(
            {
               language,
            },
            hoverProvider,
         )
      }),
   )

   context.subscriptions.push(
      vscode.languages.onDidChangeDiagnostics((e) => {
         e.uris.forEach((uri) => {
            const diagnostics = vscode.languages.getDiagnostics(uri)

            const items: {
               range: vscode.Range
               contents: vscode.MarkdownString[]
            }[] = []
            diagnostics.forEach((diagnostic) => {
               const currentLang = getCurrentLanguage()
               const humanizedVersion = humaniseDiagnostic(diagnostic, options, currentLang)

               if (humanizedVersion) {
                  items.push({
                     range: diagnostic.range,
                     contents: humanizedVersion,
                  })
               }
            })
            uriStore[uri.path] = items
         })
      }),
   )
}
