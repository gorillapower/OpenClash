#!/usr/bin/lua

local util = require "luci.util"
local cidr = require "luci.ip"

local query_type = arg[1]
if not query_type then
   os.exit(0)
end

local function list_interfaces()
   local interfaces = {}

   for _, object in ipairs(util.ubus() or {}) do
      local net = object:match("^network%.interface%.(.+)")
      if net then
         local status = util.ubus(object, "status", {})
         if status then
            interfaces[#interfaces + 1] = {
               name = net,
               status = status,
            }
         end
      end
   end

   return interfaces
end

local function route_matches(status, target)
   for _, route in ipairs(status.route or {}) do
      if not route.table and route.target == target and tostring(route.mask) == "0" then
         return route
      end
   end
end

local function first_ipv4(status)
   local ipv4 = status["ipv4-address"] or {}
   if ipv4[1] and ipv4[1].address then
      return ipv4[1].address, ipv4[1].mask
   end
end

local function first_ipv6(status)
   local ipv6 = status["ipv6-address"] or {}
   if ipv6[1] and ipv6[1].address then
      return ipv6[1].address, ipv6[1].mask
   end
end

local function split_dns(status)
   local dns4 = {}
   local dns6 = {}

   for _, dns in ipairs(status["dns-server"] or {}) do
      if dns:find(":", 1, true) then
         dns6[#dns6 + 1] = dns
      else
         dns4[#dns4 + 1] = dns
      end
   end

   for _, dns in ipairs(status["dns6-server"] or {}) do
      dns6[#dns6 + 1] = dns
   end

   return dns4, dns6
end

local function collect_networks()
   local wan = {}
   local wan6 = {}

   for _, iface in ipairs(list_interfaces()) do
      local status = iface.status
      local ifname = status.l3_device or status.device or ""
      local dns4, dns6 = split_dns(status)
      local ipv4, mask4 = first_ipv4(status)
      local ipv6, mask6 = first_ipv6(status)
      local route4 = route_matches(status, "0.0.0.0")
      local route6 = route_matches(status, "::")

      if route4 then
         wan[#wan + 1] = {
            ipaddr = ipv4,
            netmask = mask4,
            gwaddr = route4.nexthop or route4.gateway,
            dns = dns4,
            expires = status.expires,
            uptime = status.uptime,
            proto = status.proto,
            ifname = ifname,
         }
      end

      if route6 then
         local ip6addr
         if ipv6 and mask6 then
            ip6addr = string.format("%s/%s", ipv6, mask6)
         end

         wan6[#wan6 + 1] = {
            ip6addr = ip6addr,
            gw6addr = route6.nexthop or route6.gateway,
            dns = dns6,
            uptime = status.uptime,
            proto = status.proto,
            ifname = ifname,
         }
      end
   end

   return wan, wan6
end

local function print_values(values, predicate)
   for _, value in ipairs(values or {}) do
      if value and (not predicate or predicate(value)) then
         print(value)
      end
   end
end

local wan, wan6 = collect_networks()

if query_type == "dns" then
   for _, entry in ipairs(wan) do
      print_values(entry.dns, function(value)
         return value ~= entry.gwaddr and value ~= entry.ipaddr
      end)
   end
end

if query_type == "dns6" then
   for _, entry in ipairs(wan6) do
      print_values(entry.dns, function(value)
         return value ~= entry.gw6addr and entry.ip6addr
      end)
   end
end

if query_type == "gateway" then
   for _, entry in ipairs(wan) do
      if entry.gwaddr then
         print(entry.gwaddr)
      end
   end
end

if query_type == "gateway6" then
   for _, entry in ipairs(wan6) do
      if entry.gw6addr then
         print(entry.gw6addr)
      end
   end
end

if query_type == "dhcp" then
   for _, entry in ipairs(wan) do
      if entry.proto == "dhcp" and entry.ifname ~= "" then
         print(entry.ifname)
      end
   end
   for _, entry in ipairs(wan6) do
      if entry.proto == "dhcpv6" and entry.ifname ~= "" then
         print(entry.ifname)
      end
   end
end

if query_type == "pppoe" then
   for _, entry in ipairs(wan) do
      if entry.proto == "pppoe" and entry.ifname ~= "" then
         print(entry.ifname)
      end
   end
   for _, entry in ipairs(wan6) do
      if entry.proto == "pppoe" and entry.ifname ~= "" then
         print(entry.ifname)
      end
   end
end

if query_type == "wanip" then
   for _, entry in ipairs(wan) do
      if entry.proto == "pppoe" and entry.ipaddr then
         print(entry.ipaddr)
      end
   end
end

if query_type == "wanip6" then
   for _, entry in ipairs(wan6) do
      if (entry.proto == "pppoe" or entry.proto == "dhcpv6") and entry.ip6addr then
         print(entry.ip6addr)
      end
   end
end

if query_type == "lan_cidr" then
   for _, entry in ipairs(wan) do
      if entry.proto ~= "pppoe" and entry.ipaddr and entry.netmask then
         local ip = cidr.IPv4(entry.ipaddr, tonumber(entry.netmask) or entry.netmask)
         print(ip:network():string() .. "/" .. ip:prefix())
      end
   end
end

if query_type == "lan_cidr6" then
   for _, entry in ipairs(wan6) do
      if entry.proto ~= "pppoe" and entry.ip6addr then
         local ip6, prefix = entry.ip6addr:match("([^/]+)/(%d+)")
         if ip6 and prefix then
            local ip = cidr.IPv6(ip6, tonumber(prefix))
            print(ip:network():string() .. "/" .. ip:prefix())
         end
      end
   end
end

os.exit(0)
