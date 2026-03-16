module("luci.controller.clashnivo", package.seeall)

function index()
	local page = entry(
		{"admin", "services", "clashnivo"},
		template("clashnivo/app"),
		_("Clash Nivo"),
		60
	)
	page.dependent = false
	page.acl_depends = { "luci-app-clashnivo" }
end
