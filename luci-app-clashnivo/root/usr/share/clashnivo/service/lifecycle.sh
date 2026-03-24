#!/bin/sh

clashnivo_service_runtime_active() {
   clashnivo_service_running || clashnivo_service_core_running || clashnivo_service_watchdog_running
}

clashnivo_service_stop_watchdog_instances() {
   procd_kill "${CLASHNIVO_WATCHDOG_SERVICE_NAME}" >/dev/null 2>&1
}

clashnivo_service_stop_core_instances() {
   local process pids pid

   for process in "clashnivo_streaming_unlock.lua"; do
      pids=$(unify_ps_pids "$process")
      if [ -n "$pids" ]; then
         for pid in $pids; do
            kill -9 "$pid" >/dev/null 2>&1
         done
      fi
   done

   pgrep -f "$CLASH -d $CLASH_CONFIG -f " 2>/dev/null | while read -r pid; do
      [ -n "$pid" ] && kill "$pid" >/dev/null 2>&1
   done
   sleep 1
   pgrep -f "$CLASH -d $CLASH_CONFIG -f " 2>/dev/null | while read -r pid; do
      [ -n "$pid" ] && kill -9 "$pid" >/dev/null 2>&1
   done
}

clashnivo_service_failed_start_cleanup() {
   local reason="${1:-start_failed}"

   LOG_WARN "Clash Nivo start failed. Rolling back runtime changes (${reason})."

   clashnivo_service_stop_watchdog_instances
   procd_kill "${CLASHNIVO_SERVICE_NAME}" >/dev/null 2>&1
   clashnivo_service_stop_core_instances
   del_cron
   clashnivo_service_network_rollback_failed_start "${reason}"
   clear_overwrite_set
   rm -rf /tmp/yaml_*
}

clashnivo_service_start_watchdog() {
   clashnivo_service_stop_watchdog_instances
   procd_open_instance "${CLASHNIVO_WATCHDOG_SERVICE_NAME}"
   procd_set_param command "/usr/share/clashnivo/clashnivo_watchdog.sh"
   procd_close_instance
}

clashnivo_service_run_start() {
   enable=$(uci_get_config "enable")
   [ "$enable" != "1" ] && LOG_WARN "Clash Nivo is disabled. Start it from the LuCI page to continue." && SLOG_CLEAN && exit 0

   if clashnivo_service_running; then
      LOG_TIP "Clash Nivo is already running. Exiting."
      exit 0
   fi

   clashnivo_service_require_guard_clear "start" || exit $?

   LOG_TIP "Clash Nivo start requested."
   clashnivo_service_runtime_state_reset

   {
      LOG_OUT "Step 1: Get The Configuration..."
      # Check instead of restart
      check_run_quick
      overwrite_file
      get_config
      config_choose
      do_run_mode

      LOG_OUT "Step 2: Check The Components..."
      do_run_file "$RAW_CONFIG_FILE"

      if ! $QUICK_START; then
         LOG_OUT "Step 3: Modify The Config File..."
         clashnivo_service_composition_build_generated_config
      else
         LOG_OUT "Step 3: Quick Start Mode, Skip Modify The Config File..."
      fi

      LOG_OUT "Step 4: Start Running The Clash Core..."
      start_run_core

      LOG_OUT "Step 5: Add Cron Rules, Start Daemons..."
      add_cron

      LOG_OUT "Step 6: Core Status Checking and Firewall Rules Setting..."
      check_core_status "start"

      clashnivo_service_network_ensure_loaded
      if [ "$ipv6_enable" -eq 0 ] && [ "${CLASHNIVO_NETWORK_LAN_DHCPV6}" != "disabled" ] && [ -n "${CLASHNIVO_NETWORK_LAN_DHCPV6}" ]; then
         LOG_WARN "Please Note That Network May Abnormal With IPv6's DHCP Server"
      fi

      clashnivo_service_runtime_state_clear_start_failed
      rm -rf /tmp/yaml_*
   }
}

clashnivo_service_run_stop() {
   enable=$(uci_get_config "enable")

   LOG_TIP "Clash Nivo stopping..."
   LOG_OUT "Step 1: Backup The Current Groups State..."

   {
      /usr/share/clashnivo/clashnivo_history_get.sh

      LOG_OUT "Step 2: Delete Clash Nivo firewall rules..."
      clashnivo_service_network_cleanup_runtime

      LOG_OUT "Step 3: Stop Clash Nivo services..."
      clashnivo_service_stop_core_instances
      # prevent respawn during stopping
      procd_kill "${CLASHNIVO_SERVICE_NAME}"
      clashnivo_service_stop_watchdog_instances

      LOG_OUT "Step 4: Restart Dnsmasq..."
      clashnivo_service_network_restore_dns_runtime

      LOG_OUT "Step 5: Delete Clash Nivo runtime residue..."
      LOG_TIP "Clash Nivo already stopped!"
      clashnivo_service_runtime_state_reset

      if [ "$enable" != "1" ]; then
         clashnivo_service_clear_disabled_runtime_state
         clashnivo_service_network_cleanup_disabled_runtime
         SLOG_CLEAN
      fi

      del_cron
      clear_overwrite_set
      rm -rf /tmp/yaml_*
   } >/dev/null 2>&1

   echo "Clash Nivo already stopped!"
}

