<script lang="ts">
  import Nav from './Nav.svelte'
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<div class="min-h-screen bg-background text-foreground">
  <Nav />
  <main class="mx-auto max-w-5xl px-6 py-8">
    {@render children()}
  </main>
</div>
