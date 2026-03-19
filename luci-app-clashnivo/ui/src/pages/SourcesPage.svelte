<script lang="ts">
  import type { Subscription, ConfigFile } from '$lib/api/luci'
  import { luciRpc } from '$lib/api/luci'
  import { Sheet } from '$lib/components/ui/sheet'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
  import SubscriptionCard from '$lib/components/SubscriptionCard.svelte'
  import YamlEditor from '$lib/components/YamlEditor.svelte'
  import PageIntro from '$lib/components/PageIntro.svelte'
  import SectionHeader from '$lib/components/SectionHeader.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import ExplainerSheet from '$lib/components/ExplainerSheet.svelte'
  import {
    useSubscriptions,
    useSubscriptionAdd,
    useSubscriptionDelete,
    useSubscriptionUpdate,
    useSubscriptionUpdateAll,
    useSubscriptionEdit,
    useConfigs,
    useConfigSetActive,
    useConfigDelete,
    useConfigWrite
  } from '$lib/queries/luci'

  const subscriptions = useSubscriptions()
  const subscriptionAdd = useSubscriptionAdd()
  const subscriptionDelete = useSubscriptionDelete()
  const subscriptionUpdate = useSubscriptionUpdate()
  const subscriptionUpdateAll = useSubscriptionUpdateAll()
  const subscriptionEdit = useSubscriptionEdit()

  const configs = useConfigs()
  const configSetActive = useConfigSetActive()
  const configDelete = useConfigDelete()
  const configWrite = useConfigWrite()

  const activeSource = $derived(configs.data?.find((config) => config.active) ?? null)

  let addOpen = $state(false)
  let addUrl = $state('')
  let addName = $state('')
  let addUrlError = $state('')

  let editOpen = $state(false)
  let editTarget = $state<Subscription | null>(null)
  let editUrl = $state('')
  let editName = $state('')
  let editInterval = $state('0')
  let editUrlError = $state('')

  let uploadConfigOpen = $state(false)
  let uploadConfigName = $state('')
  let uploadConfigContent = $state('')
  let uploadConfigNameError = $state('')

  let editConfigOpen = $state(false)
  let editConfigTarget = $state<ConfigFile | null>(null)
  let editConfigContent = $state('')
  let editConfigLoading = $state(false)

  let updatingNames = $state(new Set<string>())
  let selectingNames = $state(new Set<string>())
  let deletingConfigNames = $state(new Set<string>())
  let confirmSelectName = $state<string | null>(null)
  let confirmDeleteName = $state<string | null>(null)
  let explainerOpen = $state(false)

  function validateUrl(value: string): string {
    if (!value.trim()) return 'URL is required'
    try {
      const parsed = new URL(value.trim())
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'URL must start with http:// or https://'
      }
    } catch {
      return 'Enter a valid URL'
    }
    return ''
  }

  function openAdd() {
    addUrl = ''
    addName = ''
    addUrlError = ''
    addOpen = true
  }

  async function handleAdd() {
    addUrlError = validateUrl(addUrl)
    if (addUrlError) return
    await subscriptionAdd.mutateAsync({
      url: addUrl.trim(),
      name: addName.trim() || undefined
    })
    addOpen = false
    addUrl = ''
    addName = ''
  }

  function openEdit(subscription: Subscription) {
    editTarget = subscription
    editUrl = subscription.url
    editName = subscription.name
    editInterval = String(subscription.autoUpdateInterval ?? 0)
    editUrlError = ''
    editOpen = true
  }

  async function handleEdit() {
    if (!editTarget) return
    editUrlError = validateUrl(editUrl)
    if (editUrlError) return
    await subscriptionEdit.mutateAsync({
      name: editTarget.name,
      data: {
        url: editUrl.trim(),
        newName: editName.trim() || undefined,
        autoUpdateInterval: Number(editInterval)
      }
    })
    editOpen = false
    editTarget = null
  }

  async function handleRefresh(name: string) {
    updatingNames = new Set([...updatingNames, name])
    try {
      await subscriptionUpdate.mutateAsync(name)
    } finally {
      updatingNames = new Set([...updatingNames].filter((value) => value !== name))
    }
  }

  async function handleDeleteSubscription(name: string) {
    await subscriptionDelete.mutateAsync(name)
  }

  async function handleSelectSource(name: string) {
    selectingNames = new Set([...selectingNames, name])
    try {
      await configSetActive.mutateAsync(name)
      confirmSelectName = null
    } finally {
      selectingNames = new Set([...selectingNames].filter((value) => value !== name))
    }
  }

  async function handleDeleteConfig(name: string) {
    deletingConfigNames = new Set([...deletingConfigNames, name])
    try {
      await configDelete.mutateAsync(name)
      confirmDeleteName = null
    } finally {
      deletingConfigNames = new Set([...deletingConfigNames].filter((value) => value !== name))
    }
  }

  async function handleConfigDownload(name: string) {
    try {
      const result = await luciRpc.configRead(name)
      const blob = new Blob([result.content], { type: 'text/yaml' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = name.endsWith('.yaml') || name.endsWith('.yml') ? name : `${name}.yaml`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      // RPC layer handles server-side failures.
    }
  }

  async function openEditConfig(config: ConfigFile) {
    editConfigTarget = config
    editConfigContent = ''
    editConfigLoading = true
    editConfigOpen = true
    try {
      const result = await luciRpc.configRead(config.name)
      editConfigContent = result.content
    } finally {
      editConfigLoading = false
    }
  }

  async function handleSaveConfig() {
    if (!editConfigTarget) return
    await configWrite.mutateAsync({ name: editConfigTarget.name, content: editConfigContent })
    editConfigOpen = false
    editConfigTarget = null
    editConfigContent = ''
  }

  function openUploadConfig() {
    uploadConfigName = ''
    uploadConfigContent = ''
    uploadConfigNameError = ''
    uploadConfigOpen = true
  }

  function handleFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (!uploadConfigName) {
      uploadConfigName = file.name
    }
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      uploadConfigContent = (loadEvent.target?.result as string) ?? ''
    }
    reader.readAsText(file)
  }

  async function handleUploadConfig() {
    if (!uploadConfigName.trim()) {
      uploadConfigNameError = 'Name is required'
      return
    }

    uploadConfigNameError = ''
    const trimmed = uploadConfigName.trim()
    const name = trimmed.endsWith('.yaml') || trimmed.endsWith('.yml') ? trimmed : `${trimmed}.yaml`
    await configWrite.mutateAsync({ name, content: uploadConfigContent })
    uploadConfigOpen = false
    uploadConfigName = ''
    uploadConfigContent = ''
  }

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
</script>

