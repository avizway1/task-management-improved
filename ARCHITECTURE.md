# System Architecture

## Overview

The Task Management System is built using a microservices architecture designed to demonstrate enterprise-level EKS deployment patterns and best practices.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐
│   Internet      │    │   AWS ALB       │
│   Users         │────│   Ingress       │
└─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Frontend      │
                       │   (React.js)    │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   API Gateway   │
                       │   (Kong/Nginx)  │
                       └─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│User Service │        │Task Service │        │Notification │
│(Node.js)    │        │(Node.js)    │        │Service      │
│             │        │             │        │(Node.js)    │
└─────────────┘        └─────────────┘        └─────────────┘
        │                       │                       │
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  MongoDB    │        │ PostgreSQL  │        │   Redis     │
│             │        │             │        │             │
└─────────────┘        └─────────────┘        └─────────────┘
```

## Components

### Frontend Layer
- **React.js Application**: Modern SPA with Material-UI
- **Features**: Task management, user authentication, responsive design
- **Deployment**: Nginx container serving static files

### API Gateway
- **Purpose**: Single entry point for all API requests
- **Features**: Load balancing, rate limiting, authentication
- **Technology**: Kong or Nginx

### Microservices

#### User Service
- **Responsibility**: User authentication and management
- **Database**: MongoDB
- **Features**: JWT authentication, user profiles, role management
- **Port**: 3001

#### Task Service
- **Responsibility**: Task CRUD operations and management
- **Database**: PostgreSQL
- **Features**: Task creation, updates, status tracking, priorities
- **Port**: 3002

#### Notification Service
- **Responsibility**: Email and push notifications
- **Database**: Redis (for queuing)
- **Features**: Email notifications, task reminders, real-time updates
- **Port**: 3003

#### Analytics Service
- **Responsibility**: Task analytics and reporting
- **Database**: PostgreSQL (shared with Task Service)
- **Features**: Task statistics, trends, productivity metrics, priority distribution
- **Port**: 3004

### Data Layer

#### PostgreSQL
- **Purpose**: Primary database for task data
- **Features**: ACID compliance, complex queries, relationships
- **Persistence**: EBS volumes via PVC

#### MongoDB
- **Purpose**: User data and session management
- **Features**: Flexible schema, horizontal scaling
- **Persistence**: EBS volumes via PVC

#### Redis
- **Purpose**: Caching and message queuing
- **Features**: In-memory performance, pub/sub messaging
- **Persistence**: Optional persistence for queues

## EKS Infrastructure

### Kubernetes Resources

#### Deployments
- **Frontend**: 2 replicas, resource limits
- **User Service**: 3 replicas, HPA enabled
- **Task Service**: 3 replicas, HPA enabled
- **Notification Service**: 2 replicas, HPA enabled
- **Analytics Service**: 1 replica, HPA enabled
- **Databases**: 1 replica each with persistent storage

#### Services
- **ClusterIP**: Internal service discovery
- **LoadBalancer**: External access via ALB

#### ConfigMaps & Secrets
- **ConfigMaps**: Non-sensitive configuration
- **Secrets**: Database credentials, JWT secrets, API keys

#### Persistent Volumes
- **Storage Class**: gp2 (EBS)
- **Access Mode**: ReadWriteOnce
- **Backup**: EBS snapshots

#### Horizontal Pod Autoscaler
- **Metrics**: CPU (70%), Memory (80%)
- **Min Replicas**: 2
- **Max Replicas**: 10

### Security

#### Network Policies
- Restrict inter-pod communication
- Database access only from authorized services

#### RBAC
- Service accounts with minimal permissions
- Role-based access control

#### Container Security
- Non-root user containers
- Read-only root filesystem where possible
- Security contexts and capabilities

## Scalability

### Horizontal Scaling
- **HPA**: Automatic scaling based on metrics
- **Manual**: kubectl scale commands
- **Database**: Read replicas for PostgreSQL

### Vertical Scaling
- **Resource Requests/Limits**: Defined for all containers
- **VPA**: Vertical Pod Autoscaler (optional)

## Monitoring & Observability

### Health Checks
- **Liveness Probes**: Container health
- **Readiness Probes**: Service availability
- **Startup Probes**: Slow-starting containers

### Metrics
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **CloudWatch**: AWS native monitoring

### Logging
- **Centralized Logging**: ELK stack or CloudWatch Logs
- **Structured Logging**: JSON format
- **Log Aggregation**: Fluent Bit or similar

## Disaster Recovery

### Backup Strategy
- **Database Backups**: Automated snapshots
- **Configuration Backup**: GitOps approach
- **Cross-Region**: Multi-AZ deployment

### High Availability
- **Multi-AZ**: Spread across availability zones
- **Load Balancing**: ALB with health checks
- **Database HA**: PostgreSQL streaming replication

## Development Workflow

### CI/CD Pipeline
1. **Code Commit**: GitHub/GitLab
2. **Build**: Docker images
3. **Test**: Unit and integration tests
4. **Security Scan**: Container vulnerability scanning
5. **Deploy**: Automated deployment to EKS
6. **Monitor**: Health checks and metrics

### Environment Strategy
- **Development**: Local Docker Compose
- **Staging**: Dedicated EKS namespace
- **Production**: Separate EKS cluster

## Cost Optimization

### Resource Management
- **Right-sizing**: Appropriate resource requests/limits
- **Spot Instances**: For non-critical workloads
- **Cluster Autoscaler**: Scale nodes based on demand

### Storage Optimization
- **EBS GP3**: Cost-effective storage
- **Lifecycle Policies**: Automated cleanup
- **Compression**: Database compression