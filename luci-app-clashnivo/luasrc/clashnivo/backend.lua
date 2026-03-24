module("luci.clashnivo.backend", package.seeall)

local io = require "io"
local nixio = require "nixio"
local fs = require "nixio.fs"
local json = require "luci.jsonc"
local sys = require "luci.sys"
local util = require "luci.util"
local uci_mod = require "luci.model.uci"

local CLASHNIVO_INIT = "/etc/init.d/clashnivo"
local CLASHNIVO_CORE_VERSION_SCRIPT = "/usr/share/clashnivo/clash_version.sh"
local CLASHNIVO_PACKAGE_VERSION_SCRIPT = "/usr/share/clashnivo/clashnivo_version.sh"
local CLASHNIVO_CORE_VERSION_FILE = "/tmp/clash_last_version"
local CLASHNIVO_CORE_SOURCE_PROBE_FILE = "/tmp/clashnivo_core_source_probe"
local CLASHNIVO_PACKAGE_VERSION_FILE = "/tmp/clashnivo_last_version"
local CLASHNIVO_CORE_VERSION_LOCK = "/tmp/clashnivo_core_latest.lock"
local CLASHNIVO_PACKAGE_VERSION_LOCK = "/tmp/clashnivo_package_latest.lock"
local CLASHNIVO_COMMAND_LOCK_DIR = "/tmp/clashnivo_command.lock"
local CLASHNIVO_COMMAND_LOCK_PID_FILE = CLASHNIVO_COMMAND_LOCK_DIR .. "/pid"
local CLASHNIVO_COMMAND_LOCK_CONTEXT_FILE = CLASHNIVO_COMMAND_LOCK_DIR .. "/context"
local CLASHNIVO_COMMAND_LOCK_STARTED_AT_FILE = CLASHNIVO_COMMAND_LOCK_DIR .. "/started_at"
local VERSION_CACHE_TTL = 900
local DASHBOARD_UI_BASE = "/usr/share/clashnivo/ui"
local DASHBOARD_OPTIONS = {
	{ id = "dashboard_official", key = "dashboard", variant = "Official", name = "Dashboard", label = "Clash Dashboard" },
	{ id = "dashboard_meta",     key = "dashboard", variant = "Meta",     name = "Dashboard", label = "Razord Meta" },
	{ id = "yacd_official",      key = "yacd",      variant = "Official", name = "Yacd",      label = "Yacd" },
	{ id = "yacd_meta",          key = "yacd",      variant = "Meta",     name = "Yacd",      label = "Yacd Meta" },
	{ id = "metacubexd",         key = "metacubexd",variant = "Official", name = "MetaCubeXD",label = "MetaCubeXD" },
	{ id = "zashboard",          key = "zashboard", variant = "Official", name = "Zashboard", label = "Zashboard" },
}
local function shellquote(value)
	return util.shellquote(value or "")
end

local function read_file(path)
	local file = io.open(path, "r")
	if not file then
		return nil
	end

	local content = file:read("*a")
	file:close()
	return content
end

local function write_file(path, content)
	local file, err = io.open(path, "w")
	if not file then
		return nil, err
	end

	file:write(content)
	file:close()
	return true
end

function tail_file(path, lines, max_lines)
	lines = math.min(tonumber(lines) or 100, max_lines or 500)
	return sys.exec(string.format("tail -n %d %s 2>/dev/null", lines, shellquote(path))) or ""
end

local function command_lock_pid()
	return read_trimmed_file(CLASHNIVO_COMMAND_LOCK_PID_FILE)
end

local function command_lock_context()
	return read_trimmed_file(CLASHNIVO_COMMAND_LOCK_CONTEXT_FILE)
end

local function command_lock_started_at()
	return read_trimmed_file(CLASHNIVO_COMMAND_LOCK_STARTED_AT_FILE)
end

local function command_lock_busy()
	if not fs.access(CLASHNIVO_COMMAND_LOCK_DIR) then
		return false
	end

	local pid = command_lock_pid()
	if pid ~= "" and sys.call(string.format("kill -0 %s >/dev/null 2>&1", shellquote(pid))) == 0 then
		return true
	end

	fs.remove(CLASHNIVO_COMMAND_LOCK_PID_FILE)
	fs.remove(CLASHNIVO_COMMAND_LOCK_CONTEXT_FILE)
	fs.remove(CLASHNIVO_COMMAND_LOCK_STARTED_AT_FILE)
	fs.rmdir(CLASHNIVO_COMMAND_LOCK_DIR)
	return false
end

