/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    /**
     * Test data notes:
     * - Data is this file is the output of applying the Prometheus Pull Consumer to TS System Poller data
     * - The data below is formatted into Prometheus style metrics: https://prometheus.io/docs/concepts/data_model/
     * - The majority of metrics have information embedded in in Prometheus "Labels"
     * - All of the metrics are ordered alphabetically by the prom-client NodeJS library
     * - All of the metrics have an 'f5_' prefix, to differentiate TS metrics from other metrics in Prometheus
     * - The metrics are created as "gauges", allowing for metric values to be set to arbitrary values
     */
    expectedData: {
        unfiltered: `# HELP f5_clientside_bitsIn clientside.bitsIn
# TYPE f5_clientside_bitsIn gauge
f5_clientside_bitsIn{virtualServers="/Common/shared"} 5504
f5_clientside_bitsIn{virtualServers="/Sample_01/A1/serviceMain"} 52896
f5_clientside_bitsIn{virtualServers="/Sample_02/A1/serviceMain"} 227168
f5_clientside_bitsIn{virtualServers="/Sample_02/another"} 31504

# HELP f5_clientside_bitsOut clientside.bitsOut
# TYPE f5_clientside_bitsOut gauge
f5_clientside_bitsOut{virtualServers="/Common/shared"} 3072
f5_clientside_bitsOut{virtualServers="/Sample_01/A1/serviceMain"} 32480
f5_clientside_bitsOut{virtualServers="/Sample_02/A1/serviceMain"} 139360
f5_clientside_bitsOut{virtualServers="/Sample_02/another"} 17856

# HELP f5_clientside_curConns clientside.curConns
# TYPE f5_clientside_curConns gauge
f5_clientside_curConns{virtualServers="/Common/shared"} 0
f5_clientside_curConns{virtualServers="/Sample_01/A1/serviceMain"} 0
f5_clientside_curConns{virtualServers="/Sample_02/A1/serviceMain"} 0
f5_clientside_curConns{virtualServers="/Sample_02/another"} 0

# HELP f5_1024_blocks 1024-blocks
# TYPE f5_1024_blocks gauge
f5_1024_blocks{diskStorage="/"} 428150
f5_1024_blocks{diskStorage="/dev"} 8208412
f5_1024_blocks{diskStorage="/dev/shm"} 8217452
f5_1024_blocks{diskStorage="/run"} 8217452
f5_1024_blocks{diskStorage="/sys/fs/cgroup"} 8217452
f5_1024_blocks{diskStorage="/usr"} 5186648
f5_1024_blocks{diskStorage="/shared"} 15350768
f5_1024_blocks{diskStorage="/shared/rrd.1.2"} 8217452
f5_1024_blocks{diskStorage="/config"} 2171984
f5_1024_blocks{diskStorage="/var"} 3030800
f5_1024_blocks{diskStorage="/var/prompt"} 4096
f5_1024_blocks{diskStorage="/var/tmstat"} 8217452
f5_1024_blocks{diskStorage="/var/log"} 2958224
f5_1024_blocks{diskStorage="/appdata"} 25717852
f5_1024_blocks{diskStorage="/var/loipc"} 8217452
f5_1024_blocks{diskStorage="/var/apm/mount/apmclients-7180.2019.119.331-4683.0.iso"} 304366
f5_1024_blocks{diskStorage="/run/user/91"} 1643492
f5_1024_blocks{diskStorage="/mnt/sshplugin_tempfs"} 8217452

# HELP f5_r_s r/s
# TYPE f5_r_s gauge
f5_r_s{diskLatency="sda"} 1.05
f5_r_s{diskLatency="dm-0"} 0
f5_r_s{diskLatency="dm-1"} 0
f5_r_s{diskLatency="dm-2"} 0.01
f5_r_s{diskLatency="dm-3"} 0.01
f5_r_s{diskLatency="dm-4"} 0
f5_r_s{diskLatency="dm-5"} 0
f5_r_s{diskLatency="dm-6"} 0.03
f5_r_s{diskLatency="dm-7"} 0
f5_r_s{diskLatency="dm-8"} 0.01

# HELP f5_w_s w/s
# TYPE f5_w_s gauge
f5_w_s{diskLatency="sda"} 7.41
f5_w_s{diskLatency="dm-0"} 0
f5_w_s{diskLatency="dm-1"} 3.16
f5_w_s{diskLatency="dm-2"} 4.48
f5_w_s{diskLatency="dm-3"} 2.66
f5_w_s{diskLatency="dm-4"} 0.01
f5_w_s{diskLatency="dm-5"} 0.81
f5_w_s{diskLatency="dm-6"} 0
f5_w_s{diskLatency="dm-7"} 0.16
f5_w_s{diskLatency="dm-8"} 3.83

# HELP f5__util %util
# TYPE f5__util gauge
f5__util{diskLatency="sda"} 1.36
f5__util{diskLatency="dm-0"} 0
f5__util{diskLatency="dm-1"} 0.25
f5__util{diskLatency="dm-2"} 0.31
f5__util{diskLatency="dm-3"} 0.24
f5__util{diskLatency="dm-4"} 0
f5__util{diskLatency="dm-5"} 0.09
f5__util{diskLatency="dm-6"} 0
f5__util{diskLatency="dm-7"} 0.01
f5__util{diskLatency="dm-8"} 0.31

# HELP f5_counters_bitsIn counters.bitsIn
# TYPE f5_counters_bitsIn gauge
f5_counters_bitsIn{networkInterfaces="1.0"} 13619749722248
f5_counters_bitsIn{networkInterfaces="mgmt"} 28643376254552

# HELP f5_counters_bitsOut counters.bitsOut
# TYPE f5_counters_bitsOut gauge
f5_counters_bitsOut{networkInterfaces="1.0"} 9802738696
f5_counters_bitsOut{networkInterfaces="mgmt"} 12929625080

# HELP f5_name name
# TYPE f5_name gauge
f5_name{networkInterfaces="1.0"} 1

# HELP f5_activeMemberCnt activeMemberCnt
# TYPE f5_activeMemberCnt gauge
f5_activeMemberCnt{pools="/Common/h.4"} 0
f5_activeMemberCnt{pools="/Sample_01/A1/web_pool"} 0
f5_activeMemberCnt{pools="/Sample_01/A1/web_pool1"} 0
f5_activeMemberCnt{pools="/Sample_02/A1/web_pool"} 0
f5_activeMemberCnt{pools="/Sample_02/A1/web_pool1"} 0

# HELP f5_curPriogrp curPriogrp
# TYPE f5_curPriogrp gauge
f5_curPriogrp{pools="/Common/h.4"} 0
f5_curPriogrp{pools="/Sample_01/A1/web_pool"} 0
f5_curPriogrp{pools="/Sample_01/A1/web_pool1"} 0
f5_curPriogrp{pools="/Sample_02/A1/web_pool"} 0
f5_curPriogrp{pools="/Sample_02/A1/web_pool1"} 0

# HELP f5_highestPriogrp highestPriogrp
# TYPE f5_highestPriogrp gauge
f5_highestPriogrp{pools="/Common/h.4"} 0
f5_highestPriogrp{pools="/Sample_01/A1/web_pool"} 0
f5_highestPriogrp{pools="/Sample_01/A1/web_pool1"} 0
f5_highestPriogrp{pools="/Sample_02/A1/web_pool"} 0
f5_highestPriogrp{pools="/Sample_02/A1/web_pool1"} 0

# HELP f5_lowestPriogrp lowestPriogrp
# TYPE f5_lowestPriogrp gauge
f5_lowestPriogrp{pools="/Common/h.4"} 0
f5_lowestPriogrp{pools="/Sample_01/A1/web_pool"} 0
f5_lowestPriogrp{pools="/Sample_01/A1/web_pool1"} 0
f5_lowestPriogrp{pools="/Sample_02/A1/web_pool"} 0
f5_lowestPriogrp{pools="/Sample_02/A1/web_pool1"} 0

# HELP f5_serverside_bitsIn serverside.bitsIn
# TYPE f5_serverside_bitsIn gauge
f5_serverside_bitsIn{pools="/Common/h.4"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.10:80"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.11:80"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool1"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.12:80"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.13:80"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.10:80"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.11:80"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool1"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.12:80"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.13:80"} 0

# HELP f5_serverside_bitsOut serverside.bitsOut
# TYPE f5_serverside_bitsOut gauge
f5_serverside_bitsOut{pools="/Common/h.4"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.10:80"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.11:80"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool1"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.12:80"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.13:80"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.10:80"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.11:80"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool1"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.12:80"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.13:80"} 0

# HELP f5_serverside_curConns serverside.curConns
# TYPE f5_serverside_curConns gauge
f5_serverside_curConns{pools="/Common/h.4"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.10:80"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.11:80"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool1"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.12:80"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.13:80"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.10:80"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.11:80"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool1"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.12:80"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.13:80"} 0

# HELP f5_port port
# TYPE f5_port gauge
f5_port{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.10:80"} 80
f5_port{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.11:80"} 80
f5_port{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.12:80"} 80
f5_port{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.13:80"} 80
f5_port{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.10:80"} 80
f5_port{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.11:80"} 80
f5_port{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.12:80"} 80
f5_port{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.13:80"} 80

# HELP f5_cookiePersistInserts cookiePersistInserts
# TYPE f5_cookiePersistInserts gauge
f5_cookiePersistInserts{httpProfiles="/Common/http"} 0
f5_cookiePersistInserts{httpProfiles="/Common/http-explicit"} 0
f5_cookiePersistInserts{httpProfiles="/Common/http-transparent"} 0

# HELP f5_getReqs getReqs
# TYPE f5_getReqs gauge
f5_getReqs{httpProfiles="/Common/http"} 152
f5_getReqs{httpProfiles="/Common/http-explicit"} 0
f5_getReqs{httpProfiles="/Common/http-transparent"} 0

# HELP f5_maxKeepaliveReq maxKeepaliveReq
# TYPE f5_maxKeepaliveReq gauge
f5_maxKeepaliveReq{httpProfiles="/Common/http"} 1
f5_maxKeepaliveReq{httpProfiles="/Common/http-explicit"} 0
f5_maxKeepaliveReq{httpProfiles="/Common/http-transparent"} 0

# HELP f5_numberReqs numberReqs
# TYPE f5_numberReqs gauge
f5_numberReqs{httpProfiles="/Common/http"} 152
f5_numberReqs{httpProfiles="/Common/http-explicit"} 0
f5_numberReqs{httpProfiles="/Common/http-transparent"} 0

# HELP f5_postReqs postReqs
# TYPE f5_postReqs gauge
f5_postReqs{httpProfiles="/Common/http"} 0
f5_postReqs{httpProfiles="/Common/http-explicit"} 0
f5_postReqs{httpProfiles="/Common/http-transparent"} 0

# HELP f5_2xxResp 2xxResp
# TYPE f5_2xxResp gauge
f5_2xxResp{httpProfiles="/Common/http"} 0
f5_2xxResp{httpProfiles="/Common/http-explicit"} 0
f5_2xxResp{httpProfiles="/Common/http-transparent"} 0

# HELP f5_3xxResp 3xxResp
# TYPE f5_3xxResp gauge
f5_3xxResp{httpProfiles="/Common/http"} 0
f5_3xxResp{httpProfiles="/Common/http-explicit"} 0
f5_3xxResp{httpProfiles="/Common/http-transparent"} 0

# HELP f5_4xxResp 4xxResp
# TYPE f5_4xxResp gauge
f5_4xxResp{httpProfiles="/Common/http"} 0
f5_4xxResp{httpProfiles="/Common/http-explicit"} 0
f5_4xxResp{httpProfiles="/Common/http-transparent"} 0

# HELP f5_5xxResp 5xxResp
# TYPE f5_5xxResp gauge
f5_5xxResp{httpProfiles="/Common/http"} 0
f5_5xxResp{httpProfiles="/Common/http-explicit"} 0
f5_5xxResp{httpProfiles="/Common/http-transparent"} 0

# HELP f5_respLessThan2m respLessThan2m
# TYPE f5_respLessThan2m gauge
f5_respLessThan2m{httpProfiles="/Common/http"} 0
f5_respLessThan2m{httpProfiles="/Common/http-explicit"} 0
f5_respLessThan2m{httpProfiles="/Common/http-transparent"} 0

# HELP f5_respGreaterThan2m respGreaterThan2m
# TYPE f5_respGreaterThan2m gauge
f5_respGreaterThan2m{httpProfiles="/Common/http"} 0
f5_respGreaterThan2m{httpProfiles="/Common/http-explicit"} 0
f5_respGreaterThan2m{httpProfiles="/Common/http-transparent"} 0

# HELP f5_v10Reqs v10Reqs
# TYPE f5_v10Reqs gauge
f5_v10Reqs{httpProfiles="/Common/http"} 0
f5_v10Reqs{httpProfiles="/Common/http-explicit"} 0
f5_v10Reqs{httpProfiles="/Common/http-transparent"} 0

# HELP f5_v10Resp v10Resp
# TYPE f5_v10Resp gauge
f5_v10Resp{httpProfiles="/Common/http"} 0
f5_v10Resp{httpProfiles="/Common/http-explicit"} 0
f5_v10Resp{httpProfiles="/Common/http-transparent"} 0

# HELP f5_v11Reqs v11Reqs
# TYPE f5_v11Reqs gauge
f5_v11Reqs{httpProfiles="/Common/http"} 152
f5_v11Reqs{httpProfiles="/Common/http-explicit"} 0
f5_v11Reqs{httpProfiles="/Common/http-transparent"} 0

# HELP f5_v11Resp v11Resp
# TYPE f5_v11Resp gauge
f5_v11Resp{httpProfiles="/Common/http"} 0
f5_v11Resp{httpProfiles="/Common/http-explicit"} 0
f5_v11Resp{httpProfiles="/Common/http-transparent"} 0

# HELP f5_v9Reqs v9Reqs
# TYPE f5_v9Reqs gauge
f5_v9Reqs{httpProfiles="/Common/http"} 0
f5_v9Reqs{httpProfiles="/Common/http-explicit"} 0
f5_v9Reqs{httpProfiles="/Common/http-transparent"} 0

# HELP f5_v9Resp v9Resp
# TYPE f5_v9Resp gauge
f5_v9Resp{httpProfiles="/Common/http"} 0
f5_v9Resp{httpProfiles="/Common/http-explicit"} 0
f5_v9Resp{httpProfiles="/Common/http-transparent"} 0

# HELP f5_activeHandshakeRejected activeHandshakeRejected
# TYPE f5_activeHandshakeRejected gauge
f5_activeHandshakeRejected{clientSslProfiles="/Common/clientssl"} 0
f5_activeHandshakeRejected{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_activeHandshakeRejected{clientSslProfiles="/Common/clientssl-secure"} 0
f5_activeHandshakeRejected{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_activeHandshakeRejected{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_activeHandshakeRejected{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_activeHandshakeRejected{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_activeHandshakeRejected{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_activeHandshakeRejected{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_activeHandshakeRejected{serverSslProfiles="/Common/serverssl"} 0
f5_activeHandshakeRejected{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_activeHandshakeRejected{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_activeHandshakeRejected{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_cipherUses_chacha20Poly1305Bulk cipherUses.chacha20Poly1305Bulk
# TYPE f5_cipherUses_chacha20Poly1305Bulk gauge
f5_cipherUses_chacha20Poly1305Bulk{clientSslProfiles="/Common/clientssl"} 0
f5_cipherUses_chacha20Poly1305Bulk{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_cipherUses_chacha20Poly1305Bulk{clientSslProfiles="/Common/clientssl-secure"} 0
f5_cipherUses_chacha20Poly1305Bulk{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_cipherUses_chacha20Poly1305Bulk{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_cipherUses_chacha20Poly1305Bulk{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_cipherUses_chacha20Poly1305Bulk{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_cipherUses_chacha20Poly1305Bulk{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_cipherUses_chacha20Poly1305Bulk{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_cipherUses_chacha20Poly1305Bulk{serverSslProfiles="/Common/serverssl"} 0
f5_cipherUses_chacha20Poly1305Bulk{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_cipherUses_chacha20Poly1305Bulk{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_cipherUses_chacha20Poly1305Bulk{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_currentCompatibleConnections currentCompatibleConnections
# TYPE f5_currentCompatibleConnections gauge
f5_currentCompatibleConnections{clientSslProfiles="/Common/clientssl"} 0
f5_currentCompatibleConnections{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_currentCompatibleConnections{clientSslProfiles="/Common/clientssl-secure"} 0
f5_currentCompatibleConnections{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_currentCompatibleConnections{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_currentCompatibleConnections{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_currentCompatibleConnections{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_currentCompatibleConnections{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_currentCompatibleConnections{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_currentCompatibleConnections{serverSslProfiles="/Common/serverssl"} 0
f5_currentCompatibleConnections{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_currentCompatibleConnections{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_currentCompatibleConnections{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_currentConnections currentConnections
# TYPE f5_currentConnections gauge
f5_currentConnections{clientSslProfiles="/Common/clientssl"} 0
f5_currentConnections{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_currentConnections{clientSslProfiles="/Common/clientssl-secure"} 0
f5_currentConnections{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_currentConnections{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_currentConnections{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_currentConnections{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_currentConnections{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_currentConnections{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_currentConnections{serverSslProfiles="/Common/serverssl"} 0
f5_currentConnections{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_currentConnections{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_currentConnections{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_currentNativeConnections currentNativeConnections
# TYPE f5_currentNativeConnections gauge
f5_currentNativeConnections{clientSslProfiles="/Common/clientssl"} 0
f5_currentNativeConnections{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_currentNativeConnections{clientSslProfiles="/Common/clientssl-secure"} 0
f5_currentNativeConnections{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_currentNativeConnections{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_currentNativeConnections{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_currentNativeConnections{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_currentNativeConnections{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_currentNativeConnections{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_currentNativeConnections{serverSslProfiles="/Common/serverssl"} 0
f5_currentNativeConnections{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_currentNativeConnections{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_currentNativeConnections{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_currentActiveHandshakes currentActiveHandshakes
# TYPE f5_currentActiveHandshakes gauge
f5_currentActiveHandshakes{clientSslProfiles="/Common/clientssl"} 0
f5_currentActiveHandshakes{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_currentActiveHandshakes{clientSslProfiles="/Common/clientssl-secure"} 0
f5_currentActiveHandshakes{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_currentActiveHandshakes{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_currentActiveHandshakes{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_currentActiveHandshakes{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_currentActiveHandshakes{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_currentActiveHandshakes{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_currentActiveHandshakes{serverSslProfiles="/Common/serverssl"} 0
f5_currentActiveHandshakes{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_currentActiveHandshakes{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_currentActiveHandshakes{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_decryptedBytesIn decryptedBytesIn
# TYPE f5_decryptedBytesIn gauge
f5_decryptedBytesIn{clientSslProfiles="/Common/clientssl"} 0
f5_decryptedBytesIn{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_decryptedBytesIn{clientSslProfiles="/Common/clientssl-secure"} 0
f5_decryptedBytesIn{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_decryptedBytesIn{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_decryptedBytesIn{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_decryptedBytesIn{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_decryptedBytesIn{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_decryptedBytesIn{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_decryptedBytesIn{serverSslProfiles="/Common/serverssl"} 0
f5_decryptedBytesIn{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_decryptedBytesIn{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_decryptedBytesIn{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_decryptedBytesOut decryptedBytesOut
# TYPE f5_decryptedBytesOut gauge
f5_decryptedBytesOut{clientSslProfiles="/Common/clientssl"} 0
f5_decryptedBytesOut{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_decryptedBytesOut{clientSslProfiles="/Common/clientssl-secure"} 0
f5_decryptedBytesOut{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_decryptedBytesOut{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_decryptedBytesOut{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_decryptedBytesOut{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_decryptedBytesOut{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_decryptedBytesOut{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_decryptedBytesOut{serverSslProfiles="/Common/serverssl"} 0
f5_decryptedBytesOut{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_decryptedBytesOut{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_decryptedBytesOut{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_encryptedBytesIn encryptedBytesIn
# TYPE f5_encryptedBytesIn gauge
f5_encryptedBytesIn{clientSslProfiles="/Common/clientssl"} 0
f5_encryptedBytesIn{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_encryptedBytesIn{clientSslProfiles="/Common/clientssl-secure"} 0
f5_encryptedBytesIn{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_encryptedBytesIn{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_encryptedBytesIn{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_encryptedBytesIn{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_encryptedBytesIn{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_encryptedBytesIn{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_encryptedBytesIn{serverSslProfiles="/Common/serverssl"} 0
f5_encryptedBytesIn{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_encryptedBytesIn{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_encryptedBytesIn{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_encryptedBytesOut encryptedBytesOut
# TYPE f5_encryptedBytesOut gauge
f5_encryptedBytesOut{clientSslProfiles="/Common/clientssl"} 0
f5_encryptedBytesOut{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_encryptedBytesOut{clientSslProfiles="/Common/clientssl-secure"} 0
f5_encryptedBytesOut{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_encryptedBytesOut{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_encryptedBytesOut{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_encryptedBytesOut{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_encryptedBytesOut{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_encryptedBytesOut{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_encryptedBytesOut{serverSslProfiles="/Common/serverssl"} 0
f5_encryptedBytesOut{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_encryptedBytesOut{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_encryptedBytesOut{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_fatalAlerts fatalAlerts
# TYPE f5_fatalAlerts gauge
f5_fatalAlerts{clientSslProfiles="/Common/clientssl"} 0
f5_fatalAlerts{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_fatalAlerts{clientSslProfiles="/Common/clientssl-secure"} 0
f5_fatalAlerts{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_fatalAlerts{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_fatalAlerts{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_fatalAlerts{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_fatalAlerts{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_fatalAlerts{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_fatalAlerts{serverSslProfiles="/Common/serverssl"} 0
f5_fatalAlerts{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_fatalAlerts{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_fatalAlerts{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_handshakeFailures handshakeFailures
# TYPE f5_handshakeFailures gauge
f5_handshakeFailures{clientSslProfiles="/Common/clientssl"} 0
f5_handshakeFailures{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_handshakeFailures{clientSslProfiles="/Common/clientssl-secure"} 0
f5_handshakeFailures{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_handshakeFailures{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_handshakeFailures{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_handshakeFailures{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_handshakeFailures{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_handshakeFailures{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_handshakeFailures{serverSslProfiles="/Common/serverssl"} 0
f5_handshakeFailures{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_handshakeFailures{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_handshakeFailures{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_peercertInvalid peercertInvalid
# TYPE f5_peercertInvalid gauge
f5_peercertInvalid{clientSslProfiles="/Common/clientssl"} 0
f5_peercertInvalid{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_peercertInvalid{clientSslProfiles="/Common/clientssl-secure"} 0
f5_peercertInvalid{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_peercertInvalid{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_peercertInvalid{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_peercertInvalid{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_peercertInvalid{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_peercertInvalid{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_peercertInvalid{serverSslProfiles="/Common/serverssl"} 0
f5_peercertInvalid{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_peercertInvalid{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_peercertInvalid{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_peercertNone peercertNone
# TYPE f5_peercertNone gauge
f5_peercertNone{clientSslProfiles="/Common/clientssl"} 0
f5_peercertNone{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_peercertNone{clientSslProfiles="/Common/clientssl-secure"} 0
f5_peercertNone{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_peercertNone{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_peercertNone{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_peercertNone{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_peercertNone{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_peercertNone{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_peercertNone{serverSslProfiles="/Common/serverssl"} 0
f5_peercertNone{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_peercertNone{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_peercertNone{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_peercertValid peercertValid
# TYPE f5_peercertValid gauge
f5_peercertValid{clientSslProfiles="/Common/clientssl"} 0
f5_peercertValid{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_peercertValid{clientSslProfiles="/Common/clientssl-secure"} 0
f5_peercertValid{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_peercertValid{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_peercertValid{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_peercertValid{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_peercertValid{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_peercertValid{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_peercertValid{serverSslProfiles="/Common/serverssl"} 0
f5_peercertValid{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_peercertValid{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_peercertValid{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_protocolUses_dtlsv1 protocolUses.dtlsv1
# TYPE f5_protocolUses_dtlsv1 gauge
f5_protocolUses_dtlsv1{clientSslProfiles="/Common/clientssl"} 0
f5_protocolUses_dtlsv1{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_protocolUses_dtlsv1{clientSslProfiles="/Common/clientssl-secure"} 0
f5_protocolUses_dtlsv1{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_protocolUses_dtlsv1{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_protocolUses_dtlsv1{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_protocolUses_dtlsv1{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_protocolUses_dtlsv1{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_protocolUses_dtlsv1{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_protocolUses_dtlsv1{serverSslProfiles="/Common/serverssl"} 0
f5_protocolUses_dtlsv1{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_protocolUses_dtlsv1{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_protocolUses_dtlsv1{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_protocolUses_sslv2 protocolUses.sslv2
# TYPE f5_protocolUses_sslv2 gauge
f5_protocolUses_sslv2{clientSslProfiles="/Common/clientssl"} 0
f5_protocolUses_sslv2{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_protocolUses_sslv2{clientSslProfiles="/Common/clientssl-secure"} 0
f5_protocolUses_sslv2{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_protocolUses_sslv2{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_protocolUses_sslv2{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_protocolUses_sslv2{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_protocolUses_sslv2{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_protocolUses_sslv2{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_protocolUses_sslv2{serverSslProfiles="/Common/serverssl"} 0
f5_protocolUses_sslv2{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_protocolUses_sslv2{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_protocolUses_sslv2{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_protocolUses_sslv3 protocolUses.sslv3
# TYPE f5_protocolUses_sslv3 gauge
f5_protocolUses_sslv3{clientSslProfiles="/Common/clientssl"} 0
f5_protocolUses_sslv3{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_protocolUses_sslv3{clientSslProfiles="/Common/clientssl-secure"} 0
f5_protocolUses_sslv3{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_protocolUses_sslv3{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_protocolUses_sslv3{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_protocolUses_sslv3{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_protocolUses_sslv3{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_protocolUses_sslv3{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_protocolUses_sslv3{serverSslProfiles="/Common/serverssl"} 0
f5_protocolUses_sslv3{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_protocolUses_sslv3{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_protocolUses_sslv3{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_protocolUses_tlsv1 protocolUses.tlsv1
# TYPE f5_protocolUses_tlsv1 gauge
f5_protocolUses_tlsv1{clientSslProfiles="/Common/clientssl"} 0
f5_protocolUses_tlsv1{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_protocolUses_tlsv1{clientSslProfiles="/Common/clientssl-secure"} 0
f5_protocolUses_tlsv1{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_protocolUses_tlsv1{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_protocolUses_tlsv1{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_protocolUses_tlsv1{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_protocolUses_tlsv1{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_protocolUses_tlsv1{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_protocolUses_tlsv1{serverSslProfiles="/Common/serverssl"} 0
f5_protocolUses_tlsv1{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_protocolUses_tlsv1{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_protocolUses_tlsv1{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_protocolUses_tlsv1_1 protocolUses.tlsv1_1
# TYPE f5_protocolUses_tlsv1_1 gauge
f5_protocolUses_tlsv1_1{clientSslProfiles="/Common/clientssl"} 0
f5_protocolUses_tlsv1_1{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_protocolUses_tlsv1_1{clientSslProfiles="/Common/clientssl-secure"} 0
f5_protocolUses_tlsv1_1{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_protocolUses_tlsv1_1{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_protocolUses_tlsv1_1{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_protocolUses_tlsv1_1{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_protocolUses_tlsv1_1{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_protocolUses_tlsv1_1{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_protocolUses_tlsv1_1{serverSslProfiles="/Common/serverssl"} 0
f5_protocolUses_tlsv1_1{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_protocolUses_tlsv1_1{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_protocolUses_tlsv1_1{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_protocolUses_tlsv1_2 protocolUses.tlsv1_2
# TYPE f5_protocolUses_tlsv1_2 gauge
f5_protocolUses_tlsv1_2{clientSslProfiles="/Common/clientssl"} 0
f5_protocolUses_tlsv1_2{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_protocolUses_tlsv1_2{clientSslProfiles="/Common/clientssl-secure"} 0
f5_protocolUses_tlsv1_2{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_protocolUses_tlsv1_2{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_protocolUses_tlsv1_2{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_protocolUses_tlsv1_2{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_protocolUses_tlsv1_2{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_protocolUses_tlsv1_2{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_protocolUses_tlsv1_2{serverSslProfiles="/Common/serverssl"} 0
f5_protocolUses_tlsv1_2{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_protocolUses_tlsv1_2{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_protocolUses_tlsv1_2{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_protocolUses_tlsv1_3 protocolUses.tlsv1_3
# TYPE f5_protocolUses_tlsv1_3 gauge
f5_protocolUses_tlsv1_3{clientSslProfiles="/Common/clientssl"} 0
f5_protocolUses_tlsv1_3{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_protocolUses_tlsv1_3{clientSslProfiles="/Common/clientssl-secure"} 0
f5_protocolUses_tlsv1_3{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_protocolUses_tlsv1_3{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_protocolUses_tlsv1_3{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_protocolUses_tlsv1_3{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_protocolUses_tlsv1_3{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_protocolUses_tlsv1_3{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_protocolUses_tlsv1_3{serverSslProfiles="/Common/serverssl"} 0
f5_protocolUses_tlsv1_3{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_protocolUses_tlsv1_3{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_protocolUses_tlsv1_3{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_recordsIn recordsIn
# TYPE f5_recordsIn gauge
f5_recordsIn{clientSslProfiles="/Common/clientssl"} 0
f5_recordsIn{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_recordsIn{clientSslProfiles="/Common/clientssl-secure"} 0
f5_recordsIn{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_recordsIn{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_recordsIn{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_recordsIn{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_recordsIn{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_recordsIn{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_recordsIn{serverSslProfiles="/Common/serverssl"} 0
f5_recordsIn{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_recordsIn{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_recordsIn{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_recordsOut recordsOut
# TYPE f5_recordsOut gauge
f5_recordsOut{clientSslProfiles="/Common/clientssl"} 0
f5_recordsOut{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_recordsOut{clientSslProfiles="/Common/clientssl-secure"} 0
f5_recordsOut{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_recordsOut{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_recordsOut{clientSslProfiles="/Common/wom-default-clientssl"} 0
f5_recordsOut{serverSslProfiles="/Common/apm-default-serverssl"} 0
f5_recordsOut{serverSslProfiles="/Common/crypto-client-default-serverssl"} 0
f5_recordsOut{serverSslProfiles="/Common/pcoip-default-serverssl"} 0
f5_recordsOut{serverSslProfiles="/Common/serverssl"} 0
f5_recordsOut{serverSslProfiles="/Common/serverssl-insecure-compatible"} 0
f5_recordsOut{serverSslProfiles="/Common/splitsession-default-serverssl"} 0
f5_recordsOut{serverSslProfiles="/Common/wom-default-serverssl"} 0

# HELP f5_sniRejects sniRejects
# TYPE f5_sniRejects gauge
f5_sniRejects{clientSslProfiles="/Common/clientssl"} 0
f5_sniRejects{clientSslProfiles="/Common/clientssl-insecure-compatible"} 0
f5_sniRejects{clientSslProfiles="/Common/clientssl-secure"} 0
f5_sniRejects{clientSslProfiles="/Common/crypto-server-default-clientssl"} 0
f5_sniRejects{clientSslProfiles="/Common/splitsession-default-clientssl"} 0
f5_sniRejects{clientSslProfiles="/Common/wom-default-clientssl"} 0

# HELP f5_expirationDate expirationDate
# TYPE f5_expirationDate gauge
f5_expirationDate{sslCerts="ca-bundle.crt"} 1893455999
f5_expirationDate{sslCerts="default.crt"} 1893790681
f5_expirationDate{sslCerts="f5-ca-bundle.crt"} 1922896554
f5_expirationDate{sslCerts="f5-irule.crt"} 1815944413

# HELP f5_hcInBroadcastPkts hcInBroadcastPkts
# TYPE f5_hcInBroadcastPkts gauge
f5_hcInBroadcastPkts{networkTunnels="/Common/http-tunnel"} 0
f5_hcInBroadcastPkts{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_hcInMulticastPkts hcInMulticastPkts
# TYPE f5_hcInMulticastPkts gauge
f5_hcInMulticastPkts{networkTunnels="/Common/http-tunnel"} 0
f5_hcInMulticastPkts{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_hcInOctets hcInOctets
# TYPE f5_hcInOctets gauge
f5_hcInOctets{networkTunnels="/Common/http-tunnel"} 0
f5_hcInOctets{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_hcInUcastPkts hcInUcastPkts
# TYPE f5_hcInUcastPkts gauge
f5_hcInUcastPkts{networkTunnels="/Common/http-tunnel"} 0
f5_hcInUcastPkts{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_hcOutBroadcastPkts hcOutBroadcastPkts
# TYPE f5_hcOutBroadcastPkts gauge
f5_hcOutBroadcastPkts{networkTunnels="/Common/http-tunnel"} 0
f5_hcOutBroadcastPkts{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_hcOutMulticastPkts hcOutMulticastPkts
# TYPE f5_hcOutMulticastPkts gauge
f5_hcOutMulticastPkts{networkTunnels="/Common/http-tunnel"} 0
f5_hcOutMulticastPkts{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_hcOutOctets hcOutOctets
# TYPE f5_hcOutOctets gauge
f5_hcOutOctets{networkTunnels="/Common/http-tunnel"} 0
f5_hcOutOctets{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_hcOutUcastPkts hcOutUcastPkts
# TYPE f5_hcOutUcastPkts gauge
f5_hcOutUcastPkts{networkTunnels="/Common/http-tunnel"} 0
f5_hcOutUcastPkts{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_inDiscards inDiscards
# TYPE f5_inDiscards gauge
f5_inDiscards{networkTunnels="/Common/http-tunnel"} 0
f5_inDiscards{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_inErrors inErrors
# TYPE f5_inErrors gauge
f5_inErrors{networkTunnels="/Common/http-tunnel"} 0
f5_inErrors{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_inUnknownProtos inUnknownProtos
# TYPE f5_inUnknownProtos gauge
f5_inUnknownProtos{networkTunnels="/Common/http-tunnel"} 0
f5_inUnknownProtos{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_outDiscards outDiscards
# TYPE f5_outDiscards gauge
f5_outDiscards{networkTunnels="/Common/http-tunnel"} 0
f5_outDiscards{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_outErrors outErrors
# TYPE f5_outErrors gauge
f5_outErrors{networkTunnels="/Common/http-tunnel"} 0
f5_outErrors{networkTunnels="/Common/socks-tunnel"} 0

# HELP f5_aborts aborts
# TYPE f5_aborts gauge
f5_aborts{iRules="/Common/_sys_APM_ExchangeSupport_OA_BasicAuth",events="RULE_INIT"} 0
f5_aborts{iRules="/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth",events="RULE_INIT"} 0
f5_aborts{iRules="/Common/_sys_APM_ExchangeSupport_helper",events="HTTP_REQUEST_DATA"} 0
f5_aborts{iRules="/Common/_sys_APM_ExchangeSupport_main",events="RULE_INIT"} 0
f5_aborts{iRules="/Common/_sys_APM_MS_Office_OFBA_Support",events="RULE_INIT"} 0
f5_aborts{iRules="/Common/_sys_APM_Office365_SAML_BasicAuth",events="RULE_INIT"} 0
f5_aborts{iRules="/Common/_sys_APM_activesync",events="RULE_INIT"} 0
f5_aborts{iRules="/Common/_sys_auth_krbdelegate",events="HTTP_RESPONSE"} 0
f5_aborts{iRules="/Common/_sys_auth_ldap",events="HTTP_REQUEST"} 0
f5_aborts{iRules="/Common/_sys_auth_radius",events="HTTP_REQUEST"} 0
f5_aborts{iRules="/Common/_sys_auth_ssl_cc_ldap",events="CLIENT_ACCEPTED"} 0
f5_aborts{iRules="/Common/_sys_auth_ssl_crldp",events="CLIENT_ACCEPTED"} 0
f5_aborts{iRules="/Common/_sys_auth_ssl_ocsp",events="CLIENT_ACCEPTED"} 0
f5_aborts{iRules="/Common/_sys_auth_tacacs",events="HTTP_REQUEST"} 0
f5_aborts{iRules="/Common/_sys_https_redirect",events="HTTP_REQUEST"} 0

# HELP f5_avgCycles avgCycles
# TYPE f5_avgCycles gauge
f5_avgCycles{iRules="/Common/_sys_APM_ExchangeSupport_OA_BasicAuth",events="RULE_INIT"} 40577
f5_avgCycles{iRules="/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth",events="RULE_INIT"} 40467
f5_avgCycles{iRules="/Common/_sys_APM_ExchangeSupport_helper",events="HTTP_REQUEST_DATA"} 0
f5_avgCycles{iRules="/Common/_sys_APM_ExchangeSupport_main",events="RULE_INIT"} 53953
f5_avgCycles{iRules="/Common/_sys_APM_MS_Office_OFBA_Support",events="RULE_INIT"} 31414
f5_avgCycles{iRules="/Common/_sys_APM_Office365_SAML_BasicAuth",events="RULE_INIT"} 5154
f5_avgCycles{iRules="/Common/_sys_APM_activesync",events="RULE_INIT"} 51596
f5_avgCycles{iRules="/Common/_sys_auth_krbdelegate",events="HTTP_RESPONSE"} 0
f5_avgCycles{iRules="/Common/_sys_auth_ldap",events="HTTP_REQUEST"} 0
f5_avgCycles{iRules="/Common/_sys_auth_radius",events="HTTP_REQUEST"} 0
f5_avgCycles{iRules="/Common/_sys_auth_ssl_cc_ldap",events="CLIENT_ACCEPTED"} 0
f5_avgCycles{iRules="/Common/_sys_auth_ssl_crldp",events="CLIENT_ACCEPTED"} 0
f5_avgCycles{iRules="/Common/_sys_auth_ssl_ocsp",events="CLIENT_ACCEPTED"} 0
f5_avgCycles{iRules="/Common/_sys_auth_tacacs",events="HTTP_REQUEST"} 0
f5_avgCycles{iRules="/Common/_sys_https_redirect",events="HTTP_REQUEST"} 0

# HELP f5_failures failures
# TYPE f5_failures gauge
f5_failures{iRules="/Common/_sys_APM_ExchangeSupport_OA_BasicAuth",events="RULE_INIT"} 0
f5_failures{iRules="/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth",events="RULE_INIT"} 0
f5_failures{iRules="/Common/_sys_APM_ExchangeSupport_helper",events="HTTP_REQUEST_DATA"} 0
f5_failures{iRules="/Common/_sys_APM_ExchangeSupport_main",events="RULE_INIT"} 0
f5_failures{iRules="/Common/_sys_APM_MS_Office_OFBA_Support",events="RULE_INIT"} 0
f5_failures{iRules="/Common/_sys_APM_Office365_SAML_BasicAuth",events="RULE_INIT"} 0
f5_failures{iRules="/Common/_sys_APM_activesync",events="RULE_INIT"} 0
f5_failures{iRules="/Common/_sys_auth_krbdelegate",events="HTTP_RESPONSE"} 0
f5_failures{iRules="/Common/_sys_auth_ldap",events="HTTP_REQUEST"} 0
f5_failures{iRules="/Common/_sys_auth_radius",events="HTTP_REQUEST"} 0
f5_failures{iRules="/Common/_sys_auth_ssl_cc_ldap",events="CLIENT_ACCEPTED"} 0
f5_failures{iRules="/Common/_sys_auth_ssl_crldp",events="CLIENT_ACCEPTED"} 0
f5_failures{iRules="/Common/_sys_auth_ssl_ocsp",events="CLIENT_ACCEPTED"} 0
f5_failures{iRules="/Common/_sys_auth_tacacs",events="HTTP_REQUEST"} 0
f5_failures{iRules="/Common/_sys_https_redirect",events="HTTP_REQUEST"} 0

# HELP f5_maxCycles maxCycles
# TYPE f5_maxCycles gauge
f5_maxCycles{iRules="/Common/_sys_APM_ExchangeSupport_OA_BasicAuth",events="RULE_INIT"} 40577
f5_maxCycles{iRules="/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth",events="RULE_INIT"} 40467
f5_maxCycles{iRules="/Common/_sys_APM_ExchangeSupport_helper",events="HTTP_REQUEST_DATA"} 0
f5_maxCycles{iRules="/Common/_sys_APM_ExchangeSupport_main",events="RULE_INIT"} 53953
f5_maxCycles{iRules="/Common/_sys_APM_MS_Office_OFBA_Support",events="RULE_INIT"} 31414
f5_maxCycles{iRules="/Common/_sys_APM_Office365_SAML_BasicAuth",events="RULE_INIT"} 5154
f5_maxCycles{iRules="/Common/_sys_APM_activesync",events="RULE_INIT"} 51596
f5_maxCycles{iRules="/Common/_sys_auth_krbdelegate",events="HTTP_RESPONSE"} 0
f5_maxCycles{iRules="/Common/_sys_auth_ldap",events="HTTP_REQUEST"} 0
f5_maxCycles{iRules="/Common/_sys_auth_radius",events="HTTP_REQUEST"} 0
f5_maxCycles{iRules="/Common/_sys_auth_ssl_cc_ldap",events="CLIENT_ACCEPTED"} 0
f5_maxCycles{iRules="/Common/_sys_auth_ssl_crldp",events="CLIENT_ACCEPTED"} 0
f5_maxCycles{iRules="/Common/_sys_auth_ssl_ocsp",events="CLIENT_ACCEPTED"} 0
f5_maxCycles{iRules="/Common/_sys_auth_tacacs",events="HTTP_REQUEST"} 0
f5_maxCycles{iRules="/Common/_sys_https_redirect",events="HTTP_REQUEST"} 0

# HELP f5_minCycles minCycles
# TYPE f5_minCycles gauge
f5_minCycles{iRules="/Common/_sys_APM_ExchangeSupport_OA_BasicAuth",events="RULE_INIT"} 11518
f5_minCycles{iRules="/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth",events="RULE_INIT"} 36591
f5_minCycles{iRules="/Common/_sys_APM_ExchangeSupport_helper",events="HTTP_REQUEST_DATA"} 0
f5_minCycles{iRules="/Common/_sys_APM_ExchangeSupport_main",events="RULE_INIT"} 32254
f5_minCycles{iRules="/Common/_sys_APM_MS_Office_OFBA_Support",events="RULE_INIT"} 14959
f5_minCycles{iRules="/Common/_sys_APM_Office365_SAML_BasicAuth",events="RULE_INIT"} 2640
f5_minCycles{iRules="/Common/_sys_APM_activesync",events="RULE_INIT"} 11006
f5_minCycles{iRules="/Common/_sys_auth_krbdelegate",events="HTTP_RESPONSE"} 0
f5_minCycles{iRules="/Common/_sys_auth_ldap",events="HTTP_REQUEST"} 0
f5_minCycles{iRules="/Common/_sys_auth_radius",events="HTTP_REQUEST"} 0
f5_minCycles{iRules="/Common/_sys_auth_ssl_cc_ldap",events="CLIENT_ACCEPTED"} 0
f5_minCycles{iRules="/Common/_sys_auth_ssl_crldp",events="CLIENT_ACCEPTED"} 0
f5_minCycles{iRules="/Common/_sys_auth_ssl_ocsp",events="CLIENT_ACCEPTED"} 0
f5_minCycles{iRules="/Common/_sys_auth_tacacs",events="HTTP_REQUEST"} 0
f5_minCycles{iRules="/Common/_sys_https_redirect",events="HTTP_REQUEST"} 0

# HELP f5_priority priority
# TYPE f5_priority gauge
f5_priority{iRules="/Common/_sys_APM_ExchangeSupport_OA_BasicAuth",events="RULE_INIT"} 500
f5_priority{iRules="/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth",events="RULE_INIT"} 500
f5_priority{iRules="/Common/_sys_APM_ExchangeSupport_helper",events="HTTP_REQUEST_DATA"} 500
f5_priority{iRules="/Common/_sys_APM_ExchangeSupport_main",events="RULE_INIT"} 500
f5_priority{iRules="/Common/_sys_APM_MS_Office_OFBA_Support",events="RULE_INIT"} 500
f5_priority{iRules="/Common/_sys_APM_Office365_SAML_BasicAuth",events="RULE_INIT"} 500
f5_priority{iRules="/Common/_sys_APM_activesync",events="RULE_INIT"} 500
f5_priority{iRules="/Common/_sys_auth_krbdelegate",events="HTTP_RESPONSE"} 500
f5_priority{iRules="/Common/_sys_auth_ldap",events="HTTP_REQUEST"} 500
f5_priority{iRules="/Common/_sys_auth_radius",events="HTTP_REQUEST"} 500
f5_priority{iRules="/Common/_sys_auth_ssl_cc_ldap",events="CLIENT_ACCEPTED"} 500
f5_priority{iRules="/Common/_sys_auth_ssl_crldp",events="CLIENT_ACCEPTED"} 500
f5_priority{iRules="/Common/_sys_auth_ssl_ocsp",events="CLIENT_ACCEPTED"} 500
f5_priority{iRules="/Common/_sys_auth_tacacs",events="HTTP_REQUEST"} 500
f5_priority{iRules="/Common/_sys_https_redirect",events="HTTP_REQUEST"} 500

# HELP f5_totalExecutions totalExecutions
# TYPE f5_totalExecutions gauge
f5_totalExecutions{iRules="/Common/_sys_APM_ExchangeSupport_OA_BasicAuth",events="RULE_INIT"} 4
f5_totalExecutions{iRules="/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth",events="RULE_INIT"} 4
f5_totalExecutions{iRules="/Common/_sys_APM_ExchangeSupport_helper",events="HTTP_REQUEST_DATA"} 0
f5_totalExecutions{iRules="/Common/_sys_APM_ExchangeSupport_main",events="RULE_INIT"} 4
f5_totalExecutions{iRules="/Common/_sys_APM_MS_Office_OFBA_Support",events="RULE_INIT"} 4
f5_totalExecutions{iRules="/Common/_sys_APM_Office365_SAML_BasicAuth",events="RULE_INIT"} 4
f5_totalExecutions{iRules="/Common/_sys_APM_activesync",events="RULE_INIT"} 4
f5_totalExecutions{iRules="/Common/_sys_auth_krbdelegate",events="HTTP_RESPONSE"} 0
f5_totalExecutions{iRules="/Common/_sys_auth_ldap",events="HTTP_REQUEST"} 0
f5_totalExecutions{iRules="/Common/_sys_auth_radius",events="HTTP_REQUEST"} 0
f5_totalExecutions{iRules="/Common/_sys_auth_ssl_cc_ldap",events="CLIENT_ACCEPTED"} 0
f5_totalExecutions{iRules="/Common/_sys_auth_ssl_crldp",events="CLIENT_ACCEPTED"} 0
f5_totalExecutions{iRules="/Common/_sys_auth_ssl_ocsp",events="CLIENT_ACCEPTED"} 0
f5_totalExecutions{iRules="/Common/_sys_auth_tacacs",events="HTTP_REQUEST"} 0
f5_totalExecutions{iRules="/Common/_sys_https_redirect",events="HTTP_REQUEST"} 0

# HELP f5_alternate alternate
# TYPE f5_alternate gauge
f5_alternate{aPools="/Common/aPool"} 0
f5_alternate{aaaaPools="/Common/aaaPool"} 0
f5_alternate{cnamePools="/Common/cnamePool"} 0
f5_alternate{mxPools="/Common/mxPool"} 0
f5_alternate{naptrPools="/Common/NPool"} 0
f5_alternate{srvPools="/Common/srvPool"} 0
f5_alternate{aWideIps="/Common/awideip.example.com"} 0
f5_alternate{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_alternate{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_alternate{mxWideIps="/Common/mxwideip.example.com"} 0
f5_alternate{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_dropped dropped
# TYPE f5_dropped gauge
f5_dropped{aPools="/Common/aPool"} 0
f5_dropped{aaaaPools="/Common/aaaPool"} 0
f5_dropped{cnamePools="/Common/cnamePool"} 0
f5_dropped{mxPools="/Common/mxPool"} 0
f5_dropped{naptrPools="/Common/NPool"} 0
f5_dropped{srvPools="/Common/srvPool"} 0
f5_dropped{aWideIps="/Common/awideip.example.com"} 0
f5_dropped{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_dropped{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_dropped{mxWideIps="/Common/mxwideip.example.com"} 0
f5_dropped{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_fallback fallback
# TYPE f5_fallback gauge
f5_fallback{aPools="/Common/aPool"} 0
f5_fallback{aaaaPools="/Common/aaaPool"} 0
f5_fallback{cnamePools="/Common/cnamePool"} 0
f5_fallback{mxPools="/Common/mxPool"} 0
f5_fallback{naptrPools="/Common/NPool"} 0
f5_fallback{srvPools="/Common/srvPool"} 0
f5_fallback{aWideIps="/Common/awideip.example.com"} 0
f5_fallback{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_fallback{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_fallback{mxWideIps="/Common/mxwideip.example.com"} 0
f5_fallback{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_preferred preferred
# TYPE f5_preferred gauge
f5_preferred{aPools="/Common/aPool"} 0
f5_preferred{aaaaPools="/Common/aaaPool"} 0
f5_preferred{cnamePools="/Common/cnamePool"} 0
f5_preferred{mxPools="/Common/mxPool"} 0
f5_preferred{naptrPools="/Common/NPool"} 0
f5_preferred{srvPools="/Common/srvPool"} 0
f5_preferred{aWideIps="/Common/awideip.example.com"} 0
f5_preferred{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_preferred{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_preferred{mxWideIps="/Common/mxwideip.example.com"} 0
f5_preferred{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_returnFromDns returnFromDns
# TYPE f5_returnFromDns gauge
f5_returnFromDns{aPools="/Common/aPool"} 0
f5_returnFromDns{aaaaPools="/Common/aaaPool"} 0
f5_returnFromDns{cnamePools="/Common/cnamePool"} 0
f5_returnFromDns{mxPools="/Common/mxPool"} 0
f5_returnFromDns{naptrPools="/Common/NPool"} 0
f5_returnFromDns{srvPools="/Common/srvPool"} 0
f5_returnFromDns{aWideIps="/Common/awideip.example.com"} 0
f5_returnFromDns{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_returnFromDns{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_returnFromDns{mxWideIps="/Common/mxwideip.example.com"} 0
f5_returnFromDns{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_returnToDns returnToDns
# TYPE f5_returnToDns gauge
f5_returnToDns{aPools="/Common/aPool"} 0
f5_returnToDns{aaaaPools="/Common/aaaPool"} 0
f5_returnToDns{cnamePools="/Common/cnamePool"} 0
f5_returnToDns{mxPools="/Common/mxPool"} 0
f5_returnToDns{naptrPools="/Common/NPool"} 0
f5_returnToDns{srvPools="/Common/srvPool"} 0
f5_returnToDns{aWideIps="/Common/awideip.example.com"} 0
f5_returnToDns{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_returnToDns{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_returnToDns{mxWideIps="/Common/mxwideip.example.com"} 0
f5_returnToDns{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_limitMaxBps limitMaxBps
# TYPE f5_limitMaxBps gauge
f5_limitMaxBps{aPools="/Common/aPool"} 0
f5_limitMaxBps{aaaaPools="/Common/aaaPool"} 0

# HELP f5_limitMaxConnections limitMaxConnections
# TYPE f5_limitMaxConnections gauge
f5_limitMaxConnections{aPools="/Common/aPool"} 0
f5_limitMaxConnections{aaaaPools="/Common/aaaPool"} 0

# HELP f5_limitMaxPps limitMaxPps
# TYPE f5_limitMaxPps gauge
f5_limitMaxPps{aPools="/Common/aPool"} 0
f5_limitMaxPps{aaaaPools="/Common/aaaPool"} 0

# HELP f5_maxAnswersReturned maxAnswersReturned
# TYPE f5_maxAnswersReturned gauge
f5_maxAnswersReturned{aPools="/Common/aPool"} 1
f5_maxAnswersReturned{aaaaPools="/Common/aaaPool"} 1
f5_maxAnswersReturned{mxPools="/Common/mxPool"} 1
f5_maxAnswersReturned{naptrPools="/Common/NPool"} 1
f5_maxAnswersReturned{srvPools="/Common/srvPool"} 1

# HELP f5_qosHitRatio qosHitRatio
# TYPE f5_qosHitRatio gauge
f5_qosHitRatio{aPools="/Common/aPool"} 5
f5_qosHitRatio{aaaaPools="/Common/aaaPool"} 5
f5_qosHitRatio{cnamePools="/Common/cnamePool"} 5
f5_qosHitRatio{mxPools="/Common/mxPool"} 5
f5_qosHitRatio{naptrPools="/Common/NPool"} 5
f5_qosHitRatio{srvPools="/Common/srvPool"} 5

# HELP f5_qosHops qosHops
# TYPE f5_qosHops gauge
f5_qosHops{aPools="/Common/aPool"} 0
f5_qosHops{aaaaPools="/Common/aaaPool"} 0
f5_qosHops{cnamePools="/Common/cnamePool"} 0
f5_qosHops{mxPools="/Common/mxPool"} 0
f5_qosHops{naptrPools="/Common/NPool"} 0
f5_qosHops{srvPools="/Common/srvPool"} 0

# HELP f5_qosKilobytesSecond qosKilobytesSecond
# TYPE f5_qosKilobytesSecond gauge
f5_qosKilobytesSecond{aPools="/Common/aPool"} 3
f5_qosKilobytesSecond{aaaaPools="/Common/aaaPool"} 3
f5_qosKilobytesSecond{cnamePools="/Common/cnamePool"} 3
f5_qosKilobytesSecond{mxPools="/Common/mxPool"} 3
f5_qosKilobytesSecond{naptrPools="/Common/NPool"} 3
f5_qosKilobytesSecond{srvPools="/Common/srvPool"} 3

# HELP f5_qosLcs qosLcs
# TYPE f5_qosLcs gauge
f5_qosLcs{aPools="/Common/aPool"} 30
f5_qosLcs{aaaaPools="/Common/aaaPool"} 30
f5_qosLcs{cnamePools="/Common/cnamePool"} 30
f5_qosLcs{mxPools="/Common/mxPool"} 30
f5_qosLcs{naptrPools="/Common/NPool"} 30
f5_qosLcs{srvPools="/Common/srvPool"} 30

# HELP f5_qosPacketRate qosPacketRate
# TYPE f5_qosPacketRate gauge
f5_qosPacketRate{aPools="/Common/aPool"} 1
f5_qosPacketRate{aaaaPools="/Common/aaaPool"} 1
f5_qosPacketRate{cnamePools="/Common/cnamePool"} 1
f5_qosPacketRate{mxPools="/Common/mxPool"} 1
f5_qosPacketRate{naptrPools="/Common/NPool"} 1
f5_qosPacketRate{srvPools="/Common/srvPool"} 1

# HELP f5_qosRtt qosRtt
# TYPE f5_qosRtt gauge
f5_qosRtt{aPools="/Common/aPool"} 50
f5_qosRtt{aaaaPools="/Common/aaaPool"} 50
f5_qosRtt{cnamePools="/Common/cnamePool"} 50
f5_qosRtt{mxPools="/Common/mxPool"} 50
f5_qosRtt{naptrPools="/Common/NPool"} 50
f5_qosRtt{srvPools="/Common/srvPool"} 50

# HELP f5_qosTopology qosTopology
# TYPE f5_qosTopology gauge
f5_qosTopology{aPools="/Common/aPool"} 0
f5_qosTopology{aaaaPools="/Common/aaaPool"} 0
f5_qosTopology{cnamePools="/Common/cnamePool"} 0
f5_qosTopology{mxPools="/Common/mxPool"} 0
f5_qosTopology{naptrPools="/Common/NPool"} 0
f5_qosTopology{srvPools="/Common/srvPool"} 0

# HELP f5_qosVsCapacity qosVsCapacity
# TYPE f5_qosVsCapacity gauge
f5_qosVsCapacity{aPools="/Common/aPool"} 0
f5_qosVsCapacity{aaaaPools="/Common/aaaPool"} 0
f5_qosVsCapacity{cnamePools="/Common/cnamePool"} 0
f5_qosVsCapacity{mxPools="/Common/mxPool"} 0
f5_qosVsCapacity{naptrPools="/Common/NPool"} 0
f5_qosVsCapacity{srvPools="/Common/srvPool"} 0

# HELP f5_qosVsScore qosVsScore
# TYPE f5_qosVsScore gauge
f5_qosVsScore{aPools="/Common/aPool"} 0
f5_qosVsScore{aaaaPools="/Common/aaaPool"} 0
f5_qosVsScore{cnamePools="/Common/cnamePool"} 0
f5_qosVsScore{mxPools="/Common/mxPool"} 0
f5_qosVsScore{naptrPools="/Common/NPool"} 0
f5_qosVsScore{srvPools="/Common/srvPool"} 0

# HELP f5_ttl ttl
# TYPE f5_ttl gauge
f5_ttl{aPools="/Common/aPool"} 30
f5_ttl{aaaaPools="/Common/aaaPool"} 30
f5_ttl{cnamePools="/Common/cnamePool"} 30
f5_ttl{mxPools="/Common/mxPool"} 30
f5_ttl{naptrPools="/Common/NPool"} 30
f5_ttl{srvPools="/Common/srvPool"} 30

# HELP f5_cnameResolutions cnameResolutions
# TYPE f5_cnameResolutions gauge
f5_cnameResolutions{aWideIps="/Common/awideip.example.com"} 0
f5_cnameResolutions{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_cnameResolutions{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_cnameResolutions{mxWideIps="/Common/mxwideip.example.com"} 0
f5_cnameResolutions{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_persisted persisted
# TYPE f5_persisted gauge
f5_persisted{aWideIps="/Common/awideip.example.com"} 0
f5_persisted{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_persisted{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_persisted{mxWideIps="/Common/mxwideip.example.com"} 0
f5_persisted{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_rcode rcode
# TYPE f5_rcode gauge
f5_rcode{aWideIps="/Common/awideip.example.com"} 0
f5_rcode{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_rcode{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_rcode{mxWideIps="/Common/mxwideip.example.com"} 0
f5_rcode{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_requests requests
# TYPE f5_requests gauge
f5_requests{aWideIps="/Common/awideip.example.com"} 0
f5_requests{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_requests{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_requests{mxWideIps="/Common/mxwideip.example.com"} 0
f5_requests{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_resolutions resolutions
# TYPE f5_resolutions gauge
f5_resolutions{aWideIps="/Common/awideip.example.com"} 0
f5_resolutions{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_resolutions{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_resolutions{mxWideIps="/Common/mxwideip.example.com"} 0
f5_resolutions{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_failureRcodeTtl failureRcodeTtl
# TYPE f5_failureRcodeTtl gauge
f5_failureRcodeTtl{aWideIps="/Common/awideip.example.com"} 0
f5_failureRcodeTtl{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_failureRcodeTtl{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_failureRcodeTtl{mxWideIps="/Common/mxwideip.example.com"} 0
f5_failureRcodeTtl{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_lastResortPool lastResortPool
# TYPE f5_lastResortPool gauge
f5_lastResortPool{aWideIps="/Common/awideip.example.com"} 0
f5_lastResortPool{aaaaWideIps="/Common/aaawideip.example.com"} 0
f5_lastResortPool{cnameWideIps="/Common/cnamewideip.example.com"} 0
f5_lastResortPool{mxWideIps="/Common/mxwideip.example.com"} 0
f5_lastResortPool{srvWideIps="/Common/srvwideip.example.com"} 0

# HELP f5_persistCidrIpv4 persistCidrIpv4
# TYPE f5_persistCidrIpv4 gauge
f5_persistCidrIpv4{aWideIps="/Common/awideip.example.com"} 32
f5_persistCidrIpv4{aaaaWideIps="/Common/aaawideip.example.com"} 32
f5_persistCidrIpv4{cnameWideIps="/Common/cnamewideip.example.com"} 32
f5_persistCidrIpv4{mxWideIps="/Common/mxwideip.example.com"} 32
f5_persistCidrIpv4{srvWideIps="/Common/srvwideip.example.com"} 32

# HELP f5_persistCidrIpv6 persistCidrIpv6
# TYPE f5_persistCidrIpv6 gauge
f5_persistCidrIpv6{aWideIps="/Common/awideip.example.com"} 128
f5_persistCidrIpv6{aaaaWideIps="/Common/aaawideip.example.com"} 128
f5_persistCidrIpv6{cnameWideIps="/Common/cnamewideip.example.com"} 128
f5_persistCidrIpv6{mxWideIps="/Common/mxwideip.example.com"} 128
f5_persistCidrIpv6{srvWideIps="/Common/srvwideip.example.com"} 128

# HELP f5_ttlPersistence ttlPersistence
# TYPE f5_ttlPersistence gauge
f5_ttlPersistence{aWideIps="/Common/awideip.example.com"} 3600
f5_ttlPersistence{aaaaWideIps="/Common/aaawideip.example.com"} 3600
f5_ttlPersistence{cnameWideIps="/Common/cnamewideip.example.com"} 3600
f5_ttlPersistence{mxWideIps="/Common/mxwideip.example.com"} 3600
f5_ttlPersistence{srvWideIps="/Common/srvwideip.example.com"} 3600

# HELP f5_system_syncSummary system_syncSummary
# TYPE f5_system_syncSummary gauge
f5_system_syncSummary 0

# HELP f5_system_cpu system_cpu
# TYPE f5_system_cpu gauge
f5_system_cpu 7

# HELP f5_system_memory system_memory
# TYPE f5_system_memory gauge
f5_system_memory 57

# HELP f5_system_tmmCpu system_tmmCpu
# TYPE f5_system_tmmCpu gauge
f5_system_tmmCpu 3

# HELP f5_system_tmmMemory system_tmmMemory
# TYPE f5_system_tmmMemory gauge
f5_system_tmmMemory 17

# HELP f5_system_tmmTraffic_clientSideTraffic_bitsIn system_tmmTraffic_clientSideTraffic.bitsIn
# TYPE f5_system_tmmTraffic_clientSideTraffic_bitsIn gauge
f5_system_tmmTraffic_clientSideTraffic_bitsIn 60258692504

# HELP f5_system_tmmTraffic_clientSideTraffic_bitsOut system_tmmTraffic_clientSideTraffic.bitsOut
# TYPE f5_system_tmmTraffic_clientSideTraffic_bitsOut gauge
f5_system_tmmTraffic_clientSideTraffic_bitsOut 1274995760

# HELP f5_system_tmmTraffic_serverSideTraffic_bitsIn system_tmmTraffic_serverSideTraffic.bitsIn
# TYPE f5_system_tmmTraffic_serverSideTraffic_bitsIn gauge
f5_system_tmmTraffic_serverSideTraffic_bitsIn 8458221624

# HELP f5_system_tmmTraffic_serverSideTraffic_bitsOut system_tmmTraffic_serverSideTraffic.bitsOut
# TYPE f5_system_tmmTraffic_serverSideTraffic_bitsOut gauge
f5_system_tmmTraffic_serverSideTraffic_bitsOut 862169712

# HELP f5_telemetryServiceInfo_pollingInterval telemetryServiceInfo_pollingInterval
# TYPE f5_telemetryServiceInfo_pollingInterval gauge
f5_telemetryServiceInfo_pollingInterval 0
`,
        virtualServers: `# HELP f5_clientside_bitsIn clientside.bitsIn
# TYPE f5_clientside_bitsIn gauge
f5_clientside_bitsIn{virtualServers="/Common/shared"} 5504
f5_clientside_bitsIn{virtualServers="/Sample_01/A1/serviceMain"} 52896
f5_clientside_bitsIn{virtualServers="/Sample_02/A1/serviceMain"} 227168
f5_clientside_bitsIn{virtualServers="/Sample_02/another"} 31504

# HELP f5_clientside_bitsOut clientside.bitsOut
# TYPE f5_clientside_bitsOut gauge
f5_clientside_bitsOut{virtualServers="/Common/shared"} 3072
f5_clientside_bitsOut{virtualServers="/Sample_01/A1/serviceMain"} 32480
f5_clientside_bitsOut{virtualServers="/Sample_02/A1/serviceMain"} 139360
f5_clientside_bitsOut{virtualServers="/Sample_02/another"} 17856

# HELP f5_clientside_curConns clientside.curConns
# TYPE f5_clientside_curConns gauge
f5_clientside_curConns{virtualServers="/Common/shared"} 0
f5_clientside_curConns{virtualServers="/Sample_01/A1/serviceMain"} 0
f5_clientside_curConns{virtualServers="/Sample_02/A1/serviceMain"} 0
f5_clientside_curConns{virtualServers="/Sample_02/another"} 0
`,
        // Store the combination of Pools + Virtuals, since prom-client library will order metrics alphabetically
        poolsAndVirtuals: `# HELP f5_activeMemberCnt activeMemberCnt
# TYPE f5_activeMemberCnt gauge
f5_activeMemberCnt{pools="/Common/h.4"} 0
f5_activeMemberCnt{pools="/Sample_01/A1/web_pool"} 0
f5_activeMemberCnt{pools="/Sample_01/A1/web_pool1"} 0
f5_activeMemberCnt{pools="/Sample_02/A1/web_pool"} 0
f5_activeMemberCnt{pools="/Sample_02/A1/web_pool1"} 0

# HELP f5_curPriogrp curPriogrp
# TYPE f5_curPriogrp gauge
f5_curPriogrp{pools="/Common/h.4"} 0
f5_curPriogrp{pools="/Sample_01/A1/web_pool"} 0
f5_curPriogrp{pools="/Sample_01/A1/web_pool1"} 0
f5_curPriogrp{pools="/Sample_02/A1/web_pool"} 0
f5_curPriogrp{pools="/Sample_02/A1/web_pool1"} 0

# HELP f5_highestPriogrp highestPriogrp
# TYPE f5_highestPriogrp gauge
f5_highestPriogrp{pools="/Common/h.4"} 0
f5_highestPriogrp{pools="/Sample_01/A1/web_pool"} 0
f5_highestPriogrp{pools="/Sample_01/A1/web_pool1"} 0
f5_highestPriogrp{pools="/Sample_02/A1/web_pool"} 0
f5_highestPriogrp{pools="/Sample_02/A1/web_pool1"} 0

# HELP f5_lowestPriogrp lowestPriogrp
# TYPE f5_lowestPriogrp gauge
f5_lowestPriogrp{pools="/Common/h.4"} 0
f5_lowestPriogrp{pools="/Sample_01/A1/web_pool"} 0
f5_lowestPriogrp{pools="/Sample_01/A1/web_pool1"} 0
f5_lowestPriogrp{pools="/Sample_02/A1/web_pool"} 0
f5_lowestPriogrp{pools="/Sample_02/A1/web_pool1"} 0

# HELP f5_serverside_bitsIn serverside.bitsIn
# TYPE f5_serverside_bitsIn gauge
f5_serverside_bitsIn{pools="/Common/h.4"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.10:80"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.11:80"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool1"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.12:80"} 0
f5_serverside_bitsIn{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.13:80"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.10:80"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.11:80"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool1"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.12:80"} 0
f5_serverside_bitsIn{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.13:80"} 0

# HELP f5_serverside_bitsOut serverside.bitsOut
# TYPE f5_serverside_bitsOut gauge
f5_serverside_bitsOut{pools="/Common/h.4"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.10:80"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.11:80"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool1"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.12:80"} 0
f5_serverside_bitsOut{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.13:80"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.10:80"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.11:80"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool1"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.12:80"} 0
f5_serverside_bitsOut{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.13:80"} 0

# HELP f5_serverside_curConns serverside.curConns
# TYPE f5_serverside_curConns gauge
f5_serverside_curConns{pools="/Common/h.4"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.10:80"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.11:80"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool1"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.12:80"} 0
f5_serverside_curConns{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.13:80"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.10:80"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.11:80"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool1"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.12:80"} 0
f5_serverside_curConns{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.13:80"} 0

# HELP f5_port port
# TYPE f5_port gauge
f5_port{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.10:80"} 80
f5_port{pools="/Sample_01/A1/web_pool",members="/Sample_01/192.0.1.11:80"} 80
f5_port{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.12:80"} 80
f5_port{pools="/Sample_01/A1/web_pool1",members="/Sample_01/192.0.1.13:80"} 80
f5_port{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.10:80"} 80
f5_port{pools="/Sample_02/A1/web_pool",members="/Sample_02/192.0.2.11:80"} 80
f5_port{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.12:80"} 80
f5_port{pools="/Sample_02/A1/web_pool1",members="/Sample_02/192.0.2.13:80"} 80
`
    }
};
