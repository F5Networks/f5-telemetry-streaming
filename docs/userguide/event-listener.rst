.. _eventlistener-ref:

Event Listener class
====================

The Telemetry Streaming Event Listener collects event logs from all BIG-IP sources, including LTM, ASM, AFM, APM, and AVR. You can configure all of these by POSTing a single AS3 declaration or you can use TMSH or the GUI to configure individual modules. Below you will find an example AS3 declaration as well as instructions for configuring each module.


.. _configurelogpubas3-ref:

Configure Logging using AS3
---------------------------

Use Application Services Extension 3.10.0 or greater. For more information, see |as3docs|.

.. code-block:: json
   :linenos:

   {
        "class": "ADC",
        "schemaVersion": "3.10.0",
        "remark": "Example depicting creation of BIG-IP module log profiles",
        "Common": {
            "Shared": {
                "class": "Application",
                "template": "shared",
                "telemetry_local_rule": {
                    "remark": "Only required when TS is a local listener",
                    "class": "iRule",
                    "iRule": "when CLIENT_ACCEPTED {\n  node 127.0.0.1 6514\n}"
                },
                "telemetry_local": {
                    "remark": "Only required when TS is a local listener",
                    "class": "Service_TCP",
                    "virtualAddresses": [
                        "255.255.255.254"
                    ],
                    "virtualPort": 6514,
                    "iRules": [
                        "telemetry_local_rule"
                    ]
                },
                "telemetry": {
                    "class": "Pool",
                    "members": [
                        {
                            "enable": true,
                            "serverAddresses": [
                                "255.255.255.254"
                            ],
                            "servicePort": 6514
                        }
                    ],
                    "monitors": [
                        {
                            "bigip": "/Common/tcp"
                        }
                    ]
                },
                "telemetry_hsl": {
                    "class": "Log_Destination",
                    "type": "remote-high-speed-log",
                    "protocol": "tcp",
                    "pool": {
                        "use": "telemetry"
                    }
                },
                "telemetry_formatted": {
                    "class": "Log_Destination",
                    "type": "splunk",
                    "forwardTo": {
                        "use": "telemetry_hsl"
                    }
                },
                "telemetry_publisher": {
                    "class": "Log_Publisher",
                    "destinations": [
                        {
                            "use": "telemetry_formatted"
                        }
                    ]
                },
                "telemetry_traffic_log_profile": {
                    "class": "Traffic_Log_Profile",
                    "requestSettings": {
                        "requestEnabled": true,
                        "requestProtocol": "mds-tcp",
                        "requestPool": {
                            "use": "telemetry"
                        },
                        "requestTemplate": "event_source=\"request_logging\",hostname=\"$BIGIP_HOSTNAME\",client_ip=\"$CLIENT_IP\",server_ip=\"$SERVER_IP\",http_method=\"$HTTP_METHOD\",http_uri=\"$HTTP_URI\",virtual_name=\"$VIRTUAL_NAME\",event_timestamp=\"$DATE_HTTP\""
                    }
                },
                "telemetry_security_log_profile": {
                    "class": "Security_Log_Profile",
                    "application": {
                        "localStorage": false,
                        "remoteStorage": "splunk",
                        "protocol": "tcp",
                        "servers": [
                            {
                                "address": "255.255.255.254",
                                "port": "6514"
                            }
                        ],
                        "storageFilter": {
                            "requestType": "illegal-including-staged-signatures"
                        }
                    },
                    "network": {
                        "publisher": {
                            "use": "telemetry_publisher"
                        },
                        "logRuleMatchAccepts": false,
                        "logRuleMatchRejects": true,
                        "logRuleMatchDrops": true,
                        "logIpErrors": true,
                        "logTcpErrors": true,
                        "logTcpEvents": true
                    }
                }
            }
        }
    }




The Request Logging profile gives you the ability to configure data within a log file for HTTP requests and responses, in accordance with specified parameters.


Configure Logging Using tmsh
----------------------------