local function busy_response(context)
	return {
		accepted = false,
		busy = true,
		status = "busy",
		context = context,
		active_command = command_lock_context(),
		active_pid = command_lock_pid(),
		started_at = command_lock_started_at(),
	}
end

function command_busy(context)
	if command_lock_busy() then
		return busy_response(context)
	end

	return nil
end

function core_process_pid()
	local pid_str = sys.exec("pidof clash mihomo 2>/dev/null | tr -d '\\n'")
	if pid_str and pid_str ~= "" then
		return tonumber(pid_str:match("%d+"))
	end

	return nil
end

function service_status()
	local output = sys.exec(string.format("%s status 2>/dev/null", shellquote(CLASHNIVO_INIT))) or ""
	local parsed = json.parse(output)

	if parsed and type(parsed) == "table" then
		local enabled = parsed.enabled == true
		local active = parsed.service_running == true or parsed.core_running == true or parsed.watchdog_running == true
		parsed.running = enabled and active

		if parsed.core_pid and parsed.core_pid ~= "" then
			parsed.pid = tonumber(parsed.core_pid) or parsed.core_pid
		else
			parsed.pid = nil
		end

		return parsed
	end

	local pid = core_process_pid()
	if pid then
		return { running = true, service_running = true, core_running = true, pid = pid }
	end

	return { running = false, service_running = false, core_running = false }
end

local function file_mtime(path)
	local stat = fs.stat(path)
	if stat and stat.mtime then
		return tonumber(stat.mtime)
	end
	return nil
end

local function file_is_fresh(path, ttl)
	local mtime = file_mtime(path)
	if not mtime then
		return false
	end
	return (os.time() - mtime) < ttl
end

local function core_source_mode(cursor)
	local raw = cursor:get("clashnivo", "config", "core_source") or "auto"

	if raw == "openclash" or raw == "clashnivo" then
		return "official"
	end

	if raw == "auto" or raw == "official" or raw == "jsdelivr" or raw == "fastly" or raw == "testingcf" or raw == "custom" then
		return raw
	end

	return "auto"
end

local function core_source_label(mode)
	if mode == "auto" then
		return "Auto"
	elseif mode == "official" then
		return "Official GitHub"
	elseif mode == "jsdelivr" then
		return "jsDelivr"
	elseif mode == "fastly" then
		return "Fastly jsDelivr"
	elseif mode == "testingcf" then
		return "TestingCF jsDelivr"
	elseif mode == "custom" then
		return "Custom"
	end

	return "Unknown"
end

local function core_source_custom_base(cursor)
	local base = cursor:get("clashnivo", "config", "core_custom_base_url") or ""
	base = base:gsub("/+$", "")
	return base
end

local function core_source_base_for_mode(cursor, mode)
	if mode == "official" then
		return "https://raw.githubusercontent.com/vernesong/OpenClash/core"
	elseif mode == "jsdelivr" then
		return "https://cdn.jsdelivr.net/gh/vernesong/OpenClash@core"
	elseif mode == "fastly" then
		return "https://fastly.jsdelivr.net/gh/vernesong/OpenClash@core"
	elseif mode == "testingcf" then
		return "https://testingcf.jsdelivr.net/gh/vernesong/OpenClash@core"
	elseif mode == "custom" then
		local prefix = core_source_custom_base(cursor)
		if prefix == "" then
			return ""
		end
		return string.format("%s/https://raw.githubusercontent.com/vernesong/OpenClash/core", prefix)
	end

	return ""
end

local function read_probe_cache()
	local content = read_trimmed_file(CLASHNIVO_CORE_SOURCE_PROBE_FILE)
	if content == "" then
		return nil
	end

	local lines = util.split(content, "\n", nil, true)
	local checked_at = tonumber(lines[5] or "")

	return {
		selected_source = (lines[1] or ""):gsub("%s+$", ""),
		selected_base = (lines[2] or ""):gsub("%s+$", ""),
		latency_ms = tonumber(lines[3] or ""),
		probe_url = (lines[4] or ""):gsub("%s+$", ""),
		checked_at = checked_at,
	}
end

