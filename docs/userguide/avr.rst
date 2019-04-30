.. _avr-ref:

Exporting data from AVR
=======================

As of TS version 1.3.0, you can now export AVR data. The TS declaration will be the same but the Event Listener needs to be configured to allow TS to receive AVR data from the BIG-IP system. At a high level the prerequisites include:
 
 - AVR module should be provisioned 
 - TS should have the Event Listener configured
 - AVR should be configured to send data to TS
 - The Analytics profile for HTTP or TCP should be configured and assigned to the virtual server

.. NOTE:: To see more information on AVR, see the |analytics|.




Collect HTTP data
`````````````````

1. Create an HTTP Analytics Profile.

Using TMSH:

.. code-block:: json

    create ltm profile analytics telemetry-http-analytics { collect-geo enabled collect-http-timing-metrics enabled collect-ip enabled collect-max-tps-and-throughput enabled collect-methods enabled collect-page-load-time enabled collect-response-codes enabled collect-subnets enabled collect-url enabled collect-user-agent enabled collect-user-sessions enabled publish-irule-statistics enabled }

User interface: :menuselection:`Local Traffic --> Profiles --> Analytics --> HTTP analytics`


2. Assign the analytics profile to a virtual server:

Using TMSH:

.. code-block:: json

    modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry-http-analytics { context all } }

User interface: :menuselection:`Local Traffic --> Profiles --> Analytics --> HTTP analytics`


Example AVR output for HTTP Analytics profile:

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

1. Create a TCP analytics profile. 

Using TMSH:

.. code-block:: json

    create ltm profile tcp-analytics telemetry-tcp-analytics { collect-city enabled collect-continent enabled collect-country enabled collect-nexthop enabled collect-post-code enabled collect-region enabled collect-remote-host-ip enabled collect-remote-host-subnet enabled collected-by-server-side enabled }


2. Assign the analytics profile to virtual server:

Using TMSH:

.. code-block:: json

    modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry-tcp-analytics { context all } }


Example AVR output for TCP analytics:

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

1. Create a DNS analytics profile.

Using TMSH:

.. code-block:: json

    create ltm profile dns telemetry-dns { avr-dnsstat-sample-rate 1 }


2. Assign the analytics profile to a GTM listener. 

Using TMSH:

.. code-block:: json

    modify gtm  listener <GTM_LISTENER_NAME> { profiles replace-all-with { telemetry-dns { } } }


Example AVR output for DNS analytics profile:

.. code-block:: json

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


Collect ASM data
````````````````

1. Create an ASM policy.

2. Assign ASM policy to a virtual server

User interface: :menuselection:`Local Traffic --> Virtual Servers --> VIRTUAL_SERVER_NAME --> Security --> Policies --> Application Security Policy`


Example AVR output for ASM:

.. code-block:: json

    {  
        "hostname":"hostname.hostname",
        "globalBigiqConf":"N/A",
        "ObjectTagsList":"N/A",
        "SlotId":"0",
        "errdefs_msgno":"22282308",
        "Entity":"HTTP_ASM_STATS_ALL_APPIQ",
        "AggrInterval":"30",
        "EOCTimestamp":"1556591280",
        "HitCount":"1",
        "ApplicationName":"<Unassigned>",
        "VSName":"/Common/VIRTUAL_SERVER_NAME",
        "Policy":"/Common/ASM_POLICY_NAME",
        "Action":"Legal",
        "Severity":"Informational",
        "ViolationRating":"2",
        "NetworkProtocol":"HTTP",
        "ClientIP":"N/A",
        "ClientIPRouteDomain":"0",
        "DeviceId":"0",
        "IPReputation":"N/A",
        "GeoCountry":"N/A",
        "UserName":"N/A",
        "SessionID":"18004967043998892602",
        "URL":"N/A",
        "ResponseCode":"200",
        "Method":"GET",
        "IsMobileDevice":"0",
        "DosMobileAppClientType":"Uncategorized",
        "DosMobileAppVersion":"N/A",
        "DosMobileAppDisplayName":"N/A",
        "telemetryEventCategory":"AVR"
    }


Collect AFM data
````````````````

1. Create an AFM DoS policy.

2. Assign AFM policy to a virtual server

User interface: :menuselection:`Local Traffic --> Virtual Servers --> VIRTUAL_SERVER_NAME --> Security --> Policies --> DoS Protection`


Example AVR output for AFM:

.. code-block:: json

    {  
        "hostname":"hostname.hostname",
        "SlotId":"0",
        "errdefs_msgno":"22323241",
        "STAT_SRC":"TMSTAT",
        "Entity":"AfmDosStat",
        "EOCTimestamp":"1556592720",
        "AggrInterval":"30",
        "HitCount":"3",
        "VSName":"Device",
        "AttackVectorName":"Unknown TCP option type",
        "DosProfileName":"/Common/AFM_DOS_PROFILE_NAME",
        "AttackType":"Device",
        "globalBigiqConf":"N/A",
        "AttackCount":"0",
        "TotalEvents":"0",
        "SoftwareDrops":"0",
        "HardwareDrops":"0",
        "BadActorEvents":"0",
        "BadActorDrops":"0",
        "WLEvents":"0",
        "AvgDetection":"0",
        "MinMitigation":"0",
        "MaxMitigation":"4294967295",
        "AvgBadActorDetection":"0",
        "MinBadActorMitigation":"0",
        "MaxBadActorMitigation":"4294967295",
        "telemetryEventCategory":"AVR"
    }



.. |analytics| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_analytics/manuals/product/analytics-implementations-13-1-0.html" target="_blank">BIG-IP Analytics Implementations guide</a>

