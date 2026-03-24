#!/bin/bash
. /lib/functions.sh
. /usr/share/clashnivo/ruby.sh
. /usr/share/clashnivo/clashnivo_ps.sh
. /usr/share/clashnivo/log.sh
. /lib/functions/procd.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh

set_lock() {
   exec 889>"/tmp/lock/clashnivo_subs.lock" 2>/dev/null
   flock -x 889 2>/dev/null
}

del_lock() {
   flock -u 889 2>/dev/null
   rm -rf "/tmp/lock/clashnivo_subs.lock" 2>/dev/null
}

set_lock

LOGTIME=$(echo $(date "+%Y-%m-%d %H:%M:%S"))
: "${LOG_FILE:=/tmp/clashnivo_subscription_refresh.log}"
CRON_FILE="/etc/crontabs/root"
CONFIG_PATH=$(uci_get_config "config_path")
router_self_proxy=$(uci_get_config "router_self_proxy" || echo 1)
FW4=$(command -v fw4)
CLASH="/etc/clashnivo/clash"
CLASH_CONFIG="/etc/clashnivo"
restart=0
only_download=0

inc_job_counter

urlencode() {
   if [ "$#" -eq 1 ]; then
      echo "$(/usr/share/clashnivo/clashnivo_urlencode.lua "$1")"
   fi
}

kill_streaming_unlock() {
   streaming_unlock_pids=$(unify_ps_pids "clashnivo_streaming_unlock.lua")
   for streaming_unlock_pid in $streaming_unlock_pids; do
      kill -9 "$streaming_unlock_pid" >/dev/null 2>&1
   done >/dev/null 2>&1
}

config_test()
{
   if [ -f "$CLASH" ]; then
      LOG_OUT "Source refresh: download completed. Running config validation now."
      test_info=$($CLASH -t -d $CLASH_CONFIG -f "$CFG_FILE")
      local IFS=$'\n'
      for i in $test_info; do
         if [ -n "$(echo "$i" |grep "configuration file")" ]; then
            local info=$(echo "$i" |sed "s# ${CFG_FILE} #【${name}】#g")
            LOG_OUT "$info"
         else
            echo "$i" >> "$LOG_FILE"
         fi
      done
      if [ -n "$(echo "$test_info" |grep "test failed")" ]; then
         return 1
      fi
   else
      return 0
   fi
}

config_download()
{
PREFLIGHT_FAILED=0
DOWNLOAD_URL=""
DOWNLOAD_PARAM="$sub_ua"
if [ -n "$subscribe_url_param" ] && [ -n "$c_address" ]; then
   DOWNLOAD_URL="${c_address}${subscribe_url_param}"
fi
if [ -z "$DOWNLOAD_URL" ]; then
   DOWNLOAD_URL="${subscribe_url}"
fi

LOG_TIP "Source refresh: checking 【$name】 before download."
if ! PROBE_URL_CURL "$DOWNLOAD_URL" "$DOWNLOAD_PARAM"; then
   LOG_ERROR "Source test failed for 【$name】 with the configured user agent: ${PROBE_MESSAGE}"
   LOG_OUT "Source refresh: retrying the preflight for 【$name】 without the configured user agent."
   DOWNLOAD_PARAM=""
   if ! PROBE_URL_CURL "$DOWNLOAD_URL" "$DOWNLOAD_PARAM"; then
      LOG_ERROR "Source test failed for 【$name】: ${PROBE_MESSAGE}"
      PREFLIGHT_FAILED=1
      DOWNLOAD_RESULT=3
      return
   fi
fi

if [ -n "$DOWNLOAD_PARAM" ]; then
   LOG_TIP "Source refresh: downloading 【$name】 with User-Agent 【$DOWNLOAD_PARAM】."
else
   LOG_TIP "Source refresh: downloading 【$name】 without the configured user agent."
fi
LOG_INFO "Config File【$name】Downloading URL【$DOWNLOAD_URL】..."
DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "$CFG_FILE" "$CONFIG_FILE" "$DOWNLOAD_PARAM"
DOWNLOAD_RESULT=$?
}

