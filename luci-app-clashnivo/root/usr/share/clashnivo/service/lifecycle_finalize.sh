#!/bin/sh

. /etc/init.d/clashnivo

case "${1:-start}" in
   start)
      get_config
      do_run_mode
      clashnivo_service_finalize_start
   ;;
   *)
      exit 1
   ;;
esac
