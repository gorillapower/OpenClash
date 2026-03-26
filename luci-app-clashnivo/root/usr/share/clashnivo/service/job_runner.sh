#!/bin/sh

. /usr/share/clashnivo/service/env.sh
clashnivo_service_init_env ''

command="${1:-}"
shift 2>/dev/null || true

case "${command}" in
   assets.update)
      clashnivo_service_update_assets_command "$1"
   ;;
   assets.updateStatus)
      clashnivo_service_update_status_command assets "$1"
   ;;
   core.probeSources)
      clashnivo_service_probe_core_sources_command
   ;;
   core.update)
      clashnivo_service_update_core_command
   ;;
   core.updateStatus)
      clashnivo_service_update_status_command core core
   ;;
   package.update)
      clashnivo_service_update_package_command
   ;;
   package.updateStatus)
      clashnivo_service_update_status_command package package
   ;;
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
