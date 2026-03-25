-- JSON-RPC backend for Clash Nivo UI
-- Endpoint: /cgi-bin/luci/rpc/clash-nivo
-- Protocol: JSON-RPC 2.0 via HTTP POST
-- Auth: LuCI session (sysauth cookie or ?auth=TOKEN query param)

module("luci.controller.clash_nivo_rpc", package.seeall)

local io      = require "io"
local json    = require "luci.jsonc"
local http    = require "luci.http"
local uci_mod = require "luci.model.uci"
local nixio   = require "nixio"
local backend = require "luci.clashnivo.backend"

-- Restrict file operations to Clash Nivo-owned paths only
local ALLOWED_PATH_PATTERNS = {
    "^/etc/clashnivo/",
    "^/tmp/clashnivo",
    "^/tmp/clash",
}

local LOG_SERVICE    = "/tmp/clashnivo.log"
local LOG_CORE       = "/tmp/clash.log"
local LOG_UPDATES    = "/tmp/clashnivo_updates.log"
local LOG_MAX_LINES  = 500
local CONFIG_DIR     = "/etc/clashnivo/config"

local function request_host()
    local host = http.getenv("HTTP_HOST") or http.getenv("SERVER_NAME") or "localhost"
    if host:match("^%[.+%]") then
        return host:match("^(%[.+%])") or host
    end
    return host:gsub(":%d+$", "")
end

local function dashboard_base_url()
    local cursor = uci_mod.cursor()
    local ssl = cursor:get("clashnivo", "config", "dashboard_forward_ssl") == "1"
    local port = cursor:get("clashnivo", "config", "cn_port") or "9093"
    local scheme = ssl and "https" or "http"
    return string.format("%s://%s:%s/ui", scheme, request_host(), port)
end

local function decorate_dashboard_urls(options)
    local base_url = dashboard_base_url()
    for _, option in ipairs(options) do
        if option.installed then
            option.url = string.format("%s/%s/", base_url, option.key)
        else
            option.url = nil
        end
    end
    return options
end

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
    return backend.tail_file(path, lines, LOG_MAX_LINES)
end

-- Returns the UCI section id of the config_subscribe entry with the given name,
-- or nil if not found.
local function find_subscription_section(cursor, name)
    local found_sid = nil
    cursor:foreach("clashnivo", "config_subscribe", function(s)
        if s.name == name then
            found_sid = s[".name"]
        end
    end)
    return found_sid
end

local function update_subscription_probe_state(cursor, sid, result)
    if not sid or type(result) ~= "table" then
        return
    end

    cursor:set("clashnivo", sid, "last_check_status", tostring(result.status or "error"))
    cursor:set("clashnivo", sid, "last_check_message", tostring(result.message or ""))
    cursor:set("clashnivo", sid, "last_check_at", os.date("!%Y-%m-%dT%H:%M:%SZ"))

    if result.http_code and tonumber(result.http_code) and tonumber(result.http_code) > 0 then
        cursor:set("clashnivo", sid, "last_check_http_code", tostring(result.http_code))
    else
        cursor:delete("clashnivo", sid, "last_check_http_code")
    end
end

-- Returns the safe filesystem path for a named config file.
-- Errors if the name contains path separators or traversal sequences.
local function config_file_path(name)
    if not name or name == "" then
        error("config name is required")
    end
    if name:match("[/\\]") or name:match("%.%.") then
        error("invalid config name")
    end
    -- Append .yaml extension if not already present
    local fname = name:match("%.ya?ml$") and name or (name .. ".yaml")
    return CONFIG_DIR .. "/" .. fname, fname
end

local function set_active_config_path(cursor, path)
    if path and path ~= "" then
        cursor:set("clashnivo", "config", "config_path", path)
    else
        cursor:delete("clashnivo", "config", "config_path")
    end
end

local function first_config_path(exclude_path)
    local files = backend.list_yaml_files(CONFIG_DIR)
    for _, full_path in ipairs(files) do
        if full_path ~= exclude_path and nixio.fs.access(full_path) then
            return full_path
        end
    end
    return nil
