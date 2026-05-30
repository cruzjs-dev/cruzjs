---
title: Kubernetes
description: Deploy CruzJS to Kubernetes with Deployments, Services, Ingress, autoscaling, and CI/CD pipelines.
---

Kubernetes is the standard for container orchestration at scale. CruzJS runs as a stateless Deployment with external PostgreSQL and Redis.

## Deployment and Service

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cruz-app
  labels:
    app: cruz-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cruz-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    metadata:
      labels:
        app: cruz-app
    spec:
      containers:
        - name: cruz-app
          image: myregistry/cruz-app:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: cruz-config
            - secretRef:
                name: cruz-secrets
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: cruz-app
spec:
  selector:
    app: cruz-app
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

## ConfigMap and Secret

Separate non-sensitive configuration from secrets:

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cruz-config
data:
  NODE_ENV: production
  REDIS_URL: redis://redis-service:6379
  S3_ENDPOINT: https://nyc3.digitaloceanspaces.com
  S3_BUCKET: my-cruz-uploads
  S3_REGION: nyc3
```

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cruz-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql://user:password@db-host:5432/cruzdb?sslmode=require
  AUTH_SECRET: your-session-encryption-key
  S3_ACCESS_KEY: your-access-key
  S3_SECRET_KEY: your-secret-key
```

:::caution
Do not commit `secret.yaml` with real values to version control. Use `kubectl create secret` or a secrets manager like Sealed Secrets or External Secrets Operator.
:::

## Migration Job

Run migrations before deploying the new application version:

```yaml
# k8s/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cruz-migrate-v1
  labels:
    app: cruz-app
    component: migration
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      containers:
        - name: migrate
          image: myregistry/cruz-app:latest
          command: ["npx", "cruz", "db", "migrate"]
          envFrom:
            - secretRef:
                name: cruz-secrets
      restartPolicy: Never
  backoffLimit: 3
```

Apply the migration job first, then roll out the new Deployment:

```bash
kubectl apply -f k8s/migration-job.yaml
kubectl wait --for=condition=complete job/cruz-migrate-v1 --timeout=120s
kubectl apply -f k8s/deployment.yaml
```

## Horizontal Pod Autoscaler

Scale pods based on CPU utilization:

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cruz-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cruz-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Ingress with TLS

Use an Ingress controller (e.g., nginx-ingress) with cert-manager for automatic Let's Encrypt certificates:

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cruz-app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: cruz-app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: cruz-app
                port:
                  number: 80
```

Install cert-manager and create a ClusterIssuer:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

```yaml
# k8s/cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: you@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

## Helm Chart Structure

For teams that want templating and release management, organize your manifests as a Helm chart:

```
helm/cruz-app/
  Chart.yaml
  values.yaml
  templates/
    deployment.yaml
    service.yaml
    ingress.yaml
    hpa.yaml
    configmap.yaml
    secret.yaml
    migration-job.yaml
```

Use `values.yaml` to parameterize image tags, replica counts, resource limits, and environment-specific configuration. Install with:

```bash
helm install cruz-app ./helm/cruz-app -f values-production.yaml
```

## Managed Kubernetes Providers

Recommended managed Kubernetes services for CruzJS:

| Provider | Service | Notes |
|----------|---------|-------|
| DigitalOcean | DOKS | Simple setup, integrates with Managed Databases and Spaces |
| Google Cloud | GKE Autopilot | Fully managed nodes, pay-per-pod pricing |
| AWS | EKS with Fargate | Serverless pods, no node management |
| Azure | AKS | Free control plane, good CI/CD integration |

All of these support the same Kubernetes manifests -- no vendor-specific changes needed.

## CI/CD: GitHub Actions

Build, push, and deploy on every merge to `main`:

```yaml
# .github/workflows/deploy-k8s.yml
name: Deploy to Kubernetes
on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      - uses: azure/k8s-set-context@v4
        with:
          kubeconfig: ${{ secrets.KUBECONFIG }}

      - name: Run migrations
        run: |
          kubectl set image job/cruz-migrate migrate=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} --local -o yaml | kubectl apply -f -
          kubectl wait --for=condition=complete job/cruz-migrate --timeout=120s

      - name: Deploy
        run: |
          kubectl set image deployment/cruz-app cruz-app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          kubectl rollout status deployment/cruz-app --timeout=300s
```

This pipeline builds the Docker image, pushes it to GitHub Container Registry, runs the migration job, and updates the Deployment with the new image tag. The rollout waits for all pods to become ready before completing.
