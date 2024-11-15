# Backend Data Hub

A comprehensive backend service for data analytics and reporting.

## Prerequisites

- Google Cloud Platform Account
- MongoDB Atlas Account
- Redis Cloud Account
- Node.js 18+
- Google Cloud CLI installed

## Configuration Files

1. **Service Account Keys**
   - Place in `src/config/` directory:
     - `ga4-credentials.json` (Google Analytics)
     - `google-ads.json` (Google Ads API)

2. **Environment Variables**
   Create a `.env` file based on `.env.example`:
   ```env
   PORT=3000
   NODE_ENV=production
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_jwt_refresh_secret

   # Redis
   REDIS_HOST=your_redis_host
   REDIS_PORT=your_redis_port
   REDIS_PASSWORD=your_redis_password

   # Google Analytics 4
   GA4_PROPERTY_ID=G-V8T1NRDNC6
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=src/config/ga4-credentials.json

   # Google Search Console
   SEARCH_CONSOLE_SITE_URL=https://your-site-url.com

   # Google Ads API
   GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
   GOOGLE_ADS_CLIENT_ID=your-oauth2-client-id
   GOOGLE_ADS_CLIENT_SECRET=your-oauth2-client-secret
   GOOGLE_ADS_REFRESH_TOKEN=your-refresh-token
   GOOGLE_ADS_CUSTOMER_ID=your-customer-id
   GOOGLE_ADS_LOGIN_CUSTOMER_ID=your-manager-customer-id

   # Gmail API
   GMAIL_USER=chat@appraisily.com

   # Netlify API
   NETLIFY_ACCESS_TOKEN=your-netlify-access-token
   NETLIFY_SITE_ID=your-site-id
   ```

## Setup Instructions

### 1. MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Configure network access (whitelist IPs)
4. Create a database user
5. Get your connection string
6. Add connection string to `.env`

### 2. Redis Cloud Setup

1. Create a Redis Cloud account
2. Create a new subscription
3. Create a new database
4. Get connection details
5. Add Redis credentials to `.env`

### 3. Google Cloud Setup

1. Create a new project:
   ```bash
   gcloud projects create your-project-id
   gcloud config set project your-project-id
   ```

2. Enable required APIs:
   ```bash
   gcloud services enable \
     cloudbuild.googleapis.com \
     run.googleapis.com \
     cloudmonitoring.googleapis.com \
     cloudtrace.googleapis.com \
     cloudprofiler.googleapis.com
   ```

3. Create service account:
   ```bash
   gcloud iam service-accounts create backend-data-hub \
     --display-name="Backend Data Hub Service Account"
   ```

4. Grant permissions:
   ```bash
   gcloud projects add-iam-policy-binding your-project-id \
     --member="serviceAccount:backend-data-hub@your-project-id.iam.gserviceaccount.com" \
     --role="roles/monitoring.metricWriter"
   ```

### 4. Cloud Run Deployment

1. Build and deploy:
   ```bash
   gcloud builds submit --tag gcr.io/your-project-id/backend-data-hub
   
   gcloud run deploy backend-data-hub \
     --image gcr.io/your-project-id/backend-data-hub \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --service-account backend-data-hub@your-project-id.iam.gserviceaccount.com \
     --set-env-vars "NODE_ENV=production" \
     --set-secrets "MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest"
   ```

2. Set up continuous deployment (optional):
   ```bash
   gcloud beta builds triggers create github \
     --repo-owner=your-github-username \
     --repo-name=backend-data-hub \
     --branch-pattern=main \
     --build-config=cloudbuild.yaml
   ```

### 5. Cloud Monitoring Setup

1. Create uptime check:
   ```bash
   gcloud monitoring uptime-check-configs create backend-data-hub-http \
     --display-name="Backend Data Hub HTTP" \
     --http-check=host=your-cloud-run-url
   ```

2. Create alert policy:
   ```bash
   gcloud alpha monitoring policies create \
     --display-name="Backend Data Hub Alerts" \
     --conditions="metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\""
   ```

## API Documentation

API documentation is available at `/api/docs` when running in development mode.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

## Environment Variables Management

For Cloud Run, manage secrets securely:

```bash
# Create secrets
gcloud secrets create mongodb-uri --data-file=./mongodb-uri.txt
gcloud secrets create jwt-secret --data-file=./jwt-secret.txt

# Grant access to service account
gcloud secrets add-iam-policy-binding mongodb-uri \
  --member="serviceAccount:backend-data-hub@your-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Monitoring & Logging

1. View logs:
   ```bash
   gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=backend-data-hub"
   ```

2. View metrics:
   ```bash
   gcloud monitoring dashboards create --config-from-file=dashboard.json
   ```

## Security Considerations

1. Enable Cloud Armor (DDoS protection):
   ```bash
   gcloud compute security-policies create backend-data-hub-policy
   gcloud compute security-policies rules create 1000 \
     --security-policy=backend-data-hub-policy \
     --expression="evaluatePreconfiguredExpr('xss-stable')" \
     --action=deny-403
   ```

2. Configure VPC Service Controls (if needed):
   ```bash
   gcloud resource-manager service-perimeter create backend-perimeter \
     --title="Backend Data Hub Perimeter" \
     --resources="projects/your-project-number" \
     --restricted-services="run.googleapis.com"
   ```

## Troubleshooting

Common issues and solutions:

1. **Connection Issues**
   - Check MongoDB Atlas network access settings
   - Verify Redis connection string
   - Ensure service account has necessary permissions

2. **Performance Issues**
   - Check Cloud Run instance configuration
   - Monitor Redis cache hit rates
   - Review MongoDB Atlas metrics

3. **Deployment Issues**
   - Verify Cloud Build configuration
   - Check service account permissions
   - Review build logs

## Support

For issues and feature requests, please create an issue in the repository.

## License

MIT