end

-- ── method handlers ────────────────────────────────────────────────────────
-- Each handler receives params (array) and returns result or raises error().

local handlers = {}

function handlers.uci_get(p)
    local config  = p[1] or "clashnivo"
    local section = p[2]
    local option  = p[3]

    if config ~= "clashnivo" then
        error("access denied: only clashnivo config is accessible")
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
    local config  = p[1] or "clashnivo"
    local section = p[2]
    local option  = p[3]
    local value   = p[4]

    if config ~= "clashnivo" then
        error("access denied: only clashnivo config is writable")
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
    local config = p[1] or "clashnivo"

    if config ~= "clashnivo" then
        error("access denied: only clashnivo config is committable")
    end

    local cursor = uci_mod.cursor()
    cursor:commit(config)
    return true
end

function handlers.uci_add(p)
    local config       = p[1] or "clashnivo"
    local section_type = p[2]

    if config ~= "clashnivo" then
        error("access denied: only clashnivo config is writable")
    end
    if not section_type or section_type == "" then
        error("section_type is required")
    end

    local cursor = uci_mod.cursor()
    local sid = cursor:add(config, section_type)
    cursor:save(config)
    return sid
end

function handlers.uci_delete(p)
    local config  = p[1] or "clashnivo"
    local section = p[2]
    local option  = p[3]

    if config ~= "clashnivo" then
        error("access denied: only clashnivo config is writable")
    end
    if not section then
        error("section is required")
    end

    local cursor = uci_mod.cursor()
    if option then
        cursor:delete(config, section, option)
    else
        cursor:delete(config, section)
    end
    cursor:save(config)
    return true
end

function handlers.service_status()
    return backend.service_status()
end

function handlers.service_start()
    -- The init script checks clashnivo.config.enable=1 before starting
    local busy = backend.command_busy("start")
    if busy then
        return busy
    end
    local cursor = uci_mod.cursor()
    cursor:set("clashnivo", "config", "enable", "1")
    cursor:commit("clashnivo")
    return backend.service_action("start", true)
end

function handlers.service_stop()
    local busy = backend.command_busy("stop")
    if busy then
        return busy
    end
    local cursor = uci_mod.cursor()
    cursor:set("clashnivo", "config", "enable", "0")
    cursor:commit("clashnivo")
    return backend.service_action("stop")
end

function handlers.service_restart()
    -- Ensure enabled, then run async so the HTTP response returns before restart tears down Clash
    local busy = backend.command_busy("restart")
    if busy then
        return busy
    end
    local cursor = uci_mod.cursor()
    cursor:set("clashnivo", "config", "enable", "1")
    cursor:commit("clashnivo")
    return backend.service_action("restart", true)
end

function handlers.service_cancel_job()
    return backend.cancel_active_job()
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

function handlers.log_updates(p)
    return tail_file(LOG_UPDATES, p[1])
end

function handlers.log_clear(p)
    local kind = p[1]
    local path

    if kind == "service" then
        path = LOG_SERVICE
    elseif kind == "core" then
        path = LOG_CORE
    elseif kind == "updates" then
        path = LOG_UPDATES
    else
        error("unknown log kind")
    end

    return handlers.file_write({ path, "" })
end

function handlers.system_info()
    local cursor = uci_mod.cursor()

    -- Locate the active Clash binary (meta or standard)
    local core_path = cursor:get("clashnivo", "config", "core_path")
        or "/etc/clashnivo/core/clash_meta"

    local core_version = ""
    if nixio.fs.access(core_path) then
        core_version = backend.read_core_version(core_path)
    end

    local running = backend.is_core_running()

    return {
        core_version = core_version,
        running      = running,
    }
end

function handlers.subscription_update(p)
    local name = p[1]
    return backend.start_subscription_update(name)
end

