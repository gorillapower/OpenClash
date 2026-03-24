<script lang="ts">
  import SettingRow from '$lib/components/setting-row.svelte'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Card, CardContent, CardHeader } from '$lib/components/ui/card/index'
  import LogsViewer from '$lib/components/LogsViewer.svelte'
  import PageIntro from '$lib/components/PageIntro.svelte'
  import { useSetUciConfig, useUciConfig } from '$lib/queries/luci'

  const config = useUciConfig('clashnivo')
  const setLogLevel = useSetUciConfig('clashnivo', 'config', 'log_level')
  const setLogSize = useSetUciConfig('clashnivo', 'config', 'log_size')

  const cfg = $derived(config.data?.config ?? {})
  const logLevel = $derived((cfg['log_level'] as string | undefined) ?? '0')
  const logSize = $derived((cfg['log_size'] as string | undefined) ?? '1024')

  const selectClass =
    'rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'
  const inputClass =
    'rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'

  let localLogSize = $state('1024')

  $effect(() => {
    localLogSize = logSize
  })

  async function saveLogSize() {
    await setLogSize.mutateAsync(localLogSize.trim() || '1024')
  }
</script>

<div class="space-y-8">
  <PageIntro eyebrow="Runtime" title="Logs" />
  <LogsViewer />
  <Card>
    <CardHeader>
      <h2 class="text-sm font-semibold">Settings</h2>
    </CardHeader>

    <CardContent>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Log level"
          tooltip="Controls how much detail Clash Nivo writes to logs. Use lower levels for normal operation and higher levels only while troubleshooting."
        >
          <select
            class={selectClass}
            value={logLevel}
            onchange={(e) => setLogLevel.mutateAsync((e.target as HTMLSelectElement).value)}
            disabled={setLogLevel.isPending}
            aria-label="Log level"
          >
            <option value="0">Silent / default</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
        </SettingRow>

        <SettingRow
          label="Log size"
          tooltip="Maximum retained log size before rotation. Higher values keep more history, but use more storage on the router."
        >
          <div class="flex items-center gap-2">
            <input
              class={inputClass}
              bind:value={localLogSize}
              aria-label="Log size"
              inputmode="numeric"
            />
            <Button variant="outline" size="sm" onclick={saveLogSize} disabled={setLogSize.isPending}
              >Save</Button
            >
          </div>
        </SettingRow>
      </div>
    </CardContent>
  </Card>


</div>
