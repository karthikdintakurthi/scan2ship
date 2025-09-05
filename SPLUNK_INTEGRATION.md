# Scan2Ship Splunk Integration Guide

## Overview
This document provides comprehensive details for integrating Scan2Ship API logs with Splunk for monitoring, analytics, and alerting.

## Splunk Configuration

### 1. Splunk Universal Forwarder Setup

#### Install Universal Forwarder
```bash
# Download and install Splunk Universal Forwarder
wget https://download.splunk.com/products/universalforwarder/releases/9.0.0/linux/splunkforwarder-9.0.0-xxx-linux-2.6-x86_64.rpm
sudo rpm -i splunkforwarder-9.0.0-xxx-linux-2.6-x86_64.rpm
```

#### Configure Forwarder
```bash
# Edit inputs.conf
sudo nano /opt/splunkforwarder/etc/system/local/inputs.conf
```

```ini
[monitor:///var/log/scan2ship]
disabled = false
index = scan2ship_api
sourcetype = scan2ship:api:logs
host = scan2ship-prod
```

#### Configure Outputs
```bash
# Edit outputs.conf
sudo nano /opt/splunkforwarder/etc/system/local/outputs.conf
```

```ini
[tcpout]
defaultGroup = splunk_indexers

[tcpout:splunk_indexers]
server = splunk-indexer-1:9997,splunk-indexer-2:9997
```

### 2. Splunk Index Configuration

#### Create Index
```bash
# In Splunk Web UI or via CLI
splunk add index scan2ship_api -maxDataSizeMB 10000 -maxHotBuckets 10
```

#### Index Settings
- **Index Name**: `scan2ship_api`
- **Max Data Size**: 10GB
- **Max Hot Buckets**: 10
- **Retention**: 90 days
- **Frozen Time Period**: 30 days

### 3. Source Type Configuration

#### API Logs Source Type
```ini
# props.conf
[scan2ship:api:logs]
SHOULD_LINEMERGE = false
KV_MODE = json
TIME_PREFIX = ^
TIME_FORMAT = %Y-%m-%dT%H:%M:%S.%3N
MAX_TIMESTAMP_LOOKAHEAD = 32
TRUNCATE = 0
```

#### Field Extractions
```ini
# props.conf - Field extractions
[scan2ship:api:logs]
EXTRACT-api_method = ^\[API_(?P<api_method>[^_]+)_(?P<http_method>[^]]+)\]
EXTRACT-user_id = "userId":"(?P<user_id>[^"]+)"
EXTRACT-client_id = "clientId":"(?P<client_id>[^"]+)"
EXTRACT-order_id = "orderId":(?P<order_id>\d+)
EXTRACT-response_time = "responseTime":(?P<response_time>\d+)
EXTRACT-status_code = "statusCode":(?P<status_code>\d+)
EXTRACT-error_type = "errorType":"(?P<error_type>[^"]+)"
```

## Log Format Standards

### 1. API Request Logs
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "service": "scan2ship-api",
  "api_method": "ORDERS_POST",
  "http_method": "POST",
  "endpoint": "/api/orders",
  "user_id": "user-123",
  "client_id": "client-456",
  "request_id": "req-789",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "request_body_size": 1024,
  "response_time": 150,
  "status_code": 200,
  "success": true,
  "order_id": 12345,
  "courier_service": "DELHIVERY",
  "package_value": 1000.00,
  "credit_cost": 10,
  "credit_balance_after": 990
}
```

### 2. API Error Logs
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "ERROR",
  "service": "scan2ship-api",
  "api_method": "ORDERS_POST",
  "http_method": "POST",
  "endpoint": "/api/orders",
  "user_id": "user-123",
  "client_id": "client-456",
  "request_id": "req-789",
  "ip_address": "192.168.1.100",
  "response_time": 50,
  "status_code": 400,
  "success": false,
  "error_type": "VALIDATION_ERROR",
  "error_message": "Missing required field: mobile",
  "error_details": {
    "field": "mobile",
    "value": null,
    "validation_rule": "required"
  },
  "stack_trace": "Error: Missing required field..."
}
```

### 3. Authentication Logs
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "service": "scan2ship-api",
  "api_method": "AUTH_LOGIN",
  "http_method": "POST",
  "endpoint": "/api/auth/login",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "email": "user@example.com",
  "success": true,
  "user_id": "user-123",
  "client_id": "client-456",
  "role": "user",
  "session_id": "session-789",
  "response_time": 200
}
```

### 4. Credit Transaction Logs
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "service": "scan2ship-api",
  "api_method": "CREDITS_DEBIT",
  "transaction_type": "debit",
  "user_id": "user-123",
  "client_id": "client-456",
  "amount": 10,
  "balance_before": 1000,
  "balance_after": 990,
  "feature": "ORDER",
  "order_id": 12345,
  "description": "Order creation",
  "transaction_id": "txn-789"
}
```