LTM Request Log profile
```````````````````````

To configure an LTM request profile, use these tmsh commands:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Note:

  All keys should be in lower case to enable classication (tenant/application).

1. Create a pool in tmsh: 

.. code-block:: python

    create ltm pool telemetry-local monitor tcp members replace-all-with { 192.0.2.1:6514 }

Replace the example address with a valid Telemetry Streaming listener address, for example the mgmt IP.

2. Create an LTM Request Log Profile using the following TMSH command. Note: If you are creating the profile in the user interface, the ``\`` are not required. 

.. code-block:: python

    create ltm profile request-log telemetry request-log-pool telemetry request-log-protocol mds-tcp request-log-template event_source=\"request_logging\",hostname=\"$BIGIP_HOSTNAME\",client_ip=\"$CLIENT_IP\",server_ip=\"$SERVER_IP\",http_method=\"$HTTP_METHOD\",http_uri=\"$HTTP_URI\",virtual_name=\"$VIRTUAL_NAME\",event_timestamp=\"$DATE_HTTP\" request-logging enabled

3. Attach the profile to the virtual server, for example:

.. NOTE:: The example below shows a snippet of an AS3 declaration.

.. code-block:: python
   :linenos:

    {
      "serviceMain": {
        "class": "Service_HTTP",
        "virtualAddresses": ["192.0.2.1"],
        "virtualPort": 80,
        "profileTrafficLog": {
          "bigip": "/Common/telemetry"
        }
      }
    }


Example Output:

.. code-block:: json
   :linenos:

    {
        "event_source":"request_logging",
        "event_timestamp":"2019-01-01:01:01.000Z",
        "hostname":"hostname",
        "client_ip":"177.47.192.42",
        "server_ip":"",
        "http_method":"GET",
        "http_uri":"/",
        "virtual_name":"/Common/app.app/app_vs",
        "tenant":"Common",
        "application":"app.app",
        "telemetryEventCategory": "event"
    }


AFM Request Log profile
```````````````````````

1. Create and :ref:`configurelogpub-ref`.

2. Create a Security Log Profile using TMSH or :ref:`configurelogpubas3-ref`:

.. code-block:: python
   
   create security log profile telemetry network replace-all-with { telemetry { filter { log-acl-match-drop enabled log-acl-match-reject enabled } publisher telemetry_publisher } }


3. Attach the profile to the virtual server, for example:

.. code-block:: python
   :linenos:

    {
        "serviceMain": {
            "class": "Service_HTTP",
            "virtualAddresses": ["192.0.2.1"],
            "virtualPort": 80,
            "securityLogProfiles": [
                {
                    "bigip": "/Common/telemetry"
                }
            ]
        }
    }


Example output:

.. code-block:: json
   :linenos:

    {
        "acl_policy_name":"/Common/app",
        "acl_policy_type":"Enforced",
        "acl_rule_name":"ping",
        "action":"Reject",
        "hostname":"telemetry.bigip.com",
        "bigip_mgmt_ip":"10.0.1.100",
        "context_name":"/Common/app.app/app_vs",
        "context_type":"Virtual Server",
        "date_time":"2019-01-01T01:01:01Z",
        "dest_fqdn":"unknown",
        "dest_ip":"10.0.2.101",
        "dst_geo":"Unknown",
        "dest_port":"80",
        "device_product":"Advanced Firewall Module",
        "device_vendor":"F5",
        "device_version":"14.0.0.1.0.0.2",
        "drop_reason":"Policy",
        "errdefs_msgno":"23003137",
        "errdefs_msg_name":"Network Event",
        "flow_id":"0000000000000000",
        "ip_protocol":"TCP",
        "severity":"8",
        "partition_name":"Common",
        "route_domain":"0",
        "sa_translation_pool":"",
        "sa_translation_type":"",
        "source_fqdn":"unknown",
        "source_ip":"50.206.82.144",
        "src_geo":"US/Washington",
        "source_port":"62204",
        "source_user":"unknown",
        "source_user_group":"unknown",
        "translated_dest_ip":"",
        "translated_dest_port":"",
        "translated_ip_protocol":"",
        "translated_route_domain":"",
        "translated_source_ip":"",
        "translated_source_port":"",
        "translated_vlan":"",
        "vlan":"/Common/external",
        "send_to_vs":"",
        "tenant":"Common",
        "application":"app.app",
        "telemetryEventCategory":"event"
    }



ASM Log
```````

