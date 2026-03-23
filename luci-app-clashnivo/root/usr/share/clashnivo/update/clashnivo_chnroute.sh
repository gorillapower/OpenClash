#!/bin/bash
. /usr/share/clashnivo/clashnivo_ps.sh
. /usr/share/clashnivo/log.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh

set_lock() {
   exec 879>"/tmp/lock/clashnivo_chn.lock" 2>/dev/null
   flock -x 879 2>/dev/null
}

del_lock() {
   flock -u 879 2>/dev/null
   rm -rf "/tmp/lock/clashnivo_chn.lock" 2>/dev/null
}

set_lock
inc_job_counter

FW4=$(command -v fw4)
china_ip_route=$(uci_get_config "china_ip_route")
china_ip6_route=$(uci_get_config "china_ip6_route")
CHNR_CUSTOM_URL=$(uci_get_config "chnr_custom_url")
CHNR6_CUSTOM_URL=$(uci_get_config "chnr6_custom_url")
CNDOMAIN_CUSTOM_URL=$(uci_get_config "cndomain_custom_url")
disable_udp_quic=$(uci_get_config "disable_udp_quic")
small_flash_memory=$(uci_get_config "small_flash_memory")
en_mode=$(uci_get_config "en_mode")
restart=0

if [ "$small_flash_memory" != "1" ]; then
   chnr_path="/etc/clashnivo/china_ip_route.ipset"
   chnr6_path="/etc/clashnivo/china_ip6_route.ipset"
   mkdir -p /etc/clashnivo
else
   chnr_path="/tmp/etc/clashnivo/china_ip_route.ipset"
   chnr6_path="/tmp/etc/clashnivo/china_ip6_route.ipset"
   mkdir -p /tmp/etc/clashnivo
fi

LOG_OUT "Downloading Chnroute CIDR list..."
if [ -z "$CHNR_CUSTOM_URL" ]; then
   DOWNLOAD_FILE_CURL "https://ispip.clang.cn/all_cn.txt" "/tmp/china_ip_route.txt" "$chnr_path"
else
   DOWNLOAD_FILE_CURL "$CHNR_CUSTOM_URL" "/tmp/china_ip_route.txt" "$chnr_path"
fi

if [ "$?" -eq 0 ]; then
   LOG_OUT "Chnroute CIDR list downloaded. Checking for changes..."
   #预处理
   if [ -n "$FW4" ]; then
      echo "define china_ip_route = {" >/tmp/china_ip_route.list
      awk '!/^$/&&!/^#/{printf("    %s,'" "'\n",$0)}' /tmp/china_ip_route.txt >>/tmp/china_ip_route.list
      echo "}" >>/tmp/china_ip_route.list
      echo "add set inet fw4 china_ip_route { type ipv4_addr; flags interval; auto-merge; }" >>/tmp/china_ip_route.list
      echo 'add element inet fw4 china_ip_route $china_ip_route' >>/tmp/china_ip_route.list
   else
      echo "create china_ip_route hash:net family inet hashsize 1024 maxelem 1000000" >/tmp/china_ip_route.list
      awk '!/^$/&&!/^#/{printf("add china_ip_route %s'" "'\n",$0)}' /tmp/china_ip_route.txt >>/tmp/china_ip_route.list
   fi
   cmp -s /tmp/china_ip_route.list "$chnr_path"
   if [ "$?" -ne 0 ]; then
      LOG_OUT "Chnroute CIDR list changed. Replacing the current file..."
      mv /tmp/china_ip_route.list "$chnr_path" >/dev/null 2>&1
      if [ "$china_ip_route" -ne 0 ] || [ "$disable_udp_quic" -eq 1 ]; then
         restart=1
      fi
      LOG_OUT "Chnroute CIDR list updated."
   else
      LOG_OUT "Chnroute CIDR list is already current."
   fi
elif [ "$?" -eq 2 ]; then
   LOG_OUT "Chnroute CIDR list is already current."
else
   LOG_OUT "Chnroute CIDR list update failed. Try again later."
fi

#ipv6
LOG_OUT "Downloading Chnroute6 CIDR list..."
if [ -z "$CHNR6_CUSTOM_URL" ]; then
   DOWNLOAD_FILE_CURL "https://ispip.clang.cn/all_cn_ipv6.txt" "/tmp/china_ip6_route.txt" "$chnr6_path"
else
   DOWNLOAD_FILE_CURL "$CHNR6_CUSTOM_URL" "/tmp/china_ip6_route.txt" "$chnr6_path"
fi
DOWNLOAD_RESULT=$?
if [ "$DOWNLOAD_RESULT" -eq 0 ]; then
   LOG_OUT "Chnroute6 CIDR list downloaded. Checking for changes..."
   #预处理
   if [ -n "$FW4" ]; then
      echo "define china_ip6_route = {" >/tmp/china_ip6_route.list
      awk '!/^$/&&!/^#/{printf("    %s,'" "'\n",$0)}' /tmp/china_ip6_route.txt >>/tmp/china_ip6_route.list
      echo "}" >>/tmp/china_ip6_route.list
      echo "add set inet fw4 china_ip6_route { type ipv6_addr; flags interval; auto-merge; }" >>/tmp/china_ip6_route.list
      echo 'add element inet fw4 china_ip6_route $china_ip6_route' >>/tmp/china_ip6_route.list
   else
      echo "create china_ip6_route hash:net family inet6 hashsize 1024 maxelem 1000000" >/tmp/china_ip6_route.list
      awk '!/^$/&&!/^#/{printf("add china_ip6_route %s'" "'\n",$0)}' /tmp/china_ip6_route.txt >>/tmp/china_ip6_route.list
   fi
   cmp -s /tmp/china_ip6_route.list "$chnr6_path"
   if [ "$?" -ne 0 ]; then
      LOG_OUT "Chnroute6 CIDR list changed. Replacing the current file..."
      mv /tmp/china_ip6_route.list "$chnr6_path" >/dev/null 2>&1
      if [ "$china_ip6_route" -ne 0 ] || [ "$disable_udp_quic" -eq 1 ]; then
         restart=1
      fi
      LOG_OUT "Chnroute6 CIDR list updated."
   else
      LOG_OUT "Chnroute6 CIDR list is already current."
   fi
elif [ "$DOWNLOAD_RESULT" -eq 2 ]; then
   LOG_OUT "Chnroute6 CIDR list is already current."
else
   LOG_OUT "Chnroute6 CIDR list update failed. Try again later."
fi

rm -rf /tmp/china_ip*_route* >/dev/null 2>&1

SLOG_CLEAN
dec_job_counter_and_restart "$restart"
del_lock