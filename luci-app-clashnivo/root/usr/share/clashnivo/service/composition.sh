#!/bin/sh

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
   /usr/share/clashnivo/yml_rules_change.sh \
   "$enable_custom_clash_rules" "$TMP_CONFIG_FILE" \
   "$enable_rule_proxy" "$router_self_proxy" "$lan_ip" "$enable_redirect_dns" "$en_mode" \
   "$auto_smart_switch" "$smart_collect" "$smart_collect_rate" "$smart_policy_priority" "$smart_enable_lgbm" "$smart_prefer_asn"
}

clashnivo_service_composition_apply_overwrite() {
   if [ -f "/tmp/yaml_overwrite.sh" ]; then
      chmod +x /tmp/yaml_overwrite.sh
      CONFIG_FILE="${TMP_CONFIG_FILE}" /tmp/yaml_overwrite.sh
      rm -rf /tmp/yaml_clashnivo_ruby_parts /tmp/yaml_openclash_ruby_parts
   fi

   if [ -f "/etc/clashnivo/custom/clashnivo_custom_overwrite.sh" ] || [ -f "/etc/clashnivo/custom/openclash_custom_overwrite.sh" ]; then
      overwrite_script="/etc/clashnivo/custom/clashnivo_custom_overwrite.sh"
      [ -f "$overwrite_script" ] || overwrite_script="/etc/clashnivo/custom/openclash_custom_overwrite.sh"
      chmod +x "$overwrite_script"
      "$overwrite_script" "$TMP_CONFIG_FILE"

      if [ -f "/tmp/yaml_clashnivo_ruby_parse" ]; then
         ruby_parse_file="/tmp/yaml_clashnivo_ruby_parse"
      elif [ -f "/tmp/yaml_openclash_ruby_parse" ]; then
         ruby_parse_file="/tmp/yaml_openclash_ruby_parse"
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

clashnivo_service_composition_build_generated_config() {
   clashnivo_service_composition_prepare_source
   clashnivo_service_composition_normalize_source
   clashnivo_service_composition_append_custom_proxy_groups
   clashnivo_service_composition_prepend_custom_rules
   clashnivo_service_composition_apply_overwrite
}