1. Create a Security Log Profile using either TMSH or :ref:`configurelogpubas3-ref`:

.. code-block:: python
   
   create security log profile telemetry application replace-all-with { telemetry { filter replace-all-with { request-type { values replace-all-with { all } } } logger-type remote remote-storage splunk servers replace-all-with { 255.255.255.254:6514 {} } } }

2. Attach the profile to the virtual server, for example:

.. code-block:: json

    {
        "serviceMain": {
            "class": "Service_HTTP",
            "virtualAddresses": ["192.0.2.1"],
            "virtualPort": 80,
            "securityLogProfiles": [
                {
                    "bigip": "/Common/telemetry"
                }
            ]
        }
    }


Example output:

.. code-block:: json
   :linenos:

    {
        "hostname":"hostname",
        "management_ip_address":"10.0.1.4",
        "management_ip_address_2":"",
        "http_class_name":"/Common/app.app/app_policy",
        "web_application_name":"/Common/app.app/app_policy",
        "policy_name":"/Common/app.app/app_policy",
        "policy_apply_date":"2018-11-19 22:17:57",
        "violations":"Evasion technique detected",
        "support_id":"1730614276869062795",
        "request_status":"blocked",
        "response_code":"0",
        "ip_client":"50.206.82.144",
        "route_domain":"0",
        "method":"GET",
        "protocol":"HTTP",
        "query_string":"",
        "x_forwarded_for_header_value":"50.206.82.144",
        "sig_ids":"",
        "sig_names":"",
        "date_time":"2018-11-19 22:34:40",
        "severity":"Critical",
        "attack_type":"Detection Evasion,Path Traversal",
        "geo_location":"US",
        "ip_address_intelligence":"N/A",
        "username":"N/A",
        "session_id":"f609d8a924419638",
        "src_port":"49804",
        "dest_port":"80",
        "dest_ip":"10.0.2.10",
        "sub_violations":"Evasion technique detected:Directory traversals",
        "virus_name":"N/A",
        "violation_rating":"3",
        "websocket_direction":"N/A",
        "websocket_message_type":"N/A",
        "device_id":"N/A",
        "staged_sig_ids":"",
        "staged_sig_names":"",
        "threat_campaign_names":"",
        "staged_threat_campaign_names":"",
        "blocking_exception_reason":"N/A",
        "captcha_result":"not_received",
        "uri":"/directory/file",
        "fragment":"",
        "request":"GET /admin/..%2F..%2F..%2Fdirectory/file HTTP/1.0\\r\\nHost: host.westus.cloudapp.azure.com\\r\\nConnection: keep-alive\\r\\nCache-Control: max-age",
        "tenant":"Common",
        "application":"app.app",
        "telemetryEventCategory": "event"
    }


APM Log
```````

1. Create and :ref:`configurelogpub-ref` or :ref:`configurelogpubas3-ref`.

2. Create an APM Log Profile. For example:

.. code-block:: python
   
   create apm log-setting telemetry access replace-all-with { access { publisher telemetry-publisher } }

3. Attach the profile to the APM policy.

4. Attach the APM policy to the virtual server. The example below shows an AS3 snippet:

.. code-block:: python
   :linenos:

       {
        "serviceMain": {
            "class": "Service_HTTP",
            "virtualAddresses": ["192.0.2.1"],
            "virtualPort": 80,
            "policyIAM": {
                "bigip": "/Common/my_apm_policy"
            }
        }
    }

Example output:

.. code-block:: json
   :linenos:

    {
        "hostname":"telemetry.bigip.com",
        "errdefs_msgno":"01490102:5:",
        "partition_name":"Common",
        "session_id":"ec7fd55d",
        "Access_Profile":"/Common/access_app",
        "Partition":"Common",
        "Session_Id":"ec7fd55d",
        "Access_Policy_Result":"Logon_Deny",
        "tenant":"Common",
        "application":"",
        "telemetryEventCategory":"event"
    }


.. _avr-ref:

AVR Log
```````