<div class="space-y-8">
  <PageIntro
    eyebrow="Inventory"
    title="Sources"
  >
    {#snippet actions()}
      <Button variant="outline" size="sm" onclick={() => (explainerOpen = true)}>
        How this works
      </Button>
    {/snippet}
  </PageIntro>

  <section class="space-y-4" aria-labelledby="sources-selected-heading">
    <SectionHeader title="Selected source" />

    <Card>
      <CardContent class="pt-5">
        <select
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm"
          value={activeSource?.name ?? ''}
          disabled={!configs.data?.length || configSetActive.isPending}
          aria-label="Quick source switch"
          onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value
            if (value && value !== activeSource?.name) {
              handleSelectSource(value)
            }
          }}
        >
          {#if !configs.data?.length}
            <option value="">No sources available</option>
          {:else}
            {#each configs.data as config (config.name)}
              <option value={config.name}>{config.name}</option>
            {/each}
          {/if}
        </select>
      </CardContent>
    </Card>
  </section>

  <section class="space-y-4" aria-labelledby="sources-subscriptions-heading">
    <SectionHeader title="Subscriptions">
      {#snippet actions()}
        <Button
          variant="outline"
          size="sm"
          onclick={() => subscriptionUpdateAll.mutate()}
          disabled={subscriptionUpdateAll.isPending}
        >
          {subscriptionUpdateAll.isPending ? 'Refreshing all…' : 'Refresh all'}
        </Button>
        <Button variant="outline" size="sm" onclick={openAdd}>Add subscription</Button>
      {/snippet}
    </SectionHeader>

    {#if subscriptions.isPending}
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {#each { length: 3 } as _}
          <div class="h-28 animate-pulse rounded-lg bg-muted"></div>
        {/each}
      </div>
    {:else if !subscriptions.data || subscriptions.data.length === 0}
      <EmptyState
        eyebrow="Remote sources"
        title="No subscriptions"
        body=""
      />
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {#each subscriptions.data as subscription (subscription.name)}
          <SubscriptionCard
            {subscription}
            onUpdate={handleRefresh}
            onEdit={openEdit}
            onDelete={handleDeleteSubscription}
            updating={updatingNames.has(subscription.name)}
          />
        {/each}
      </div>
    {/if}
  </section>

  <section class="space-y-4" aria-labelledby="sources-configs-heading">
    <SectionHeader title="Uploaded sources">
      {#snippet actions()}
        <Button variant="outline" size="sm" onclick={openUploadConfig}>Upload config</Button>
      {/snippet}
    </SectionHeader>

    {#if configs.isPending}
      <div class="space-y-2">
        {#each { length: 3 } as _}
          <div class="h-20 animate-pulse rounded-lg bg-muted"></div>
        {/each}
      </div>
    {:else if !configs.data || configs.data.length === 0}
      <EmptyState
        eyebrow="Local sources"
        title="No uploaded sources"
      />
    {:else}
      <div class="space-y-3">
        {#each configs.data as config (config.name)}
          <Card>
            <CardContent class="space-y-4 pt-5">
              <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div class="min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="truncate text-sm font-medium">{config.name}</p>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {#if config.size !== undefined}{formatSize(config.size)}{/if}
                    {#if config.size !== undefined && config.lastModified} · {/if}
                    {#if config.lastModified}Updated {formatDate(config.lastModified)}{/if}
                  </p>
                </div>

                <div class="flex flex-wrap items-center justify-end gap-2 sm:justify-self-end">
                  {#if !config.active && confirmSelectName === config.name}
                    <span class="text-xs text-muted-foreground">Use this as the selected source.</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onclick={() => handleSelectSource(config.name)}
                      disabled={selectingNames.has(config.name)}
                    >
                      {selectingNames.has(config.name) ? 'Selecting…' : 'Select'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onclick={() => (confirmSelectName = null)}
                    >
                      Cancel
                    </Button>
                  {:else if !config.active}
                    <Button
                      size="sm"
                      variant="outline"
                      onclick={() => {
                        confirmSelectName = config.name
                        if (confirmDeleteName === config.name) confirmDeleteName = null
                      }}
                      disabled={selectingNames.has(config.name)}
                    >
                      {selectingNames.has(config.name) ? 'Selecting…' : 'Select source'}
                    </Button>
                  {/if}
                  <Button
                    size="sm"
                    variant="ghost"
                    onclick={() => handleConfigDownload(config.name)}
                  >
                    Download
                  </Button>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onclick={() => openEditConfig(config)}
                >
                  Edit
                </Button>
                {#if confirmDeleteName === config.name}
                  <span class="text-xs text-muted-foreground">Delete this stored source file?</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onclick={() => handleDeleteConfig(config.name)}
                    disabled={deletingConfigNames.has(config.name)}
                  >
                    {deletingConfigNames.has(config.name) ? 'Deleting…' : 'Delete'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onclick={() => (confirmDeleteName = null)}
                  >
                    Cancel
                  </Button>
                {:else}
                  <Button
                    size="sm"
                    variant="ghost"
                    onclick={() => {
                      confirmDeleteName = config.name
                      if (confirmSelectName === config.name) confirmSelectName = null
                    }}
                    disabled={deletingConfigNames.has(config.name)}
                  >
                    Delete
                  </Button>
                {/if}
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>
    {/if}
  </section>

  <section class="space-y-4" aria-labelledby="sources-import-heading">
    <SectionHeader title="OpenClash import" />

    <Card>
      <CardContent class="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted-foreground">Not available yet.</p>
        <Button variant="outline" disabled>Import from OpenClash</Button>
      </CardContent>
    </Card>
  </section>
</div>

<ExplainerSheet
  open={explainerOpen}
  onClose={() => (explainerOpen = false)}
  title="Sources"
  intro="Sources is where you manage the YAML inputs Clash Nivo can build from. It is separate from custom rules, groups, proxies, and overwrite."
  sections={[
    {
      title: 'What belongs here',
      body: 'Use subscriptions for remote feeds you want to refresh in place. Use uploaded sources for local YAML files you want to store and select directly.'
    },
    {
      title: 'Refresh behavior',
      body: 'Refresh updates the stored source file only. It does not remove custom layers, rebuild the generated config, or restart Clash Nivo by itself.'
    },
    {
      title: 'Selected source',
      body: 'Clash Nivo composes from one selected source at a time. Selecting a different source changes what Compose will build from next.'
    }
  ]}
/>

<Sheet open={addOpen} onClose={() => (addOpen = false)} title="Add subscription">
  <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); handleAdd() }}>
    <div class="space-y-1.5">
      <label for="add-url" class="text-sm font-medium">Subscription URL</label>
      <Input
        id="add-url"
        type="url"
        placeholder="https://..."
        bind:value={addUrl}
        oninput={() => (addUrlError = '')}
        aria-invalid={!!addUrlError}
        aria-describedby={addUrlError ? 'add-url-error' : undefined}
      />
      {#if addUrlError}
        <p id="add-url-error" class="text-xs text-destructive">{addUrlError}</p>
      {/if}
    </div>

    <div class="space-y-1.5">
      <label for="add-name" class="text-sm font-medium">
        Name <span class="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Input id="add-name" type="text" placeholder="My VPN" bind:value={addName} />
    </div>

    <Button type="submit" class="w-full" disabled={subscriptionAdd.isPending}>
      {subscriptionAdd.isPending ? 'Adding source…' : 'Add subscription'}
    </Button>
  </form>
</Sheet>

<Sheet open={editOpen} onClose={() => (editOpen = false)} title="Edit subscription">
  {#if editTarget}
    <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); handleEdit() }}>
      <div class="space-y-1.5">
        <label for="edit-url" class="text-sm font-medium">Subscription URL</label>
        <Input
          id="edit-url"
          type="url"
          bind:value={editUrl}
          oninput={() => (editUrlError = '')}
          aria-invalid={!!editUrlError}
          aria-describedby={editUrlError ? 'edit-url-error' : undefined}
        />
        {#if editUrlError}
          <p id="edit-url-error" class="text-xs text-destructive">{editUrlError}</p>
        {/if}
      </div>

      <div class="space-y-1.5">
        <label for="edit-name" class="text-sm font-medium">Name</label>
        <Input id="edit-name" type="text" bind:value={editName} />
      </div>

      <div class="space-y-1.5">
        <label for="edit-interval" class="text-sm font-medium">Refresh interval</label>
        <select
          id="edit-interval"
          class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={editInterval}
        >
          <option value="0">Off</option>
          <option value="1">Every hour</option>
          <option value="6">Every 6 hours</option>
          <option value="12">Every 12 hours</option>
          <option value="24">Every 24 hours</option>
        </select>
      </div>

      <Button type="submit" class="w-full" disabled={subscriptionEdit.isPending}>
        {subscriptionEdit.isPending ? 'Saving subscription…' : 'Save subscription'}
      </Button>
    </form>
  {/if}
</Sheet>

<Sheet
  open={editConfigOpen}
  onClose={() => {
    editConfigOpen = false
    editConfigTarget = null
    editConfigContent = ''
  }}
  title={editConfigTarget ? `Advanced YAML edit — ${editConfigTarget.name}` : 'Advanced YAML edit'}
>
  <div class="flex h-full flex-col gap-4">
    <p class="text-sm text-muted-foreground">
      Advanced edit changes the stored source file directly. Use it only when source inventory operations are not enough.
    </p>

    {#if editConfigLoading}
      <div class="flex flex-1 items-center justify-center">
        <p class="text-sm text-muted-foreground">Loading…</p>
      </div>
    {:else}
      <div class="flex-1 overflow-hidden" style="min-height: 24rem;">
        <YamlEditor content={editConfigContent} onChange={(value) => (editConfigContent = value)} />
      </div>
      <Button class="w-full shrink-0" disabled={configWrite.isPending} onclick={handleSaveConfig}>
        {configWrite.isPending ? 'Saving…' : 'Save source file'}
      </Button>
    {/if}
  </div>
</Sheet>

<Sheet open={uploadConfigOpen} onClose={() => (uploadConfigOpen = false)} title="Upload source">
  <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); handleUploadConfig() }}>
    <div class="space-y-1.5">
      <label for="upload-name" class="text-sm font-medium">Source file name</label>
      <Input
        id="upload-name"
        type="text"
        placeholder="my-config.yaml"
        bind:value={uploadConfigName}
        oninput={() => (uploadConfigNameError = '')}
        aria-invalid={!!uploadConfigNameError}
        aria-describedby={uploadConfigNameError ? 'upload-name-error' : undefined}
      />
      {#if uploadConfigNameError}
        <p id="upload-name-error" class="text-xs text-destructive">{uploadConfigNameError}</p>
      {/if}
    </div>

    <div class="space-y-1.5">
      <label for="upload-file" class="text-sm font-medium">YAML file</label>
      <input
        id="upload-file"
        type="file"
        accept=".yaml,.yml"
        onchange={handleFileSelect}
        class="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium file:text-foreground"
      />
    </div>

    <Button type="submit" class="w-full" disabled={configWrite.isPending || !uploadConfigContent}>
      {configWrite.isPending ? 'Uploading source…' : 'Upload source'}
    </Button>
  </form>
</Sheet>
