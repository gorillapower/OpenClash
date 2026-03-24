#!/bin/sh

clashnivo_service_network_apply_runtime() {
   local context="${1:-start}"

   case "$context" in
      start)
         clashnivo_service_dns_apply "$enable_redirect_dns"
         clashnivo_service_runtime_state_mark_dns_applied
         clashnivo_service_firewall_apply
         clashnivo_service_runtime_state_mark_firewall_applied
      ;;
      reload|restore)
         clashnivo_service_firewall_apply
         clashnivo_service_runtime_state_mark_firewall_applied
      ;;
   esac
}

clashnivo_service_network_cleanup_runtime() {
   if clashnivo_service_runtime_state_firewall_applied || clashnivo_service_running || clashnivo_service_core_running || clashnivo_service_watchdog_running; then
      clashnivo_service_firewall_cleanup
   fi
   if clashnivo_service_runtime_state_dns_applied || clashnivo_service_running || clashnivo_service_core_running || clashnivo_service_watchdog_running; then
      clashnivo_service_dns_restore_runtime_state
   fi
   clashnivo_service_runtime_state_clear_network
}

clashnivo_service_network_cleanup_firewall_only() {
   if clashnivo_service_runtime_state_firewall_applied; then
      clashnivo_service_firewall_cleanup
      rm -f "${CLASHNIVO_RUNTIME_FIREWALL_APPLIED_FILE}"
   fi
}

clashnivo_service_network_restore_dns_runtime() {
   if clashnivo_service_runtime_state_dns_applied; then
      clashnivo_service_dns_restore_runtime_state
      rm -f "${CLASHNIVO_RUNTIME_DNS_APPLIED_FILE}"
   fi
}

clashnivo_service_network_cleanup_disabled_runtime() {
   clashnivo_service_dns_cleanup_files
   clashnivo_service_runtime_state_reset
}

clashnivo_service_network_rollback_failed_start() {
   local reason="${1:-start_failed}"

   clashnivo_service_runtime_state_mark_start_failed "${reason}"
   clashnivo_service_network_cleanup_runtime
}