clashnivo_service_run_restart() {
   echo "Clash Nivo restart requested."
   LOG_TIP "Clash Nivo restart requested."
   check_run_quick
   clashnivo_service_run_stop
   clashnivo_service_run_start
}

clashnivo_service_run_serialized() {
   local context="${1:-unknown}"
   shift

   clashnivo_service_command_lock_acquire "${context}" || {
      clashnivo_service_emit_busy_json "${context}"
      return 3
   }

   trap 'clashnivo_service_command_lock_release' EXIT INT TERM
   "$@"
   local rc=$?
   trap - EXIT INT TERM
   clashnivo_service_command_lock_release
   return $rc
}

clashnivo_service_run_reload() {
   enable=$(uci_get_config "enable")
   MAX_RELOAD=10
   case "$1" in
      firewall|manual|restore)
         clashnivo_service_require_guard_clear "reload:$1" || exit $?
      ;;
   esac
   if pidof clash >/dev/null && [ "$enable" == "1" ] && [ "$1" == "firewall" ]; then
      #sleep for avoiding system unready
      sleep 5
      NOW_TS=$(date +%s)
      LAST_LINE=$(grep "Reload Clash Nivo firewall rules...$" "$LOG_FILE" | tail -n 1)
      LAST_TIME=$(echo "$LAST_LINE" | awk '{print $1" "$2}')
      LAST_TS=$(date -d "$LAST_TIME" +%s 2>/dev/null)
      CUR_RELOAD_NUM=$(echo "$LAST_LINE" | grep -oE '【[0-9]+/' | grep -oE '[0-9]+')
      if [ -n "$LAST_TS" ] && [ $((NOW_TS - LAST_TS)) -gt 300 ]; then
         CUR_RELOAD_NUM=0
      fi
      [ -z "$CUR_RELOAD_NUM" ] && CUR_RELOAD_NUM=0
      CUR_RELOAD_NUM=$((CUR_RELOAD_NUM+1))
      [ "$CUR_RELOAD_NUM" -gt "$MAX_RELOAD" ] && CUR_RELOAD_NUM=$MAX_RELOAD
      RELOAD_COUNT=$(grep "Reload Clash Nivo firewall rules...$" "$LOG_FILE" | awk '{print $1" "$2}' | while read t; do
         TS=$(date -d "$t" +%s 2>/dev/null)
         [ -n "$TS" ] && [ $((NOW_TS - TS)) -le 300 ] && echo 1
      done | wc -l)
      if [ "$RELOAD_COUNT" -ge "$MAX_RELOAD" ]; then
         LOG_OUT "【${CUR_RELOAD_NUM}/$MAX_RELOAD】Skip reloading Clash Nivo firewall rules until 5 minutes later..."
         exit 0
      fi
      LOG_OUT "【${CUR_RELOAD_NUM}/$MAX_RELOAD】Reload Clash Nivo firewall rules..."
      clashnivo_service_network_cleanup_firewall_only
      do_run_mode
      get_config
      check_core_status
   fi
   if pidof clash >/dev/null && [ "$enable" == "1" ] && [ "$1" == "manual" ]; then
      LOG_OUT "Manually Reload Firewall Rules..."
      clashnivo_service_network_cleanup_firewall_only
      do_run_mode
      get_config
      check_core_status
   fi
   if pidof clash >/dev/null && [ "$enable" == "1" ] && [ "$1" == "revert" ]; then
      clashnivo_service_network_cleanup_runtime
      SLOG_CLEAN
   fi
   if pidof clash >/dev/null && [ "$enable" == "1" ] && [ "$1" == "restore" ]; then
      do_run_mode
      get_config
      # used for config subscribe, not background for avoiding system unready
      check_core_status
   fi
} >/dev/null 2>&1

clashnivo_service_run_boot() {
	delay_start=$(uci_get_config "delay_start" || echo 0)
	enable=$(uci_get_config "enable")
	if [ "$delay_start" -gt 0 ] && [ "$enable" == "1" ]; then
		LOG_OUT "Delay start enabled. Clash Nivo will start after【$delay_start】seconds."
		sleep "$delay_start"
	fi
	clashnivo_service_run_restart
}

start_service()
{
   clashnivo_service_run_serialized "start" clashnivo_service_run_start
}

stop_service()
{
   clashnivo_service_run_serialized "stop" clashnivo_service_run_stop
}

restart()
{
   clashnivo_service_run_serialized "restart" clashnivo_service_run_restart
}

start_watchdog()
{
   clashnivo_service_start_watchdog
}

reload_service()
{
   clashnivo_service_run_serialized "reload:${1:-manual}" clashnivo_service_run_reload "$@"
}

boot()
{
   clashnivo_service_run_boot
}
