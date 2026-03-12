-- JSON-RPC backend for OpenClash Nivo UI
-- Endpoint: /cgi-bin/luci/rpc/clash-nivo
-- Protocol: JSON-RPC 2.0 via HTTP POST
-- Auth: LuCI session (sysauth cookie or ?auth=TOKEN query param)

module("luci.controller.clash_nivo_rpc", package.seeall)

local json    = require "luci.jsonc"
local http    = require "luci.http"
local sys     = require "luci.sys"
local uci_mod = require "luci.model.uci"
local nixio   = require "nixio"

-- Restrict file operations to OpenClash-owned paths only
local ALLOWED_PATH_PATTERNS = {
    "^/etc/openclash/",
    "^/tmp/openclash",
    "^/tmp/clash",
}

local LOG_SERVICE = "/tmp/openclash.log"
local LOG_CORE    = "/tmp/clash.log"
local LOG_MAX_LINES = 500

function index()
    local e = entry({"rpc", "clash-nivo"}, call("handle_rpc"))
    e.leaf      = true
    e.sysauth   = "root"
    e.sysauth_authenticator = "htmlauth"
end

-- ── helpers ────────────────────────────────────────────────────────────────

local function rpc_ok(id, result)
    return { jsonrpc = "2.0", id = id, result = result }
end

local function rpc_err(id, code, message)
    return { jsonrpc = "2.0", id = id, error = { code = code, message = message } }
end

local function is_allowed_path(path)
    if not path then return false end
    for _, pattern in ipairs(ALLOWED_PATH_PATTERNS) do
        if path:match(pattern) then return true end
    end
    return false
end

local function tail_file(path, lines)
    lines = math.min(tonumber(lines) or 100, LOG_MAX_LINES)
    return sys.exec(string.format("tail -n %d '%s' 2>/dev/null", lines, path)) or ""
end

-- ── method handlers ────────────────────────────────────────────────────────
-- Each handler receives params (array) and returns result or raises error().

local handlers = {}

function handlers.uci_get(p)
    local config  = p[1] or "openclash"
    local section = p[2]
    local option  = p[3]

    if config ~= "openclash" then
        error("access denied: only openclash config is accessible")
    end

    local cursor = uci_mod.cursor()

    if option then
        local val = cursor:get(config, section, option)
        if val == nil then error("option not found") end
        return val
    elseif section then
        local val = cursor:get_all(config, section)
        if val == nil then error("section not found") end
        return val
    else
        return cursor:get_all(config)
    end
end

function handlers.uci_set(p)
    local config  = p[1] or "openclash"
    local section = p[2]
    local option  = p[3]
    local value   = p[4]

    if config ~= "openclash" then
        error("access denied: only openclash config is writable")
    end
    if not section or not option or value == nil then
        error("section, option, and value are required")
    end

    local cursor = uci_mod.cursor()
    cursor:set(config, section, option, value)
    cursor:save(config)
    return true
end

function handlers.uci_commit(p)
    local config = p[1] or "openclash"

    if config ~= "openclash" then
        error("access denied: only openclash config is committable")
    end

    local cursor = uci_mod.cursor()
    cursor:commit(config)
    return true
end

function handlers.service_status(p)
    local name = p[1] or "openclash"
    -- Use pidof to check if the process is running and get its PID
    local pid_str = sys.exec(string.format("pidof %s 2>/dev/null | tr -d '\\n'", name))
    if pid_str and pid_str ~= "" then
        return { running = true, pid = tonumber(pid_str:match("%d+")) }
    end
    return { running = false }
end

function handlers.service_start()
    sys.call("/etc/init.d/openclash start >/dev/null 2>&1")
    return true
end

function handlers.service_stop()
    sys.call("/etc/init.d/openclash stop >/dev/null 2>&1")
    return true
end

function handlers.service_restart()
    -- Run async so the HTTP response returns before the restart tears down Clash
    sys.call("/etc/init.d/openclash restart >/dev/null 2>&1 &")
    return true
end

function handlers.file_read(p)
    local path = p[1]
    if not is_allowed_path(path) then
        error("access denied: path not permitted")
    end

    local f, err = io.open(path, "r")
    if not f then error("cannot read file: " .. tostring(err)) end
    local content = f:read("*a")
    f:close()
    return content
end

function handlers.file_write(p)
    local path    = p[1]
    local content = p[2]

    if not is_allowed_path(path) then
        error("access denied: path not permitted")
    end
    if content == nil then
        error("content is required")
    end

    -- Ensure parent directory exists
    local dir = path:match("^(.*)/[^/]+$")
    if dir then nixio.fs.mkdirr(dir) end

    local f, err = io.open(path, "w")
    if not f then error("cannot write file: " .. tostring(err)) end
    f:write(content)
    f:close()
    return true
