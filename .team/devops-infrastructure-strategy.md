# DevOps インフラストラクチャ戦略

## ⚡ 技術指導: Prometheus (Chief System Architect)
**対象**: DevOps・インフラ (Hermes)  
**優先度**: 中（システム安定性の基盤）  
**目標**: 統合アーキテクチャに基づくインフラ最適化

---

## 🏗️ インフラ現状分析

### 現在のシステム構成
```yaml
# 現在のdocker-compose.yml評価
services:
  postgres:     # ✅ 適切 - PostgreSQL 15-alpine
  backend:      # ⚠️ 改善要 - 単一インスタンス
  frontend:     # ⚠️ 改善要 - 開発用設定
```

### 特定された課題
1. **スケーラビリティ不足** - 単一インスタンス構成
2. **高可用性未対応** - 障害単一点が存在
3. **監視システム不在** - メトリクス・ログ収集なし
4. **セキュリティ基盤不備** - SSL/TLS・認証基盤未実装

---

## 🚀 次世代インフラアーキテクチャ

### 1. Kubernetes基盤設計

```yaml
# kubernetes/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: transcription-system
  labels:
    name: transcription-system
    environment: production

---
# kubernetes/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: transcription-system
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  REDIS_HOST: "redis-service"
  POSTGRES_HOST: "postgres-service"
  WHISPER_API_TIMEOUT: "300000"
  MAX_UPLOAD_SIZE: "104857600"  # 100MB

---
# kubernetes/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: transcription-system
type: Opaque
stringData:
  DATABASE_URL: "postgresql://transcription:secure_password@postgres-service:5432/transcription_system"
  REDIS_URL: "redis://redis-service:6379"
  OPENAI_API_KEY: "{{ OPENAI_API_KEY }}"
  JWT_SECRET: "{{ JWT_SECRET }}"
```

### 2. 高可用性データベース設計

```yaml
# kubernetes/postgres-cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
  namespace: transcription-system
spec:
  instances: 3
  
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
      work_mem: "4MB"
      maintenance_work_mem: "64MB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      default_statistics_target: "100"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
  
  bootstrap:
    initdb:
      database: transcription_system
      owner: transcription
      secret:
        name: postgres-credentials
  
  storage:
    size: "50Gi"
    storageClass: "fast-ssd"
  
  monitoring:
    enabled: true
    
  backup:
    retentionPolicy: "30d"
    barmanObjectStore:
      destinationPath: "s3://backup-bucket/postgres"
      s3Credentials:
        accessKeyId:
          name: backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: backup-credentials
          key: SECRET_ACCESS_KEY

---
# kubernetes/redis-cluster.yaml
apiVersion: redis.io/v1beta2
kind: RedisCluster
metadata:
  name: redis-cluster
  namespace: transcription-system
spec:
  nodes: 6
  redisVersion: "7.2"
  
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "500m"
  
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: "10Gi"
        storageClassName: "fast-ssd"
  
  config:
    maxmemory-policy: "allkeys-lru"
    save: "900 1 300 10 60 10000"
```

### 3. アプリケーション分散デプロイ

```yaml
# kubernetes/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: transcription-backend
  namespace: transcription-system
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  
  selector:
    matchLabels:
      app: transcription-backend
  
  template:
    metadata:
      labels:
        app: transcription-backend
    spec:
      containers:
      - name: backend
        image: transcription-backend:latest
        
        ports:
        - containerPort: 3001
          name: http
        
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_URL
        
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        
        volumeMounts:
        - name: upload-storage
          mountPath: /app/uploads
      
      volumes:
      - name: upload-storage
        persistentVolumeClaim:
          claimName: upload-pvc

---
# kubernetes/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: transcription-workers
  namespace: transcription-system
spec:
  replicas: 2
  
  selector:
    matchLabels:
      app: transcription-workers
  
  template:
    metadata:
      labels:
        app: transcription-workers
    spec:
      containers:
      - name: worker
        image: transcription-backend:latest
        command: ["npm", "run", "worker"]
        
        env:
        - name: WORKER_TYPE
          value: "audio-processor"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: REDIS_URL
        
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"

---
# kubernetes/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: transcription-frontend
  namespace: transcription-system
spec:
  replicas: 2
  
  selector:
    matchLabels:
      app: transcription-frontend
  
  template:
    metadata:
      labels:
        app: transcription-frontend
    spec:
      containers:
      - name: frontend
        image: transcription-frontend:latest
        
        ports:
        - containerPort: 3000
          name: http
        
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.transcription.example.com"
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "300m"
```

