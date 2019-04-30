.. _avr-ref:

Exporting data from AVR
=======================

As of TS version 1.3.0, you can now export AVR data. The TS declaration will be the same but the Event Listener needs to be configured to allow TS to receive AVR data from the BIG-IP system. At a high level the prerequisites include:

 - AVR module should be provisioned 
 - TS should have the Event Listener configured
 - AVR should be configured to send data to TS
 - The Analytics profile for HTTP or TCP should be configured and assigned to the virtual server

.. NOTE:: To see more information on AVR, see the |analytics|.

1. Collect HTTP data by running the following TMSH command:

.. code-block:: json

    create ltm profile analytics telemetry-http-analytics { collect-geo enabled collect-http-timing-metrics enabled collect-ip enabled collect-max-tps-and-throughput enabled collect-methods enabled collect-page-load-time enabled collect-response-codes enabled collect-subnets enabled collect-url enabled collect-user-agent enabled collect-user-sessions enabled publish-irule-statistics enabled }

2. Assign the analytics profile to a virtual server by funning the following TMSH command:

.. code-block:: json

    modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry-http-analytics { context all } }



Example AVR output:

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




.. |analytics| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_analytics/manuals/product/analytics-implementations-13-1-0.html" target="_blank">BIG-IP Analytics Implementations guide</a>

