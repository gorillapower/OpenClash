#!/bin/sh

clashnivo_service_network_apply_runtime() {
   local context="${1:-start}"

   case "$context" in
      start)
         clashnivo_service_dns_apply "$enable_redirect_dns"
         clashnivo_service_firewall_apply
      ;;
      reload|restore)
         clashnivo_service_firewall_apply
      ;;
   esac
}

clashnivo_service_network_cleanup_runtime() {
   clashnivo_service_firewall_cleanup
   clashnivo_service_dns_restore_runtime_state
}

clashnivo_service_network_cleanup_firewall_only() {
   clashnivo_service_firewall_cleanup
}

clashnivo_service_network_restore_dns_runtime() {
   clashnivo_service_dns_restore_runtime_state
}

clashnivo_service_network_cleanup_disabled_runtime() {
   clashnivo_service_dns_cleanup_files
}
