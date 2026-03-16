# Building the luci-app-clashnivo package

This guide explains how to build the `.ipk` (or `.apk`) package locally for installation on an OpenWrt router.

## Prerequisites

- **Linux** (Ubuntu/Debian recommended — the OpenWrt SDK is a Linux binary). On macOS, use Docker or a Linux VM.
- `curl`, `git`, `tar`, `unzip`, `make`, `gcc`, `python3`

```sh
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y curl git tar unzip make gcc python3 python3-setuptools
```

- **Node.js ≥ 18** and `npm` — to build the Svelte frontend before packaging.

## Step 1 — Build the frontend

The build output `ui/dist/` is committed to the repo, so **this step is only needed if you've made frontend changes**.

```sh
cd luci-app-clashnivo/ui
npm install
npm run build
# dist/ is now updated
cd ../..
```

## Step 2 — Download the OpenWrt SDK

Pick the SDK that matches your router's architecture. For most modern x86 OpenWrt routers:

```sh
mkdir -p /tmp/owrt-sdk && cd /tmp/owrt-sdk

# OpenWrt 22.03 x86/64 (ipk format — works on most stable installs)
curl -L "https://mirrors.pku.edu.cn/openwrt/releases/22.03.0/targets/x86/64/openwrt-sdk-22.03.0-x86-64_gcc-11.2.0_musl.Linux-x86_64.tar.xz" -o SDK.tar.xz
tar xf SDK.tar.xz
mv openwrt-sdk-* SDK
```

For **snapshot / OpenWrt 23.x+** routers that use `.apk` packages instead of `.ipk`, use the snapshot SDK from `https://downloads.openwrt.org/snapshots/targets/x86/64/`.

> **Architecture note:** If your router is ARM (e.g. Raspberry Pi, most home routers), download the matching SDK from `https://downloads.openwrt.org/releases/`. The package itself is `PKGARCH:=all` so the compiled `.ipk` is architecture-independent — but `po2lmo` (the build tool) still needs to be compiled for the build host.

## Step 3 — Copy the package source into the SDK

```sh
mkdir -p /tmp/owrt-sdk/SDK/package/luci-app-clashnivo
cp -r /path/to/gorillapowerOpenClash/luci-app-clashnivo/. \
      /tmp/owrt-sdk/SDK/package/luci-app-clashnivo/
```

## Step 4 — Compile po2lmo

`po2lmo` converts `.po` translation files to binary `.lmo` format. It's included in the package source.

```sh
cd /tmp/owrt-sdk/SDK/package/luci-app-clashnivo/tools/po2lmo
make && sudo make install
cd /tmp/owrt-sdk/SDK
```

## Step 5 — Compile the package

```sh
cd /tmp/owrt-sdk/SDK
make defconfig
make package/luci-app-clashnivo/compile V=99
```

The `.ipk` will be at:
```
bin/packages/x86_64/base/luci-app-clashnivo_*.ipk
```

## Step 6 — Install on your router

```sh
# Copy to router
scp bin/packages/x86_64/base/luci-app-clashnivo_*.ipk root@10.0.0.1:/tmp/

# SSH in and install
ssh root@10.0.0.1
opkg install /tmp/luci-app-clashnivo_*.ipk

# Clear LuCI cache so the new menu item appears
rm -rf /tmp/luci-*
```

Refresh LuCI → **Services → Clash Nivo** appears in the sidebar.

---

## Quick dev deploy (no build needed)

For iterating on the frontend or Lua backend without a full SDK build, you can `scp` individual files directly:

```sh
# SPA (after npm run build)
scp -r luci-app-clashnivo/ui/dist/ root@10.0.0.1:/www/luci-static/clash-nivo/

# Lua RPC backend
scp luci-app-clashnivo/luasrc/controller/clash_nivo_rpc.lua \
    root@10.0.0.1:/usr/lib/lua/luci/controller/

# LuCI menu controller
scp luci-app-clashnivo/luasrc/controller/clashnivo.lua \
    root@10.0.0.1:/usr/lib/lua/luci/controller/

# LuCI menu template
ssh root@10.0.0.1 "mkdir -p /usr/lib/lua/luci/view/clashnivo"
scp luci-app-clashnivo/luasrc/view/clashnivo/app.htm \
    root@10.0.0.1:/usr/lib/lua/luci/view/clashnivo/

# Clear LuCI cache
ssh root@10.0.0.1 "rm -rf /tmp/luci-*"
```

The SPA is then live at `http://10.0.0.1/luci-static/clash-nivo/` and accessible via the LuCI menu.

---

## CI builds

The GitHub Actions workflow (`.github/workflows/compile_new_ipk.yml`) runs automatically when `luci-app-clashnivo/Makefile` is pushed to the `dev` branch. It:

1. Builds both `.ipk` (OpenWrt 22.03) and `.apk` (snapshot) packages
2. Downloads latest China IP routes, GeoSite.dat, Country.mmdb, and Clash dashboard UIs
3. Publishes the packages to the `package` branch

To trigger a release build: bump `PKG_VERSION` in `luci-app-clashnivo/Makefile` and push to `dev`.
