#!/bin/sh

clashnivo_scope_collect_target() {
   local target="$1"
   [ -z "$target" ] && return 0
   if [ "$target" = "$CLASHNIVO_SCOPE_ACTIVE_TARGET" ]; then
      CLASHNIVO_SCOPE_MATCHED="1"
   fi
}

clashnivo_scope_section_applies() {
   local section="$1"
   local active_target="$2"
   local scope_mode

   config_get scope_mode "$section" "scope_mode" "all"
   [ "$scope_mode" = "selected" ] || return 0
   [ -n "$active_target" ] || return 1

   CLASHNIVO_SCOPE_ACTIVE_TARGET="$active_target"
   CLASHNIVO_SCOPE_MATCHED="0"
   config_list_foreach "$section" "scope_targets" clashnivo_scope_collect_target

   [ "$CLASHNIVO_SCOPE_MATCHED" = "1" ]
}
