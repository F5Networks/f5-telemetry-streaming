FROM f5devcentral/f5-api-services-gateway

# Add telemetry services package
COPY ./src /var/config/rest/iapps/f5-telemetry/
COPY ./node_modules /var/config/rest/iapps/f5-telemetry/node_modules/

# Define ports required
EXPOSE 443/tcp
EXPOSE 40000/tcp