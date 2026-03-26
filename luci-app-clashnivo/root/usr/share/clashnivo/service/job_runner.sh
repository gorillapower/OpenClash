#!/bin/sh

. /usr/share/clashnivo/service/env.sh
clashnivo_service_init_env ''

command="${1:-}"
shift 2>/dev/null || true

case "${command}" in
   subscription.update)
      clashnivo_service_subscription_refresh_command "$1"
   ;;
   subscription.updateAll)
      clashnivo_service_subscription_refresh_command
   ;;
   dashboard.update)
      clashnivo_service_update_dashboard_command "$1"
   ;;
   dashboard.updateStatus)
      clashnivo_service_update_status_command dashboard "$1"
   ;;
   service.cancelJob)
      clashnivo_service_cancel_job_command
   ;;
   *)
      printf '{'
      printf '"accepted":false,'
      printf '"status":"error",'
      printf '"error":"unknown_job_command",'
      printf '"command":%s' "$(clashnivo_service_json_string "${command}")"
      printf '}\n'
      exit 1
   ;;
esac
