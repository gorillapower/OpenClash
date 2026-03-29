#!/bin/sh

clashnivo_service_composition_load_context() {
   RAW_CONFIG_FILE=$(uci_get_config "config_path")
   clashnivo_service_config_assign_paths "$RAW_CONFIG_FILE"
   enable=$(uci_get_config "enable")
   enable_custom_clash_rules=$(uci_get_config "enable_custom_clash_rules")
   da_password=$(uci_get_config "dashboard_password")
   cn_port=$(uci_get_config "cn_port")
   proxy_port=$(uci_get_config "proxy_port")
   tproxy_port=$(uci_get_config "tproxy_port" || echo 7895)
   proxy_mode=$(uci_get_config "proxy_mode")
   ipv6_enable=$(uci_get_config "ipv6_enable")
   ipv6_dns=$(uci_get_config "ipv6_dns" || echo 0)
   ipv6_mode=$(uci_get_config "ipv6_mode" || echo 0)
   enable_v6_udp_proxy=$(uci_get_config "enable_v6_udp_proxy" || echo 0)
   http_port=$(uci_get_config "http_port")
   socks_port=$(uci_get_config "socks_port")
   enable_redirect_dns=$(uci_get_config "enable_redirect_dns" || echo 1)

   if [ "$(uci_get_config "fakeip_range")" = "0" ]; then
      fakeip_range=$(ruby_read "$RAW_CONFIG_FILE" "['dns']['fake-ip-range']")
   else
      fakeip_range=$(uci_get_config "fakeip_range")
   fi
   [ -z "$fakeip_range" ] && fakeip_range="198.18.0.1/16"

   if [ "$(uci_get_config "fakeip_range6")" = "0" ]; then
      fakeip_range6=$(ruby_read "$RAW_CONFIG_FILE" "['dns']['fake-ip-range6']")
   else
      fakeip_range6=$(uci_get_config "fakeip_range6")
   fi
   [ -z "$fakeip_range6" ] && fakeip_range6="fdfe:dcba:9876::1/64"

   lan_interface_name=$(uci_get_config "lan_interface_name" || echo 0)
   if [ "$lan_interface_name" = "0" ]; then
      lan_ip=$(uci -q get network.lan.ipaddr 2>/dev/null | awk -F '/' '{print $1}' 2>/dev/null | tr -d '\n' || ip address show $(uci -q -p /tmp/state get network.lan.ifname || uci -q -p /tmp/state get network.lan.device) | grep -w "inet" 2>/dev/null |grep -Eo 'inet [0-9\.]+' | awk '{print $2}' | head -1 | tr -d '\n' || ip addr show 2>/dev/null | grep -w 'inet' | grep 'global' | grep 'brd' | grep -Eo 'inet [0-9\.]+' | awk '{print $2}' | head -n 1 | tr -d '\n')
   else
      lan_ip=$(ip address show $lan_interface_name 2>/dev/null | grep -w "inet" 2>/dev/null | grep -Eo 'inet [0-9\.]+' | awk '{print $2}' | head -1 | tr -d '\n')
   fi

   wan_ip4s=$(/usr/share/clashnivo/clashnivo_get_network.lua "wanip" 2>/dev/null)
   wan_ip6s=$(ifconfig | grep 'inet6 addr' | awk '{print $3}' 2>/dev/null)
   log_level=$(uci_get_config "log_level")
   intranet_allowed=$(uci_get_config "intranet_allowed")
   enable_udp_proxy=$(uci_get_config "enable_udp_proxy" || echo 1)
   disable_udp_quic=$(uci_get_config "disable_udp_quic")
   operation_mode=$(uci_get_config "operation_mode")
   lan_ac_mode=$(uci_get_config "lan_ac_mode")
   enable_rule_proxy=$(uci_get_config "enable_rule_proxy")
   stack_type=$(uci_get_config "stack_type")
   stack_type_v6=$(uci_get_config "stack_type_v6" || echo "system")
   china_ip_route=$(uci_get_config "china_ip_route"); [ "$china_ip_route" != "0" ] && [ "$china_ip_route" != "1" ] && [ "$china_ip_route" != "2" ] && china_ip_route=0
   china_ip6_route=$(uci_get_config "china_ip6_route"); [ "$china_ip6_route" != "0" ] && [ "$china_ip6_route" != "1" ] && [ "$china_ip6_route" != "2" ] && china_ip6_route=0
   small_flash_memory=$(uci_get_config "small_flash_memory")
   mixed_port=$(uci_get_config "mixed_port")
   interface_name=$(uci_get_config "interface_name" || echo 0)
   common_ports=$(uci_get_config "common_ports")
   dns_port=$(uci_get_config "dns_port")
   store_fakeip=$(uci_get_config "store_fakeip" || echo 0)
   bypass_gateway_compatible=$(uci_get_config "bypass_gateway_compatible" || echo 0)
   core_version=$(uci_get_config "core_version" || echo 0)
   core_type=$(uci_get_config "core_type" || echo "Meta")
   router_self_proxy=$(uci_get_config "router_self_proxy" || echo 1)
   enable_meta_sniffer=$(uci_get_config "enable_meta_sniffer" || echo 0)
   enable_meta_sniffer_custom=$(uci_get_config "enable_meta_sniffer_custom" || echo 0)
   geodata_loader=$(uci_get_config "geodata_loader" || echo 0)
   enable_geoip_dat=$(uci_get_config "enable_geoip_dat" || echo 0)
   enable_tcp_concurrent=$(uci_get_config "enable_tcp_concurrent" || echo 0)
   append_default_dns=$(uci_get_config "append_default_dns" || echo 0)
   enable_meta_sniffer_pure_ip=$(uci_get_config "enable_meta_sniffer_pure_ip" || echo 0)
   find_process_mode=$(uci_get_config "find_process_mode" || echo 0)
   enable_unified_delay=$(uci_get_config "enable_unified_delay" || echo 0)
   enable_respect_rules=$(uci_get_config "enable_respect_rules" || echo 0)
   intranet_allowed_wan_name=$(uci_get_config "intranet_allowed_wan_name" || echo 0)
   custom_fakeip_filter_mode=$(uci_get_config "custom_fakeip_filter_mode" || echo "blacklist")
   iptables_compat=$(iptables -m owner -h 2>/dev/null | grep "owner match options" || command -v fw4 || echo 0)
   disable_quic_go_gso=$(uci_get_config "disable_quic_go_gso" || echo 0)
   smart_enable=$(uci_get_config "smart_enable" || echo 0)
   cors_allow=$(uci_get_config "dashboard_forward_domain" || echo 0)
   geo_custom_url=$(uci_get_config "geo_custom_url" || echo 0)
   geoip_custom_url=$(uci_get_config "geoip_custom_url" || echo 0)
   geosite_custom_url=$(uci_get_config "geosite_custom_url" || echo 0)
   geoasn_custom_url=$(uci_get_config "geoasn_custom_url" || echo 0)
   auto_smart_switch=$(uci_get_config "auto_smart_switch" || echo 0)
   lgbm_auto_update=$(uci_get_config "lgbm_auto_update" || echo 0)
   lgbm_custom_url=$(uci_get_config "lgbm_custom_url" || echo "https://github.com/vernesong/mihomo/releases/download/LightGBM-Model/Model.bin")
   lgbm_update_interval=$(uci_get_config "lgbm_update_interval" || echo 72)
   smart_collect=$(uci_get_config "smart_collect" || echo 0)
   smart_collect_size=$(uci_get_config "smart_collect_size" || echo 100)
   smart_collect_rate=$(uci_get_config "smart_collect_rate" || echo 1)
   smart_policy_priority=$(uci_get_config "smart_policy_priority" || echo 0)
   smart_enable_lgbm=$(uci_get_config "smart_enable_lgbm" || echo 0)
   smart_prefer_asn=$(uci_get_config "smart_prefer_asn" || echo 0)

   [ -z "$dns_port" ] && dns_port=7874

   en_mode=$(uci_get_config "en_mode")
   en_mode_tun=""
   if [ "$en_mode" = "fake-ip-tun" ]; then
      en_mode_tun="1"
      en_mode="fake-ip"
   fi
   if [ "$en_mode" = "redir-host-tun" ]; then
      en_mode_tun="1"
      en_mode="redir-host"
   fi
   if [ "$en_mode" = "redir-host-mix" ]; then
      en_mode_tun="2"
      en_mode="redir-host"
   fi
   if [ "$en_mode" = "fake-ip-mix" ]; then
      en_mode_tun="2"
      en_mode="fake-ip"
   fi
}

