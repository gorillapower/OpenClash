<script lang="ts">
  import LogsViewer from '$lib/components/LogsViewer.svelte'
  import PageIntro from '$lib/components/PageIntro.svelte'
</script>

<div class="space-y-8">
  <PageIntro eyebrow="Runtime" title="Logs" />

  <LogsViewer />
</div>