As of TS version 1.3.0, you can now export AVR data. The TS declaration will be the same but the Event Listener needs to be configured to allow TS to receive AVR data from the BIG-IP system. At a high level the prerequisites include:
 
 - AVR module should be provisioned 
 - TS should have the Event Listener configured
 - AVR should be configured to send data to TS
 - The Analytics profile for HTTP or TCP should be configured and assigned to the virtual server

.. NOTE:: To see more information on AVR, see the |analytics|.



Modify system logging configuration to update what gets logged buy running the following commands in TMSH:

For BIG-IP version 13.X: 

.. code-block:: python

    modify analytics global-settings { ecm-address 127.0.0.1 ecm-port 6514 use-ecm enabled use-offbox enabled }

.. NOTE:: You may need to run the command ``bigstart restart avrds`` after running this command on BIG-IP version 13.X.


For BIG-IP version 14.X: 

.. code-block:: python

    modify analytics global-settings { offbox-protocol tcp offbox-tcp-addresses add { 127.0.0.1 } offbox-tcp-port 6514 use-offbox enabled }


Example output of AVR basic data:

.. code-block:: json
   :linenos:

    {
        "hostname": "telemetry-bigip-14-0.localhost",
        "errdefs_msgno": "22282286",
        "Entity": "SystemMonitor",
        "AggrInterval": "30",
        "EOCTimestamp": "1555572150",
        "HitCount": "1",
        "SlotId": "0",
        "CpuHealth": "54",
        "AvgCpu": "5487",
        "AvgCpuDataPlane": "0",
        "AvgCpuControlPlane": "0",
        "AvgCpuAnalysisPlane": "0",
        "MaxCpu": "5487",
        "MemoryHealth": "53",
        "AvgMemory": "5343",
        "ThroughputHealth": "0",
        "TotalBytes": "0",
        "AvgThroughput": "0",
        "ConcurrentConnectionsHealth": "0",
        "AvgConcurrentConnections": "0",
        "MaxConcurrentConnections": "0",
        "telemetryEventCategory": "AVR"
    }