clashnivo_service_composition_validation_error() {
   CLASHNIVO_COMPOSITION_LAST_ERROR="${1:-Generated runtime config is invalid}"
   return 1
}

clashnivo_service_composition_prepare_source() {
   config_check
}

clashnivo_service_composition_normalize_source() {
   /usr/share/clashnivo/yml_change.sh \
   "$en_mode" "$da_password" "$cn_port" "$proxy_port" "$TMP_CONFIG_FILE" "$ipv6_enable" "$http_port" "$socks_port" \
   "$log_level" "$proxy_mode" "$en_mode_tun" "$stack_type" "$dns_port" "$mixed_port" "$tproxy_port" "$ipv6_dns" \
   "$store_fakeip" "$enable_meta_sniffer" "$enable_geoip_dat" "$geodata_loader" "$enable_meta_sniffer_custom" \
   "$interface_name" "$enable_tcp_concurrent" "$core_type" "$append_default_dns" "$enable_meta_sniffer_pure_ip" \
   "$find_process_mode" "$fakeip_range" "$ipv6_mode" "$stack_type_v6" "$enable_unified_delay" \
   "$enable_respect_rules" "$custom_fakeip_filter_mode" "$iptables_compat" "$disable_quic_go_gso" "$cors_allow" \
   "$geo_custom_url" "$geoip_custom_url" "$geosite_custom_url" "$geoasn_custom_url" \
   "$lgbm_auto_update" "$lgbm_custom_url" "$lgbm_update_interval" "$smart_collect" "$smart_collect_size" "$fakeip_range6"
}

