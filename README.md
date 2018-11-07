# Introduction

Telemetry Services is an iControl LX extension to stream telemetry from BIG-IP(s) to analytics consumers such as Splunk, Kafka, etc.

## Container

This project builds a container, here are the current steps to build and run that container. Note: Additional steps TBD around pushing to docker hub, etc.

Build: ```docker build . -t f5-telemetry``` - From root folder of this project

Run: ```docker run --rm -d -p 443:443/tcp -p 40000:40000/tcp f5-telemetry:latest```

Attach Shell: ```docker exec -it <running container name> /bin/sh```