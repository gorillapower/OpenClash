<script lang="ts">
  import type { Subscription, ConfigFile } from '$lib/api/luci'
  import { luciRpc } from '$lib/api/luci'
  import { Sheet } from '$lib/components/ui/sheet'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import SubscriptionCard from '$lib/components/SubscriptionCard.svelte'
  import ConfigFileRow from '$lib/components/ConfigFileRow.svelte'
  import YamlEditor from '$lib/components/YamlEditor.svelte'
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

  let {
    heading = 'Profiles',
    description = 'Subscriptions and config files.',
    sectionsAriaLabel = 'Profile sections'
  }: {
    heading?: string
    description?: string
    sectionsAriaLabel?: string
  } = $props()

  // ---------------------------------------------------------------------------
  // Tab state
  // ---------------------------------------------------------------------------

  type Tab = 'subscriptions' | 'configs'
  let activeTab = $state<Tab>('subscriptions')

  // ---------------------------------------------------------------------------
  // Queries & mutations
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Add slide-over
  // ---------------------------------------------------------------------------

  let addOpen = $state(false)
  let addUrl = $state('')
  let addName = $state('')
  let addUrlError = $state('')

  function validateAddUrl(): boolean {
    if (!addUrl.trim()) {
      addUrlError = 'URL is required'
      return false
    }
    try {
      const parsed = new URL(addUrl.trim())
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        addUrlError = 'URL must start with http:// or https://'
        return false
      }
    } catch {
      addUrlError = 'Enter a valid URL'
      return false
    }
    addUrlError = ''
    return true
  }

  async function handleAdd() {
    if (!validateAddUrl()) return
    await subscriptionAdd.mutateAsync({
      url: addUrl.trim(),
      name: addName.trim() || undefined
    })
    addOpen = false
    addUrl = ''
    addName = ''
  }

  function openAdd() {
    addUrl = ''
    addName = ''
    addUrlError = ''
    addOpen = true
  }

  // ---------------------------------------------------------------------------
  // Edit slide-over
  // ---------------------------------------------------------------------------

  let editOpen = $state(false)
  let editTarget = $state<Subscription | null>(null)
  let editUrl = $state('')
  let editName = $state('')
  let editInterval = $state('0')
  let editUrlError = $state('')

  function openEdit(sub: Subscription) {
    editTarget = sub
    editUrl = sub.url
    editName = sub.name
    editInterval = String(sub.autoUpdateInterval ?? 0)
    editUrlError = ''
    editOpen = true
  }

  function validateEditUrl(): boolean {
    if (!editUrl.trim()) {
      editUrlError = 'URL is required'
      return false
    }
    try {
      const parsed = new URL(editUrl.trim())
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        editUrlError = 'URL must start with http:// or https://'
        return false
      }
    } catch {
      editUrlError = 'Enter a valid URL'
      return false
    }
    editUrlError = ''
    return true
  }

  async function handleEdit() {
    if (!editTarget || !validateEditUrl()) return
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

  // ---------------------------------------------------------------------------
  // Per-card handlers
  // ---------------------------------------------------------------------------

  let updatingNames = $state(new Set<string>())

  async function handleUpdate(name: string) {
    updatingNames = new Set([...updatingNames, name])
    try {
      await subscriptionUpdate.mutateAsync(name)
    } finally {
      updatingNames = new Set([...updatingNames].filter((n) => n !== name))
    }
  }

  async function handleDelete(name: string) {
    await subscriptionDelete.mutateAsync(name)
  }

  // ---------------------------------------------------------------------------
  // Config: switch
  // ---------------------------------------------------------------------------

  let switchingNames = $state(new Set<string>())

  async function handleConfigSwitch(name: string) {
    switchingNames = new Set([...switchingNames, name])
    try {
      await configSetActive.mutateAsync(name)
    } finally {
      switchingNames = new Set([...switchingNames].filter((n) => n !== name))
    }
  }

  // ---------------------------------------------------------------------------
  // Config: delete
  // ---------------------------------------------------------------------------

  async function handleConfigDelete(name: string) {
    await configDelete.mutateAsync(name)
  }

  // ---------------------------------------------------------------------------
  // Config: download (client-side)
  // ---------------------------------------------------------------------------

  async function handleConfigDownload(name: string) {
    try {
      const result = await luciRpc.configRead(name)
      const blob = new Blob([result.content], { type: 'text/yaml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name.endsWith('.yaml') || name.endsWith('.yml') ? name : `${name}.yaml`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // error toast is handled by the RPC layer for server errors;
      // silent on client-side blob failures
    }
  }

  // ---------------------------------------------------------------------------
  // Config: edit slide-over
  // ---------------------------------------------------------------------------

  let editConfigOpen = $state(false)
  let editConfigTarget = $state<ConfigFile | null>(null)
  let editConfigContent = $state('')
  let editConfigLoading = $state(false)

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

  // ---------------------------------------------------------------------------
  // Config: upload slide-over
  // ---------------------------------------------------------------------------

  let uploadConfigOpen = $state(false)
  let uploadConfigName = $state('')
  let uploadConfigContent = $state('')
  let uploadConfigNameError = $state('')
  let uploadFileInput: HTMLInputElement

  function openUploadConfig() {
    uploadConfigName = ''
    uploadConfigContent = ''
    uploadConfigNameError = ''
    uploadConfigOpen = true
  }

  function handleFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (!uploadConfigName) {
      uploadConfigName = file.name
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      uploadConfigContent = (ev.target?.result as string) ?? ''
    }
    reader.readAsText(file)
  }

  async function handleUploadConfig() {
    if (!uploadConfigName.trim()) {
      uploadConfigNameError = 'Name is required'
      return
    }
    uploadConfigNameError = ''
    const name = uploadConfigName.trim().endsWith('.yaml') || uploadConfigName.trim().endsWith('.yml')
      ? uploadConfigName.trim()
      : `${uploadConfigName.trim()}.yaml`
    await configWrite.mutateAsync({ name, content: uploadConfigContent })
    uploadConfigOpen = false
    uploadConfigName = ''
    uploadConfigContent = ''
  }
</script>

<div class="space-y-6">
  <!-- Page header -->
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">{heading}</h1>
    <p class="mt-1 text-sm text-muted-foreground">{description}</p>
  </div>

  <!-- Tabs -->
  <div class="border-b border-border">
    <nav class="-mb-px flex gap-6" aria-label={sectionsAriaLabel}>
      <button
        class="border-b-2 pb-3 text-sm font-medium transition-colors"
        class:border-primary={activeTab === 'subscriptions'}
        class:text-foreground={activeTab === 'subscriptions'}
        class:border-transparent={activeTab !== 'subscriptions'}
        class:text-muted-foreground={activeTab !== 'subscriptions'}
        onclick={() => (activeTab = 'subscriptions')}
        type="button"
        aria-current={activeTab === 'subscriptions' ? 'page' : undefined}
      >
        Subscriptions
      </button>
      <button
        class="border-b-2 pb-3 text-sm font-medium transition-colors"
        class:border-primary={activeTab === 'configs'}
        class:text-foreground={activeTab === 'configs'}
        class:border-transparent={activeTab !== 'configs'}
        class:text-muted-foreground={activeTab !== 'configs'}
        onclick={() => (activeTab = 'configs')}
        type="button"
        aria-current={activeTab === 'configs' ? 'page' : undefined}
      >
        Config Files
      </button>
    </nav>
  </div>

  <!-- Subscriptions tab -->
  {#if activeTab === 'subscriptions'}
    <div class="space-y-4">
      <!-- Toolbar -->
      <div class="flex items-center justify-between gap-3">
        <h2 class="sr-only">Subscriptions</h2>
        <div class="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onclick={() => subscriptionUpdateAll.mutate()} disabled={subscriptionUpdateAll.isPending}>
            {#if subscriptionUpdateAll.isPending}
              Updating…
            {:else}
              Update All
            {/if}
          </Button>
          <Button size="sm" onclick={openAdd}>
            Add Subscription
          </Button>
        </div>
      </div>

      <!-- Loading skeleton -->
      {#if subscriptions.isPending}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each { length: 3 } as _}
            <div class="h-28 animate-pulse rounded-lg bg-muted"></div>
          {/each}
        </div>

      <!-- Empty state -->
      {:else if !subscriptions.data || subscriptions.data.length === 0}
        <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <p class="text-sm font-medium">No subscriptions yet</p>
          <p class="mt-1 text-sm text-muted-foreground">Add a subscription URL to get started.</p>
          <Button class="mt-4" size="sm" onclick={openAdd}>Add your first subscription</Button>
        </div>

      <!-- Card grid -->
      {:else}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each subscriptions.data as sub (sub.name)}
            <SubscriptionCard
              subscription={sub}
              onUpdate={handleUpdate}
              onEdit={openEdit}
              onDelete={handleDelete}
              updating={updatingNames.has(sub.name)}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Config Files tab -->
  {#if activeTab === 'configs'}
    <div class="space-y-4">
      <!-- Toolbar -->
      <div class="flex items-center justify-between gap-3">
        <h2 class="sr-only">Config Files</h2>
        <div class="ml-auto">
          <Button size="sm" onclick={openUploadConfig}>Upload Config</Button>
        </div>
      </div>

      <!-- Loading skeleton -->
      {#if configs.isPending}
        <div class="space-y-2">
          {#each { length: 3 } as _}
            <div class="h-14 animate-pulse rounded-lg bg-muted"></div>
          {/each}
        </div>

      <!-- Empty state -->
      {:else if !configs.data || configs.data.length === 0}
        <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <p class="text-sm font-medium">No config files yet</p>
          <p class="mt-1 text-sm text-muted-foreground">Upload a YAML config to get started.</p>
          <Button class="mt-4" size="sm" onclick={openUploadConfig}>Upload your first config</Button>
        </div>

      <!-- Config list -->
      {:else}
        <div class="space-y-2">
          {#each configs.data as config (config.name)}
            <ConfigFileRow
              {config}
              onSwitch={handleConfigSwitch}
              onEdit={openEditConfig}
              onDownload={handleConfigDownload}
              onDelete={handleConfigDelete}
              switching={switchingNames.has(config.name)}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Add Subscription slide-over -->
<Sheet open={addOpen} onClose={() => (addOpen = false)} title="Add Subscription">
  <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleAdd() }}>
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
        Name <span class="text-muted-foreground font-normal">(optional)</span>
      </label>
      <Input
        id="add-name"
        type="text"
        placeholder="My VPN"
        bind:value={addName}
      />
    </div>

    <Button type="submit" class="w-full" disabled={subscriptionAdd.isPending}>
      {subscriptionAdd.isPending ? 'Adding…' : 'Add Subscription'}
    </Button>
  </form>
</Sheet>

<!-- Edit Subscription slide-over -->
<Sheet open={editOpen} onClose={() => (editOpen = false)} title="Edit Subscription">
  {#if editTarget}
    <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleEdit() }}>
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
        <Input
          id="edit-name"
          type="text"
          bind:value={editName}
        />
      </div>

      <div class="space-y-1.5">
        <label for="edit-interval" class="text-sm font-medium">Auto-update interval</label>
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
        {subscriptionEdit.isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    </form>
  {/if}
</Sheet>

<!-- Edit Config slide-over -->
<Sheet
  open={editConfigOpen}
  onClose={() => { editConfigOpen = false; editConfigTarget = null; editConfigContent = '' }}
  title={editConfigTarget ? `Edit — ${editConfigTarget.name}` : 'Edit Config'}
>
  <div class="flex h-full flex-col gap-4">
    {#if editConfigLoading}
      <div class="flex flex-1 items-center justify-center">
        <p class="text-sm text-muted-foreground">Loading…</p>
      </div>
    {:else}
      <div class="flex-1 overflow-hidden" style="min-height: 24rem;">
        <YamlEditor
          content={editConfigContent}
          onChange={(v) => (editConfigContent = v)}
        />
      </div>
      <Button
        class="w-full shrink-0"
        disabled={configWrite.isPending}
        onclick={handleSaveConfig}
      >
        {configWrite.isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    {/if}
  </div>
</Sheet>

<!-- Upload Config slide-over -->
<Sheet open={uploadConfigOpen} onClose={() => (uploadConfigOpen = false)} title="Upload Config">
  <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleUploadConfig() }}>
    <div class="space-y-1.5">
      <label for="upload-name" class="text-sm font-medium">Config name</label>
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
        bind:this={uploadFileInput}
        type="file"
        accept=".yaml,.yml"
        onchange={handleFileSelect}
        class="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium file:text-foreground"
      />
    </div>

    <Button type="submit" class="w-full" disabled={configWrite.isPending || !uploadConfigContent}>
      {configWrite.isPending ? 'Uploading…' : 'Upload Config'}
    </Button>
  </form>
</Sheet>
