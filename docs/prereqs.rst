Prerequisites and Requirements
------------------------------

The following are prerequisites for using F5 BIG-IP Telemetry Streaming:

- You must be using BIG-IP version 15.1 or later to use F5 BIG-IP Telemetry Streaming.
  F5 BIG-IP Telemetry Streaming is not intended to work on BIG-IP versions that have reached End of Life.
  See `here <https://support.f5.com/csp/article/K5903>`_ for more information about BIG-IP versions supported by F5.

.. IMPORTANT:: Beginning with BIG-IP Telemetry Streaming version 1.36.0 BIG-IP Telemetry Streaming no longer supports BIG-IP 13.1 to 15.0.x. However, if you are still using the BIG-IP 13.1 to 15.0.x versions, you can use BIG-IP Telemetry Streaming 1.35.0 or earlier.

- To install and configure F5 BIG-IP Telemetry Streaming, your BIG-IP user account must have the **Administrator**
  role.

  - See the :ref:`prometheus` documentation for more information on configuring a read-only account for pull consumers

- You must have a configured consumer that will receive the data.
- You should be familiar with the F5 BIG-IP and F5 terminology.  For
  general information and documentation on the BIG-IP system, see the
  `F5 Knowledge Center <https://my.f5.com/manage/s/tech-documents>`_.