function handlers.subscription_test(p)
    local name = p[1]
    local override_url = p[2]
    local cursor = uci_mod.cursor()
    local sid
    local url = override_url
    local user_agent = nil

    if (not url or url == "") and name and name ~= "" then
        sid = find_subscription_section(cursor, name)
        if not sid then
            error("subscription not found: " .. name)
        end
        url = cursor:get("clashnivo", sid, "address")
        user_agent = cursor:get("clashnivo", sid, "sub_ua")
    elseif name and name ~= "" then
        sid = find_subscription_section(cursor, name)
        if sid then
            user_agent = cursor:get("clashnivo", sid, "sub_ua")
        end
    end

    local result = backend.subscription_preflight(url, user_agent)
    result.name = name

    if sid then
        update_subscription_probe_state(cursor, sid, result)
        cursor:save("clashnivo")
        cursor:commit("clashnivo")
    end

    return result
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

    local cursor = uci_mod.cursor()
    local existing_sid = find_subscription_section(cursor, name)
    if existing_sid then
        return {
            name = name,
            created = false,
            duplicate = true,
        }
    end

    -- Create a new anonymous UCI config_subscribe section
    local sid = cursor:add("clashnivo", "config_subscribe")
    cursor:set("clashnivo", sid, "address", url)
    cursor:set("clashnivo", sid, "name",    name)
    cursor:set("clashnivo", sid, "enabled", "1")
    cursor:save("clashnivo")
    cursor:commit("clashnivo")

    return {
        name = name,
        created = true,
        duplicate = false,
    }
end

