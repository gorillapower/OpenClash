<script lang="ts">
  import { useUciConfig, useSetUciConfig, useSetUciConfigBatch } from '$lib/queries/luci'
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card/index'
  import SettingRow from '$lib/components/setting-row.svelte'

  const config = useUciConfig('clashnivo')
  const cfg = $derived(config.data?.['config'] ?? {})

  // ---------------------------------------------------------------------------
  // Subscription schedule
  // ---------------------------------------------------------------------------

  const subEnabled = $derived((cfg['auto_update'] as string | undefined) === '1')
  const subHour = $derived((cfg['auto_update_time'] as string | undefined) ?? '0')
  const subDay = $derived((cfg['config_update_week_time'] as string | undefined) ?? '0')

  const setSubEnabled = useSetUciConfigBatch('clashnivo', 'config')
  const setSubHour = useSetUciConfig('clashnivo', 'config', 'auto_update_time')
  const setSubDay = useSetUciConfig('clashnivo', 'config', 'config_update_week_time')

  // ---------------------------------------------------------------------------
  // GEO databases schedule
  // ---------------------------------------------------------------------------

  // All 4 GEO enable flags must be in sync — use the primary one for display
  const geoEnabled = $derived((cfg['geo_auto_update'] as string | undefined) === '1')
  const geoHour = $derived((cfg['geo_update_day_time'] as string | undefined) ?? '0')
  const geoDay = $derived((cfg['geo_update_week_time'] as string | undefined) ?? '0')

  const setGeoEnabled = useSetUciConfigBatch('clashnivo', 'config')
  const setGeoHour = useSetUciConfigBatch('clashnivo', 'config')
  const setGeoDay = useSetUciConfigBatch('clashnivo', 'config')

  // ---------------------------------------------------------------------------
  // Chnroute schedule
  // ---------------------------------------------------------------------------

  const chnrEnabled = $derived((cfg['chnr_auto_update'] as string | undefined) === '1')
  const chnrHour = $derived((cfg['chnr_update_day_time'] as string | undefined) ?? '0')
  const chnrDay = $derived((cfg['chnr_update_week_time'] as string | undefined) ?? '0')

  const setChnrEnabled = useSetUciConfig('clashnivo', 'config', 'chnr_auto_update')
  const setChnrHour = useSetUciConfig('clashnivo', 'config', 'chnr_update_day_time')
  const setChnrDay = useSetUciConfig('clashnivo', 'config', 'chnr_update_week_time')

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const DAYS = [
    { value: '0', label: 'Every day' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '7', label: 'Sunday' }
  ]

  const HOURS = Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label: `${String(i).padStart(2, '0')}:00`
  }))

  function toggleClass(enabled: boolean) {
    return `relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? 'bg-primary' : 'bg-muted'}`
  }

  const selectClass =
    'rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'
</script>

