#!/bin/sh

if [ -f /usr/share/clashnivo/service/state.sh ]; then
	. /usr/share/clashnivo/service/state.sh
	clashnivo_service_init_state
fi

: "${START_LOG:=/tmp/clashnivo_start.log}"
: "${LOG_FILE:=/tmp/clashnivo.log}"
: "${MIRROR_LOG_FILE:=}"

clashnivo_log_append()
{
	local line="${1:-}"
	[ -n "${line}" ] || return 0
	echo -e "${line}" >> "$LOG_FILE"
	if [ -n "${MIRROR_LOG_FILE}" ] && [ "${MIRROR_LOG_FILE}" != "${LOG_FILE}" ]; then
		echo -e "${line}" >> "$MIRROR_LOG_FILE"
	fi
}
		
LOG_OUT()
{
	if [ -n "${1}" ]; then
		echo -e "${1}" > $START_LOG
		clashnivo_log_append "$(date "+%Y-%m-%d %H:%M:%S") [Info] ${1}"
	fi
}

LOG_TIP()
{
	if [ -n "${1}" ]; then
		echo -e "${1}" > $START_LOG
		clashnivo_log_append "$(date "+%Y-%m-%d %H:%M:%S") [Tip] ${1}"
	fi
}

LOG_WARN()
{
	if [ -n "${1}" ]; then
		echo -e "${1}" > $START_LOG
		clashnivo_log_append "$(date "+%Y-%m-%d %H:%M:%S") [Warning] ${1}"
	fi
}

LOG_ERROR()
{
	if [ -n "${1}" ]; then
		echo -e "${1}" > $START_LOG
		clashnivo_log_append "$(date "+%Y-%m-%d %H:%M:%S") [Error] ${1}"
	fi
}

LOG_INFO()
{
	if [ -n "${1}" ]; then
		clashnivo_log_append "$(date "+%Y-%m-%d %H:%M:%S") [Info] ${1}"
	fi
}

LOG_WATCHDOG()
{
	if [ -n "${1}" ]; then
		clashnivo_log_append "$(date "+%Y-%m-%d %H:%M:%S") [Watchdog] ${1}"
	fi
}

LOG_ALERT()
{
	echo -e "$(tail -n 20 $LOG_FILE |grep -E 'level=fatal|level=error' |awk 'END {print}')" > $START_LOG
	sleep 3
}

SLOG_CLEAN()
{
	echo "##FINISH##" > $START_LOG
}