config_cus_up()
{
	if [ -z "$CONFIG_PATH" ]; then
      for file_name in /etc/clashnivo/config/*
      do
         if [ -f "$file_name" ]; then
            CONFIG_PATH=$file_name
            break
         fi
      done
      uci -q set clashnivo.config.config_path="$CONFIG_PATH"
      uci commit clashnivo
	fi
	if [ -z "$subscribe_url_param" ]; then
	   if [ -n "$key_match_param" ] || [ -n "$key_ex_match_param" ]; then
	      LOG_OUT "Source refresh: filtering nodes for 【$name】."	      
	      ruby -ryaml -rYAML -I "/usr/share/clashnivo" -E UTF-8 -e "
	      begin
            threads = [];
	         Value = YAML.load_file('$CFG_FILE');
	         if Value.has_key?('proxies') and not Value['proxies'].to_a.empty? then
	            Value['proxies'].reverse.each{
	            |x|
                  if not '$key_match_param'.empty? then
                     threads << Thread.new {
                        if not /$key_match_param/i =~ x['name'] then
                           Value['proxies'].delete(x)
                           Value['proxy-groups'].each{
                              |g|
                              g['proxies'].reverse.each{
                                 |p|
                                 if p == x['name'] then
                                    g['proxies'].delete(p)
                                 end;
                              };
                           };
                        end;
                     };
                  end;
                  if not '$key_ex_match_param'.empty? then
                     threads << Thread.new {
                        if /$key_ex_match_param/i =~ x['name'] then
                           if Value['proxies'].include?(x) then
                              Value['proxies'].delete(x)
                              Value['proxy-groups'].each{
                                 |g|
                                 g['proxies'].reverse.each{
                                    |p|
                                    if p == x['name'] then
                                       g['proxies'].delete(p)
                                    end;
                                 };
                              };
                           end;
                        end;
                     };
                  end;
	            };
	         end;
            if Value.key?('proxy-providers') and not Value['proxy-providers'].nil? then
               Value['proxy-providers'].values.each do
                  |i|
                  threads << Thread.new {
                     if not '$key_match_param'.empty? then
                        i['filter'] = '(?i)$key_match_param';
                     end;
                     if not '$key_ex_match_param'.empty? then
                        i['exclude-filter'] = '(?i)$key_ex_match_param';
                     end;
                  };
               end;
            end;
            threads.each(&:join);
	      rescue Exception => e
	         YAML.LOG_ERROR('Filter Proxies Failed,【' + e.message + '】');
	      ensure
	         File.open('$CFG_FILE','w') {|f| YAML.dump(Value, f)};
	      end" 2>/dev/null >> $LOG_FILE
	   fi
   fi
}

config_su_check()
{
   LOG_OUT "Source refresh: validation passed. Checking whether the source changed."
   sed -i 's/!<str> /!!str /g' "$CFG_FILE" >/dev/null 2>&1
   if [ -f "$CONFIG_FILE" ]; then
      if [ "$only_download" -eq 0 ]; then
         config_cus_up
      fi
      cmp -s "$CONFIG_FILE" "$CFG_FILE"
      if [ "$?" -ne 0 ]; then
         LOG_OUT "Source refresh: changes detected for 【$name】. Replacing the stored source."
         mv "$CFG_FILE" "$CONFIG_FILE" 2>/dev/null
         LOG_OUT "Config File【$name】Update Successful!"
      else
         LOG_OUT "Source refresh: 【$name】 is already current."
         rm -rf "$CFG_FILE"
         return
      fi
   else
      LOG_OUT "Source refresh: downloaded first copy of 【$name】. Saving it now."
      if [ "$only_download" -eq 0 ]; then
         config_cus_up
      fi
      mv "$CFG_FILE" "$CONFIG_FILE" 2>/dev/null
      LOG_OUT "Config File【$name】Update Successful!"
   fi
   if [ "$CONFIG_FILE" == "$CONFIG_PATH" ]; then
      restart=1
   fi
}

config_error()
{
   LOG_ERROR "Source refresh failed for 【$name】."
   rm -rf "$CFG_FILE" 2>/dev/null
}

change_dns()
{
   if pidof clash >/dev/null; then
      /etc/init.d/clashnivo reload "restore" >/dev/null 2>&1
      procd_send_signal "clashnivo" "clashnivo-watchdog" CONT
   fi
}

config_download_direct()
{
   if pidof clash >/dev/null && [ "$router_self_proxy" = 1 ]; then
      kill_streaming_unlock
      procd_send_signal "clashnivo" "clashnivo-watchdog" STOP
      /etc/init.d/clashnivo reload "revert" >/dev/null 2>&1
      sleep 3

      config_download

      if [ "$DOWNLOAD_RESULT" -eq 0 ] && [ -s "$CFG_FILE" ]; then
         #prevent ruby unexpected error
         sed -i -E 's/protocol-param: ([^,'"'"'"''}( *#)\n\r]+)/protocol-param: "\1"/g' "$CFG_FILE" 2>/dev/null
         sed -i '/^ \{0,\}enhanced-mode:/d' "$CFG_FILE" >/dev/null 2>&1
         config_test
         if [ $? -ne 0 ]; then
            LOG_ERROR "Source refresh validation failed for 【$name】."
            change_dns
            config_error
            return
         fi
         ruby -ryaml -rYAML -I "/usr/share/clashnivo" -E UTF-8 -e "
         begin
         YAML.load_file('$CFG_FILE');
         rescue Exception => e
         YAML.LOG_ERROR('Unable To Parse Config File,【' + e.message + '】');
         system 'rm -rf ${CFG_FILE} 2>/dev/null'
         end
         " 2>/dev/null >> $LOG_FILE
         if [ $? -ne 0 ]; then
            LOG_ERROR "Ruby failed while processing 【$name】. Check the Ruby runtime dependencies."
            only_download=1
            change_dns
            config_su_check
         elif [ ! -f "$CFG_FILE" ]; then
            LOG_OUT "Source refresh validation failed for 【$name】."
            change_dns
            config_error
         elif ! "$(ruby_read "$CFG_FILE" ".key?('proxies')")" && ! "$(ruby_read "$CFG_FILE" ".key?('proxy-providers')")" ; then
            LOG_ERROR "Source refresh aborted for 【$name】 because the updated config has no proxies or proxy providers."
            change_dns
            config_error
         else
            change_dns
            config_su_check
         fi
      elif [ "$DOWNLOAD_RESULT" -eq 2 ]; then
         change_dns
         LOG_OUT "Source refresh: 【$name】 is already current."
      else
         change_dns
         config_error
      fi
   else
      config_error
   fi
}

server_key_match()
{
	local key_match key_word
	 
   if [ -n "$(echo "$1" |grep "^ \{0,\}$")" ] || [ -n "$(echo "$1" |grep "^\t\{0,\}$")" ]; then
	   return
   fi
	 
   if [ -n "$(echo "$1" |grep "&")" ]; then
      key_word=$(echo "$1" |sed 's/&/ /g')
      for k in $key_word
      do
         if [ -z "$k" ]; then
            continue
         fi
         k="(?=.*$k)"
         key_match="$key_match$k"
      done
      key_match="^($key_match).*"
   else
      if [ -n "$1" ]; then
         key_match="($1)"
      fi
   fi

   if [ "$2" = "keyword" ]; then
      if [ -z "$key_match_param" ]; then
         key_match_param="$key_match"
      else
         key_match_param="$key_match_param|$key_match"
      fi
   elif [ "$2" = "ex_keyword" ]; then
   	  if [ -z "$key_ex_match_param" ]; then
         key_ex_match_param="$key_match"
      else
         key_ex_match_param="$key_ex_match_param|$key_match"
      fi
   fi
}

convert_custom_param()
{
   if ! (echo "$1" | grep -qE "^\w+=.+$") then
      return
   fi
   local p_name="${1%%=*}" p_value="${1#*=}"
   if [ -z "$append_custom_params" ]; then
      append_custom_params="&${p_name}=$(urlencode "$p_value")"
   else
      append_custom_params="${append_custom_params}\`$(urlencode "$p_value")"
   fi
}

sub_info_get()
{
   local section="$1" subscribe_url template_path subscribe_url_param template_path_encode key_match_param key_ex_match_param c_address de_ex_keyword sub_ua append_custom_params
   config_get_bool "enabled" "$section" "enabled" "1"
   config_get "name" "$section" "name" "config"
   config_get "sub_convert" "$section" "sub_convert" ""
   config_get "address" "$section" "address" ""
   config_get "keyword" "$section" "keyword" ""
   config_get "ex_keyword" "$section" "ex_keyword" ""
   config_get "emoji" "$section" "emoji" ""
   config_get "udp" "$section" "udp" ""
   config_get "skip_cert_verify" "$section" "skip_cert_verify" ""
   config_get "sort" "$section" "sort" ""
   config_get "convert_address" "$section" "convert_address" ""
   config_get "template" "$section" "template" ""
   config_get "node_type" "$section" "node_type" ""
   config_get "rule_provider" "$section" "rule_provider" ""
   config_get "custom_template_url" "$section" "custom_template_url" ""
   config_get "de_ex_keyword" "$section" "de_ex_keyword" ""
   config_get "sub_ua" "$section" "sub_ua" "clash.meta"

   CONFIG_FILE="/etc/clashnivo/config/$name.yaml"
   CFG_FILE="/tmp/$name.yaml"

   if [ "$enabled" -eq 0 ]; then
      if [ -n "$2" ]; then
         if [ "$2" != "$CONFIG_FILE" ] && [ "$2" != "$name" ]; then
            return
         fi
      else
         return
      fi
   fi

   if [ -z "$address" ]; then
      return
   fi

   if [ "$udp" == "true" ]; then
      udp="&udp=true"
   else
      udp=""
   fi

   if [ "$rule_provider" == "true" ]; then
      rule_provider="&expand=false&classic=true"
   else
      rule_provider=""
   fi

   if [ -n "$2" ] && [ "$2" != "$CONFIG_FILE" ] && [ "$2" != "$name" ]; then
      return
   fi

   if [ ! -z "$keyword" ] || [ ! -z "$ex_keyword" ]; then
      config_list_foreach "$section" "keyword" server_key_match "keyword"
      config_list_foreach "$section" "ex_keyword" server_key_match "ex_keyword"
   fi

   if [ -n "$de_ex_keyword" ]; then
      for i in $de_ex_keyword;
      do
      	if [ -z "$key_ex_match_param" ]; then
      	   key_ex_match_param="($i)"
      	else
      	   key_ex_match_param="$key_ex_match_param|($i)"
        fi
      done
   fi

   if [ "$sub_convert" -eq 0 ]; then
      subscribe_url=$address
   elif [ "$sub_convert" -eq 1 ] && [ -n "$template" ]; then
      while read line
      do
      	subscribe_url=$([ -n "$subscribe_url" ] && echo "$subscribe_url|")$(urlencode "$line")
      done < <(echo "$address")
      if [ "$template" != "0" ]; then
         template_path=$(grep "^$template," /usr/share/clashnivo/res/sub_ini.list |awk -F ',' '{print $3}' 2>/dev/null)
      else
         template_path=$custom_template_url
      fi
      if [ -n "$template_path" ]; then
         config_list_foreach "$section" "custom_params" convert_custom_param
         template_path_encode=$(urlencode "$template_path")
         [ -n "$key_match_param" ] && key_match_param="$(urlencode "(?i)$key_match_param")"
         [ -n "$key_ex_match_param" ] && key_ex_match_param="$(urlencode "(?i)$key_ex_match_param")"
         subscribe_url_param="?target=clash&new_name=true&url=$subscribe_url&config=$template_path_encode&include=$key_match_param&exclude=$key_ex_match_param&emoji=$emoji&list=false&sort=$sort$udp&scv=$skip_cert_verify&append_type=$node_type&fdn=true$rule_provider$append_custom_params"
         c_address="$convert_address"
      else
         subscribe_url=$address
      fi
   else
      subscribe_url=$address
   fi

   LOG_OUT "Source refresh: starting update for 【$name】."

   config_download
   if [ "$DOWNLOAD_RESULT" -eq 0 ] && [ -s "$CFG_FILE" ]; then
      #prevent ruby unexpected error
      sed -i -E 's/protocol-param: ([^,'"'"'"''}( *#)\n\r]+)/protocol-param: "\1"/g' "$CFG_FILE" 2>/dev/null
      config_test
      if [ $? -ne 0 ]; then
         LOG_ERROR "Source refresh validation failed for 【$name】."
         LOG_ERROR "Subscription download failed for 【$name】. Retrying without the configured user agent."
         config_download_direct
         return
      fi
      ruby -ryaml -rYAML -I "/usr/share/clashnivo" -E UTF-8 -e "
      begin
      YAML.load_file('$CFG_FILE');
      rescue Exception => e
      YAML.LOG_ERROR('Unable To Parse Config File,【' + e.message + '】');
      system 'rm -rf ${CFG_FILE} 2>/dev/null'
      end
      " 2>/dev/null >> $LOG_FILE
      if [ $? -ne 0 ]; then
         LOG_ERROR "Ruby failed while processing 【$name】. Check the Ruby runtime dependencies."
         only_download=1
         config_su_check
      elif [ ! -f "$CFG_FILE" ]; then
         LOG_OUT "Validation failed for 【$name】. Retrying without the configured user agent."
         config_download_direct
      elif ! "$(ruby_read "$CFG_FILE" ".key?('proxies')")" && ! "$(ruby_read "$CFG_FILE" ".key?('proxy-providers')")" ; then
         LOG_ERROR "Updated config for 【$name】 has no proxies or proxy providers. Retrying without the configured user agent."
         config_download_direct
      else
         config_su_check
      fi
   elif [ "$DOWNLOAD_RESULT" -eq 2 ]; then
      LOG_OUT "Source refresh: 【$name】 is already current."
   elif [ "$DOWNLOAD_RESULT" -eq 3 ] && [ "$PREFLIGHT_FAILED" -eq 1 ]; then
      config_error
   else
      LOG_ERROR "Subscription download failed for 【$name】. Retrying without the configured user agent."
      config_download_direct
   fi
}

#分别获取订阅信息进行处理
config_load "clashnivo"
config_foreach sub_info_get "config_subscribe" "$1"
SLOG_CLEAN
dec_job_counter_and_restart "$restart"
del_lock