function handlers.subscription_list()
    local cursor = uci_mod.cursor()
    local result = {}
    cursor:foreach("clashnivo", "config_subscribe", function(s)
        local entry = {
            name = s.name or s[".name"],
            url  = s.address or "",
        }
        if s.auto_update_interval then
            entry.autoUpdateInterval = tonumber(s.auto_update_interval)
        end
        if s.last_updated and s.last_updated ~= "" then
            entry.lastUpdated = s.last_updated
        end
        if s.last_check_status and s.last_check_status ~= "" then
            entry.lastCheckStatus = s.last_check_status
        end
        if s.last_check_message and s.last_check_message ~= "" then
            entry.lastCheckMessage = s.last_check_message
        end
        if s.last_check_at and s.last_check_at ~= "" then
            entry.lastCheckAt = s.last_check_at
        end
        if s.last_check_http_code and s.last_check_http_code ~= "" then
            entry.lastCheckHttpCode = tonumber(s.last_check_http_code)
        end
        if s.expiry and s.expiry ~= "" then
            entry.expiry = s.expiry
        end
        if s.data_used and s.data_used ~= "" then
            entry.dataUsed = tonumber(s.data_used)
        end
        if s.data_total and s.data_total ~= "" then
            entry.dataTotal = tonumber(s.data_total)
        end
        result[#result + 1] = entry
    end)
    return result
end

function handlers.subscription_delete(p)
    local name = p[1]
    if not name or name == "" then
        error("name is required")
    end

    local cursor = uci_mod.cursor()
    local sid = find_subscription_section(cursor, name)
    if not sid then
        error("subscription not found: " .. name)
    end

    cursor:delete("clashnivo", sid)
    cursor:save("clashnivo")
    cursor:commit("clashnivo")
    return true
end

function handlers.subscription_edit(p)
    local name = p[1]
    local data = p[2]

    if not name or name == "" then error("name is required") end
    if type(data) ~= "table" then error("data must be an object") end

    local cursor = uci_mod.cursor()
    local sid = find_subscription_section(cursor, name)
    if not sid then
        error("subscription not found: " .. name)
    end

    local active_path = cursor:get("clashnivo", "config", "config_path") or ""
    local old_config_path, _ = config_file_path(name)

    if data.url and data.url ~= "" then
        cursor:set("clashnivo", sid, "address", data.url)
        cursor:delete("clashnivo", sid, "last_check_status")
        cursor:delete("clashnivo", sid, "last_check_message")
        cursor:delete("clashnivo", sid, "last_check_at")
        cursor:delete("clashnivo", sid, "last_check_http_code")
    end
    if data.newName and data.newName ~= "" then
        local existing_sid = find_subscription_section(cursor, data.newName)
        if existing_sid and existing_sid ~= sid then
            error("subscription name already exists: " .. data.newName)
        end

        local new_config_path, _ = config_file_path(data.newName)
        if old_config_path ~= new_config_path and nixio.fs.access(old_config_path) then
            if nixio.fs.access(new_config_path) then
                error("config file already exists for subscription: " .. data.newName)
            end
            local ok, err = nixio.fs.rename(old_config_path, new_config_path)
            if not ok then
                error("failed to rename config file: " .. tostring(err))
            end
            if active_path == old_config_path then
                set_active_config_path(cursor, new_config_path)
            end
        elseif active_path == old_config_path then
            set_active_config_path(cursor, new_config_path)
        end

        cursor:set("clashnivo", sid, "name", data.newName)
    end
    if data.autoUpdateInterval ~= nil then
        cursor:set("clashnivo", sid, "auto_update_interval", tostring(data.autoUpdateInterval))
    end

    cursor:save("clashnivo")
    cursor:commit("clashnivo")
    return true
end

function handlers.subscription_update_all()
    return backend.start_subscription_update()
end

-- ── config file handlers ───────────────────────────────────────────────────

function handlers.config_list()
    local cursor = uci_mod.cursor()
    local active_path = cursor:get("clashnivo", "config", "config_path") or ""

    local result = {}
    local files = backend.list_yaml_files(CONFIG_DIR)
    for _, full_path in ipairs(files) do
        local fname = full_path:match("([^/]+)$")
        if fname then
            local stat = nixio.fs.stat(full_path)
            result[#result + 1] = {
                name         = fname,
                active       = (full_path == active_path),
                size         = stat and stat.size or nil,
                lastModified = stat and os.date("!%Y-%m-%dT%H:%M:%SZ", stat.mtime) or nil,
            }
        end
    end
    return result
end

function handlers.config_set_active(p)
    local name = p[1]
    if not name or name == "" then error("name is required") end

    local path, _ = config_file_path(name)
    if not nixio.fs.access(path) then
        error("config file not found: " .. name)
    end

    local cursor = uci_mod.cursor()
    cursor:set("clashnivo", "config", "config_path", path)
    cursor:save("clashnivo")
    cursor:commit("clashnivo")
    return true
end

function handlers.config_delete(p)
    local name = p[1]
    if not name or name == "" then error("name is required") end

    local path, _ = config_file_path(name)

    local cursor = uci_mod.cursor()
    local active = cursor:get("clashnivo", "config", "config_path") or ""

    if not nixio.fs.access(path) then
        error("config file not found: " .. name)
    end

    local ok, err = nixio.fs.remove(path)
    if not ok then
        error("failed to delete config file: " .. tostring(err))
    end

    if active == path then
        set_active_config_path(cursor, first_config_path(path))
        cursor:save("clashnivo")
        cursor:commit("clashnivo")
    end

    return true
end

function handlers.config_read(p)
    local name = p[1]
    if not name or name == "" then error("name is required") end
    local path, _ = config_file_path(name)
    -- Delegate to file_read (path is inside /etc/clashnivo/ so it passes the allow-list)
    return handlers.file_read({ path })
end

function handlers.config_write(p)
    local name    = p[1]
    local content = p[2]
    if not name or name == "" then error("name is required") end
    if content == nil then error("content is required") end
    local path, _ = config_file_path(name)
    return handlers.file_write({ path, content })
end

function handlers.config_preview()
    return backend.preview_config()
end

function handlers.config_validate()
    return backend.validate_config()
end

-- ── core management handlers ───────────────────────────────────────────────

function handlers.core_latest_version()
    return backend.core_latest_version()
end

function handlers.core_current()
    return backend.core_current()
end

function handlers.core_refresh_latest_version()
    return backend.refresh_core_latest_version()
end

function handlers.core_probe_sources()
    return backend.probe_core_sources()
end

function handlers.core_update()
    return backend.start_core_update()
end

function handlers.core_update_status()
    return backend.core_update_status()
end

function handlers.package_latest_version()
    return backend.package_latest_version()
end

function handlers.package_refresh_latest_version()
    return backend.refresh_package_latest_version()
end

function handlers.package_update()
    return backend.start_package_update()
end

function handlers.package_update_status()
    return backend.package_update_status()
end

function handlers.assets_update(p)
    local target = p[1]
    return backend.start_assets_update(target)
end

function handlers.assets_update_status(p)
    local target = p[1]
    return backend.assets_update_status(target)
end

function handlers.dashboard_list()
    return decorate_dashboard_urls(backend.dashboard_list())
end

function handlers.dashboard_select(p)
    local id = p[1]
    if not id or id == "" then
        error("dashboard id is required")
    end
    return backend.dashboard_select(id)
end

function handlers.dashboard_update(p)
    local id = p[1]
    if not id or id == "" then
        error("dashboard id is required")
    end
    return backend.dashboard_update(id)
end

function handlers.dashboard_update_status(p)
    local id = p[1]
    if not id or id == "" then
        error("dashboard id is required")
    end
    return backend.dashboard_update_status(id)
end

-- ── method dispatch table (dot-notation → handler) ─────────────────────────

local METHOD_MAP = {
    ["uci.get"]                  = handlers.uci_get,
    ["uci.set"]                  = handlers.uci_set,
    ["uci.add"]                  = handlers.uci_add,
    ["uci.delete"]               = handlers.uci_delete,
    ["uci.commit"]               = handlers.uci_commit,
    ["service.status"]           = handlers.service_status,
    ["service.start"]            = handlers.service_start,
    ["service.stop"]             = handlers.service_stop,
    ["service.restart"]          = handlers.service_restart,
    ["service.cancelJob"]        = handlers.service_cancel_job,
    ["file.read"]                = handlers.file_read,
    ["file.write"]               = handlers.file_write,
    ["log.service"]              = handlers.log_service,
    ["log.core"]                 = handlers.log_core,
    ["log.updates"]              = handlers.log_updates,
    ["log.clear"]                = handlers.log_clear,
    ["system.info"]              = handlers.system_info,
    ["subscription.add"]         = handlers.subscription_add,
    ["subscription.test"]        = handlers.subscription_test,
    ["subscription.list"]        = handlers.subscription_list,
    ["subscription.delete"]      = handlers.subscription_delete,
    ["subscription.edit"]        = handlers.subscription_edit,
    ["subscription.update"]      = handlers.subscription_update,
    ["subscription.updateAll"]   = handlers.subscription_update_all,
    ["config.list"]              = handlers.config_list,
    ["config.setActive"]         = handlers.config_set_active,
    ["config.delete"]            = handlers.config_delete,
    ["config.read"]              = handlers.config_read,
    ["config.write"]             = handlers.config_write,
    ["config.preview"]           = handlers.config_preview,
    ["config.validate"]          = handlers.config_validate,
    ["core.latestVersion"]       = handlers.core_latest_version,
    ["core.current"]             = handlers.core_current,
    ["core.refreshLatestVersion"]= handlers.core_refresh_latest_version,
    ["core.probeSources"]        = handlers.core_probe_sources,
    ["core.update"]              = handlers.core_update,
    ["core.updateStatus"]        = handlers.core_update_status,
    ["package.latestVersion"]    = handlers.package_latest_version,
    ["package.refreshLatestVersion"] = handlers.package_refresh_latest_version,
    ["package.update"]           = handlers.package_update,
    ["package.updateStatus"]     = handlers.package_update_status,
    ["assets.update"]            = handlers.assets_update,
    ["assets.updateStatus"]      = handlers.assets_update_status,
    ["dashboard.list"]           = handlers.dashboard_list,
    ["dashboard.select"]         = handlers.dashboard_select,
    ["dashboard.update"]         = handlers.dashboard_update,
    ["dashboard.updateStatus"]   = handlers.dashboard_update_status,
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
