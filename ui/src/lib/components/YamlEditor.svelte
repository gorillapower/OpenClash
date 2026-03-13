<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EditorView, basicSetup } from 'codemirror'
  import { yaml } from '@codemirror/lang-yaml'
  import { EditorState } from '@codemirror/state'

  type Props = {
    content?: string
    onChange?: (value: string) => void
    readonly?: boolean
  }

  let { content = '', onChange, readonly = false }: Props = $props()

  let container: HTMLDivElement
  let view: EditorView | undefined

  // Theme that respects CSS custom properties from the design system
  const editorTheme = EditorView.theme({
    '&': {
      fontSize: '0.8125rem',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      height: '100%',
      borderRadius: 'var(--radius-md)'
    },
    '.cm-scroller': { overflow: 'auto' },
    '.cm-content': { padding: '0.75rem 0' },
    '.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-cursor': { borderLeftColor: 'hsl(var(--foreground))' },
    '.cm-gutters': {
      backgroundColor: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
      border: 'none',
      borderRight: '1px solid hsl(var(--border))'
    },
    '.cm-activeLineGutter': { backgroundColor: 'hsl(var(--muted) / 0.7)' },
    '.cm-activeLine': { backgroundColor: 'hsl(var(--muted) / 0.3)' },
    '.cm-selectionBackground': { backgroundColor: 'hsl(var(--primary) / 0.2) !important' },
    '.cm-line': { padding: '0 0.75rem' }
  }, { dark: false })

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange?.(update.state.doc.toString())
      }
    })

    view = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          yaml(),
          editorTheme,
          EditorState.readOnly.of(readonly),
          updateListener
        ]
      })
    })
  })

  onDestroy(() => {
    view?.destroy()
  })

  // Sync external content changes (e.g. when slide-over opens with new file)
  $effect(() => {
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content }
      })
    }
  })
</script>

<div
  bind:this={container}
  class="h-full min-h-64 overflow-hidden rounded-md border border-border bg-background text-foreground"
  data-testid="yaml-editor"
></div>