Collect HTTP data
`````````````````

1. Collect HTTP data:

Using TMSH:

.. code-block:: json

    create ltm profile analytics telemetry-http-analytics { collect-geo enabled collect-http-timing-metrics enabled collect-ip enabled collect-max-tps-and-throughput enabled collect-methods enabled collect-page-load-time enabled collect-response-codes enabled collect-subnets enabled collect-url enabled collect-user-agent enabled collect-user-sessions enabled publish-irule-statistics enabled }

User interface: :menuselection:`Local Traffic --> Profiles --> Analytics --> HTTP analytics`


2. Assign the analytics profile to a virtual server:

Using TMSH:

.. code-block:: json

    modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry-http-analytics { context all } }

User interface: :menuselection:`Local Traffic --> Profiles --> Analytics --> HTTP analytics`


Example AVR output for HTTP Analytics Profile:

.. code-block:: json
   :linenos:

    {
        "hostname":"hostname.hostname",
        "SlotId":"0",
        "errdefs_msgno":"22282245",
        "Entity":"OffboxAll",
        "Module":"http",
        "AVRProfileName":"/Common/telemetry-http-analytics",
        "AggrInterval":"30",
        "EOCTimestamp":"1556577360",
        "HitCount":"678",
        "ApplicationName":"<Unassigned>",
        "VSName":"/Common/VIRTUAL_SERVER_NAME",
        "POOLIP":"X.X.X.X",
        "POOLIPRouteDomain":"0",
        "POOLPort":"YYYY",
        "URL":"/",
        "ResponseCode":"200",
        "BrowserName":"N/A",
        "OsName":"N/A",
        "ClientIP":"Z.Z.Z.Z",
        "ClientIPRouteDomain":"0",
        "SubnetName":"",
        "SubnetIP":"A.A.A.A",
        "SubnetRouteDomain":"0",
        "DeviceId":"0",
        "GeoCode":"N/A",
        "Method":"GET",
        "UserAgent":"USER_AGENT",
        "TPSMax":"23.000000",
        "ClientLatencyHitCount":"0",
        "ClientLatencyMax":"0",
        "ClientLatencyTotal":"0",
        "ServerLatencyMax":"5",
        "ServerLatencyMin":"1",
        "ServerLatencyTotal":"314",
        "ThroughputReqMaxPerSec":"14136",
        "ThroughputReqTotalPerInterval":"50172",
        "ThroughputRespMaxPerSec":"1458672",
        "ThroughputRespTotalPerInterval":"5175174",
        "UserSessionsNewTotal":"10901",
        "ServerHitcount":"678",
        "ApplicationResponseTime":"48",
        "MaxApplicationResponseTime":"4",
        "MinApplicationResponseTime":"1",
        "SosApplicationResponseTime":"84",
        "ClientTtfbHitcount":"678",
        "ClientTtfb":"922",
        "MaxClientTtfb":"15",
        "MinClientTtfb":"1",
        "SosClientTtfb":"1986",
        "ClientSideNetworkLatency":"69",
        "MaxClientSideNetworkLatency":"1",
        "MinClientSideNetworkLatency":"1",
        "SosClientSideNetworkLatency":"1",
        "ServerSideNetworkLatency":"950",
        "MaxServerSideNetworkLatency":"13",
        "MinServerSideNetworkLatency":"1",
        "SosServerSideNetworkLatency":"1794",
        "RequestDurationHitcount":"678",
        "RequestDuration":"0",
        "MaxRequestDuration":"0",
        "MinRequestDuration":"0",
        "SosRequestDuration":"0",
        "ResponseDurationHitcount":"678",
        "ResponseDuration":"157",
        "MaxResponseDuration":"3",
        "MinResponseDuration":"0",
        "SosResponseDuration":"173",
        "LatencyHistogram":"0,2,4,7,12,22,40,74,136,252,465,858,1585,2929,5412,10001,300000|635,38,5,0,0,0,0,0,0,0,0,0,0,0,0,0",
        "telemetryEventCategory":"AVR"
    }

Collect TCP data
````````````````

TMSH command:

create ltm profile tcp-analytics telemetry-tcp-analytics { collect-city enabled collect-continent enabled collect-country enabled collect-nexthop enabled collect-post-code enabled collect-region enabled collect-remote-host-ip enabled collect-remote-host-subnet enabled collected-by-server-side enabled }

Assign this analytics profile to virtual server.
TMSH command:

modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry-tcp-analytics { context all } }


Example AVR output for TCP:

    {  
        "hostname":"bigip.example.com",
        "SlotId":"0",
        "errdefs_msgno":"22323211",
        "STAT_SRC":"TMSTAT",
        "Entity":"TcpStat",
        "EOCTimestamp":"1556589630",
        "AggrInterval":"30",
        "HitCount":"3",
        "tcp_prof":"/Common/tcp",
        "vip":"/Common/VIRTUAL_SERVER_NAME",
        "globalBigiqConf":"N/A",
        "ObjectTagsList":"N/A",
        "active_conns":"0",
        "max_active_conns":"0",
        "accepts":"0",
        "accept_fails":"0",
        "new_conns":"0",
        "failed_conns":"0",
        "expired_conns":"0",
        "abandoned_conns":"0",
        "rxrst":"0",
        "rxbadsum":"0",
        "rxbadseg":"0",
        "rxooseg":"0",
        "rxcookie":"0",
        "rxbad_cookie":"0",
        "hw_cookie_valid":"0",
        "syncacheover":"0",
        "txrexmits":"0",
        "sndpack":"0",
        "tenant":"Common",
        "application":"",
        "telemetryEventCategory":"AVR"
    }


Collect DNS data
````````````````
TMSH command:

create ltm profile dns telemetry-dns { avr-dnsstat-sample-rate 1 }

Assign this analytics profile to GTM listener
TMSH command:

modify gtm  listener <GTM_LISTENER_NAME> { profiles replace-all-with { telemetry-dns { } } }


Example AVR output:

    {  
        "hostname":"hostname.hostname",
        "SlotId":"0",
        "errdefs_msgno":"22282300",
        "Entity":"DNS_Offbox_All",
        "ObjectTagsList":"N/A",
        "AggrInterval":"30",
        "EOCTimestamp":"1556578980",
        "HitCount":"4",
        "ApplicationName":"<Unassigned>",
        "VSName":"/Common/GTM_LISTENER_NAME",
        "DosProfileName":"<no-profile>",
        "AttackId":"0",
        "QueryType":"A",
        "QueryName":"example.com",
        "SourceIP":"X.X.X.X",
        "SourceIpRouteDomain":"0",
        "CountryCode":"N/A",
        "TransactionOutcome":"Valid",
        "AttackVectorName":"Not attacked",
        "AttackTriggerName":"Not attacked",
        "AttackMitigationName":"Not attacked",
        "IsInternalActivity":"0",
        "IsAttackingIp":"0",
        "telemetryEventCategory":"AVR"
    }






System Log
``````````

1. Modify the system syslog configuration by adding a destination:

Using TMSH:

.. code-block:: python

    modify sys syslog remote-servers replace-all-with { server { host 127.0.0.1 remote-port 6514 } }

User interface: :menuselection:`System --> Logs --> Configuration --> Remote Logging`

2. Modify system logging configuration to update what gets logged:

Using TMSH: 

.. code-block:: python

    modify sys daemon-log-settings mcpd audit enabled

User interface: :menuselection:`System --> Logs --> Configuration --> Options`

Example output:

.. code-block:: json
   :linenos:

    {
    "data":"<85>Feb 12 21:39:43 telemetry notice sshd[22277]: pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=218.92.1.148  user=root",
    "telemetryEventCategory":"event"
    }



.. _configurelogpub-ref:

Configure the Log Publisher using TMSH
``````````````````````````````````````

Please note the following:
 - Examples assume the TS listener is using port 6514.
 - Additional objects are required for BIG-IP configurations pointing to a local on-box listener. Notes on configuring those are noted below.
 - Per-app Virtual Edition BIG-IP limits the number of virtual servers available. To avoid creating the virtual server creating the virtual server in the following configuration, it is possible to point the pool directly at the TMM link-local IPv6 address. 

1. Create an iRule (localhost forwarder). This is only required when TS is a local listener.

.. code-block:: python
    
    when CLIENT_ACCEPTED {
        node 127.0.0.1 6514
    }

TMSH: 

.. code-block:: python

    create ltm rule telemetry_local_rule


2. Create the virtual server. This is only required when TS is a local listener.

TMSH:

.. code-block:: python

    create ltm virtual telemetry_local destination 255.255.255.254:6514 rules { telemetry_local_rule }


3. Create the pool: when TS is not a local listener, the member should be the listener's remote address.

TMSH:

.. code-block:: python

    create ltm pool telemetry monitor tcp members replace-all-with { 255.255.255.254:6514 }


4. Create the Log Destination (Remote HSL):

User interface: :menuselection:`System --> Logs --> Configuration --> Log Destinations`
 - Name: telemetry_hsl
 - Type: Remote HSL
 - Protocol: TCP
 - Pool: telemetry

TMSH:

 .. code-block:: python

    create sys log-config destination remote-high-speed-log telemetry_hsl protocol tcp pool-name telemetry


5. Create Log Destination (Format):

User interface: :menuselection:`System --> Logs --> Configuration --> Log Destinations`
 - Name: telemetry_formatted
 - Forward To: telemetry_hsl

TMSH:

 .. code-block:: python

    create sys log-config destination splunk telemetry_formatted forward-to telemetry_hsl


6. Create Log Publisher:

User interface: :menuselection:`System --> Logs --> Configuration --> Log Publishers`
 - Name: telemetry_publisher
 - Destinations: telemetry_formatted

TMSH:

 .. code-block:: python

    create sys log-config publisher telemetry_publisher destinations replace-all-with { telemetry_formatted }




.. |as3docs| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/" target="_blank">AS3 documentation</a>

.. |analytics| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_analytics/manuals/product/analytics-implementations-13-1-0.html" target="_blank">BIG-IP Analytics Implementations guide</a>

