# Milestone: Network Layer Rewrite

**Status:** Planning  
**Depends on:** None (can proceed independently of UI work)  
**Risk:** High — incorrect network code = no internet for all LAN devices. Requires careful testing.

---

## Goal

Rewrite the OpenClash shell script networking layer to be:
- **Readable** — any engineer can understand it without Chinese comments or prior knowledge
- **Modular** — each concern is a separate, independently testable script
- **Fast** — eliminate redundant syscalls, use batch operations
- **Modern** — nftables only, targeting OpenWrt 22+ (no iptables dead code)
- **Correct** — same behaviour as current implementation, proven by testing

---

## Background

The current networking layer is centred on one file:

**`/etc/init.d/openclash`** — 3,881 lines of shell script that:
- Starts and stops the Clash service
- Sets up all nftables/iptables firewall rules (1,600-line `set_firewall()` function)
- Configures dnsmasq DNS hijacking
- Manages TPROXY routing tables
- Sets up cron jobs
- Runs the watchdog
- Handles all 6 operation modes

**`/usr/share/openclash/openclash.sh`** — 6,000+ line config script that manages subscription
downloads, YAML config generation and validation.

### Current Problems

| Problem | Impact |
|---------|--------|
| Everything in one 3,881-line file | Impossible to test individual components |
| iptables + nftables duplicated side-by-side | ~800 lines of dead code on modern routers |
| Hundreds of individual `uci get` calls | Slow startup (each call forks a process) |
| Sequential `nft add rule` calls | Rules applied one at a time vs batch transactions |
| YAML parsing via Ruby interpreter | Heavy dependency, slow, fragile |
| No structured error handling | Failures are silent or hard to diagnose |
| Chinese comments throughout | Inaccessible to English-speaking contributors |

---

## Scope

### In Scope

- [ ] Rewrite `init.d/openclash` into modular scripts
- [ ] Drop iptables support entirely (nftables only, OpenWrt 22+)
- [ ] Batch all UCI reads into single `config_load` calls
- [ ] Use `nft -f` batch transactions for rule application
- [ ] Replace Ruby YAML parsing with native shell/Lua approach
- [ ] Add structured logging with levels (INFO, WARN, ERROR)
- [ ] Add input validation and error handling
- [ ] English comments and variable names throughout
- [ ] Preserve all current functionality (all 6 modes, China bypass, LAN AC, etc.)

### Out of Scope

- UI changes (separate milestone)
- Changes to Clash YAML config format
- Changes to subscription management logic (beyond performance)
- New features not in current implementation

---

## Proposed Module Structure

```
/usr/share/openclash/
├── core/
│   ├── lifecycle.sh        # Service start/stop/restart, procd integration, watchdog
│   ├── firewall.sh         # All nftables rule creation and cleanup
│   ├── dns.sh              # dnsmasq configuration, hijacking, restoration
│   ├── routing.sh          # ip rule/route for TPROXY routing tables
│   └── config.sh           # UCI config reading (all settings, batched)
├── update/
│   ├── core.sh             # Clash binary download, version check, update
│   ├── subscriptions.sh    # Subscription URL fetching and processing
│   ├── geoip.sh            # GeoIP MMDB + dat updates
│   ├── geosite.sh          # GeoSite dat updates
│   ├── rules.sh            # Rule provider file updates
│   └── chnroute.sh         # China IP route list updates
└── util/
    ├── log.sh              # Structured logging with levels and timestamps
    ├── yaml.sh             # YAML parsing utilities (no Ruby)
    └── network.sh          # Network detection utilities (WAN IP, interfaces)
```

### New init.d/openclash

The main service script becomes a thin orchestrator:

```sh
#!/bin/sh /etc/rc.common
START=99
STOP=15
USE_PROCD=1

# Source modules
. /usr/share/openclash/util/log.sh
. /usr/share/openclash/util/network.sh
. /usr/share/openclash/core/config.sh
. /usr/share/openclash/core/lifecycle.sh
. /usr/share/openclash/core/firewall.sh
. /usr/share/openclash/core/dns.sh
. /usr/share/openclash/core/routing.sh

start_service() {
    log_info "OpenClash starting..."
    config_load_all           # Single batched UCI read
    lifecycle_start           # Start Clash via procd
    dns_configure             # Set up dnsmasq
    routing_configure         # Set up TPROXY routing tables
    firewall_configure        # Apply nftables rules
    log_info "OpenClash started."
}

stop_service() {
    log_info "OpenClash stopping..."
    firewall_cleanup
    routing_cleanup
    dns_restore
    lifecycle_stop
    log_info "OpenClash stopped."
}
```