local function read_core_latest_cached()
	local cursor = uci_mod.cursor()
	local core_type = cursor:get("clashnivo", "config", "core_type") or "Meta"
	local smart_enable = cursor:get("clashnivo", "config", "smart_enable") or "0"
	local configured_source = core_source_mode(cursor)
	local probe_cache = read_probe_cache()
	local selected_source = configured_source ~= "auto" and configured_source or nil
	local selected_base = configured_source ~= "auto" and core_source_base_for_mode(cursor, configured_source) or nil
	if smart_enable == "1" then
		core_type = "Smart"
	end

	local line_number = core_type == "Smart" and 2 or 1
	local version = ""
	local content = read_trimmed_file(CLASHNIVO_CORE_VERSION_FILE)
	if content ~= "" then
		local lines = util.split(content, "\n", nil, true)
		version = (lines[line_number] or ""):gsub("%s+$", "")
	end

	local source_branch = cursor:get("clashnivo", "config", "release_branch") or "master"
	if configured_source == "auto" and probe_cache and probe_cache.selected_source and probe_cache.selected_source ~= "" then
		selected_source = probe_cache.selected_source
		selected_base = probe_cache.selected_base
	end

	return {
		kind = "core",
		version = version,
		core_type = core_type,
		source_policy = configured_source,
		source_policy_label = core_source_label(configured_source),
		selected_source = selected_source,
		selected_source_label = selected_source and core_source_label(selected_source) or nil,
		source_branch = source_branch,
		source_base = selected_base,
		latency_ms = probe_cache and probe_cache.latency_ms or nil,
		probe_url = probe_cache and probe_cache.probe_url or nil,
	}
end

local function read_package_latest_cached()
	return {
		kind = "package",
		version = read_trimmed_file(CLASHNIVO_PACKAGE_VERSION_FILE),
		source_policy = "package-branch",
	}
end

local function spawn_version_refresh(lock_file, command)
	local inner

	if fs.access(lock_file) and file_is_fresh(lock_file, 120) then
		return
	end

	inner = string.format(
		"touch %s; trap 'rm -f %s' EXIT; %s >/dev/null 2>&1",
		shellquote(lock_file),
		shellquote(lock_file),
		command
	)

	sys.call(string.format(
		"nohup /bin/sh -c %s </dev/null >/dev/null 2>&1 &",
		shellquote(inner)
	))
end

local function refresh_core_latest_now()
	local command = shellquote(CLASHNIVO_CORE_VERSION_SCRIPT)

	local rc = sys.call(command .. " >/dev/null 2>&1")
	local result = read_core_latest_cached()
	result.accepted = rc == 0
	result.status = rc == 0 and "done" or "error"
	return result
end

function probe_core_sources()
	return update_command("probe_core_sources")
end

local function refresh_package_latest_now()
	local rc = sys.call(string.format("%s >/dev/null 2>&1", shellquote(CLASHNIVO_PACKAGE_VERSION_SCRIPT)))
	local result = read_package_latest_cached()
	result.accepted = rc == 0
	result.status = rc == 0 and "done" or "error"
	return result
end

function service_action(action, async)
	if command_lock_busy() then
		return busy_response(action)
	end

	if async then
		sys.call(string.format(
			"nohup %s %s </dev/null >/dev/null 2>&1 &",
			shellquote(CLASHNIVO_INIT),
			shellquote(action)
		))
		return {
			accepted = true,
			busy = false,
			status = "accepted",
			action = action,
			async = true,
		}
	end

	local rc = sys.call(string.format("%s %s >/dev/null 2>&1", shellquote(CLASHNIVO_INIT), shellquote(action)))
	return {
		accepted = rc == 0,
		busy = false,
		status = rc == 0 and "done" or "error",
		action = action,
		async = false,
	}
end

local function service_arg_command(action, arg, async)
	local cmd = string.format("%s %s", shellquote(CLASHNIVO_INIT), shellquote(action))
	if arg and arg ~= "" then
		cmd = cmd .. " " .. shellquote(arg)
	end
	if async then
		cmd = "nohup " .. cmd .. " </dev/null >/dev/null 2>&1 &"
	else
		cmd = cmd .. " >/dev/null 2>&1"
	end
	return sys.call(cmd)
end

local function service_json_command(action)
	local output = sys.exec(string.format("%s %s 2>/dev/null", shellquote(CLASHNIVO_INIT), shellquote(action))) or ""
	local parsed = json.parse(output)

	if parsed and type(parsed) == "table" then
		return parsed
	end

	return {
		valid = false,
		failed_layer = "service",
		stages = {
			{
				name = action,
				status = "failed",
				message = "Unable to parse service JSON output",
			},
		},
	}
end

function read_core_version(core_path)
	if not fs.access(core_path) then
		return ""
	end

	return sys.exec(string.format("%s -v 2>/dev/null | head -1 | tr -d '\\n'", shellquote(core_path))) or ""
end

function is_core_running()
	return core_process_pid() ~= nil
end

function start_subscription_update(name)
	local action = (name and name ~= "") and "refresh_source" or "refresh_sources"
	return update_command(action, name)
