include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-clashnivo
PKG_VERSION:=0.1.16
PKG_MAINTAINER:=gorillapower <https://github.com/gorillapower>

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)
CLASHNIVO_UI_DIR:=$(CURDIR)/ui
CLASHNIVO_UI_BUILD_DIR:=$(CLASHNIVO_UI_DIR)/dist
CLASHNIVO_SPA_INSTALL_DIR:=$(PKG_BUILD_DIR)/root/www/luci-static/clash-nivo

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)/config
	config PACKAGE_kmod-inet-diag
	default y if PACKAGE_$(PKG_NAME)

	config PACKAGE_luci-compat
	default y if PACKAGE_$(PKG_NAME)

	config PACKAGE_kmod-nft-tproxy
	default y if PACKAGE_firewall4

	config PACKAGE_kmod-ipt-nat
	default y if ! PACKAGE_firewall4

	config PACKAGE_iptables-mod-tproxy
	default y if ! PACKAGE_firewall4

	config PACKAGE_iptables-mod-extra
	default y if ! PACKAGE_firewall4

	config PACKAGE_dnsmasq_full_ipset
	default y if ! PACKAGE_firewall4

	config PACKAGE_dnsmasq_full_nftset
	default y if PACKAGE_firewall4

	config PACKAGE_ipset
	default y if ! PACKAGE_firewall4
endef

define Package/$(PKG_NAME)
	CATEGORY:=LuCI
	SUBMENU:=3. Applications
	TITLE:=LuCI support for clash
	PKGARCH:=all
	DEPENDS:=+dnsmasq-full +bash +curl +ca-bundle +ip-full \
	+ruby +ruby-yaml +kmod-tun +unzip
	MAINTAINER:=vernesong
endef

define Package/$(PKG_NAME)/description
    A LuCI support for clash
endef

define Build/Prepare
	$(CP) $(CURDIR)/root $(PKG_BUILD_DIR)
	$(CP) $(CURDIR)/luasrc $(PKG_BUILD_DIR)
	mkdir -p $(CLASHNIVO_SPA_INSTALL_DIR)
	$(CP) $(CLASHNIVO_UI_BUILD_DIR)/. $(CLASHNIVO_SPA_INSTALL_DIR)/
	$(foreach po,$(wildcard ${CURDIR}/po/zh-cn/*.po), \
		po2lmo $(po) $(PKG_BUILD_DIR)/$(patsubst %.po,%.lmo,$(notdir $(po)));)
	chmod 0755 $(PKG_BUILD_DIR)/root/etc/init.d/clashnivo
	chmod -R 0755 $(PKG_BUILD_DIR)/root/usr/share/clashnivo/
	mkdir -p $(PKG_BUILD_DIR)/root/etc/clashnivo/config
	mkdir -p $(PKG_BUILD_DIR)/root/etc/clashnivo/rule_provider
	mkdir -p $(PKG_BUILD_DIR)/root/etc/clashnivo/proxy_provider
	mkdir -p $(PKG_BUILD_DIR)/root/etc/clashnivo/core
	mkdir -p $(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/overwrite
	cp -f "$(PKG_BUILD_DIR)/root/etc/config/clashnivo" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_rules.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_rules.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_rules_2.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_rules_2.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_hosts.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_hosts.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_fake_filter.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_fake_filter.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_domain_dns.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_domain_dns.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_domain_dns_policy.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_domain_dns_policy.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_proxy_server_dns_policy.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_proxy_server_dns_policy.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_fallback_filter.yaml" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_fallback_filter.yaml" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_sniffer.yaml" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_sniffer.yaml" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_localnetwork_ipv4.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_localnetwork_ipv4.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_localnetwork_ipv6.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_localnetwork_ipv6.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_chnroute_pass.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_chnroute_pass.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_chnroute6_pass.list" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_chnroute6_pass.list" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_firewall_rules.sh" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_firewall_rules.sh" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/custom/clashnivo_custom_overwrite.sh" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/clashnivo_custom_overwrite.sh" >/dev/null 2>&1
	cp -f "$(PKG_BUILD_DIR)/root/etc/clashnivo/overwrite/default" "$(PKG_BUILD_DIR)/root/usr/share/clashnivo/backup/overwrite/default" >/dev/null 2>&1
	exit 0
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/conffiles
endef

define Package/$(PKG_NAME)/preinst
#!/bin/sh
	exit 0
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
	exit 0
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh
	[ -x "/etc/init.d/clashnivo" ] && /etc/init.d/clashnivo stop 2>/dev/null
	exit 0
endef

define Package/$(PKG_NAME)/postrm
#!/bin/sh
	if [ "$${1}" = "upgrade" ] || [ "$${1}" = "1" ]; then
		exit 0
	fi
	DEFAULT_DNSMASQ_CFGID="$$(uci -q show "dhcp.@dnsmasq[0]" | awk 'NR==1 {split($0, conf, /[.=]/); print conf[2]}' 2>/dev/null)"
	if [ -f "/tmp/etc/dnsmasq.conf.$DEFAULT_DNSMASQ_CFGID" ]; then
	   DNSMASQ_CONF_DIR="$$(awk -F '=' '/^conf-dir=/ {print $2}' "/tmp/etc/dnsmasq.conf.$DEFAULT_DNSMASQ_CFGID" 2>/dev/null)"
	else
	   DNSMASQ_CONF_DIR="/tmp/dnsmasq.d"
	fi
	DNSMASQ_CONF_DIR=$${DNSMASQ_CONF_DIR%*/}
	rm -rf /etc/config/clashnivo >/dev/null 2>&1
	rm -rf /etc/clashnivo >/dev/null 2>&1
	rm -rf /usr/share/clashnivo >/dev/null 2>&1
	rm -rf /var/etc/clashnivo.include >/dev/null 2>&1
	rm -rf /tmp/clashnivo* >/dev/null 2>&1
	rm -rf ${DNSMASQ_CONF_DIR}/dnsmasq_clashnivo_custom_domain.conf >/dev/null 2>&1
	rm -rf ${DNSMASQ_CONF_DIR}/dnsmasq_clashnivo_chnroute_pass.conf >/dev/null 2>&1
	rm -rf ${DNSMASQ_CONF_DIR}/dnsmasq_clashnivo_chnroute6_pass.conf >/dev/null 2>&1
	rm -rf /tmp/etc/clashnivo >/dev/null 2>&1
	uci -q delete firewall.clashnivo
	uci -q commit firewall
	[ -f "/etc/config/ucitrack" ] && {
	uci -q delete ucitrack.@clashnivo[-1]
	uci -q commit ucitrack
	}
	rm -f /tmp/luci-indexcache >/dev/null 2>&1
	rm -f /tmp/luci-indexcache.* >/dev/null 2>&1
	exit 0
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/i18n
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/*.*.lmo $(1)/usr/lib/lua/luci/i18n/
	$(CP) $(PKG_BUILD_DIR)/root/* $(1)/
	$(CP) $(PKG_BUILD_DIR)/luasrc/* $(1)/usr/lib/lua/luci/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
