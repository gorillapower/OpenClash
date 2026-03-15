<script lang="ts">
  import Sheet from '$lib/components/ui/sheet/sheet.svelte'
  import Button from '$lib/components/ui/button/button.svelte'
  import Input from '$lib/components/ui/input/input.svelte'
  import InfoTooltip from '$lib/components/info-tooltip.svelte'
  import {
    useAddCustomProxy,
    useUpdateCustomProxy,
    type CustomProxy,
    type CustomProxyInput
  } from '$lib/queries/luci'

  type Props = {
    open: boolean
    onClose: () => void
    /** Pass a proxy to edit; undefined = add mode */
    proxy?: CustomProxy
  }

  let { open, onClose, proxy }: Props = $props()

  const addMutation = useAddCustomProxy()
  const updateMutation = useUpdateCustomProxy()

  const isEdit = $derived(proxy !== undefined)
  const isPending = $derived(addMutation.isPending || updateMutation.isPending)

  // Form state
  let name = $state('')
  let proxyType = $state<CustomProxy['proxyType']>('ss')
  let server = $state('')
  let port = $state('')

  // SS
  let cipher = $state('aes-256-gcm')
  let password = $state('')
  let udp = $state(true)

  // Trojan
  let trojanPassword = $state('')
  let sni = $state('')
  let skipCertVerify = $state(false)

  // VMess
  let uuid = $state('')
  let alterId = $state('0')
  let vmessCipher = $state('auto')
  let tls = $state(false)
  let vmessSni = $state('')

  // VLESS
  let vlessUuid = $state('')
  let flow = $state('')
  let vlessTls = $state(false)
  let vlessSni = $state('')

  let errors = $state<Record<string, string>>({})

  const ssCiphers = [
    'aes-128-gcm',
    'aes-256-gcm',
    'chacha20-ietf-poly1305',
    'xchacha20-ietf-poly1305',
    'aes-128-cfb',
    'aes-192-cfb',
    'aes-256-cfb',
    'rc4-md5'
  ]

  const vmessCiphers = ['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none']

  const vlessFlows = ['', 'xtls-rprx-vision', 'xtls-rprx-vision-udp443']

  // Sync form when the sheet opens or the proxy changes
  $effect(() => {
    if (open) {
      name = proxy?.name ?? ''
      proxyType = proxy?.proxyType ?? 'ss'
      server = proxy?.server ?? ''
      port = proxy?.port ?? ''

      cipher = proxy?.cipher ?? 'aes-256-gcm'
      password = proxy?.password ?? ''
      udp = proxy?.udp ?? true

      trojanPassword = proxy?.proxyType === 'trojan' ? (proxy?.password ?? '') : ''
      sni = proxy?.sni ?? ''
      skipCertVerify = proxy?.skipCertVerify ?? false

      uuid = proxy?.proxyType === 'vmess' ? (proxy?.uuid ?? '') : ''
      alterId = proxy?.alterId ?? '0'
      vmessCipher = proxy?.vmessCipher ?? 'auto'
      tls = proxy?.tls ?? false
      vmessSni = proxy?.proxyType === 'vmess' ? (proxy?.sni ?? '') : ''

      vlessUuid = proxy?.proxyType === 'vless' ? (proxy?.uuid ?? '') : ''
      flow = proxy?.flow ?? ''
      vlessTls = proxy?.proxyType === 'vless' ? (proxy?.tls ?? false) : false
      vlessSni = proxy?.proxyType === 'vless' ? (proxy?.sni ?? '') : ''

      errors = {}
    }
  })

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!server.trim()) e.server = 'Server is required'
    if (!port.trim()) {
      e.port = 'Port is required'
    } else if (!/^\d+$/.test(port) || +port < 1 || +port > 65535) {
      e.port = 'Port must be 1–65535'
    }
    if (proxyType === 'ss' && !password.trim()) e.password = 'Password is required'
    if (proxyType === 'trojan' && !trojanPassword.trim()) e.trojanPassword = 'Password is required'
    if (proxyType === 'vmess' && !uuid.trim()) e.uuid = 'UUID is required'
    if (proxyType === 'vless' && !vlessUuid.trim()) e.vlessUuid = 'UUID is required'
    errors = e
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return

    const base = { name: name.trim(), server: server.trim(), port: port.trim() }

    let input: CustomProxyInput
    if (proxyType === 'ss') {
      input = { ...base, proxyType: 'ss', cipher, password: password.trim(), udp }
    } else if (proxyType === 'trojan') {
      input = {
        ...base,
        proxyType: 'trojan',
        password: trojanPassword.trim(),
        sni: sni.trim() || undefined,
        skipCertVerify
      }
    } else if (proxyType === 'vmess') {
      input = {
        ...base,
        proxyType: 'vmess',
        uuid: uuid.trim(),
        alterId: alterId.trim() || '0',
        vmessCipher,
        tls,
        sni: vmessSni.trim() || undefined
      }
    } else {
      input = {
        ...base,
        proxyType: 'vless',
        uuid: vlessUuid.trim(),
        flow: flow || undefined,
        tls: vlessTls,
        sni: vlessSni.trim() || undefined
      }
    }

    if (isEdit && proxy) {
      await updateMutation.mutateAsync({ id: proxy.id, ...input })
    } else {
      await addMutation.mutateAsync(input)
    }
    onClose()
  }