<Card>
  <CardHeader>
    <span class="text-sm font-semibold">Auto Updates</span>
  </CardHeader>
  <CardContent>
    <div class="space-y-6">

      <!-- Subscription -->
      <div>
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription</h3>
        <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
          <SettingRow label="Enable" tooltip="Automatically fetch and update subscription profiles on a schedule.">
            <button
              type="button"
              role="switch"
              aria-checked={subEnabled}
              aria-label="Enable subscription auto-update"
              class={toggleClass(subEnabled)}
              onclick={() =>
                setSubEnabled.mutateAsync([
                  { option: 'auto_update', value: subEnabled ? '0' : '1' },
                  { option: 'config_auto_update_mode', value: '0' }
                ])}
              disabled={setSubEnabled.isPending}
            >
              <span
                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {subEnabled ? 'translate-x-4' : 'translate-x-0'}"
              ></span>
            </button>
          </SettingRow>

          {#if subEnabled}
            <SettingRow label="Day" tooltip="Which day of the week to run the update.">
              <select
                class={selectClass}
                value={subDay}
                onchange={(e) => setSubDay.mutateAsync((e.target as HTMLSelectElement).value)}
                disabled={setSubDay.isPending}
                aria-label="Subscription update day"
              >
                {#each DAYS as day}
                  <option value={day.value}>{day.label}</option>
                {/each}
              </select>
            </SettingRow>

            <SettingRow label="Time" tooltip="Hour of day to run the update (24-hour clock).">
              <select
                class={selectClass}
                value={subHour}
                onchange={(e) => setSubHour.mutateAsync((e.target as HTMLSelectElement).value)}
                disabled={setSubHour.isPending}
                aria-label="Subscription update time"
              >
                {#each HOURS as hour}
                  <option value={hour.value}>{hour.label}</option>
                {/each}
              </select>
            </SettingRow>
          {/if}
        </div>
      </div>

      <!-- GEO Databases -->
      <div>
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">GEO Databases</h3>
        <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
          <SettingRow
            label="Enable"
            tooltip="Automatically refresh the GEO datasets used by Clash-style matching and routing. GeoIP maps IP ranges to countries or regions, GeoSite groups domains into categories, and GeoASN maps IP ranges to autonomous systems. These datasets are only used when your active config or runtime rules rely on them. This switch controls the scheduled refresh only."
          >
            <button
              type="button"
              role="switch"
              aria-checked={geoEnabled}
              aria-label="Enable GEO databases auto-update"
              class={toggleClass(geoEnabled)}
              onclick={() => {
                const val = geoEnabled ? '0' : '1'
                setGeoEnabled.mutateAsync([
                  { option: 'geo_auto_update', value: val },
                  { option: 'geoip_auto_update', value: val },
                  { option: 'geosite_auto_update', value: val },
                  { option: 'geoasn_auto_update', value: val }
                ])
              }}
              disabled={setGeoEnabled.isPending}
            >
              <span
                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {geoEnabled ? 'translate-x-4' : 'translate-x-0'}"
              ></span>
            </button>
          </SettingRow>

          {#if geoEnabled}
            <SettingRow label="Day" tooltip="Which day of the week to run the update.">
              <select
                class={selectClass}
                value={geoDay}
                onchange={(e) => {
                  const val = (e.target as HTMLSelectElement).value
                  setGeoDay.mutateAsync([
                    { option: 'geo_update_week_time', value: val },
                    { option: 'geoip_update_week_time', value: val },
                    { option: 'geosite_update_week_time', value: val },
                    { option: 'geoasn_update_week_time', value: val }
                  ])
                }}
                disabled={setGeoDay.isPending}
                aria-label="GEO update day"
              >
                {#each DAYS as day}
                  <option value={day.value}>{day.label}</option>
                {/each}
              </select>
            </SettingRow>

            <SettingRow label="Time" tooltip="Hour of day to run the update (24-hour clock).">
              <select
                class={selectClass}
                value={geoHour}
                onchange={(e) => {
                  const val = (e.target as HTMLSelectElement).value
                  setGeoHour.mutateAsync([
                    { option: 'geo_update_day_time', value: val },
                    { option: 'geoip_update_day_time', value: val },
                    { option: 'geosite_update_day_time', value: val },
                    { option: 'geoasn_update_day_time', value: val }
                  ])
                }}
                disabled={setGeoHour.isPending}
                aria-label="GEO update time"
              >
                {#each HOURS as hour}
                  <option value={hour.value}>{hour.label}</option>
                {/each}
              </select>
            </SettingRow>
          {/if}
        </div>
      </div>

      <!-- Chnroute -->
      <div>
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chnroute List</h3>
        <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
          <SettingRow
            label="Enable"
            tooltip="Automatically refresh the Chnroute list, a CIDR list of China IP ranges used by direct-routing and bypass logic. It matters when your active rules or runtime behavior use China-route matching. This switch controls the scheduled refresh only."
          >
            <button
              type="button"
              role="switch"
              aria-checked={chnrEnabled}
              aria-label="Enable Chnroute auto-update"
              class={toggleClass(chnrEnabled)}
              onclick={() => setChnrEnabled.mutateAsync(chnrEnabled ? '0' : '1')}
              disabled={setChnrEnabled.isPending}
            >
              <span
                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {chnrEnabled ? 'translate-x-4' : 'translate-x-0'}"
              ></span>
            </button>
          </SettingRow>

          {#if chnrEnabled}
            <SettingRow label="Day" tooltip="Which day of the week to run the update.">
              <select
                class={selectClass}
                value={chnrDay}
                onchange={(e) => setChnrDay.mutateAsync((e.target as HTMLSelectElement).value)}
                disabled={setChnrDay.isPending}
                aria-label="Chnroute update day"
              >
                {#each DAYS as day}
                  <option value={day.value}>{day.label}</option>
                {/each}
              </select>
            </SettingRow>

            <SettingRow label="Time" tooltip="Hour of day to run the update (24-hour clock).">
              <select
                class={selectClass}
                value={chnrHour}
                onchange={(e) => setChnrHour.mutateAsync((e.target as HTMLSelectElement).value)}
                disabled={setChnrHour.isPending}
                aria-label="Chnroute update time"
              >
                {#each HOURS as hour}
                  <option value={hour.value}>{hour.label}</option>
                {/each}
              </select>
            </SettingRow>
          {/if}
        </div>
      </div>

      <!-- Restart notice -->
      <p class="text-xs text-muted-foreground">
        Schedule changes take effect after Clash Nivo restarts.
      </p>

    </div>
  </CardContent>
</Card>
