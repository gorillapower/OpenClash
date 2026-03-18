#!/bin/sh

start_service()
{
   enable=$(uci_get_config "enable")
   [ "$enable" != "1" ] && LOG_WARN "OpenClash Now Disabled, Need Start From Luci Page, Exit..." && SLOG_CLEAN && exit 0

   if /etc/init.d/clashnivo status >/dev/null 2>&1; then
      LOG_TIP "OpenClash Already Running, Exit..."
      exit 0
   fi

   clashnivo_service_require_guard_clear "start" || exit $?

   LOG_TIP "OpenClash Start Running..."

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
         config_check
         /usr/share/clashnivo/yml_change.sh \
         "$en_mode" "$da_password" "$cn_port" "$proxy_port" "$TMP_CONFIG_FILE" "$ipv6_enable" "$http_port" "$socks_port"\
         "$log_level" "$proxy_mode" "$en_mode_tun" "$stack_type" "$dns_port" "$mixed_port" "$tproxy_port" "$ipv6_dns"\
         "$store_fakeip" "$enable_meta_sniffer" "$enable_geoip_dat" "$geodata_loader" "$enable_meta_sniffer_custom"\
         "$interface_name" "$enable_tcp_concurrent" "$core_type" "$append_default_dns" "$enable_meta_sniffer_pure_ip"\
         "$find_process_mode" "$fakeip_range" "$ipv6_mode" "$stack_type_v6" "$enable_unified_delay"\
         "$enable_respect_rules" "$custom_fakeip_filter_mode" "$iptables_compat" "$disable_quic_go_gso" "$cors_allow"\
         "$geo_custom_url" "$geoip_custom_url" "$geosite_custom_url" "$geoasn_custom_url"\
         "$lgbm_auto_update" "$lgbm_custom_url" "$lgbm_update_interval" "$smart_collect" "$smart_collect_size" "$fakeip_range6"

         /usr/share/clashnivo/yml_rules_change.sh \
         "$enable_custom_clash_rules" "$TMP_CONFIG_FILE"\
         "$enable_rule_proxy" "$router_self_proxy" "$lan_ip" "$enable_redirect_dns" "$en_mode"\
         "$auto_smart_switch" "$smart_collect" "$smart_collect_rate" "$smart_policy_priority" "$smart_enable_lgbm" "$smart_prefer_asn"

         #Custom overwrite
         if [ -f "/tmp/yaml_overwrite.sh" ]; then
            chmod +x /tmp/yaml_overwrite.sh
            CONFIG_FILE="${TMP_CONFIG_FILE}" /tmp/yaml_overwrite.sh
            rm -rf /tmp/yaml_openclash_ruby_parts
         fi

         if [ -f "/etc/clashnivo/custom/openclash_custom_overwrite.sh" ]; then
            chmod +x /etc/clashnivo/custom/openclash_custom_overwrite.sh
            /etc/clashnivo/custom/openclash_custom_overwrite.sh "$TMP_CONFIG_FILE"
            if [ -f "/tmp/yaml_openclash_ruby_parse" ]; then
               sed -n "s/.*yaml_file_path=['\"]\([^'\"]*\)['\"].*/\1/p" /tmp/yaml_openclash_ruby_parse | sort | uniq | while read -r yaml_file; do
                  [ -z "$yaml_file" ] && continue
                  ruby_code=$(grep "yaml_file_path=['\"]$yaml_file['\"]" /tmp/yaml_openclash_ruby_parse | sed "s/^threads << Thread.new do //;s/ end$//")
                  [ -z "$ruby_code" ] && continue
                  if [ -f "$yaml_file" ]; then
                     (
                        ruby -ryaml -rYAML -I "/usr/share/clashnivo" -E UTF-8 -e "
                        Value = YAML.load_file('$yaml_file');
                        threads = []
                        $ruby_code
                        threads.each(&:join)
                        File.open('$yaml_file', 'w') do |f|
                           YAML.dump(Value, f)
                        end
                        " >> $LOG_FILE 2>&1
                     )
                  fi
               done
            fi
         fi
      else
         LOG_OUT "Step 3: Quick Start Mode, Skip Modify The Config File..."
      fi

      LOG_OUT "Step 4: Start Running The Clash Core..."
      start_run_core

      LOG_OUT "Step 5: Add Cron Rules, Start Daemons..."
      add_cron

      LOG_OUT "Step 6: Core Status Checking and Firewall Rules Setting..."
      check_core_status "start" &

      if [ "$ipv6_enable" -eq 0 ] && [ "$(uci -q get dhcp.lan.dhcpv6)" != "disabled" ] && [ -n "$(uci -q get dhcp.lan.dhcpv6)" ]; then
         LOG_WARN "Please Note That Network May Abnormal With IPv6's DHCP Server"
      fi

      rm -rf /tmp/yaml_*
   }

   echo "OpenClash Already Start!"
}

