# ArgoCD Deployment Guide

This guide explains how to deploy the Task Management System using ArgoCD.

## Prerequisites

1. **ArgoCD installed** on your Kubernetes cluster
2. **Git repository** with this code pushed
3. **AWS EKS cluster** with:
   - AWS Load Balancer Controller installed
   - External DNS (optional, for automatic Route53 records)
   - IRSA configured for SES access

## Directory Structure

```
k8s/
├── kustomization.yaml          # Kustomize configuration
├── namespace.yaml              # Namespace definition
├── configmap.yaml              # Application configuration
├── secrets.yaml                # Sensitive data (base64 encoded)
├── mongodb.yaml                # MongoDB database
├── postgres.yaml               # PostgreSQL database
├── redis.yaml                  # Redis cache
├── user-service.yaml           # User authentication service
├── task-service.yaml           # Task management service
├── notification-service.yaml   # Email notification service
├── frontend.yaml               # React frontend
└── ingress.yaml                # ALB ingress with HTTPS
```

## Setup Steps

### 1. Update Configuration Files

Before deploying, update these values in the k8s folder:

**In all service YAML files (user-service.yaml, task-service.yaml, notification-service.yaml, frontend.yaml):**
- Replace `982424467695` with your AWS Account ID
- Replace `ap-south-1` with your AWS Region

**In notification-service.yaml:**
- Update `eks.amazonaws.com/role-arn` with your IAM role ARN
- Update `SES_FROM_EMAIL` and `TASK_OWNER_EMAIL` with your verified SES emails
- Update `AWS_REGION` if different

**In ingress.yaml:**
- Update `alb.ingress.kubernetes.io/certificate-arn` with your ACM certificate ARN
- Update `external-dns.alpha.kubernetes.io/hostname` with your domain(s)
- Update host rules with your domain

### 2. Push to Git Repository

```bash
git add k8s/
git commit -m "Add ArgoCD-ready Kubernetes manifests"
git push origin main
```

### 3. Update ArgoCD Application Manifest

Edit `argocd-application.yaml`:

```yaml
source:
  repoURL: https://github.com/YOUR_USERNAME/YOUR_REPO.git  # Your Git repo
  targetRevision: main  # Your branch name
  path: k8s
```

### 4. Deploy with ArgoCD

**Option A: Using kubectl**
```bash
kubectl apply -f argocd-application.yaml
```

**Option B: Using ArgoCD UI**
1. Open ArgoCD UI
2. Click "New App"
3. Fill in:
   - Application Name: `task-management`
   - Project: `default`
   - Sync Policy: `Automatic`
   - Repository URL: Your Git repo URL
   - Path: `k8s`
   - Cluster: `https://kubernetes.default.svc`
   - Namespace: `task-management`
4. Click "Create"

### 5. Monitor Deployment

**Check ArgoCD UI:**
```bash
# Get ArgoCD admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Open browser: https://localhost:8080
# Username: admin
# Password: (from above command)
```

**Check application status:**
```bash
argocd app get task-management
argocd app sync task-management  # Manual sync if needed
```

**Check pods:**
```bash
kubectl get pods -n task-management
kubectl get svc -n task-management
kubectl get ingress -n task-management
```

## Key Differences from k8s-deployment.yaml

The k8s folder structure now matches your working `k8s-deployment.yaml`:

✅ **Added initContainers** for service dependencies
✅ **Added ServiceAccount** for notification service (IRSA)
✅ **Updated to SES configuration** (removed SMTP)
✅ **Added HTTPS/SSL** configuration in ingress
✅ **Matched resource allocations** exactly
✅ **Matched replica counts** (all set to 1)
✅ **Removed HPA** from task-service
✅ **Simplified ConfigMap** (removed redundant URLs)
✅ **Cleaned up Secrets** (removed SMTP credentials)

## ArgoCD Benefits

1. **GitOps Workflow**: All changes via Git commits
2. **Automatic Sync**: Detects and applies changes automatically
3. **Self-Healing**: Reverts manual changes to match Git state
4. **Rollback**: Easy rollback to previous Git commits
5. **Multi-Environment**: Manage dev/staging/prod from one repo
6. **Visibility**: Clear UI showing deployment status

## Troubleshooting

**App not syncing:**
```bash
argocd app sync task-management --force
```

**Check sync status:**
```bash
argocd app get task-management --refresh
```

**View logs:**
```bash
kubectl logs -n task-management deployment/user-service
kubectl logs -n task-management deployment/task-service
kubectl logs -n task-management deployment/notification-service
```

**Delete and recreate:**
```bash
argocd app delete task-management
kubectl apply -f argocd-application.yaml
```

## Making Updates

1. Update files in the `k8s/` folder
2. Commit and push to Git
3. ArgoCD automatically detects and syncs changes
4. Monitor in ArgoCD UI

## Notes

- The `kustomization.yaml` file defines the deployment order
- Secrets are base64 encoded (not encrypted) - consider using Sealed Secrets or External Secrets Operator for production
- The namespace is created automatically by ArgoCD
- All services use ClusterIP (internal only), exposed via Ingress