</script>

<Sheet {open} {onClose} title={isEdit ? 'Edit Custom Proxy' : 'Add Custom Proxy'}>
  <div class="flex h-full flex-col gap-6">
    <div class="space-y-4">

      <!-- Name -->
      <div class="space-y-1.5">
        <label for="cp-name" class="text-sm font-medium text-foreground">Name</label>
        <Input
          id="cp-name"
          bind:value={name}
          placeholder="e.g. My VPS"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'cp-name-error' : undefined}
        />
        {#if errors.name}
          <p id="cp-name-error" class="text-xs text-destructive">{errors.name}</p>
        {/if}
      </div>

      <!-- Type -->
      <div class="space-y-1.5">
        <label for="cp-type" class="text-sm font-medium text-foreground">Protocol</label>
        <select
          id="cp-type"
          bind:value={proxyType}
          class="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ss">Shadowsocks (SS)</option>
          <option value="trojan">Trojan</option>
          <option value="vmess">VMess</option>
          <option value="vless">VLESS</option>
        </select>
      </div>

      <!-- Server + Port (always shown) -->
      <div class="grid grid-cols-3 gap-3">
        <div class="col-span-2 space-y-1.5">
          <label for="cp-server" class="text-sm font-medium text-foreground">Server</label>
          <Input
            id="cp-server"
            bind:value={server}
            placeholder="1.2.3.4 or vpn.example.com"
            aria-invalid={!!errors.server}
            aria-describedby={errors.server ? 'cp-server-error' : undefined}
          />
          {#if errors.server}
            <p id="cp-server-error" class="text-xs text-destructive">{errors.server}</p>
          {/if}
        </div>
        <div class="space-y-1.5">
          <label for="cp-port" class="text-sm font-medium text-foreground">Port</label>
          <Input
            id="cp-port"
            bind:value={port}
            placeholder="8388"
            inputmode="numeric"
            aria-invalid={!!errors.port}
            aria-describedby={errors.port ? 'cp-port-error' : undefined}
          />
          {#if errors.port}
            <p id="cp-port-error" class="text-xs text-destructive">{errors.port}</p>
          {/if}
        </div>
      </div>

      <!-- ── SS fields ── -->
      {#if proxyType === 'ss'}
        <div class="space-y-1.5">
          <label for="cp-cipher" class="text-sm font-medium text-foreground">Cipher</label>
          <select
            id="cp-cipher"
            bind:value={cipher}
            class="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {#each ssCiphers as c}
              <option value={c}>{c}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-1.5">
          <label for="cp-ss-password" class="text-sm font-medium text-foreground">Password</label>
          <Input
            id="cp-ss-password"
            type="password"
            bind:value={password}
            placeholder="Secret"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'cp-ss-password-error' : undefined}
          />
          {#if errors.password}
            <p id="cp-ss-password-error" class="text-xs text-destructive">{errors.password}</p>
          {/if}
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={udp}
            aria-label="Enable UDP relay"
            onclick={() => (udp = !udp)}
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {udp ? 'bg-primary' : 'bg-muted-foreground/30'}"
          >
            <span class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform {udp ? 'translate-x-4' : 'translate-x-0.5'}"></span>
          </button>
          <span class="text-sm text-foreground">UDP relay</span>
          <InfoTooltip text="Forwards UDP traffic through the proxy. Required for games and some VoIP apps. Disable if your server doesn't support it." />
        </div>
      {/if}

      <!-- ── Trojan fields ── -->
      {#if proxyType === 'trojan'}
        <div class="space-y-1.5">
          <label for="cp-trojan-password" class="text-sm font-medium text-foreground">Password</label>
          <Input
            id="cp-trojan-password"
            type="password"
            bind:value={trojanPassword}
            placeholder="Secret"
            aria-invalid={!!errors.trojanPassword}
            aria-describedby={errors.trojanPassword ? 'cp-trojan-password-error' : undefined}
          />
          {#if errors.trojanPassword}
            <p id="cp-trojan-password-error" class="text-xs text-destructive">{errors.trojanPassword}</p>
          {/if}
        </div>

        <div class="space-y-1.5">
          <label for="cp-sni" class="text-sm font-medium text-foreground">
            SNI <span class="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input id="cp-sni" bind:value={sni} placeholder="vpn.example.com" />
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={skipCertVerify}
            aria-label="Skip certificate verification"
            onclick={() => (skipCertVerify = !skipCertVerify)}
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {skipCertVerify ? 'bg-primary' : 'bg-muted-foreground/30'}"
          >
            <span class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform {skipCertVerify ? 'translate-x-4' : 'translate-x-0.5'}"></span>
          </button>
          <span class="text-sm text-foreground">Skip certificate verification</span>
        </div>
      {/if}

      <!-- ── VMess fields ── -->
      {#if proxyType === 'vmess'}
        <div class="space-y-1.5">
          <label for="cp-vmess-uuid" class="text-sm font-medium text-foreground">UUID</label>
          <Input
            id="cp-vmess-uuid"
            bind:value={uuid}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            aria-invalid={!!errors.uuid}
            aria-describedby={errors.uuid ? 'cp-vmess-uuid-error' : undefined}
          />
          {#if errors.uuid}
            <p id="cp-vmess-uuid-error" class="text-xs text-destructive">{errors.uuid}</p>
          {/if}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label for="cp-alterid" class="text-sm font-medium text-foreground">
              Alter ID <span class="font-normal text-muted-foreground">(0 for AEAD)</span>
            </label>
            <Input id="cp-alterid" bind:value={alterId} placeholder="0" inputmode="numeric" />
          </div>
          <div class="space-y-1.5">
            <label for="cp-vmess-cipher" class="text-sm font-medium text-foreground">Cipher</label>
            <select
              id="cp-vmess-cipher"
              bind:value={vmessCipher}
              class="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {#each vmessCiphers as c}
                <option value={c}>{c}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={tls}
            aria-label="Enable TLS"
            onclick={() => (tls = !tls)}
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {tls ? 'bg-primary' : 'bg-muted-foreground/30'}"
          >
            <span class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform {tls ? 'translate-x-4' : 'translate-x-0.5'}"></span>
          </button>
          <span class="text-sm text-foreground">TLS</span>
        </div>

        {#if tls}
          <div class="space-y-1.5">
            <label for="cp-vmess-sni" class="text-sm font-medium text-foreground">
              SNI <span class="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input id="cp-vmess-sni" bind:value={vmessSni} placeholder="vpn.example.com" />
          </div>
        {/if}
      {/if}

      <!-- ── VLESS fields ── -->
      {#if proxyType === 'vless'}
        <div class="space-y-1.5">
          <label for="cp-vless-uuid" class="text-sm font-medium text-foreground">UUID</label>
          <Input
            id="cp-vless-uuid"
            bind:value={vlessUuid}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            aria-invalid={!!errors.vlessUuid}
            aria-describedby={errors.vlessUuid ? 'cp-vless-uuid-error' : undefined}
          />
          {#if errors.vlessUuid}
            <p id="cp-vless-uuid-error" class="text-xs text-destructive">{errors.vlessUuid}</p>
          {/if}
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={vlessTls}
            aria-label="Enable TLS"
            onclick={() => (vlessTls = !vlessTls)}
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {vlessTls ? 'bg-primary' : 'bg-muted-foreground/30'}"
          >
            <span class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform {vlessTls ? 'translate-x-4' : 'translate-x-0.5'}"></span>
          </button>
          <span class="text-sm text-foreground">TLS</span>
        </div>

        {#if vlessTls}
          <div class="space-y-1.5">
            <label for="cp-vless-sni" class="text-sm font-medium text-foreground">
              SNI <span class="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input id="cp-vless-sni" bind:value={vlessSni} placeholder="vpn.example.com" />
          </div>
        {/if}

        <div class="space-y-1.5">
          <label for="cp-flow" class="text-sm font-medium text-foreground">
            Flow <span class="font-normal text-muted-foreground">(optional)</span>
          </label>
          <select
            id="cp-flow"
            bind:value={flow}
            class="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {#each vlessFlows as f}
              <option value={f}>{f === '' ? 'None' : f}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>

    <div class="mt-auto flex justify-end gap-2">
      <Button variant="outline" onclick={onClose} disabled={isPending}>Cancel</Button>
      <Button onclick={handleSubmit} disabled={isPending}>
        {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add proxy'}
      </Button>
    </div>
  </div>
</Sheet>