end

function handlers.log_service(p)
    return tail_file(LOG_SERVICE, p[1])
end

function handlers.log_core(p)
    return tail_file(LOG_CORE, p[1])
end

function handlers.system_info()
    local cursor = uci_mod.cursor()

    -- Locate the active Clash binary (meta or standard)
    local core_path = cursor:get("openclash", "config", "core_path")
        or "/etc/openclash/core/clash_meta"

    local core_version = ""
    if nixio.fs.access(core_path) then
        core_version = sys.exec(
            string.format("%s -v 2>/dev/null | head -1 | tr -d '\\n'", core_path)
        ) or ""
    end

    local running = sys.call("pidof clash >/dev/null 2>&1") == 0

    return {
        core_version = core_version,
        running      = running,
    }
end

function handlers.subscription_update(p)
    local name = p[1]
    if name then
        -- Single subscription by name
        sys.call(string.format(
            "bash /usr/share/openclash/openclash_config.sh '%s' >/dev/null 2>&1 &",
            name:gsub("'", "'\\''")))
    else
        -- Update all subscriptions
        sys.call("bash /usr/share/openclash/openclash_config.sh >/dev/null 2>&1 &")
    end
    return true
end

function handlers.subscription_add(p)
    local url  = p[1]
    local name = p[2]

    if not url or url == "" then
        error("url is required")
    end

    -- Basic URL sanity check
    if not url:match("^https?://") then
        error("url must start with http:// or https://")
    end

    name = (name and name ~= "") and name or "subscription"

    -- Sanitise for shell use
    local safe_url  = url:gsub("'", "'\\''")
    local safe_name = name:gsub("'", "'\\''")

    -- Create a new anonymous UCI config_subscribe section
    local cursor = uci_mod.cursor()
    local sid = cursor:add("openclash", "config_subscribe")
    cursor:set("openclash", sid, "address", url)
    cursor:set("openclash", sid, "name",    name)
    cursor:set("openclash", sid, "enabled", "1")
    cursor:save("openclash")
    cursor:commit("openclash")

    -- Trigger async subscription download
    sys.call(string.format(
        "bash /usr/share/openclash/openclash_config.sh '%s' >/dev/null 2>&1 &",
        safe_name))

    return { name = name }
end

-- ── method dispatch table (dot-notation → handler) ─────────────────────────

local METHOD_MAP = {
    ["uci.get"]             = handlers.uci_get,
    ["uci.set"]             = handlers.uci_set,
    ["uci.commit"]          = handlers.uci_commit,
    ["service.status"]      = handlers.service_status,
    ["service.start"]       = handlers.service_start,
    ["service.stop"]        = handlers.service_stop,
    ["service.restart"]     = handlers.service_restart,
    ["file.read"]           = handlers.file_read,
    ["file.write"]          = handlers.file_write,
    ["log.service"]         = handlers.log_service,
    ["log.core"]            = handlers.log_core,
    ["system.info"]         = handlers.system_info,
    ["subscription.update"] = handlers.subscription_update,
    ["subscription.add"]    = handlers.subscription_add,
}

-- ── main RPC handler ────────────────────────────────────────────────────────

function handle_rpc()
    http.prepare_content("application/json")

    local body = http.content()
    if not body or body == "" then
        http.write(json.stringify(rpc_err(nil, -32700, "parse error: empty body")))
        return
    end

    local req = json.parse(body)
    if type(req) ~= "table" then
        http.write(json.stringify(rpc_err(nil, -32700, "parse error: invalid JSON")))
        return
    end

    local id = req.id

    if req.jsonrpc ~= "2.0" then
        http.write(json.stringify(rpc_err(id, -32600, "invalid request: jsonrpc must be '2.0'")))
        return
    end

    if type(req.method) ~= "string" then
        http.write(json.stringify(rpc_err(id, -32600, "invalid request: method must be a string")))
        return
    end

    local handler = METHOD_MAP[req.method]
    if not handler then
        http.write(json.stringify(rpc_err(id, -32601, "method not found: " .. req.method)))
        return
    end

    local params = req.params
    if type(params) ~= "table" then params = {} end

    local ok, result = pcall(handler, params)
    if not ok then
        http.write(json.stringify(rpc_err(id, -32603, tostring(result))))
        return
    end

    http.write(json.stringify(rpc_ok(id, result)))
end