stop_service()
{
   enable=$(uci_get_config "enable")

   LOG_TIP "OpenClash Stoping..."
   LOG_OUT "Step 1: Backup The Current Groups State..."

   {
      /usr/share/clashnivo/openclash_history_get.sh

      LOG_OUT "Step 2: Delete OpenClash Firewall Rules..."
      revert_firewall

      LOG_OUT "Step 3: Close The OpenClash Services..."
      for process in "openclash_streaming_unlock.lua"; do
         pids=$(unify_ps_pids "$process")
         if [ -n "$pids" ]; then
            for pid in $pids; do
               kill -9 "$pid"
            done
         fi
      done
      # prevent respawn during stopping
      procd_kill "clashnivo"

      LOG_OUT "Step 4: Restart Dnsmasq..."
      revert_dnsmasq

      LOG_OUT "Step 5: Delete OpenClash Residue File..."
      LOG_TIP "OpenClash Already Stop!"

      if [ "$enable" != "1" ]; then
         clashnivo_service_clear_disabled_runtime_state
         rm -rf ${DNSMASQ_CONF_DIR}/dnsmasq_clashnivo_chnroute_pass.conf \
                ${DNSMASQ_CONF_DIR}/dnsmasq_clashnivo_chnroute6_pass.conf \
                ${DNSMASQ_CONF_DIR}/dnsmasq_clashnivo_custom_domain.conf
         SLOG_CLEAN
      fi

      del_cron
      clear_overwrite_set
      rm -rf /tmp/yaml_*
   } >/dev/null 2>&1

   echo "OpenClash Already Stop!"
}

restart()
{
   echo "OpenClash Restart..."
   LOG_TIP "OpenClash Restart..."
   check_run_quick
   stop
   start
}

start_watchdog()
{
   procd_open_instance "openclash-watchdog"
	procd_set_param command "/usr/share/clashnivo/openclash_watchdog.sh"
	procd_close_instance
}

reload_service()
{
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
      LAST_LINE=$(grep "Reload OpenClash Firewall Rules...$" "$LOG_FILE" | tail -n 1)
      LAST_TIME=$(echo "$LAST_LINE" | awk '{print $1" "$2}')
      LAST_TS=$(date -d "$LAST_TIME" +%s 2>/dev/null)
      CUR_RELOAD_NUM=$(echo "$LAST_LINE" | grep -oE '【[0-9]+/' | grep -oE '[0-9]+')
      if [ -n "$LAST_TS" ] && [ $((NOW_TS - LAST_TS)) -gt 300 ]; then
         CUR_RELOAD_NUM=0
      fi
      [ -z "$CUR_RELOAD_NUM" ] && CUR_RELOAD_NUM=0
      CUR_RELOAD_NUM=$((CUR_RELOAD_NUM+1))
      [ "$CUR_RELOAD_NUM" -gt "$MAX_RELOAD" ] && CUR_RELOAD_NUM=$MAX_RELOAD
      RELOAD_COUNT=$(grep "Reload OpenClash Firewall Rules...$" "$LOG_FILE" | awk '{print $1" "$2}' | while read t; do
         TS=$(date -d "$t" +%s 2>/dev/null)
         [ -n "$TS" ] && [ $((NOW_TS - TS)) -le 300 ] && echo 1
      done | wc -l)
      if [ "$RELOAD_COUNT" -ge "$MAX_RELOAD" ]; then
         LOG_OUT "【${CUR_RELOAD_NUM}/$MAX_RELOAD】Skip Reload OpenClash Firewall Rules Until 5 Minutes Later..."
         exit 0
      fi
      LOG_OUT "【${CUR_RELOAD_NUM}/$MAX_RELOAD】Reload OpenClash Firewall Rules..."
      revert_firewall
      do_run_mode
      get_config
      check_core_status &
   fi
   if pidof clash >/dev/null && [ "$enable" == "1" ] && [ "$1" == "manual" ]; then
      LOG_OUT "Manually Reload Firewall Rules..."
      revert_firewall
      do_run_mode
      get_config
      check_core_status &
   fi
   if pidof clash >/dev/null && [ "$enable" == "1" ] && [ "$1" == "revert" ]; then
      revert_firewall
      revert_dnsmasq
      SLOG_CLEAN
   fi
   if pidof clash >/dev/null && [ "$enable" == "1" ] && [ "$1" == "restore" ]; then
      do_run_mode
      get_config
      # used for config subscribe, not background for avoiding system unready
      check_core_status
   fi
} >/dev/null 2>&1

boot()
{
	delay_start=$(uci_get_config "delay_start" || echo 0)
	enable=$(uci_get_config "enable")
	if [ "$delay_start" -gt 0 ] && [ "$enable" == "1" ]; then
		LOG_OUT "Enable Delay Start, OpenClash Will Start After【$delay_start】Seconds..."
		sleep "$delay_start"
	fi
	restart
}
