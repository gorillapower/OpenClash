#!/bin/bash
. /lib/functions.sh
. /usr/share/openclash/log.sh
. /usr/share/openclash/uci.sh

CUSTOM_PROXIES_FILE="/tmp/yaml_custom_proxies.yaml"

# Start with an empty proxies list — will be appended to $SERVER_FILE by caller
> "$CUSTOM_PROXIES_FILE"

config_load "openclash"

# Iterate over all custom_proxy UCI sections and write YAML entries
write_custom_proxy() {
   local section="$1"
   local enabled name proxy_type server port
   local cipher password udp
   local sni skip_cert_verify
   local uuid alter_id vmess_cipher tls
   local flow

   config_get_bool enabled   "$section" "enabled"          "1"
   config_get      name      "$section" "name"             ""
   config_get      proxy_type "$section" "proxy_type"      ""
   config_get      server    "$section" "server"           ""
   config_get      port      "$section" "port"             ""

   # Skip disabled or incomplete entries
   [ "$enabled" = "0" ] && return
   [ -z "$name" ] || [ -z "$proxy_type" ] || [ -z "$server" ] || [ -z "$port" ] && return

   config_get cipher         "$section" "cipher"           "aes-256-gcm"
   config_get password       "$section" "password"         ""
   config_get_bool udp       "$section" "udp"              "0"
   config_get sni            "$section" "sni"              ""
   config_get_bool skip_cert_verify "$section" "skip_cert_verify" "0"
   config_get uuid           "$section" "uuid"             ""
   config_get alter_id       "$section" "alter_id"         "0"
   config_get vmess_cipher   "$section" "vmess_cipher"     "auto"
   config_get_bool tls       "$section" "tls"              "0"
   config_get flow           "$section" "flow"             ""

   case "$proxy_type" in
      ss)
         cat >> "$CUSTOM_PROXIES_FILE" << EOF
  - name: "$name"
    type: ss
    server: $server
    port: $port
    cipher: $cipher
    password: "$password"
    udp: $([ "$udp" = "1" ] && echo "true" || echo "false")
EOF
         ;;
      trojan)
         cat >> "$CUSTOM_PROXIES_FILE" << EOF
  - name: "$name"
    type: trojan
    server: $server
    port: $port
    password: "$password"
$([ -n "$sni" ] && echo "    sni: $sni")
    skip-cert-verify: $([ "$skip_cert_verify" = "1" ] && echo "true" || echo "false")
EOF
         ;;
      vmess)
         cat >> "$CUSTOM_PROXIES_FILE" << EOF
  - name: "$name"
    type: vmess
    server: $server
    port: $port
    uuid: "$uuid"
    alterId: $alter_id
    cipher: $vmess_cipher
    tls: $([ "$tls" = "1" ] && echo "true" || echo "false")
$([ -n "$sni" ] && echo "    servername: $sni")
EOF
         ;;
      vless)
         cat >> "$CUSTOM_PROXIES_FILE" << EOF
  - name: "$name"
    type: vless
    server: $server
    port: $port
    uuid: "$uuid"
    tls: $([ "$tls" = "1" ] && echo "true" || echo "false")
$([ -n "$sni" ] && echo "    servername: $sni")
$([ -n "$flow" ] && echo "    flow: $flow")
EOF
         ;;
   esac
}

config_foreach write_custom_proxy custom_proxy