clashnivo_service_composition_append_custom_proxy_groups() {
   # The inherited yml_groups_set/yml_proxys_set path rewrites proxy-groups in place.
   # Keep this stage explicit in the service contract, but do not route through that
   # destructive implementation until an append-only group composer exists.
   return 0
}

clashnivo_service_composition_prepend_custom_rules() {
   if [ "${enable_custom_clash_rules:-0}" != "1" ] && [ "${enable_rule_proxy:-0}" != "1" ]; then
      return 0
   fi

   /usr/share/clashnivo/yml_rules_change.sh \
   "$enable_custom_clash_rules" "$TMP_CONFIG_FILE" \
   "$enable_rule_proxy" "$router_self_proxy" "$lan_ip" "$enable_redirect_dns" "$en_mode" \
   "$auto_smart_switch" "$smart_collect" "$smart_collect_rate" "$smart_policy_priority" "$smart_enable_lgbm" "$smart_prefer_asn"
}

clashnivo_service_composition_apply_overwrite() {
   if [ -f "/tmp/yaml_overwrite.sh" ]; then
      chmod +x /tmp/yaml_overwrite.sh
      CONFIG_FILE="${TMP_CONFIG_FILE}" /tmp/yaml_overwrite.sh
      rm -rf /tmp/yaml_clashnivo_ruby_parts
   fi

   if [ -f "/etc/clashnivo/custom/clashnivo_custom_overwrite.sh" ]; then
      overwrite_script="/etc/clashnivo/custom/clashnivo_custom_overwrite.sh"
      chmod +x "$overwrite_script"
      "$overwrite_script" "$TMP_CONFIG_FILE"

      if [ -f "/tmp/yaml_clashnivo_ruby_parse" ]; then
         ruby_parse_file="/tmp/yaml_clashnivo_ruby_parse"
      else
         ruby_parse_file=""
      fi

      if [ -n "$ruby_parse_file" ]; then
         sed -n "s/.*yaml_file_path=['\"]\([^'\"]*\)['\"].*/\1/p" "$ruby_parse_file" | sort | uniq | while read -r yaml_file; do
            [ -z "$yaml_file" ] && continue
            ruby_code=$(grep "yaml_file_path=['\"]$yaml_file['\"]" "$ruby_parse_file" | sed "s/^threads << Thread.new do //;s/ end$//")
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
}

