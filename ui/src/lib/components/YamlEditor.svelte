<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EditorView, basicSetup } from 'codemirror'
  import { yaml } from '@codemirror/lang-yaml'
  import { EditorState, Compartment } from '@codemirror/state'
  import { theme } from '$lib/theme.svelte'

  type Props = {
    content?: string
    onChange?: (value: string) => void
    readonly?: boolean
  }

  let { content = '', onChange, readonly = false }: Props = $props()

  let container: HTMLDivElement
  let view: EditorView | undefined

  const darkModeCompartment = new Compartment()

  // Base theme using CSS custom properties from the design system
  const editorBaseTheme = EditorView.theme({
    '&': {
      fontSize: '0.8125rem',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      height: '100%',
      borderRadius: 'var(--radius-md)'
    },
    '.cm-scroller': { overflow: 'auto' },
    '.cm-content': { padding: '0.75rem 0' },
    '.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--foreground)' },
    '.cm-gutters': {
      backgroundColor: 'var(--muted)',
      color: 'var(--muted-foreground)',
      border: 'none',
      borderRight: '1px solid var(--border)'
    },
    '.cm-activeLineGutter': { backgroundColor: 'var(--muted)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in oklch, var(--muted) 50%, transparent)' },
    '.cm-selectionBackground': { backgroundColor: 'color-mix(in oklch, var(--primary) 20%, transparent) !important' },
    '.cm-line': { padding: '0 0.75rem' }
  })

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
          editorBaseTheme,
          darkModeCompartment.of(EditorView.darkTheme.of(theme.isDark)),
          EditorState.readOnly.of(readonly),
          updateListener
        ]
      })
    })
  })

  onDestroy(() => {
    view?.destroy()
  })

  // Keep dark flag in sync with theme changes
  $effect(() => {
    if (!view) return
    view.dispatch({
      effects: darkModeCompartment.reconfigure(EditorView.darkTheme.of(theme.isDark))
    })
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
