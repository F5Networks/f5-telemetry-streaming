Advanced Options
----------------

This section explains options that you may want to configure once you are used to using Telemetry Streaming.
Tenant/App grouping
Tag allows us to classify the stats by Tenant/App

HostReachable Check


+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required?  |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| trace              | false, true, string            |   Yes      |  Useful during debug of TS because it dumps intermediate data to a file. This value can be applied to the Poller, Listener,        |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| port               | 30, **60**                     |   No       |  Hostname you want to set for this BIG-IP device. The default hostname on a new BIG-IP is **bigip1**.                              |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