end

function list_yaml_files(config_dir)
	local results = {}
	local iter = fs.glob(config_dir .. "/*.yaml")
	if not iter then
		return results
	end

	for path in iter do
		results[#results + 1] = path
	end

	return results
end

function read_trimmed_file(path)
	local content = read_file(path)
	if not content then
		return ""
	end

	return content:gsub("%s+$", "")
end

function write_string_file(path, content)
	return write_file(path, content)
end

function update_command(action, ...)
	local cmd = string.format("%s %s", shellquote(CLASHNIVO_INIT), shellquote(action))
	local args = { ... }

	for _, arg in ipairs(args) do
		if arg and arg ~= "" then
			cmd = cmd .. " " .. shellquote(arg)
		end
	end

	local output = sys.exec(cmd .. " 2>/dev/null") or ""
	local parsed = json.parse(output)

	if parsed and type(parsed) == "table" then
		return parsed
	end

	return { accepted = false, error = "Unable to parse service JSON output" }
end

function core_latest_version()
	return read_core_latest_cached()
end

function refresh_core_latest_version()
	return refresh_core_latest_now()
end

function start_core_update()
	return update_command("update_core")
end

function core_update_status()
	return update_command("update_status", "core")
end

function package_latest_version()
	return read_package_latest_cached()
end

function refresh_package_latest_version()
	return refresh_package_latest_now()
end

function start_package_update()
	return update_command("update_package")
end

function package_update_status()
	return update_command("update_status", "package")
end

function start_assets_update(target)
	return update_command("update_assets", target)
end

function assets_update_status(target)
	return update_command("update_status", "assets", target)
end

local function dashboard_dir_name(key)
	return key
end

local function dashboard_installed(key)
	local dir = string.format("%s/%s", DASHBOARD_UI_BASE, dashboard_dir_name(key))
	return fs.access(dir .. "/index.html") or fs.access(dir .. "/dist/index.html") or fs.access(dir)
end

local function current_dashboard_id(cursor)
	local default_dashboard = cursor:get("clashnivo", "config", "default_dashboard") or "metacubexd"
	local dashboard_type = cursor:get("clashnivo", "config", "dashboard_type") or "Official"
	local yacd_type = cursor:get("clashnivo", "config", "yacd_type") or "Official"

	if default_dashboard == "dashboard" then
		return dashboard_type == "Meta" and "dashboard_meta" or "dashboard_official"
	elseif default_dashboard == "yacd" then
		return yacd_type == "Meta" and "yacd_meta" or "yacd_official"
	elseif default_dashboard == "zashboard" then
		return "zashboard"
	end

	return "metacubexd"
end

function dashboard_list()
	local cursor = uci_mod.cursor()
	local selected = current_dashboard_id(cursor)
	local result = {}

	for _, option in ipairs(DASHBOARD_OPTIONS) do
		result[#result + 1] = {
			id = option.id,
			key = option.key,
			name = option.name,
			label = option.label,
			variant = option.variant,
			installed = dashboard_installed(option.key) and true or false,
			selected = option.id == selected,
		}
	end

	return result
end

function dashboard_select(id)
	local cursor = uci_mod.cursor()

	if id == "dashboard_official" then
		cursor:set("clashnivo", "config", "default_dashboard", "dashboard")
		cursor:set("clashnivo", "config", "dashboard_type", "Official")
	elseif id == "dashboard_meta" then
		cursor:set("clashnivo", "config", "default_dashboard", "dashboard")
		cursor:set("clashnivo", "config", "dashboard_type", "Meta")
	elseif id == "yacd_official" then
		cursor:set("clashnivo", "config", "default_dashboard", "yacd")
		cursor:set("clashnivo", "config", "yacd_type", "Official")
	elseif id == "yacd_meta" then
		cursor:set("clashnivo", "config", "default_dashboard", "yacd")
		cursor:set("clashnivo", "config", "yacd_type", "Meta")
	elseif id == "metacubexd" then
		cursor:set("clashnivo", "config", "default_dashboard", "metacubexd")
	elseif id == "zashboard" then
		cursor:set("clashnivo", "config", "default_dashboard", "zashboard")
	else
		error("unknown dashboard id")
	end

	cursor:save("clashnivo")
	cursor:commit("clashnivo")
	return true
end

function dashboard_update(id)
	return update_command("update_dashboard", id)
end

function dashboard_update_status(id)
	return update_command("update_status", "dashboard", id)
end

function preview_config()
	return service_json_command("preview")
end

function validate_config()
	return service_json_command("validate")
end
