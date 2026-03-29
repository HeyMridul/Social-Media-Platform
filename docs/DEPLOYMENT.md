# Deployment Guide

## Docker Deployment

```bash
# Build images
docker-compose build

# Deploy production stack
docker-compose -f docker-compose.prod.yml up -d

# Scale backend instances
docker-compose up -d --scale backend=3
```

## Nginx Load Balancer Example

```nginx
upstream backend {
    least_conn;

    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Kubernetes Deployment

```bash
kubectl apply -f k8s/
kubectl get pods
kubectl get services
```

## CI/CD Example (GitHub Actions)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push Docker image
        run: |
          docker build -t app:latest .
          docker push registry/app:latest
      - name: Deploy to server
        run: |
          ssh user@server 'docker-compose pull && docker-compose up -d'
```

## Production Checklist

- Enable HTTPS with valid TLS certificates
- Set secure environment variables and secrets management
- Configure CORS to known frontend domains only
- Enable health checks and restart policies
- Verify horizontal scaling for WebSocket traffic