clashnivo_service_composition_validate_generated_config() {
   local yaml_file="${1:-${TMP_CONFIG_FILE}}"
   local error_output=""

   [ -n "${yaml_file}" ] || clashnivo_service_composition_validation_error "No generated runtime config was provided."
   [ -f "${yaml_file}" ] || clashnivo_service_composition_validation_error "Generated runtime config does not exist."

   error_output="$(
      ruby -ryaml -rYAML -I "/usr/share/clashnivo" -E UTF-8 -e '
begin
  value = YAML.load_file(ARGV[0]) || {}
  dns = value["dns"].is_a?(Hash) ? value["dns"] : {}
  errors = []

  check_port = lambda do |field|
    raw = value[field]
    if raw.nil? || raw.to_s.strip.empty?
      errors << "#{field} is empty"
      next
    end

    port = raw.to_i
    errors << "#{field} must be greater than 0" if port <= 0
  end

  %w[port socks-port redir-port mixed-port].each(&check_port)

  controller = value["external-controller"].to_s.strip
  if controller.empty?
    errors << "external-controller is empty"
  elsif controller !~ /:(\d+)\z/ || Regexp.last_match(1).to_i <= 0
    errors << "external-controller must include a valid port"
  end

  mode = value["mode"].to_s.strip
  errors << "mode is empty" if mode.empty?

  log_level = value["log-level"].to_s.strip
  errors << "log-level is empty" if log_level.empty?

  dns_listen = dns["listen"].to_s.strip
  if dns_listen.empty?
    errors << "dns.listen is empty"
  elsif dns_listen !~ /:(\d+)\z/ || Regexp.last_match(1).to_i <= 0
    errors << "dns.listen must include a valid port"
  end

  if dns["enhanced-mode"].to_s == "fake-ip"
    fake_ip_range = dns["fake-ip-range"].to_s.strip
    errors << "dns.fake-ip-range is empty" if fake_ip_range.empty?
  end

  if errors.empty?
    exit 0
  end

  warn errors.join("; ")
  exit 1
rescue StandardError => e
  warn e.message
  exit 1
end
' "${yaml_file}" 2>&1 >/dev/null
   )"

   if [ $? -ne 0 ]; then
      [ -n "${DEBUG_LOG_FILE:-}" ] && echo "composition:validate:error_output=${error_output:-Unknown validation error}" >> "${DEBUG_LOG_FILE}"
      clashnivo_service_composition_validation_error "Generated runtime config is invalid: ${error_output:-Unknown validation error}."
      return 1
   fi

   CLASHNIVO_COMPOSITION_LAST_ERROR=""
   return 0
}

clashnivo_service_composition_build_generated_config() {
   clashnivo_service_composition_prepare_source
   clashnivo_service_composition_normalize_source
   clashnivo_service_composition_append_custom_proxy_groups
   clashnivo_service_composition_prepend_custom_rules
   clashnivo_service_composition_apply_overwrite
   clashnivo_service_composition_validate_generated_config
}