---

## Key Technical Decisions

### Drop iptables, nftables only

**Reasoning:** GL.iNet routers and all OpenWrt 22.03+ use firewall4 (nftables). The current
codebase maintains parallel iptables code (~800 lines) for compatibility with older versions.
Since this rewrite targets modern OpenWrt, we drop this dead weight entirely.

**nftables batch transactions:**
```bash
# Current (slow — one rule at a time):
nft add rule inet fw4 openclash ip daddr @localnetwork counter return
nft add rule inet fw4 openclash ct direction reply counter return
nft add rule inet fw4 openclash ip protocol tcp counter redirect to 7891

# Proposed (fast — atomic batch):
nft -f - <<EOF
table inet fw4 {
    chain openclash {
        ip daddr @localnetwork counter return
        ct direction reply counter return
        ip protocol tcp counter redirect to 7891
    }
}
EOF
```

### Batch UCI reads

```bash
# Current (slow — hundreds of individual calls):
en_mode=$(uci -q get openclash.config.en_mode)
enable_udp=$(uci -q get openclash.config.enable_udp_proxy)
dns_port=$(uci -q get openclash.config.dns_port)
# ... 50 more calls

# Proposed (fast — one call, shell variables):
config_load "openclash"
config_get en_mode config en_mode "fake-ip"
config_get enable_udp config enable_udp_proxy "1"
config_get dns_port config dns_port "7874"
```

### Structured logging

```bash
# util/log.sh
LOG_FILE="/tmp/openclash.log"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

log_info()  { _log "INFO"  "$*"; }
log_warn()  { _log "WARN"  "$*"; }
log_error() { _log "ERROR" "$*"; }
log_debug() { _log "DEBUG" "$*"; }

_log() {
    local level="$1"; shift
    local msg="$*"
    local ts; ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "$ts [$level] $msg" >> "$LOG_FILE"
    [ "$level" = "ERROR" ] && echo "$ts [$level] $msg" >&2
}
```

### YAML without Ruby

Current approach uses a Ruby interpreter + YAML.rb library for YAML manipulation.
Proposed approach: use `yq` (lightweight Go binary, ~5MB) or native Lua YAML parsing
(LuCI already has Lua available).

---

## Testing Strategy

Since incorrect code means no internet for all LAN devices, testing is critical.

### Unit Testing (individual functions)

Each module function should be independently testable:
```bash
# Test firewall rules are correctly generated
. /usr/share/openclash/core/firewall.sh
firewall_configure "fake-ip" "0"   # mode, china_ip_route
nft list chain inet fw4 openclash  # verify rules
```

### Integration Testing

Test the full start/stop cycle on a real router (or OpenWrt VM):
- [ ] Start in each of the 6 modes
- [ ] Verify DNS hijacking works
- [ ] Verify traffic reaches Clash (test with HTTP traffic)
- [ ] Verify China bypass works (if enabled)
- [ ] Verify LAN access control works
- [ ] Verify clean stop (all rules removed, DNS restored)

### Regression Testing

Keep the old init.d/openclash available for comparison during development.
Run both versions and compare nftables rule output.

---

## Performance Benchmarks to Track

| Metric | Current (estimated) | Target |
|--------|---------------------|--------|
| Cold start time | ~8-12 seconds | < 5 seconds |
| UCI config read time | ~500ms (hundreds of calls) | < 50ms (batched) |
| Firewall rule application | ~2s (sequential) | < 200ms (batch) |
| Stop/cleanup time | ~3-5 seconds | < 2 seconds |

---

## Open Questions

- [ ] **YAML tooling:** yq binary (adds dependency) vs Lua YAML (uses existing) vs shell string manipulation (fragile)?
- [ ] **OpenWrt version floor:** Target 22.03+ or 21.02+? (affects nftables availability)
- [ ] **Testing environment:** OpenWrt VM or physical GL.iNet hardware?
- [ ] **Backwards compatibility:** Should the rewrite support old UCI config keys or migrate them?

---

*Status: Planning — not yet started*  
*Last updated: March 2026*
