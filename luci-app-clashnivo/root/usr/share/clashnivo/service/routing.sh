#!/bin/sh

clashnivo_service_routing_init() {
   CLASHNIVO_ROUTING_FWMARK="0x162"
   CLASHNIVO_ROUTING_TABLE="0x162"
   CLASHNIVO_ROUTING_PREF="1888"
   CLASHNIVO_ROUTING_TUN_DEVICE="utun"
}

clashnivo_service_routing_apply_local_ipv4() {
   ip rule add fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE"
   ip route add local 0.0.0.0/0 dev lo table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_apply_local_ipv6() {
   ip -6 rule add fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE"
   ip -6 route add local ::/0 dev lo table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_cleanup_local_ipv4() {
   ip rule del fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE"
   ip route del local 0.0.0.0/0 dev lo table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_cleanup_local_ipv6() {
   ip -6 rule del fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE"
   ip -6 route del local ::/0 dev lo table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_apply_tun_ipv4() {
   ip route add default dev "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$CLASHNIVO_ROUTING_TABLE"
   ip rule add fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE" pref "$CLASHNIVO_ROUTING_PREF"
}

clashnivo_service_routing_apply_tun_ipv6() {
   ip -6 route add default dev "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$CLASHNIVO_ROUTING_TABLE"
   ip -6 rule add fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE" pref "$CLASHNIVO_ROUTING_PREF"
}

clashnivo_service_routing_cleanup_tun_ipv4() {
   ip rule del fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE"
   ip route del default dev "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_cleanup_tun_ipv6() {
   ip -6 rule del fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE"
   ip -6 route del default dev "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_cleanup_tun_core_table_ipv6() {
   local table="${1:-2022}"

   ip -6 rule del oif "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$table"
   ip -6 route del default dev "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$table"
}

clashnivo_service_routing_tun_route_present() {
   local ip_cmd="${1:-ip}"

   $ip_cmd route list 2>/dev/null | grep -q "$CLASHNIVO_ROUTING_TUN_DEVICE"
}