### 5. External Service Logs
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "service": "scan2ship-api",
  "external_service": "DELHIVERY",
  "api_method": "DELHIVERY_CREATE_ORDER",
  "order_id": 12345,
  "client_id": "client-456",
  "request_payload": {...},
  "response_payload": {...},
  "response_time": 500,
  "status_code": 200,
  "success": true,
  "waybill_number": "WB123456",
  "delhivery_order_id": "ORD123456"
}
```

## Splunk Dashboards

### 1. API Performance Dashboard

#### Key Metrics
- **Request Volume**: Requests per minute/hour/day
- **Response Time**: Average, 95th percentile, 99th percentile
- **Error Rate**: 4xx and 5xx error percentages
- **Top Endpoints**: Most frequently called APIs
- **Client Activity**: Requests by client

#### SPL Queries
```splunk
# Request Volume by Hour
index=scan2ship_api sourcetype=scan2ship:api:logs
| timechart span=1h count by api_method

# Response Time Percentiles
index=scan2ship_api sourcetype=scan2ship:api:logs
| stats perc95(response_time) as p95, perc99(response_time) as p99, avg(response_time) as avg by api_method

# Error Rate by Endpoint
index=scan2ship_api sourcetype=scan2ship:api:logs
| eval error=if(status_code>=400, 1, 0)
| stats count as total, sum(error) as errors by endpoint
| eval error_rate=round((errors/total)*100, 2)
| sort -error_rate
```

### 2. Business Metrics Dashboard

#### Key Metrics
- **Orders Created**: Daily order creation volume
- **Credit Usage**: Credit consumption by feature
- **Client Activity**: Active clients and their usage
- **Courier Service Distribution**: Orders by courier service
- **Revenue Tracking**: Credit purchases and usage

#### SPL Queries
```splunk
# Daily Orders Created
index=scan2ship_api sourcetype=scan2ship:api:logs api_method=ORDERS_POST success=true
| timechart span=1d count by client_id

# Credit Usage by Feature
index=scan2ship_api sourcetype=scan2ship:api:logs api_method=CREDITS_DEBIT
| stats sum(amount) as total_credits by feature
| sort -total_credits

# Top Active Clients
index=scan2ship_api sourcetype=scan2ship:api:logs
| stats count as api_calls by client_id
| sort -api_calls
| head 10
```

### 3. Security Dashboard

#### Key Metrics
- **Failed Authentication Attempts**: Login failures
- **Suspicious Activity**: Unusual request patterns
- **Rate Limiting**: Rate limit violations
- **IP Address Analysis**: Requests by IP

#### SPL Queries
```splunk
# Failed Login Attempts
index=scan2ship_api sourcetype=scan2ship:api:logs api_method=AUTH_LOGIN success=false
| timechart span=1h count by ip_address

# Rate Limit Violations
index=scan2ship_api sourcetype=scan2ship:api:logs status_code=429
| stats count by client_id, ip_address
| sort -count

# Suspicious IP Activity
index=scan2ship_api sourcetype=scan2ship:api:logs
| stats count as requests, dc(client_id) as unique_clients by ip_address
| where requests > 1000 OR unique_clients > 10
| sort -requests
```

## Alerts and Monitoring

### 1. Performance Alerts

#### High Response Time Alert
```splunk
# Alert: API Response Time > 5 seconds
index=scan2ship_api sourcetype=scan2ship:api:logs
| stats avg(response_time) as avg_response_time by api_method
| where avg_response_time > 5000
```

#### High Error Rate Alert
```splunk
# Alert: Error Rate > 5%
index=scan2ship_api sourcetype=scan2ship:api:logs
| eval error=if(status_code>=400, 1, 0)
| stats count as total, sum(error) as errors by endpoint
| eval error_rate=(errors/total)*100
| where error_rate > 5
```

### 2. Business Alerts

#### Unusual Order Volume Alert
```splunk
# Alert: Order volume spike
index=scan2ship_api sourcetype=scan2ship:api:logs api_method=ORDERS_POST success=true
| timechart span=1h count
| eval change=count-prev_count
| where change > 100
```

#### Low Credit Balance Alert
```splunk
# Alert: Client credit balance < 100
index=scan2ship_api sourcetype=scan2ship:api:logs api_method=CREDITS_DEBIT
| stats latest(credit_balance_after) as current_balance by client_id
| where current_balance < 100
```

### 3. Security Alerts

#### Multiple Failed Logins Alert
```splunk
# Alert: > 5 failed logins from same IP
index=scan2ship_api sourcetype=scan2ship:api:logs api_method=AUTH_LOGIN success=false
| stats count by ip_address
| where count > 5
```

#### Unusual API Usage Pattern Alert
```splunk
# Alert: Unusual API usage pattern
index=scan2ship_api sourcetype=scan2ship:api:logs
| stats count as requests, dc(api_method) as unique_apis by client_id
| where requests > 1000 AND unique_apis < 3
```

## Splunk Apps and Add-ons

### 1. Custom App Structure
```
/opt/splunk/etc/apps/scan2ship/
├── default/
│   ├── props.conf
│   ├── transforms.conf
│   ├── savedsearches.conf
│   └── macros.conf
├── local/
│   ├── inputs.conf
│   └── outputs.conf
└── appserver/
    └── static/
        └── app.css