### 4. Auto-scaling設定

```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: transcription-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: transcription-backend
  
  minReplicas: 3
  maxReplicas: 20
  
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
  
  - type: Pods
    pods:
      metric:
        name: pending_transcription_jobs
      target:
        type: AverageValue
        averageValue: "10"

---
# kubernetes/worker-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
  namespace: transcription-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: transcription-workers
  
  minReplicas: 2
  maxReplicas: 50
  
  metrics:
  - type: External
    external:
      metric:
        name: redis_queue_length
        selector:
          matchLabels:
            queue: "audio_processing"
      target:
        type: AverageValue
        averageValue: "5"
  
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

---

## 📊 監視・ログシステム

### 1. Prometheus + Grafana 監視

```yaml
# kubernetes/monitoring/prometheus.yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: transcription-system
spec:
  replicas: 2
  retention: "30d"
  
  serviceAccountName: prometheus
  serviceMonitorSelector:
    matchLabels:
      app: transcription-system
  
  ruleSelector:
    matchLabels:
      app: transcription-system
  
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: "100Gi"

---
# kubernetes/monitoring/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: transcription-backend-metrics
  namespace: transcription-system
  labels:
    app: transcription-system
spec:
  selector:
    matchLabels:
      app: transcription-backend
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics

---
# kubernetes/monitoring/alerting-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: transcription-alerts
  namespace: transcription-system
  labels:
    app: transcription-system
