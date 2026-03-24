#!/bin/bash
. /usr/share/clashnivo/clashnivo_ps.sh
. /lib/functions.sh
. /usr/share/clashnivo/ruby.sh
. /usr/share/clashnivo/log.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh
. /usr/share/clashnivo/core_source.sh

set_lock() {
   exec 877>"/tmp/lock/clashnivo_rule.lock" 2>/dev/null
   flock -x 877 2>/dev/null
}

del_lock() {
   flock -u 877 2>/dev/null
   rm -rf "/tmp/lock/clashnivo_rule.lock" 2>/dev/null
}

set_lock
inc_job_counter

yml_other_rules_dl()
{
   local section="$1"
   local enabled config
   config_get_bool "enabled" "$section" "enabled" "1"
   config_get "config" "$section" "config" ""

   if [ "$enabled" = "0" ] || [ "$config" != "$2" ]; then
      return
   fi

   if [ -n "$rule_name" ]; then
      LOG_OUT "Rule refresh skipped because multiple third-party rule configurations are enabled."
      return
   fi

   config_get "rule_name" "$section" "rule_name" ""

   LOG_OUT "Rule refresh: downloading the active third-party rule set."
   if [ "$rule_name" = "lhie1" ]; then
      DOWNLOAD_URL="$(clashnivo_download_source_url "https://raw.githubusercontent.com/dler-io/Rules/master/Clash/Rule.yaml")" || {
         LOG_OUT "Rule refresh failed because no healthy download source is available."
         SLOG_CLEAN
         del_lock
         exit 0
      }
   fi
   DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "/tmp/rules.yaml"
   if [ "$?" -eq 0 ] && [ -s "/tmp/rules.yaml" ]; then
      LOG_OUT "Rule refresh: download completed. Preprocessing the rule file."
      sed -i '1i rules:' /tmp/rules.yaml
      ruby -ryaml -rYAML -I "/usr/share/clashnivo" -E UTF-8 -e "
      begin
      YAML.load_file('/tmp/rules.yaml');
      rescue Exception => e
         YAML.LOG('Error: Unable To Parse Updated Rules File,【${rule_name}:' + e.message + '】');
         system 'rm -rf /tmp/rules.yaml 2>/dev/null';
      end
      " 2>/dev/null >> $LOG_FILE
      if [ $? -ne 0 ]; then
         LOG_OUT "Rule refresh failed because Ruby could not process the downloaded rule file."
         rm -rf /tmp/rules.yaml >/dev/null 2>&1
         SLOG_CLEAN
         del_lock
         exit 0
      elif [ ! -f "/tmp/rules.yaml" ]; then
         LOG_OUT "Rule refresh validation failed for 【$rule_name】."
         rm -rf /tmp/rules.yaml >/dev/null 2>&1
         SLOG_CLEAN
         del_lock
         exit 0
      elif ! "$(ruby_read "/tmp/rules.yaml" ".key?('rules')")" ; then
         LOG_OUT "Rule refresh aborted for 【$rule_name】 because the downloaded file has no rules section."
         rm -rf /tmp/rules.yaml >/dev/null 2>&1
         SLOG_CLEAN
         del_lock
         exit 0
      #校验是否含有新策略组
      elif ! "$(ruby -ryaml -rYAML -I "/usr/share/clashnivo" -E UTF-8 -e "
         Value = YAML.load_file('/usr/share/clashnivo/res/${rule_name}.yaml');
         Value_1 = YAML.load_file('/tmp/rules.yaml');
         OLD_GROUP = Value['rules'].collect{|x| x.split(',')[2] or x.split(',')[1]}.map(&:strip).reject{|g| ['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS'].include?(g)}.uniq.sort;
         NEW_GROUP = Value_1['rules'].collect{|x| x.split(',')[2] or x.split(',')[1]}.map(&:strip).reject{|g| ['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS'].include?(g)}.uniq.sort;
         if OLD_GROUP.eql?(NEW_GROUP) then
            puts true
         else
            puts false
         end
         ")" && [ -f "/usr/share/clashnivo/res/${rule_name}.yaml" ]; then
         LOG_OUT "Rule refresh aborted for 【$rule_name】 because the downloaded rule set requires different proxy groups."
         rm -rf /tmp/rules.yaml >/dev/null 2>&1
         SLOG_CLEAN
         del_lock
         exit 0
      fi

      #取出规则部分
      ruby_read "/tmp/rules.yaml" ".select {|x| 'rule-providers' == x or 'rules' == x }.to_yaml" > "$OTHER_RULE_FILE"
      #合并
      cat "$OTHER_RULE_FILE" > "/tmp/rules.yaml" 2>/dev/null
      rm -rf /tmp/other_rule* 2>/dev/null

      LOG_OUT "Rule refresh: checking whether the downloaded rule file changed."
      cmp -s /usr/share/clashnivo/res/"$rule_name".yaml /tmp/rules.yaml
      if [ "$?" -ne "0" ]; then
         LOG_OUT "Rule refresh: changes detected for 【$rule_name】. Replacing the stored rule file."
         mv /tmp/rules.yaml /usr/share/clashnivo/res/"$rule_name".yaml >/dev/null 2>&1
         LOG_OUT "Rule refresh: 【$rule_name】 updated."
         restart=1
      else
         LOG_OUT "Rule refresh: 【$rule_name】 is already current."
      fi
   else
      LOG_OUT "Rule refresh failed for 【$rule_name】."
   fi
}

LOG_FILE="/tmp/clashnivo.log"
RUlE_SOURCE=$(uci_get_config "rule_source")
restart=0

if [ "$RUlE_SOURCE" = "0" ]; then
   LOG_OUT "Rule refresh skipped because external rule updates are disabled."
else
   OTHER_RULE_FILE="/tmp/other_rule.yaml"
   CONFIG_FILE=$(uci_get_config "config_path")
   CONFIG_NAME=$(echo "$CONFIG_FILE" |awk -F '/' '{print $5}' 2>/dev/null)

   if [ -z "$CONFIG_FILE" ]; then
      for file_name in /etc/clashnivo/config/*
      do
         if [ -f "$file_name" ]; then
            CONFIG_FILE=$file_name
            CONFIG_NAME=$(echo "$CONFIG_FILE" |awk -F '/' '{print $5}' 2>/dev/null)
            break
         fi
      done
   fi

   if [ -z "$CONFIG_NAME" ]; then
      CONFIG_FILE="/etc/clashnivo/config/config.yaml"
      CONFIG_NAME="config.yaml"
   fi

   config_load "clashnivo"
   config_foreach yml_other_rules_dl "other_rules" "$CONFIG_NAME"
   if [ -z "$rule_name" ]; then
     LOG_OUT "Rule refresh skipped because no active third-party rule configuration was found."
   fi
fi

rm -rf /tmp/rules.yaml >/dev/null 2>&1

SLOG_CLEAN
dec_job_counter_and_restart "$restart"
del_lock