```

### 2. Custom Macros
```ini
# macros.conf
[scan2ship_api_calls]
definition = index=scan2ship_api sourcetype=scan2ship:api:logs

[scan2ship_errors]
definition = index=scan2ship_api sourcetype=scan2ship:api:logs status_code>=400

[scan2ship_orders]
definition = index=scan2ship_api sourcetype=scan2ship:api:logs api_method=ORDERS_POST success=true
```

### 3. Saved Searches
```ini
# savedsearches.conf
[scan2ship_daily_summary]
search = `scan2ship_api_calls` | stats count as total_requests, sum(if(success=true,1,0)) as successful_requests by client_id | eval success_rate=round((successful_requests/total_requests)*100,2)
cron_schedule = 0 0 * * *
action.email.to = admin@scan2ship.com
action.email.subject = Daily API Summary - Scan2Ship
```

## Data Retention and Archiving

### 1. Retention Policy
- **Hot Data**: 7 days (frequently accessed)
- **Warm Data**: 30 days (occasionally accessed)
- **Cold Data**: 90 days (rarely accessed)
- **Frozen Data**: 1 year (archived)

### 2. Archiving Configuration
```ini
# indexes.conf
[scan2ship_api]
homePath = $SPLUNK_DB/scan2ship_api/db
coldPath = $SPLUNK_DB/scan2ship_api/colddb
thawedPath = $SPLUNK_DB/scan2ship_api/thaweddb
maxDataSize = 10000
maxHotBuckets = 10
maxWarmDBCount = 300
frozenTimePeriodInSecs = 2592000
```

## Integration with External Tools

### 1. Slack Integration
```python
# Slack webhook for alerts
import requests
import json

def send_slack_alert(message, channel="#alerts"):
    webhook_url = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
    payload = {
        "channel": channel,
        "text": f"🚨 Scan2Ship Alert: {message}",
        "username": "Scan2Ship Monitor"
    }
    requests.post(webhook_url, json=payload)
```

### 2. PagerDuty Integration
```ini
# savedsearches.conf
[scan2ship_critical_error]
search = `scan2ship_errors` status_code>=500
action.pagerduty = 1
action.pagerduty.integration_key = YOUR_PAGERDUTY_KEY
```

### 3. Email Notifications
```ini
# savedsearches.conf
[scan2ship_weekly_report]
search = `scan2ship_api_calls` | timechart span=1d count | stats avg(count) as avg_daily_requests, max(count) as peak_requests
cron_schedule = 0 9 * * 1
action.email.to = team@scan2ship.com
action.email.subject = Weekly API Report - Scan2Ship
```

## Troubleshooting

### 1. Common Issues

#### Logs Not Appearing in Splunk
```bash
# Check forwarder status
sudo /opt/splunkforwarder/bin/splunk status

# Check inputs configuration
sudo /opt/splunkforwarder/bin/splunk list input

# Check network connectivity
telnet splunk-indexer 9997
```

#### High Index Volume
```splunk
# Check index size
| dbinspect index=scan2ship_api
| stats sum(sizeOnDiskMB) as total_size_mb

# Identify high-volume sources
index=scan2ship_api | stats count by sourcetype, source
| sort -count
```

### 2. Performance Optimization

#### Index Optimization
```ini
# indexes.conf
[scan2ship_api]
maxDataSize = 10000
maxHotBuckets = 10
maxWarmDBCount = 300
maxTotalDataSizeMB = 100000
```

#### Search Optimization
```splunk
# Use indexed fields for faster searches
index=scan2ship_api client_id=client-123 api_method=ORDERS_POST

# Use time-based searches
index=scan2ship_api earliest=-1h@h latest=@h
```

## Security Considerations

### 1. Data Privacy
- **PII Masking**: Mask sensitive data in logs
- **Access Control**: Restrict access to sensitive dashboards
- **Audit Logging**: Log all Splunk access

### 2. Network Security
- **TLS Encryption**: Use encrypted connections
- **Firewall Rules**: Restrict access to Splunk ports
- **VPN Access**: Require VPN for remote access

### 3. Compliance
- **GDPR**: Ensure data retention compliance
- **SOC 2**: Maintain audit trails
- **PCI DSS**: Secure handling of payment data

## Cost Optimization

### 1. Data Volume Management
- **Log Filtering**: Filter unnecessary logs at source
- **Data Compression**: Enable compression for cold storage
- **Retention Policies**: Implement aggressive retention

### 2. License Management
- **Volume Monitoring**: Monitor daily license usage
- **Data Archiving**: Archive old data to reduce license costs
- **Index Optimization**: Optimize index sizes

## Support and Maintenance

### 1. Regular Maintenance
- **Index Health Checks**: Weekly index health monitoring
- **Performance Tuning**: Monthly performance optimization
- **Backup Verification**: Daily backup verification

### 2. Documentation Updates
- **Change Log**: Maintain change documentation
- **Runbooks**: Update operational runbooks
- **Training**: Regular team training sessions

This comprehensive Splunk integration guide provides everything needed to effectively monitor and analyze Scan2Ship API logs for operational excellence and business insights.