spec:
  groups:
  - name: transcription.rules
    rules:
    - alert: HighErrorRate
      expr: |
        (
          rate(http_requests_total{status=~"5.."}[5m]) /
          rate(http_requests_total[5m])
        ) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value | humanizePercentage }}"
    
    - alert: HighResponseTime
      expr: |
        histogram_quantile(0.95, 
          rate(http_request_duration_seconds_bucket[5m])
        ) > 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High response time detected"
        description: "95th percentile response time is {{ $value }}s"
    
    - alert: AudioProcessingBacklog
      expr: redis_queue_length{queue="audio_processing"} > 100
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Audio processing backlog detected"
        description: "{{ $value }} jobs pending in audio processing queue"
    
    - alert: DatabaseConnectionFailure
      expr: up{job="postgres-exporter"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Database connection failure"
        description: "Cannot connect to PostgreSQL database"
```

### 2. ELK Stack ログ管理

```yaml
# kubernetes/logging/elasticsearch.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch
  namespace: transcription-system
spec:
  version: 8.11.0
  
  nodeSets:
  - name: master
    count: 3
    config:
      node.roles: ["master"]
      xpack.security.enabled: true
    
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: "50Gi"
  
  - name: data
    count: 3
    config:
      node.roles: ["data", "ingest"]
      xpack.security.enabled: true
    
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: "200Gi"

---
# kubernetes/logging/kibana.yaml
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: kibana
  namespace: transcription-system
spec:
  version: 8.11.0
  count: 2
  
  elasticsearchRef:
    name: elasticsearch
  
  config:
    server.publicBaseUrl: "https://logs.transcription.example.com"

---
# kubernetes/logging/filebeat.yaml
apiVersion: beat.k8s.elastic.co/v1beta1
kind: Beat
metadata:
  name: filebeat
  namespace: transcription-system
spec:
  type: filebeat
  version: 8.11.0
  
  elasticsearchRef:
    name: elasticsearch
  
  config:
    filebeat.inputs:
    - type: container
      paths:
      - /var/log/containers/*transcription*.log
      
      processors:
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
          matchers:
          - logs_path:
              logs_path: "/var/log/containers/"
      
      - decode_json_fields:
          fields: ["message"]
          target: ""
          overwrite_keys: true
    
    output.elasticsearch:
      hosts: ["elasticsearch-es-http:9200"]
      
  daemonSet:
    podTemplate:
      spec:
        containers:
        - name: filebeat
          env:
          - name: NODE_NAME
            valueFrom:
              fieldRef:
                fieldPath: spec.nodeName
          
          volumeMounts:
          - name: varlogcontainers
            mountPath: /var/log/containers
            readOnly: true
          - name: varlogpods
            mountPath: /var/log/pods
            readOnly: true
        
        volumes:
        - name: varlogcontainers
          hostPath:
            path: /var/log/containers
        - name: varlogpods
          hostPath:
            path: /var/log/pods
```

---

## 🔒 セキュリティ基盤

### 1. SSL/TLS・認証基盤

```yaml
# kubernetes/security/cert-manager.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@transcription.example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx

---
# kubernetes/security/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: transcription-ingress
  namespace: transcription-system
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - transcription.example.com
    - api.transcription.example.com
    secretName: transcription-tls
  
  rules:
  - host: transcription.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  
  - host: api.transcription.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80

---
# kubernetes/security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: transcription-network-policy
  namespace: transcription-system
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
    - protocol: TCP
      port: 3001
  
  - from:
    - podSelector:
        matchLabels:
          app: transcription-backend
    - podSelector:
        matchLabels:
          app: transcription-workers
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 6379  # Redis
  
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
    - protocol: TCP
      port: 443  # HTTPS (OpenAI API)
```

### 2. セキュリティスキャン・監査

```yaml
# kubernetes/security/falco.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-config
  namespace: transcription-system
data:
  falco.yaml: |
    rules_file:
      - /etc/falco/falco_rules.yaml
      - /etc/falco/k8s_audit_rules.yaml
    
    json_output: true
    json_include_output_property: true
    
    outputs:
      rate: 1
      max_burst: 1000
    
    syslog_output:
      enabled: true
    
    stdout_output:
      enabled: true
    
    http_output:
      enabled: true
      url: "http://falcosidekick:2801"

---
# kubernetes/security/trivy-operator.yaml
apiVersion: aquasecurity.github.io/v1alpha1
kind: TrivyOperator
metadata:
  name: trivy-operator
  namespace: transcription-system
spec:
  vulnerabilityReports:
    scanner:
      name: Trivy
    
  configAuditReports:
    scanner:
      name: Trivy
  
  complianceReports:
    cron: "0 1 * * 0"  # Weekly compliance scan
  
  rbacAssessmentReports:
    scanner:
      name: Trivy
```

---

## 🚀 CI/CD パイプライン強化

### 1. GitOps デプロイメント

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: transcription_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run typecheck
    
    - name: Run unit tests
      run: npm run test:unit -- --coverage
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/transcription_test
        REDIS_URL: redis://localhost:6379
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  build-and-push:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
    
    - name: Build and push backend image
      uses: docker/build-push-action@v5
      with:
        context: ./backend
        push: true
        tags: ${{ steps.meta.outputs.tags }}-backend
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    
    - name: Build and push frontend image
      uses: docker/build-push-action@v5
      with:
        context: ./frontend
        push: true
        tags: ${{ steps.meta.outputs.tags }}-frontend
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Kubectl
      uses: azure/setup-kubectl@v3
    
    - name: Deploy to Kubernetes
      run: |
        # Update image tags in Kubernetes manifests
        sed -i 's|transcription-backend:latest|${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main-${{ github.sha }}-backend|g' kubernetes/*.yaml
        sed -i 's|transcription-frontend:latest|${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main-${{ github.sha }}-frontend|g' kubernetes/*.yaml
        
        # Apply manifests
        kubectl apply -f kubernetes/
        
        # Wait for rollout
        kubectl rollout status deployment/transcription-backend -n transcription-system
        kubectl rollout status deployment/transcription-frontend -n transcription-system
      env:
        KUBECONFIG: ${{ secrets.KUBECONFIG }}
```

### 2. ArgoCD GitOps

```yaml
# argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: transcription-system
  namespace: argocd
spec:
  project: default
  
  source:
    repoURL: https://github.com/your-org/transcription-system
    targetRevision: HEAD
    path: kubernetes
  
  destination:
    server: https://kubernetes.default.svc
    namespace: transcription-system
  
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    
    syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
    
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  
  revisionHistoryLimit: 10
```

---

## 📈 パフォーマンス最適化

### 1. キャッシュ戦略

```yaml
# kubernetes/cache/redis-cache.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cache-config
  namespace: transcription-system
data:
  redis.conf: |
    # Memory optimization
    maxmemory 2gb
    maxmemory-policy allkeys-lru
    
    # Persistence
    save 900 1
    save 300 10
    save 60 10000
    
    # Network
    tcp-keepalive 300
    timeout 0
    
    # Security
    protected-mode yes
    
    # Logging
    loglevel notice
    
    # Client management
    client-output-buffer-limit normal 0 0 0
    client-output-buffer-limit replica 256mb 64mb 60
    client-output-buffer-limit pubsub 32mb 8mb 60

---
# kubernetes/cache/cdn-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cdn-config
  namespace: transcription-system
data:
  nginx.conf: |
    upstream backend {
        server transcription-backend:3001;
    }
    
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=10g 
                     inactive=60m use_temp_path=off;
    
    server {
        listen 80;
        server_name api.transcription.example.com;
        
        # API responses cache
        location /api/ {
            proxy_pass http://backend;
            proxy_cache api_cache;
            proxy_cache_valid 200 5m;
            proxy_cache_valid 404 1m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_lock on;
            
            add_header X-Cache-Status $upstream_cache_status;
        }
        
        # Static files cache
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
```

### 2. 負荷分散・パフォーマンス監視

```yaml
# kubernetes/performance/istio-virtualservice.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: transcription-backend-vs
  namespace: transcription-system
spec:
  hosts:
  - api.transcription.example.com
  
  http:
  - match:
    - uri:
        prefix: "/api/sessions"
    - uri:
        prefix: "/api/upload"
    route:
    - destination:
        host: transcription-backend
        port:
          number: 3001
      weight: 100
    
    fault:
      delay:
        percentage:
          value: 0.1
        fixedDelay: 5s
    
    retries:
      attempts: 3
      perTryTimeout: 30s
      retryOn: 5xx,reset,connect-failure,refused-stream
    
    timeout: 60s

---
# kubernetes/performance/destination-rule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: transcription-backend-dr
  namespace: transcription-system
spec:
  host: transcription-backend
  
  trafficPolicy:
    loadBalancer:
      simple: LEAST_CONN
    
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
        maxRetries: 3
        consecutiveGatewayErrors: 5
        interval: 30s
        baseEjectionTime: 30s
    
    circuitBreaker:
      consecutiveGatewayErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

---

## 🎯 DevOps実装ロードマップ

### Phase 1: 基盤構築（1-2週間）
```typescript
const phase1Tasks = {
  week1: [
    'Kubernetes cluster構築・設定',
    'PostgreSQL High Availability構築',
    'Redis Cluster構築',
    '基本的な監視システム設定'
  ],
  week2: [
    'SSL/TLS証明書・Ingress設定',
    'CI/CD パイプライン構築',
    'セキュリティ基盤実装',
    'バックアップシステム構築'
  ]
};
```

### Phase 2: 最適化・自動化（2-3週間）
```typescript
const phase2Tasks = {
  week1: [
    'Auto-scaling設定・調整',
    'キャッシュ戦略実装',
    'ログ集約システム完成'
  ],
  week2: [
    'セキュリティスキャン自動化',
    'パフォーマンス監視強化',
    'GitOps完全実装'
  ],
  week3: [
    '負荷テスト・チューニング',
    'ディザスタリカバリ準備',
    '運用手順書作成'
  ]
};
```

### Phase 3: 高度機能（3-4週間）
```typescript
const phase3Tasks = {
  features: [
    'Service Mesh (Istio) 実装',
    'Edge Computing対応',
    'MultiRegion展開準備',
    '完全自動化運用体制'
  ]
};
```

---

## 📊 成功指標

### インフラ指標
```typescript
const infrastructureKPIs = {
  availability: '99.9%以上',
  responseTime: 'API < 500ms, Static < 100ms',
  throughput: '1000 req/sec以上',
  recovery: 'MTTR < 5分',
  deployment: '1日複数回デプロイ可能',
  security: 'ゼロセキュリティインシデント'
};
```

### 運用効率
```typescript
const operationalEfficiency = {
  monitoring: '100%自動監視・アラート',
  deployment: '完全自動化・ロールバック',
  scaling: '自動スケーリング・コスト最適化',
  backup: '自動バックアップ・リストア確認'
};
```

---

**インフラ設計責任者**: Prometheus (Chief System Architect)  
**実装責任者**: Hermes (DevOps・インフラ担当)  
**連携**: 技術委員会・品質委員会・UX委員会

**堅牢で拡張可能なインフラにより、転写システムの可用性と性能を極限まで高めましょう！** ⚡🏗️