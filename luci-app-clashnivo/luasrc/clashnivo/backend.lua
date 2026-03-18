module("luci.clashnivo.backend", package.seeall)

local io = require "io"
local nixio = require "nixio"
local fs = require "nixio.fs"
local json = require "luci.jsonc"
local sys = require "luci.sys"
local util = require "luci.util"

local CLASHNIVO_INIT = "/etc/init.d/clashnivo"
local SUBSCRIPTION_UPDATE_SCRIPT = "/usr/share/clashnivo/openclash.sh"
local CORE_UPDATE_SCRIPT = "/usr/share/clashnivo/openclash_core.sh"
local CORE_LATEST_RELEASE_API = "https://api.github.com/repos/MetaCubeX/mihomo/releases/latest"

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
		parsed.running = parsed.service_running == true

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

function service_action(action, async)
	local suffix = async and " >/dev/null 2>&1 &" or " >/dev/null 2>&1"
	return sys.call(string.format("%s %s%s", shellquote(CLASHNIVO_INIT), action, suffix))
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
	local cmd = string.format("bash %s", shellquote(SUBSCRIPTION_UPDATE_SCRIPT))
	if name and name ~= "" then
		cmd = cmd .. " " .. shellquote(name)
	end

	return sys.call(cmd .. " >/dev/null 2>&1 &")
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

function fetch_latest_core_version(cache_path)
	local cached = read_trimmed_file(cache_path)
	if cached ~= "" then
		return cached
	end

	local version = sys.exec(
		"curl -sf --max-time 5 " .. shellquote(CORE_LATEST_RELEASE_API) ..
		" | grep '\"tag_name\"' | head -1 | sed 's/.*\"tag_name\": *\"\\([^\"]*\\)\".*/\\1/' | tr -d '\\n'"
	) or ""

	if version ~= "" then
		write_string_file(cache_path, version .. "\n")
	end

	return version
end

function start_core_update(status_file)
	write_string_file(status_file, "downloading\n")

	local status_log = shellquote(status_file .. ".log")
	local quoted_status_file = shellquote(status_file)
	local cmd = string.format(
		"bash %s Meta >%s 2>&1 && echo 'done' > %s || echo 'error' > %s &",
		shellquote(CORE_UPDATE_SCRIPT),
		status_log,
		quoted_status_file,
		quoted_status_file
	)

	return sys.call(cmd)
end

function preview_config()
	return service_json_command("preview")
end

function validate_config()
	return service_json_command("validate")
end
